-- Add is_active to universities first
alter table universities 
add column if not exists is_active boolean default true;

-- Add premium-related fields to profiles
alter table profiles 
add column if not exists is_premium_contributor boolean default false,
add column if not exists premium_granted_at timestamptz,
add column if not exists premium_granted_by uuid references profiles(id);

-- Enable RLS on profiles if not already enabled
alter table profiles enable row level security;

-- Create RLS policies for profiles
create policy "Users can view their own profile"
on profiles for select
using (auth.uid() = id);

create policy "Admins can view all profiles"
on profiles for select
using (
  exists (
    select 1 from profiles 
    where id = auth.uid() and is_admin = true
  )
);

create policy "Admins can update all profiles"
on profiles for update
using (
  exists (
    select 1 from profiles 
    where id = auth.uid() and is_admin = true
  )
)
with check (
  exists (
    select 1 from profiles 
    where id = auth.uid() and is_admin = true
  )
);
