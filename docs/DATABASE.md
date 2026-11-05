# Database

TrustVault uses Postgres (provided by Lovable Cloud, Supabase-compatible).
The canonical schema lives in `drizzle/schema.ts` with the SQL migration in
`drizzle/migrations/0000_trustvault_schema.sql`.

## Tables

### `profiles`
One row per user. `id` references `auth.users(id)` with `ON DELETE CASCADE`.
Columns: `email`, `full_name`, `is_active`, `created_at`.
Created automatically by the `handle_new_user()` trigger on signup.

### `user_roles`
Roles are stored here — never in user-editable metadata.
Columns: `user_id` (references `auth.users`, cascade), `role`
(`admin` | `owner` | `viewer`). Unique on `(user_id, role)`; a user may hold
several roles.

### `documents`
Document metadata. Columns: `owner_id`, `name`, `description`, `category`,
`mime_type`, `size_bytes`, `checksum` (SHA-256), `storage_path` (unique),
timestamps. File content lives in the private `documents` storage bucket.

### `document_permissions`
Per-document grants. Columns: `document_id`, `user_id`, `level`
(`read` | `edit`), `granted_by`, `updated_at`. Unique on
`(document_id, user_id)`.

### `audit_logs`
Append-only security event log. Columns: `seq` (bigserial), `actor_id`,
`actor_email`, `action`, `outcome`, `document_id`, `target_user_id`,
`details` (jsonb), `prev_hash`, `hash`, `created_at`.

- The `audit_chain()` trigger computes each row's SHA-256 hash over its
  content plus the previous row's hash.
- The `audit_immutable()` trigger blocks UPDATE, DELETE, and TRUNCATE.
- `verify_audit_chain()` recomputes the chain and returns the first broken
  sequence number, if any.

## Database functions (security definer)

| Function | Purpose |
| --- | --- |
| `has_role(user_id, role)` | Role check used by RLS and server functions. |
| `is_active_user(user_id)` | Whether the account is active. |
| `doc_access_level(doc_id, user_id)` | Effective access: `owner`, `edit`, `read`, or null. |
| `verify_audit_chain()` | Admin-only audit chain verification. |

## Row-level security

RLS is enabled on every application table. Browser clients (publishable key)
have **SELECT-only** access, scoped by role and grants; all inserts, updates,
and deletes happen through server functions using the privileged client
after server-side authorization checks. There are no client write policies.

## Storage

- Bucket: `documents` — **private**, 25 MB file size limit.
- No client read policy. Content is served exclusively through 60-second
  signed URLs created by the `getDownloadUrl` server function after a fresh
  permission check.
- Upload paths must be prefixed with the uploader's user ID and may not
  contain `..` (enforced server-side).

## Applying the schema to your own backend

1. Create a project on your Supabase-compatible backend.
2. Run `drizzle/migrations/0000_trustvault_schema.sql` against it (SQL editor
   or `psql`).
3. Create the private storage bucket `documents` with a 25 MB limit.
4. In auth settings: disable public sign-up, disable anonymous sign-ins, and
   enable compromised-password checking.
5. Copy the project URL and keys into your `.env` (see `.env.example`).
