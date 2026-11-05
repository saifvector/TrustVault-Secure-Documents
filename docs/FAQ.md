# Frequently Asked Questions

## Can people sign up themselves?

No. Public sign-up is disabled by design. Administrators create accounts
from **Administration → Create account** and hand the temporary password to
the user. The only exception is the one-time first-administrator bootstrap
at `/setup`.

## I lost the only administrator account. How do I recover?

If another admin exists, ask them to reset your access. If no admin can sign
in, a backend operator must promote an existing user by inserting a row into
`user_roles` with role `admin` for that user's ID (via the backend SQL
editor), then sign in and audit the situation. There is intentionally no
public recovery mechanism.

## Can an administrator read my documents?

Not by default. Administrators see document *metadata* (name, size, owner)
to manage the system, but opening content requires an explicit grant — and
that grant is recorded in the audit log.

## How fast does revocation work?

Immediately for new requests. File content is served through signed URLs
that live for 60 seconds, so a revoked user loses access the next time they
try to open the document; a previously issued URL stops working within a
minute.

## Can the audit log be edited or deleted?

No. Database triggers block updates, deletes, and truncation, and every row
is hash-chained to the previous one. Administrators can verify the chain
from the UI; tampering shows up as a broken chain.

## Is document content encrypted?

At rest and in transit by the hosting platform, yes — but TrustVault is not
a zero-knowledge system: the server can read content to serve it. The
security model is access control plus tamper-evident auditing, not
end-to-end encryption.

## What is the file size limit?

25 MB per file, enforced both in storage and again server-side when the
document is registered.

## Can I self-host it?

Not today. The app is built and tested on Lovable Cloud. It needs a
Supabase-compatible backend; see [INSTALLATION.md](INSTALLATION.md) for what
you must provision, and [DEPLOYMENT.md](DEPLOYMENT.md) for the supported
deployment path.

## Where do I report a security issue?

Privately — see [SECURITY.md](../SECURITY.md). Never in a public issue.
