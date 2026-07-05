create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) not null,
  phone_number text not null,
  checkout_request_id text unique not null,
  status text default 'pending',
  mpesa_receipt text,
  unlock_granted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
