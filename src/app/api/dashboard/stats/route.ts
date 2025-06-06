import { createClient } from '../../../../supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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

    // Get real document count
    const { count: documentCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get real flashcard count
    const { count: flashcardCount } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get real quiz count
    const { count: quizCount } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get smart collections count
    const { count: collectionsCount } = await supabase
      .from('smart_collections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get chat sessions count
    const { count: chatSessionsCount } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentDocuments, recentFlashcards, recentQuizzes, recentChats] = await Promise.all([
      supabase
        .from('documents')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString()),
      
      supabase
        .from('flashcards')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString()),
      
      supabase
        .from('quizzes')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString()),
      
      supabase
        .from('chat_sessions')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString())
    ]);

    const stats = {
      documents: documentCount || 0,
      flashcards: flashcardCount || 0,
      quizzes: quizCount || 0,
      collections: collectionsCount || 0,
      chat_sessions: chatSessionsCount || 0,
      recent_activity: {
        documents: recentDocuments.data?.length || 0,
        flashcards: recentFlashcards.data?.length || 0,
        quizzes: recentQuizzes.data?.length || 0,
        chats: recentChats.data?.length || 0,
        total: (recentDocuments.data?.length || 0) + 
               (recentFlashcards.data?.length || 0) + 
               (recentQuizzes.data?.length || 0) + 
               (recentChats.data?.length || 0)
      }
    };

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
} 