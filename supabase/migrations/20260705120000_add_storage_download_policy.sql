-- This migration uses a Supabase Storage policy instead of an Edge Function because
-- the storage access check can be enforced directly at the storage layer with the
-- same unlock_expires_at rule that the UI uses. The policy keeps the authorization
-- decision close to the resource being fetched and avoids exposing the signed URL
-- unless the current user is an admin or still has an active unlock window.

create or replace function public.can_access_resources() returns boolean
language sql
security definer
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

create policy "Users can read unlocked resources"
on storage.objects for select
using (
  bucket_id = 'resources'
  and public.can_access_resources()
);
