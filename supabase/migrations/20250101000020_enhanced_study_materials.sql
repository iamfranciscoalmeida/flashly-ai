-- Enhanced Study Materials Schema Migration
-- This migration adds support for tiered summaries, caching, and token tracking

-- Update study_materials table with new fields
ALTER TABLE study_materials 
ADD COLUMN IF NOT EXISTS tier TEXT CHECK (tier IN ('tldr', 'detailed', 'exam-ready')),
ADD COLUMN IF NOT EXISTS format TEXT CHECK (format IN ('outline', 'cornell', 'mindmap', 'bullet')),
ADD COLUMN IF NOT EXISTS content_hash TEXT,
ADD COLUMN IF NOT EXISTS source_references JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS key_terms JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS estimated_read_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS model_used TEXT DEFAULT 'gpt-4-turbo-preview',
ADD COLUMN IF NOT EXISTS cache_key TEXT,
ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER DEFAULT 0;

-- Create index for content hash lookups (deduplication)
CREATE INDEX IF NOT EXISTS study_materials_content_hash_idx ON study_materials(content_hash);
CREATE INDEX IF NOT EXISTS study_materials_cache_key_idx ON study_materials(cache_key);
CREATE INDEX IF NOT EXISTS study_materials_tier_idx ON study_materials(tier);
CREATE INDEX IF NOT EXISTS study_materials_format_idx ON study_materials(format);

-- Create token_usage table for analytics
CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  operation TEXT NOT NULL,
  content_type TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  cost DECIMAL(10,6) NOT NULL DEFAULT 0,
  cached BOOLEAN DEFAULT FALSE,
  cache_hit BOOLEAN DEFAULT FALSE,
  processing_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for token_usage table
CREATE INDEX IF NOT EXISTS token_usage_user_id_idx ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS token_usage_session_id_idx ON token_usage(session_id);
CREATE INDEX IF NOT EXISTS token_usage_operation_idx ON token_usage(operation);
CREATE INDEX IF NOT EXISTS token_usage_created_at_idx ON token_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS token_usage_model_idx ON token_usage(model);

-- Create study_content_cache table for intelligent caching
CREATE TABLE IF NOT EXISTS study_content_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT UNIQUE NOT NULL,
  content_hash TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('summary', 'notes', 'flashcards', 'quiz')),
  tier TEXT CHECK (tier IN ('tldr', 'detailed', 'exam-ready')),
  format TEXT CHECK (format IN ('outline', 'cornell', 'mindmap', 'bullet')),
  content JSONB NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  model_used TEXT NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create indexes for cache table
CREATE INDEX IF NOT EXISTS study_content_cache_key_idx ON study_content_cache(cache_key);
CREATE INDEX IF NOT EXISTS study_content_cache_hash_idx ON study_content_cache(content_hash);
CREATE INDEX IF NOT EXISTS study_content_cache_type_idx ON study_content_cache(content_type);
CREATE INDEX IF NOT EXISTS study_content_cache_expires_at_idx ON study_content_cache(expires_at);
CREATE INDEX IF NOT EXISTS study_content_cache_last_accessed_idx ON study_content_cache(last_accessed);

-- Create content_processing_jobs table for tracking long-running operations
CREATE TABLE IF NOT EXISTS content_processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('chunking', 'summary', 'notes', 'analysis')),
  input_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  input_data JSONB NOT NULL,
  output_data JSONB,
  error_message TEXT,
  tokens_estimated INTEGER DEFAULT 0,
  tokens_actual INTEGER DEFAULT 0,
  processing_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for processing jobs
CREATE INDEX IF NOT EXISTS content_processing_jobs_user_id_idx ON content_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS content_processing_jobs_status_idx ON content_processing_jobs(status);
CREATE INDEX IF NOT EXISTS content_processing_jobs_input_hash_idx ON content_processing_jobs(input_hash);
CREATE INDEX IF NOT EXISTS content_processing_jobs_created_at_idx ON content_processing_jobs(created_at DESC);

-- Enable RLS on new tables
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_content_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_processing_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for token_usage
DO $$
BEGIN
   IF NOT EXISTS (
     SELECT 1
       FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'token_usage'
        AND policyname = 'Users can view their own token usage'
   ) THEN
     CREATE POLICY "Users can view their own token usage"
       ON token_usage
       FOR SELECT
       TO authenticated
       USING (auth.uid() = user_id);
   END IF;
END
$$;

DO $$
BEGIN
  -- 1) token_usage: INSERT policy
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname  = current_schema()
       AND tablename   = 'token_usage'
       AND policyname  = 'Users can insert their own token usage'
  ) THEN
    CREATE POLICY "Users can insert their own token usage"
      ON token_usage
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- 2) study_content_cache: SELECT policy
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname  = current_schema()
       AND tablename   = 'study_content_cache'
       AND policyname  = 'Users can view cache entries'
  ) THEN
    CREATE POLICY "Users can view cache entries"
      ON study_content_cache
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  -- 3) study_content_cache: INSERT policy
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname  = current_schema()
       AND tablename   = 'study_content_cache'
       AND policyname  = 'Users can insert cache entries'
  ) THEN
    CREATE POLICY "Users can insert cache entries"
      ON study_content_cache
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  -- 4) study_content_cache: UPDATE policy (cache hit counts)
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname  = current_schema()
       AND tablename   = 'study_content_cache'
       AND policyname  = 'Users can update cache hit counts'
  ) THEN
    CREATE POLICY "Users can update cache hit counts"
      ON study_content_cache
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  -- 5) content_processing_jobs: SELECT policy
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname  = current_schema()
       AND tablename   = 'content_processing_jobs'
       AND policyname  = 'Users can view their own processing jobs'
  ) THEN
    CREATE POLICY "Users can view their own processing jobs"
      ON content_processing_jobs
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- 6) content_processing_jobs: INSERT policy
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname  = current_schema()
       AND tablename   = 'content_processing_jobs'
       AND policyname  = 'Users can insert their own processing jobs'
  ) THEN
    CREATE POLICY "Users can insert their own processing jobs"
      ON content_processing_jobs
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- 7) content_processing_jobs: UPDATE policy
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname  = current_schema()
       AND tablename   = 'content_processing_jobs'
       AND policyname  = 'Users can update their own processing jobs'
  ) THEN
    CREATE POLICY "Users can update their own processing jobs"
      ON content_processing_jobs
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

