import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AuditInput } from "./audit.server";
const writeAudit = async (e: AuditInput) => (await import("./audit.server")).writeAudit(e);
import { SIGNED_URL_TTL_SECONDS, MAX_FILE_BYTES, type AccessLevel } from "./access";

type Ctx = { supabase: any; userId: string; claims: { email?: string } };

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}
async function hasRole(ctx: Ctx, role: "admin" | "owner" | "viewer") {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: role });
  return !!data;
}
async function isActive(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("is_active_user", { _user_id: ctx.userId });
  return !!data;
}
async function accessLevel(ctx: Ctx, docId: string): Promise<AccessLevel> {
  const { data } = await ctx.supabase.rpc("doc_access_level", { _doc: docId, _user: ctx.userId });
  return (data as AccessLevel) ?? null;
}
async function deny(ctx: Ctx, action: string, documentId: string | null, reason: string): Promise<never> {
  await writeAudit({
    actorId: ctx.userId,
    actorEmail: ctx.claims.email,
    action,
    outcome: "denied",
    documentId,
    details: { reason },
  });
  throw new Error("Access denied");
}
async function requireAdmin(ctx: Ctx, action: string) {
  if (!(await isActive(ctx)) || !(await hasRole(ctx, "admin"))) await deny(ctx, action, null, "not an administrator");
}

const uuid = z.string().uuid();

/* ---------------- Public: bootstrap & login ---------------- */

export const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { count } = await sb.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return { needsSetup: (count ?? 0) === 0 };
});

export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ email: z.string().email().max(255), password: z.string().min(10).max(128), fullName: z.string().trim().min(1).max(100) }).parse(i),
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    const { count } = await sb.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Setup already completed");
    const { data: created, error } = await sb.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create user");
    await sb.from("user_roles").insert([
      { user_id: created.user.id, role: "admin" },
      { user_id: created.user.id, role: "owner" },
    ]);
    await writeAudit({ actorId: created.user.id, actorEmail: data.email, action: "user.create", targetUserId: created.user.id, details: { bootstrap: true, roles: ["admin", "owner"] } });
    return { ok: true };
  });

export const loginWithPassword = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ email: z.string().email().max(255), password: z.string().min(1).max(128) }).parse(i))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    await writeAudit({ actorEmail: data.email, action: "auth.login_attempt" });
    const { data: res, error } = await client.auth.signInWithPassword(data);
    if (error || !res.session) {
      await writeAudit({ actorEmail: data.email, action: "auth.login", outcome: "failure", details: { reason: error?.message ?? "unknown" } });
      return { ok: false as const, message: "Invalid email or password." };
    }
    const sb = await admin();
    const { data: prof } = await sb.from("profiles").select("is_active").eq("id", res.user.id).maybeSingle();
    if (!prof?.is_active) {
      await writeAudit({ actorId: res.user.id, actorEmail: data.email, action: "auth.login", outcome: "denied", details: { reason: "account deactivated" } });
      return { ok: false as const, message: "This account has been deactivated." };
    }
    await writeAudit({ actorId: res.user.id, actorEmail: data.email, action: "auth.login" });
    return { ok: true as const, access_token: res.session.access_token, refresh_token: res.session.refresh_token };
  });

/* ---------------- Authenticated ---------------- */

export const recordLogout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await writeAudit({ actorId: context.userId, actorEmail: (context.claims as any).email, action: "auth.logout" });
    return { ok: true };
  });

export const createDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      storagePath: z.string().min(1).max(500),
      name: z.string().trim().min(1).max(255),
      description: z.string().max(2000).default(""),
      category: z.string().trim().min(1).max(64),
      mimeType: z.string().max(255),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (!(await isActive(ctx)) || !(await hasRole(ctx, "owner"))) await deny(ctx, "document.upload", null, "missing owner role");
    if (!data.storagePath.startsWith(`${ctx.userId}/`) || data.storagePath.includes("..")) await deny(ctx, "document.upload", null, "invalid storage path");
    const sb = await admin();
    const { data: blob, error: dlErr } = await sb.storage.from("documents").download(data.storagePath);
    if (dlErr || !blob) throw new Error("Uploaded file not found");
    if (blob.size > MAX_FILE_BYTES) {
      await sb.storage.from("documents").remove([data.storagePath]);
      throw new Error("File too large");
    }
    const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    const checksum = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const { data: doc, error } = await sb
      .from("documents")
      .insert({ owner_id: ctx.userId, name: data.name, description: data.description, category: data.category, mime_type: data.mimeType || "application/octet-stream", size_bytes: blob.size, checksum, storage_path: data.storagePath })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit({ actorId: ctx.userId, actorEmail: ctx.claims.email, action: "document.upload", documentId: doc.id, details: { name: data.name, size: blob.size, checksum } });
    return { id: doc.id };
  });

export const updateDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: uuid, name: z.string().trim().min(1).max(255), description: z.string().max(2000), category: z.string().trim().min(1).max(64) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const level = await accessLevel(ctx, data.id);
    if (level !== "owner" && level !== "edit") await deny(ctx, "document.update", data.id, `level=${level ?? "none"}`);
    const sb = await admin();
    const { error } = await sb.from("documents").update({ name: data.name, description: data.description, category: data.category, updated_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit({ actorId: ctx.userId, actorEmail: ctx.claims.email, action: "document.update", documentId: data.id, details: { name: data.name, category: data.category } });
    return { ok: true };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if ((await accessLevel(ctx, data.id)) !== "owner") await deny(ctx, "document.delete", data.id, "not owner");
    const sb = await admin();
    const { data: doc } = await sb.from("documents").select("storage_path,name").eq("id", data.id).single();
    if (doc) await sb.storage.from("documents").remove([doc.storage_path]);
    await sb.from("documents").delete().eq("id", data.id);
    await writeAudit({ actorId: ctx.userId, actorEmail: ctx.claims.email, action: "document.delete", documentId: data.id, details: { name: doc?.name } });
    return { ok: true };
  });

