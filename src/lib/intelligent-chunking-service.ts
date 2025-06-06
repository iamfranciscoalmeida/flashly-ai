export interface ChunkingOptions {
  maxTokensPerChunk: number;
  overlapTokens: number;
  preserveStructure: boolean;
  chunkingStrategy: 'semantic' | 'structural' | 'hybrid';
}

export interface DocumentChunk {
  id: string;
  content: string;
  startPage?: number;
  endPage?: number;
  tokenCount: number;
  semanticWeight: number;
  chunkType: 'header' | 'paragraph' | 'list' | 'formula' | 'example';
  references: string[];
}

export interface ChunkingResult {
  chunks: DocumentChunk[];
  strategy: string;
  totalTokens: number;
  requiresUserInput: boolean;
  suggestedSections?: Array<{
    title: string;
    startPage: number;
    endPage: number;
    tokenCount: number;
  }>;
}

export class IntelligentChunkingService {
  private static readonly MAX_TOKENS_THRESHOLD = 8000;
  private static readonly CHUNK_SIZE_LARGE = 4000;
  private static readonly CHUNK_SIZE_MEDIUM = 2000;
  private static readonly CHUNK_OVERLAP = 200;

  static async analyzeAndChunk(
    content: string,
    options: Partial<ChunkingOptions> = {}
  ): Promise<ChunkingResult> {
    const config: ChunkingOptions = {
      maxTokensPerChunk: this.CHUNK_SIZE_LARGE,
      overlapTokens: this.CHUNK_OVERLAP,
      preserveStructure: true,
      chunkingStrategy: 'hybrid',
      ...options
    };

    const totalTokens = this.estimateTokenCount(content);
    console.log(`📊 Document analysis: ${totalTokens} tokens`);

    // If content is manageable, return as single chunk
    if (totalTokens <= this.MAX_TOKENS_THRESHOLD) {
      return {
        chunks: [{
          id: 'single-chunk',
          content,
          tokenCount: totalTokens,
          semanticWeight: 1.0,
          chunkType: 'paragraph',
          references: []
        }],
        strategy: 'single',
        totalTokens,
        requiresUserInput: false
      };
    }

    // Analyze document structure
    const structure = this.analyzeDocumentStructure(content);
    
    // If clear sections exist, suggest user selection
    if (structure.sections.length > 1 && structure.hasTableOfContents) {
      return {
        chunks: [],
        strategy: 'user-selection',
        totalTokens,
        requiresUserInput: true,
        suggestedSections: structure.sections.map(section => ({
          title: section.title,
          startPage: section.startPage || 1,
          endPage: section.endPage || 1,
          tokenCount: this.estimateTokenCount(section.content)
        }))
      };
    }

    // Auto-chunk using hybrid strategy
    const chunks = await this.performHybridChunking(content, config);
    
    return {
      chunks,
      strategy: 'auto-hybrid',
      totalTokens,
      requiresUserInput: false
    };
  }

  private static analyzeDocumentStructure(content: string) {
    const sections: Array<{
      title: string;
      content: string;
      startPage?: number;
      endPage?: number;
    }> = [];

    // Look for clear section markers
    const sectionPatterns = [
      /^#{1,3}\s+(.+)$/gm, // Markdown headers
      /^(\d+\.?\d*)\s+([A-Z][^\n]+)$/gm, // Numbered sections
      /^([A-Z][A-Z\s]+)\s*$/gm, // ALL CAPS headers
      /^(Chapter|Section|Part)\s+\d+[:\-\s]+(.+)$/gmi
    ];

    let hasTableOfContents = false;
    if (content.toLowerCase().includes('table of contents') || 
        content.toLowerCase().includes('contents')) {
      hasTableOfContents = true;
    }

    // Extract sections using patterns
    for (const pattern of sectionPatterns) {
      const matches = Array.from(content.matchAll(pattern));
      if (matches.length > 2) { // At least 3 sections for meaningful structure
        // Extract content between headers
        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const nextMatch = matches[i + 1];
          
          const startIndex = match.index || 0;
          const endIndex = nextMatch ? nextMatch.index : content.length;
          
          sections.push({
            title: match[1] || match[2] || 'Section',
            content: content.slice(startIndex, endIndex).trim()
          });
        }
        break; // Use first successful pattern
      }
    }

