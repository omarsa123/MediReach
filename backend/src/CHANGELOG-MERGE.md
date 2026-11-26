# Backend compatibility improvements

This change is intentionally additive where possible so the current Flutter API paths remain available.

## Included

- Kept the existing `/api/v1` route modules and legacy admin aliases.
- Added `/api/v1/auth/me` aliases to the existing user profile controller for the current Flutter client; `/api/v1/users/me` remains supported.
- Added shared Zod body/query validation middleware and applied it to authentication, admin list/status/verification requests, and core organization create-service/assignment/department/ambulance requests.
- Added safe pagination metadata and SQL-side filtering/search to `GET /api/v1/admin/users` (`page`, `limit`, `status`, `role`, `search`).
- Standardized global error responses, avoided returning internal 500 details, and mapped common PostgreSQL conflicts.
- Removed the insecure fallback JWT secret and separated invalid-token responses from database failures.
- Reused the authenticated user's resolved role instead of querying the user table again inside `authorizeRoles`.
- Restricted CORS to configured web origins while allowing native clients without an Origin header.
- Added organization license upload support via `licenseDocumentBase64`; the database continues to store the resulting `licenseDocumentUrl`.

## Compatibility notes / remaining work

- Pagination is currently implemented for admin user listing first. Extend the same metadata contract to organization, discovery, appointments, and notifications in separate endpoint-by-endpoint changes.
- Zod validation is applied to Auth and Admin routes first. Add schemas to Organization, Provider, Patient, Appointment, Medical, Payment and Notification routes after comparing each request body with Flutter's actual payloads; do not apply a strict schema blindly because mobile sends role-specific fields.
- This does not implement server-side refresh-token revocation/logout. The current JWT strategy has no token blacklist/session table. Do not represent client-side token deletion as server-side revocation.
- `/auth/update-email`, `/auth/logout`, and `/auth/google/register` are not silently fabricated. They still require explicit backend workflows if the clients need them.
- License upload uses the Supabase Storage public URL helper. Review bucket access and preferably switch to private objects plus short-lived signed URLs before storing real identity/licensing documents.
