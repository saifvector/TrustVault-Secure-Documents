import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download, Eye, Trash2, Share2, X, Search } from "lucide-react";
import { DocumentStack, UserAvatar } from "@/components/file-identity";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, fmtDate, ACTION_LABELS } from "@/lib/me";
import { canDelete, canDownload, canEditMetadata, canManageSharing, formatBytes, type AccessLevel } from "@/lib/access";
import { deleteDocument, getDownloadUrl, revokePermission, setPermission, updateDocument } from "@/lib/vault.functions";
import { Empty, LevelBadge, PageHeader } from "@/components/vault-ui";
import { CATEGORIES } from "@/components/upload-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/documents/$id")({
  head: () => ({ meta: [{ title: "Document details — TrustVault" }, { name: "description", content: "Review document details, access permissions and history in TrustVault." }, { property: "og:title", content: "Document details — TrustVault" }, { property: "og:description", content: "Review document details, access permissions and history in TrustVault." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: DocPage,
});

const PREVIEWABLE = /^(image\/(png|jpeg|gif|webp)|application\/pdf|text\/plain)$/;

function DocPage() {
  const { id } = Route.useParams();
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const dl = useServerFn(getDownloadUrl);
  const del = useServerFn(deleteDocument);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["doc", id, me?.id],
    enabled: !!me,
    queryFn: async () => {
      const { data: doc } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
      if (!doc) return null;
      if (!me) return null;
      const { data: level } = await supabase.rpc("doc_access_level", { _doc: id, _user: me.id });
      const { data: owner } = await supabase.from("profiles").select("full_name,email").eq("id", doc.owner_id).maybeSingle();
      return { doc, level: (level as AccessLevel) ?? null, owner };
    },
  });

  if (isLoading) return <div className="space-y-6"><PageHeader title="Document details and access" /><p role="status" className="text-sm text-muted-foreground">Loading…</p></div>;
  if (!data) return <div className="space-y-6"><PageHeader title="Document unavailable" /><Empty title="Document unavailable" body="It doesn't exist, or you don't have permission to see it." action={<Button asChild variant="outline" size="sm"><Link to="/documents" search={{ scope: "all" } as never}>Back to documents</Link></Button>} /></div>;

  const { doc, level, owner } = data;

  async function open(preview: boolean) {
    try {
      const { url } = await dl({ data: { id, preview } });
      if (preview) setPreviewUrl(url); else window.location.href = url;
    } catch { toast.error("Access denied. This attempt has been recorded."); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={["Documents", doc.category]}
        title={doc.name}
        description={doc.description || undefined}
        actions={
          <>
            {canDownload(level) && PREVIEWABLE.test(doc.mime_type) && <Button variant="outline" size="sm" onClick={() => open(true)}><Eye className="mr-1.5 h-4 w-4" />Preview</Button>}
            {canDownload(level) && <Button size="sm" onClick={() => open(false)}><Download className="mr-1.5 h-4 w-4" />Download</Button>}
            {canDelete(level) && (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="outline" size="sm"><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete this document?</AlertDialogTitle><AlertDialogDescription>The file and all access grants are removed permanently. The audit history is kept.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { await del({ data: { id } }); qc.invalidateQueries(); toast.success("Document deleted"); navigate({ to: "/documents", search: { scope: "mine" } as never }); }}>Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        }
      />
      {!level && <div className="rounded-sm border border-warning/40 bg-warning/10 p-3 text-sm">You can see this document's metadata as an administrator, but you have no permission to open its contents.</div>}
      {previewUrl && (
        <div className="tv-panel overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground"><h2 className="text-xs font-medium">Document preview · link expires in 60 seconds</h2><Button variant="ghost" size="icon" aria-label="Close preview" title="Close preview" onClick={() => setPreviewUrl(null)}><X /></Button></div>
          {doc.mime_type.startsWith("image/") ? <img src={previewUrl} alt={doc.description.trim() || `Image preview of ${doc.name} (${doc.category})`} className="mx-auto max-h-[600px]" /> : <iframe title={`Document preview: ${doc.name}`} src={previewUrl} sandbox="" className="h-[600px] w-full" />}
        </div>
      )}
      <DocumentStack name={doc.name} mime={doc.mime_type} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <section className="tv-panel">
            <h2 className="border-b px-4 py-3 text-sm font-medium">Document metadata</h2>
            <dl className="divide-y text-sm">
              {[
                ["Document ID", <span className="tv-mono">{doc.id}</span>],
                ["Owner", owner?.full_name || owner?.email || "—"],
                ["Your access", <LevelBadge level={level} />],
                ["Category", doc.category],
                ["Type", <span className="tv-mono">{doc.mime_type}</span>],
                ["Size", formatBytes(doc.size_bytes)],
                ["Created", fmtDate(doc.created_at)],
                ["Updated", fmtDate(doc.updated_at)],
                ["SHA-256", <span className="tv-mono break-all">{doc.checksum}</span>],
              ].map(([k, v], i) => (
                <div key={i} className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 px-4 py-2.5"><dt className="text-muted-foreground">{k}</dt><dd className="break-words">{v}</dd></div>
              ))}
            </dl>
          </section>
          {canEditMetadata(level) && <EditForm doc={doc} />}
        </div>
        <div className="space-y-6">
          {(canManageSharing(level) || me?.roles.includes("admin")) && <Sharing docId={id} ownerId={doc.owner_id} canManage={canManageSharing(level)} />}
          {(level === "owner" || me?.roles.includes("admin")) && <History docId={id} />}
        </div>
      </div>
    </div>
  );
}

function EditForm({ doc }: { doc: { id: string; name: string; description: string; category: string } }) {
  const qc = useQueryClient();
  const update = useServerFn(updateDocument);
  const [f, setF] = useState({ name: doc.name, description: doc.description, category: doc.category });
  return (
    <form className="tv-panel space-y-3 p-4" onSubmit={async (e) => { e.preventDefault(); try { await update({ data: { id: doc.id, ...f } }); qc.invalidateQueries(); toast.success("Saved"); } catch { toast.error("Not permitted"); } }}>
      <h2 className="text-sm font-medium">Edit document details</h2>
      <div className="space-y-1.5"><Label htmlFor="en">Name</Label><Input id="en" value={f.name} maxLength={255} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="space-y-1.5"><Label htmlFor="ec">Category</Label>
        <select id="ec" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="ed">Description</Label><Textarea id="ed" value={f.description} maxLength={2000} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <Button size="sm" type="submit">Save changes</Button>
    </form>
  );
}

function Sharing({ docId, ownerId, canManage }: { docId: string; ownerId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const grant = useServerFn(setPermission);
  const revoke = useServerFn(revokePermission);
  const [userId, setUserId] = useState("");
  const [level, setLevel] = useState<"read" | "edit">("read");
  const [personSearch, setPersonSearch] = useState("");
  const { data } = useQuery({
    queryKey: ["perms", docId],
    queryFn: async () => {
      const [{ data: perms }, { data: people }] = await Promise.all([
        supabase.from("document_permissions").select("user_id,level,updated_at").eq("document_id", docId),
        supabase.from("profiles").select("id,email,full_name,is_active"),
      ]);
      return { perms: perms ?? [], people: people ?? [] };
    },
  });
  const person = (id: string) => data?.people.find((p) => p.id === id);
  const candidates = (data?.people ?? []).filter((p) => p.is_active && p.id !== ownerId && !data?.perms.some((x) => x.user_id === p.id));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["perms", docId] }); qc.invalidateQueries({ queryKey: ["history", docId] }); };

  return (
    <section className="tv-panel">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">People with access</h2><Share2 className="h-4 w-4 text-primary" /></div>
      {canManage && (
        <Dialog><DialogTrigger asChild><Button variant="outline" size="sm" className="mb-4"><Share2 />Share document</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Grant document access</DialogTitle></DialogHeader>
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search registered users" placeholder="Search people by name or email" className="pl-9" value={personSearch} onChange={e => setPersonSearch(e.target.value)} /></div>
        <form className="flex flex-wrap gap-2 py-2" onSubmit={async (e) => { e.preventDefault(); if (!userId) return; try { await grant({ data: { documentId: docId, userId, level } }); setUserId(""); refresh(); toast.success("Access granted"); } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); } }}>
          <select aria-label="User" value={userId} onChange={(e) => setUserId(e.target.value)} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-card px-2 text-sm">
            <option value="">Select a person…</option>
            {candidates.filter(p => `${p.full_name} ${p.email}`.toLowerCase().includes(personSearch.toLowerCase())).map((p) => <option key={p.id} value={p.id}>{p.full_name ? `${p.full_name} — ${p.email}` : p.email}</option>)}
          </select>
          <select aria-label="Permission" value={level} onChange={(e) => setLevel(e.target.value as "read" | "edit")} className="h-9 rounded-md border border-input bg-card px-2 text-sm">
            <option value="read">Read</option><option value="edit">Edit</option>
          </select>
          <Button size="sm" type="submit" disabled={!userId}>Grant</Button>
        </form></DialogContent></Dialog>
      )}
      <ul className="divide-y text-sm">
        <li className="flex items-center gap-3 px-4 py-3"><UserAvatar name={person(ownerId)?.full_name || person(ownerId)?.email} /><span className="min-w-0 flex-1 truncate">{person(ownerId)?.full_name || person(ownerId)?.email}</span><LevelBadge level="owner" /></li>
        {data?.perms.map((p) => (
          <li key={p.user_id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <UserAvatar name={person(p.user_id)?.full_name || person(p.user_id)?.email} small /><div className="min-w-0 flex-1"><div className="truncate">{person(p.user_id)?.full_name || person(p.user_id)?.email}</div><div className="truncate text-xs text-muted-foreground">{person(p.user_id)?.email}</div></div>
            {canManage ? (
              <div className="flex items-center gap-2">
                <select aria-label="Change permission" value={p.level} onChange={async (e) => { await grant({ data: { documentId: docId, userId: p.user_id, level: e.target.value as "read" | "edit" } }); refresh(); toast.success("Permission updated"); }} className="h-8 rounded-md border border-input bg-card px-2 text-xs">
                  <option value="read">Read</option><option value="edit">Edit</option>
                </select>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { await revoke({ data: { documentId: docId, userId: p.user_id } }); refresh(); toast.success("Access revoked"); }}>Revoke</Button>
              </div>
            ) : <LevelBadge level={p.level} />}
          </li>
        ))}
      </ul>
      {!data?.perms.length && <p className="px-4 pb-4 text-xs text-muted-foreground">Not shared with anyone.</p>}
    </section>
  );
}

function History({ docId }: { docId: string }) {
  const { data } = useQuery({
    queryKey: ["history", docId],
    queryFn: async () => (await supabase.from("audit_logs").select("id,action,outcome,actor_email,created_at,details").eq("document_id", docId).order("seq", { ascending: false }).limit(50)).data ?? [],
  });
  return (
    <section className="tv-panel">
      <h2 className="border-b px-4 py-3 text-sm font-medium">Document history</h2>
      <ul className="divide-y text-sm">
        {data?.map((e) => (
          <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
            <div><div className={e.outcome === "denied" ? "text-destructive" : ""}>{ACTION_LABELS[e.action] ?? e.action}{e.outcome !== "success" && ` (${e.outcome})`}</div><div className="text-xs text-muted-foreground">{e.actor_email}</div></div>
            <div className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(e.created_at)}</div>
          </li>
        ))}
      </ul>
      {!data?.length && <p className="p-4 text-xs text-muted-foreground">No events yet.</p>}
    </section>
  );
}
