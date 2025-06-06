-- Enhanced Study System Migration
-- Adds comprehensive content hashing, improved caching, and analytics

-- Drop existing content hash index if it exists and recreate with better structure
DROP INDEX IF EXISTS study_materials_content_hash_idx;

-- Add enhanced fields to study_materials table
ALTER TABLE study_materials 
ADD COLUMN IF NOT EXISTS input_hash TEXT,
ADD COLUMN IF NOT EXISTS processing_strategy TEXT CHECK (processing_strategy IN ('single', 'user-selection', 'auto-chunk', 'hybrid')),
ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS generation_params JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMPTZ DEFAULT NOW();

-- Create improved indexes
CREATE INDEX IF NOT EXISTS study_materials_input_hash_idx ON study_materials(input_hash);
CREATE INDEX IF NOT EXISTS study_materials_content_hash_idx ON study_materials(content_hash);
CREATE INDEX IF NOT EXISTS study_materials_processing_strategy_idx ON study_materials(processing_strategy);
CREATE INDEX IF NOT EXISTS study_materials_user_rating_idx ON study_materials(user_rating);
CREATE INDEX IF NOT EXISTS study_materials_last_accessed_idx ON study_materials(last_accessed);

-- Create enhanced token usage tracking with better analytics
CREATE TABLE IF NOT EXISTS enhanced_token_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL,
  content_type TEXT NOT NULL,
  tier TEXT,
  format TEXT,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  estimated_cost DECIMAL(10,6) NOT NULL DEFAULT 0,
  actual_cost DECIMAL(10,6),
  cached BOOLEAN DEFAULT FALSE,
  cache_hit BOOLEAN DEFAULT FALSE,
  cache_key TEXT,
  processing_time_ms INTEGER DEFAULT 0,
  quality_score DECIMAL(3,2),
  user_feedback INTEGER CHECK (user_feedback >= 1 AND user_feedback <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for enhanced token usage
CREATE INDEX IF NOT EXISTS enhanced_token_usage_user_id_idx ON enhanced_token_usage(user_id);
CREATE INDEX IF NOT EXISTS enhanced_token_usage_session_id_idx ON enhanced_token_usage(session_id);
CREATE INDEX IF NOT EXISTS enhanced_token_usage_operation_type_idx ON enhanced_token_usage(operation_type);
CREATE INDEX IF NOT EXISTS enhanced_token_usage_content_type_idx ON enhanced_token_usage(content_type);
CREATE INDEX IF NOT EXISTS enhanced_token_usage_cached_idx ON enhanced_token_usage(cached);
CREATE INDEX IF NOT EXISTS enhanced_token_usage_created_at_idx ON enhanced_token_usage(created_at);
CREATE INDEX IF NOT EXISTS enhanced_token_usage_cost_idx ON enhanced_token_usage(estimated_cost);

-- Create content deduplication table
CREATE TABLE IF NOT EXISTS content_deduplication (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  input_hash TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  generation_params_hash TEXT NOT NULL,
  first_generated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  study_material_id UUID REFERENCES study_materials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quality_metrics JSONB DEFAULT '{}'
);

-- 2) Then create the composite index separately:
CREATE INDEX IF NOT EXISTS idx_content_deduplication_input_hash_content_type
  ON content_deduplication(input_hash, content_type);

-- Create user preferences and analytics table
CREATE TABLE IF NOT EXISTS user_study_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analytics_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_generations INTEGER DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,
  total_cost DECIMAL(10,6) DEFAULT 0,
  cache_hit_rate DECIMAL(5,4) DEFAULT 0,
  avg_processing_time_ms INTEGER DEFAULT 0,
  preferred_summary_tier TEXT,
  preferred_notes_format TEXT,
  content_types_usage JSONB DEFAULT '{}',
  quality_ratings JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, analytics_date)
);

-- Create study session tracking
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('summary', 'notes', 'flashcards', 'quiz', 'mixed')),
  materials_used UUID[] DEFAULT '{}',
  duration_minutes INTEGER,
  completion_rate DECIMAL(5,4) DEFAULT 0,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for study sessions
CREATE INDEX IF NOT EXISTS study_sessions_user_id_idx ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS study_sessions_document_id_idx ON study_sessions(document_id);
CREATE INDEX IF NOT EXISTS study_sessions_session_type_idx ON study_sessions(session_type);
CREATE INDEX IF NOT EXISTS study_sessions_started_at_idx ON study_sessions(started_at);

-- Create RLS policies for new tables
ALTER TABLE enhanced_token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_deduplication ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_study_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Enhanced token usage policies
CREATE POLICY "Users can view their own enhanced token usage" ON enhanced_token_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own enhanced token usage" ON enhanced_token_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enhanced token usage" ON enhanced_token_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Content deduplication policies
CREATE POLICY "Users can view their own deduplication data" ON content_deduplication
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deduplication data" ON content_deduplication
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deduplication data" ON content_deduplication
  FOR UPDATE USING (auth.uid() = user_id);

