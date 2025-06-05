import OpenAI from 'openai';

export interface RetrievalOptions {
  topK?: number;
  includeContext?: boolean;
  expansionDepth?: number;
  semanticThreshold?: number;
  hybridSearch?: boolean;
  reranking?: boolean;
}

export interface ExpandedQuery {
  original: string;
  intent: QueryIntent;
  expandedTerms: string[];
  targetSections: string[];
  embeddings: {
    original: number[];
    expanded: number[];
  };
}

export interface QueryIntent {
  type: 'definition' | 'comparison' | 'example' | 'summary' | 'explanation' | 'unknown';
  confidence: number;
  keywords: string[];
}

export interface RelevantContent {
  chunks: EnhancedChunk[];
  concepts: ConceptInfo[];
  totalTokens: number;
  relevanceScore: number;
  metadata: {
    queryIntent: QueryIntent;
    retrievalStrategy: string;
    expansionUsed: boolean;
  };
}

export interface EnhancedChunk {
  id: string;
  content: string;
  tokens: number;
  score: number;
  metadata: any;
  highlights?: string[];
  relatedConcepts?: string[];
}

export interface ConceptInfo {
  term: string;
  definition: string;
  relevance: number;
  sourceChunks: string[];
}

interface VectorStore {
  query(params: {
    vector: number[];
    topK: number;
    filter?: any;
    includeMetadata?: boolean;
  }): Promise<VectorSearchResult[]>;
  
  queryMultiple(params: {
    vectors: number[][];
    topK: number;
    filter?: any;
  }): Promise<VectorSearchResult[][]>;
}

interface VectorSearchResult {
  id: string;
  score: number;
  metadata: any;
}

export class EnhancedRetrieval {
  constructor(
    private vectorStore: VectorStore,
    private openai: OpenAI,
    private documentStructures: Map<string, any>
  ) {}

  async retrieve(
    query: string,
    pdfId: string,
    options: RetrievalOptions = {}
  ): Promise<RelevantContent> {
    const opts = {
      topK: 8,
      includeContext: true,
      expansionDepth: 1,
      semanticThreshold: 0.7,
      hybridSearch: true,
      reranking: true,
      ...options
    };

    // Stage 1: Query understanding and expansion
    const expandedQuery = await this.understandAndExpandQuery(query, pdfId);
    
    // Stage 2: Multi-level retrieval
    const retrievalResults = await this.multiLevelRetrieval(
      expandedQuery,
      pdfId,
      opts
    );
    
    // Stage 3: Context expansion
    const expandedResults = opts.includeContext
      ? await this.expandWithContext(retrievalResults, opts.expansionDepth)
      : retrievalResults;
    
    // Stage 4: Concept enrichment
    const enrichedContent = await this.enrichWithConcepts(
      expandedResults,
      expandedQuery
    );
    
    // Stage 5: Re-ranking (if enabled)
    const finalContent = opts.reranking
      ? await this.rerankResults(enrichedContent, expandedQuery)
      : enrichedContent;
    
    return finalContent;
  }

  private async understandAndExpandQuery(
    query: string,
    pdfId: string
  ): Promise<ExpandedQuery> {
    // Analyze query intent using GPT
    const intentAnalysis = await this.analyzeQueryIntent(query);
    
    // Expand query with synonyms and related terms
    const expandedTerms = await this.expandQueryTerms(query, intentAnalysis);
    
    // Identify target sections from document structure
    const documentStructure = this.documentStructures.get(pdfId);
    const targetSections = this.identifyTargetSections(query, documentStructure);
    
    // Generate embeddings
    const [originalEmbedding, expandedEmbedding] = await Promise.all([
      this.createEmbedding(query),
      this.createEmbedding([query, ...expandedTerms].join(' '))
    ]);
    
    return {
      original: query,
      intent: intentAnalysis,
      expandedTerms,
      targetSections,
      embeddings: {
        original: originalEmbedding,
        expanded: expandedEmbedding
      }
    };
  }

