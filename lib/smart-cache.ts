import { LRUCache } from 'lru-cache';
import { Redis } from 'ioredis';
import crypto from 'crypto';

export interface CacheOptions {
  memory: {
    maxSize: number;
    ttl: number;
  };
  redis: {
    ttl: number;
    keyPrefix: string;
  };
}

export interface CacheStats {
  hits: number;
  misses: number;
  memoryHits: number;
  redisHits: number;
  size: number;
  evictions: number;
}

export class SmartCache {
  private memoryCache: {
    embeddings: LRUCache<string, number[]>;
    retrieval: LRUCache<string, any>;
    generation: LRUCache<string, any>;
    summaries: LRUCache<string, string>;
  };
  
  private redis: Redis;
  private stats: Map<string, CacheStats>;
  private options: CacheOptions;

  constructor(redis: Redis, options?: Partial<CacheOptions>) {
    this.redis = redis;
    this.options = {
      memory: {
        maxSize: options?.memory?.maxSize || 1000,
        ttl: options?.memory?.ttl || 3600000 // 1 hour in ms
      },
      redis: {
        ttl: options?.redis?.ttl || 86400, // 24 hours in seconds
        keyPrefix: options?.redis?.keyPrefix || 'pdf-cache:'
      }
    };

    // Initialize LRU caches for each layer
    this.memoryCache = {
      embeddings: new LRUCache<string, number[]>({
        max: this.options.memory.maxSize,
        ttl: this.options.memory.ttl,
        updateAgeOnGet: true
      }),
      retrieval: new LRUCache<string, any>({
        max: Math.floor(this.options.memory.maxSize / 2),
        ttl: this.options.memory.ttl,
        updateAgeOnGet: true
      }),
      generation: new LRUCache<string, any>({
        max: Math.floor(this.options.memory.maxSize / 3),
        ttl: this.options.memory.ttl,
        updateAgeOnGet: true
      }),
      summaries: new LRUCache<string, string>({
        max: Math.floor(this.options.memory.maxSize / 4),
        ttl: this.options.memory.ttl * 2, // Summaries can live longer
        updateAgeOnGet: true
      })
    };

    // Initialize stats
    this.stats = new Map();
    for (const layer of ['embeddings', 'retrieval', 'generation', 'summaries']) {
      this.stats.set(layer, {
        hits: 0,
        misses: 0,
        memoryHits: 0,
        redisHits: 0,
        size: 0,
        evictions: 0
      });
    }
  }

  async get<T>(
    key: string,
    layer: keyof typeof this.memoryCache
  ): Promise<T | null> {
    const stats = this.stats.get(layer)!;
    
    // Check memory cache first
    const memoryResult = this.memoryCache[layer].get(key);
    if (memoryResult !== undefined) {
      stats.hits++;
      stats.memoryHits++;
      return memoryResult as T;
    }

    // Check Redis cache
    const redisKey = this.getRedisKey(layer, key);
    try {
      const redisResult = await this.redis.get(redisKey);
      if (redisResult) {
        const parsed = JSON.parse(redisResult);
        
        // Warm memory cache
        this.memoryCache[layer].set(key, parsed);
        
        stats.hits++;
        stats.redisHits++;
        return parsed as T;
      }
    } catch (error) {
      console.error(`Redis get error for ${redisKey}:`, error);
    }

    stats.misses++;
    return null;
  }

  async set<T>(
    key: string,
    value: T,
    layer: keyof typeof this.memoryCache,
    ttl?: number
  ): Promise<void> {
    const stats = this.stats.get(layer)!;
    
    // Set in memory cache
    this.memoryCache[layer].set(key, value as any);
    stats.size = this.memoryCache[layer].size;

    // Set in Redis with TTL
    const redisKey = this.getRedisKey(layer, key);
    const redisTTL = ttl || this.options.redis.ttl;
    
    try {
      await this.redis.setex(
        redisKey,
        redisTTL,
        JSON.stringify(value)
      );
    } catch (error) {
      console.error(`Redis set error for ${redisKey}:`, error);
    }
  }

  async mget<T>(
    keys: string[],
    layer: keyof typeof this.memoryCache
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const missingKeys: string[] = [];

    // Check memory cache first
    for (const key of keys) {
      const cached = this.memoryCache[layer].get(key);
      if (cached !== undefined) {
        results.set(key, cached as T);
      } else {
        missingKeys.push(key);
      }
    }

    // Batch get from Redis for missing keys
    if (missingKeys.length > 0) {
      const redisKeys = missingKeys.map(k => this.getRedisKey(layer, k));
      
      try {
        const redisResults = await this.redis.mget(...redisKeys);
        
        for (let i = 0; i < missingKeys.length; i++) {
          const redisValue = redisResults[i];
          if (redisValue) {
            const parsed = JSON.parse(redisValue);
            results.set(missingKeys[i], parsed);
            
            // Warm memory cache
            this.memoryCache[layer].set(missingKeys[i], parsed);
          }
        }
      } catch (error) {
        console.error('Redis mget error:', error);
      }
    }

    return results;
  }

