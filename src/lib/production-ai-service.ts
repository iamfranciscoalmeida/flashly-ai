import { createChatCompletion } from './openai-config';
import { EnhancedDocumentProcessor, DocumentAnalysis, ProcessingOptions } from './enhanced-document-processor';
import { CachingService } from './caching-service';
import { DocumentChunk } from './intelligent-chunking-service';

export type SummaryTier = 'tldr' | 'detailed' | 'exam-ready';
export type NotesFormat = 'outline' | 'cornell' | 'mindmap' | 'bullet';

export interface TieredSummaryResult {
  tldr: string;
  detailed: string;
  examReady: string;
  sourceReferences: string[];
  keyTerms: string[];
  estimatedReadTime: number;
  processingMetadata: {
    strategy: string;
    chunksProcessed: number;
    totalTokensUsed: number;
    cached: boolean;
  };
}

export interface StructuredNotesResult {
  content: string;
  format: NotesFormat;
  sections: Array<{
    title: string;
    content: string;
    sourceReference?: string;
  }>;
  keyPoints: string[];
  reviewQuestions: string[];
  processingMetadata: {
    strategy: string;
    tokensUsed: number;
    cached: boolean;
  };
}

export interface GenerationOptions {
  tier?: SummaryTier;
  format?: NotesFormat;
  includeReferences?: boolean;
  maxLength?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  forceRegenerate?: boolean;
  selectedSections?: Array<{
    title: string;
    content: string;
    startPage?: number;
    endPage?: number;
  }>;
}

export class ProductionAIService {
  
  /**
   * Generate production-grade tiered summaries with intelligent caching
   */
  static async generateTieredSummary(
    content: string,
    options: GenerationOptions = {},
    userId: string,
    sessionId?: string
  ): Promise<TieredSummaryResult> {
    const startTime = Date.now();
    console.log('🧠 Starting production tiered summary generation...');

    // Generate cache key
    const cacheKey = CachingService.generateCacheKey(content, 'tiered-summary', options);
    
    // Check cache unless forced regeneration
    if (!options.forceRegenerate) {
      const cachedResult = await CachingService.checkCache(cacheKey);
      if (cachedResult) {
        console.log('💾 Returning cached tiered summary');
        
        await CachingService.trackTokenUsage(
          userId, 
          'tiered-summary', 
          'cached', 
          0, 
          0, 
          true, 
          sessionId
        );

        return {
          ...cachedResult.content,
          processingMetadata: {
            ...cachedResult.content.processingMetadata,
            cached: true
          }
        };
      }
    }

    // Analyze document and determine processing strategy
    const analysis = await EnhancedDocumentProcessor.analyzeDocument(content);
    
    // If user input is required and not provided, throw with suggestions
    if (analysis.processingStrategy === 'user-selection' && !options.selectedSections) {
      throw new Error(JSON.stringify({
        type: 'USER_INPUT_REQUIRED',
        analysis,
        suggestedSections: analysis.suggestedSections
      }));
    }

    // Process document according to analysis
    const processingResult = await EnhancedDocumentProcessor.processDocument(
      content, 
      analysis, 
      {
        selectedSections: options.selectedSections,
        preserveStructure: true
      }
    );

    if (processingResult.userInputRequired) {
      throw new Error(JSON.stringify({
        type: 'USER_INPUT_REQUIRED',
        analysis,
        suggestedSections: processingResult.metadata.suggestedSections
      }));
    }

    // Generate all tiers in parallel for efficiency
    const [tldr, detailed, examReady] = await Promise.all([
      this.generateSummaryByTier(processingResult.chunks, 'tldr', options),
      this.generateSummaryByTier(processingResult.chunks, 'detailed', options),
      this.generateSummaryByTier(processingResult.chunks, 'exam-ready', options)
    ]);

    // Extract metadata
    const sourceReferences = this.extractSourceReferences(processingResult.chunks);
    const keyTerms = await this.extractKeyTerms(content);
    const estimatedReadTime = Math.ceil(content.split(' ').length / 200);
    
    const totalTokensUsed = this.calculateTokensUsed([tldr, detailed, examReady], content);

    const result: TieredSummaryResult = {
      tldr,
      detailed,
      examReady,
      sourceReferences,
      keyTerms,
      estimatedReadTime,
      processingMetadata: {
        strategy: processingResult.strategy,
        chunksProcessed: processingResult.chunks.length,
        totalTokensUsed,
        cached: false
      }
    };

    // Cache the result
    await CachingService.setCache(
      cacheKey,
      result,
      'summary',
      totalTokensUsed,
      { tier: 'tiered', ttlHours: 24 }
    );

    // Track token usage
    await CachingService.trackTokenUsage(
      userId,
      'tiered-summary',
      'gpt-4-turbo-preview',
      Math.ceil(content.length / 4),
      totalTokensUsed,
      false,
      sessionId
    );

    console.log(`✅ Tiered summary generated in ${Date.now() - startTime}ms`);
    return result;
  }