END
$$;

-- Create function to update cache hit count
CREATE OR REPLACE FUNCTION update_cache_hit_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE study_content_cache 
    SET hit_count = hit_count + 1, last_accessed = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-expire cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM study_content_cache 
    WHERE expires_at < NOW();
    
    -- Also clean least recently used entries if cache is too large
    WITH cache_stats AS (
        SELECT COUNT(*) as total_entries
        FROM study_content_cache
    ),
    lru_entries AS (
        SELECT id 
        FROM study_content_cache 
        ORDER BY last_accessed ASC, hit_count ASC
        LIMIT GREATEST(0, (SELECT total_entries FROM cache_stats) - 1000)
    )
    DELETE FROM study_content_cache 
    WHERE id IN (SELECT id FROM lru_entries);
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate user token costs
CREATE OR REPLACE FUNCTION get_user_token_summary(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_tokens BIGINT,
    total_cost DECIMAL,
    cached_savings_tokens BIGINT,
    cached_savings_cost DECIMAL,
    operation_breakdown JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH token_stats AS (
        SELECT 
            SUM(total_tokens) as total_tokens,
            SUM(cost) as total_cost,
            SUM(CASE WHEN cached THEN total_tokens ELSE 0 END) as cached_tokens,
            SUM(CASE WHEN cached THEN cost ELSE 0 END) as cached_cost
        FROM token_usage 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    ),
    operation_stats AS (
        SELECT jsonb_object_agg(
            operation,
            jsonb_build_object(
                'tokens', COALESCE(SUM(total_tokens), 0),
                'cost', COALESCE(SUM(cost), 0),
                'count', COUNT(*)
            )
        ) as breakdown
        FROM token_usage 
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - (p_days || ' days')::INTERVAL
        GROUP BY operation
    )
    SELECT 
        COALESCE(ts.total_tokens, 0)::BIGINT,
        COALESCE(ts.total_cost, 0)::DECIMAL,
        COALESCE(ts.cached_tokens, 0)::BIGINT,
        COALESCE(ts.cached_cost, 0)::DECIMAL,
        COALESCE(os.breakdown, '{}'::jsonb)
    FROM token_stats ts
    CROSS JOIN operation_stats os;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for cache management
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_trigger
     WHERE tgname = 'update_study_materials_updated_at_trigger'
       AND tgrelid = 'study_materials'::regclass
  ) THEN
    CREATE TRIGGER update_study_materials_updated_at_trigger
      BEFORE UPDATE ON study_materials
      FOR EACH ROW
      EXECUTE FUNCTION update_study_materials_updated_at();
  END IF;
END
$$;

-- Create function to automatically clean cache periodically
-- This would typically be called by a cron job or scheduled task
CREATE OR REPLACE FUNCTION schedule_cache_cleanup()
RETURNS void AS $$
BEGIN
    -- Clean expired entries
    PERFORM clean_expired_cache();
    
    -- Log cleanup activity
    INSERT INTO content_processing_jobs (
        user_id, 
        job_type, 
        input_hash, 
        status, 
        progress, 
        input_data, 
        completed_at
    ) VALUES (
        (SELECT id FROM auth.users LIMIT 1), -- System user
        'analysis',
        'cache_cleanup',
        'completed',
        100,
        jsonb_build_object('action', 'cache_cleanup', 'timestamp', NOW()),
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON TABLE study_materials IS 'Enhanced study materials with tiered summaries and caching support';
COMMENT ON TABLE token_usage IS 'Tracks OpenAI API token usage and costs for analytics';
COMMENT ON TABLE study_content_cache IS 'Intelligent caching system for generated content';
COMMENT ON TABLE content_processing_jobs IS 'Tracks long-running content processing operations';

COMMENT ON COLUMN study_materials.tier IS 'Summary tier: tldr, detailed, or exam-ready';
COMMENT ON COLUMN study_materials.format IS 'Notes format: outline, cornell, mindmap, or bullet';
COMMENT ON COLUMN study_materials.content_hash IS 'SHA-256 hash of source content for deduplication';
COMMENT ON COLUMN study_materials.cache_key IS 'Cache key for quick lookups';

COMMENT ON COLUMN token_usage.cached IS 'Whether this result was served from cache';
COMMENT ON COLUMN token_usage.cache_hit IS 'Whether this request hit the cache';
COMMENT ON COLUMN token_usage.cost IS 'Estimated cost in USD based on OpenAI pricing';

-- Create view for cache statistics
CREATE OR REPLACE VIEW cache_statistics AS
SELECT 
    content_type,
    COUNT(*) as total_entries,
    SUM(hit_count) as total_hits,
    AVG(hit_count) as avg_hits_per_entry,
    SUM(tokens_used) as total_tokens_cached,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_entries,
    COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_entries
FROM study_content_cache
GROUP BY content_type;

-- Grant necessary permissions
GRANT SELECT ON cache_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_token_summary(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION clean_expired_cache() TO authenticated; 