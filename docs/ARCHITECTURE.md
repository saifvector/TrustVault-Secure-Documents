# Architecture

## Overview

TrustVault is a full-stack React application built on **TanStack Start v1**
(SSR-capable, Vite 7) with a managed backend (**Lovable Cloud**, which
provides a Supabase-compatible Postgres database, authentication, and object
storage).

```text
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│  React 19 UI (Tailwind v4, shadcn/ui)                       │
│  • read-only queries via the publishable key (RLS-enforced) │
│  • all writes go through server functions (RPC)             │
└──────────────┬──────────────────────────────┬───────────────┘
               │ HTTPS                        │ HTTPS
               ▼                              ▼
┌──────────────────────────────┐   ┌──────────────────────────┐
│  TanStack Start server       │   │  Backend (Lovable Cloud) │
│  (server functions)          │   │                          │
│  • requireSupabaseAuth       │──▶│  Postgres + RLS          │
│  • re-check authorization    │   │  Auth (email/password)   │
│    via DB functions          │   │  Private storage bucket  │
│  • write audit entries       │   │  Security-definer        │
│  • issue 60 s signed URLs    │   │  functions & triggers    │
└──────────────────────────────┘   └──────────────────────────┘
```

## Request flow for a sensitive operation

Every write follows the same pattern (example: downloading a document):

1. The browser calls a server function (`getDownloadUrl`).
2. `requireSupabaseAuth` middleware verifies the caller's bearer token.
3. The handler calls the database function `doc_access_level(doc, user)` to
   compute the caller's effective access (owner / edit / read / none).
4. If access is insufficient, the attempt is audited as `denied` and
   rejected.
5. On success, the privileged server client creates a 60-second signed URL
   for the private storage bucket and writes an audit entry.
6. The browser receives the signed URL and fetches the file directly from
   storage. The URL expires in 60 seconds, so revocation is effectively
   immediate.

## Key design decisions

| Decision | Why |
| --- | --- |
| All writes through server functions (`src/lib/vault.functions.ts`) | Authorization and auditing must happen server-side; browser clients keep read-only table access. |
| Authorization in database functions (`has_role`, `doc_access_level`, `is_active_user`) | One canonical implementation, usable from both RLS policies and server functions. |
| Append-only, hash-chained audit log | Tamper evidence: any modification or deletion breaks the chain and is detected by `verify_audit_chain()`. |
| Private storage bucket, no client read policy | Revocation must take effect immediately; content is only reachable through short-lived signed URLs. |
| Admins see metadata, not content | Product requirement: administration must not bypass content authorization. |
| Server-only helpers in `*.server.ts`, imported dynamically | Keeps privileged code out of the browser bundle. |

## Directory map

```text
src/
├── routes/                  # TanStack Start file-based routes
│   ├── __root.tsx           # App shell
│   ├── index.tsx            # Landing / redirect
│   ├── auth.tsx             # Sign in
│   ├── setup.tsx            # One-time first-admin bootstrap
│   ├── reset-password.tsx
│   └── _authenticated/      # Routes requiring a session
│       ├── dashboard.tsx
│       ├── documents.index.tsx
│       ├── documents.$id.tsx
│       ├── activity.tsx     # Audit explorer
│       ├── admin.tsx        # User administration
│       └── settings.tsx
├── lib/
│   ├── vault.functions.ts   # All server functions (the only write path)
│   ├── audit.server.ts      # Audit writer (server-only)
│   ├── access.ts            # Access rules + constants (+ tests)
│   └── me.ts                # Current-user helpers
├── integrations/supabase/   # Generated clients + auth middleware
└── components/              # UI components (shadcn/ui based)

drizzle/
├── schema.ts                # Database schema (Drizzle)
└── migrations/              # SQL migrations

supabase/
└── config.toml              # Backend project config
```

## Frontend

- React 19, TanStack Router (file-based), TanStack Query for data loading.
- Tailwind CSS v4 with semantic design tokens in `src/styles.css`; dark mode
  supported. Visual identity: warm off-white, white panels, charcoal
  sidebar, forest-green accent.
- shadcn/ui component primitives; `sonner` for toasts.
