import { createHash } from 'crypto';

export interface CacheEntry {
  id: string;
  key: string;
  content: any;
  contentHash: string;
  contentType: 'summary' | 'notes' | 'flashcards' | 'quiz';
  tier?: string;
  format?: string;
  tokensUsed: number;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
  lastAccessed: Date;
}

export interface TokenUsage {
  id: string;
  userId: string;
  sessionId?: string;
  operation: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  cached: boolean;
  timestamp: Date;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalTokensSaved: number;
  costSaved: number;
  avgResponseTime: number;
}

export class CachingService {
  private static cache = new Map<string, CacheEntry>();
  private static readonly MAX_CACHE_SIZE = 1000;
  private static readonly DEFAULT_TTL_HOURS = 24;
  
  /**
   * Generate cache key based on content and options
   */
  static generateCacheKey(
    content: string,
    type: string,
    options: Record<string, any> = {}
  ): string {
    const contentHash = this.generateContentHash(content);
    const optionsStr = JSON.stringify(options, Object.keys(options).sort());
    const optionsHash = createHash('md5').update(optionsStr).digest('hex').slice(0, 8);
    
    return `${type}:${contentHash}:${optionsHash}`;
  }
  
  /**
   * Generate content hash for deduplication
   */
  static generateContentHash(content: string): string {
    return createHash('sha256').update(content.trim()).digest('hex').slice(0, 16);
  }
  
  /**
   * Check if content exists in cache
   */
  static async checkCache(cacheKey: string): Promise<CacheEntry | null> {
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    // Update access stats
    entry.hitCount++;
    entry.lastAccessed = new Date();
    
    console.log(`💾 Cache hit for ${cacheKey}`);
    return entry;
  }
  
  /**
   * Store content in cache
   */
  static async setCache(
    cacheKey: string,
    content: any,
    contentType: CacheEntry['contentType'],
    tokensUsed: number,
    options: {
      tier?: string;
      format?: string;
      ttlHours?: number;
    } = {}
  ): Promise<void> {
    // Clean cache if at capacity
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanOldEntries();
    }
    
    const ttl = options.ttlHours || this.DEFAULT_TTL_HOURS;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttl);
    
    const entry: CacheEntry = {
      id: `cache_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      key: cacheKey,
      content,
      contentHash: this.generateContentHash(JSON.stringify(content)),
      contentType,
      tier: options.tier,
      format: options.format,
      tokensUsed,
      createdAt: new Date(),
      expiresAt,
      hitCount: 0,
      lastAccessed: new Date()
    };
    
    this.cache.set(cacheKey, entry);
    console.log(`💾 Cached content with key ${cacheKey}, expires at ${expiresAt.toISOString()}`);
  }
  
  /**
   * Clean old and least used entries
   */
  private static cleanOldEntries(): void {
    console.log('🧹 Cleaning cache...');
    
    const entries = Array.from(this.cache.values());
    const now = new Date();
    
    // Remove expired entries first
    entries.forEach(entry => {
      if (entry.expiresAt < now) {
        this.cache.delete(entry.key);
      }
    });
    
    // If still at capacity, remove least recently used
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const sortedEntries = entries
        .filter(entry => entry.expiresAt >= now)
        .sort((a, b) => {
          // Sort by hit count (descending) then by last accessed (ascending)
          if (a.hitCount !== b.hitCount) {
            return a.hitCount - b.hitCount;
          }
          return a.lastAccessed.getTime() - b.lastAccessed.getTime();
        });
      
      // Remove bottom 20%
      const toRemove = Math.floor(this.MAX_CACHE_SIZE * 0.2);
      for (let i = 0; i < toRemove && i < sortedEntries.length; i++) {
        this.cache.delete(sortedEntries[i].key);
      }
    }
    
    console.log(`🧹 Cache cleaned. Current size: ${this.cache.size}`);
  }
  
  /**
   * Track token usage for analytics
   */
  static async trackTokenUsage(
    userId: string,
    operation: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    cached: boolean = false,
    sessionId?: string
  ): Promise<TokenUsage> {
    const totalTokens = inputTokens + outputTokens;
    const cost = this.calculateCost(model, inputTokens, outputTokens);
    
    const usage: TokenUsage = {
      id: `usage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      sessionId,
      operation,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      cost,
      cached,
      timestamp: new Date()
    };
    
    // In a real implementation, save to database
    console.log(`📊 Token usage tracked: ${totalTokens} tokens, $${cost.toFixed(4)}, cached: ${cached}`);
    
    return usage;
  }
  
  /**
   * Calculate API cost based on model and token usage
   */
  private static calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = {
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 }
    };
    
    const modelPricing = pricing[model as keyof typeof pricing] || pricing['gpt-3.5-turbo'];
    
    return (inputTokens * modelPricing.input + outputTokens * modelPricing.output) / 1000;
  }
  
  /**
   * Get cache statistics
   */
  static getCacheStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const now = new Date();
    const validEntries = entries.filter(entry => entry.expiresAt >= now);
    
    const totalHits = validEntries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const totalRequests = totalHits + validEntries.length; // Approximation
    
    return {
      totalEntries: validEntries.length,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      totalTokensSaved: validEntries.reduce((sum, entry) => sum + (entry.tokensUsed * entry.hitCount), 0),
      costSaved: validEntries.reduce((sum, entry) => {
        const modelCost = this.calculateCost('gpt-4', entry.tokensUsed, 0);
        return sum + (modelCost * entry.hitCount);
      }, 0),
      avgResponseTime: 50 // Mock value - in real implementation, track actual response times
    };
  }
  
  /**
   * Clear all cache entries
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('🧹 Cache cleared completely');
  }
  
  /**
   * Check if content has been processed before (prevent duplicate processing)
   */
  static async checkDuplicateProcessing(
    content: string,
    type: string,
    userId: string
  ): Promise<{
    isDuplicate: boolean;
    existingResult?: any;
    cacheKey?: string;
  }> {
    const contentHash = this.generateContentHash(content);
    
    // Look for any cache entry with the same content hash and type
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.contentHash === contentHash && entry.contentType === type) {
        return {
          isDuplicate: true,
          existingResult: entry.content,
          cacheKey: key
        };
      }
    }
    
    return { isDuplicate: false };
  }
  
  /**
   * Get user's token usage summary
   */
  static async getUserTokenUsage(
    userId: string,
    timeframe: 'day' | 'week' | 'month' = 'month'
  ): Promise<{
    totalTokens: number;
    totalCost: number;
    operationBreakdown: Record<string, { tokens: number; cost: number; count: number }>;
    cachedSavings: { tokens: number; cost: number };
  }> {
    // In a real implementation, query from database
    // This is a mock implementation
    return {
      totalTokens: 25000,
      totalCost: 12.50,
      operationBreakdown: {
        'summary': { tokens: 10000, cost: 5.00, count: 15 },
        'notes': { tokens: 8000, cost: 4.00, count: 12 },
        'flashcards': { tokens: 5000, cost: 2.50, count: 8 },
        'quiz': { tokens: 2000, cost: 1.00, count: 5 }
      },
      cachedSavings: { tokens: 5000, cost: 2.50 }
    };
  }
} 