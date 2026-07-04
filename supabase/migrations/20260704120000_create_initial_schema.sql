create table if not exists universities (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references universities(id) not null,
  code text not null,
  name text not null,
  unique(university_id, code)
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  university_id uuid references universities(id),
  approved_uploads_count int default 0,
  unlock_expires_at timestamptz,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_path text not null,
  resource_type text not null,
  status text default 'pending',
  uploader_id uuid references profiles(id) not null,
  course_id uuid references courses(id) not null,
  download_count int default 0,
  created_at timestamptz default now()
);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

insert into universities (name)
values ('University of Nairobi'), ('Kenyatta University'), ('Strathmore University')
on conflict (name) do nothing;
