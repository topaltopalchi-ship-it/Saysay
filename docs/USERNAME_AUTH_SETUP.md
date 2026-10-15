# Supabase username authentication setup

1. In Supabase SQL Editor, run `supabase/migrations/202610150001_profiles.sql`.
2. Deploy the Edge Function `username-auth` from `supabase/functions/username-auth/index.ts`.
3. Set Edge Function secrets in Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The service-role key must remain server-side.
4. Set build-time app variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the build environment, then rebuild and publish the Android app.
5. The app now requires a Supabase account; the previous device-only PIN is not an account and must not be treated as one.

Important: this change establishes account sign-in, but does not yet isolate the accounting database per user or implement Bazaar purchase verification. Do not charge users until the billing backend verifies Bazaar purchases and subscription entitlements server-side.
