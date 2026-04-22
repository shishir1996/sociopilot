-- Fix the OpenRouter text provider model name to a valid OpenRouter model slug.
-- "Google: Gemma 4 31B (free)" is the display name, not the API slug.
UPDATE public.ai_provider_settings
SET model_name = 'google/gemma-2-9b-it:free'
WHERE provider_type = 'text'
  AND provider_name = 'openrouter'
  AND model_name = 'Google: Gemma 4 31B (free)';