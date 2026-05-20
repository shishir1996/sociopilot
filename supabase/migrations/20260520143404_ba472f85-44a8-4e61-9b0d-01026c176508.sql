
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS pro_features_activated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.brand_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid,
  template_type text NOT NULL,
  label text,
  file_url text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own brand templates"
  ON public.brand_templates FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER brand_templates_updated_at
  BEFORE UPDATE ON public.brand_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
