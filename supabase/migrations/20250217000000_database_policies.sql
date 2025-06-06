-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;


-- 2) If the INSERT policy is not present, create it:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'documents'
       AND policyname = 'Users can insert their own documents'
  ) THEN
    CREATE POLICY "Users can insert their own documents"
      ON documents
      FOR INSERT
      TO authenticated
      WITH CHECK ( auth.uid() = user_id );
  END IF;
END
$$;

-- 3) If the SELECT policy is not present, create it:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'documents'
       AND policyname = 'Users can view their own documents'
  ) THEN
    CREATE POLICY "Users can view their own documents"
      ON documents
      FOR SELECT
      TO authenticated
      USING ( auth.uid() = user_id );
  END IF;
END
$$;

-- 4) If the UPDATE policy is not present, create it:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'documents'
       AND policyname = 'Users can update their own documents'
  ) THEN
    CREATE POLICY "Users can update their own documents"
      ON documents
      FOR UPDATE
      TO authenticated
      USING ( auth.uid() = user_id );
  END IF;
END
$$;

-- 5) If the DELETE policy is not present, create it:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'documents'
       AND policyname = 'Users can delete their own documents'
  ) THEN
    CREATE POLICY "Users can delete their own documents"
      ON documents
      FOR DELETE
      TO authenticated
      USING ( auth.uid() = user_id );
  END IF;
END
$$;
