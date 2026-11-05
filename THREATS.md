# TrustVault Threat Model

This document describes what TrustVault protects against, what it assumes,
and what is explicitly out of scope. It is written for operators evaluating
the application and for contributors who must not weaken its guarantees.

## Assets

1. **Document content** — files stored in private object storage.
2. **Document metadata** — names, descriptions, categories, sizes, checksums.
3. **Access grants** — who can read or edit which document.
4. **Audit history** — the record of every security-relevant event.
5. **Accounts and credentials** — user identities and passwords.

## Actors

- **Viewer** — can read documents explicitly shared with them.
- **Owner** — can upload, edit, share, and delete their own documents.
- **Administrator** — manages users and roles, sees all document metadata,
  verifies the audit chain. Cannot read document content without a grant.
- **Outsider** — no account; public sign-up is disabled.

## Threats and mitigations

| Threat | Mitigation |
| --- | --- |
| Unauthorized account creation | Public sign-up disabled; accounts are created only by administrators; the first admin uses a one-time bootstrap that closes as soon as any admin exists. |
| Credential stuffing / weak passwords | Minimum 10-character passwords; haveibeenpwned compromised-password checking enabled; failed logins are audited. |
| IDOR / unauthorized document access | Every content request re-checks authorization server-side via `doc_access_level`; browser clients have read-only table access enforced by row-level security. |
| Stale access after revocation | File content is reachable only through 60-second signed URLs issued after a fresh permission check; revocation takes effect on the next request. |
| Privilege escalation | Roles live in a protected `user_roles` table, never in user-editable metadata; role checks run in security-definer database functions and again in server functions. |
| Admin overreach | Administrators see metadata only; reading content requires an explicit grant, and that grant is audited. |
| Audit tampering | `audit_logs` is append-only; database triggers block UPDATE/DELETE/TRUNCATE and chain each row's SHA-256 hash to the previous row. Admins can run chain verification at any time. |
| Deactivated users retaining access | Deactivation bans the account at the auth layer and every server function re-checks `is_active_user`. |
| Secret leakage to the browser | Service-role keys are read only inside server handlers; browser-exposed variables contain only the publishable key, which is protected by row-level security. |
| Cross-user storage path traversal | Upload paths must start with the caller's user ID and may not contain `..`; the check runs server-side before the document record is created. |

## Assumptions

- The hosting backend (Lovable Cloud / Supabase-compatible) correctly
  enforces row-level security and keeps the service-role key secret.
- Operators keep their environment variables and service-role key private.
- TLS is provided by the hosting platform.

## Out of scope

- Compromise of the hosting platform itself.
- Malicious administrators (they are trusted to manage users; their actions
  are fully audited and the audit chain is tamper-evident).
- Client-side malware or compromised devices.
- Denial of service against shared hosting infrastructure.

## Reporting

See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.
