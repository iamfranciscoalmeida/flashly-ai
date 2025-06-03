-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor)
-- This will increase the file size limit from 50MB to 100MB

-- Update the file size limit for the study-documents bucket
UPDATE storage.buckets 
SET file_size_limit = 104857600  -- 100MB in bytes
WHERE id = 'study-documents';

-- Verify the update was successful
SELECT 
  id, 
  name, 
  file_size_limit, 
  file_size_limit / 1024 / 1024 as limit_mb,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'study-documents';

-- Optional: If you want to support even larger files (up to 500MB), use this instead:
-- UPDATE storage.buckets 
-- SET file_size_limit = 524288000  -- 500MB in bytes
-- WHERE id = 'study-documents'; 