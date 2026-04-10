
-- Create posting_schedules table
CREATE TABLE public.posting_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  posting_time TIME NOT NULL DEFAULT '10:00:00',
  platforms TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (business_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.posting_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users manage own posting schedules"
  ON public.posting_schedules
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_posting_schedules_updated_at
  BEFORE UPDATE ON public.posting_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add auto_generate flag to businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS auto_generate_enabled BOOLEAN NOT NULL DEFAULT false;
