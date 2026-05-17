ALTER TABLE public.ai_provider_settings
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS health_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_failure_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_count integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_provider_settings_health_status_check'
      AND conrelid = 'public.ai_provider_settings'::regclass
  ) THEN
    ALTER TABLE public.ai_provider_settings
      ADD CONSTRAINT ai_provider_settings_health_status_check
      CHECK (health_status IN ('unknown', 'healthy', 'degraded', 'down'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_provider_settings_routing
  ON public.ai_provider_settings (provider_type, is_active, health_status, priority);

CREATE TABLE IF NOT EXISTS public.provider_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.ai_provider_settings(id) ON DELETE SET NULL,
  provider_name text NOT NULL,
  provider_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failure')),
  response_time_ms integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_health_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view provider health logs" ON public.provider_health_logs;
CREATE POLICY "Admins view provider health logs"
ON public.provider_health_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage provider health logs" ON public.provider_health_logs;
CREATE POLICY "Admins manage provider health logs"
ON public.provider_health_logs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

UPDATE public.ai_provider_settings
SET priority = CASE
  WHEN is_fallback = false THEN 10
  WHEN is_fallback = true THEN 50
  ELSE priority
END
WHERE priority = 100;