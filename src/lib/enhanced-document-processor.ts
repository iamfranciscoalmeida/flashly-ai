import { IntelligentChunkingService, DocumentChunk } from './intelligent-chunking-service';
import { createChatCompletion } from './openai-config';

export interface DocumentAnalysis {
  totalTokens: number;
  requiresChunking: boolean;
  suggestedSections?: Array<{
    title: string;
    startPage?: number;
    endPage?: number;
    tokenCount: number;
    excerpt: string;
  }>;
  processingStrategy: 'single' | 'user-selection' | 'auto-chunk' | 'hybrid';
}

export interface ProcessingOptions {
  forceStrategy?: 'single' | 'chunked' | 'user-selection';
  selectedSections?: Array<{
    title: string;
    content: string;
    startPage?: number;
    endPage?: number;
  }>;
  maxTokensPerChunk?: number;
  preserveStructure?: boolean;
}

export class EnhancedDocumentProcessor {
  private static readonly TOKEN_LIMITS = {
    SINGLE_PROCESSING: 8000,    // Process as single document
    USER_SELECTION_THRESHOLD: 15000,  // Suggest user selection
    AUTO_CHUNK_THRESHOLD: 25000      // Auto-chunk if no structure
  };

  /**
   * Analyze document and determine optimal processing strategy
   */
  static async analyzeDocument(content: string): Promise<DocumentAnalysis> {
    console.log('🔍 Analyzing document structure and length...');
    
    const totalTokens = this.estimateTokens(content);
    
    // Small documents - process as single
    if (totalTokens <= this.TOKEN_LIMITS.SINGLE_PROCESSING) {
      return {
        totalTokens,
        requiresChunking: false,
        processingStrategy: 'single'
      };
    }

    // Analyze document structure for sections
    const structureAnalysis = await this.analyzeDocumentStructure(content);
    
    // Medium documents with clear structure - suggest user selection
    if (totalTokens <= this.TOKEN_LIMITS.USER_SELECTION_THRESHOLD && 
        structureAnalysis.hasStructure) {
      return {
        totalTokens,
        requiresChunking: true,
        suggestedSections: structureAnalysis.sections,
        processingStrategy: 'user-selection'
      };
    }

    // Large documents - use hybrid approach
    return {
      totalTokens,
      requiresChunking: true,
      suggestedSections: structureAnalysis.sections,
      processingStrategy: structureAnalysis.hasStructure ? 'hybrid' : 'auto-chunk'
    };
  }

  /**
   * Process document based on analysis and user preferences
   */
  static async processDocument(
    content: string, 
    analysis: DocumentAnalysis,
    options: ProcessingOptions = {}
  ): Promise<{
    chunks: DocumentChunk[];
    strategy: string;
    userInputRequired: boolean;
    metadata: Record<string, any>;
  }> {
    const strategy = options.forceStrategy || analysis.processingStrategy;
    
    switch (strategy) {
      case 'single':
        return this.processSingleDocument(content);
        
      case 'user-selection':
        if (!options.selectedSections) {
          return {
            chunks: [],
            strategy: 'user-selection',
            userInputRequired: true,
            metadata: {
              suggestedSections: analysis.suggestedSections,
              totalTokens: analysis.totalTokens
            }
          };
        }
        return this.processSelectedSections(options.selectedSections);
        
      case 'auto-chunk':
        return this.processWithAutoChunking(content, options);
        
      case 'hybrid':
        return this.processWithHybridStrategy(content, analysis, options);
        
      default:
        throw new Error(`Unknown processing strategy: ${strategy}`);
    }
  }

  private static async analyzeDocumentStructure(content: string) {
    // Use AI to analyze document structure
    const prompt = `Analyze the following document and identify its major sections. Look for:
1. Clear section headers or chapter titles
2. Table of contents
3. Natural break points
4. Topic transitions

Return a JSON object with:
{
  "hasStructure": boolean,
  "sections": [
    {
      "title": "Section title",
      "excerpt": "First 200 characters of section",
      "startIndex": number,
      "endIndex": number,
      "tokenCount": estimated_tokens
    }
  ]
}

Document preview (first 3000 characters):
${content.substring(0, 3000)}...`;

    try {
      const response = await createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert document analyzer. Return only valid JSON.'
        },
        { role: 'user', content: prompt }
      ], {
        max_tokens: 1000,
        temperature: 0.1
      });

      const analysis = JSON.parse(response);
      
      // Convert to our format
      const sections = analysis.sections?.map((section: any) => ({
        title: section.title,
        excerpt: section.excerpt,
        tokenCount: section.tokenCount || this.estimateTokens(
          content.substring(section.startIndex, section.endIndex)
        ),
        startPage: Math.floor((section.startIndex / content.length) * 100) + 1,
        endPage: Math.floor((section.endIndex / content.length) * 100) + 1
      })) || [];

      return {
        hasStructure: analysis.hasStructure && sections.length > 1,
        sections
      };
    } catch (error) {
      console.error('Error analyzing document structure:', error);
      return { hasStructure: false, sections: [] };
    }
  }

  private static async processSingleDocument(content: string) {
    return {
      chunks: [{
        id: 'single-doc',
        content,
        tokenCount: this.estimateTokens(content),
        semanticWeight: 1.0,
        chunkType: 'paragraph' as const,
        references: []
      }],
      strategy: 'single',
      userInputRequired: false,
      metadata: { processingTime: Date.now() }
    };
  }

  private static async processSelectedSections(
    selectedSections: Array<{ title: string; content: string; startPage?: number; endPage?: number }>
  ) {
    const chunks = selectedSections.map((section, index) => ({
      id: `section-${index}`,
      content: section.content,
      tokenCount: this.estimateTokens(section.content),
      semanticWeight: 1.0,
      chunkType: 'paragraph' as const,
      references: [`${section.title} (Page ${section.startPage || 'N/A'})`],
      startPage: section.startPage,
      endPage: section.endPage
    }));

    return {
      chunks,
      strategy: 'user-selection',
      userInputRequired: false,
      metadata: { 
        sectionsProcessed: selectedSections.length,
        sectionTitles: selectedSections.map(s => s.title)
      }
    };
  }

  private static async processWithAutoChunking(content: string, options: ProcessingOptions) {
    const chunkingResult = await IntelligentChunkingService.analyzeAndChunk(content, {
      maxTokensPerChunk: options.maxTokensPerChunk || 4000,
      overlapTokens: 200,
      preserveStructure: options.preserveStructure ?? true,
      chunkingStrategy: 'hybrid'
    });

    return {
      chunks: chunkingResult.chunks,
      strategy: 'auto-chunk',
      userInputRequired: false,
      metadata: {
        totalChunks: chunkingResult.chunks.length,
        totalTokens: chunkingResult.totalTokens
      }
    };
  }

  private static async processWithHybridStrategy(
    content: string, 
    analysis: DocumentAnalysis, 
    options: ProcessingOptions
  ) {
    // If user provided sections, use them; otherwise auto-chunk
    if (options.selectedSections && options.selectedSections.length > 0) {
      return this.processSelectedSections(options.selectedSections);
    }

    // Auto-chunk but preserve section boundaries if possible
    return this.processWithAutoChunking(content, {
      ...options,
      preserveStructure: true
    });
  }

  private static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
} 