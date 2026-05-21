
ALTER TABLE public.payment_settings ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 14;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS pages jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS first_billing_date timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS last_charged_at timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS razorpay_subscription_id text;
