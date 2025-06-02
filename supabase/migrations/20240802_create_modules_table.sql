-- Check if flashcards and quizzes tables exist, if not create them first
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'flashcards') THEN
        -- Create flashcards table if it doesn't exist
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

        -- Create indexes for faster queries
        CREATE INDEX IF NOT EXISTS flashcards_document_id_idx ON flashcards(document_id);
        CREATE INDEX IF NOT EXISTS flashcards_folder_id_idx ON flashcards(folder_id);
        CREATE INDEX IF NOT EXISTS flashcards_user_id_idx ON flashcards(user_id);

        -- Enable Row Level Security
        ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

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

        -- Enable realtime for flashcards table
        alter publication supabase_realtime add table flashcards;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'quizzes') THEN
        -- Create quizzes table if it doesn't exist
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

        -- Create indexes for faster queries
        CREATE INDEX IF NOT EXISTS quizzes_document_id_idx ON quizzes(document_id);
        CREATE INDEX IF NOT EXISTS quizzes_folder_id_idx ON quizzes(folder_id);
        CREATE INDEX IF NOT EXISTS quizzes_user_id_idx ON quizzes(user_id);

        -- Enable Row Level Security
        ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

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

        -- Enable realtime for quizzes table
        alter publication supabase_realtime add table quizzes;
    END IF;
END $$;

-- Create modules table
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS modules_document_id_idx ON modules(document_id);
CREATE INDEX IF NOT EXISTS modules_folder_id_idx ON modules(folder_id);
CREATE INDEX IF NOT EXISTS modules_user_id_idx ON modules(user_id);
CREATE INDEX IF NOT EXISTS modules_order_idx ON modules("order");

-- Enable Row Level Security
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- Create policies for modules
DROP POLICY IF EXISTS "Users can view their own modules" ON modules;
CREATE POLICY "Users can view their own modules"
  ON modules FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own modules" ON modules;
CREATE POLICY "Users can insert their own modules"
  ON modules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own modules" ON modules;
CREATE POLICY "Users can update their own modules"
  ON modules FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own modules" ON modules;
CREATE POLICY "Users can delete their own modules"
  ON modules FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for modules table
alter publication supabase_realtime add table modules;

-- Add module_id to flashcards table
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id) ON DELETE CASCADE;

-- Add module_id to quizzes table
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id) ON DELETE CASCADE;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS flashcards_module_id_idx ON flashcards(module_id);
CREATE INDEX IF NOT EXISTS quizzes_module_id_idx ON quizzes(module_id);