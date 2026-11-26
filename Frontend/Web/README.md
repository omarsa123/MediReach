# MedReach Web

React + Vite web application. The web client is organized by feature and uses the same `/api/v1` backend contract as the Flutter client.

## Structure

- `src/app`: routing and route guards
- `src/core/api`: shared HTTP client, API errors and environment-based API URL
- `src/features/auth`: login, organization signup, OTP and password recovery
- `src/features/pages/admin`: admin portal and admin workflows
- `src/features/pages/organization`: organization portal
- `src/services`: feature-facing API adapters (no direct fetch calls in screens)
- `src/layouts`: reserved for shared portal layouts as the portal expands

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` to the backend origin plus `/api/v1`. The default is `http://localhost:3000/api/v1`.

## Build

```bash
npm run build
npm run lint
```

The organization signup sends the selected license file as a bounded data URL. The backend stores it in the Supabase Storage bucket configured by `SUPABASE_ORG_LICENSES_BUCKET` (default `organization-licenses`). Create that bucket and verify its access policy before production use; public license URLs are not appropriate if the uploaded document contains sensitive personal data.
