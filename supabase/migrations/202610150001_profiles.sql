create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_.-]{3,32}$')
);

alter table public.profiles enable row level security;

-- Clients cannot read or write username mappings directly. The Edge Function uses service role.
revoke all on table public.profiles from anon, authenticated;
