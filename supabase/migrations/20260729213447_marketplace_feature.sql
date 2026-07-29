-- Create market_categories table
create table market_categories (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text unique not null,
    created_at timestamptz default now()
);

-- Create listings table
create table listings (
    id uuid primary key default gen_random_uuid(),
    seller_id uuid not null references auth.users(id) on delete cascade,
    category_id uuid references market_categories(id),
    title text not null,
    description text,
    price numeric(10,2) not null check (price >= 0),
    phone_number text not null,
    whatsapp_number text,
    status text not null default 'active' check (status in ('active','sold','expired')),
    is_boosted boolean not null default false,
    created_at timestamptz default now(),
    expires_at timestamptz not null
);

-- Create listing_images table
create table listing_images (
    id uuid primary key default gen_random_uuid(),
    listing_id uuid not null references listings(id) on delete cascade,
    image_url text not null,
    sort_order int default 0
);

-- Create subscriptions table
create table subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    tier text not null default 'free' check (tier in ('free','pro')),
    status text not null default 'active',
    started_at timestamptz default now(),
    expires_at timestamptz,
    paystack_ref text
);

-- Create indexes
create index listings_seller_id_idx on listings(seller_id);
create index listings_status_idx on listings(status);
create index listings_category_id_idx on listings(category_id);
create index listing_images_listing_id_idx on listing_images(listing_id);
create index subscriptions_user_id_idx on subscriptions(user_id);