  async invalidate(pattern: string, layer?: keyof typeof this.memoryCache): Promise<void> {
    // Invalidate memory cache
    if (layer) {
      // Clear specific layer
      const cache = this.memoryCache[layer];
      const keysToDelete: string[] = [];
      
      for (const key of cache.keys()) {
        if (this.matchesPattern(key, pattern)) {
          keysToDelete.push(key);
        }
      }
      
      for (const key of keysToDelete) {
        cache.delete(key);
      }
    } else {
      // Clear all layers
      for (const layerName of Object.keys(this.memoryCache) as Array<keyof typeof this.memoryCache>) {
        const cache = this.memoryCache[layerName];
        const keysToDelete: string[] = [];
        
        for (const key of cache.keys()) {
          if (this.matchesPattern(key, pattern)) {
            keysToDelete.push(key);
          }
        }
        
        for (const key of keysToDelete) {
          cache.delete(key);
        }
      }
    }

    // Invalidate Redis cache
    try {
      const redisPattern = layer
        ? `${this.options.redis.keyPrefix}${layer}:${pattern}*`
        : `${this.options.redis.keyPrefix}*${pattern}*`;
      
      const keys = await this.redis.keys(redisPattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis invalidation error:', error);
    }
  }

  async preload(
    keys: string[],
    layer: keyof typeof this.memoryCache,
    fetcher: (keys: string[]) => Promise<Map<string, any>>
  ): Promise<void> {
    // Find keys not in cache
    const missingKeys: string[] = [];
    
    for (const key of keys) {
      const cached = await this.get(key, layer);
      if (!cached) {
        missingKeys.push(key);
      }
    }

    if (missingKeys.length > 0) {
      // Fetch missing data
      const fetchedData = await fetcher(missingKeys);
      
      // Cache the results
      for (const [key, value] of fetchedData) {
        await this.set(key, value, layer);
      }
    }
  }

  getStats(): Map<string, CacheStats> {
    // Update size stats
    for (const [layer, stats] of this.stats) {
      const cache = this.memoryCache[layer as keyof typeof this.memoryCache];
      stats.size = cache.size;
    }
    
    return new Map(this.stats);
  }

  clearStats(): void {
    for (const stats of this.stats.values()) {
      stats.hits = 0;
      stats.misses = 0;
      stats.memoryHits = 0;
      stats.redisHits = 0;
      stats.evictions = 0;
    }
  }

  private getRedisKey(layer: string, key: string): string {
    return `${this.options.redis.keyPrefix}${layer}:${key}`;
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Convert pattern to regex (simple glob-like matching)
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(key);
  }
}

// Cache key generation utilities
export class CacheKeyGenerator {
  static generateKey(prefix: string, ...parts: any[]): string {
    const serialized = parts.map(part => 
      typeof part === 'object' ? JSON.stringify(part) : String(part)
    ).join(':');
    
    return `${prefix}:${serialized}`;
  }

  static generateHashKey(prefix: string, data: any): string {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
    
    return `${prefix}:${hash}`;
  }

  static generateQueryKey(pdfId: string, query: string, options?: any): string {
    const normalizedQuery = query.toLowerCase().trim();
    const optionsStr = options ? JSON.stringify(options) : '';
    
    return this.generateHashKey(
      `query:${pdfId}`,
      { query: normalizedQuery, options: optionsStr }
    );
  }

  static generateChunkKey(pdfId: string, chunkIndex: number): string {
    return `chunk:${pdfId}:${chunkIndex}`;
  }

  static generateEmbeddingKey(text: string, model: string = 'text-embedding-3-small'): string {
    return this.generateHashKey(`embedding:${model}`, text);
  }
}

// Caching decorator for methods
export function Cacheable(
  layer: keyof SmartCache['memoryCache'],
  keyGenerator: (...args: any[]) => string,
  ttl?: number
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache = (this as any).cache as SmartCache;
      if (!cache) {
        return originalMethod.apply(this, args);
      }

      const key = keyGenerator(...args);
      
      // Try to get from cache
      const cached = await cache.get(key, layer);
      if (cached !== null) {
        return cached;
      }

      // Call original method
      const result = await originalMethod.apply(this, args);
      
      // Cache the result
      await cache.set(key, result, layer, ttl);
      
      return result;
    };

    return descriptor;
  };
}

// Example usage with a service class
export class PDFService {
  constructor(private cache: SmartCache) {}

  @Cacheable(
    'generation',
    (pdfId: string, query: string, type: string) => 
      CacheKeyGenerator.generateQueryKey(pdfId, `${type}:${query}`),
    3600 // 1 hour TTL
  )
  async generateContent(
    pdfId: string,
    query: string,
    type: 'flashcards' | 'quiz' | 'notes'
  ): Promise<any> {
    // Expensive content generation logic
    console.log('Generating content (not from cache)...');
    // ... actual implementation
  }

  @Cacheable(
    'embeddings',
    (text: string) => CacheKeyGenerator.generateEmbeddingKey(text),
    86400 // 24 hour TTL
  )
  async createEmbedding(text: string): Promise<number[]> {
    // Expensive embedding creation
    console.log('Creating embedding (not from cache)...');
    // ... actual implementation
    return [];
  }
}

// Cache warming strategies
export class CacheWarmer {
  constructor(private cache: SmartCache) {}

  async warmPopularQueries(pdfId: string, popularQueries: string[]): Promise<void> {
    const embeddingKeys = popularQueries.map(q => 
      CacheKeyGenerator.generateEmbeddingKey(q)
    );
    
    await this.cache.preload(
      embeddingKeys,
      'embeddings',
      async (keys) => {
        // Batch create embeddings for missing queries
        const embeddings = new Map<string, number[]>();
        // ... implementation to create embeddings
        return embeddings;
      }
    );
  }

  async warmChapterSummaries(pdfId: string, chapterIds: string[]): Promise<void> {
    const summaryKeys = chapterIds.map(id => 
      CacheKeyGenerator.generateKey('summary', pdfId, id)
    );
    
    await this.cache.preload(
      summaryKeys,
      'summaries',
      async (keys) => {
        // Generate summaries for missing chapters
        const summaries = new Map<string, string>();
        // ... implementation to generate summaries
        return summaries;
      }
    );
  }
}