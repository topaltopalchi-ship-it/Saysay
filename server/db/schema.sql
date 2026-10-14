-- Initial schema only. Apply through a managed PostgreSQL migration workflow.
-- Do not store raw purchase tokens or payment secrets in this database.

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'pending', 'none')),
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'none')),
  provider TEXT CHECK (provider IN ('web', 'bazaar', 'myket')),
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_trial BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_expires_idx
  ON subscriptions (user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS store_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('bazaar', 'myket')),
  product_id TEXT NOT NULL,
  purchase_token_hash TEXT NOT NULL UNIQUE,
  order_id TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_verification JSONB
);

CREATE INDEX IF NOT EXISTS store_transactions_user_idx
  ON store_transactions (user_id, verified_at DESC);