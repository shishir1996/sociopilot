
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS publishing_platforms text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS auto_publish_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_required boolean NOT NULL DEFAULT false;
