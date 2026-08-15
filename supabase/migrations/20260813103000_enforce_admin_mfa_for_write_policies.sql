create or replace function public.is_admin_with_mfa()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin()
    and coalesce((auth.jwt() ->> 'aal') = 'aal2', false);
$$;

create or replace function public.can_access_resources()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.is_admin = true
        or (p.unlock_expires_at is not null and p.unlock_expires_at > now())
      )
  );
$$;

-- courses: admin write operations require admin + aal2

drop policy if exists "Admins can insert courses" on public.courses;
create policy "Admins can insert courses"
on public.courses for insert
to authenticated
with check (public.is_admin_with_mfa());

drop policy if exists "Admins can update courses" on public.courses;
create policy "Admins can update courses"
on public.courses for update
to authenticated
using (public.is_admin_with_mfa())
with check (public.is_admin_with_mfa());

drop policy if exists "Admins can delete courses" on public.courses;
create policy "Admins can delete courses"
on public.courses for delete
to authenticated
using (public.is_admin_with_mfa());

-- resources: admin moderation writes require admin + aal2

drop policy if exists "Admins can update resources" on public.resources;
create policy "Admins can update resources"
on public.resources for update
to authenticated
using (public.is_admin_with_mfa())
with check (public.is_admin_with_mfa());

drop policy if exists "Admins can delete resources" on public.resources;
create policy "Admins can delete resources"
on public.resources for delete
to authenticated
using (public.is_admin_with_mfa());

-- course_requests: admin decisioning writes require admin + aal2

drop policy if exists "Admins can update course requests" on public.course_requests;
create policy "Admins can update course requests"
on public.course_requests for update
to authenticated
using (public.is_admin_with_mfa())
with check (public.is_admin_with_mfa());

drop policy if exists "Admins can delete course requests" on public.course_requests;
create policy "Admins can delete course requests"
on public.course_requests for delete
to authenticated
using (public.is_admin_with_mfa());

-- profiles: admin profile writes require admin + aal2

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
on public.profiles for update
to authenticated
using (public.is_admin_with_mfa())
with check (public.is_admin_with_mfa());

-- product_requests: admin moderation writes require admin + aal2

drop policy if exists "Admins can update product requests" on public.product_requests;
create policy "Admins can update product requests"
on public.product_requests for update
to authenticated
using (public.is_admin_with_mfa())
with check (public.is_admin_with_mfa());

drop policy if exists "Admins can delete product requests" on public.product_requests;
create policy "Admins can delete product requests"
on public.product_requests for delete
to authenticated
using (public.is_admin_with_mfa());

-- schools exists in some environments only; enforce aal2 for admin writes when present

do $$
begin
  if to_regclass('public.schools') is not null then
    execute 'drop policy if exists "Admins can insert schools" on public.schools';
    execute '
      create policy "Admins can insert schools"
      on public.schools for insert
      to authenticated
      with check (public.is_admin_with_mfa())
    ';

    execute 'drop policy if exists "Admins can update schools" on public.schools';
    execute '
      create policy "Admins can update schools"
      on public.schools for update
      to authenticated
      using (public.is_admin_with_mfa())
      with check (public.is_admin_with_mfa())
    ';

    execute 'drop policy if exists "Admins can delete schools" on public.schools';
    execute '
      create policy "Admins can delete schools"
      on public.schools for delete
      to authenticated
      using (public.is_admin_with_mfa())
    ';
  end if;
end $$;

-- resource_courses exists in some environments only; enforce aal2 for admin writes

do $$
begin
  if to_regclass('public.resource_courses') is not null then
    execute 'drop policy if exists "Admins can manage all resource course links" on public.resource_courses';
    execute '
      create policy "Admins can manage all resource course links"
      on public.resource_courses for all
      to authenticated
      using (public.is_admin_with_mfa())
      with check (public.is_admin_with_mfa())
    ';

    execute 'drop policy if exists "Admins can delete resource course links" on public.resource_courses';
    execute '
      create policy "Admins can delete resource course links"
      on public.resource_courses for delete
      to authenticated
      using (public.is_admin_with_mfa())
    ';
  end if;
end $$;
