-- Create chat_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat Session',
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message_at ON public.chat_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chat_sessions
CREATE POLICY "Users can view their own chat sessions" ON public.chat_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions" ON public.chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" ON public.chat_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions" ON public.chat_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for chat_messages
CREATE POLICY "Users can view messages from their sessions" ON public.chat_messages
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.chat_sessions 
        WHERE chat_sessions.id = chat_messages.session_id 
        AND chat_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can create messages in their sessions" ON public.chat_messages
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.chat_sessions 
        WHERE chat_sessions.id = chat_messages.session_id 
        AND chat_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can update messages in their sessions" ON public.chat_messages
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM public.chat_sessions 
        WHERE chat_sessions.id = chat_messages.session_id 
        AND chat_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete messages from their sessions" ON public.chat_messages
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM public.chat_sessions 
        WHERE chat_sessions.id = chat_messages.session_id 
        AND chat_sessions.user_id = auth.uid()
    ));

-- Create function to automatically update last_message_at
CREATE OR REPLACE FUNCTION update_chat_session_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chat_sessions
    SET last_message_at = NEW.created_at
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_message_at when new message is inserted
CREATE TRIGGER trigger_update_chat_session_last_message_at
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_session_last_message_at();