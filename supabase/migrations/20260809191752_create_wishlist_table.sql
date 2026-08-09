create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, listing_id)
);

create index if not exists wishlist_items_user_id_idx on public.wishlist_items(user_id);

alter table public.wishlist_items enable row level security;

drop policy if exists "Users can view their own wishlist items" on public.wishlist_items;
create policy "Users can view their own wishlist items"
on public.wishlist_items for select
using (auth.uid() = user_id);

drop policy if exists "Users can add their own wishlist items" on public.wishlist_items;
create policy "Users can add their own wishlist items"
on public.wishlist_items for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own wishlist items" on public.wishlist_items;
create policy "Users can remove their own wishlist items"
on public.wishlist_items for delete
using (auth.uid() = user_id);