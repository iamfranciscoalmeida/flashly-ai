export interface StudySession {
  id: string;
  user_id: string;
  title: string;
  subject?: string;
  topic?: string;
  level?: string;
  source_type: 'pdf' | 'youtube' | 'text' | 'document';
  source_url?: string;
  document_id?: string;
  content_text?: string;
  auto_labels?: {
    subject?: string;
    topic?: string;
    level?: string;
    keywords?: string[];
    difficulty?: string;
  };
  status: 'active' | 'archived' | 'processing';
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    context_used?: boolean;
    generation_type?: string;
    attachments?: string[];
  };
  created_at: string;
}

export interface SessionContent {
  id: string;
  session_id: string;
  user_id: string;
  content_type: 'flashcards' | 'quiz' | 'summary' | 'mindmap' | 'timeline';
  title?: string;
  content: FlashcardContent | QuizContent | SummaryContent | MindmapContent | TimelineContent;
  created_at: string;
  updated_at: string;
}

export interface FlashcardContent {
  flashcards: Array<{
    id: string;
    question: string;
    answer: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    tags?: string[];
  }>;
}

export interface QuizContent {
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correct_answer: number; // Index of correct option
    explanation?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  }>;
}

export interface SummaryContent {
  summary: string;
  key_points: string[];
  main_topics: string[];
  difficulty_level?: string;
}

export interface MindmapContent {
  central_topic: string;
  branches: Array<{
    title: string;
    subtopics: string[];
    connections?: string[];
  }>;
}

export interface TimelineContent {
  events: Array<{
    date: string;
    title: string;
    description: string;
    importance?: 'high' | 'medium' | 'low';
  }>;
}

export interface CreateSessionRequest {
  title: string;
  source_type: StudySession['source_type'];
  source_url?: string;
  document_id?: string;
  content_text?: string;
}

export interface GenerateContentRequest {
  session_id: string;
  content_type: SessionContent['content_type'];
  custom_instructions?: string;
}

export interface ChatRequest {
  session_id: string;
  message: string;
  include_context?: boolean;
} 