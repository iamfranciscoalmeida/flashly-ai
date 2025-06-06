-- Smart Collections Migration
-- This creates tables for AI-powered content organization

-- Create smart_collections table
CREATE TABLE IF NOT EXISTS smart_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  topic TEXT,
  color_theme TEXT DEFAULT 'blue',
  subject_icon TEXT DEFAULT 'book',
  ai_confidence_score DECIMAL(3,2) DEFAULT 0.0,
  auto_organized BOOLEAN DEFAULT true,
  last_studied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collection_items table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS collection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES smart_collections(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('flashcard', 'quiz', 'document', 'chat_content')),
  item_id UUID NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('document_upload', 'chat_session', 'manual')),
  source_id UUID, -- document_id, chat_session_id, etc.
  relevance_score DECIMAL(3,2) DEFAULT 1.0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collection_analytics table
CREATE TABLE IF NOT EXISTS collection_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES smart_collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('study_time', 'items_reviewed', 'accuracy_rate', 'session_count')),
  metric_value DECIMAL(10,2) NOT NULL,
  recorded_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS smart_collections_user_id_idx ON smart_collections(user_id);
CREATE INDEX IF NOT EXISTS smart_collections_subject_idx ON smart_collections(subject);
CREATE INDEX IF NOT EXISTS collection_items_collection_id_idx ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS collection_items_item_type_idx ON collection_items(item_type);
CREATE INDEX IF NOT EXISTS collection_items_item_id_idx ON collection_items(item_id);
CREATE INDEX IF NOT EXISTS collection_items_source_type_idx ON collection_items(source_type);
CREATE INDEX IF NOT EXISTS collection_analytics_collection_id_idx ON collection_analytics(collection_id);
CREATE INDEX IF NOT EXISTS collection_analytics_recorded_date_idx ON collection_analytics(recorded_date);

-- Enable Row Level Security
ALTER TABLE smart_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for smart_collections
CREATE POLICY "Users can view their own collections"
  ON smart_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collections"
  ON smart_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON smart_collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON smart_collections FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for collection_items
CREATE POLICY "Users can view collection items for their collections"
  ON collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM smart_collections 
      WHERE smart_collections.id = collection_items.collection_id 
      AND smart_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert collection items for their collections"
  ON collection_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM smart_collections 
      WHERE smart_collections.id = collection_items.collection_id 
      AND smart_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update collection items for their collections"
  ON collection_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM smart_collections 
      WHERE smart_collections.id = collection_items.collection_id 
      AND smart_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete collection items for their collections"
  ON collection_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM smart_collections 
      WHERE smart_collections.id = collection_items.collection_id 
      AND smart_collections.user_id = auth.uid()
    )
  );

-- Create RLS policies for collection_analytics
CREATE POLICY "Users can view their own collection analytics"
  ON collection_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collection analytics"
  ON collection_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collection analytics"
  ON collection_analytics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collection analytics"
  ON collection_analytics FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for collections
ALTER PUBLICATION supabase_realtime ADD TABLE smart_collections;
ALTER PUBLICATION supabase_realtime ADD TABLE collection_items; 