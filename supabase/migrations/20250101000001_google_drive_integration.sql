-- Google Drive Integration Tables

-- Store Google OAuth tokens per user
CREATE TABLE IF NOT EXISTS user_google_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL, -- Will be encrypted via RLS
  refresh_token TEXT NOT NULL, -- Will be encrypted via RLS
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Track Drive files linked to the platform
CREATE TABLE IF NOT EXISTS linked_drive_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL, -- Google Drive file ID
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  drive_url TEXT NOT NULL,
  parent_folder_id TEXT, -- Google Drive parent folder ID
  linked_to_session UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  size_bytes BIGINT,
  last_modified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, file_id)
);

-- Update documents table to support Google Drive files
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
ADD COLUMN IF NOT EXISTS drive_url TEXT;

-- Add constraint to ensure source_type is consistent
ALTER TABLE documents
ADD CONSTRAINT check_drive_fields CHECK (
  (source_type = 'google_drive' AND drive_file_id IS NOT NULL AND drive_url IS NOT NULL) 
  OR 
  (source_type != 'google_drive' AND drive_file_id IS NULL AND drive_url IS NULL)
  OR
  (source_type IS NULL)
);

-- Enable RLS
ALTER TABLE user_google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE linked_drive_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_google_tokens
CREATE POLICY "Users can view their own Google tokens" ON user_google_tokens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Google tokens" ON user_google_tokens
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Google tokens" ON user_google_tokens
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Google tokens" ON user_google_tokens
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for linked_drive_files
CREATE POLICY "Users can view their own linked Drive files" ON linked_drive_files
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own linked Drive files" ON linked_drive_files
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own linked Drive files" ON linked_drive_files
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own linked Drive files" ON linked_drive_files
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_user_google_tokens_user_id ON user_google_tokens(user_id);
CREATE INDEX idx_linked_drive_files_user_id ON linked_drive_files(user_id);
CREATE INDEX idx_linked_drive_files_file_id ON linked_drive_files(file_id);
CREATE INDEX idx_documents_drive_file_id ON documents(drive_file_id);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION clean_expired_google_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM user_google_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON TABLE user_google_tokens IS 'Stores Google OAuth tokens for Drive access';
COMMENT ON TABLE linked_drive_files IS 'Tracks Google Drive files linked to the platform';