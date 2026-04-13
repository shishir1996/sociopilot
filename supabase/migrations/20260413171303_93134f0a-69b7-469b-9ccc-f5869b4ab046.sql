
-- Usage tracking table
CREATE TABLE public.usage_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  total_posts_generated integer NOT NULL DEFAULT 0,
  monthly_posts integer NOT NULL DEFAULT 0,
  regeneration_count integer NOT NULL DEFAULT 0,
  last_active_at timestamp with time zone DEFAULT now(),
  month_year text NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_usage_tracking_user_month ON public.usage_tracking(user_id, month_year);
CREATE POLICY "Users view own usage" ON public.usage_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own usage" ON public.usage_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own usage" ON public.usage_tracking FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all usage" ON public.usage_tracking FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Payments table
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  plan_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_provider text DEFAULT 'stripe',
  provider_payment_id text,
  region text DEFAULT 'global',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all payments" ON public.payments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Admin action logs
CREATE TABLE public.admin_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL,
  target_user_id uuid,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage logs" ON public.admin_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Add trial fields to subscriptions if not present (they already exist but let's ensure)
-- Add plan change tracking
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS razorpay_payment_id text;
