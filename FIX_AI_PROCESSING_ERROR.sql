-- Fix for AI Processing Error: "Failed to create processing job"
-- Run this in your Supabase SQL Editor

-- 1. First, let's check if the processing_jobs table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'processing_jobs'
) as processing_jobs_exists;

-- 2. Create the processing_jobs table if it doesn't exist
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS processing_jobs_user_id_idx ON processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS processing_jobs_document_id_idx ON processing_jobs(document_id);
CREATE INDEX IF NOT EXISTS processing_jobs_status_idx ON processing_jobs(status);

-- 4. Enable RLS
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own processing jobs" ON processing_jobs;
DROP POLICY IF EXISTS "Users can insert their own processing jobs" ON processing_jobs;
DROP POLICY IF EXISTS "Users can update their own processing jobs" ON processing_jobs;
DROP POLICY IF EXISTS "Users can delete their own processing jobs" ON processing_jobs;

-- 6. Create RLS policies
CREATE POLICY "Users can view their own processing jobs"
ON processing_jobs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processing jobs"
ON processing_jobs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processing jobs"
ON processing_jobs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own processing jobs"
ON processing_jobs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 7. Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_processing_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.status = 'completed' OR NEW.status = 'error' THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger
DROP TRIGGER IF EXISTS update_processing_jobs_updated_at_trigger ON processing_jobs;
CREATE TRIGGER update_processing_jobs_updated_at_trigger
    BEFORE UPDATE ON processing_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_processing_jobs_updated_at();

-- 9. Verify everything was created successfully
SELECT 
  'processing_jobs' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'processing_jobs'
  ) as table_exists;

-- 10. Check the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'processing_jobs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 11. Verify RLS policies exist
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles
FROM pg_policies 
WHERE tablename = 'processing_jobs';

-- All done! The processing_jobs table should now be ready. 