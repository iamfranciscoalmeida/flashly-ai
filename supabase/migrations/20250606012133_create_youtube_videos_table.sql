-- Create youtube_videos table
CREATE TABLE IF NOT EXISTS youtube_videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id VARCHAR(11) NOT NULL, -- YouTube video ID (11 characters)
    title TEXT NOT NULL,
    description TEXT,
    channel_title TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    duration TEXT, -- YouTube duration format (ISO 8601)
    thumbnail_url TEXT,
    original_url TEXT NOT NULL,
    transcript TEXT,
    transcript_segments JSONB, -- Array of segments with start, end, text
    tags TEXT[], -- Array of tags
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add youtube_video_id to chat_sessions table
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS youtube_video_id UUID REFERENCES youtube_videos(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_youtube_videos_user_id ON youtube_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_video_id ON youtube_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_status ON youtube_videos(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_youtube_video_id ON chat_sessions(youtube_video_id);

-- Enable Row Level Security (RLS)
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own youtube videos" ON youtube_videos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own youtube videos" ON youtube_videos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own youtube videos" ON youtube_videos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own youtube videos" ON youtube_videos
    FOR DELETE USING (auth.uid() = user_id);

-- Add unique constraint to prevent duplicate videos per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_youtube_videos_user_video_unique 
ON youtube_videos(user_id, video_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_youtube_videos_updated_at 
    BEFORE UPDATE ON youtube_videos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON youtube_videos TO authenticated;
GRANT ALL ON youtube_videos TO service_role; 