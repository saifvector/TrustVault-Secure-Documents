import { File, FileImage, FileSpreadsheet, FileText, LockKeyhole } from "lucide-react";

export function FileTypeIcon({ mime = "", name = "", compact = false }: { mime?: string; name?: string; compact?: boolean }) {
  const type = mime.startsWith("image/") ? "image" : /spreadsheet|excel|csv/.test(mime + name) ? "sheet" : /pdf|word|text/.test(mime + name) ? "text" : "file";
  const Icon = type === "image" ? FileImage : type === "sheet" ? FileSpreadsheet : type === "text" ? FileText : File;
  return <span className={`file-icon file-icon-${type} ${compact ? "file-icon-compact" : ""}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>;
}

export function UserAvatar({ name, small = false }: { name?: string | null | undefined; small?: boolean }) {
  return <span aria-hidden="true" className={`user-avatar ${small ? "user-avatar-small" : ""}`}>{(name || "U").split(/[ @]/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase()}</span>;
}

export function DocumentStack({ name, mime }: { name: string; mime: string }) {
  return <div className="document-signature"><div className="document-stack" aria-hidden="true"><span /><span /><span><FileTypeIcon mime={mime} name={name} /><i /><i /><i /><LockKeyhole className="stack-lock h-5 w-5" /></span></div><div className="min-w-0"><div className="tv-label mb-2">Document record</div><p className="truncate font-medium">{name}</p><p className="mt-1 text-xs text-muted-foreground">{mime}</p></div></div>;
}