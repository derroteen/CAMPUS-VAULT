create table if not exists course_requests (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references universities(id) not null,
  requested_name text not null,
  requested_by uuid references auth.users(id) not null,
  status text default 'pending',
  created_at timestamptz default now()
);
