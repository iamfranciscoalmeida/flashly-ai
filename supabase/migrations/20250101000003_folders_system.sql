-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update chat_sessions table to include folder_id
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_chat_sessions_folder_id ON chat_sessions(folder_id);

ALTER TABLE folders
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) NOT NULL
    DEFAULT '#6B7280';

-- Enable Row Level Security
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for folders
-- “Check‐then‐create” approach:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'folders'
       AND policyname = 'Users can view their own folders'
  ) THEN
    CREATE POLICY "Users can view their own folders"
      ON folders
      FOR ALL
      USING ( auth.uid() = user_id );
  END IF;
END;
$$;
-- Create default "General" folder for existing users
INSERT INTO folders (user_id, name, color)
SELECT DISTINCT user_id, 'General', '#6B7280'
FROM chat_sessions
WHERE NOT EXISTS (
  SELECT 1 FROM folders WHERE folders.user_id = chat_sessions.user_id AND folders.name = 'General'
);

-- Update existing chat sessions to use the General folder
UPDATE chat_sessions
SET folder_id = (
  SELECT id FROM folders WHERE folders.user_id = chat_sessions.user_id AND folders.name = 'General' LIMIT 1
)
WHERE folder_id IS NULL;