-- Create function to expire outdated listings
create or replace function public.expire_outdated_listings()
returns void as $$
begin
  update public.listings
  set status = 'expired'
  where expires_at < now() and status = 'active';
end;
$$ language plpgsql security definer;

-- Enable pg_cron extension (install into extensions schema, not pg_catalog)
create extension if not exists pg_cron with schema extensions;

-- Schedule the expiration function to run every 15 minutes
select cron.schedule(
  'expire-listings-every-15min',
  '*/15 * * * *',
  'select public.expire_outdated_listings()'
);