import { createClient } from '../../../../../../supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const collectionId = params.id;

    // Verify collection belongs to user
    const { data: collection, error: collectionError } = await supabase
      .from('smart_collections')
      .select('id')
      .eq('id', collectionId)
      .eq('user_id', user.id)
      .single();

    if (collectionError || !collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Get collection items
    const { data: collectionItems, error: itemsError } = await supabase
      .from('collection_items')
      .select('*')
      .eq('collection_id', collectionId)
      .order('relevance_score', { ascending: false });

    if (itemsError) {
      throw itemsError;
    }

    // Fetch actual content for each item
    const items = [];

    for (const item of collectionItems || []) {
      let content = null;

      try {
        switch (item.item_type) {
          case 'flashcard':
            const { data: flashcard } = await supabase
              .from('flashcards')
              .select('*')
              .eq('id', item.item_id)
              .single();
            
            if (flashcard) {
              content = {
                question: flashcard.question,
                answer: flashcard.answer,
                difficulty_level: flashcard.difficulty_level,
                tags: flashcard.tags
              };
            }
            break;

          case 'quiz':
            const { data: quiz } = await supabase
              .from('quizzes')
              .select('*')
              .eq('id', item.item_id)
              .single();
            
            if (quiz) {
              content = {
                question: quiz.question,
                options: quiz.options,
                correct: quiz.correct,
                explanation: quiz.explanation,
                difficulty_level: quiz.difficulty_level,
                tags: quiz.tags
              };
            }
            break;

          case 'document':
            const { data: document } = await supabase
              .from('documents')
              .select('file_name, extracted_text, source_type')
              .eq('id', item.item_id)
              .single();
            
            if (document) {
              content = {
                file_name: document.file_name,
                text_preview: document.extracted_text?.substring(0, 500),
                source_type: document.source_type
              };
            }
            break;

          case 'chat_content':
            const { data: chatContent } = await supabase
              .from('generated_content')
              .select('content, type')
              .eq('id', item.item_id)
              .single();
            
            if (chatContent) {
              content = {
                type: chatContent.type,
                content: chatContent.content
              };
            }
            break;
        }

        if (content) {
          items.push({
            id: item.id,
            item_type: item.item_type,
            content,
            source_type: item.source_type,
            relevance_score: item.relevance_score,
            added_at: item.added_at
          });
        }
      } catch (error) {
        console.error(`Error fetching content for item ${item.id}:`, error);
        // Continue with other items even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      items
    });
  } catch (error) {
    console.error('Error fetching collection items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection items' },
      { status: 500 }
    );
  }
} 