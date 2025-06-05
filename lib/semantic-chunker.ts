import { encode } from 'gpt-3-encoder';

export interface SmartChunk {
  id: string;
  content: string;
  tokens: number;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  chapter: string;
  section: string;
  subsection?: string;
  concepts: string[];
  precedingContext: string;
  followingContext: string;
  structuralLevel: 'chapter' | 'section' | 'subsection' | 'paragraph';
  pageNumbers: number[];
  figures: string[];
  equations: string[];
  semanticDensity: number;
  contentType: 'narrative' | 'technical' | 'mathematical' | 'code' | 'mixed';
}

export interface ChunkingOptions {
  maxTokens?: number;
  overlapTokens?: number;
  minSemanticUnit?: 'sentence' | 'paragraph' | 'section';
  preserveBoundaries?: boolean;
  adaptiveChunkSize?: boolean;
  contextWindowSize?: number;
}

interface TextSegment {
  content: string;
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'equation' | 'table';
  level?: number;
  metadata?: any;
}

export class SemanticChunker {
  private readonly defaultOptions: Required<ChunkingOptions> = {
    maxTokens: 1500,
    overlapTokens: 200,
    minSemanticUnit: 'paragraph',
    preserveBoundaries: true,
    adaptiveChunkSize: true,
    contextWindowSize: 100
  };

  async chunkDocument(
    text: string,
    documentMetadata: any,
    options: ChunkingOptions = {}
  ): Promise<SmartChunk[]> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Parse text into semantic segments
    const segments = this.parseTextSegments(text);
    
    // Analyze content to determine optimal chunking strategy
    const contentAnalysis = this.analyzeContent(segments);
    
    // Create chunks based on semantic boundaries
    const rawChunks = await this.createSemanticChunks(
      segments,
      contentAnalysis,
      opts
    );
    
    // Enhance chunks with metadata and context
    const enhancedChunks = await this.enhanceChunks(
      rawChunks,
      documentMetadata,
      opts
    );
    
