
-- 1. video_generation_jobs
CREATE TABLE public.video_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_id UUID,
  content_id UUID,
  title TEXT,
  script TEXT,
  blueprint_json JSONB DEFAULT '{}'::jsonb,
  voice_type TEXT DEFAULT 'female_warm',
  subtitle_style TEXT DEFAULT 'hormozi',
  music_type TEXT DEFAULT 'upbeat',
  video_style TEXT DEFAULT 'cinematic',
  render_engine TEXT DEFAULT 'remotion',
  generation_mode TEXT DEFAULT 'stock' CHECK (generation_mode IN ('stock','ai_image','premium_ai_video','avatar','hybrid')),
  render_status TEXT NOT NULL DEFAULT 'pending' CHECK (render_status IN ('pending','planning','assets','voice','rendering','uploading','completed','failed','cancelled')),
  render_progress INT NOT NULL DEFAULT 0,
  render_error TEXT,
  output_url TEXT,
  thumbnail_url TEXT,
  video_duration INT,
  video_ratio TEXT DEFAULT '9:16' CHECK (video_ratio IN ('9:16','16:9','1:1','4:5')),
  platform_target TEXT,
  is_premium_generation BOOLEAN NOT NULL DEFAULT false,
  render_started_at TIMESTAMPTZ,
  render_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vgj_user ON public.video_generation_jobs(user_id);
CREATE INDEX idx_vgj_status ON public.video_generation_jobs(render_status);
ALTER TABLE public.video_generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own video jobs" ON public.video_generation_jobs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all video jobs" ON public.video_generation_jobs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_vgj_updated BEFORE UPDATE ON public.video_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. admin_ai_settings (singleton, NO secrets)
CREATE TABLE public.admin_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  enable_premium_video_generation BOOLEAN NOT NULL DEFAULT false,
  enable_ai_avatar_generation BOOLEAN NOT NULL DEFAULT false,
  enable_runway_generation BOOLEAN NOT NULL DEFAULT false,
  enable_kling_generation BOOLEAN NOT NULL DEFAULT false,
  enable_pika_generation BOOLEAN NOT NULL DEFAULT false,
  enable_veo_generation BOOLEAN NOT NULL DEFAULT false,
  enable_stock_video_mode BOOLEAN NOT NULL DEFAULT true,
  enable_ai_image_generation BOOLEAN NOT NULL DEFAULT true,
  enable_auto_caption BOOLEAN NOT NULL DEFAULT true,
  enable_motion_graphics BOOLEAN NOT NULL DEFAULT true,
  enable_auto_branding BOOLEAN NOT NULL DEFAULT true,
  enable_auto_cta_outro BOOLEAN NOT NULL DEFAULT true,
  enable_premium_voice BOOLEAN NOT NULL DEFAULT false,
  enable_4k_rendering BOOLEAN NOT NULL DEFAULT false,
  default_voice_provider TEXT DEFAULT 'elevenlabs',
  default_image_provider TEXT DEFAULT 'lovable',
  default_stock_provider TEXT DEFAULT 'pexels',
  max_video_length INT NOT NULL DEFAULT 60,
  max_render_queue INT NOT NULL DEFAULT 50,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai video settings" ON public.admin_ai_settings
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated read ai video settings" ON public.admin_ai_settings
  FOR SELECT TO authenticated USING (true);
INSERT INTO public.admin_ai_settings (singleton) VALUES (true);

-- 3. subscription_feature_controls
CREATE TABLE public.subscription_feature_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_plan TEXT NOT NULL UNIQUE,
  max_video_minutes NUMERIC NOT NULL DEFAULT 1,
  max_videos_per_month INT NOT NULL DEFAULT 5,
  allow_ai_images BOOLEAN NOT NULL DEFAULT false,
  allow_premium_voice BOOLEAN NOT NULL DEFAULT false,
  allow_720p BOOLEAN NOT NULL DEFAULT true,
  allow_1080p BOOLEAN NOT NULL DEFAULT false,
  allow_4k BOOLEAN NOT NULL DEFAULT false,
  allow_premium_generation BOOLEAN NOT NULL DEFAULT false,
  allow_avatar_generation BOOLEAN NOT NULL DEFAULT false,
  allow_custom_branding BOOLEAN NOT NULL DEFAULT false,
  allow_api_access BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_feature_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage feature controls" ON public.subscription_feature_controls
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated read feature controls" ON public.subscription_feature_controls
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.subscription_feature_controls
  (subscription_plan, max_video_minutes, max_videos_per_month, allow_ai_images, allow_premium_voice, allow_720p, allow_1080p, allow_4k, allow_premium_generation, allow_avatar_generation, allow_custom_branding, allow_api_access)
VALUES
  ('free_trial', 0.5, 2, false, false, true, false, false, false, false, false, false),
  ('basic',      1.0, 10, false, false, true, false, false, false, false, false, false),
  ('pro',        2.0, 50, true,  true,  true, true,  false, false, false, true,  false),
  ('enterprise', 5.0, 500, true, true,  true, true,  true,  true,  true,  true,  true);

-- 4. business_brand_profiles
CREATE TABLE public.business_brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_id UUID NOT NULL,
  business_name TEXT,
  business_description TEXT,
  industry TEXT,
  target_audience TEXT,
  tone_of_voice TEXT,
  brand_colors TEXT[] DEFAULT '{}',
  logo_url TEXT,
  website_url TEXT,
  cta_text TEXT,
  product_services TEXT,
  custom_keywords TEXT[] DEFAULT '{}',
  preferred_platforms TEXT[] DEFAULT '{}',
  preferred_video_style TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);
ALTER TABLE public.business_brand_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own brand profile" ON public.business_brand_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_bbp_updated BEFORE UPDATE ON public.business_brand_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
