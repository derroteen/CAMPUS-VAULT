create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;

alter table public.universities enable row level security;
drop policy if exists "Public can read universities" on public.universities;
create policy "Public can read universities"
on public.universities for select
using (true);

alter table public.courses enable row level security;
drop policy if exists "Public can read courses" on public.courses;
create policy "Public can read courses"
on public.courses for select
using (true);

drop policy if exists "Admins can insert courses" on public.courses;
create policy "Admins can insert courses"
on public.courses for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update courses" on public.courses;
create policy "Admins can update courses"
on public.courses for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete courses" on public.courses;
create policy "Admins can delete courses"
on public.courses for delete
to authenticated
using (public.is_admin());

alter table public.resources enable row level security;
drop policy if exists "Public can read approved resources and owners can read their own" on public.resources;
create policy "Public can read approved resources and owners can read their own"
on public.resources for select
using (
  status = 'approved'
  or auth.uid() = uploader_id
  or public.is_admin()
);

drop policy if exists "Authenticated users can insert their own pending resources" on public.resources;
create policy "Authenticated users can insert their own pending resources"
on public.resources for insert
to authenticated
with check (
  auth.uid() = uploader_id
  and status = 'pending'
);

drop policy if exists "Admins can update resources" on public.resources;
create policy "Admins can update resources"
on public.resources for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete resources" on public.resources;
create policy "Admins can delete resources"
on public.resources for delete
to authenticated
using (public.is_admin());

alter table public.course_requests enable row level security;
drop policy if exists "Users can create their own course requests" on public.course_requests;
create policy "Users can create their own course requests"
on public.course_requests for insert
to authenticated
with check (
  auth.uid() = requested_by
  and status = 'pending'
);

drop policy if exists "Users can read their own course requests and admins can read all" on public.course_requests;
create policy "Users can read their own course requests and admins can read all"
on public.course_requests for select
using (
  auth.uid() = requested_by
  or public.is_admin()
);

drop policy if exists "Admins can update course requests" on public.course_requests;
create policy "Admins can update course requests"
on public.course_requests for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete course requests" on public.course_requests;
create policy "Admins can delete course requests"
on public.course_requests for delete
to authenticated
using (public.is_admin());

alter table public.transactions enable row level security;
drop policy if exists "Users can read their own transactions and admins can read all" on public.transactions;
create policy "Users can read their own transactions and admins can read all"
on public.transactions for select
using (
  auth.uid() = profile_id
  or public.is_admin()
);

do $$
begin
  if to_regclass('public.schools') is not null then
    execute 'alter table public.schools enable row level security';

    execute 'drop policy if exists "Public can read schools" on public.schools';
    execute '
      create policy "Public can read schools"
      on public.schools for select
      using (true)
    ';

    execute 'drop policy if exists "Admins can insert schools" on public.schools';
    execute '
      create policy "Admins can insert schools"
      on public.schools for insert
      to authenticated
      with check (public.is_admin())
    ';

    execute 'drop policy if exists "Admins can update schools" on public.schools';
    execute '
      create policy "Admins can update schools"
      on public.schools for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    ';

    execute 'drop policy if exists "Admins can delete schools" on public.schools';
    execute '
      create policy "Admins can delete schools"
      on public.schools for delete
      to authenticated
      using (public.is_admin())
    ';
  end if;
end $$;

do $$
begin
  if to_regclass('public.resource_courses') is not null then
    execute 'alter table public.resource_courses enable row level security';

    execute 'drop policy if exists "Users can read approved resource links and owners can read their own" on public.resource_courses';
    execute '
      create policy "Users can read approved resource links and owners can read their own"
      on public.resource_courses for select
      using (
        exists (
          select 1
          from public.resources r
          where r.id = resource_id
            and (
              r.status = ''approved''
              or r.uploader_id = auth.uid()
              or public.is_admin()
            )
        )
      )
    ';

    execute 'drop policy if exists "Users can link their own resources to courses" on public.resource_courses';
    execute '
      create policy "Users can link their own resources to courses"
      on public.resource_courses for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.resources r
          where r.id = resource_id
            and r.uploader_id = auth.uid()
        )
      )
    ';

    execute 'drop policy if exists "Admins can delete resource course links" on public.resource_courses';
    execute '
      create policy "Admins can delete resource course links"
      on public.resource_courses for delete
      to authenticated
      using (public.is_admin())
    ';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can upload their own resource files'
  ) then
    execute 'drop policy "Authenticated users can upload their own resource files" on storage.objects';
  end if;

  execute '
    create policy "Authenticated users can upload their own resource files"
    on storage.objects for insert
    to authenticated
    with check (
      bucket_id = ''resources''
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  ';
end $$;