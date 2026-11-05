import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { Empty, PageHeader } from "@/components/vault-ui";
import { AuditExplorer } from "@/components/audit-explorer";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({ meta: [{ title: "Activity — TrustVault" }, { name: "description", content: "Your recorded actions." }, { property: "og:title", content: "Activity — TrustVault" }, { property: "og:description", content: "Your recorded actions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const me = useMe();
  const { data } = useQuery({
    queryKey: ["my-activity", me?.id],
    enabled: !!me,
    queryFn: async () => { if (!me) return []; return (await supabase.from("audit_logs").select("id,seq,action,outcome,actor_email,document_id,target_user_id,ip,created_at,hash").eq("actor_id", me.id).order("seq", { ascending: false }).limit(200)).data ?? []; },
  });
  return (
    <div className="space-y-5">
      <PageHeader crumbs={["Workspace", "Activity"]} title="Your activity" description="Every action recorded against your account, newest first." />
      <AuditExplorer rows={data ?? []} />
    </div>
  );
}
