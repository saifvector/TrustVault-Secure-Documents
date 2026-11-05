# Security Model

## Principles

1. **Server-side authorization, always.** The browser is never trusted.
   Every write and every content request is authorized again on the server.
2. **Least privilege by default.** Browser clients have read-only access to
   application tables; the storage bucket is private with no client read
   policy.
3. **Revocation is immediate.** Content URLs live for 60 seconds, so a
   revoked grant stops working on the next request.
4. **Everything security-relevant is audited, and the audit log cannot be
   altered.** Successful, failed, and denied actions are all recorded.

## Roles

| Capability | Viewer | Owner | Admin |
| --- | --- | --- | --- |
| Read documents shared with them | ✓ | ✓ | only with an explicit grant |
| Upload documents | | ✓ | (with owner role) |
| Edit / delete own documents | | ✓ | |
| Share documents (read/edit grants) | | ✓ (own docs) | |
| Revoke grants | | ✓ (own docs) | |
| See all document metadata | | | ✓ |
| Create / deactivate users, change roles | | | ✓ |
| View full audit log, verify chain | | | ✓ |

A user can hold multiple roles. The first administrator also receives the
owner role so they can seed content.

## Access levels on a document

`doc_access_level()` returns the caller's effective level:

- `owner` — the document's owner: full control.
- `edit` — granted edit: read + metadata updates.
- `read` — granted read: download and preview only.
- `null` — no access: metadata and content are both denied.

## Authentication

- Email + password only; public sign-up is disabled. Accounts are created by
  administrators (or once by the `/setup` bootstrap while no admin exists).
- Minimum password length 10; compromised-password (haveibeenpwned) checking
  enabled at the backend.
- Deactivation bans the account at the auth layer and every server function
  re-checks `is_active_user`, so deactivated users lose access immediately.
- Login attempts, failures, and logins to deactivated accounts are audited.

## Audit trail

Every security-relevant action writes an `audit_logs` row: logins (success,
failure, denied), uploads, updates, downloads, previews, permission grants,
changes and revocations, user administration, and chain verifications.

Each row's SHA-256 hash incorporates the previous row's hash
(`prev_hash` → `hash`). Database triggers make the table append-only.
Administrators can run **Verify audit chain** in the UI; any tampering
surfaces as the sequence number where the chain breaks.

## Secrets handling

- The service-role key is read only inside server handlers via
  `process.env`; it never reaches the browser bundle.
- Browser-exposed `VITE_*` variables contain only the publishable key, which
  is safe to expose because RLS enforces all access.
- `.env` is gitignored; `.env.example` documents every variable with
  placeholders.

## Known limitations

- No end-to-end encryption: the server (and the hosting platform) can read
  document content. TrustVault enforces *access control and auditability*,
  not zero-knowledge storage.
- No two-factor authentication yet.
- Audit integrity depends on the hosting backend enforcing the triggers;
  a compromised database operator could rewrite history (off-site log
  export is a possible future mitigation).
- TrustVault is not security-certified. See [THREATS.md](../THREATS.md) for
  the full threat model.
