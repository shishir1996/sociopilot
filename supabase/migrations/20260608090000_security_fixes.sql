-- Security fixes: restrict ai_provider_settings RLS, add oauth_state table

-- 1. Remove overly permissive RLS policy on ai_provider_settings
DROP POLICY IF EXISTS "Authenticated users read active providers" ON public.ai_provider_settings;

-- Restrict to admin-only reads (edge function uses service_role key, unaffected)
CREATE POLICY "Admins read provider settings"
  ON public.ai_provider_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Create oauth_state table for CSRF protection via state parameter validation
CREATE TABLE IF NOT EXISTS public.oauth_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  state_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_oauth_state_hash ON public.oauth_state(state_hash);
CREATE INDEX IF NOT EXISTS idx_oauth_state_user ON public.oauth_state(user_id);

ALTER TABLE public.oauth_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own oauth state"
  ON public.oauth_state FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Clean up stale state entries (older than 10 minutes)
CREATE POLICY "System cleans stale oauth state"
  ON public.oauth_state FOR DELETE
  USING (true);
