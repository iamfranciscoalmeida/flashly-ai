import { createChatCompletion } from './openai-config';
import { IntelligentChunkingService, DocumentChunk } from './intelligent-chunking-service';

export type SummaryTier = 'tldr' | 'detailed' | 'exam-ready';
export type NotesFormat = 'outline' | 'cornell' | 'mindmap' | 'bullet';

export interface TieredSummaryResult {
  tldr: string;
  detailed: string;
  examReady: string;
  sourceReferences: string[];
  keyTerms: string[];
  estimatedReadTime: number;
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
}

export interface GenerationOptions {
  tier?: SummaryTier;
  format?: NotesFormat;
  includeReferences?: boolean;
  maxLength?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  customPrompt?: string;
}

export class EnhancedAIService {
  
  /**
   * Generate tiered summaries with different levels of detail
   */
  static async generateTieredSummary(
    content: string,
    options: GenerationOptions = {}
  ): Promise<TieredSummaryResult> {
    console.log('🧠 Generating tiered summary...');
    
    // Analyze and chunk content if needed
    const chunkingResult = await IntelligentChunkingService.analyzeAndChunk(content);
    
    if (chunkingResult.requiresUserInput) {
      throw new Error('Content requires user section selection. Please specify sections to summarize.');
    }
    
    // Generate summaries for each tier
    const [tldr, detailed, examReady] = await Promise.all([
      this.generateSummaryByTier(chunkingResult.chunks, 'tldr', options),
      this.generateSummaryByTier(chunkingResult.chunks, 'detailed', options),
      this.generateSummaryByTier(chunkingResult.chunks, 'exam-ready', options)
    ]);
    
    // Extract key terms and references
    const keyTerms = this.extractKeyTerms(content);
    const sourceReferences = this.extractSourceReferences(chunkingResult.chunks);
    const estimatedReadTime = Math.ceil(content.split(' ').length / 200); // 200 WPM average
    
    return {
      tldr,
      detailed,
      examReady,
      sourceReferences,
      keyTerms,
      estimatedReadTime
    };
  }
  
  /**
   * Generate structured study notes in various formats
   */
  static async generateStructuredNotes(
    content: string,
    format: NotesFormat = 'outline',
    options: GenerationOptions = {}
  ): Promise<StructuredNotesResult> {
    console.log(`📝 Generating ${format} notes...`);
    
    // Analyze and chunk content
    const chunkingResult = await IntelligentChunkingService.analyzeAndChunk(content);
    
    if (chunkingResult.requiresUserInput) {
      throw new Error('Content requires user section selection. Please specify sections for note generation.');
    }
    
    const formatInstructions = this.getFormatInstructions(format);
    const structuredContent = await this.generateNotesWithFormat(
      chunkingResult.chunks, 
      formatInstructions, 
      options
    );
    
    // Extract sections and key points
    const sections = this.parseNotesIntoSections(structuredContent, format);
    const keyPoints = this.extractKeyPoints(structuredContent);
    const reviewQuestions = await this.generateReviewQuestions(chunkingResult.chunks, options);
    
    return {
      content: structuredContent,
      format,
      sections,
      keyPoints,
      reviewQuestions
    };
  }
  
