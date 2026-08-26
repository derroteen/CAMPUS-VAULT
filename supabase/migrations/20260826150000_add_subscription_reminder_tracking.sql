-- Tracks whether we've already emailed a user about an upcoming or already-
-- happened subscription expiry, so the daily reminder cron doesn't re-send
-- the same email every day it runs. Both are reset to null whenever a
-- subscription is renewed/extended (see lib/paystack-subscriptions.ts), so
-- the next expiry cycle gets its own reminder.

alter table subscriptions
  add column if not exists expiry_reminder_sent_at timestamptz,
  add column if not exists expired_notice_sent_at timestamptz;