  /**
   * Generate structured study notes with format options
   */
  static async generateStructuredNotes(
    content: string,
    format: NotesFormat = 'outline',
    options: GenerationOptions = {},
    userId: string,
    sessionId?: string
  ): Promise<StructuredNotesResult> {
    const startTime = Date.now();
    console.log(`📝 Generating ${format} study notes...`);

    // Generate cache key
    const cacheKey = CachingService.generateCacheKey(content, 'structured-notes', { format, ...options });
    
    // Check cache
    if (!options.forceRegenerate) {
      const cachedResult = await CachingService.checkCache(cacheKey);
      if (cachedResult) {
        console.log('💾 Returning cached notes');
        
        await CachingService.trackTokenUsage(userId, 'structured-notes', 'cached', 0, 0, true, sessionId);
        
        return {
          ...cachedResult.content,
          processingMetadata: { ...cachedResult.content.processingMetadata, cached: true }
        };
      }
    }

    // Process document
    const analysis = await EnhancedDocumentProcessor.analyzeDocument(content);
    const processingResult = await EnhancedDocumentProcessor.processDocument(content, analysis, {
      selectedSections: options.selectedSections
    });

    if (processingResult.userInputRequired) {
      throw new Error(JSON.stringify({
        type: 'USER_INPUT_REQUIRED',
        analysis,
        suggestedSections: processingResult.metadata.suggestedSections
      }));
    }

    // Generate notes with specific format
    const formatInstructions = this.getFormatInstructions(format);
    const notesContent = await this.generateNotesWithFormat(
      processingResult.chunks,
      formatInstructions,
      options
    );

    // Extract sections and metadata
    const sections = this.parseNotesIntoSections(notesContent, format);
    const keyPoints = this.extractKeyPoints(notesContent);
    const reviewQuestions = await this.generateReviewQuestions(processingResult.chunks, options);
    
    const tokensUsed = this.estimateTokens(notesContent);

    const result: StructuredNotesResult = {
      content: notesContent,
      format,
      sections,
      keyPoints,
      reviewQuestions,
      processingMetadata: {
        strategy: processingResult.strategy,
        tokensUsed,
        cached: false
      }
    };

    // Cache and track usage
    await CachingService.setCache(cacheKey, result, 'notes', tokensUsed, { format, ttlHours: 24 });
    await CachingService.trackTokenUsage(userId, 'structured-notes', 'gpt-4-turbo-preview', 
      Math.ceil(content.length / 4), tokensUsed, false, sessionId);

    console.log(`✅ Notes generated in ${Date.now() - startTime}ms`);
    return result;
  }