  /**
   * Generate summary for specific tier
   */
  private static async generateSummaryByTier(
    chunks: DocumentChunk[],
    tier: SummaryTier,
    options: GenerationOptions
  ): Promise<string> {
    const tierConfigs = {
      tldr: {
        maxWords: 100,
        style: 'extremely concise, bullet-point style',
        focus: 'absolute essentials only'
      },
      detailed: {
        maxWords: 500,
        style: 'comprehensive but accessible',
        focus: 'key concepts, relationships, and context'
      },
      'exam-ready': {
        maxWords: 800,
        style: 'thorough and examination-focused',
        focus: 'testable concepts, formulas, examples, and critical details'
      }
    };
    
    const config = tierConfigs[tier];
    
    // Prioritize chunks by semantic weight for this tier
    const prioritizedChunks = chunks
      .sort((a, b) => b.semanticWeight - a.semanticWeight)
      .slice(0, tier === 'tldr' ? 2 : tier === 'detailed' ? 4 : chunks.length);
    
    const combinedContent = prioritizedChunks.map(chunk => chunk.content).join('\n\n');
    
    const prompt = `Create a ${tier.toUpperCase()} summary of the following content.

REQUIREMENTS for ${tier.toUpperCase()}:
- Maximum ${config.maxWords} words
- Style: ${config.style}
- Focus: ${config.focus}
- Include source references where applicable
${tier === 'exam-ready' ? '- Include specific formulas, definitions, and examples\n- Organize by testable topics' : ''}

Content:
${combinedContent}

Generate the ${tier} summary now:`;

    const systemPrompt = `You are an expert educational content summarizer specializing in ${tier} summaries. 
Your summaries are known for being ${config.style} and focusing on ${config.focus}.`;
    
    return await createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ], {
      max_tokens: Math.floor(config.maxWords * 1.5),
      temperature: tier === 'tldr' ? 0.3 : 0.5
    });
  }
  
  /**
   * Get format-specific instructions for note generation
   */
  private static getFormatInstructions(format: NotesFormat): string {
    const instructions = {
      outline: `Create a hierarchical outline with:
- Roman numerals (I, II, III) for main topics
- Capital letters (A, B, C) for subtopics
- Numbers (1, 2, 3) for details
- Lowercase letters (a, b, c) for examples`,
      
      cornell: `Format as Cornell Notes with:
- Main notes section (right side): Detailed content
- Cue column (left side): Keywords, questions, prompts
- Summary section (bottom): Key takeaways
Use clear dividers: [CUE] [NOTES] [SUMMARY]`,
      
      mindmap: `Create a text-based mind map with:
- Central topic in the center
- Main branches as primary concepts
- Sub-branches for details
- Use indentation and symbols (→, ●, ▸) for hierarchy`,
      
      bullet: `Use bullet point format with:
- Main points (•)
- Sub-points (○)
- Details (▪)
- Examples (→)
Keep points concise and scannable`
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
    const combinedContent = chunks.map(chunk => chunk.content).join('\n\n');
    
    const prompt = `Create study notes from the following content using the specified format.

FORMAT INSTRUCTIONS:
${formatInstructions}

CONTENT REQUIREMENTS:
- Capture all important information
- Maintain clear visual hierarchy
- Include key terms, formulas, and concepts
- Make it suitable for exam preparation
- Reference source sections where applicable

Content to process:
${combinedContent}

Generate the formatted study notes:`;

    const systemPrompt = `You are an expert educator creating well-structured study notes. 
Focus on clarity, organization, and educational value. Follow the format instructions precisely.`;
    
    return await createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ], {
      max_tokens: 2000,
      temperature: 0.4
    });
  }
  
  /**
   * Parse generated notes into structured sections
   */
  private static parseNotesIntoSections(
    content: string,
    format: NotesFormat
  ): Array<{ title: string; content: string; sourceReference?: string }> {
    const sections: Array<{ title: string; content: string; sourceReference?: string }> = [];
    
    if (format === 'cornell') {
      // Parse Cornell notes format
      const cueMatch = content.match(/\[CUE\]([\s\S]*?)\[NOTES\]/);
      const notesMatch = content.match(/\[NOTES\]([\s\S]*?)\[SUMMARY\]/);
      const summaryMatch = content.match(/\[SUMMARY\]([\s\S]*?)$/);
      
      if (cueMatch) sections.push({ title: 'Cue Column', content: cueMatch[1].trim() });
      if (notesMatch) sections.push({ title: 'Main Notes', content: notesMatch[1].trim() });
      if (summaryMatch) sections.push({ title: 'Summary', content: summaryMatch[1].trim() });
    } else {
      // Parse other formats by looking for headers
      const headerPatterns = [
        /^(I{1,3}|IV|V{1,3}|IX|X{1,3})\.\s+(.+)$/gm, // Roman numerals
        /^#{1,3}\s+(.+)$/gm, // Markdown headers
        /^([A-Z][A-Z\s]+)$/gm, // ALL CAPS
        /^(\d+\.?\d*)\s+([A-Z][^\n]+)$/gm // Numbered sections
      ];
      
      for (const pattern of headerPatterns) {
        const matches = Array.from(content.matchAll(pattern));
        if (matches.length > 0) {
          for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const nextMatch = matches[i + 1];
            
            const startIndex = match.index || 0;
            const endIndex = nextMatch ? nextMatch.index : content.length;
            
            sections.push({
              title: match[2] || match[1] || 'Section',
              content: content.slice(startIndex, endIndex).trim()
            });
          }
          break;
        }
      }
    }
    
    // Fallback: single section
    if (sections.length === 0) {
      sections.push({ title: 'Study Notes', content });
    }
    
    return sections;
  }
  
  /**
   * Extract key terms from content
   */
  private static extractKeyTerms(content: string): string[] {
    const keyTerms: string[] = [];
    
    // Look for defined terms
    const definitionPatterns = [
      /(?:define[sd]?|definition|term):\s*([^.!?]+)/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+is\s+(?:defined\s+as\s+)?/gi,
      /\*\*([^*]+)\*\*/g, // Bold terms
      /_([^_]+)_/g // Italic terms
    ];
    
    for (const pattern of definitionPatterns) {
      const matches = Array.from(content.matchAll(pattern));
      matches.forEach(match => {
        if (match[1]) {
          keyTerms.push(match[1].trim());
        }
      });
    }
    
    return Array.from(new Set(keyTerms)).slice(0, 20); // Unique terms, max 20
  }
  
  /**
   * Extract source references from chunks
   */
  private static extractSourceReferences(chunks: DocumentChunk[]): string[] {
    const references = new Set<string>();
    
    chunks.forEach(chunk => {
      chunk.references.forEach(ref => references.add(ref));
      
      if (chunk.startPage && chunk.endPage) {
        references.add(`Pages ${chunk.startPage}-${chunk.endPage}`);
      }
    });
    
    return Array.from(references);
  }
  
  /**
   * Extract key points from structured content
   */
  private static extractKeyPoints(content: string): string[] {
    const keyPoints: string[] = [];
    
    // Extract bullet points
    const bulletMatches = content.match(/^[\s]*[•○▪→-]\s*(.+)$/gm);
    if (bulletMatches) {
      keyPoints.push(...bulletMatches.map(match => match.replace(/^[\s]*[•○▪→-]\s*/, '').trim()));
    }
    
    // Extract numbered points
    const numberedMatches = content.match(/^\s*\d+\.\s*(.+)$/gm);
    if (numberedMatches) {
      keyPoints.push(...numberedMatches.map(match => match.replace(/^\s*\d+\.\s*/, '').trim()));
    }
    
    return keyPoints.slice(0, 10); // Top 10 key points
  }
  
  /**
   * Generate review questions from content
   */
  private static async generateReviewQuestions(
    chunks: DocumentChunk[],
    options: GenerationOptions
  ): Promise<string[]> {
    const importantChunks = chunks
      .filter(chunk => chunk.semanticWeight > 0.6)
      .slice(0, 3);
    
    if (importantChunks.length === 0) return [];
    
    const combinedContent = importantChunks.map(chunk => chunk.content).join('\n\n');
    
    const prompt = `Generate 5 review questions based on this content. 
Questions should test understanding, not just memorization.
Format as numbered list.

Content:
${combinedContent}

Generate review questions:`;
    
    const response = await createChatCompletion([
      { role: 'system', content: 'You are an expert educator creating review questions that test deep understanding.' },
      { role: 'user', content: prompt }
    ], {
      max_tokens: 500,
      temperature: 0.6
    });
    
    // Parse questions from response
    const questions = response.split('\n')
      .filter(line => /^\d+\.\s/.test(line))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(q => q.length > 10);
    
    return questions;
  }
} 