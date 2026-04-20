-- Update India Pro price to ₹999
UPDATE geo_pricing 
SET monthly_price = 999, yearly_price = 10989, updated_at = now()
WHERE region = 'india' AND plan_name = 'pro';

-- Update Global Basic price to $29
UPDATE geo_pricing 
SET monthly_price = 29, yearly_price = 319, updated_at = now()
WHERE region = 'global' AND plan_name = 'basic';

-- Update Global Pro price to $79
UPDATE geo_pricing 
SET monthly_price = 79, yearly_price = 869, updated_at = now()
WHERE region = 'global' AND plan_name = 'pro';

-- Verify the updates
SELECT * FROM geo_pricing ORDER BY region, plan_name;