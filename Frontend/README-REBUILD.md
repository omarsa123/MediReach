# MedReach Web + Backend Reorganization

## Design decision

The existing Flutter client is treated as a compatibility baseline. The mobile folder was not edited. Backend work is additive and keeps existing route modules and legacy admin endpoints; the rebuilt React web client now consumes the same `/api/v1` backend.

## Web rewrite

- Feature-oriented structure under `web/src/features`.
- Shared HTTP client under `web/src/core/api` with environment-based API URL, normalized API errors and one refresh-token retry.
- Protected Admin and Organization routes based on the role returned by the backend.
- Admin portal now uses current admin endpoints, supports provider/organization verification, and has searchable/filterable/paginated users.
- Organization portal replaces the placeholder route and reads its profile, services, assignments and appointments.
- Organization signup now sends the actual license file as base64; no fake `pending_upload_url` is sent.

## Backend improvements

- Shared Zod validation middleware for body and query data.
- Applied validation to Auth, Admin, and core Organization create operations.
- SQL-side pagination/filtering/search for Admin users.
- Standardized global errors and hides internal 500 details.
- JWT authentication no longer falls back to a hardcoded secret; DB errors are not mislabeled as invalid tokens.
- Role authorization uses the role already resolved from the database in `requireAuth`.
- CORS is restricted by `CORS_ORIGINS`; requests without an Origin header remain supported for native mobile clients.
- Added `/auth/me` compatibility aliases for Flutter while preserving `/users/me`.
- Added Supabase Storage upload for organization license documents.

## What was intentionally not changed

- `mobile/` is byte-for-byte from the supplied archive.
- Existing domain modules and database schema were not redesigned.
- No fake logout/revocation behavior was added. Server-side token revocation requires a token/session persistence strategy and should be designed separately.
- `/auth/logout`, `/auth/google/register`, and `/auth/update-email` remain explicit API gaps in the supplied backend source. The rebuilt web does not pretend those APIs exist; email change was removed from the OTP screen.
- Validation and pagination are foundations/first rollout, not yet applied to every list and mutation in every domain module.

## Setup

### Backend

```bash
cd src-back
npm install
# copy .env.example to .env and fill real credentials
npm run typecheck
npm run dev
```

The backend listens on port 3000 by default. Configure `CORS_ORIGINS` with the exact deployed web origin(s).

### Web

```bash
cd web
npm install
# copy .env.example to .env
npm run dev
```

Set `VITE_API_BASE_URL` to the reachable backend URL plus `/api/v1`. For local development it is `http://localhost:3000/api/v1`; if using ngrok, use the current ngrok HTTPS URL plus `/api/v1`.

### Supabase Storage

Create the bucket named by `SUPABASE_ORG_LICENSES_BUCKET` (default `organization-licenses`) before using organization signup. The current helper stores a public URL to match the existing `licenseDocumentUrl` contract. Before production, review access policy and migrate license documents to private storage with admin-only signed URLs if they contain sensitive data.

## Verification performed

- Static TypeScript/JSX syntax parsing: 74 source files, no syntax diagnostics.
- Local relative-import resolution for web: no missing local imports.
- Full Vite build and backend TypeScript typecheck were not run because dependencies are not installed in this environment; offline package installation was unavailable. Run the commands above before deployment.