-- User analytics policies
CREATE POLICY "Users can view their own analytics" ON user_study_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics" ON user_study_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics" ON user_study_analytics
  FOR UPDATE USING (auth.uid() = user_id);

-- Study sessions policies
CREATE POLICY "Users can manage their own study sessions" ON study_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Create enhanced functions for analytics and optimization

-- Function to check for duplicate content
CREATE OR REPLACE FUNCTION check_content_duplicate(
    p_input_hash TEXT,
    p_content_type TEXT,
    p_generation_params_hash TEXT,
    p_user_id UUID
)
RETURNS TABLE (
    is_duplicate BOOLEAN,
    existing_material_id UUID,
    cache_key TEXT,
    quality_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (cd.id IS NOT NULL) as is_duplicate,
        cd.study_material_id as existing_material_id,
        sm.cache_key as cache_key,
        sm.quality_score as quality_score
    FROM content_deduplication cd
    LEFT JOIN study_materials sm ON cd.study_material_id = sm.id
    WHERE cd.input_hash = p_input_hash
    AND cd.content_type = p_content_type
    AND cd.generation_params_hash = p_generation_params_hash
    AND cd.user_id = p_user_id
    ORDER BY cd.last_accessed DESC
    LIMIT 1;
    
    -- If found, update access count and timestamp
    UPDATE content_deduplication 
    SET access_count = access_count + 1,
        last_accessed = NOW()
    WHERE input_hash = p_input_hash
    AND content_type = p_content_type
    AND generation_params_hash = p_generation_params_hash
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record content generation
CREATE OR REPLACE FUNCTION record_content_generation(
    p_input_hash TEXT,
    p_content_type TEXT,
    p_generation_params_hash TEXT,
    p_user_id UUID,
    p_study_material_id UUID,
    p_quality_metrics JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    dedup_id UUID;
BEGIN
    INSERT INTO content_deduplication (
        input_hash,
        content_type,
        generation_params_hash,
        user_id,
        study_material_id,
        quality_metrics
    ) VALUES (
        p_input_hash,
        p_content_type,
        p_generation_params_hash,
        p_user_id,
        p_study_material_id,
        p_quality_metrics
    ) RETURNING id INTO dedup_id;
    
    RETURN dedup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user analytics
CREATE OR REPLACE FUNCTION update_user_analytics(
    p_user_id UUID,
    p_operation_type TEXT,
    p_content_type TEXT,
    p_tokens_used INTEGER,
    p_cost DECIMAL,
    p_processing_time_ms INTEGER,
    p_cached BOOLEAN,
    p_quality_rating INTEGER DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO user_study_analytics (
        user_id,
        analytics_date,
        total_generations,
        total_tokens_used,
        total_cost,
        cache_hit_rate,
        avg_processing_time_ms,
        content_types_usage,
        quality_ratings
    ) VALUES (
        p_user_id,
        CURRENT_DATE,
        1,
        p_tokens_used,
        p_cost,
        CASE WHEN p_cached THEN 1.0 ELSE 0.0 END,
        p_processing_time_ms,
        jsonb_build_object(p_content_type, 1),
        CASE WHEN p_quality_rating IS NOT NULL 
             THEN jsonb_build_object(p_content_type, p_quality_rating)
             ELSE '{}'::jsonb END
    )
    ON CONFLICT (user_id, analytics_date) DO UPDATE SET
        total_generations = user_study_analytics.total_generations + 1,
        total_tokens_used = user_study_analytics.total_tokens_used + p_tokens_used,
        total_cost = user_study_analytics.total_cost + p_cost,
        cache_hit_rate = (
            user_study_analytics.cache_hit_rate * user_study_analytics.total_generations + 
            CASE WHEN p_cached THEN 1.0 ELSE 0.0 END
        ) / (user_study_analytics.total_generations + 1),
        avg_processing_time_ms = (
            user_study_analytics.avg_processing_time_ms * user_study_analytics.total_generations + 
            p_processing_time_ms
        ) / (user_study_analytics.total_generations + 1),
        content_types_usage = user_study_analytics.content_types_usage || 
            jsonb_build_object(
                p_content_type, 
                COALESCE((user_study_analytics.content_types_usage->>p_content_type)::integer, 0) + 1
            ),
        quality_ratings = CASE WHEN p_quality_rating IS NOT NULL 
            THEN user_study_analytics.quality_ratings || jsonb_build_object(p_content_type, p_quality_rating)
            ELSE user_study_analytics.quality_ratings END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user study statistics
CREATE OR REPLACE FUNCTION get_user_study_stats(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_generations BIGINT,
    total_tokens_used BIGINT,
    total_cost DECIMAL,
    avg_cache_hit_rate DECIMAL,
    avg_processing_time INTEGER,
    content_type_breakdown JSONB,
    quality_breakdown JSONB,
    cost_by_operation JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH analytics_summary AS (
        SELECT 
            SUM(usa.total_generations) as generations,
            SUM(usa.total_tokens_used) as tokens,
            SUM(usa.total_cost) as cost,
            AVG(usa.cache_hit_rate) as hit_rate,
            AVG(usa.avg_processing_time_ms) as proc_time
        FROM user_study_analytics usa
        WHERE usa.user_id = p_user_id
        AND usa.analytics_date >= CURRENT_DATE - p_days
    ),
    operation_costs AS (
        SELECT jsonb_object_agg(
            etu.operation_type,
            jsonb_build_object(
                'total_cost', SUM(etu.estimated_cost),
                'total_tokens', SUM(etu.total_tokens),
                'count', COUNT(*)
            )
        ) as op_costs
        FROM enhanced_token_usage etu
        WHERE etu.user_id = p_user_id
        AND etu.created_at >= NOW() - (p_days || ' days')::INTERVAL
    )
    SELECT 
        COALESCE(a.generations, 0)::BIGINT,
        COALESCE(a.tokens, 0)::BIGINT,
        COALESCE(a.cost, 0)::DECIMAL,
        COALESCE(a.hit_rate, 0)::DECIMAL,
        COALESCE(a.proc_time, 0)::INTEGER,
        COALESCE(
            (SELECT jsonb_object_agg(key, value) 
             FROM user_study_analytics usa, jsonb_each(usa.content_types_usage)
             WHERE usa.user_id = p_user_id 
             AND usa.analytics_date >= CURRENT_DATE - p_days), 
            '{}'::jsonb
        ),
        COALESCE(
            (SELECT jsonb_object_agg(key, value) 
             FROM user_study_analytics usa, jsonb_each(usa.quality_ratings)
             WHERE usa.user_id = p_user_id 
             AND usa.analytics_date >= CURRENT_DATE - p_days), 
            '{}'::jsonb
        ),
        COALESCE(oc.op_costs, '{}'::jsonb)
    FROM analytics_summary a
    CROSS JOIN operation_costs oc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic analytics updates
CREATE OR REPLACE FUNCTION trigger_update_analytics()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_user_analytics(
        NEW.user_id,
        NEW.operation_type,
        NEW.content_type,
        NEW.total_tokens,
        NEW.estimated_cost,
        NEW.processing_time_ms,
        NEW.cached,
        NEW.user_feedback
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_on_token_usage
    AFTER INSERT ON enhanced_token_usage
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_analytics();

-- Add helpful comments
COMMENT ON TABLE enhanced_token_usage IS 'Enhanced token usage tracking with detailed analytics and cost optimization';
COMMENT ON TABLE content_deduplication IS 'Prevents duplicate content generation by tracking input hashes';
COMMENT ON TABLE user_study_analytics IS 'Daily aggregated analytics for user study patterns and costs';
COMMENT ON TABLE study_sessions IS 'Tracks complete study sessions for learning analytics';

COMMENT ON FUNCTION check_content_duplicate IS 'Checks if content with same parameters was already generated';
COMMENT ON FUNCTION record_content_generation IS 'Records a new content generation for deduplication tracking';
COMMENT ON FUNCTION update_user_analytics IS 'Updates daily user analytics with new activity';
COMMENT ON FUNCTION get_user_study_stats IS 'Retrieves comprehensive user study statistics';

-- Create view for admin analytics dashboard
CREATE OR REPLACE VIEW admin_usage_overview AS
WITH base AS (
  SELECT
    DATE(created_at)                 AS usage_date,
    user_id,
    content_type,
    total_tokens,
    estimated_cost,
    processing_time_ms,
    cached
  FROM enhanced_token_usage
  WHERE created_at >= CURRENT_DATE - 30
),
overall AS (
  SELECT
    usage_date,
    COUNT(*)                                       AS total_operations,
    SUM(total_tokens)                              AS total_tokens,
    SUM(estimated_cost)                            AS total_cost,
    AVG(CASE WHEN cached THEN 1.0 ELSE 0.0 END)     AS cache_hit_rate,
    AVG(processing_time_ms)                        AS avg_processing_time,
    COUNT(DISTINCT user_id)                        AS active_users
  FROM base
  GROUP BY usage_date
),
breakdown AS (
  SELECT
    usage_date,
    jsonb_object_agg(content_type, cnt)            AS content_type_breakdown
  FROM (
    SELECT
      usage_date,
      content_type,
      COUNT(*)                                    AS cnt
    FROM base
    GROUP BY
      usage_date,
      content_type
  ) AS per_type
  GROUP BY usage_date
)
SELECT
  o.usage_date,
  o.total_operations,
  o.total_tokens,
  o.total_cost,
  o.cache_hit_rate,
  o.avg_processing_time,
  o.active_users,
  COALESCE(b.content_type_breakdown, '{}'::jsonb) AS content_type_breakdown
FROM overall AS o
LEFT JOIN breakdown AS b USING (usage_date)
ORDER BY usage_date DESC;







