import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Activity, ArrowUpRight, Files, FolderLock, HardDrive, LockKeyhole, Share2, ShieldCheck, Users } from "lucide-react";

export function PageHeader({ crumbs, title, description, actions }: { crumbs?: string[]; title: string; description?: string | undefined; actions?: ReactNode }) {
  return (
    <div className="tv-page-header flex flex-wrap items-end justify-between gap-4 border-b">
      <div className="min-w-0 flex-1 basis-64">
        {crumbs && <div className="tv-label mb-2">{crumbs.join("  /  ")}</div>}
        <h1 className="font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  const Icon = /storage/i.test(label) ? HardDrive : /owned/i.test(label) ? FolderLock : /shared/i.test(label) ? Share2 : /users/i.test(label) ? Users : /denied|suspicious/i.test(label) ? ShieldCheck : /events/i.test(label) ? Activity : Files;
  return (
    <div className="tv-panel tv-stat p-5">
      <Icon className="tv-stat-icon h-4 w-4" aria-hidden="true" />
      <div className="tv-label">{label}</div>
      <div className="tv-stat-value mt-4 font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="tv-empty-icon"><FolderLock className="h-6 w-6" /></div>
      <div className="text-sm font-medium">{title}</div>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LevelBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant={level === "owner" ? "default" : level === "edit" ? "secondary" : "outline"} className="rounded-sm font-medium uppercase tracking-wide text-[10px]">
      <LockKeyhole className="mr-1 h-3 w-3" />{level}
    </Badge>
  );
}

export function Outcome({ outcome }: { outcome: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium",
      outcome === "success" && "text-success",
      outcome === "denied" && "text-destructive",
      outcome === "failure" && "text-warning")}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {outcome}
    </span>
  );
}
