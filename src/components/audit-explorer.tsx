import { useState } from "react";
import { Search } from "lucide-react";
import { AuditTable, type AuditRow } from "@/components/audit-table";
import { Input } from "@/components/ui/input";
import { Empty } from "@/components/vault-ui";

export function AuditExplorer({ rows, showIp = false }: { rows: AuditRow[]; showIp?: boolean }) {
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [outcome, setOutcome] = useState("");
  const [category, setCategory] = useState("");
  const filtered = rows.filter(r => (!q || `${r.actor_email ?? ""} ${r.action} ${r.document_id ?? ""} ${r.id}`.toLowerCase().includes(q.toLowerCase())) && (!date || r.created_at.slice(0, 10) >= date) && (!outcome || r.outcome === outcome) && (!category || r.action.startsWith(category)));
  return <><div className="filter-toolbar"><div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="bg-card pl-9" placeholder="Search actor, document or event…" aria-label="Search audit events" value={q} onChange={e => setQ(e.target.value)} /></div><select aria-label="Event category" className="h-9 rounded-md border bg-card px-3 text-xs" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option><option value="auth.">Authentication</option><option value="document.">Documents</option><option value="permission.">Permissions</option><option value="user.">Accounts</option><option value="audit.">Audit</option></select><select aria-label="Event outcome" className="h-9 rounded-md border bg-card px-3 text-xs" value={outcome} onChange={e => setOutcome(e.target.value)}><option value="">All outcomes</option><option value="success">Success</option><option value="denied">Denied</option><option value="failure">Failure</option></select><Input type="date" aria-label="Events after" className="w-40 bg-card" value={date} onChange={e => setDate(e.target.value)} /></div><div className="mb-3 mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{filtered.length} recorded events</span><span>Newest first</span></div><div className="overflow-hidden rounded-md border bg-card">{filtered.length ? <AuditTable rows={filtered} showIp={showIp} /> : <Empty title="No matching events" body="No recorded events match these filters." />}</div></>;
}