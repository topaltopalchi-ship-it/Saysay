# Supabase phone authentication setup for SaySay

This is a setup guide only. It does not enable phone sign-in in the app by itself.

## Important current state

- The app currently uses a local PIN stored in the browser's local storage.
- Subscription records in the proposed migration reference `auth.users`.
- Do not apply the subscription migration or merge the draft pull request until the app's phone sign-in flow is implemented and tested.
- Do not put a Supabase service-role key, SMS-provider secret, or Cafe Bazaar credential in the mobile app or GitHub.

## Configure phone OTP in the existing Supabase project

1. Open the existing Supabase project named **Say say**.
2. Open **Authentication** → **Providers** (sometimes shown as **Sign In / Providers**).
3. Select **Phone** and enable it.
4. Configure an SMS provider supported by Supabase and enter its credentials in Supabase's dashboard only. SMS delivery usually requires a provider account and may incur charges.
5. In **Authentication** → **URL Configuration**, set the app's site/redirect URLs only when the app's final callback URL is known. Do not guess a production URL.
6. For development, use Supabase's supported test phone numbers/OTP configuration if available in the project's current dashboard. Do not use a real customer's number for testing.

## Implementation requirements before activation

- Add the Supabase JavaScript client to the app and configure only the project URL and publishable/anon key as public app configuration.
- Add a Persian phone-number entry screen, request OTP, verify OTP, handle errors/rate limits, and support sign-out/session restoration.
- Keep the local PIN as an optional app-lock feature if desired; it must not be treated as proof of server identity.
- Connect subscription status to the authenticated Supabase user and enforce subscription rules in trusted server-side code.
- Verify Cafe Bazaar purchases server-side before granting or extending a paid subscription.
- Test fresh install, reinstall, sign-out/sign-in, expired trial, offline behavior, OTP rate limiting, and purchase restoration before release.

## Security and privacy

A phone number is personal data. Explain to users why it is collected and how it is used. Never log OTP codes. Never store provider secrets in client code. Apply database row-level security and test that a user cannot read or modify another user's subscription.
