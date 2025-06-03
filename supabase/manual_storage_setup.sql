-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('study-documents', 'study-documents', false, 52428800, array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- The storage policies should already be set up from the migration file
-- But if they're not working, you can check the current policies with:
-- SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';

-- If needed, you can also try creating a test policy to debug:
-- This will allow any authenticated user to upload to their own folder
CREATE POLICY IF NOT EXISTS "test_upload_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'study-documents' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
); 