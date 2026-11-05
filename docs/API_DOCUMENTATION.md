# API Documentation

TrustVault has no public REST API. All application operations are
**server functions** (`createServerFn` from TanStack Start) defined in
`src/lib/vault.functions.ts`. The browser calls them over HTTPS as RPCs;
authenticated functions require the session bearer token, which the client
middleware attaches automatically.

All inputs are validated with zod. All authenticated handlers re-check
authorization server-side and write audit entries, including for denied
attempts.

## Public functions

### `getSetupStatus()` → `{ needsSetup: boolean }`
Whether the instance still lacks an administrator (drives the `/setup`
bootstrap).

### `bootstrapAdmin({ email, password, fullName })` → `{ ok: true }`
One-time first-administrator creation. Fails with "Setup already completed"
once any admin exists, which prevents races to become the first admin.
Creates the user with `admin` + `owner` roles and audits the event.

### `loginWithPassword({ email, password })` → `{ ok, access_token?, refresh_token?, message? }`
Server-side password sign-in. Audits every attempt; refuses deactivated
accounts. On success returns session tokens for the browser client.

## Authenticated functions

### `recordLogout()` → `{ ok: true }`
Audits sign-out.

### `createDocument({ storagePath, name, description, category, mimeType })` → `{ id }`
Registers an uploaded file as a document. Requires the `owner` role.
Verifies the storage path belongs to the caller, enforces the 25 MB limit,
computes the SHA-256 checksum, and audits the upload.

### `updateDocument({ id, name, description, category })` → `{ ok: true }`
Updates metadata. Requires `owner` or `edit` access.

### `deleteDocument({ id })` → `{ ok: true }`
Deletes the document and its stored file. Requires `owner` access.

### `getDownloadUrl({ id, preview? })` → `{ url, expiresIn }`
Returns a 60-second signed URL for the file after a fresh permission check.
Audits as `document.download` or `document.preview`.

### `setPermission({ documentId, userId, level: "read" | "edit" })` → `{ ok: true }`
Grants or changes a permission. Requires `owner` access on the document;
target must be an active user. Audits as `permission.grant` or
`permission.change`.

### `revokePermission({ documentId, userId })` → `{ ok: true }`
Removes a grant. Requires `owner` access. Effective immediately (signed URLs
last at most 60 seconds). Audited.

## Admin functions

### `adminListUsers()` → `Array<Profile & { roles: Role[] }>`
Lists all users with their roles. Admin only.

### `adminCreateUser({ email, fullName, password, role })` → `{ id }`
Creates an account with a temporary password. Admin only. Audited.

### `adminSetActive({ userId, active })` → `{ ok: true }`
Activates or deactivates an account. Admin only; an admin cannot deactivate
themselves. Audited.

### `adminSetRole({ userId, role, enabled })` → `{ ok: true }`
Adds or removes a role. Admin only; an admin cannot remove their own admin
role. Audited.

### `adminVerifyChain()` → `{ total: number, broken_at: number | null }`
Verifies the audit hash chain. Admin only; the verification itself is
audited.

## Error behavior

- Authorization failures throw `Access denied` after writing a `denied`
  audit entry.
- Validation failures throw zod errors before any handler logic runs.
- Handlers never return document content, other users' data beyond what the
  caller's role permits, or any secret material.
