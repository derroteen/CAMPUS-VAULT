alter table profiles
  add column if not exists email_opt_out boolean not null default false,
  add column if not exists last_reengagement_email_at timestamptz;
