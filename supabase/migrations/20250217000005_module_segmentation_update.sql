-- Module Segmentation & Study Material Generation Migration
-- This migration updates the modules table and adds the study_materials table

-- Add missing columns to modules table
ALTER TABLE modules ADD COLUMN IF NOT EXISTS start_page INTEGER;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS end_page INTEGER;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS content_excerpt TEXT;

-- Create study_materials table
CREATE TABLE IF NOT EXISTS study_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('flashcards', 'quiz', 'summary')),
  payload JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS study_materials_module_id_idx ON study_materials(module_id);
CREATE INDEX IF NOT EXISTS study_materials_type_idx ON study_materials(type);

-- Enable RLS on study_materials table
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for study_materials
-- Users can only access study materials for modules they own
CREATE POLICY "Users can view study materials for their modules"
ON study_materials FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules 
    WHERE modules.id = study_materials.module_id 
    AND modules.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert study materials for their modules"
ON study_materials FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM modules 
    WHERE modules.id = study_materials.module_id 
    AND modules.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update study materials for their modules"
ON study_materials FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules 
    WHERE modules.id = study_materials.module_id 
    AND modules.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete study materials for their modules"
ON study_materials FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules 
    WHERE modules.id = study_materials.module_id 
    AND modules.user_id = auth.uid()
  )
);

-- Note: The update_study_materials_updated_at() function and trigger 
-- are already created in the enhanced_study_materials migration 