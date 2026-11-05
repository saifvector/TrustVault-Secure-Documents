import { getRequestHeader } from "@tanstack/react-start/server";

export type AuditInput = {
  actorId?: string | null | undefined;
  actorEmail?: string | null | undefined;
  action: string;
  outcome?: "success" | "denied" | "failure";
  documentId?: string | null;
  targetUserId?: string | null;
  details?: Record<string, unknown>;
};

function requestMeta() {
  let ip: string | null = null;
  let requestId: string | null = null;
  try {
    ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    requestId = getRequestHeader("cf-ray") ?? getRequestHeader("x-request-id") ?? null;
  } catch {
    /* no request context */
  }
  return { ip, requestId: requestId ?? crypto.randomUUID() };
}

/** Append an entry to the tamper-evident audit chain (service role only). */
export async function writeAudit(e: AuditInput) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { ip, requestId } = requestMeta();
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    actor_id: e.actorId ?? null,
    actor_email: e.actorEmail ?? null,
    action: e.action,
    outcome: e.outcome ?? "success",
    document_id: e.documentId ?? null,
    target_user_id: e.targetUserId ?? null,
    details: (e.details ?? {}) as never,
    ip,
    request_id: requestId,
  });
  if (error) console.error("audit write failed", error.message);
}
