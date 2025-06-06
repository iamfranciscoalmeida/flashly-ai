-- Add voice support to existing chat system
-- Add mode column to chat_sessions to differentiate between voice and text sessions
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'text' CHECK (mode IN ('text', 'voice'));

-- Add audio_url column to chat_messages to store voice recordings
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Create storage bucket for voice sessions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-sessions', 
  'voice-sessions', 
  false, 
  10485760, -- 10MB per audio file
  array[
    'audio/mpeg', 
    'audio/wav', 
    'audio/webm',
    'audio/mp4',
    'audio/ogg'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for voice-sessions bucket
DROP POLICY IF EXISTS "Users can upload their own voice files" ON storage.objects;
CREATE POLICY "Users can upload their own voice files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'voice-sessions' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view their own voice files" ON storage.objects;
CREATE POLICY "Users can view their own voice files" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'voice-sessions' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own voice files" ON storage.objects;
CREATE POLICY "Users can update their own voice files" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'voice-sessions' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own voice files" ON storage.objects;
CREATE POLICY "Users can delete their own voice files" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'voice-sessions' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create indexes for voice-related columns
CREATE INDEX IF NOT EXISTS idx_chat_sessions_mode ON chat_sessions(mode);
CREATE INDEX IF NOT EXISTS idx_chat_messages_audio_url ON chat_messages(audio_url) WHERE audio_url IS NOT NULL;

-- Update the database schema successfully message
DO $$
BEGIN
    RAISE NOTICE 'Voice support added successfully!';
    RAISE NOTICE 'Added mode column to chat_sessions (text/voice)';
    RAISE NOTICE 'Added audio_url column to chat_messages';
    RAISE NOTICE 'Created voice-sessions storage bucket with RLS policies';
END $$; 