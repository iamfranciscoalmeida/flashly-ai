-- Create study_sessions table for unified learning sessions
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  topic TEXT,
  level TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'youtube', 'text', 'document')),
  source_url TEXT, -- For YouTube videos or external links
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE, -- For uploaded files
  content_text TEXT, -- Extracted/processed content
  auto_labels JSONB, -- Auto-generated labels and metadata
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'processing')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table for session-based conversations
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB, -- For storing additional context, attachments, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session_content table for different types of generated content
CREATE TABLE IF NOT EXISTS session_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('flashcards', 'quiz', 'summary', 'mindmap', 'timeline')),
  title TEXT,
  content JSONB NOT NULL, -- Structured content based on type
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS study_sessions_user_id_idx ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS study_sessions_source_type_idx ON study_sessions(source_type);
CREATE INDEX IF NOT EXISTS study_sessions_subject_idx ON study_sessions(subject);
CREATE INDEX IF NOT EXISTS study_sessions_status_idx ON study_sessions(status);
CREATE INDEX IF NOT EXISTS study_sessions_created_at_idx ON study_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at);

CREATE INDEX IF NOT EXISTS session_content_session_id_idx ON session_content(session_id);
CREATE INDEX IF NOT EXISTS session_content_user_id_idx ON session_content(user_id);
CREATE INDEX IF NOT EXISTS session_content_type_idx ON session_content(content_type);

-- Enable Row Level Security
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_content ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for study_sessions
CREATE POLICY "Users can view their own sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for chat_messages
CREATE POLICY "Users can view their own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat messages"
  ON chat_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat messages"
  ON chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for session_content
CREATE POLICY "Users can view their own session content"
  ON session_content FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own session content"
  ON session_content FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own session content"
  ON session_content FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own session content"
  ON session_content FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE study_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE session_content; 