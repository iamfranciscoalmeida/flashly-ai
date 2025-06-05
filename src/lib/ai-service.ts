import OpenAI from 'openai';
import { EnhancedFlashcard, EnhancedQuiz } from '@/types/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GenerateFlashcardsParams {
  content: string;
  moduleTitle?: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface GenerateQuizParams {
  content: string;
  moduleTitle?: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface GenerateSummaryParams {
  content: string;
  moduleTitle?: string;
  maxLength?: number;
}

export interface GenerateStudyNotesParams {
  content: string;
  moduleTitle?: string;
  style?: 'bullet' | 'cornell' | 'outline';
}

export class AIService {
  static async generateFlashcards({
    content,
    moduleTitle,
    count = 5,
    difficulty = 'medium'
  }: GenerateFlashcardsParams): Promise<Partial<EnhancedFlashcard>[]> {
    const prompt = `
Based on the following content${moduleTitle ? ` from the module "${moduleTitle}"` : ''}, generate ${count} flashcards at a ${difficulty} difficulty level.

Content:
${content}

Generate flashcards in the following JSON format:
[
  {
    "question": "Clear, specific question",
    "answer": "Comprehensive answer",
    "difficulty_level": "${difficulty}",
    "tags": ["relevant", "topic", "tags"]
  }
]

Make sure questions test understanding, not just memorization. Include a mix of concept questions, application questions, and analysis questions.
`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator creating study materials. Generate only valid JSON.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('No response from AI');

      const parsed = JSON.parse(response);
      const flashcards = Array.isArray(parsed) ? parsed : parsed.flashcards || [];

      return flashcards.map((card: any) => ({
        question: card.question,
        answer: card.answer,
        difficulty_level: card.difficulty_level || difficulty,
        tags: card.tags || [],
        source_reference: {
          module: moduleTitle,
          generated_at: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error('Error generating flashcards:', error);
      throw error;
    }
  }

  static async generateQuiz({
    content,
    moduleTitle,
    count = 5,
    difficulty = 'medium'
  }: GenerateQuizParams): Promise<Partial<EnhancedQuiz>[]> {
    const prompt = `
Based on the following content${moduleTitle ? ` from the module "${moduleTitle}"` : ''}, generate ${count} multiple-choice questions at a ${difficulty} difficulty level.

Content:
${content}

Generate quiz questions in the following JSON format:
[
  {
    "question": "Clear, specific question",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": "Option X",
    "explanation": "Why this answer is correct",
    "difficulty_level": "${difficulty}",
    "tags": ["relevant", "topic", "tags"]
  }
]

Ensure:
1. All options are plausible
2. Questions test comprehension, not just recall
3. Explanations are educational
4. Options are randomized
`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator creating quiz questions. Generate only valid JSON.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('No response from AI');

      const parsed = JSON.parse(response);
      const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];

      return questions.map((q: any) => ({
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation,
        difficulty_level: q.difficulty_level || difficulty,
        tags: q.tags || [],
        source_reference: {
          module: moduleTitle,
          generated_at: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
  }

  static async generateSummary({
    content,
    moduleTitle,
    maxLength = 500
  }: GenerateSummaryParams): Promise<string> {
    const prompt = `
Summarize the following content${moduleTitle ? ` from the module "${moduleTitle}"` : ''} in approximately ${maxLength} words.

Content:
${content}

Create a comprehensive summary that:
1. Captures all key concepts and main ideas
2. Maintains logical flow and structure
3. Uses clear, concise language
4. Highlights important relationships between concepts
5. Includes any critical formulas, definitions, or facts
`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator creating study summaries. Be concise but comprehensive.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: Math.floor(maxLength * 1.5)
      });

      return completion.choices[0]?.message?.content || 'Failed to generate summary';
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }

  static async generateStudyNotes({
    content,
    moduleTitle,
    style = 'outline'
  }: GenerateStudyNotesParams): Promise<string> {
    const styleInstructions = {
      bullet: 'Use bullet points with main topics and subtopics. Keep points concise and actionable.',
      cornell: 'Format as Cornell notes with main notes on the right, cue column on the left, and summary at the bottom.',
      outline: 'Create a hierarchical outline with Roman numerals for main topics, letters for subtopics, and numbers for details.'
    };

    const prompt = `
Create study notes from the following content${moduleTitle ? ` from the module "${moduleTitle}"` : ''}.

Content:
${content}

Format the notes in ${style} style:
${styleInstructions[style]}

Ensure the notes:
1. Capture all important information
2. Are well-organized and easy to review
3. Include key terms, formulas, and concepts
4. Have clear visual hierarchy
5. Are suitable for exam preparation
`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator creating study notes. Focus on clarity and organization.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 1500
      });

      return completion.choices[0]?.message?.content || 'Failed to generate study notes';
    } catch (error) {
      console.error('Error generating study notes:', error);
      throw error;
    }
  }

  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }
}