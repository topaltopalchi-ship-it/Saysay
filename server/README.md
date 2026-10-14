# SAI SAI billing API foundation

This folder is a **starter scaffold**, not a production-ready subscription service.
It deliberately returns HTTP 503 for checkout and store verification until the
required integrations are implemented. It must never grant a subscription based
only on client input.

## Current endpoints

- `GET /health`: process health check.
- `GET /subscription/status`: currently fails closed with HTTP 503.
- `POST /subscription/checkout`: currently fails closed with HTTP 503.
- `POST /subscription/store/verify`: validates request shape, then fails closed with HTTP 503.

## Local development

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
```

Set `PORT` and `ALLOWED_ORIGINS` as environment variables if needed.
`ALLOWED_ORIGINS` is a comma-separated list of exact web origins. Native requests
without an Origin header are allowed by CORS, but CORS is not authentication.

## Before production

1. Choose and configure a persistent PostgreSQL database; apply `db/schema.sql`
   using a migration process. Do not use an ephemeral local file as production storage.
2. Implement real user authentication and bind each subscription to a server-verified
   account. The app's current local PIN is not server authentication.
3. Implement a secure trial policy on the server. Do not trust the device clock or
   localStorage for production entitlement decisions.
4. Integrate the current official Cafe Bazaar purchase verification API using server-side
   secrets stored only in the hosting provider's secret manager. Confirm the product ID
   and required API credentials in the Bazaar developer panel.
5. Implement Myket verification only if Myket distribution is required.
6. Add idempotent transaction processing, renewal/expiry handling, request throttling,
   observability, and automated tests.
7. Implement the Android Native billing bridge so the store SDK purchase token reaches
   this API, then test cancelled, pending, failed, restored, and successful purchases.
8. Update the frontend to send authenticated requests and handle the API's 503 state
   without falsely showing a paid subscription.
9. Configure HTTPS, backups, database access restrictions, and production secrets.

No API keys, RSA keys, store credentials, or payment secrets belong in this repository.
The server must not be considered ready for real customers until all items above are
implemented and tested.