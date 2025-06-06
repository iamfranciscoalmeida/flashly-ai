import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/supabase/server';
import { ProductionAIService, GenerationOptions, TieredSummaryResult, StructuredNotesResult } from '@/lib/production-ai-service';
import { EnhancedDocumentProcessor, DocumentAnalysis } from '@/lib/enhanced-document-processor';
import { createHash } from 'crypto';

export interface EnhancedGenerateRequest {
  content: string;
  type: 'tiered-summary' | 'structured-notes';
  options?: GenerationOptions;
  documentId?: string;
  sessionId?: string;
  moduleId?: string;
}

export interface EnhancedGenerateResponse {
  success: boolean;
  data?: {
    id: string;
    content: TieredSummaryResult | StructuredNotesResult;
    type: string;
    metadata: {
      processingStrategy: string;
      tokensUsed: number;
      processingTime: number;
      cached: boolean;
      cacheKey?: string;
      requiresUserInput?: boolean;
      suggestedSections?: any[];
    };
  };
  requiresUserInput?: boolean;
  suggestedSections?: any[];
  analysis?: DocumentAnalysis;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<EnhancedGenerateResponse>> {
  const startTime = Date.now();
  console.log('🚀 Enhanced generate API called');

  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Parse and validate request
    const body: EnhancedGenerateRequest = await request.json();
    const { content, type, options = {}, documentId, sessionId, moduleId } = body;

    if (!content || !type) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: content and type'
      }, { status: 400 });
    }

    if (!['tiered-summary', 'structured-notes'].includes(type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid type. Must be "tiered-summary" or "structured-notes"'
      }, { status: 400 });
    }

    console.log(`📝 Processing ${type} request for user ${user.id}`);

    // Generate content hashes for deduplication
    const inputHash = createHash('sha256').update(content).digest('hex');
    const paramsHash = createHash('sha256')
      .update(JSON.stringify({ type, options }))
      .digest('hex');

    // Check for duplicate content first
    const { data: duplicateCheck } = await supabase
      .rpc('check_content_duplicate', {
        p_input_hash: inputHash,
        p_content_type: type,
        p_generation_params_hash: paramsHash,
        p_user_id: user.id
      });

    if (duplicateCheck && duplicateCheck[0]?.is_duplicate && !options.forceRegenerate) {
      console.log('📋 Found duplicate content, returning existing result');
      
      // Get the existing study material
      const { data: existingMaterial } = await supabase
        .from('study_materials')
        .select('*')
        .eq('id', duplicateCheck[0].existing_material_id)
        .single();

      if (existingMaterial) {
        // Track cache hit
        await supabase.from('enhanced_token_usage').insert({
          user_id: user.id,
          session_id: sessionId,
          document_id: documentId,
          operation_type: type,
          content_type: type,
          tier: options.tier,
          format: options.format,
          model: 'cached',
          input_tokens: 0,
          output_tokens: 0,
          estimated_cost: 0,
          cached: true,
          cache_hit: true,
          cache_key: duplicateCheck[0].cache_key,
          processing_time_ms: Date.now() - startTime,
          metadata: { duplicate_detection: true }
        });

        return NextResponse.json({
          success: true,
          data: {
            id: existingMaterial.id,
            content: existingMaterial.content,
            type: existingMaterial.type,
            metadata: {
              processingStrategy: existingMaterial.processing_strategy || 'unknown',
              tokensUsed: 0,
              processingTime: Date.now() - startTime,
              cached: true,
              cacheKey: duplicateCheck[0].cache_key
            }
          }
        });
      }
    }

    try {
      let generatedContent: TieredSummaryResult | StructuredNotesResult;
      let processingMetadata: any;

      // Generate content based on type
      if (type === 'tiered-summary') {
        generatedContent = await ProductionAIService.generateTieredSummary(
          content,
          options,
          user.id,
          sessionId
        );
        processingMetadata = (generatedContent as TieredSummaryResult).processingMetadata;
      } else {
        generatedContent = await ProductionAIService.generateStructuredNotes(
          content,
          options.format || 'outline',
          options,
          user.id,
          sessionId
        );
        processingMetadata = (generatedContent as StructuredNotesResult).processingMetadata;
      }

      // Save to database
      const { data: savedMaterial, error: saveError } = await supabase
        .from('study_materials')
        .insert({
          user_id: user.id,
          document_id: documentId,
          module_id: moduleId,
          type: type,
          tier: options.tier,
          format: options.format,
          content: generatedContent,
          input_hash: inputHash,
          content_hash: createHash('sha256').update(JSON.stringify(generatedContent)).digest('hex'),
          processing_strategy: processingMetadata.strategy,
          chunk_count: processingMetadata.chunksProcessed || 1,
          generation_params: { type, options },
          tokens_used: processingMetadata.totalTokensUsed || processingMetadata.tokensUsed,
          model_used: 'gpt-4-turbo-preview',
          processing_time_ms: Date.now() - startTime,
          cache_key: `${inputHash}_${paramsHash}`
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving study material:', saveError);
        // Continue anyway, return the generated content
      }

      // Record content generation for deduplication
      if (savedMaterial) {
        await supabase.rpc('record_content_generation', {
          p_input_hash: inputHash,
          p_content_type: type,
          p_generation_params_hash: paramsHash,
          p_user_id: user.id,
          p_study_material_id: savedMaterial.id,
          p_quality_metrics: {
            processing_time_ms: Date.now() - startTime,
            tokens_used: processingMetadata.totalTokensUsed || processingMetadata.tokensUsed,
            chunks_processed: processingMetadata.chunksProcessed || 1
          }
        });
      }

      // Track token usage
      await supabase.from('enhanced_token_usage').insert({
        user_id: user.id,
        session_id: sessionId,
        document_id: documentId,
        operation_type: type,
        content_type: type,
        tier: options.tier,
        format: options.format,
        model: 'gpt-4-turbo-preview',
        input_tokens: Math.ceil(content.length / 4),
        output_tokens: processingMetadata.totalTokensUsed || processingMetadata.tokensUsed,
                 estimated_cost: calculateCost(
           Math.ceil(content.length / 4),
           processingMetadata.totalTokensUsed || processingMetadata.tokensUsed
         ),
        cached: false,
        cache_hit: false,
        cache_key: `${inputHash}_${paramsHash}`,
        processing_time_ms: Date.now() - startTime,
        metadata: {
          processing_strategy: processingMetadata.strategy,
          chunks_processed: processingMetadata.chunksProcessed || 1
        }
      });

      console.log(`✅ ${type} generated successfully in ${Date.now() - startTime}ms`);

      return NextResponse.json({
        success: true,
        data: {
          id: savedMaterial?.id || 'temp',
          content: generatedContent,
          type,
          metadata: {
            processingStrategy: processingMetadata.strategy,
            tokensUsed: processingMetadata.totalTokensUsed || processingMetadata.tokensUsed,
            processingTime: Date.now() - startTime,
            cached: false,
            cacheKey: `${inputHash}_${paramsHash}`
          }
        }
      });

    } catch (aiError: any) {
      console.error('AI generation error:', aiError);

      // Check if it's a user input required error
      if (aiError.message) {
        try {
          const errorData = JSON.parse(aiError.message);
          if (errorData.type === 'USER_INPUT_REQUIRED') {
            console.log('🤔 User input required for document processing');
            return NextResponse.json({
              success: false,
              requiresUserInput: true,
              analysis: errorData.analysis,
              suggestedSections: errorData.suggestedSections,
              error: 'Document requires section selection. Please choose specific sections to process.'
            });
          }
        } catch (parseError) {
          // Not a structured error, continue with generic handling
        }
      }

      // Generic AI error
      return NextResponse.json({
        success: false,
        error: `AI generation failed: ${aiError.message}`
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Enhanced generate API error:', error);
    return NextResponse.json({
      success: false,
      error: `Server error: ${error.message}`
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

    // Get user analytics and usage statistics
    const { data: userStats } = await supabase
      .rpc('get_user_study_stats', { p_user_id: user.id, p_days: 30 });

    // Get recent study materials
    const { data: recentMaterials } = await supabase
      .from('study_materials')
      .select('id, type, tier, format, created_at, tokens_used, processing_strategy')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      analytics: {
        userStats: userStats?.[0] || {},
        recentMaterials: recentMaterials || []
      }
    });

  } catch (error: any) {
    console.error('Error getting analytics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get analytics'
    }, { status: 500 });
  }
}

// Helper function to calculate cost (simplified pricing)
function calculateCost(inputTokens: number, outputTokens: number): number {
  const INPUT_COST_PER_1K = 0.01;  // $0.01 per 1K input tokens
  const OUTPUT_COST_PER_1K = 0.03; // $0.03 per 1K output tokens
  
  return ((inputTokens / 1000) * INPUT_COST_PER_1K) + ((outputTokens / 1000) * OUTPUT_COST_PER_1K);
} 