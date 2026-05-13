
-- 1. Dynamic model selection
ALTER TABLE public.ai_provider_settings
  ADD COLUMN IF NOT EXISTS available_models jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_text_models text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS selected_image_models text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS selected_video_models text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS models_synced_at timestamptz;

-- 2. Plan toggle for GMB
ALTER TABLE public.ai_plan_limits
  ADD COLUMN IF NOT EXISTS gmb_enabled boolean NOT NULL DEFAULT false;

-- 3. GMB tables
CREATE TABLE IF NOT EXISTS public.gmb_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid NOT NULL,
  social_account_id uuid,
  gmb_location_id text,
  name text,
  address text,
  phone text,
  website text,
  category text,
  rating numeric DEFAULT 0,
  review_count integer DEFAULT 0,
  photo_count integer DEFAULT 0,
  completeness_score integer DEFAULT 0,
  verified boolean DEFAULT false,
  published boolean DEFAULT false,
  ai_description text,
  keywords text[] DEFAULT '{}'::text[],
  last_synced_at timestamptz,
  last_optimized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gmb_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gmb profiles" ON public.gmb_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all gmb profiles" ON public.gmb_profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_gmb_profiles_updated BEFORE UPDATE ON public.gmb_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.gmb_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmb_profile_id uuid NOT NULL,
  user_id uuid NOT NULL,
  review_id text,
  reviewer_name text,
  rating integer,
  comment text,
  reply text,
  review_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gmb_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gmb reviews" ON public.gmb_reviews
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all gmb reviews" ON public.gmb_reviews
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.gmb_optimizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmb_profile_id uuid NOT NULL,
  user_id uuid NOT NULL,
  before_score integer,
  after_score integer,
  changes_applied jsonb DEFAULT '{}'::jsonb,
  ai_description text,
  keywords text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gmb_optimizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gmb optimizations" ON public.gmb_optimizations
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all gmb optimizations" ON public.gmb_optimizations
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
