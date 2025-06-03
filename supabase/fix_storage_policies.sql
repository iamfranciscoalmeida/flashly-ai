-- Fix storage policies for existing study-documents bucket

-- First, drop any existing policies that might be conflicting
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "test_upload_policy" ON storage.objects;

-- Create the correct policies
CREATE POLICY "Users can upload their own files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'study-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'study-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own files" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'study-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own files" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'study-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Verify the policies were created
SELECT policyname, cmd, with_check, qual
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%Users can%'; 