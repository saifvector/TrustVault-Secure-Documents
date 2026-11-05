import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, useMe, fmtDate } from "@/lib/me";
import { adminCreateUser, adminListUsers, adminSetActive, adminSetRole, adminVerifyChain } from "@/lib/vault.functions";
import { Empty, PageHeader, Stat } from "@/components/vault-ui";
import { AuditTable } from "@/components/audit-table";
import { AuditExplorer } from "@/components/audit-explorer";
import { UserAvatar } from "@/components/file-identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me?.roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Users and audit security — TrustVault" }, { name: "description", content: "Manage TrustVault accounts and investigate audit logs and security events." }, { property: "og:title", content: "Users and audit security — TrustVault" }, { property: "og:description", content: "Manage TrustVault accounts and investigate audit logs and security events." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminPage,
});

const ROLES = ["admin", "owner", "viewer"] as const;
const COLS = "id,seq,action,outcome,actor_email,document_id,target_user_id,ip,created_at,hash";

function AdminPage() {
  const me = useMe();
  const qc = useQueryClient();
  const list = useServerFn(adminListUsers);
  const setActive = useServerFn(adminSetActive);
  const setRole = useServerFn(adminSetRole);
  const verify = useServerFn(adminVerifyChain);
  const [actionFilter, setActionFilter] = useState("");
  const [chain, setChain] = useState<{ total: number; broken_at: number | null } | null>(null);

  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });
  const audit = useQuery({
    queryKey: ["admin-audit", actionFilter],
    queryFn: async () => {
      let q = supabase.from("audit_logs").select(COLS).order("seq", { ascending: false }).limit(200);
      if (actionFilter) q = q.like("action", `${actionFilter}%`);
      return (await q).data ?? [];
    },
  });
  const denied = useQuery({
    queryKey: ["admin-denied"],
    queryFn: async () => (await supabase.from("audit_logs").select(COLS).in("outcome", ["denied", "failure"]).order("seq", { ascending: false }).limit(200)).data ?? [],
  });
  const docCount = useQuery({ queryKey: ["admin-doccount"], queryFn: async () => (await supabase.from("documents").select("id", { count: "exact", head: true })).count ?? 0 });

  const since = Date.now() - 864e5;
  const failed24 = (denied.data ?? []).filter((e) => new Date(e.created_at).getTime() > since);
  const suspicious = Object.entries(failed24.reduce<Record<string, number>>((a, e) => { const k = e.actor_email ?? e.ip ?? "unknown"; a[k] = (a[k] ?? 0) + 1; return a; }, {})).filter(([, n]) => n >= 3);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["admin-audit"] }); };

  return (
    <div className="space-y-6">
      <PageHeader crumbs={["Security", "Administration"]} title="Manage users and audit security" description="Manage accounts and investigate the audit trail."
        actions={<Button variant="outline" size="sm" onClick={async () => { const r = await verify(); setChain(r); refresh(); }}><ShieldCheck className="mr-1.5 h-4 w-4" />Verify audit chain</Button>} />
      {chain && (
        <div className={`rounded-sm border p-3 text-sm ${chain.broken_at === null ? "border-success/40 bg-accent" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
          <div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 shrink-0" /><div><h2 className="font-medium">Audit integrity verification</h2><p className="mt-1 text-xs">{chain.broken_at === null ? `Audit chain intact: ${chain.total} entries verified.` : `Integrity failure detected at entry #${chain.broken_at}.`}</p></div></div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Users" value={users.data?.length ?? "—"} hint={`${users.data?.filter((u) => !u.is_active).length ?? 0} deactivated`} />
        <Stat label="Documents" value={docCount.data ?? "—"} />
        <Stat label="Denied / failed, 24h" value={failed24.length} />
        <Stat label="Suspicious sources" value={suspicious.length} hint="3+ failures in 24h" />
      </div>
      <Tabs defaultValue="users">
        <TabsList><TabsTrigger value="users">Users</TabsTrigger><TabsTrigger value="audit">Audit log</TabsTrigger><TabsTrigger value="security">Security events</TabsTrigger></TabsList>
        <TabsContent value="users" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4"><h2 className="text-sm font-semibold">Workspace accounts</h2><CreateUser onDone={refresh} /></div>
          <div className="flex flex-wrap gap-5 py-2 text-xs text-muted-foreground">{ROLES.map(r => <span key={r} className="capitalize">{r}s <strong className="ml-2 font-medium text-foreground">{users.data?.filter(u => u.roles.includes(r)).length ?? "—"}</strong></span>)}</div>
          <div className="tv-panel overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>User</TableHead>{ROLES.map((r) => <TableHead key={r} className="capitalize">{r}</TableHead>)}<TableHead>Active</TableHead><TableHead className="text-right">Created</TableHead></TableRow></TableHeader>
              <TableBody>
                {users.data?.map((u) => (
                  <TableRow key={u.id} className={u.is_active ? "" : "opacity-60"}>
                    <TableCell><div className="flex items-center gap-3"><UserAvatar name={u.full_name || u.email} /><div><div className="font-medium">{u.full_name || "—"}</div><div className="mt-1 text-xs text-muted-foreground">{u.email}</div></div></div></TableCell>
                    {ROLES.map((r) => (
                      <TableCell key={r}><Switch aria-label={`${r} role for ${u.email}`} checked={u.roles.includes(r)} disabled={u.id === me?.id && r === "admin"} onCheckedChange={async (v) => { try { await setRole({ data: { userId: u.id, role: r, enabled: v } }); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }} /></TableCell>
                    ))}
                    <TableCell><Switch aria-label={`Active ${u.email}`} checked={u.is_active} disabled={u.id === me?.id} onCheckedChange={async (v) => { await setActive({ data: { userId: u.id, active: v } }); refresh(); toast.success(v ? "User reactivated" : "User deactivated"); }} /></TableCell>
                    <TableCell className="text-right text-muted-foreground">{fmtDate(u.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="audit" className="space-y-3">
          <select aria-label="Filter events" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="h-9 rounded-md border border-input bg-card px-2 text-sm">
            <option value="">All events</option><option value="auth.">Authentication</option><option value="document.">Documents</option><option value="permission.">Permissions</option><option value="user.">User administration</option><option value="audit.">Audit</option>
          </select>
          <h2 className="pt-3 text-sm font-semibold">Audit log explorer</h2><AuditExplorer rows={audit.data ?? []} showIp />
        </TabsContent>
        <TabsContent value="security" className="space-y-3">
          {suspicious.length > 0 && (
            <div className="rounded-sm border border-warning/40 bg-warning/10 p-3 text-sm">
              <div className="font-medium">Repeated failures in the last 24 hours</div>
              <ul className="mt-1 text-muted-foreground">{suspicious.map(([k, n]) => <li key={k}>{k}: {n} denied or failed events</li>)}</ul>
            </div>
          )}
          <h2 className="pt-3 text-sm font-semibold">Denied and failed operations</h2><AuditExplorer rows={denied.data ?? []} showIp />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateUser({ onDone }: { onDone: () => void }) {
  const create = useServerFn(adminCreateUser);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ fullName: "", email: "", password: "", role: "viewer" as (typeof ROLES)[number] });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><UserPlus className="mr-1.5 h-4 w-4" />Create account</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create account</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await create({ data: f }); toast.success("Account created"); setOpen(false); setF({ fullName: "", email: "", password: "", role: "viewer" }); onDone(); } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); } }}>
          <div className="space-y-1.5"><Label htmlFor="cn">Full name</Label><Input id="cn" required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ce">Email</Label><Input id="ce" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="cpw">Temporary password (min. 10)</Label><Input id="cpw" type="text" minLength={10} required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="cr">Role</Label>
            <select id="cr" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as never })} className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm">
              <option value="viewer">Viewer — accesses shared documents</option><option value="owner">Document owner — uploads and shares</option><option value="admin">Administrator — manages users and audit</option>
            </select>
          </div>
          <DialogFooter><Button type="submit">Create</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
