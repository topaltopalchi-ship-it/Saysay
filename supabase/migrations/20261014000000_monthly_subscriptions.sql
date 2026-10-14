-- SaySay monthly subscription foundation
-- Apply this migration in the Supabase SQL Editor only after reviewing it.
-- Do NOT let the client app insert/update subscription rows. A trusted backend
-- using the service role must verify Bazaar purchases and write entitlements.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null default 'monthly',
  status text not null default 'inactive'
    check (status in ('inactive', 'active', 'expired', 'cancelled')),
  starts_at timestamptz,
  expires_at timestamptz,
  store text not null default 'cafebazaar'
    check (store in ('cafebazaar', 'myket', 'web')),
  store_order_id text,
  purchase_token_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_one_row_per_user unique (user_id)
);

create index if not exists subscriptions_status_expiry_idx
  on public.subscriptions (status, expires_at);

alter table public.subscriptions enable row level security;

-- Users may read only their own subscription. No client-side writes are allowed.
drop policy if exists "Users can read own subscription" on public.subscriptions;
create policy "Users can read own subscription"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

comment on table public.subscriptions is
  'Subscription entitlement. Only a trusted server after verifying the store purchase may write rows.';
comment on column public.subscriptions.purchase_token_hash is
  'Store purchase token hash only; never store raw purchase tokens in this table.';
