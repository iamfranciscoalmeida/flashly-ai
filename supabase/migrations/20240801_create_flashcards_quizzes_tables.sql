-- Create flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of options
  correct TEXT NOT NULL, -- Index or value of correct answer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create processing_jobs table to track AI processing status
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, error
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS flashcards_document_id_idx ON flashcards(document_id);
CREATE INDEX IF NOT EXISTS flashcards_folder_id_idx ON flashcards(folder_id);
CREATE INDEX IF NOT EXISTS flashcards_user_id_idx ON flashcards(user_id);

CREATE INDEX IF NOT EXISTS quizzes_document_id_idx ON quizzes(document_id);
CREATE INDEX IF NOT EXISTS quizzes_folder_id_idx ON quizzes(folder_id);
CREATE INDEX IF NOT EXISTS quizzes_user_id_idx ON quizzes(user_id);

CREATE INDEX IF NOT EXISTS processing_jobs_document_id_idx ON processing_jobs(document_id);
CREATE INDEX IF NOT EXISTS processing_jobs_user_id_idx ON processing_jobs(user_id);

-- Enable Row Level Security
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for flashcards
DROP POLICY IF EXISTS "Users can view their own flashcards" ON flashcards;
CREATE POLICY "Users can view their own flashcards"
  ON flashcards FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own flashcards" ON flashcards;
CREATE POLICY "Users can insert their own flashcards"
  ON flashcards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own flashcards" ON flashcards;
CREATE POLICY "Users can update their own flashcards"
  ON flashcards FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own flashcards" ON flashcards;
CREATE POLICY "Users can delete their own flashcards"
  ON flashcards FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for quizzes
DROP POLICY IF EXISTS "Users can view their own quizzes" ON quizzes;
CREATE POLICY "Users can view their own quizzes"
  ON quizzes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quizzes" ON quizzes;
CREATE POLICY "Users can insert their own quizzes"
  ON quizzes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quizzes" ON quizzes;
CREATE POLICY "Users can update their own quizzes"
  ON quizzes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own quizzes" ON quizzes;
CREATE POLICY "Users can delete their own quizzes"
  ON quizzes FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for processing_jobs
DROP POLICY IF EXISTS "Users can view their own processing_jobs" ON processing_jobs;
CREATE POLICY "Users can view their own processing_jobs"
  ON processing_jobs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own processing_jobs" ON processing_jobs;
CREATE POLICY "Users can insert their own processing_jobs"
  ON processing_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own processing_jobs" ON processing_jobs;
CREATE POLICY "Users can update their own processing_jobs"
  ON processing_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime for all tables
alter publication supabase_realtime add table flashcards;
alter publication supabase_realtime add table quizzes;
alter publication supabase_realtime add table processing_jobs;
