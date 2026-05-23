CREATE TABLE IF NOT EXISTS public.provider_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text NOT NULL UNIQUE,
  key_value text,
  label text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage provider api keys"
ON public.provider_api_keys
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER provider_api_keys_updated_at
BEFORE UPDATE ON public.provider_api_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.provider_api_keys (key_name, label) VALUES
  ('PEXELS_API_KEY','Pexels — stock video/photo'),
  ('PIXABAY_API_KEY','Pixabay — stock video/photo'),
  ('ELEVENLABS_API_KEY','ElevenLabs — premium TTS'),
  ('STABILITY_API_KEY','Stability AI — image gen'),
  ('FAL_API_KEY','Fal.ai — image/video gen'),
  ('RUNWAY_API_KEY','Runway — premium video'),
  ('KLING_API_KEY','Kling — premium video'),
  ('PIKA_API_KEY','Pika — premium video'),
  ('VEO_API_KEY','Veo (Google) — premium video')
ON CONFLICT (key_name) DO NOTHING;