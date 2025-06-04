-- Update documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'file' CHECK (source_type IN ('file', 'youtube', 'google_drive', 'image', 'url')),
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS extracted_text TEXT,
ADD COLUMN IF NOT EXISTS page_count INTEGER,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update modules table
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS embedding VECTOR(1536),
ADD COLUMN IF NOT EXISTS chunk_index INTEGER DEFAULT 0;

-- Update flashcards table
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS source_reference JSONB,
ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Update quizzes table
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS source_reference JSONB,
ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
ADD COLUMN IF NOT EXISTS explanation TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create index on source_type for documents
CREATE INDEX IF NOT EXISTS idx_documents_source_type ON documents(source_type);

-- Create index on embedding for similarity search
CREATE INDEX IF NOT EXISTS idx_modules_embedding ON modules USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;