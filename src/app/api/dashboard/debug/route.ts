import { createClient } from '../../../../../supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Checking database state...');
    
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ DEBUG: User authenticated:', user.id);

    // Check what's in the smart_collections table
    const { data: collections, error: collectionsError } = await supabase
      .from('smart_collections')
      .select('*')
      .eq('user_id', user.id);

    console.log('📊 DEBUG: Collections in database:', collections?.length || 0);
    if (collectionsError) {
      console.error('❌ DEBUG: Collections error:', collectionsError);
    }

    // Check what's in the collection_items table
    const { data: items, error: itemsError } = await supabase
      .from('collection_items')
      .select('*');

    console.log('📊 DEBUG: Collection items in database:', items?.length || 0);
    if (itemsError) {
      console.error('❌ DEBUG: Collection items error:', itemsError);
    }

    // Check content counts
    const [flashcards, quizzes, documents] = await Promise.all([
      supabase.from('flashcards').select('id').eq('user_id', user.id),
      supabase.from('quizzes').select('id').eq('user_id', user.id),
      supabase.from('documents').select('id').eq('user_id', user.id)
    ]);

    return NextResponse.json({
      success: true,
      debug: {
        user_id: user.id,
        collections: {
          count: collections?.length || 0,
          data: collections || [],
          error: collectionsError?.message
        },
        collection_items: {
          count: items?.length || 0,
          data: items || [],
          error: itemsError?.message
        },
        content: {
          flashcards: flashcards.data?.length || 0,
          quizzes: quizzes.data?.length || 0,
          documents: documents.data?.length || 0
        }
      }
    });
  } catch (error) {
    console.error('❌ DEBUG: Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Debug failed'
      },
      { status: 500 }
    );
  }
} 