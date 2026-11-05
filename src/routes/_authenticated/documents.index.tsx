import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMe, fmtDate } from "@/lib/me";
import { canUpload, formatBytes } from "@/lib/access";
import { Empty, PageHeader } from "@/components/vault-ui";
import { CATEGORIES, UploadDialog } from "@/components/upload-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileTypeIcon } from "@/components/file-identity";
import { ArrowUpRight, Search } from "lucide-react";

const PAGE = 20;
const search = z.object({
  scope: z.enum(["all", "mine", "shared"]).catch("all"),
  q: z.string().catch(""),
  category: z.string().catch(""),
  owner: z.string().catch(""),
  from: z.string().catch(""),
  sort: z.enum(["created_at", "name", "size_bytes"]).catch("created_at"),
  dir: z.enum(["asc", "desc"]).catch("desc"),
  page: z.number().int().min(0).catch(0),
});

export const Route = createFileRoute("/_authenticated/documents/")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Documents — TrustVault" }, { name: "description", content: "Documents you can access." }, { property: "og:title", content: "Documents — TrustVault" }, { property: "og:description", content: "Documents you can access." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Documents,
});

const TITLES = { all: "All documents", mine: "My documents", shared: "Shared with me" };

function Documents() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const me = useMe();
  const set = (patch: Partial<typeof s>) => navigate({ search: { ...s, page: 0, ...patch } });

  const { data: people } = useQuery({
    queryKey: ["people"],
    queryFn: async () => (await supabase.from("profiles").select("id,email,full_name")).data ?? [],
  });
  const nameOf = (id: string) => { const p = people?.find((x) => x.id === id); return p ? p.full_name || p.email : "—"; };

  const { data, isLoading } = useQuery({
    queryKey: ["documents", s, me?.id],
    enabled: !!me,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!me) return { rows: [], count: 0 };
      let q = supabase.from("documents").select("id,name,category,owner_id,size_bytes,created_at,mime_type", { count: "exact" });
      if (s.scope === "mine") q = q.eq("owner_id", me.id);
      if (s.scope === "shared") {
        const { data: perms } = await supabase.from("document_permissions").select("document_id").eq("user_id", me.id);
        const ids = (perms ?? []).map((p) => p.document_id);
        if (!ids.length) return { rows: [], count: 0 };
        q = q.in("id", ids);
      }
      if (s.scope === "all" && !me.roles.includes("admin")) {/* RLS already limits to accessible docs */}
      if (s.q) q = q.ilike("name", `%${s.q.replace(/[%_]/g, "")}%`);
      if (s.category) q = q.eq("category", s.category);
      if (s.owner) q = q.eq("owner_id", s.owner);
      if (s.from) q = q.gte("created_at", s.from);
      const { data, count } = await q.order(s.sort, { ascending: s.dir === "asc" }).range(s.page * PAGE, s.page * PAGE + PAGE - 1);
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const pages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE));
  const sortBy = (col: typeof s.sort) => set({ sort: col, dir: s.sort === col && s.dir === "desc" ? "asc" : "desc" });
  const arrow = (col: string) => (s.sort === col ? (s.dir === "asc" ? " ↑" : " ↓") : "");

  return (
    <div className="space-y-5">
      <PageHeader
        crumbs={["Workspace", "Documents"]}
        title={TITLES[s.scope]}
        description={s.scope === "all" && me?.roles.includes("admin") ? "As an administrator you see metadata for all documents. Content still requires an explicit grant." : `${data?.count ?? 0} documents`}
        actions={me && canUpload(me.roles) ? <UploadDialog userId={me.id} /> : undefined}
      />
      <div className="filter-toolbar">
        <div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search documents…" defaultValue={s.q} className="h-9 bg-card pl-9" onKeyDown={(e) => e.key === "Enter" && set({ q: (e.target as HTMLInputElement).value })} aria-label="Search documents" /></div>
        <select aria-label="Category" value={s.category} onChange={(e) => set({ category: e.target.value })} className="h-9 rounded-md border border-input bg-card px-2 text-sm">
          <option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select aria-label="Owner" value={s.owner} onChange={(e) => set({ owner: e.target.value })} className="h-9 rounded-md border border-input bg-card px-2 text-sm">
          <option value="">Any owner</option>{people?.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
        </select>
        <Input type="date" aria-label="Created after" value={s.from} onChange={(e) => set({ from: e.target.value })} className="h-9 w-40 bg-card" />
      </div>
      <div className="tv-panel overflow-hidden">
        {!isLoading && !data?.rows.length ? (
          <Empty title="No documents" body={s.scope === "shared" ? "Nothing has been shared with you yet." : "No documents match these filters."} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Button variant="ghost" size="sm" className="h-auto p-0" onClick={() => sortBy("name")}>Document{arrow("name")}</Button></TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right"><Button variant="ghost" size="sm" className="h-auto p-0" onClick={() => sortBy("size_bytes")}>Size{arrow("size_bytes")}</Button></TableHead>
                <TableHead className="text-right"><Button variant="ghost" size="sm" className="h-auto p-0" onClick={() => sortBy("created_at")}>Created{arrow("created_at")}</Button></TableHead>
                <TableHead className="w-12"><span className="sr-only">Open document</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium"><Link to="/documents/$id" params={{ id: d.id }} className="flex items-center gap-3 hover:text-primary"><FileTypeIcon mime={d.mime_type} name={d.name} /><span className="max-w-64 truncate">{d.name}</span></Link></TableCell>
                  <TableCell className="text-muted-foreground">{d.category}</TableCell>
                  <TableCell className="text-muted-foreground">{d.owner_id === me?.id ? "You" : nameOf(d.owner_id)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{formatBytes(d.size_bytes)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmtDate(d.created_at)}</TableCell>
                  <TableCell><Button asChild variant="ghost" size="icon"><Link to="/documents/$id" params={{ id: d.id }} aria-label={`Open ${d.name}`} title={`Open ${d.name}`}><ArrowUpRight /></Link></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">Page {s.page + 1} of {pages}</span>
          <Button variant="outline" size="sm" disabled={s.page === 0} onClick={() => navigate({ search: { ...s, page: s.page - 1 } })}>Previous</Button>
          <Button variant="outline" size="sm" disabled={s.page + 1 >= pages} onClick={() => navigate({ search: { ...s, page: s.page + 1 } })}>Next</Button>
        </div>
      )}
    </div>
  );
}
