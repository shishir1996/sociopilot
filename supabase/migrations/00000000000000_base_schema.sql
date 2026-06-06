-- Base schema: pre-existing objects created outside migration system

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, industry text, target_audience text,
  goals text[] DEFAULT '{}', brand_tone text, content_style text,
  products_services text, main_offers text, location text,
  competitors text, platforms text[] DEFAULT '{}',
  content_types text[] DEFAULT '{}', posting_goals text[] DEFAULT '{}',
  timezone text NOT NULL DEFAULT 'UTC', brand_colors text[] DEFAULT '{}',
  slogan text DEFAULT NULL, creative_direction text DEFAULT NULL,
  auto_generate_enabled boolean NOT NULL DEFAULT false,
  publishing_platforms text[] NOT NULL DEFAULT '{}',
  auto_publish_enabled boolean NOT NULL DEFAULT true,
  approval_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, week_start date NOT NULL,
  week_number integer NOT NULL DEFAULT 0, strategy_summary text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.content_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, day_number integer NOT NULL,
  content_theme text NOT NULL, content_goal text,
  primary_platform text, secondary_platforms text[] DEFAULT '{}',
  content_type text NOT NULL, topic text NOT NULL, hook text,
  pain_point text, core_message text, cta text, posting_time text,
  caption text, hashtags text[] DEFAULT '{}', image_prompt text,
  image_url text, visual_style text, repurposing_suggestion text,
  carousel_slides jsonb, video_script jsonb, status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz, posted_at timestamptz, post_error text,
  why_it_matters text, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
