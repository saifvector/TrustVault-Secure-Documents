<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## TrustVault architecture rules
- All document/permission/user writes go through server functions in `src/lib/vault.functions.ts`, which re-check access via the `doc_access_level` / `has_role` DB functions and write audit entries; clients only have SELECT on app tables. Why: authorization and auditing must happen server-side.
- `audit_logs` is append-only and hash-chained by DB triggers; never add UPDATE/DELETE paths. Why: tamper evidence.
- File content is only reachable through short-lived signed URLs issued after a fresh permission check; the storage bucket stays private with no client read policy. Why: revocation must take effect immediately.
- Admins see all document metadata but need an explicit grant for content. Why: product requirement that admin does not bypass content authorization.
- Server-only helpers (`*.server.ts`) are imported dynamically inside handlers, never at module top of `*.functions.ts`. Why: import protection blocks them from the client bundle.
- Dimensional visuals use a dynamically imported Three.js scene with a bundled static fallback and CSS motion primitives. Why: keep browser-only rendering outside SSR and avoid overlapping animation libraries.
- Audit explorer filters operate only on already-authorized fetched records. Why: presentation improvements must not expand access or change existing backend queries.
