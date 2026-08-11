alter table public.subscriptions
add column if not exists paid_amount integer,
add column if not exists was_launch_offer boolean not null default false;

alter table public.transactions
add column if not exists is_launch_offer boolean not null default false;