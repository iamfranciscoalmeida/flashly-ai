import { createChatCompletion, callOpenAIWithRetry, openai } from '@/lib/openai-config';
import { EnhancedFlashcard, EnhancedQuiz } from '@/types/database';

export interface GenerateFlashcardsParams {
  content: string;
  moduleTitle?: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  difficultyDistribution?: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface GenerateQuizParams {
  content: string;
  moduleTitle?: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  difficultyDistribution?: {
    easy: number;
    medium: number;
    hard: number;
  };
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

// Token counting utility
function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

function generateContentGuidelines(type: 'flashcard' | 'quiz'): string {
  const baseGuidelines = `
CRITICAL INSTRUCTIONS FOR CONTENT GENERATION:
1. **NEVER reference specific book examples, figures, equations, or sections** (e.g., "Eq. 7.9", "Figure 3.2", "Example 4.1", "Section 2.3"). Users cannot see these references.
2. **Create novel, self-contained examples** from your knowledge base instead of referencing book examples.
3. **If the content mentions specific examples or figures, create new examples** that illustrate the same concepts.
4. **All questions and answers must be complete and understandable** without needing to reference external materials.
5. **Use your own knowledge** to provide concrete examples, formulas, and illustrations of concepts.

TRANSFORMATION EXAMPLES:
- Instead of "What is the significance of Eq. 7.9?" → "What is the backpropagation formula and how does it work in neural networks?"
- Instead of "According to Figure 3.2..." → "Consider a simple neural network with one hidden layer..."
- Instead of "As shown in Example 4.1..." → "For example, if we have a dataset with features X and labels Y..."
- Instead of "The 4-gram model in some examples..." → "A 4-gram language model analyzes sequences of 4 consecutive words to predict the next word..."
`;

  if (type === 'flashcard') {
    return baseGuidelines + `
FLASHCARD-SPECIFIC GUIDELINES:
- When explaining concepts, provide novel examples that you create, not book references
- If formulas are mentioned, state them explicitly rather than referencing equation numbers
- Create concrete scenarios to illustrate abstract concepts
- Include step-by-step explanations when appropriate`;
  } else {
    return baseGuidelines + `
QUIZ-SPECIFIC GUIDELINES:
- When referencing formulas or concepts, state them explicitly rather than using equation numbers
- Create novel examples in both questions and answer choices
- Make sure distractors are plausible but test understanding of the actual concept
- Include practical applications rather than book-specific scenarios`;
  }
}

// Smart content compression
async function compressContentForGeneration(
  content: string,
  maxTokens: number = 6000
): Promise<string> {
  const currentTokens = estimateTokenCount(content);
  
  if (currentTokens <= maxTokens) {
    return content;
  }

  console.log(`⚠️ Content too large (${currentTokens} tokens), compressing to fit ${maxTokens} tokens...`);

  // Strategy 1: Extract key sections (prioritize content with definitions, examples, formulas)
  const keyContentPatterns = [
    /Definition[s]?[:\-\s][\s\S]*?(?=\n\n|\n[A-Z]|\n\d+\.|\n[•·\-\*]|$)/gi,
    /Example[s]?[:\-\s][\s\S]*?(?=\n\n|\n[A-Z]|\n\d+\.|\n[•·\-\*]|$)/gi,
    /Formula[s]?[:\-\s][\s\S]*?(?=\n\n|\n[A-Z]|\n\d+\.|\n[•·\-\*]|$)/gi,
    /Theorem[s]?[:\-\s][\s\S]*?(?=\n\n|\n[A-Z]|\n\d+\.|\n[•·\-\*]|$)/gi,
    /Principle[s]?[:\-\s][\s\S]*?(?=\n\n|\n[A-Z]|\n\d+\.|\n[•·\-\*]|$)/gi,
    /Key Points?[:\-\s][\s\S]*?(?=\n\n|\n[A-Z]|\n\d+\.|\n[•·\-\*]|$)/gi,
    /Summary[:\-\s][\s\S]*?(?=\n\n|\n[A-Z]|\n\d+\.|\n[•·\-\*]|$)/gi
  ];

  let keyContent: string[] = [];
  
  for (const pattern of keyContentPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      keyContent.push(...matches);
    }
  }

  // If we found key content, use it
  if (keyContent.length > 0) {
    const combinedKeyContent = keyContent.join('\n\n');
    if (estimateTokenCount(combinedKeyContent) <= maxTokens) {
      console.log(`✅ Extracted ${keyContent.length} key sections`);
      return combinedKeyContent;
    }
  }

  // Strategy 2: Take proportional chunks from beginning, middle, and end
  const targetChars = maxTokens * 3.5; // Rough chars to tokens conversion
  const chunkSize = Math.floor(targetChars / 3);
  
  const beginning = content.substring(0, chunkSize);
  const middle = content.substring(
    Math.floor(content.length / 2) - Math.floor(chunkSize / 2),
    Math.floor(content.length / 2) + Math.floor(chunkSize / 2)
  );
  const end = content.substring(Math.max(0, content.length - chunkSize));

  const compressed = `${beginning}\n\n[... middle content ...]\n\n${middle}\n\n[... end content ...]\n\n${end}`;
  
  console.log(`✅ Compressed to ${estimateTokenCount(compressed)} tokens using chunk strategy`);
  return compressed;
}

// Enhanced prompt generation with fallback model selection
async function generateWithFallback(
  prompt: string, 
  systemMessage: string,
  options: {
    preferredModel?: string;
    maxTokens?: number;
    temperature?: number;
    responseFormat?: any;
  } = {}
): Promise<string> {
  const {
    preferredModel = 'gpt-4-turbo-preview',
    maxTokens = 2000,
    temperature = 0.7,
    responseFormat
  } = options;

  // Estimate total token usage (prompt + completion)
  const promptTokens = estimateTokenCount(prompt + systemMessage);
  const totalEstimatedTokens = promptTokens + maxTokens;

  console.log(`🔢 Token estimate: ${promptTokens} prompt + ${maxTokens} completion = ${totalEstimatedTokens} total`);

  // Model selection based on token requirements
  let modelToUse = preferredModel;
  let adjustedMaxTokens = maxTokens;

  if (totalEstimatedTokens > 25000) {
    // Use GPT-3.5 for very large requests
    modelToUse = 'gpt-3.5-turbo';
    adjustedMaxTokens = Math.min(maxTokens, 2000);
    console.log(`⚡ Switching to GPT-3.5 due to size (${totalEstimatedTokens} tokens)`);
  } else if (totalEstimatedTokens > 15000) {
    // Reduce output tokens for GPT-4
    adjustedMaxTokens = Math.min(maxTokens, 1500);
    console.log(`⚠️ Reducing output tokens to ${adjustedMaxTokens} for GPT-4`);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: adjustedMaxTokens,
      ...(responseFormat && { response_format: responseFormat })
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error('No response from AI');

    return response;
  } catch (error: any) {
    // If we hit token limits with GPT-4, fallback to GPT-3.5
    if (error.message?.includes('token') && modelToUse !== 'gpt-3.5-turbo') {
      console.log(`🔄 Fallback to GPT-3.5 due to error: ${error.message}`);
      
      // Compress content further for GPT-3.5
      const compressedPrompt = await compressContentForGeneration(prompt, 3000);
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: compressedPrompt }
        ],
        temperature,
        max_tokens: Math.min(adjustedMaxTokens, 1000),
        ...(responseFormat && { response_format: responseFormat })
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('No response from AI');
      return response;
    }
    
