# Changelog

All notable changes to TrustVault are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Open-source release preparation: license, contribution guidelines, code of
  conduct, security policy, threat model, and full documentation set under
  `docs/`.
- Sanitized `.env.example`; `.env` and internal tooling directories are now
  gitignored.

## [1.0.0] - 2026-11-05

First public release.

### Added
- Secure document management and sharing with role-based access control
  (administrator, owner, viewer).
- Document-level permissions (read / edit) with instant revocation.
- Private file storage with 60-second signed download URLs issued after a
  fresh permission check.
- Append-only, hash-chained audit log with built-in chain verification.
- Admin-provisioned accounts (no public sign-up) with a one-time first-admin
  bootstrap at `/setup`.
- Account deactivation that blocks sign-in and invalidates access while
  preserving audit history.
- Document upload with SHA-256 checksums, metadata editing, preview, and
  deletion.
- Dashboard, document library with search and filtering, activity explorer
  with filters, user administration, and workspace settings.
- Responsive UI with collapsible sidebar, dark mode, and reduced-motion
  support.
