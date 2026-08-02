-- Extend handle_new_user() to also grant every new signup a 10-day Pro trial.
-- Trial status is determined live via expires_at, not a separate cron job —
-- consistent with how resource-unlock access already works in this project.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);

  insert into public.subscriptions (user_id, tier, status, started_at, expires_at)
  values (new.id, 'pro', 'active', now(), now() + interval '10 days');

  return new;
end;
$$ language plpgsql security definer;