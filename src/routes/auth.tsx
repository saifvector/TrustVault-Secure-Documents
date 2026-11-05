import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSetupStatus, loginWithPassword } from "@/lib/vault.functions";
import { AuthFrame } from "@/components/auth-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — TrustVault" },
      { name: "description", content: "Sign in to your TrustVault workspace." },
      { property: "og:title", content: "Sign in — TrustVault" },
      { property: "og:description", content: "Sign in to your TrustVault workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const login = useServerFn(loginWithPassword);
  const status = useServerFn(getSetupStatus);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { status().then((s) => setNeedsSetup(s.needsSetup)).catch(() => {}); }, [status]);

  const safeRedirect = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard";

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await login({ data: { email, password } });
      if (!res.ok) { setError(res.message); return; }
      await supabase.auth.setSession({ access_token: res.access_token, refresh_token: res.refresh_token });
      navigate({ to: safeRedirect as never, replace: true });
    } catch {
      setError("Sign-in failed. Check your details and try again.");
    } finally { setBusy(false); }
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    toast.success("If that account exists, a reset link is on its way.");
    setMode("login");
  }

  return (
    <AuthFrame title={mode === "login" ? "Sign in" : "Reset password"} subtitle={mode === "login" ? "Use the credentials your administrator provided." : "We'll email a secure reset link."}>
      {needsSetup && (
        <div className="mb-5 rounded-sm border border-warning/40 bg-warning/10 p-3 text-sm">
          No administrator exists yet. <Link to="/setup" className="font-medium underline">Set up the first administrator</Link>.
        </div>
      )}
      <form onSubmit={mode === "login" ? onLogin : onForgot} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" placeholder="you@company.com" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode === "login" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Button variant="link" size="sm" type="button" className="h-auto p-0 text-xs" onClick={() => setMode("forgot")}>Forgot password?</Button>
            </div>
            <div className="relative"><Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" className="pr-12" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 text-muted-foreground" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full justify-between px-4" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in to workspace" : "Send reset link"}{busy ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}</Button>
        {mode === "forgot" && <Button variant="ghost" type="button" className="w-full text-sm text-muted-foreground" onClick={() => setMode("login")}>Back to sign in</Button>}
      </form>
    </AuthFrame>
  );
}