  private async analyzeQueryIntent(query: string): Promise<QueryIntent> {
    const prompt = `Analyze the following query and determine its intent:
Query: "${query}"

Classify the intent as one of:
- definition: Looking for what something is
- comparison: Comparing two or more things
- example: Looking for examples or applications
- summary: Wanting an overview or summary
- explanation: Seeking detailed explanation of how/why
- unknown: Doesn't fit other categories

Also extract 3-5 key terms/concepts from the query.

Respond in JSON format:
{
  "type": "...",
  "confidence": 0.0-1.0,
  "keywords": ["term1", "term2", ...]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 150,
        response_format: { type: 'json_object' }
      });
      
      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        type: result.type || 'unknown',
        confidence: result.confidence || 0.5,
        keywords: result.keywords || []
      };
    } catch (error) {
      // Fallback to simple keyword extraction
      return {
        type: 'unknown',
        confidence: 0.3,
        keywords: this.extractKeywords(query)
      };
    }
  }

  private extractKeywords(query: string): string[] {
    // Simple keyword extraction
    const stopwords = new Set([
      'what', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but',
      'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
      'about', 'into', 'through', 'during', 'before', 'after'
    ]);
    
    const words = query.toLowerCase()
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !stopwords.has(word) &&
        /^[a-z]+$/.test(word)
      );
    
    // Return unique words, prioritizing longer ones
    return [...new Set(words)]
      .sort((a, b) => b.length - a.length)
      .slice(0, 5);
  }

  private async expandQueryTerms(
    query: string,
    intent: QueryIntent
  ): Promise<string[]> {
    // Use GPT to generate synonyms and related terms
    const prompt = `Given the query: "${query}"
With intent: ${intent.type}
Key terms: ${intent.keywords.join(', ')}

Generate 5-10 related terms, synonyms, or variations that would help find relevant content.
Focus on domain-specific terminology if applicable.

Respond with a JSON array of terms:`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 100
      });
      
      const content = response.choices[0].message.content || '[]';
      const terms = JSON.parse(content);
      return Array.isArray(terms) ? terms : [];
    } catch (error) {
      // Fallback to basic expansion
      return this.basicQueryExpansion(intent.keywords);
    }
  }

  private basicQueryExpansion(keywords: string[]): string[] {
    const expansions: string[] = [];
    
    // Add plurals/singulars
    for (const keyword of keywords) {
      if (keyword.endsWith('s')) {
        expansions.push(keyword.slice(0, -1));
      } else {
        expansions.push(keyword + 's');
      }
    }
    
    // Add common variations
    const variations: Record<string, string[]> = {
      'algorithm': ['method', 'procedure', 'process'],
      'concept': ['idea', 'notion', 'principle'],
      'example': ['instance', 'case', 'illustration'],
      'definition': ['meaning', 'explanation', 'description']
    };
    
    for (const keyword of keywords) {
      if (variations[keyword]) {
        expansions.push(...variations[keyword]);
      }
    }
    
    return expansions;
  }

  private identifyTargetSections(
    query: string,
    documentStructure: any
  ): string[] {
    if (!documentStructure) return [];
    
    const targetSections: string[] = [];
    const queryLower = query.toLowerCase();
    
    // Check chapter titles
    for (const chapter of documentStructure.chapters || []) {
      if (this.isRelevantSection(queryLower, chapter.title)) {
        targetSections.push(chapter.id);
      }
      
      // Check section titles
      for (const section of chapter.sections || []) {
        if (this.isRelevantSection(queryLower, section.title)) {
          targetSections.push(section.id);
        }
      }
    }
    
    return targetSections;
  }

  private isRelevantSection(query: string, sectionTitle: string): boolean {
    const titleLower = sectionTitle.toLowerCase();
    
    // Check for direct mentions
    if (query.includes(titleLower) || titleLower.includes(query)) {
      return true;
    }
    
    // Check for keyword overlap
    const queryWords = new Set(query.split(/\s+/));
    const titleWords = titleLower.split(/\s+/);
    
    const overlap = titleWords.filter(word => queryWords.has(word)).length;
    return overlap >= 2 || (overlap === 1 && titleWords.length <= 3);
  }

  private async multiLevelRetrieval(
    expandedQuery: ExpandedQuery,
    pdfId: string,
    options: Required<RetrievalOptions>
  ): Promise<EnhancedChunk[]> {
    const results = new Map<string, EnhancedChunk>();
    
    // Level 1: Direct query search
    const directResults = await this.vectorStore.query({
      vector: expandedQuery.embeddings.original,
      topK: options.topK,
      filter: { pdfId },
      includeMetadata: true
    });
    
    for (const result of directResults) {
      results.set(result.id, {
        id: result.id,
        content: result.metadata.content || '',
        tokens: result.metadata.tokens || 0,
        score: result.score,
        metadata: result.metadata
      });
    }
    
    // Level 2: Expanded query search (if hybrid search enabled)
    if (options.hybridSearch && expandedQuery.expandedTerms.length > 0) {
      const expandedResults = await this.vectorStore.query({
        vector: expandedQuery.embeddings.expanded,
        topK: Math.floor(options.topK / 2),
        filter: { pdfId },
        includeMetadata: true
      });
      
      for (const result of expandedResults) {
        if (!results.has(result.id)) {
          results.set(result.id, {
            id: result.id,
            content: result.metadata.content || '',
            tokens: result.metadata.tokens || 0,
            score: result.score * 0.8, // Slightly lower weight for expanded results
            metadata: result.metadata
          });
        }
      }
    }
    
    // Level 3: Target section boost
    if (expandedQuery.targetSections.length > 0) {
      for (const [id, chunk] of results) {
        if (expandedQuery.targetSections.includes(chunk.metadata.section)) {
          chunk.score *= 1.2; // Boost chunks from target sections
        }
      }
    }
    
    // Convert to array and sort by score
    return Array.from(results.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, options.topK);
  }

  private async expandWithContext(
    chunks: EnhancedChunk[],
    expansionDepth: number
  ): Promise<EnhancedChunk[]> {
    const expandedSet = new Map<string, EnhancedChunk>();
    
    // Add original chunks
    for (const chunk of chunks) {
      expandedSet.set(chunk.id, chunk);
    }
    
    // Expand with surrounding chunks
    for (const chunk of chunks) {
      const contextChunks = await this.getContextualChunks(
        chunk.id,
        expansionDepth
      );
      
      for (const contextChunk of contextChunks) {
        if (!expandedSet.has(contextChunk.id)) {
          expandedSet.set(contextChunk.id, {
            ...contextChunk,
            score: chunk.score * 0.5 // Lower score for context chunks
          });
        }
      }
    }
    
    return Array.from(expandedSet.values());
  }

  private async getContextualChunks(
    chunkId: string,
    depth: number
  ): Promise<EnhancedChunk[]> {
    // Extract chunk index from ID (assuming format "chunk-123")
    const match = chunkId.match(/chunk-(\d+)/);
    if (!match) return [];
    
    const index = parseInt(match[1]);
    const contextChunks: EnhancedChunk[] = [];
    
    // Get surrounding chunks based on depth
    for (let i = 1; i <= depth; i++) {
      // Previous chunks
      const prevId = `chunk-${index - i}`;
      const prevChunk = await this.fetchChunkById(prevId);
      if (prevChunk) contextChunks.push(prevChunk);
      
      // Next chunks
      const nextId = `chunk-${index + i}`;
      const nextChunk = await this.fetchChunkById(nextId);
      if (nextChunk) contextChunks.push(nextChunk);
    }
    
    return contextChunks;
  }

  private async fetchChunkById(chunkId: string): Promise<EnhancedChunk | null> {
    // This would typically fetch from your database
    // For now, returning null as placeholder
    return null;
  }

  private async enrichWithConcepts(
    chunks: EnhancedChunk[],
    query: ExpandedQuery
  ): Promise<RelevantContent> {
    const concepts = await this.extractRelevantConcepts(chunks, query);
    
    // Add concept references to chunks
    for (const chunk of chunks) {
      chunk.relatedConcepts = concepts
        .filter(c => c.sourceChunks.includes(chunk.id))
        .map(c => c.term);
    }
    
    // Calculate total tokens
    const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
    
    // Calculate overall relevance score
    const relevanceScore = this.calculateRelevanceScore(chunks, query);
    
    return {
      chunks,
      concepts,
      totalTokens,
      relevanceScore,
      metadata: {
        queryIntent: query.intent,
        retrievalStrategy: 'multi-stage-enhanced',
        expansionUsed: query.expandedTerms.length > 0
      }
    };
  }

  private async extractRelevantConcepts(
    chunks: EnhancedChunk[],
    query: ExpandedQuery
  ): Promise<ConceptInfo[]> {
    const concepts = new Map<string, ConceptInfo>();
    const queryKeywords = new Set([
      ...query.intent.keywords,
      ...query.expandedTerms
    ]);
    
    for (const chunk of chunks) {
      const chunkConcepts = chunk.metadata.concepts || [];
      
      for (const concept of chunkConcepts) {
        // Check if concept is relevant to query
        const relevance = this.calculateConceptRelevance(
          concept,
          queryKeywords
        );
        
        if (relevance > 0.3) {
          if (!concepts.has(concept)) {
            concepts.set(concept, {
              term: concept,
              definition: await this.getConceptDefinition(concept, chunks),
              relevance,
              sourceChunks: [chunk.id]
            });
          } else {
            const existing = concepts.get(concept)!;
            existing.sourceChunks.push(chunk.id);
            existing.relevance = Math.max(existing.relevance, relevance);
          }
        }
      }
    }
    
    // Sort by relevance and return top concepts
    return Array.from(concepts.values())
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);
  }

  private calculateConceptRelevance(
    concept: string,
    queryKeywords: Set<string>
  ): number {
    const conceptLower = concept.toLowerCase();
    
    // Direct match
    if (queryKeywords.has(conceptLower)) {
      return 1.0;
    }
    
    // Partial match
    for (const keyword of queryKeywords) {
      if (conceptLower.includes(keyword) || keyword.includes(conceptLower)) {
        return 0.7;
      }
    }
    
    // Word overlap
    const conceptWords = conceptLower.split(/\s+/);
    const overlap = conceptWords.filter(w => queryKeywords.has(w)).length;
    
    return overlap / conceptWords.length;
  }

  private async getConceptDefinition(
    concept: string,
    chunks: EnhancedChunk[]
  ): Promise<string> {
    // Look for definition in chunks
    for (const chunk of chunks) {
      const content = chunk.content.toLowerCase();
      const conceptLower = concept.toLowerCase();
      
      // Look for definition patterns
      const patterns = [
        new RegExp(`${conceptLower}\\s+is\\s+([^.]+)\\.`, 'i'),
        new RegExp(`${conceptLower}\\s+refers\\s+to\\s+([^.]+)\\.`, 'i'),
        new RegExp(`define\\s+${conceptLower}\\s+as\\s+([^.]+)\\.`, 'i')
      ];
      
      for (const pattern of patterns) {
        const match = chunk.content.match(pattern);
        if (match) {
          return match[1].trim();
        }
      }
    }
    
    return 'No definition found';
  }

  private calculateRelevanceScore(
    chunks: EnhancedChunk[],
    query: ExpandedQuery
  ): number {
    if (chunks.length === 0) return 0;
    
    // Average of top chunk scores
    const topScores = chunks
      .slice(0, 3)
      .map(c => c.score);
    
    const avgScore = topScores.reduce((a, b) => a + b, 0) / topScores.length;
    
    // Boost for intent match
    let intentBoost = 1.0;
    if (query.intent.confidence > 0.7) {
      const hasIntentMatch = chunks.some(chunk => {
        const content = chunk.content.toLowerCase();
        switch (query.intent.type) {
          case 'definition':
            return /\b(is|are|means?|refers?\s+to)\b/.test(content);
          case 'example':
            return /\b(example|instance|such\s+as|for\s+example)\b/.test(content);
          case 'comparison':
            return /\b(compare|contrast|versus|difference|similar)\b/.test(content);
          default:
            return true;
        }
      });
      
      if (hasIntentMatch) {
        intentBoost = 1.2;
      }
    }
    
    return Math.min(avgScore * intentBoost, 1.0);
  }

  private async rerankResults(
    content: RelevantContent,
    query: ExpandedQuery
  ): Promise<RelevantContent> {
    // Use GPT to re-rank chunks based on relevance
    const rerankPrompt = `Given the query: "${query.original}"
Query intent: ${query.intent.type}

Rank the following text chunks by relevance (1-10 scale):

${content.chunks.slice(0, 10).map((chunk, i) => 
  `Chunk ${i + 1}: ${chunk.content.substring(0, 200)}...`
).join('\n\n')}

Respond with a JSON array of rankings: [{"chunk": 1, "score": 8.5}, ...]`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: rerankPrompt }],
        temperature: 0.3,
        max_tokens: 200
      });
      
      const rankings = JSON.parse(response.choices[0].message.content || '[]');
      
      // Update chunk scores based on reranking
      for (const ranking of rankings) {
        const chunkIndex = ranking.chunk - 1;
        if (chunkIndex >= 0 && chunkIndex < content.chunks.length) {
          // Blend original score with reranked score
          const originalScore = content.chunks[chunkIndex].score;
          const rerankedScore = ranking.score / 10;
          content.chunks[chunkIndex].score = 
            originalScore * 0.4 + rerankedScore * 0.6;
        }
      }
      
      // Re-sort by new scores
      content.chunks.sort((a, b) => b.score - a.score);
      
    } catch (error) {
      console.error('Reranking failed:', error);
      // Keep original ranking
    }
    
    return content;
  }

  private async createEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    
    return response.data[0].embedding;
  }
}