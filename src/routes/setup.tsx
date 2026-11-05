import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { bootstrapAdmin } from "@/lib/vault.functions";
import { AuthFrame } from "@/components/auth-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Initial setup — TrustVault" },
      { name: "description", content: "Create the first TrustVault administrator." },
      { property: "og:title", content: "Initial setup — TrustVault" },
      { property: "og:description", content: "Create the first TrustVault administrator." },
    ],
  }),
  component: Setup,
});

function Setup() {
  const navigate = useNavigate();
  const run = useServerFn(bootstrapAdmin);
  const [f, setF] = useState({ fullName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await run({ data: f });
      toast.success("Administrator created. Sign in to continue.");
      navigate({ to: "/auth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally { setBusy(false); }
  }

  return (
    <AuthFrame title="Create the first administrator" subtitle="Available only once, while no administrator exists.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="n">Full name</Label><Input id="n" required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="e">Email</Label><Input id="e" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="p">Password (min. 10 characters)</Label><Input id="p" type="password" minLength={10} required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create administrator"}</Button>
      </form>
    </AuthFrame>
  );
}
