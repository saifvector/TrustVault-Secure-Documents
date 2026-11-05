import { Link } from "@tanstack/react-router";
import { ACTION_LABELS, fmtDate } from "@/lib/me";
import { Outcome } from "@/components/vault-ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Link2, ShieldCheck, UserRound } from "lucide-react";

export type AuditRow = { id: string; seq: number; action: string; outcome: string; actor_email: string | null; document_id: string | null; target_user_id: string | null; ip: string | null; created_at: string; hash: string | null };

export function AuditTable({ rows, showIp }: { rows: AuditRow[]; showIp?: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">#</TableHead><TableHead>Event</TableHead><TableHead>Outcome</TableHead><TableHead>Actor</TableHead><TableHead>Target</TableHead>
          {showIp && <TableHead>IP</TableHead>}<TableHead className="text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="tv-mono text-muted-foreground" title={`Event ${r.id} · ${r.hash ?? ""}`}><span className="flex items-center gap-2"><Link2 className="h-3 w-3 text-muted-foreground" />{r.seq}</span></TableCell>
            <TableCell><span className="flex items-center gap-2 whitespace-nowrap">{r.action.startsWith("permission.") ? <ShieldCheck className="h-4 w-4 text-primary" /> : r.action.startsWith("user.") ? <UserRound className="h-4 w-4 text-muted-foreground" /> : <Activity className="h-4 w-4 text-muted-foreground" />}{ACTION_LABELS[r.action] ?? r.action}</span></TableCell>
            <TableCell><Outcome outcome={r.outcome} /></TableCell>
            <TableCell className="text-muted-foreground">{r.actor_email ?? "—"}</TableCell>
            <TableCell className="tv-mono text-muted-foreground">
              {r.document_id ? <Link to="/documents/$id" params={{ id: r.document_id }} className="hover:underline">doc:{r.document_id.slice(0, 8)}</Link> : r.target_user_id ? `user:${r.target_user_id.slice(0, 8)}` : "—"}
            </TableCell>
            {showIp && <TableCell className="tv-mono text-muted-foreground">{r.ip ?? "—"}</TableCell>}
            <TableCell className="whitespace-nowrap text-right text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