export const getDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, preview: z.boolean().default(false) }).parse(i))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const level = await accessLevel(ctx, data.id);
    if (!level) await deny(ctx, data.preview ? "document.preview" : "document.download", data.id, "no permission");
    const sb = await admin();
    const { data: doc } = await sb.from("documents").select("storage_path,name").eq("id", data.id).single();
    if (!doc) throw new Error("Not found");
    const { data: signed, error } = await sb.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, SIGNED_URL_TTL_SECONDS, data.preview ? undefined : { download: doc.name });
    if (error || !signed) throw new Error("Could not create link");
    await writeAudit({ actorId: ctx.userId, actorEmail: ctx.claims.email, action: data.preview ? "document.preview" : "document.download", documentId: data.id, details: { level } });
    return { url: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS };
  });

export const setPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ documentId: uuid, userId: uuid, level: z.enum(["read", "edit"]) }).parse(i))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if ((await accessLevel(ctx, data.documentId)) !== "owner") await deny(ctx, "permission.grant", data.documentId, "not owner");
    if (data.userId === ctx.userId) throw new Error("You already own this document");
    const sb = await admin();
    const { data: target } = await sb.from("profiles").select("is_active").eq("id", data.userId).maybeSingle();
    if (!target?.is_active) throw new Error("User not found or inactive");
    const { data: existing } = await sb.from("document_permissions").select("level").eq("document_id", data.documentId).eq("user_id", data.userId).maybeSingle();
    if (existing?.level === data.level) return { ok: true };
    const { error } = await sb.from("document_permissions").upsert(
      { document_id: data.documentId, user_id: data.userId, level: data.level, granted_by: ctx.userId, updated_at: new Date().toISOString() },
      { onConflict: "document_id,user_id" },
    );
    if (error) throw new Error(error.message);
    await writeAudit({
      actorId: ctx.userId, actorEmail: ctx.claims.email,
      action: existing ? "permission.change" : "permission.grant",
      documentId: data.documentId, targetUserId: data.userId,
      details: { from: existing?.level ?? null, to: data.level },
    });
    return { ok: true };
  });

export const revokePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ documentId: uuid, userId: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if ((await accessLevel(ctx, data.documentId)) !== "owner") await deny(ctx, "permission.revoke", data.documentId, "not owner");
    const sb = await admin();
    const { data: removed } = await sb.from("document_permissions").delete().eq("document_id", data.documentId).eq("user_id", data.userId).select("level");
    if (removed?.length) {
      await writeAudit({ actorId: ctx.userId, actorEmail: ctx.claims.email, action: "permission.revoke", documentId: data.documentId, targetUserId: data.userId, details: { from: removed[0]?.level } });
    }
    return { ok: true };
  });

/* ---------------- Administration ---------------- */

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await requireAdmin(ctx, "admin.list_users");
    const sb = await admin();
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      sb.from("profiles").select("id,email,full_name,is_active,created_at").order("created_at"),
      sb.from("user_roles").select("user_id,role"),
    ]);
    return (profiles ?? []).map((p) => ({ ...p, roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role) }));
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      email: z.string().email().max(255),
      fullName: z.string().trim().min(1).max(100),
      password: z.string().min(10).max(128),
      role: z.enum(["admin", "owner", "viewer"]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await requireAdmin(ctx, "user.create");
    const sb = await admin();
    const { data: created, error } = await sb.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true, user_metadata: { full_name: data.fullName } });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create user");
    await sb.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    await writeAudit({ actorId: ctx.userId, actorEmail: ctx.claims.email, action: "user.create", targetUserId: created.user.id, details: { email: data.email, role: data.role } });
    return { id: created.user.id };
  });

export const adminSetActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: uuid, active: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await requireAdmin(ctx, data.active ? "user.activate" : "user.deactivate");
    if (data.userId === ctx.userId) throw new Error("You cannot deactivate your own account");
    const sb = await admin();
    await sb.from("profiles").update({ is_active: data.active }).eq("id", data.userId);
    await sb.auth.admin.updateUserById(data.userId, { ban_duration: data.active ? "none" : "876000h" });
    await writeAudit({ actorId: ctx.userId, actorEmail: ctx.claims.email, action: data.active ? "user.activate" : "user.deactivate", targetUserId: data.userId });
    return { ok: true };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: uuid, role: z.enum(["admin", "owner", "viewer"]), enabled: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await requireAdmin(ctx, "user.role_change");
    if (data.userId === ctx.userId && data.role === "admin" && !data.enabled) throw new Error("You cannot remove your own administrator role");
    const sb = await admin();
    if (data.enabled) await sb.from("user_roles").upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    else await sb.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
    await writeAudit({ actorId: ctx.userId, actorEmail: ctx.claims.email, action: "user.role_change", targetUserId: data.userId, details: { role: data.role, enabled: data.enabled } });
    return { ok: true };
  });

export const adminVerifyChain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await requireAdmin(ctx, "audit.verify");
    const { data, error } = await ctx.supabase.rpc("verify_audit_chain");
    if (error) throw new Error(error.message);
    const row = (data as { total: number; broken_at: number | null }[])[0] ?? { total: 0, broken_at: null };
    await writeAudit({ actorId: ctx.userId, actorEmail: ctx.claims.email, action: "audit.verify", details: { total: row.total, intact: row.broken_at === null } });
    return row;
  });
