-- Add product and platform limits to plan limits table
ALTER TABLE public.ai_plan_limits 
  ADD COLUMN IF NOT EXISTS product_limit integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS platform_limit integer DEFAULT 1;

-- Seed/update plan limits
INSERT INTO public.ai_plan_limits (plan_name, product_limit, platform_limit)
VALUES 
  ('free_trial', 1, 1),
  ('basic', 5, 2),
  ('pro', 30, 5)
ON CONFLICT (plan_name) DO UPDATE SET
  product_limit = EXCLUDED.product_limit,
  platform_limit = EXCLUDED.platform_limit,
  updated_at = now();