import { createFileRoute, Link, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, FileText, FolderLock, LayoutGrid, LogOut, Settings, Share2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, useMe } from "@/lib/me";
import { recordLogout } from "@/lib/vault.functions";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/file-identity";
import { useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, Search, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } });
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me?.isActive) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
  },
  component: Shell,
});

function NavItem({ to, search, icon: Icon, children }: { to: string; search?: Record<string, string>; icon: typeof FileText; children: string }) {
  return (
    <Link
      to={to as never}
      search={search as never}
      activeOptions={{ exact: true, includeSearch: true }}
      title={children}
      className="nav-item flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
    >
      <Icon className="h-4 w-4 opacity-80" />
      <span className="nav-label">{children}</span>
    </Link>
  );
}

function Shell() {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const logout = useServerFn(recordLogout);
  const isAdmin = me?.roles.includes("admin");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const section = location.pathname.startsWith("/documents") ? "Documents" : location.pathname === "/admin" ? "Administration" : location.pathname === "/settings" ? "Settings" : location.pathname === "/activity" ? "Activity" : "Overview";

  async function signOut() {
    try { await logout(); } catch { /* ignore */ }
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navigation = <>
    <div className="sidebar-brand mb-8 flex items-center gap-3 px-2.5">
      <span className="brand-lock"><FolderLock className="h-5 w-5" /></span>
      <span className="nav-label text-lg font-semibold text-sidebar-accent-foreground">TrustVault<span className="text-sidebar-primary">.</span></span>
    </div>
    <div className="sidebar-section tv-label mb-3 px-2.5 text-sidebar-foreground/60">Workspace</div>
    <nav className="flex flex-col" aria-label="Workspace navigation" onClick={() => setMobileOpen(false)}>
      <NavItem to="/dashboard" icon={LayoutGrid}>Overview</NavItem>
      <NavItem to="/documents" search={{ scope: "all" }} icon={FileText}>All documents</NavItem>
      <NavItem to="/documents" search={{ scope: "mine" }} icon={FolderLock}>My documents</NavItem>
      <NavItem to="/documents" search={{ scope: "shared" }} icon={Share2}>Shared with me</NavItem>
      <NavItem to="/activity" icon={Activity}>Activity</NavItem>
      {isAdmin && <><div className="sidebar-section tv-label mb-3 mt-7 px-2.5 text-sidebar-foreground/60">Security</div><NavItem to="/admin" icon={ShieldCheck}>Administration</NavItem></>}
    </nav>
    <div className="mt-auto pt-8">
      <NavItem to="/settings" icon={Settings}>Settings</NavItem>
      <div className="mt-4 flex items-center gap-3 border-t border-sidebar-border px-2 pt-5">
        <UserAvatar name={me?.fullName || me?.email} />
        <div className="sidebar-user-info min-w-0"><div className="truncate text-sm font-medium text-sidebar-accent-foreground">{me?.fullName || me?.email}</div><div className="mt-0.5 truncate text-[11px] text-sidebar-foreground/70">{me?.email}</div><div className="mt-2 flex gap-1">{me?.roles.map(r => <span key={r} className="rounded-sm border border-sidebar-border px-1.5 py-0.5 text-[9px] uppercase text-sidebar-primary">{r}</span>)}</div></div>
      </div>
      <Button variant="ghost" onClick={signOut} title="Sign out" className="mt-4 w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><LogOut /><span className="nav-label">Sign out</span></Button>
    </div>
  </>;

  return (
    <div className="flex min-h-screen">
      <aside className={`app-sidebar sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar px-3 py-6 md:flex ${collapsed ? "collapsed" : ""}`}>
        {navigation}
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="mt-3 self-end text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} title={collapsed ? "Expand navigation" : "Collapse navigation"}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-header border-b bg-card">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation"><Menu /></Button></SheetTrigger><SheetContent side="left" className="sidebar-mobile flex w-72 flex-col border-sidebar-border bg-sidebar px-4 py-7"><SheetTitle className="sr-only">TrustVault navigation</SheetTitle>{navigation}</SheetContent></Sheet>
            <span className="hidden text-xs text-muted-foreground md:inline">Workspace</span><ChevronRight className="hidden h-3 w-3 text-muted-foreground md:block" /><span className="text-xs font-medium">{section}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground"><Link to="/documents" search={{ scope: "all" }}><Search /><span className="hidden sm:inline">Search documents</span></Link></Button>
            <div className="h-5 border-l" />
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Account menu"><UserAvatar name={me?.fullName || me?.email} small /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link to="/settings"><Settings className="mr-2 h-4 w-4" />Account settings</Link></DropdownMenuItem><DropdownMenuItem onSelect={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
          </div>
        </header>
        <main key={location.pathname} className="app-content mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-7 lg:px-9 lg:py-9"><Outlet /></main>
      </div>
    </div>
  );
}
