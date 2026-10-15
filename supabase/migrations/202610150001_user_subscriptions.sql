-- Server-authoritative 30-day trial and subscription entitlement.
-- Apply this migration in Supabase before deploying subscription-api.
create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trial_started_at timestamptz not null default now(),
  paid_until timestamptz,
  provider text check (provider in ('bazaar', 'myket', 'web')),
  store_purchase_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_subscriptions_store_purchase_id_uidx
  on public.user_subscriptions (provider, store_purchase_id)
  where store_purchase_id is not null;

alter table public.user_subscriptions enable row level security;

-- Clients cannot create or edit trial/entitlement records directly.
drop policy if exists "Users can read their own subscription" on public.user_subscriptions;
create policy "Users can read their own subscription"
  on public.user_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.user_subscriptions from anon, authenticated;
grant select on public.user_subscriptions to authenticated;
