-- Distinguish tip payments from Pro subscription payments so the webhook
-- knows what to do on charge.success. Existing rows default to 'tip'
-- since that's the only purpose that existed before this migration.

alter table public.transactions
add column if not exists purpose text not null default 'tip' check (purpose in ('tip', 'pro_subscription'));

alter table public.transactions
add column if not exists plan_days integer;