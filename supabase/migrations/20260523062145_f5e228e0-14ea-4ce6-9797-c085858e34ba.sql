
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS has_used_basic_trial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_used_pro_trial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_ever_subscribed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_consumed_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_subscription_at timestamptz;

-- Backfill flags from existing data so currently-active users don't get a second trial.
UPDATE public.subscriptions
SET has_used_basic_trial = true,
    trial_consumed_at = COALESCE(trial_consumed_at, trial_started_at, created_at)
WHERE plan_name = 'basic' AND (is_trial = true OR trial_started_at IS NOT NULL);

UPDATE public.subscriptions
SET has_used_pro_trial = true,
    trial_consumed_at = COALESCE(trial_consumed_at, trial_started_at, created_at)
WHERE plan_name = 'pro' AND (is_trial = true OR trial_started_at IS NOT NULL);

UPDATE public.subscriptions
SET has_ever_subscribed = true,
    first_subscription_at = COALESCE(first_subscription_at, last_charged_at, starts_at, created_at)
WHERE status = 'active' AND is_trial = false;