    return { sections, hasTableOfContents };
  }

  private static async performHybridChunking(
    content: string,
    config: ChunkingOptions
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    
    // Split by natural boundaries first
    const paragraphs = content.split(/\n\s*\n/);
    let currentChunk = '';
    let chunkId = 0;
    
    for (const paragraph of paragraphs) {
      const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;
      const tokenCount = this.estimateTokenCount(potentialChunk);
      
      if (tokenCount > config.maxTokensPerChunk && currentChunk) {
        // Save current chunk
        chunks.push({
          id: `chunk-${chunkId++}`,
          content: currentChunk,
          tokenCount: this.estimateTokenCount(currentChunk),
          semanticWeight: this.calculateSemanticWeight(currentChunk),
          chunkType: this.determineChunkType(currentChunk),
          references: this.extractReferences(currentChunk)
        });
        
        // Start new chunk with overlap
        const overlap = this.extractOverlap(currentChunk, config.overlapTokens);
        currentChunk = overlap + paragraph;
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    // Add final chunk
    if (currentChunk) {
      chunks.push({
        id: `chunk-${chunkId}`,
        content: currentChunk,
        tokenCount: this.estimateTokenCount(currentChunk),
        semanticWeight: this.calculateSemanticWeight(currentChunk),
        chunkType: this.determineChunkType(currentChunk),
        references: this.extractReferences(currentChunk)
      });
    }
    
    return chunks;
  }

  private static estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private static calculateSemanticWeight(content: string): number {
    // Higher weight for content with definitions, formulas, examples
    let weight = 0.5;
    
    const importantPatterns = [
      /definition[s]?[:\-\s]/gi,
      /formula[s]?[:\-\s]/gi,
      /theorem[s]?[:\-\s]/gi,
      /example[s]?[:\-\s]/gi,
      /principle[s]?[:\-\s]/gi,
      /key point[s]?[:\-\s]/gi
    ];
    
    for (const pattern of importantPatterns) {
      if (pattern.test(content)) {
        weight += 0.1;
      }
    }
    
    return Math.min(weight, 1.0);
  }

  private static determineChunkType(content: string): DocumentChunk['chunkType'] {
    if (/^#{1,6}\s/.test(content) || /^[A-Z][A-Z\s]+$/.test(content.trim().split('\n')[0])) {
      return 'header';
    }
    if (/^\s*[\-\*\+]\s/.test(content) || /^\s*\d+\.\s/.test(content)) {
      return 'list';
    }
    if (/[=∑∫∂∆√±×÷∞∈∉⊂⊃∪∩]/.test(content) || /\$.*\$/.test(content)) {
      return 'formula';
    }
    if (/example[s]?[:\-\s]/gi.test(content)) {
      return 'example';
    }
    return 'paragraph';
  }

  private static extractReferences(content: string): string[] {
    const references: string[] = [];
    
    // Extract page references
    const pageRefs = content.match(/page\s+\d+/gi);
    if (pageRefs) references.push(...pageRefs);
    
    // Extract figure/table references
    const figRefs = content.match(/figure\s+\d+\.?\d*/gi);
    if (figRefs) references.push(...figRefs);
    
    const tableRefs = content.match(/table\s+\d+\.?\d*/gi);
    if (tableRefs) references.push(...tableRefs);
    
    return references;
  }

  private static extractOverlap(content: string, overlapTokens: number): string {
    const sentences = content.split(/[.!?]+/);
    let overlap = '';
    let tokenCount = 0;
    
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentence = sentences[i] + '.';
      const sentenceTokens = this.estimateTokenCount(sentence);
      
      if (tokenCount + sentenceTokens <= overlapTokens) {
        overlap = sentence + ' ' + overlap;
        tokenCount += sentenceTokens;
      } else {
        break;
      }
    }
    
    return overlap.trim();
  }
} 