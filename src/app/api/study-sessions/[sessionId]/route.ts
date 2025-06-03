import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = params;

    // Get session with related content
    const { data: session, error: sessionError } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get related content (flashcards, quizzes, etc.)
    const { data: sessionContent, error: contentError } = await supabase
      .from('session_content')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (contentError) {
      console.error('Content fetch error:', contentError);
    }

    // Get chat messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Messages fetch error:', messagesError);
    }

    return NextResponse.json({
      session,
      content: sessionContent || [],
      messages: messages || []
    });

  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = params;
    const updates = await request.json();

    // Only allow certain fields to be updated
    const allowedFields = ['title', 'subject', 'topic', 'level', 'status'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    filteredUpdates.updated_at = new Date().toISOString();

    const { data: session, error } = await supabase
      .from('study_sessions')
      .update(filteredUpdates)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ session });

  } catch (error) {
    console.error('Session update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = params;

    // Delete session (cascade will handle related content and messages)
    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Session deletion error:', error);
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Session deleted successfully' });

  } catch (error) {
    console.error('Session deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 