  /**
   * Generate summary for specific tier with optimized prompting
   */
  private static async generateSummaryByTier(
    chunks: DocumentChunk[],
    tier: SummaryTier,
    options: GenerationOptions
  ): Promise<string> {
    const tierConfigs = {
      tldr: {
        maxWords: 100,
        style: 'extremely concise bullet points',
        focus: 'only the most critical facts and takeaways',
        temperature: 0.3
      },
      detailed: {
        maxWords: 500,
        style: 'comprehensive yet accessible narrative',
        focus: 'key concepts, relationships, context, and practical applications',
        temperature: 0.5
      },
      'exam-ready': {
        maxWords: 800,
        style: 'structured, examination-focused content',
        focus: 'testable concepts, formulas, definitions, examples, and critical analysis points',
        temperature: 0.4
      }
    };

    const config = tierConfigs[tier];
    
    // Prioritize chunks based on semantic importance
    const prioritizedChunks = chunks
      .sort((a, b) => b.semanticWeight - a.semanticWeight)
      .slice(0, tier === 'tldr' ? 2 : tier === 'detailed' ? 4 : chunks.length);

    const combinedContent = prioritizedChunks.map(chunk => chunk.content).join('\n\n---\n\n');
    
    const prompt = `Create a ${tier.toUpperCase()} summary following these exact specifications:

TIER: ${tier.toUpperCase()}
WORD LIMIT: Maximum ${config.maxWords} words
STYLE: ${config.style}
FOCUS: ${config.focus}

CONTENT TO SUMMARIZE:
${combinedContent}

REQUIREMENTS:
${tier === 'tldr' ? '- Use bullet points\n- Focus on absolute essentials only\n- Be extremely concise' : ''}
${tier === 'detailed' ? '- Create flowing narrative\n- Include context and relationships\n- Balance comprehensiveness with readability' : ''}
${tier === 'exam-ready' ? '- Organize by testable topics\n- Include specific formulas and definitions\n- Add examples and critical analysis points\n- Structure for effective study and review' : ''}

OUTPUT: Provide only the ${tier} summary content, no additional commentary.`;

    const systemPrompt = `You are an expert educational content specialist creating ${tier} summaries. Your summaries are known for being ${config.style} and focusing on ${config.focus}. Always stay within the word limit.`;

    return await createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ], {
      max_tokens: Math.floor(config.maxWords * 1.8),
      temperature: config.temperature
    });
  }

  /**
   * Get format-specific instructions for note generation
   */
  private static getFormatInstructions(format: NotesFormat): string {
    const instructions = {
      outline: `Create a comprehensive hierarchical outline:
- Use Roman numerals (I, II, III) for major topics
- Use capital letters (A, B, C) for main subtopics  
- Use numbers (1, 2, 3) for supporting details
- Use lowercase letters (a, b, c) for specific examples
- Ensure logical flow and clear hierarchy
- Include all important concepts and details`,

      cornell: `Format as Cornell Notes with clear sections:
**[NOTES SECTION]**
- Main content goes here with detailed explanations
- Use clear headings and bullet points
- Include examples and formulas

**[CUE COLUMN]**  
- Keywords and key concepts
- Questions to review
- Memory triggers
- Important dates/names

**[SUMMARY SECTION]**
- Concise overview of main points
- Key takeaways for review
- Connection between concepts`,

      mindmap: `Create a text-based mind map structure:
CENTRAL TOPIC: [Main subject]
├─ BRANCH 1: [Primary concept]
│  ├─ Sub-concept A
│  │  └─ Detail/Example
│  └─ Sub-concept B
├─ BRANCH 2: [Primary concept]
│  ├─ Sub-concept A
│  └─ Sub-concept B
└─ BRANCH 3: [Primary concept]
Use clear hierarchical indentation and connection symbols`,

      bullet: `Use structured bullet point format:
• MAIN TOPICS (use filled circles)
  ○ Subtopics (use open circles)
    ▪ Details (use squares)
      → Examples (use arrows)
      → Applications
  ○ Additional subtopics
• NEXT MAIN TOPIC
Include visual hierarchy and clear categorization`
    };

    return instructions[format];
  }

  /**
   * Generate notes with specific formatting
   */
  private static async generateNotesWithFormat(
    chunks: DocumentChunk[],
    formatInstructions: string,
    options: GenerationOptions
  ): Promise<string> {
    const combinedContent = chunks.map(chunk => chunk.content).join('\n\n---\n\n');
    
    const prompt = `Create comprehensive study notes following this exact format:

${formatInstructions}

CONTENT TO PROCESS:
${combinedContent}

REQUIREMENTS:
- Capture ALL important information from the content
- Maintain the specified format structure precisely
- Create clear visual hierarchy
- Include key terms, formulas, and concepts
- Make it suitable for exam preparation and review
- Ensure easy scanning and navigation
- Add source references where applicable

DIFFICULTY LEVEL: ${options.difficulty || 'medium'}

Generate the formatted study notes:`;

    const systemPrompt = `You are an expert educator creating well-structured study notes. Follow the format instructions precisely and focus on clarity, organization, and educational value.`;

    return await createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ], {
      max_tokens: 2500,
      temperature: 0.4
    });
  }

  // Helper methods
  private static extractSourceReferences(chunks: DocumentChunk[]): string[] {
    return chunks.map(chunk => chunk.references).flat().filter(ref => ref);
  }

  private static async extractKeyTerms(content: string): Promise<string[]> {
    const prompt = `Extract the 10-15 most important key terms, concepts, and technical vocabulary from this content. Return only a JSON array of strings.

Content: ${content.substring(0, 2000)}...`;

    try {
      const response = await createChatCompletion([
        { role: 'system', content: 'Extract key terms and return only a JSON array of strings.' },
        { role: 'user', content: prompt }
      ], { max_tokens: 200, temperature: 0.1 });

      return JSON.parse(response);
    } catch (error) {
      console.error('Error extracting key terms:', error);
      return [];
    }
  }

  private static parseNotesIntoSections(
    content: string,
    format: NotesFormat
  ): Array<{ title: string; content: string; sourceReference?: string }> {
    const sections: Array<{ title: string; content: string; sourceReference?: string }> = [];
    
    // Parse based on format
    if (format === 'outline') {
      const romanNumeralRegex = /^(I{1,3}V?|IV|V|VI{0,3}|IX|X)\.\s+(.+)$/gm;
      const matches = content.matchAll(romanNumeralRegex);
      
      for (const match of matches) {
        sections.push({
          title: match[2],
          content: match[0]
        });
      }
    } else if (format === 'cornell') {
      const notesSection = content.match(/\*\*\[NOTES SECTION\]\*\*([\s\S]*?)\*\*\[CUE COLUMN\]\*\*/);
      const cueSection = content.match(/\*\*\[CUE COLUMN\]\*\*([\s\S]*?)\*\*\[SUMMARY SECTION\]\*\*/);
      const summarySection = content.match(/\*\*\[SUMMARY SECTION\]\*\*([\s\S]*?)$/);
      
      if (notesSection) sections.push({ title: 'Main Notes', content: notesSection[1].trim() });
      if (cueSection) sections.push({ title: 'Cue Column', content: cueSection[1].trim() });
      if (summarySection) sections.push({ title: 'Summary', content: summarySection[1].trim() });
    }
    
    return sections;
  }

  private static extractKeyPoints(content: string): string[] {
    const bulletRegex = /^[•○▪→]\s+(.+)$/gm;
    const points: string[] = [];
    const matches = content.matchAll(bulletRegex);
    
    for (const match of matches) {
      if (match[1] && match[1].length > 10) {
        points.push(match[1]);
      }
    }
    
    return points.slice(0, 10); // Limit to top 10 points
  }

  private static async generateReviewQuestions(
    chunks: DocumentChunk[],
    options: GenerationOptions
  ): Promise<string[]> {
    const combinedContent = chunks.map(chunk => chunk.content).join('\n\n');
    const difficulty = options.difficulty || 'medium';
    
    const prompt = `Generate 5-8 review questions for this content at ${difficulty} difficulty level. 
Return as JSON array of strings.

Content: ${combinedContent.substring(0, 1500)}...`;

    try {
      const response = await createChatCompletion([
        { role: 'system', content: 'Generate review questions and return only a JSON array of strings.' },
        { role: 'user', content: prompt }
      ], { max_tokens: 300, temperature: 0.4 });

      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating review questions:', error);
      return [];
    }
  }

  private static calculateTokensUsed(outputs: string[], input: string): number {
    const outputTokens = outputs.reduce((sum, output) => sum + this.estimateTokens(output), 0);
    const inputTokens = this.estimateTokens(input);
    return inputTokens + outputTokens;
  }

  private static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
} 