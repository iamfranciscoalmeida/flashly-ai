import { createClient } from '../../../../../supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 API: Starting content organization...');
    
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log('❌ API: Unauthorized - no user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ API: User authenticated:', user.id);

    // First, let's check what content exists
    console.log('🔍 API: Checking existing content...');
    const [flashcards, quizzes, documents] = await Promise.all([
      supabase.from('flashcards').select('id, question, answer').eq('user_id', user.id),
      supabase.from('quizzes').select('id, question, options').eq('user_id', user.id),
      supabase.from('documents').select('id, file_name').eq('user_id', user.id)
    ]);

    console.log('📊 API: Content inventory:', {
      flashcards: flashcards.data?.length || 0,
      quizzes: quizzes.data?.length || 0,
      documents: documents.data?.length || 0,
      total: (flashcards.data?.length || 0) + (quizzes.data?.length || 0) + (documents.data?.length || 0)
    });

    if (flashcards.error) console.error('❌ API: Flashcards error:', flashcards.error);
    if (quizzes.error) console.error('❌ API: Quizzes error:', quizzes.error);
    if (documents.error) console.error('❌ API: Documents error:', documents.error);

    const body = await request.json();
    const { options = {} } = body;
    
    console.log('⚙️ API: Organization options:', options);

    // Clear existing auto-organized collections first (optional)
    if (options.clear_existing) {
      console.log('🗑️ API: Clearing existing auto-organized collections...');
      const { error: deleteError } = await supabase
        .from('smart_collections')
        .delete()
        .eq('user_id', user.id)
        .eq('auto_organized', true);
        
      if (deleteError) {
        console.error('❌ API: Error clearing collections:', deleteError);
      } else {
        console.log('✅ API: Cleared existing collections');
      }
    }

    console.log('🤖 API: Starting AI organization...');
    // Create AI organization service with the server-side supabase client
    const aiService = new (await import('@/lib/ai-organization-service')).AIOrganizationService(supabase);
    // Organize user content
    const result = await aiService.organizeUserContent(user.id, options);
    
    console.log('📊 API: Organization result:', {
      success: result.success,
      collections: result.collections.length,
      items_organized: result.items_organized,
      error: result.error
    });

    return NextResponse.json({
      success: result.success,
      collections: result.collections,
      items_organized: result.items_organized,
      error: result.error,
      debug: {
        content_found: {
          flashcards: flashcards.data?.length || 0,
          quizzes: quizzes.data?.length || 0,
          documents: documents.data?.length || 0
        }
      }
    });
  } catch (error) {
    console.error('❌ API: Error organizing content:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to organize content',
        collections: [],
        items_organized: 0
      },
      { status: 500 }
    );
  }
} 