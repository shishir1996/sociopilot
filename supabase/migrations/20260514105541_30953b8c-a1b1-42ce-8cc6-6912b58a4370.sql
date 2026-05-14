-- Add admin-controlled global content generation modes
INSERT INTO public.ai_feature_flags (feature_key, enabled, plan_restriction)
VALUES
  ('allow_text_generation', true, '[]'::jsonb),
  ('allow_image_generation', true, '[]'::jsonb),
  ('allow_video_generation', false, '[]'::jsonb)
ON CONFLICT DO NOTHING;