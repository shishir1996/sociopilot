
ALTER TABLE public.businesses ADD COLUMN brand_colors text[] DEFAULT '{}';
ALTER TABLE public.businesses ADD COLUMN slogan text DEFAULT NULL;
