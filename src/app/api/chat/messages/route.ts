import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, message, attachments, context } = await request.json();

    if (!sessionId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 403 });
    }

    // Save user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: message,
        metadata: attachments ? { attachments } : null
      })
      .select()
      .single();

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    // Get conversation history
    const { data: messages, error: historyError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (historyError) {
      console.error('Error fetching history:', historyError);
    }

    // Prepare messages for OpenAI
    const conversationHistory = messages?.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    })) || [];

    // Add system prompt
    const systemPrompt = {
      role: 'system' as const,
      content: `You are an AI tutor designed to help students learn effectively. 
      Your responses should be:
      - Clear and easy to understand
      - Educational and informative
      - Encouraging and supportive
      - Structured with proper formatting when appropriate
      - Focused on helping the student understand concepts deeply
      
      When appropriate, use examples, analogies, and break down complex topics into simpler parts.
      If asked to generate study materials, format them properly for easy consumption.`
    };

    // Generate AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [systemPrompt, ...conversationHistory],
      temperature: 0.7,
      max_tokens: 2000,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';

    // Save AI response
    const { data: aiMessage, error: aiMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: aiResponse,
        metadata: {
          model: 'gpt-4-turbo-preview',
          usage: completion.usage
        }
      })
      .select()
      .single();

    if (aiMsgError) {
      console.error('Error saving AI message:', aiMsgError);
    }

    // Update session last_message_at
    await supabase
      .from('chat_sessions')
      .update({ 
        last_message_at: new Date().toISOString(),
        metadata: {
          message_count: (messages?.length || 0) + 2
        }
      })
      .eq('id', sessionId);

    return NextResponse.json({
      userMessage,
      aiMessage: aiMessage || { content: aiResponse, role: 'assistant' }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 403 });
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}