    throw error;
  }
}

export class AIService {
  static async generateFlashcards({
    content,
    moduleTitle,
    count = 5,
    difficulty = 'medium',
    difficultyDistribution
  }: GenerateFlashcardsParams): Promise<Partial<EnhancedFlashcard>[]> {
    // Compress content to prevent token limit errors
    const compressedContent = await compressContentForGeneration(content, 5000);
    
    let difficultyInstruction = '';
    if (difficulty === 'mixed' && difficultyDistribution) {
      const easyCount = Math.round(count * difficultyDistribution.easy / 100);
      const mediumCount = Math.round(count * difficultyDistribution.medium / 100);
      const hardCount = count - easyCount - mediumCount; // Ensure exact count
      
      difficultyInstruction = `Generate a mix of difficulty levels:
- ${easyCount} easy flashcards (basic recall, simple concepts)
- ${mediumCount} medium flashcards (understanding, application)
- ${hardCount} hard flashcards (analysis, synthesis, complex concepts)`;
    } else {
      difficultyInstruction = `Generate exactly ${count} flashcards at a ${difficulty} difficulty level.`;
    }

    const prompt = `Based on the following content${moduleTitle ? ` from the module "${moduleTitle}"` : ''}, ${difficultyInstruction}

Content:
${compressedContent}

IMPORTANT: Respond with ONLY a JSON array of flashcards. No additional text or explanation.

${generateContentGuidelines('flashcard')}

Required JSON format:
[
  {
    "question": "Clear, specific question about the content",
    "answer": "Comprehensive answer with explanation",
    "difficulty_level": "${difficulty === 'mixed' ? 'easy|medium|hard (assign based on complexity)' : difficulty}",
    "tags": ["relevant", "topic", "tags"]
  }
]

Guidelines:
- Create questions that test understanding, not just memorization
- Include a mix of concept questions, application questions, and analysis questions  
- Make answers detailed and educational
- Use content-specific terminology and examples FROM YOUR KNOWLEDGE BASE
- Ensure each flashcard is complete and self-contained
- When explaining concepts, provide novel examples that you create, not book references
- If formulas are mentioned, state them explicitly rather than referencing equation numbers
${difficulty === 'mixed' ? '- Vary complexity to match the requested difficulty distribution' : ''}

Generate the JSON array now:`;

    try {
      const response = await createChatCompletion([
        { role: 'system', content: 'You are an expert educator creating study materials. Always respond with valid JSON only, no additional text. NEVER reference specific book examples, figures, equations, or sections that users cannot see. Instead, create novel examples from your knowledge base.' },
        { role: 'user', content: prompt }
      ], {
        max_tokens: 2000,
        temperature: 0.7
      });

      console.log('🤖 AI Response received, length:', response.length);
      console.log('🔍 Response preview:', response.substring(0, 200));

      // Clean the response to extract just the JSON
      let cleanedResponse = response.trim();
      
      // Remove any markdown code blocks
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Extract JSON array if it's wrapped in other text
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      console.log('🧹 Cleaned response preview:', cleanedResponse.substring(0, 200));

      const parsed = JSON.parse(cleanedResponse);
      const flashcards = Array.isArray(parsed) ? parsed : (parsed.flashcards || []);

      console.log('📚 Parsed flashcards count:', flashcards.length);

      if (flashcards.length === 0) {
        console.log('⚠️ No flashcards generated, raw response:', response);
        throw new Error('No flashcards were generated from the content');
      }

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
    difficulty = 'medium',
    difficultyDistribution
  }: GenerateQuizParams): Promise<Partial<EnhancedQuiz>[]> {
    // Compress content to prevent token limit errors
    const compressedContent = await compressContentForGeneration(content, 5000);
    
    let difficultyInstruction = '';
    if (difficulty === 'mixed' && difficultyDistribution) {
      const easyCount = Math.round(count * difficultyDistribution.easy / 100);
      const mediumCount = Math.round(count * difficultyDistribution.medium / 100);
      const hardCount = count - easyCount - mediumCount; // Ensure exact count
      
      difficultyInstruction = `Generate a mix of difficulty levels:
- ${easyCount} easy questions (basic recall, simple concepts)
- ${mediumCount} medium questions (understanding, application)
- ${hardCount} hard questions (analysis, synthesis, complex reasoning)`;
    } else {
      difficultyInstruction = `Generate exactly ${count} multiple-choice questions at a ${difficulty} difficulty level.`;
    }

    const prompt = `Based on the following content${moduleTitle ? ` from the module "${moduleTitle}"` : ''}, ${difficultyInstruction}

Content:
${compressedContent}

IMPORTANT: Respond with ONLY a JSON array of quiz questions. No additional text or explanation.

${generateContentGuidelines('quiz')}

Required JSON format:
[
  {
    "question": "Clear, specific question about the content",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": "Option A",
    "explanation": "Detailed explanation of why this answer is correct",
    "difficulty_level": "${difficulty === 'mixed' ? 'easy|medium|hard (assign based on complexity)' : difficulty}",
    "tags": ["relevant", "topic", "tags"]
  }
]

Guidelines:
- Create challenging but fair questions that test understanding
- Make all options plausible (good distractors)
- Ensure the correct answer is definitively correct
- Include detailed explanations for learning
- Use content-specific terminology and examples FROM YOUR KNOWLEDGE BASE
- Test comprehension, application, and analysis
- When explaining concepts, provide novel examples that you create, not book references
- If formulas are mentioned, state them explicitly rather than referencing equation numbers
${difficulty === 'mixed' ? '- Vary complexity to match the requested difficulty distribution' : ''}

Generate the JSON array now:`;

    try {
      const response = await createChatCompletion([
        { role: 'system', content: 'You are an expert educator creating quiz questions. Always respond with valid JSON only, no additional text. NEVER reference specific book examples, figures, equations, or sections that users cannot see. Instead, create novel examples from your knowledge base.' },
        { role: 'user', content: prompt }
      ], {
        max_tokens: 2000,
        temperature: 0.7
      });

      console.log('🤖 Quiz AI Response received, length:', response.length);
      console.log('🔍 Quiz Response preview:', response.substring(0, 200));

      // Clean the response to extract just the JSON
      let cleanedResponse = response.trim();
      
      // Remove any markdown code blocks
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Extract JSON array if it's wrapped in other text
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      console.log('🧹 Cleaned quiz response preview:', cleanedResponse.substring(0, 200));

      const parsed = JSON.parse(cleanedResponse);
      const questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);

      console.log('❓ Parsed quiz questions count:', questions.length);

      if (questions.length === 0) {
        console.log('⚠️ No quiz questions generated, raw response:', response);
        throw new Error('No quiz questions were generated from the content');
      }

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
    // Compress content to prevent token limit errors
    const compressedContent = await compressContentForGeneration(content, 6000);
    
    const prompt = `
Summarize the following content${moduleTitle ? ` from the module "${moduleTitle}"` : ''} in approximately ${maxLength} words.

Content:
${compressedContent}

Create a comprehensive summary that:
1. Captures all key concepts and main ideas
2. Maintains logical flow and structure
3. Uses clear, concise language
4. Highlights important relationships between concepts
5. Includes any critical formulas, definitions, or facts
`;

    try {
      const response = await createChatCompletion([
        { role: 'system', content: 'You are an expert educator creating study summaries. Be concise but comprehensive.' },
        { role: 'user', content: prompt }
      ], {
        max_tokens: Math.floor(maxLength * 1.5),
        temperature: 0.5
      });

      return response || 'Failed to generate summary';
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
    // Compress content to prevent token limit errors
    const compressedContent = await compressContentForGeneration(content, 6000);
    
    const styleInstructions = {
      bullet: 'Use bullet points with main topics and subtopics. Keep points concise and actionable.',
      cornell: 'Format as Cornell notes with main notes on the right, cue column on the left, and summary at the bottom.',
      outline: 'Create a hierarchical outline with Roman numerals for main topics, letters for subtopics, and numbers for details.'
    };

    const prompt = `
Create study notes from the following content${moduleTitle ? ` from the module "${moduleTitle}"` : ''}.

Content:
${compressedContent}

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
      const response = await createChatCompletion([
        { role: 'system', content: 'You are an expert educator creating study notes. Focus on clarity and organization.' },
        { role: 'user', content: prompt }
      ], {
        max_tokens: 1500,
        temperature: 0.5
      });

      return response || 'Failed to generate study notes';
    } catch (error) {
      console.error('Error generating study notes:', error);
      throw error;
    }
  }

  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await callOpenAIWithRetry(() =>
        openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text,
        })
      );

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }
}