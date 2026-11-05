# Installation

This guide takes you from a fresh clone to a running TrustVault instance
with your own backend.

## Prerequisites

- Node.js 20+ (or Bun)
- A backend project: **Lovable Cloud** (recommended — this is what the app
  was built and tested on) or a compatible Supabase project

> **Honest note:** TrustVault was built on Lovable Cloud. Cloning this
> repository gives you the full application code, but **not** a backend —
> you must connect your own. Self-hosting on Docker, Railway, or a bare
> Postgres server has **not** been implemented or tested; the instructions
> below are the only supported path.

## 1. Clone and install

```sh
git clone <repository-url>
cd trustvault
npm install
```

## 2. Create your backend

**Option A — Lovable Cloud (recommended):** open the project in
[Lovable](https://lovable.dev) and enable Lovable Cloud. The database,
authentication, and storage are provisioned for you, and the environment
variables are injected automatically.

**Option B — your own Supabase project:**

1. Create a project at your Supabase-compatible provider.
2. Apply the schema: run `drizzle/migrations/0000_trustvault_schema.sql`
   in the SQL editor (or via `psql`). See [DATABASE.md](DATABASE.md).
3. Create a **private** storage bucket named `documents` with a 25 MB file
   size limit.
4. In authentication settings:
   - disable public sign-ups,
   - disable anonymous sign-ins,
   - enable compromised-password (haveibeenpwned) checking.
5. Copy `.env.example` to `.env` and fill in your project URL, publishable
   key, and service-role key. The service-role key is server-only — never
   put it in a `VITE_*` variable.

## 3. Run

```sh
npm run dev
```

Open http://localhost:5173 (or the port Vite prints).

## 4. Create the first administrator

1. Visit `/setup`. This page works **only while no administrator exists** —
   it closes permanently afterwards, so there is no race to become the
   first admin.
2. Enter your name, email, and a strong password (minimum 10 characters).
3. Sign in at `/auth`.

## 5. Create users and share documents

1. As the administrator, open **Administration → Create account** and create
   owner and viewer accounts with temporary passwords.
2. Owners sign in, upload documents from the dashboard, and share them with
   read or edit grants.
3. Viewers see only what was shared with them.
4. Verify restrictions: a viewer cannot open a document that was never
   shared, and a revoked grant stops working within 60 seconds.

## Verifying the installation

```sh
npm run test    # unit + routing tests
npm run lint
npm run build
```

In the UI, as an admin: open **Administration → Verify audit chain** — it
should report the chain intact.

## Troubleshooting

- **"Setup already completed"** — an administrator already exists; sign in
  instead. To recover a lost admin account, see [FAQ.md](FAQ.md).
- **Login fails with a valid password** — check that the account is active
  (admins can see this under Administration).
- **Uploads fail** — confirm the `documents` bucket exists, is private, and
  the file is under 25 MB.
