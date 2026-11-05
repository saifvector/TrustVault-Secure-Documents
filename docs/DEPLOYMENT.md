# Deployment

## Supported path: Lovable

TrustVault is built and tested on Lovable with Lovable Cloud. Deployment is:

1. Open the project in Lovable.
2. Click **Publish**. Lovable builds the app and deploys it to your
   `*.lovable.app` URL; the Lovable Cloud backend (database, auth, storage)
   is shared between preview and production.
3. Optionally connect a custom domain in project settings.

Environment variables are managed by the platform — you do not deploy
`.env`.

## What gets deployed

- The TanStack Start application (SSR + server functions), built with
  Vite 7 and deployed to an edge runtime.
- The backend schema comes from `drizzle/migrations/` — apply migrations
  before or with the release that needs them.

## Release checklist

1. `npm run test`, `npm run lint`, and `npm run build` all pass.
2. Database migrations are applied.
3. No secrets are committed (`.env` is gitignored; only `.env.example`
   exists in the repo).
4. The first administrator has been created via `/setup` and the page now
   reports setup complete.
5. Public sign-up is disabled in auth settings.
6. As an admin, run **Verify audit chain** after the deploy.

## Other platforms

Self-hosting on Docker, Railway, Vercel, or a bare VPS has **not been
implemented or tested**. The application expects a Supabase-compatible
backend (Postgres with RLS, Auth, and Storage) and an edge-compatible
runtime for server functions. If you port it, the pieces you must reproduce
are documented in [ARCHITECTURE.md](ARCHITECTURE.md) and
[DATABASE.md](DATABASE.md) — and please contribute the result back.
