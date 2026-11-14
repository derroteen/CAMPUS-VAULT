-- Official products: two new columns
alter table public.listings
  add column if not exists is_official boolean not null default false,
  add column if not exists whatsapp_url text;

-- Only real WhatsApp links (channel, group or wa.me) are accepted
alter table public.listings
  drop constraint if exists listings_whatsapp_url_check;
alter table public.listings
  add constraint listings_whatsapp_url_check
  check (
    whatsapp_url is null
    or whatsapp_url ~* '^https://((www\.)?whatsapp\.com/channel/|chat\.whatsapp\.com/|wa\.me/)[A-Za-z0-9_/?=&%.-]+$'
  );

-- Only admins can set or change those two columns
create or replace function public.guard_official_listing_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  -- No logged-in user (SQL editor, or the server using the service key): allow.
  -- Anonymous visitors cannot insert or update listings anyway (RLS blocks them).
  if auth.uid() is null then
    return new;
  end if;

  select coalesce(p.is_admin, false)
    into caller_is_admin
    from public.profiles p
   where p.id = auth.uid();

  if coalesce(caller_is_admin, false) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.is_official or new.whatsapp_url is not null then
      raise exception 'Only admins can create official listings';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.is_official is distinct from old.is_official
       or new.whatsapp_url is distinct from old.whatsapp_url then
      raise exception 'Only admins can change official listing fields';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_official_listing_fields on public.listings;
create trigger guard_official_listing_fields
  before insert or update on public.listings
  for each row execute function public.guard_official_listing_fields();