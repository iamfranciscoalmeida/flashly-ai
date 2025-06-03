-- Increase file size limit for study-documents bucket to 100MB (104857600 bytes)
-- This helps prevent "payload too large" errors for files around 50-100MB
UPDATE storage.buckets 
SET file_size_limit = 104857600 
WHERE id = 'study-documents';

-- Verify the update
SELECT id, name, file_size_limit, file_size_limit / 1024 / 1024 as limit_mb 
FROM storage.buckets 
WHERE id = 'study-documents'; 