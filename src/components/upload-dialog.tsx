import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp, Upload, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createDocument } from "@/lib/vault.functions";
import { MAX_FILE_BYTES, formatBytes } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const CATEGORIES = ["General", "Contract", "Finance", "Legal", "HR", "Engineering", "Policy"];

export function UploadDialog({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const create = useServerFn(createDocument);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return undefined;
    if (file.size > MAX_FILE_BYTES) { toast.error(`Files must be under ${formatBytes(MAX_FILE_BYTES)}`); return undefined; }
    setBusy(true);
    const path = `${userId}/${crypto.randomUUID()}`;
    const { error } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (error) { setBusy(false); toast.error("Upload failed: " + error.message); return undefined; }
    try {
      await create({ data: { storagePath: path, name: name || file.name, description, category, mimeType: file.type } });
      toast.success("Document uploaded");
      qc.invalidateQueries();
      setOpen(false); setFile(null); setName(""); setDescription("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Upload className="mr-1.5 h-4 w-4" />Upload document</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-3 rounded-md border border-dashed bg-secondary/50 p-5">
            <FileUp className="mx-auto h-8 w-8 text-primary" />
            <Label htmlFor="f">File</Label>
            <Input id="f" type="file" required onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); if (f && !name) setName(f.name); }} />
            <p className="text-xs text-muted-foreground">Stored privately. Only you can access it until you grant permission.</p>
          </div>
          <div className="space-y-1.5"><Label htmlFor="n">Name</Label><Input id="n" value={name} maxLength={255} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="c">Category</Label>
            <select id="c" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="d">Description</Label><Textarea id="d" value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} /></div>
          <DialogFooter><Button type="submit" disabled={busy || !file}>{busy && <LoaderCircle className="animate-spin" />}{busy ? "Uploading…" : "Upload document"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
