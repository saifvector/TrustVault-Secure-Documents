import type { ReactNode } from "react";
import { Fingerprint, FolderLock, LockKeyhole, ShieldCheck } from "lucide-react";

export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <div className="flex items-center gap-3">
          <span className="brand-lock"><FolderLock className="h-5 w-5" /></span>
          <span className="text-lg font-semibold">TrustVault<span className="ml-1 text-sidebar-primary">.</span></span>
        </div>
        <div className="auth-story-copy">
          <h2>Your documents.<br />Your control.<br /><span className="text-sidebar-primary">Your trust.</span></h2>
          <p>Every document remains private until access is explicitly granted. Every important action leaves a verifiable record.</p>
        </div>
        <div className="auth-principles">
          <span><LockKeyhole className="h-3.5 w-3.5 text-sidebar-primary" />PRIVATE BY DEFAULT</span>
          <span><Fingerprint className="h-3.5 w-3.5 text-sidebar-primary" />ACCESS CONTROLLED</span>
          <span><ShieldCheck className="h-3.5 w-3.5 text-sidebar-primary" />AUDIT VERIFIED</span>
        </div>
      </div>
      <div className="auth-form-side">
        <div className="auth-form-top"><LockKeyhole className="h-3.5 w-3.5" /> Private workspace</div>
        <div className="auth-form-center"><div className="auth-form">
          <span className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-md border bg-card text-primary"><Fingerprint className="h-6 w-6" /></span>
          <h1>{title}</h1>
          <p className="mb-8 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          {children}
          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">Accounts are provisioned by your administrator.</p>
        </div></div>
        <div className="auth-footer"><span>TrustVault · Secure document sharing</span><span>Private by design</span></div>
      </div>
    </div>
  );
}
