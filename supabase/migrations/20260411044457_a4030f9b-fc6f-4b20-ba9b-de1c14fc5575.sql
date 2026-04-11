
-- Weekly generation requests
CREATE TABLE public.weekly_generation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  plan_type text NOT NULL DEFAULT 'free_trial',
  selected_days jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  content_plan_id uuid REFERENCES public.content_plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_generation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own generation requests" ON public.weekly_generation_requests FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Regeneration logs
CREATE TABLE public.regeneration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_item_id uuid REFERENCES public.content_items(id) ON DELETE CASCADE NOT NULL,
  plan_type text NOT NULL DEFAULT 'free_trial',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.regeneration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own regeneration logs" ON public.regeneration_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own regeneration logs" ON public.regeneration_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Upgrade events
CREATE TABLE public.upgrade_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trigger_type text NOT NULL,
  action_taken text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.upgrade_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own upgrade events" ON public.upgrade_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all upgrade events" ON public.upgrade_events FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  action_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System inserts notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all notifications" ON public.notifications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trial tracking to subscriptions
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT false;
