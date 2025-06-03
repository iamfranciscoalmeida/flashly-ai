import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../../supabase/server';
import OpenAI from 'openai';
import { ChatRequest } from '@/types/study-session';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(
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
    const { message, include_context = true }: ChatRequest = await request.json();

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get recent chat history
    const { data: recentMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      console.error('Messages fetch error:', messagesError);
    }

    // Save user message
    const { error: saveUserMessageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'user',
        content: message,
        metadata: { context_used: include_context }
      });

    if (saveUserMessageError) {
      console.error('Error saving user message:', saveUserMessageError);
    }

    // Prepare context for AI
    let contextPrompt = '';
    if (include_context && session.content_text) {
      contextPrompt = `
      Context: You are an AI tutor helping a student with their study material. Here's the relevant learning content:
      
      Subject: ${session.subject || 'General'}
      Topic: ${session.topic || 'Study Material'}
      Level: ${session.level || 'Unknown'}
      
      Content: ${session.content_text.substring(0, 4000)}...
      
      Instructions: Use this content to provide helpful, educational responses. Answer questions based on the material, explain concepts, and help the student learn effectively. If asked about something not in the content, mention that it's outside the provided material but offer general educational guidance.
      `;
    }

    // Prepare conversation history
    const conversationHistory = [
      ...(contextPrompt ? [{ role: 'system' as const, content: contextPrompt }] : []),
      ...(recentMessages || []).reverse().map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      })),
      { role: 'user' as const, content: message },
    ];

    // Generate AI response
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: conversationHistory,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Save AI response
    const { error: saveAiMessageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'assistant',
        content: aiResponse,
        metadata: { context_used: include_context }
      });

    if (saveAiMessageError) {
      console.error('Error saving AI message:', saveAiMessageError);
    }

    return NextResponse.json({
      message: aiResponse,
      context_used: include_context
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get chat messages
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Messages fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });

  } catch (error) {
    console.error('Chat messages fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 