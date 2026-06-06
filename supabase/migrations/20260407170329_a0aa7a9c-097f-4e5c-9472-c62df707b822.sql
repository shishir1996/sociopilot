
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS brand_colors text[] DEFAULT '{}';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS slogan text DEFAULT NULL;
