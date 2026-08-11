create table if not exists public.app_settings (
  id boolean primary key default true,
  maintenance_mode boolean not null default false,
  maintenance_message text not null default 'We''re making some quick improvements and will be back shortly. Thanks for your patience.',
  constraint single_row check (id = true)
);

insert into public.app_settings (id, maintenance_mode)
values (true, false)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

grant select on table public.app_settings to anon, authenticated;
revoke insert, update, delete on table public.app_settings from anon, authenticated;

create policy "Public can read app settings"
on public.app_settings
for select
to anon, authenticated
using (true);
