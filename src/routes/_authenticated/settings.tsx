import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { PageHeader } from "@/components/vault-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/file-identity";
import { KeyRound, UserRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Workspace settings — TrustVault" }, { name: "description", content: "Manage your TrustVault profile and password." }, { property: "og:title", content: "Workspace settings — TrustVault" }, { property: "og:description", content: "Manage your TrustVault profile and password." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [name, setName] = useState(me?.fullName ?? "");
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  return (
    <div className="space-y-6">
      <PageHeader crumbs={["Workspace", "Settings"]} title="Workspace settings" description="Your profile and account security." />
      <div className="flex items-center gap-4 border-b pb-6"><UserAvatar name={me?.fullName || me?.email} /><div><p className="font-medium">{me?.fullName || me?.email}</p><p className="mt-1 text-xs text-muted-foreground">{me?.roles.join(" · ")}</p></div></div>
      <form className="tv-panel max-w-lg space-y-4 p-5" onSubmit={async (e) => { e.preventDefault(); if (!me) return; const { error } = await supabase.from("profiles").update({ full_name: name.trim().slice(0, 100) }).eq("id", me.id); if (error) { toast.error(error.message); return; } qc.invalidateQueries(); toast.success("Profile saved"); }}>
        <h2 className="flex items-center gap-2 text-sm font-semibold"><UserRound className="h-4 w-4 text-primary" />Profile</h2>
        <div className="space-y-1.5"><Label>Email</Label><Input value={me?.email ?? ""} disabled /></div>
        <div className="space-y-1.5"><Label htmlFor="nm">Full name</Label><Input id="nm" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /></div>
        <Button size="sm" type="submit">Save</Button>
      </form>
      <form className="tv-panel max-w-lg space-y-3 p-5" onSubmit={async (e) => { e.preventDefault(); const { error } = await supabase.auth.updateUser({ password: pw, current_password: cur } as never); if (error) { toast.error(error.message); return; } setCur(""); setPw(""); toast.success("Password changed"); }}>
        <h2 className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="h-4 w-4 text-primary" />Change password</h2>
        <div className="space-y-1.5"><Label htmlFor="cp">Current password</Label><Input id="cp" type="password" required value={cur} onChange={(e) => setCur(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="np">New password</Label><Input id="np" type="password" minLength={10} required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <Button size="sm" type="submit">Update password</Button>
      </form>
    </div>
  );
}
