ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('content-images', 'content-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload content images" ON storage.objects;
CREATE POLICY "Authenticated users can upload content images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'content-images');

DROP POLICY IF EXISTS "Public can view content images" ON storage.objects;
CREATE POLICY "Public can view content images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'content-images');

DROP POLICY IF EXISTS "Authenticated users can delete content images" ON storage.objects;
CREATE POLICY "Authenticated users can delete content images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'content-images');