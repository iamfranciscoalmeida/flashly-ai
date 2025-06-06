-- Fix RLS policies for messages table to resolve security violation errors
-- This migration addresses the "new row violates row-level security policy" error

-- Ensure the messages table has the correct structure if it doesn't exist
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure the chat_sessions table exists
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Chat Session',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies for messages table to start fresh
DROP POLICY IF EXISTS "Users can view messages in their sessions" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their sessions" ON messages;
DROP POLICY IF EXISTS "Users can update messages in their sessions" ON messages;
DROP POLICY IF EXISTS "Users can delete messages in their sessions" ON messages;

-- Create separate policies for each operation with proper permissions
-- SELECT policy - users can view messages from their sessions
CREATE POLICY "Users can view messages in their sessions" ON messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- INSERT policy - users can create messages in their sessions
CREATE POLICY "Users can create messages in their sessions" ON messages
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- UPDATE policy - users can update messages in their sessions
CREATE POLICY "Users can update messages in their sessions" ON messages
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- DELETE policy - users can delete messages in their sessions
CREATE POLICY "Users can delete messages in their sessions" ON messages
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Ensure chat_sessions has proper RLS policies too
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can create their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON chat_sessions;

CREATE POLICY "Users can view their own chat sessions" ON chat_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions" ON chat_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" ON chat_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions" ON chat_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);

-- Comment to track the fix
COMMENT ON TABLE messages IS 'Fixed RLS policies to resolve row-level security violations - 2025-06-05'; 