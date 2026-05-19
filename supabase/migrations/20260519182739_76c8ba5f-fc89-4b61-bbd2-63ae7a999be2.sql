
-- 1) payment_settings (singleton)
CREATE TABLE public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton BOOLEAN NOT NULL DEFAULT true,
  razorpay_key_id TEXT,
  razorpay_key_secret TEXT,
  razorpay_webhook_secret TEXT,
  cashfree_app_id TEXT,
  cashfree_secret TEXT,
  active_gateway_india TEXT NOT NULL DEFAULT 'razorpay',
  active_gateway_global TEXT NOT NULL DEFAULT 'cashfree',
  default_currency_india TEXT NOT NULL DEFAULT 'INR',
  default_currency_global TEXT NOT NULL DEFAULT 'USD',
  tax_percent NUMERIC NOT NULL DEFAULT 0,
  credit_pack_price_inr NUMERIC NOT NULL DEFAULT 2000,
  credit_pack_price_usd NUMERIC NOT NULL DEFAULT 50,
  credit_pack_posts INTEGER NOT NULL DEFAULT 28,
  credit_pack_credits INTEGER NOT NULL DEFAULT 1000,
  monthly_post_limit INTEGER NOT NULL DEFAULT 28,
  monthly_post_hard_cap INTEGER NOT NULL DEFAULT 56,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_settings_singleton_unique UNIQUE (singleton)
);
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage payment settings" ON public.payment_settings
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_payment_settings_updated BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.payment_settings (singleton) VALUES (true) ON CONFLICT DO NOTHING;

-- 2) razorpay_plans
CREATE TABLE public.razorpay_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT NOT NULL,
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly','yearly')),
  region TEXT NOT NULL DEFAULT 'india',
  razorpay_plan_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_name, billing_period, region)
);
ALTER TABLE public.razorpay_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage razorpay plans" ON public.razorpay_plans
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Authenticated read razorpay plans" ON public.razorpay_plans
  FOR SELECT TO authenticated USING (is_active = true);
CREATE TRIGGER trg_razorpay_plans_updated BEFORE UPDATE ON public.razorpay_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) credit_packs
CREATE TABLE public.credit_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  posts_added INTEGER NOT NULL DEFAULT 28,
  credits_added INTEGER NOT NULL DEFAULT 1000,
  price_inr NUMERIC NOT NULL DEFAULT 2000,
  price_usd NUMERIC NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage credit packs" ON public.credit_packs
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Authenticated read credit packs" ON public.credit_packs
  FOR SELECT TO authenticated USING (is_active = true);
CREATE TRIGGER trg_credit_packs_updated BEFORE UPDATE ON public.credit_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.credit_packs (name) VALUES ('Extra 28 posts pack');

-- 4) extra_pack_purchases
CREATE TABLE public.extra_pack_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pack_id UUID NOT NULL REFERENCES public.credit_packs(id),
  posts_added INTEGER NOT NULL,
  credits_added INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  payment_provider TEXT NOT NULL,
  provider_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.extra_pack_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own pack purchases" ON public.extra_pack_purchases
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage pack purchases" ON public.extra_pack_purchases
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_extra_pack_purchases_updated BEFORE UPDATE ON public.extra_pack_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) user_credits
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month_year TEXT NOT NULL DEFAULT to_char(now(),'YYYY-MM'),
  posts_limit INTEGER NOT NULL DEFAULT 28,
  posts_used INTEGER NOT NULL DEFAULT 0,
  credits_total INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month' - interval '1 second'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own credits" ON public.user_credits
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage user credits" ON public.user_credits
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_user_credits_updated BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
