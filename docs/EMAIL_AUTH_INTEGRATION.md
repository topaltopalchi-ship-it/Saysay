# Email authentication integration for Say Say

## Implemented in this branch

- Supabase email/password sign-in and account creation are wired into the startup gate.
- Password reset requests are available from the login screen.
- Email confirmation is supported: if signup returns no session, the app asks the user to confirm their email before signing in.
- The existing local PIN screen is no longer the startup identity gate on this branch.
- Signing out ends the Supabase session and reloads the app, returning to the email login screen.
- Subscription requests include the signed-in user's Supabase access token as a Bearer token.
- When the billing API URL is not configured, the app does not grant a client-side 30-day entitlement by default.
- Local IndexedDB accounting data is not deleted on sign-in or sign-out.

## Required configuration

1. In the Supabase project, enable the Email provider.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the local build environment and GitHub Actions secrets.
3. Configure Supabase Site URL / redirect allow-list for the deployed web URL and password-reset redirect. Do not guess a production URL.
4. Configure email delivery suitable for public use; the default provider may have low rate limits.
5. Set `VITE_BILLING_API_URL` to the trusted subscription API when that backend is deployed.

Only the public Supabase URL and anon/publishable key belong in the client. Never place the service-role key, Cafe Bazaar credentials, or store verification secrets in the app or repository.

## Backend contract still required

The backend must validate the Supabase JWT from the `Authorization: Bearer <access_token>` header on every subscription route. It must derive the user ID from the verified token and ignore any user ID supplied by the client.

Required routes:

- `GET /subscription/status`
- `POST /subscription/checkout`
- `POST /subscription/store/verify`

The store verification endpoint must verify the purchase with Cafe Bazaar from trusted server code, be idempotent, and grant entitlement only after successful verification. The native Android Cafe Bazaar billing SDK layer is not implemented by this email-auth change.

## Data migration and privacy

The app's accounting data is currently stored locally in IndexedDB. Logging in with an email does not automatically upload or assign those records to the account. Do not clear local records during logout. Cloud sync and moving records between devices require a separate, explicit user-scoped design.

## Validation required before release

- Set real Supabase project configuration and test signup, confirmed-email sign-in, invalid password, reset link, logout, session restoration, and offline errors.
- Test existing local accounting records before and after sign-in/out on web and Android.
- Deploy and test the authenticated subscription backend.
- Test Cafe Bazaar purchase, restore, duplicate verification, cancellation/refund, and expiry on Android.
- Confirm the GitHub Actions build check passes before merging.
