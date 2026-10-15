-- SaySay secure account and subscription metadata.
-- Accounting records remain in the device's IndexedDB and are NOT copied here.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) between 3 and 32),
  constraint profiles_username_format check (username ~ '^[a-zA-Z0-9_.-]+$')
);

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'none' check (status in ('active', 'expired', 'pending', 'none')),
  plan text not null default 'none' check (plan in ('monthly', 'none')),
  provider text check (provider in ('bazaar', 'myket', 'web')),
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_dates_valid check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create index if not exists subscriptions_user_updated_idx
  on public.subscriptions (user_id, updated_at desc);

-- Store purchase tokens are not stored in plaintext. Verification must happen
-- server-side before a row is marked verified and an entitlement is granted.
create table if not exists public.store_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('bazaar', 'myket')),
  product_id text not null,
  purchase_token_sha256 text not null,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, purchase_token_sha256)
);

create index if not exists store_purchases_user_created_idx
  on public.store_purchases (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.store_purchases enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read their own subscription" on public.subscriptions;
create policy "Users can read their own subscription"
  on public.subscriptions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read their own store purchases" on public.store_purchases;
create policy "Users can read their own store purchases"
  on public.store_purchases for select to authenticated
  using (auth.uid() = user_id);

-- No client INSERT/UPDATE/DELETE policies are intentionally provided for
-- subscriptions or store_purchases. Only trusted server functions with the
-- service role may grant/extend access after validating a store receipt.
