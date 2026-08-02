-- Allow public (anonymous + authenticated) visitors to see which sellers
-- currently have an active Pro subscription, so marketplace browsing can
-- compute boosted listing order client-side. This adds an additional
-- allowed case alongside the existing "own subscriptions" policy — RLS
-- policies are OR'd together, so this does not expose any other rows.

drop policy if exists "Public can check active pro sellers" on public.subscriptions;
create policy "Public can check active pro sellers"
on public.subscriptions for select
using (tier = 'pro' and status = 'active' and expires_at > now());