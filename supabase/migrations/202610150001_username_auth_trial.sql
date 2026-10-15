-- Username-only accounts for SaySay. Business records remain on-device.
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  recovery_code_hash text,
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from anon, authenticated;
grant select on public.user_profiles to authenticated;

create policy "users can read their own profile"
  on public.user_profiles for select
  to authenticated
  using (auth.uid() = user_id);

-- Do not add policies allowing clients to insert/update usernames, recovery hashes,
-- or trial dates. Those operations must be performed by the trusted Edge Function.
