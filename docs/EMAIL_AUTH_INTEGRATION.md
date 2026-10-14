# Email sign-in integration plan for Say Say

## Current state

- The existing `src/auth.ts` is a local PIN lock stored in `localStorage`; it is not an online user account.
- Supabase Email provider is enabled in the project's dashboard (as confirmed by the project owner).
- The app uses IndexedDB for accounting records. Authentication changes must not clear, overwrite, or silently reassign those records.
- The monthly subscription SQL migration in this branch references `auth.users`, so it must not be applied to production until the app's real Supabase authentication has been implemented and tested.

## Intended sign-in flow

Use Supabase Auth email + password initially. The UI should support:
1. Create account with email and password.
2. Sign in with email and password.
3. Sign out.
4. Password reset by email.
5. Clear Persian error messages for invalid credentials, duplicate email, offline connection, and unconfirmed email.

## Required implementation work

1. Add `@supabase/supabase-js` as an application dependency and configure the Vite public variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. These public client values are not service-role secrets. Never put a service-role key in the app or repository.
2. Add a dedicated Supabase client module and an email-auth UI.
3. Replace the local-PIN-only gate with an explicit migration path: preserve the existing PIN as an optional local app lock, but use Supabase session state for online account identity.
4. Do not delete IndexedDB accounting data when signing out. Do not assume the existing local records automatically belong to the newly signed-in user. User-scoped cloud sync needs a separate design and explicit migration.
5. Configure password reset redirect URLs and email delivery in Supabase; default email delivery limits may be unsuitable for a public launch.
6. Test signup, sign-in, sign-out, reset, app restart/session restoration, offline behavior, and existing local accounting records on web and Android before merging.

## Dashboard settings

The owner confirmed that **Enable Email provider** is on. No other dashboard settings need to be changed yet. Do not enable Phone for the Iran-focused launch unless a supported SMS provider is selected.

## Safety / release status

This file is planning guidance only. It does not mean email login has been implemented, built, tested, or deployed. Keep this branch and the subscription database migration as drafts until the complete auth flow is implemented and tested.
