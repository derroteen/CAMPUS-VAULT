-- Lightweight log for rate-limiting the download route. Not meant as a
-- permanent analytics table, just enough history to check recent request
-- volume per user.

create table if not exists public.download_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists download_logs_user_id_created_at_idx
  on public.download_logs(user_id, created_at);

alter table public.download_logs enable row level security;

-- No client-facing policies — this table is only written/read via
-- supabaseAdmin (service role) inside the download API route.