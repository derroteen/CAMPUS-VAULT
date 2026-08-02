-- market_categories was given RLS + a public SELECT policy directly via the
-- Supabase SQL editor when originally diagnosing an empty category dropdown.
-- This migration formalizes that change in tracked history so local/remote
-- migration state stays in sync going forward.

alter table public.market_categories enable row level security;

drop policy if exists "Public can read market categories" on public.market_categories;
create policy "Public can read market categories"
on public.market_categories for select
using (true);