
-- AI Provider Settings (admin-only management)
CREATE TABLE public.ai_provider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type text NOT NULL CHECK (provider_type IN ('text', 'image')),
  provider_name text NOT NULL,
  model_name text NOT NULL,
  api_key_secret_name text,
  temperature numeric DEFAULT 0.7,
  max_tokens integer DEFAULT 2048,
  top_p numeric DEFAULT 1.0,
  presence_penalty numeric DEFAULT 0,
  frequency_penalty numeric DEFAULT 0,
  is_active boolean DEFAULT false,
  is_fallback boolean DEFAULT false,
  config_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_provider_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage provider settings" ON public.ai_provider_settings FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users read active providers" ON public.ai_provider_settings FOR SELECT TO authenticated USING (is_active = true);

-- AI Prompt Templates (admin-only management)
CREATE TABLE public.ai_prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text NOT NULL,
  name text NOT NULL,
  system_prompt text NOT NULL DEFAULT '',
  hidden_instructions text DEFAULT '',
  variable_placeholders jsonb DEFAULT '[]'::jsonb,
  platform_formatting jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage prompt templates" ON public.ai_prompt_templates FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users read active templates" ON public.ai_prompt_templates FOR SELECT TO authenticated USING (is_active = true);

-- AI Plan Limits
CREATE TABLE public.ai_plan_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL UNIQUE,
  text_generations_limit integer DEFAULT 5,
  image_generations_limit integer DEFAULT 2,
  regeneration_limit integer DEFAULT 3,
  brand_preset_limit integer DEFAULT 1,
  can_edit_prompts boolean DEFAULT false,
  can_select_model boolean DEFAULT false,
  premium_model_access boolean DEFAULT false,
  premium_image_styles boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_plan_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage plan limits" ON public.ai_plan_limits FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users read plan limits" ON public.ai_plan_limits FOR SELECT TO authenticated USING (true);

-- AI Usage Logs
CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  generation_type text NOT NULL CHECK (generation_type IN ('text', 'image')),
  provider text,
  model text,
  prompt_input text,
  output_result text,
  status text NOT NULL DEFAULT 'success',
  credits_used numeric DEFAULT 1,
  estimated_cost numeric DEFAULT 0,
  response_time_ms integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own usage logs" ON public.ai_usage_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all usage logs" ON public.ai_usage_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts usage logs" ON public.ai_usage_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- AI Brand Presets
CREATE TABLE public.ai_brand_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  brand_voice text DEFAULT '',
  tone text DEFAULT '',
  cta_style text DEFAULT '',
  post_structure text DEFAULT '',
  audience_profile text DEFAULT '',
  default_hashtags text[] DEFAULT '{}',
  offer_style text DEFAULT '',
  image_style text DEFAULT '',
  color_theme text DEFAULT '',
  prompt_notes text DEFAULT '',
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_brand_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own brand presets" ON public.ai_brand_presets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI Text Generations
CREATE TABLE public.ai_text_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  platform text,
  content_type text,
  input_params jsonb DEFAULT '{}'::jsonb,
  output_variations jsonb DEFAULT '[]'::jsonb,
  brand_preset_id uuid REFERENCES public.ai_brand_presets(id) ON DELETE SET NULL,
  prompt_template_id uuid REFERENCES public.ai_prompt_templates(id) ON DELETE SET NULL,
  provider text,
  model text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_text_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own text generations" ON public.ai_text_generations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI Image Generations
CREATE TABLE public.ai_image_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  platform text,
  image_style text,
  input_params jsonb DEFAULT '{}'::jsonb,
  output_urls text[] DEFAULT '{}',
  image_prompt_used text,
  provider text,
  model text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_image_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own image generations" ON public.ai_image_generations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI Feature Flags
CREATE TABLE public.ai_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  enabled boolean DEFAULT true,
  plan_restriction jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage feature flags" ON public.ai_feature_flags FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users read feature flags" ON public.ai_feature_flags FOR SELECT TO authenticated USING (true);

-- Auto-update timestamps
CREATE TRIGGER update_ai_provider_settings_updated_at BEFORE UPDATE ON public.ai_provider_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_prompt_templates_updated_at BEFORE UPDATE ON public.ai_prompt_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_plan_limits_updated_at BEFORE UPDATE ON public.ai_plan_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_brand_presets_updated_at BEFORE UPDATE ON public.ai_brand_presets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_feature_flags_updated_at BEFORE UPDATE ON public.ai_feature_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
