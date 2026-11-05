import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "TrustVault — Secure document sharing" },
      { name: "description", content: "Share documents only with people you choose, with a tamper-evident audit trail." },
      { property: "og:title", content: "TrustVault — Secure document sharing" },
      { property: "og:description", content: "Share documents only with people you choose, with a tamper-evident audit trail." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate({ to: data.session ? "/dashboard" : "/auth", replace: true });
    });
  }, [navigate]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-lg space-y-3">
        <h1 className="text-2xl font-semibold">TrustVault secure document sharing</h1>
        <p className="text-sm text-muted-foreground">Share documents only with people you choose, with a tamper-evident audit trail of access and permission changes.</p>
        <p role="status" className="text-sm text-muted-foreground">Opening your workspace…</p>
      </div>
    </main>
  );
}