    // Add inter-chunk relationships
    return this.addChunkRelationships(enhancedChunks);
  }

  private parseTextSegments(text: string): TextSegment[] {
    const segments: TextSegment[] = [];
    const lines = text.split('\n');
    let currentSegment: TextSegment | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Detect headings
      if (this.isHeading(trimmedLine)) {
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = {
          content: trimmedLine,
          type: 'heading',
          level: this.getHeadingLevel(trimmedLine)
        };
      }
      // Detect code blocks
      else if (trimmedLine.startsWith('```')) {
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = {
          content: trimmedLine,
          type: 'code',
          metadata: { language: trimmedLine.slice(3).trim() }
        };
      }
      // Detect equations (LaTeX style)
      else if (trimmedLine.startsWith('$$') || trimmedLine.startsWith('\\[')) {
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = {
          content: trimmedLine,
          type: 'equation'
        };
      }
      // Detect list items
      else if (this.isListItem(trimmedLine)) {
        if (currentSegment?.type !== 'list') {
          if (currentSegment) {
            segments.push(currentSegment);
          }
          currentSegment = {
            content: trimmedLine,
            type: 'list'
          };
        } else {
          currentSegment.content += '\n' + trimmedLine;
        }
      }
      // Regular paragraph
      else if (trimmedLine.length > 0) {
        if (currentSegment?.type !== 'paragraph') {
          if (currentSegment) {
            segments.push(currentSegment);
          }
          currentSegment = {
            content: trimmedLine,
            type: 'paragraph'
          };
        } else {
          currentSegment.content += ' ' + trimmedLine;
        }
      }
      // Empty line - end current segment
      else if (currentSegment) {
        segments.push(currentSegment);
        currentSegment = null;
      }
    }

    // Don't forget the last segment
    if (currentSegment) {
      segments.push(currentSegment);
    }

    return segments;
  }

  private isHeading(line: string): boolean {
    return (
      /^#{1,6}\s/.test(line) || // Markdown headings
      /^(Chapter|Section|Part)\s+\d+/i.test(line) || // Chapter headings
      /^\d+\.\d*\s+[A-Z]/.test(line) || // Numbered sections
      /^[A-Z][A-Z\s]+$/.test(line) && line.length < 50 // All caps titles
    );
  }

  private getHeadingLevel(line: string): number {
    const match = line.match(/^#{1,6}/);
    if (match) return match[0].length;
    
    if (/^(Chapter|Part)/i.test(line)) return 1;
    if (/^(Section|\d+\.)\s/i.test(line)) return 2;
    if (/^\d+\.\d+\s/.test(line)) return 3;
    
    return 2; // Default for other headings
  }

  private isListItem(line: string): boolean {
    return /^[\-\*\+]\s/.test(line) || /^\d+\.\s/.test(line);
  }

  private analyzeContent(segments: TextSegment[]): ContentAnalysis {
    const analysis: ContentAnalysis = {
      totalTokens: 0,
      averageSegmentTokens: 0,
      contentTypes: new Map(),
      semanticDensity: 0,
      hasCode: false,
      hasMath: false,
      hasTables: false,
      headingStructure: []
    };

    let totalTokens = 0;
    for (const segment of segments) {
      const tokens = this.countTokens(segment.content);
      totalTokens += tokens;
      
      const count = analysis.contentTypes.get(segment.type) || 0;
      analysis.contentTypes.set(segment.type, count + 1);
      
      if (segment.type === 'code') analysis.hasCode = true;
      if (segment.type === 'equation') analysis.hasMath = true;
      if (segment.type === 'table') analysis.hasTables = true;
      if (segment.type === 'heading') {
        analysis.headingStructure.push({
          level: segment.level || 2,
          title: segment.content
        });
      }
    }

    analysis.totalTokens = totalTokens;
    analysis.averageSegmentTokens = totalTokens / segments.length;
    analysis.semanticDensity = this.calculateSemanticDensity(segments);

    return analysis;
  }

  private calculateSemanticDensity(segments: TextSegment[]): number {
    // Simple heuristic: ratio of technical/complex content to total
    const technicalSegments = segments.filter(s => 
      s.type === 'code' || 
      s.type === 'equation' || 
      s.type === 'table' ||
      (s.type === 'paragraph' && this.isTechnicalContent(s.content))
    ).length;
    
    return technicalSegments / segments.length;
  }

  private isTechnicalContent(text: string): boolean {
    // Check for technical indicators
    const technicalPatterns = [
      /\b(algorithm|function|variable|parameter|equation)\b/i,
      /\b(theorem|proof|lemma|corollary)\b/i,
      /\b(def|class|interface|struct)\b/,
      /[A-Z]\(\w+\)/, // Function notation
      /\w+\s*=\s*\w+/, // Assignment
      /\d+\s*[+\-*/]\s*\d+/ // Math operations
    ];
    
    return technicalPatterns.some(pattern => pattern.test(text));
  }

  private async createSemanticChunks(
    segments: TextSegment[],
    analysis: ContentAnalysis,
    options: Required<ChunkingOptions>
  ): Promise<RawChunk[]> {
    const chunks: RawChunk[] = [];
    let currentChunk: RawChunk = {
      segments: [],
      tokens: 0,
      startIndex: 0,
      endIndex: 0
    };

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentTokens = this.countTokens(segment.content);
      
      // Determine if we should start a new chunk
      const shouldBreak = this.shouldBreakChunk(
        currentChunk,
        segment,
        segmentTokens,
        analysis,
        options
      );
      
      if (shouldBreak && currentChunk.segments.length > 0) {
        chunks.push(currentChunk);
        
        // Create overlap with previous chunk
        const overlap = this.createOverlap(currentChunk, options.overlapTokens);
        currentChunk = {
          segments: overlap,
          tokens: overlap.reduce((sum, s) => sum + this.countTokens(s.content), 0),
          startIndex: i,
          endIndex: i
        };
      }
      
      currentChunk.segments.push(segment);
      currentChunk.tokens += segmentTokens;
      currentChunk.endIndex = i;
    }
    
    // Don't forget the last chunk
    if (currentChunk.segments.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  private shouldBreakChunk(
    currentChunk: RawChunk,
    nextSegment: TextSegment,
    segmentTokens: number,
    analysis: ContentAnalysis,
    options: Required<ChunkingOptions>
  ): boolean {
    // Never break if chunk is too small
    if (currentChunk.tokens < options.overlapTokens * 2) {
      return false;
    }
    
    // Determine max tokens based on content type
    let maxTokens = options.maxTokens;
    if (options.adaptiveChunkSize) {
      maxTokens = this.getAdaptiveChunkSize(
        nextSegment,
        analysis,
        options.maxTokens
      );
    }
    
    // Would exceed token limit?
    if (currentChunk.tokens + segmentTokens > maxTokens) {
      return true;
    }
    
    // Preserve semantic boundaries
    if (options.preserveBoundaries) {
      // Always break on chapter headings
      if (nextSegment.type === 'heading' && nextSegment.level === 1) {
        return true;
      }
      
      // Break on section headings if chunk is reasonably sized
      if (nextSegment.type === 'heading' && 
          nextSegment.level === 2 && 
          currentChunk.tokens > maxTokens * 0.5) {
        return true;
      }
    }
    
    return false;
  }

  private getAdaptiveChunkSize(
    segment: TextSegment,
    analysis: ContentAnalysis,
    baseMaxTokens: number
  ): number {
    // Dense technical content needs smaller chunks
    if (segment.type === 'code' || segment.type === 'equation') {
      return Math.floor(baseMaxTokens * 0.7);
    }
    
    // High semantic density overall
    if (analysis.semanticDensity > 0.6) {
      return Math.floor(baseMaxTokens * 0.8);
    }
    
    // Narrative content can use larger chunks
    if (segment.type === 'paragraph' && !this.isTechnicalContent(segment.content)) {
      return Math.floor(baseMaxTokens * 1.2);
    }
    
    return baseMaxTokens;
  }

  private createOverlap(chunk: RawChunk, overlapTokens: number): TextSegment[] {
    const overlap: TextSegment[] = [];
    let tokens = 0;
    
    // Work backwards from the end of the chunk
    for (let i = chunk.segments.length - 1; i >= 0 && tokens < overlapTokens; i--) {
      const segment = chunk.segments[i];
      overlap.unshift(segment);
      tokens += this.countTokens(segment.content);
    }
    
    return overlap;
  }

  private async enhanceChunks(
    rawChunks: RawChunk[],
    documentMetadata: any,
    options: Required<ChunkingOptions>
  ): Promise<SmartChunk[]> {
    const enhancedChunks: SmartChunk[] = [];
    
    for (let i = 0; i < rawChunks.length; i++) {
      const rawChunk = rawChunks[i];
      const content = rawChunk.segments.map(s => s.content).join('\n\n');
      
      // Extract concepts from chunk
      const concepts = await this.extractConcepts(content);
      
      // Generate context summaries
      const precedingContext = i > 0 
        ? await this.generateContextSummary(rawChunks[i - 1], options.contextWindowSize)
        : 'Beginning of document';
        
      const followingContext = i < rawChunks.length - 1
        ? await this.generateContextSummary(rawChunks[i + 1], options.contextWindowSize)
        : 'End of document';
      
      // Determine content type
      const contentType = this.determineContentType(rawChunk.segments);
      
      // Determine structural level
      const structuralLevel = this.determineStructuralLevel(rawChunk.segments);
      
      const smartChunk: SmartChunk = {
        id: `chunk-${i}`,
        content,
        tokens: rawChunk.tokens,
        metadata: {
          chapter: documentMetadata.currentChapter || 'Unknown',
          section: documentMetadata.currentSection || 'Unknown',
          concepts,
          precedingContext,
          followingContext,
          structuralLevel,
          pageNumbers: documentMetadata.pageNumbers || [],
          figures: this.extractFigureReferences(content),
          equations: this.extractEquationReferences(content),
          semanticDensity: this.calculateChunkSemanticDensity(rawChunk.segments),
          contentType
        }
      };
      
      enhancedChunks.push(smartChunk);
    }
    
    return enhancedChunks;
  }

  private async extractConcepts(text: string): Promise<string[]> {
    const concepts = new Set<string>();
    
    // Pattern-based extraction
    const patterns = [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+is\s+(?:a|an|the)/g,
      /\bdefine[sd]?\s+(?:as\s+)?([a-z]+(?:\s+[a-z]+)*)/gi,
      /\b(?:concept|term|notion)\s+of\s+([a-z]+(?:\s+[a-z]+)*)/gi,
      /\b([a-z]+(?:\s+[a-z]+)*)\s+(?:refers?\s+to|means?|denotes?)/gi
    ];
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 3 && match[1].length < 50) {
          concepts.add(match[1].toLowerCase().trim());
        }
      }
    }
    
    // Also look for capitalized terms that appear multiple times
    const words = text.split(/\s+/);
    const termFrequency = new Map<string, number>();
    
    for (const word of words) {
      if (/^[A-Z][a-z]+$/.test(word) && word.length > 4) {
        const lower = word.toLowerCase();
        termFrequency.set(lower, (termFrequency.get(lower) || 0) + 1);
      }
    }
    
    // Add frequently mentioned capitalized terms
    for (const [term, freq] of termFrequency) {
      if (freq >= 3) {
        concepts.add(term);
      }
    }
    
    return Array.from(concepts).slice(0, 15); // Limit to top 15 concepts
  }

  private async generateContextSummary(
    chunk: RawChunk,
    maxTokens: number
  ): Promise<string> {
    // Simple implementation - in production, you might use GPT for this
    const content = chunk.segments.map(s => s.content).join(' ');
    const words = content.split(/\s+/);
    const targetWords = Math.floor(maxTokens * 0.75); // Rough approximation
    
    if (words.length <= targetWords) {
      return content;
    }
    
    // Extract key sentences
    const sentences = content.split(/[.!?]+/);
    let summary = '';
    let wordCount = 0;
    
    for (const sentence of sentences) {
      const sentenceWords = sentence.trim().split(/\s+/).length;
      if (wordCount + sentenceWords <= targetWords) {
        summary += sentence.trim() + '. ';
        wordCount += sentenceWords;
      } else {
        break;
      }
    }
    
    return summary.trim() || content.substring(0, targetWords * 4) + '...';
  }

  private determineContentType(segments: TextSegment[]): ChunkMetadata['contentType'] {
    const typeCounts = new Map<string, number>();
    
    for (const segment of segments) {
      const count = typeCounts.get(segment.type) || 0;
      typeCounts.set(segment.type, count + 1);
    }
    
    // Check for dominant type
    const totalSegments = segments.length;
    
    if ((typeCounts.get('code') || 0) / totalSegments > 0.5) {
      return 'code';
    }
    if ((typeCounts.get('equation') || 0) / totalSegments > 0.3) {
      return 'mathematical';
    }
    
    // Check paragraph content
    const paragraphs = segments.filter(s => s.type === 'paragraph');
    const technicalParagraphs = paragraphs.filter(p => 
      this.isTechnicalContent(p.content)
    ).length;
    
    if (technicalParagraphs / paragraphs.length > 0.6) {
      return 'technical';
    }
    
    if (typeCounts.size > 3) {
      return 'mixed';
    }
    
    return 'narrative';
  }

  private determineStructuralLevel(segments: TextSegment[]): ChunkMetadata['structuralLevel'] {
    // Find the highest level heading in the chunk
    const headings = segments.filter(s => s.type === 'heading');
    
    if (headings.length === 0) {
      return 'paragraph';
    }
    
    const minLevel = Math.min(...headings.map(h => h.level || 3));
    
    if (minLevel === 1) return 'chapter';
    if (minLevel === 2) return 'section';
    if (minLevel === 3) return 'subsection';
    
    return 'paragraph';
  }

  private extractFigureReferences(text: string): string[] {
    const figures: string[] = [];
    const patterns = [
      /\bFig(?:ure)?\.?\s*(\d+(?:\.\d+)?)/gi,
      /\b(?:see|refer to|shown in)\s+Fig(?:ure)?\.?\s*(\d+(?:\.\d+)?)/gi
    ];
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          figures.push(`Figure ${match[1]}`);
        }
      }
    }
    
    return [...new Set(figures)];
  }

  private extractEquationReferences(text: string): string[] {
    const equations: string[] = [];
    const patterns = [
      /\bEq(?:uation)?\.?\s*\(?(\d+(?:\.\d+)?)\)?/gi,
      /\(\s*(\d+(?:\.\d+)?)\s*\)(?:\s*(?:shows?|gives?|defines?))/gi
    ];
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          equations.push(`Equation ${match[1]}`);
        }
      }
    }
    
    return [...new Set(equations)];
  }

  private calculateChunkSemanticDensity(segments: TextSegment[]): number {
    let densityScore = 0;
    let totalWeight = 0;
    
    for (const segment of segments) {
      let weight = 1;
      let density = 0;
      
      switch (segment.type) {
        case 'code':
          density = 0.9;
          weight = 1.5;
          break;
        case 'equation':
          density = 0.85;
          weight = 1.3;
          break;
        case 'heading':
          density = 0.3;
          weight = 0.5;
          break;
        case 'paragraph':
          density = this.isTechnicalContent(segment.content) ? 0.7 : 0.4;
          weight = 1;
          break;
        default:
          density = 0.5;
          weight = 1;
      }
      
      densityScore += density * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? densityScore / totalWeight : 0.5;
  }

  private addChunkRelationships(chunks: SmartChunk[]): SmartChunk[] {
    // Add references to related chunks based on concepts
    const conceptMap = new Map<string, string[]>();
    
    // Build concept index
    for (const chunk of chunks) {
      for (const concept of chunk.metadata.concepts) {
        if (!conceptMap.has(concept)) {
          conceptMap.set(concept, []);
        }
        conceptMap.get(concept)!.push(chunk.id);
      }
    }
    
    // Add related chunks to metadata
    for (const chunk of chunks) {
      const relatedChunks = new Set<string>();
      
      for (const concept of chunk.metadata.concepts) {
        const related = conceptMap.get(concept) || [];
        related.forEach(id => {
          if (id !== chunk.id) {
            relatedChunks.add(id);
          }
        });
      }
      
      // Add to metadata
      (chunk.metadata as any).relatedChunks = Array.from(relatedChunks);
    }
    
    return chunks;
  }

  private countTokens(text: string): number {
    // Using gpt-3-encoder for accurate token counting
    try {
      return encode(text).length;
    } catch (error) {
      // Fallback to rough estimation
      return Math.ceil(text.length / 4);
    }
  }
}

// Helper interfaces
interface ContentAnalysis {
  totalTokens: number;
  averageSegmentTokens: number;
  contentTypes: Map<string, number>;
  semanticDensity: number;
  hasCode: boolean;
  hasMath: boolean;
  hasTables: boolean;
  headingStructure: Array<{ level: number; title: string }>;
}

interface RawChunk {
  segments: TextSegment[];
  tokens: number;
  startIndex: number;
  endIndex: number;
}