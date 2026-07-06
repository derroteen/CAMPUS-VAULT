-- Add new columns for Paystack integration
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'mpesa';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paystack_reference TEXT UNIQUE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount_kes INTEGER DEFAULT 30;

-- Modify checkout_request_id to be nullable (since we won't use it for Paystack)
ALTER TABLE transactions ALTER COLUMN checkout_request_id DROP NOT NULL;
