-- Debug: Check current bucket configuration
-- Run this in your Supabase SQL Editor to verify the settings

-- 1. Check the current file size limit
SELECT 
  id, 
  name, 
  file_size_limit,
  file_size_limit / 1024 / 1024 as limit_mb,
  allowed_mime_types,
  public,
  created_at,
  updated_at
FROM storage.buckets 
WHERE id = 'study-documents';

-- 2. If the limit is still 50MB, update it to 100MB
UPDATE storage.buckets 
SET file_size_limit = 104857600  -- 100MB in bytes
WHERE id = 'study-documents';

-- 3. Verify the update worked
SELECT 
  id, 
  name, 
  file_size_limit,
  file_size_limit / 1024 / 1024 as limit_mb,
  'Updated successfully' as status
FROM storage.buckets 
WHERE id = 'study-documents';

-- 4. Check if there are any global storage settings that might interfere
-- (This might not work if you don't have access to these tables, but worth trying)
SELECT * FROM storage.buckets WHERE id = 'study-documents';

-- 5. Also check if the bucket exists and has the right permissions
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'; 