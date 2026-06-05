-- Restrict storage.objects DELETE on content-images to file owner
DROP POLICY IF EXISTS "Users can delete own content images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete content images" ON storage.objects;

CREATE POLICY "Users can delete own content images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);