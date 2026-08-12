alter table public.listings
add column if not exists original_price numeric(10,2);

alter table public.listings
add constraint original_price_must_exceed_price
check (original_price is null or original_price > price);
