# Security Policy

TrustVault is a security-sensitive application: it stores private documents and
enforces access control. We take vulnerability reports seriously.

## Reporting a vulnerability

**Do not open a public GitHub issue for a security vulnerability.**

Instead, report it privately:

1. Open a [GitHub Security Advisory](https://github.com/advisories) on this
   repository ("Report a vulnerability"), or
2. Contact the maintainers through the channel listed in the repository
   profile.

Include:

- A description of the issue and its impact.
- Steps to reproduce, including the role/account type used.
- Whether the issue requires an authenticated session, and which role.
- Any proof-of-concept material (screenshots, requests, logs).

We aim to acknowledge reports within 72 hours and to provide an initial
assessment within 7 days.

## Scope

In scope:

- Authentication and session handling.
- Role-based access control (admin / owner / viewer).
- Document-level permissions, including revocation.
- Signed-URL issuance and storage access.
- Audit-log integrity (append-only, hash-chained).
- Server-function authorization checks.
- Row-level security policies and database functions.

Out of scope:

- Vulnerabilities in third-party services the app is deployed on
  (report those to the respective provider).
- Self-hosted instances that have modified the security model.
- Denial-of-service against hosted infrastructure.

## Security model summary

- All writes go through server functions that re-check authorization
  server-side; browser clients have read-only access to application tables.
- File content is served only through short-lived (60-second) signed URLs
  issued after a fresh permission check; the storage bucket is private.
- The audit log is append-only and hash-chained by database triggers;
  tampering is detectable via the built-in chain verification.
- Administrators can see document metadata but cannot read document content
  without an explicit grant.

See [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md) for the full model and
[THREATS.md](THREATS.md) for the threat analysis.

## Disclosure

We follow coordinated disclosure. We will work with you to understand and fix
the issue before any public disclosure, and we will credit reporters (unless
they prefer anonymity) in the release notes.

TrustVault is not security-certified. It is provided under the MIT license
without warranty; see [LICENSE](LICENSE).
