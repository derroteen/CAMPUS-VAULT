-- Storage bucket and policies for marketplace listing images.
-- The bucket is public so product photos can be served without signed URLs.

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- SELECT — anyone (including anon) can read listing images
drop policy if exists "Anyone can view listing images" on storage.objects;
create policy "Anyone can view listing images"
on storage.objects for select
using (
  bucket_id = 'listing-images'
);

-- INSERT — authenticated users can upload into their own folder
drop policy if exists "Authenticated users can upload their own listing images" on storage.objects;
create policy "Authenticated users can upload their own listing images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE — authenticated users can delete only their own listing images
drop policy if exists "Authenticated users can delete their own listing images" on storage.objects;
create policy "Authenticated users can delete their own listing images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
