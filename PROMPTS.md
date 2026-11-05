# PROMPTS.md

TrustVault was built iteratively with an AI pair-programmer (Lovable). This
file summarizes the prompts that shaped the project, for transparency and to
help contributors understand why things are the way they are.

## 1. Initial specification

> Build a secure document management and sharing platform ("TrustVault") with
> role-based access control (administrator, owner, viewer), document-specific
> read/edit permissions, access revocation, secure downloads, and an
> auditable activity history.

Key decisions from the clarification that followed:

- Build entirely on Lovable Cloud (managed backend) rather than a separate
  Python/FastAPI stack.
- Admin-provisioned accounts only — no public sign-up.

## 2. Implementation prompts

- Schema: profiles, roles, documents, document permissions, and an
  append-only hash-chained audit log with verification.
- Server functions as the only write path, re-checking authorization
  server-side and writing audit entries.
- Private storage bucket; 60-second signed URLs after a fresh permission
  check.
- One-time first-administrator bootstrap at `/setup`.

## 3. Design prompts

- Premium enterprise identity: warm off-white background, white panels,
  charcoal sidebar, forest-green accent, Geist typeface, thin borders, small
  radii. No gradients, neon, glassmorphism, or emoji.
- Login copy: "Your documents. Your control. Your trust." with the
  principles PRIVATE BY DEFAULT / ACCESS CONTROLLED / AUDIT VERIFIED.
- A 3D vault visual on the sign-in page was tried and **rejected by the
  user** — do not reintroduce it.

## 4. Hardening and SEO prompts

- Fix heading hierarchy across all routes (single descriptive H1 per page,
  no skipped levels) and add complete page metadata.
- Descriptive site title: "TrustVault — Secure document sharing".

## 5. Operations prompts

- Account handover: remove test data, prepare for a client administrator.
- Prepare the repository for public open-source release (this file,
  documentation set, license, security policy, sanitization).

## Lessons encoded as project rules

The durable rules that came out of these prompts live in `AGENTS.md`
(architecture invariants) and in the contribution guide's security-invariants
section. Read those before changing authorization, auditing, or file access.
