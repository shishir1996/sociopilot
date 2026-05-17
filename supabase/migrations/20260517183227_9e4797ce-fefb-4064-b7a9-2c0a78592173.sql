DROP POLICY IF EXISTS "Admins view provider health logs" ON public.provider_health_logs;
DROP POLICY IF EXISTS "Admins manage provider health logs" ON public.provider_health_logs;

CREATE POLICY "Admins can read provider health logs"
ON public.provider_health_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can add provider health logs"
ON public.provider_health_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can remove provider health logs"
ON public.provider_health_logs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));