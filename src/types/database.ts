export type ChatSession = {
  id: string;
  user_id: string;
  document_id: string | null;
  module_id: string | null;
  title: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, any>;
  created_at: string;
};

export type ContentReference = {
  id: string;
  message_id: string;
  document_id: string;
  module_id: string | null;
  page_number: number | null;
  text_excerpt: string | null;
  created_at: string;
};

export type GeneratedContent = {
  id: string;
  message_id: string;
  type: 'flashcards' | 'quiz' | 'summary' | 'notes';
  content: any;
  created_at: string;
};

export type LearningPreference = {
  id: string;
  user_id: string;
  preference_key: string;
  preference_value: any;
  created_at: string;
  updated_at: string;
};

export type SourceType = 'file' | 'youtube' | 'google_drive' | 'image' | 'url';

export type EnhancedDocument = {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  folder_id: string | null;
  status: string;
  source_type: SourceType;
  source_url: string | null;
  extracted_text: string | null;
  page_count: number | null;
  metadata: Record<string, any>;
  created_at: string | null;
  updated_at: string | null;
};

export type EnhancedModule = {
  id: string;
  user_id: string;
  document_id: string;
  folder_id: string | null;
  title: string;
  order: number;
  summary: string | null;
  start_page: number | null;
  end_page: number | null;
  content_excerpt: string | null;
  embedding: number[] | null;
  chunk_index: number;
  created_at: string | null;
  updated_at: string | null;
};

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type EnhancedFlashcard = {
  id: string;
  user_id: string;
  document_id: string;
  module_id: string | null;
  folder_id: string | null;
  question: string;
  answer: string;
  source_reference: Record<string, any> | null;
  difficulty_level: DifficultyLevel | null;
  tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
};

export type EnhancedQuiz = {
  id: string;
  user_id: string;
  document_id: string;
  module_id: string | null;
  folder_id: string | null;
  question: string;
  options: string[];
  correct: string;
  source_reference: Record<string, any> | null;
  difficulty_level: DifficultyLevel | null;
  explanation: string | null;
  tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
};