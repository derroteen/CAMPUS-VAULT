create table if not exists public.product_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references auth.users(id) not null,
  title text not null,
  description text,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table public.product_requests enable row level security;

drop policy if exists "Users can create their own product requests" on public.product_requests;
create policy "Users can create their own product requests"
on public.product_requests for insert
to authenticated
with check (
  auth.uid() = requested_by
  and status = 'pending'
);

drop policy if exists "Users can read their own product requests and admins can read all" on public.product_requests;
create policy "Users can read their own product requests and admins can read all"
on public.product_requests for select
using (
  auth.uid() = requested_by
  or public.is_admin()
);

drop policy if exists "Admins can update product requests" on public.product_requests;
create policy "Admins can update product requests"
on public.product_requests for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete product requests" on public.product_requests;
create policy "Admins can delete product requests"
on public.product_requests for delete
to authenticated
using (public.is_admin());
