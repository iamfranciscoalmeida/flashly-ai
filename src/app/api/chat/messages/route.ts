import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/supabase/server';
import { createChatCompletion } from '@/lib/openai-config';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { sessionId, message, attachments, context, audioUrl, isVoice, test } = await request.json();

    // Handle test requests
    if (test) {
      return NextResponse.json({
        message: 'Chat API is working',
        test: true,
        user: { id: user.id, email: user.email },
        timestamp: new Date().toISOString()
      });
    }

    if (!sessionId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify session belongs to user
    const { data: sessionData, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !sessionData) {
      console.error('Session validation error:', sessionError);
      return NextResponse.json({ error: 'Invalid session or session not found' }, { status: 403 });
    }

    // Save user message
    let userMessage = null;
    const messageMetadata = {
      ...(attachments && { attachments }),
      ...(isVoice && { isVoice: true })
    };
    
    const { data: userMsgData, error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'user',
        content: message,
        audio_url: audioUrl || null,
        metadata: Object.keys(messageMetadata).length > 0 ? messageMetadata : null
      })
      .select()
      .single();

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError);
      // If table doesn't exist or RLS fails, continue without saving to database
      if (userMsgError.code === '42P01' || userMsgError.code === '42501') {
        console.warn('Database issue, continuing with AI response only');
        userMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: message,
          created_at: new Date().toISOString()
        };
      } else {
        return NextResponse.json({ 
          error: `Failed to save message: ${userMsgError.message}` 
        }, { status: 500 });
      }
    } else {
      userMessage = userMsgData;
    }

    // Get conversation history
    const { data: messages, error: historyError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
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

    // Add system prompt with voice-specific instructions if this is a voice session
    const systemPrompt = {
      role: 'system' as const,
      content: `You are an AI tutor designed to help students learn effectively. 
      Your responses should be:
      - Clear and easy to understand
      - Educational and informative
      - Encouraging and supportive
      - Structured with proper formatting when appropriate
      - Focused on helping the student understand concepts deeply
      ${isVoice ? `
      - Since this is a voice conversation, keep responses conversational and natural for speech
      - Avoid excessive formatting or symbols that don't translate well to speech
      - Use clear, spoken language patterns and transitions` : ''}
      
      When appropriate, use examples, analogies, and break down complex topics into simpler parts.
      If asked to generate study materials, format them properly for easy consumption.`
    };

    // Generate AI response
    const aiResponse = await createChatCompletion(
      [systemPrompt, ...conversationHistory],
      {
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
        max_tokens: 2000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }
    );

    // Save AI response
    let aiMessage = null;
    const { data: aiMsgData, error: aiMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'assistant',
        content: aiResponse,
        metadata: {
          model: 'gpt-4-turbo-preview',
          response_length: aiResponse.length
        }
      })
      .select()
      .single();

    if (aiMsgError) {
      console.error('Error saving AI message:', aiMsgError);
      // Create fallback AI message object
      aiMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: aiResponse,
        created_at: new Date().toISOString()
      };
    } else {
      aiMessage = aiMsgData;
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
      .eq('user_id', user.id)
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