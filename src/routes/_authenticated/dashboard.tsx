import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useMe, fmtDate, ACTION_LABELS } from "@/lib/me";
import { canUpload, formatBytes } from "@/lib/access";
import { Empty, PageHeader, Stat } from "@/components/vault-ui";
import { UploadDialog } from "@/components/upload-dialog";
import { FileTypeIcon } from "@/components/file-identity";
import { Activity, ArrowUpRight, Check, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Workspace overview — TrustVault" }, { name: "description", content: "Your TrustVault documents, access and recent activity at a glance." }, { property: "og:title", content: "Workspace overview — TrustVault" }, { property: "og:description", content: "Your TrustVault documents, access and recent activity at a glance." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

function Dashboard() {
  const me = useMe();
  const { data } = useQuery({
    queryKey: ["overview", me?.id],
    enabled: !!me,
    queryFn: async () => {
      if (!me) return { owned: [], sharedCount: 0, storage: 0, events: [], perms: [], days: [] };
      const uid = me.id;
      const since = new Date(Date.now() - 13 * 864e5); since.setHours(0, 0, 0, 0);
      const [{ data: owned }, { data: shared }, { data: events }] = await Promise.all([
        supabase.from("documents").select("id,name,size_bytes,created_at").eq("owner_id", uid).order("created_at", { ascending: false }),
        supabase.from("document_permissions").select("document_id,level").eq("user_id", uid),
        supabase.from("audit_logs").select("id,action,outcome,created_at,document_id").eq("actor_id", uid).gte("created_at", since.toISOString()).order("seq", { ascending: false }).limit(500),
      ]);
      const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(since.getTime() + i * 864e5); return { key: d.toDateString(), label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), events: 0 }; });
      for (const e of events ?? []) { const d = days.find((x) => x.key === new Date(e.created_at).toDateString()); if (d) d.events++; }
      return {
        owned: owned ?? [],
        sharedCount: shared?.length ?? 0,
        storage: (owned ?? []).reduce((a, d) => a + Number(d.size_bytes), 0),
        events: events ?? [],
        perms: (events ?? []).filter((e) => e.action.startsWith("permission.")).slice(0, 6),
        days,
      };
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader crumbs={["Workspace"]} title="Workspace overview" description="Your documents, access, and recent activity." actions={me && canUpload(me.roles) ? <UploadDialog userId={me.id} /> : undefined} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Accessible documents" value={(data?.owned.length ?? 0) + (data?.sharedCount ?? 0)} hint="Owned and shared with you" />
        <Stat label="Owned documents" value={data?.owned.length ?? 0} hint="Private until you share" />
        <Stat label="Shared with you" value={data?.sharedCount ?? 0} />
        <Stat label="Storage used" value={formatBytes(data?.storage ?? 0)} hint="Across your documents" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="tv-panel p-4">
          <div className="mb-5 flex items-baseline justify-between"><h2 className="text-sm font-semibold">Activity analytics</h2><div className="tv-label">Last 14 days · {data?.events.length ?? 0} events</div></div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.days ?? []} margin={{ left: -24, right: 0, top: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" interval={1} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--card)", color: "var(--foreground)", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }} />
                <Bar dataKey="events" fill="var(--chart-1)" maxBarSize={24} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="tv-panel">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Recent uploads</h2><Link to="/documents" search={{ scope: "mine" }} className="flex items-center gap-1 text-xs text-primary">View all <ArrowUpRight className="h-3 w-3" /></Link></div>
          {data?.owned.length ? (
            <ul className="divide-y text-sm">{data.owned.slice(0, 6).map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3"><FileTypeIcon name={d.name} compact /><div className="min-w-0 flex-1"><Link to="/documents/$id" params={{ id: d.id }} className="block truncate font-medium hover:text-primary">{d.name}</Link><span className="mt-1 block text-xs text-muted-foreground">{formatBytes(d.size_bytes)} · {fmtDate(d.created_at)}</span></div><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></li>
            ))}</ul>
          ) : <Empty title="No uploads" body="Documents you upload will appear here." />}
        </section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="tv-panel">
          <h2 className="mb-3 py-3 text-sm font-semibold">Recent activity</h2>
          <ul className="divide-y text-sm">{(data?.events ?? []).slice(0, 8).map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-3"><Activity className="audit-event-icon" /><span className={`min-w-0 flex-1 ${e.outcome === "denied" ? "text-destructive" : ""}`}>{ACTION_LABELS[e.action] ?? e.action}</span><span className="text-xs text-muted-foreground">{fmtDate(e.created_at)}</span></li>
          ))}</ul>
        </section>
        <section className="tv-panel">
          <h2 className="mb-3 py-3 text-sm font-semibold">Permission changes</h2>
          {data?.perms.length ? (
            <ul className="divide-y text-sm">{data.perms.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3"><ShieldCheck className="audit-event-icon" /><span className="flex-1">{ACTION_LABELS[e.action]}</span><span className="text-xs text-muted-foreground">{fmtDate(e.created_at)}</span></li>
            ))}</ul>
          ) : <Empty title="No permission changes" body="Grants and revocations you make are listed here." />}
        </section>
      </div>
    </div>
  );
}
