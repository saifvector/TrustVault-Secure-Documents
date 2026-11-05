# Contributing to TrustVault

Thank you for your interest in contributing. TrustVault is a security-first
application, so contributions are held to a higher bar than a typical web
app: changes that touch authorization, auditing, or file access receive
extra scrutiny.

## Ways to contribute

- Report bugs (use the bug report template).
- Suggest features (use the feature request template).
- Improve documentation.
- Submit pull requests for open issues.

**Security vulnerabilities must not be reported in public issues.** See
[SECURITY.md](SECURITY.md).

## Development setup

1. Fork and clone the repository.
2. Install dependencies:

   ```sh
   npm install
   ```

3. Copy `.env.example` to `.env` and configure your own backend
   (see [docs/INSTALLATION.md](docs/INSTALLATION.md)).
4. Apply the database schema to your backend
   (see [docs/DATABASE.md](docs/DATABASE.md)).
5. Start the dev server:

   ```sh
   npm run dev
   ```

6. Create your first administrator at `/setup` (available only while no
   administrator exists).

## Running checks

```sh
npm run test    # unit and routing tests (vitest)
npm run lint    # eslint
npm run build   # production build
```

All three must pass before a pull request is merged.

## Coding conventions

- **TypeScript everywhere.** No new `any` without a justification comment.
- **Styling:** Tailwind CSS v4 with the semantic design tokens defined in
  `src/styles.css`. Do not hardcode color values in components; use the
  tokens so dark mode keeps working. The visual identity is warm off-white,
  white panels, charcoal sidebar, and a forest-green accent — no gradients,
  neon, glassmorphism, or emoji in the UI.
- **Routing:** TanStack Start file-based routing in `src/routes/`. Never add
  `react-router-dom` or a pages directory.
- **Server logic:** app-internal server logic uses `createServerFn` from
  `@tanstack/react-start`. External HTTP endpoints go under
  `src/routes/api/public/` and must verify the caller themselves.

## Security invariants (do not break these)

These rules are load-bearing. A pull request that weakens any of them will
not be merged:

1. **All writes go through server functions** in `src/lib/vault.functions.ts`
   (or follow the same pattern): re-check authorization server-side via the
   `doc_access_level` / `has_role` database functions and write an audit
   entry. Browser clients keep read-only access to application tables.
2. **The audit log is append-only.** Never add update or delete paths. The
   hash chain must remain verifiable.
3. **File content is served only via short-lived signed URLs** issued after
   a fresh permission check. The storage bucket stays private with no client
   read policy.
4. **Administrators do not bypass content authorization.** Admins see
   document metadata; reading content requires an explicit grant.
5. **Server-only helpers** (`*.server.ts`) are imported dynamically inside
   handlers, never at module top of files that reach the browser bundle.
6. **No secrets in the repository.** Configuration lives in environment
   variables; browser-exposed (`VITE_*`) variables must never contain
   service-role keys.

## Commit and PR guidelines

- Keep pull requests focused: one concern per PR.
- Describe *what* changed and *why*, and how you tested it.
- For changes to permissions, roles, limits, or audit behavior, add or update
  a test that asserts the concrete rule.
- Update documentation when you change behavior users or operators rely on.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
