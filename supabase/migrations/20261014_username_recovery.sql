-- Private storage for username-only accounts' recovery-code hashes.
-- Apply this migration before deploying the username-auth Edge Functions.
create table if not exists public.username_recovery (
  user_id uuid primary key references auth.users(id) on delete cascade,
  recovery_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.username_recovery enable row level security;
revoke all on public.username_recovery from anon, authenticated;
-- No client policies are intentionally defined. Only trusted Edge Functions
-- using the service-role key may read or write this table.
