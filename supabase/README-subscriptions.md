# Subscription API deployment notes

This folder contains the initial server-authoritative trial implementation for SaySay.

## What it does
- Requires a valid Supabase Auth bearer access token.
- Creates one subscription row per authenticated user, only once.
- Starts a 30-day trial on the first successful status request.
- Does not let the app/device clock or local storage reset the trial.
- Fails closed for store verification and checkout until real provider verification is implemented.

## Before it can be used
1. Apply `supabase/migrations/202610150001_user_subscriptions.sql` to the Supabase project.
2. Deploy `supabase/functions/subscription-api/index.ts` as the Edge Function named `subscription-api`.
3. Add `VITE_BILLING_API_URL=https://<project-ref>.supabase.co/functions/v1/subscription-api` to the build environment.
4. Integrate Supabase Auth in the Android app and send its current access token as `Authorization: Bearer <token>` to this API.
5. Implement and test CafeBazaar receipt verification before enabling paid access.

Important: the existing app PIN in `src/auth.ts` is local-only, not a Supabase user account. Until Supabase Auth is integrated, this API will correctly reject requests without a real user session. Do not deploy and announce the complete feature yet.
