import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../supabase/server';
import { IntelligentChunkingService } from '@/lib/intelligent-chunking-service';
import { EnhancedAIService, type SummaryTier, type NotesFormat } from '@/lib/enhanced-ai-service';
import { CachingService } from '@/lib/caching-service';

export interface GenerateRequest {
  content: string;
  type: 'summary' | 'notes';
  tier?: SummaryTier;
  format?: NotesFormat;
  sessionId?: string;
  moduleId?: string;
  options?: {
    forceRegenerate?: boolean;
    sections?: Array<{ title: string; content: string }>;
    maxLength?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
  };
}

export interface GenerateResponse {
  success: boolean;
  data?: {
    id: string;
    content: any;
    type: string;
    tier?: string;
    format?: string;
    metadata: {
      tokensUsed: number;
      processingTime: number;
      cached: boolean;
      cacheKey: string;
      sourceReferences: string[];
      keyTerms: string[];
      estimatedReadTime?: number;
    };
  };
  requiresUserInput?: boolean;
  suggestedSections?: Array<{
    title: string;
    startPage: number;
    endPage: number;
    tokenCount: number;
  }>;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateResponse>> {
  const startTime = Date.now();
  
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: GenerateRequest = await request.json();
    const { content, type, tier, format, sessionId, moduleId, options = {} } = body;

    // Validate input
    if (!content || !type) {
      return NextResponse.json({ 
        success: false, 
        error: 'Content and type are required' 
      }, { status: 400 });
    }

    if (type === 'summary' && tier && !['tldr', 'detailed', 'exam-ready'].includes(tier)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid summary tier' 
      }, { status: 400 });
    }

    if (type === 'notes' && format && !['outline', 'cornell', 'mindmap', 'bullet'].includes(format)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid notes format' 
      }, { status: 400 });
    }

    console.log(`🚀 Starting ${type} generation for user ${user.id}`);

    // Check for duplicate processing first
    const duplicateCheck = await CachingService.checkDuplicateProcessing(content, type, user.id);
    if (duplicateCheck.isDuplicate && !options.forceRegenerate) {
      console.log('📋 Found duplicate content, returning cached result');
      
      // Track cache hit
      await CachingService.trackTokenUsage(
        user.id, 
        `${type}-generation`, 
        'cached', 
        0, 
        0, 
        true, 
        sessionId
      );
      
      return NextResponse.json({
        success: true,
        data: {
          id: 'cached-result',
          content: duplicateCheck.existingResult,
          type,
          tier,
          format,
          metadata: {
            tokensUsed: 0,
            processingTime: Date.now() - startTime,
            cached: true,
            cacheKey: duplicateCheck.cacheKey || 'duplicate-detected',
            sourceReferences: [],
            keyTerms: []
          }
        }
      });
    }

    // Generate cache key for this request
    const cacheOptions = { tier, format, ...options };
    const cacheKey = CachingService.generateCacheKey(content, type, cacheOptions);

    // Check cache unless forced regeneration
    if (!options.forceRegenerate) {
      const cachedResult = await CachingService.checkCache(cacheKey);
      if (cachedResult) {
        console.log('💾 Returning cached result');
        
        // Track cache hit
        await CachingService.trackTokenUsage(
          user.id, 
          `${type}-generation`, 
          'cached', 
          0, 
          0, 
          true, 
          sessionId
        );
        
        return NextResponse.json({
          success: true,
          data: {
            id: cachedResult.id,
            content: cachedResult.content,
            type: cachedResult.contentType,
            tier: cachedResult.tier,
            format: cachedResult.format,
            metadata: {
              tokensUsed: 0,
              processingTime: Date.now() - startTime,
              cached: true,
              cacheKey,
              sourceReferences: [],
              keyTerms: []
            }
          }
        });
      }
    }

    // If user provided specific sections, use them instead of auto-chunking
    let contentToProcess = content;
    if (options.sections && options.sections.length > 0) {
      contentToProcess = options.sections.map(s => s.content).join('\n\n');
      console.log(`📝 Using user-selected sections: ${options.sections.length} sections`);
    }

    // Analyze content and determine if chunking is needed
    const chunkingResult = await IntelligentChunkingService.analyzeAndChunk(contentToProcess);
    
    // If user input is required and not provided, return suggestion
    if (chunkingResult.requiresUserInput && !options.sections) {
      console.log('🤔 Content requires user section selection');
      return NextResponse.json({
        success: false,
        requiresUserInput: true,
        suggestedSections: chunkingResult.suggestedSections,
        error: 'Content is too large. Please select specific sections to process.'
      });
    }

    // Track tokens for processing
    const estimatedTokens = chunkingResult.totalTokens;
    console.log(`📊 Estimated tokens for processing: ${estimatedTokens}`);

    // Generate content based on type
    let generatedResult: any;
    let tokensUsed = 0;
    let sourceReferences: string[] = [];
    let keyTerms: string[] = [];
    let estimatedReadTime = 0;

    try {
      if (type === 'summary') {
        if (tier) {
          // Generate single tier summary
          const result = await EnhancedAIService.generateTieredSummary(contentToProcess, { tier });
          generatedResult = result[tier as keyof typeof result];
          sourceReferences = result.sourceReferences;
          keyTerms = result.keyTerms;
          estimatedReadTime = result.estimatedReadTime;
        } else {
          // Generate all tiers
          const result = await EnhancedAIService.generateTieredSummary(contentToProcess);
          generatedResult = result;
          sourceReferences = result.sourceReferences;
          keyTerms = result.keyTerms;
          estimatedReadTime = result.estimatedReadTime;
        }
        tokensUsed = Math.floor(estimatedTokens * 0.3); // Estimate output tokens
      } else if (type === 'notes') {
        const result = await EnhancedAIService.generateStructuredNotes(
          contentToProcess, 
          format || 'outline'
        );
        generatedResult = result;
        tokensUsed = Math.floor(estimatedTokens * 0.4); // Notes typically longer
      }

      console.log('✅ Content generation completed successfully');

    } catch (error: any) {
      console.error('❌ Content generation failed:', error);
      
      // Track failed generation
      await CachingService.trackTokenUsage(
        user.id, 
        `${type}-generation-failed`, 
        'gpt-4-turbo-preview', 
        estimatedTokens, 
        0, 
        false, 
        sessionId
      );
      
      if (error.message.includes('user section selection')) {
        // If chunking service indicates user input needed
        const rechunk = await IntelligentChunkingService.analyzeAndChunk(content);
        return NextResponse.json({
          success: false,
          requiresUserInput: true,
          suggestedSections: rechunk.suggestedSections,
          error: error.message
        });
      }
      
      return NextResponse.json({
        success: false,
        error: `Failed to generate ${type}: ${error.message}`
      }, { status: 500 });
    }

    // Save to cache
    await CachingService.setCache(
      cacheKey,
      generatedResult,
      type as any,
      tokensUsed,
      { tier, format, ttlHours: 24 }
    );

    // Track successful token usage
    await CachingService.trackTokenUsage(
      user.id, 
      `${type}-generation`, 
      'gpt-4-turbo-preview', 
      estimatedTokens, 
      tokensUsed, 
      false, 
      sessionId
    );

    // Save to database
    const { data: savedContent, error: saveError } = await supabase
      .from('study_materials')
      .insert({
        module_id: moduleId,
        type: type === 'summary' ? 'summary' : 'notes',
        payload: generatedResult,
        tier,
        format,
        content_hash: CachingService.generateContentHash(content),
        source_references: sourceReferences,
        key_terms: keyTerms,
        estimated_read_time: estimatedReadTime,
        tokens_used: tokensUsed,
        model_used: 'gpt-4-turbo-preview',
        cache_key: cacheKey,
        processing_time_ms: Date.now() - startTime
      })
      .select()
      .single();

    if (saveError) {
      console.error('⚠️ Failed to save to database:', saveError);
      // Don't fail the request, just log the error
    }

    const processingTime = Date.now() - startTime;
    console.log(`🎉 Generation completed in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      data: {
        id: savedContent?.id || 'temp-id',
        content: generatedResult,
        type,
        tier,
        format,
        metadata: {
          tokensUsed,
          processingTime,
          cached: false,
          cacheKey,
          sourceReferences,
          keyTerms,
          estimatedReadTime
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Unexpected error in generation API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's token usage summary
    const tokenUsage = await CachingService.getUserTokenUsage(user.id);
    const cacheStats = CachingService.getCacheStats();

    return NextResponse.json({
      success: true,
      analytics: {
        tokenUsage,
        cacheStats,
        userSummary: {
          totalGenerations: tokenUsage.operationBreakdown.summary?.count || 0,
          totalNotes: tokenUsage.operationBreakdown.notes?.count || 0,
          cacheHitRate: cacheStats.hitRate,
          monthlyCost: tokenUsage.totalCost,
          savings: tokenUsage.cachedSavings
        }
      }
    });

  } catch (error) {
    console.error('Error getting analytics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get analytics'
    }, { status: 500 });
  }
} 