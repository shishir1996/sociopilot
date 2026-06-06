-- Seed default AI provider settings
INSERT INTO public.ai_provider_settings (provider_type, provider_name, model_name, api_key_secret_name, temperature, max_tokens, is_active, is_fallback, priority, health_status, failure_count, available_models, selected_text_models, selected_image_models, selected_video_models)
SELECT * FROM (VALUES
  ('text', 'openrouter', 'gpt-4o', 'OPENROUTER_API_KEY', 0.7, 4096, true, false, 1, 'unknown', 0, '["gpt-4o","gpt-4o-mini","claude-3.5-sonnet","claude-3-opus","gemini-2.0-flash","deepseek-chat","llama-3.1-70b"]'::jsonb, '{gpt-4o,gpt-4o-mini,claude-3.5-sonnet}'::text[], '{}'::text[], '{}'::text[]),
  ('text', 'openai', 'gpt-4o', 'OPENAI_API_KEY', 0.7, 4096, false, true, 2, 'unknown', 0, '["gpt-4o","gpt-4o-mini","gpt-4-turbo","gpt-3.5-turbo"]'::jsonb, '{gpt-4o,gpt-4o-mini}'::text[], '{}'::text[], '{}'::text[]),
  ('text', 'gemini', 'gemini-2.0-flash', 'GEMINI_API_KEY', 0.7, 8192, false, true, 3, 'unknown', 0, '["gemini-2.0-flash","gemini-2.0-pro","gemini-1.5-pro"]'::jsonb, '{gemini-2.0-flash}'::text[], '{}'::text[], '{}'::text[]),
  ('text', 'groq', 'llama-3.3-70b-versatile', 'GROQ_API_KEY', 0.7, 8192, false, true, 4, 'unknown', 0, '["llama-3.3-70b-versatile","mixtral-8x7b-32768","gemma2-9b-it"]'::jsonb, '{}'::text[], '{}'::text[], '{}'::text[]),
  ('text', 'together', 'mistralai/Mixtral-8x22B-Instruct-v0.1', 'TOGETHER_API_KEY', 0.7, 4096, false, true, 5, 'unknown', 0, '["mistralai/Mixtral-8x22B-Instruct-v0.1","meta-llama/Llama-3.3-70B-Instruct-Turbo"]'::jsonb, '{}'::text[], '{}'::text[], '{}'::text[]),
  ('text', 'deepseek', 'deepseek-chat', 'DEEPSEEK_API_KEY', 0.7, 8192, false, true, 6, 'unknown', 0, '["deepseek-chat","deepseek-reasoner"]'::jsonb, '{}'::text[], '{}'::text[], '{}'::text[]),
  ('image', 'openrouter', 'dall-e-3', 'OPENROUTER_API_KEY', 1.0, 1024, true, false, 1, 'unknown', 0, '["dall-e-3","dall-e-2"]'::jsonb, '{}'::text[], '{dall-e-3}'::text[], '{}'::text[]),
  ('image', 'stability', 'stable-diffusion-xl', 'STABILITY_API_KEY', 1.0, 1024, false, true, 2, 'unknown', 0, '["stable-diffusion-xl","stable-diffusion-v3"]'::jsonb, '{}'::text[], '{}'::text[], '{}'::text[]),
  ('image', 'fal', 'fal-ai/flux-pro', 'FAL_API_KEY', 1.0, 1024, false, true, 3, 'unknown', 0, '["fal-ai/flux-pro","fal-ai/stable-diffusion-v3"]'::jsonb, '{}'::text[], '{}'::text[], '{}'::text[]),
  ('image', 'replicate', 'black-forest-labs/flux-dev', 'REPLICATE_API_KEY', 1.0, 1024, false, true, 4, 'unknown', 0, '["black-forest-labs/flux-dev","stability-ai/stable-diffusion"]'::jsonb, '{}'::text[], '{}'::text[], '{}'::text[])
) AS v
WHERE NOT EXISTS (SELECT 1 FROM public.ai_provider_settings);

-- Seed default prompt templates
INSERT INTO public.ai_prompt_templates (template_type, name, system_prompt, is_active)
SELECT * FROM (VALUES
  ('social_caption', 'Default Social Caption', 'You are a social media content strategist. Write engaging, platform-optimized captions that drive engagement and conversions. Keep tone consistent with the brand voice.', true),
  ('content_idea', 'Content Idea Generator', 'You are a creative content strategist. Generate unique, actionable content ideas tailored to the business niche and target audience.', true),
  ('hashtag_suggestion', 'Hashtag Generator', 'You are a hashtag optimization expert. Suggest relevant, high-performing hashtags organized by volume (broad, medium, niche).', true),
  ('image_prompt', 'Image Prompt Generator', 'You are an AI image prompt engineer. Create detailed, visually compelling prompts optimized for AI image generation models.', true),
  ('video_script', 'Video Script Writer', 'You are a video content creator. Write engaging short-form video scripts with hooks, body, and CTAs optimized for Reels/Shorts/TikTok.', true)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM public.ai_prompt_templates);
