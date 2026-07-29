-- Enable RLS on listings
alter table public.listings enable row level security;

-- listings policies
create policy "Anyone can select active listings and owners can select their own"
on public.listings for select
using (
  status = 'active'
  or auth.uid() = seller_id
);

create policy "Authenticated users can insert their own listings"
on public.listings for insert
to authenticated
with check (
  auth.uid() = seller_id
);

create policy "Authenticated users can update their own listings"
on public.listings for update
to authenticated
using (
  auth.uid() = seller_id
)
with check (
  auth.uid() = seller_id
);

create policy "Authenticated users can delete their own listings"
on public.listings for delete
to authenticated
using (
  auth.uid() = seller_id
);

-- Enable RLS on listing_images
alter table public.listing_images enable row level security;

-- listing_images policies
create policy "Anyone can select images belonging to active listings and owners can select their own"
on public.listing_images for select
using (
  exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
    and (
      listings.status = 'active'
      or listings.seller_id = auth.uid()
    )
  )
);

create policy "Authenticated users can insert images for their own listings"
on public.listing_images for insert
to authenticated
with check (
  exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
    and listings.seller_id = auth.uid()
  )
);

create policy "Authenticated users can update images for their own listings"
on public.listing_images for update
to authenticated
using (
  exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
    and listings.seller_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
    and listings.seller_id = auth.uid()
  )
);

create policy "Authenticated users can delete images from their own listings"
on public.listing_images for delete
to authenticated
using (
  exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
    and listings.seller_id = auth.uid()
  )
);

-- Enable RLS on subscriptions
alter table public.subscriptions enable row level security;

-- subscriptions policies
create policy "Users can select their own subscriptions"
on public.subscriptions for select
to authenticated
using (
  auth.uid() = user_id
);
