
-- Create geo_pricing table for location-based pricing
CREATE TABLE public.geo_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name text NOT NULL,
  region text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  currency_symbol text NOT NULL DEFAULT '$',
  monthly_price numeric NOT NULL DEFAULT 0,
  yearly_price numeric DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(plan_name, region)
);

-- Enable RLS
ALTER TABLE public.geo_pricing ENABLE ROW LEVEL SECURITY;

-- Everyone can read pricing
CREATE POLICY "Anyone can read pricing"
ON public.geo_pricing
FOR SELECT
USING (true);

-- Only admins can manage pricing
CREATE POLICY "Admins manage pricing"
ON public.geo_pricing
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_geo_pricing_updated_at
BEFORE UPDATE ON public.geo_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed pricing data
INSERT INTO public.geo_pricing (plan_name, region, currency, currency_symbol, monthly_price) VALUES
  ('basic', 'india', 'INR', '₹', 999),
  ('basic', 'global', 'USD', '$', 19),
  ('pro', 'india', 'INR', '₹', 1499),
  ('pro', 'global', 'USD', '$', 39);
