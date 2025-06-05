import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, content, documentId, moduleId } = await request.json()
    
    if (!sessionId || !content) {
      return NextResponse.json(
        { error: 'Session ID and content are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Save user message
    const { data: userMessage, error: userError } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content,
        metadata: { documentId, moduleId }
      })
      .select()
      .single()

    if (userError) {
      console.error('Error saving user message:', userError)
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      )
    }

    // Get context from document or module if provided
    let contextContent = ''
    if (documentId) {
      const { data: document } = await supabase
        .from('documents')
        .select('content')
        .eq('id', documentId)
        .single()
      
      if (document) {
        contextContent = document.content
      }
    } else if (moduleId) {
      const { data: module } = await supabase
        .from('modules')
        .select('content')
        .eq('id', moduleId)
        .single()
      
      if (module) {
        contextContent = module.content
      }
    }

    // Get previous messages for context
    const { data: previousMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10)

    // Prepare messages for OpenAI
    const systemMessage = {
      role: 'system' as const,
      content: `You are a helpful AI study assistant. ${contextContent ? `Here is the study material context: ${contextContent.slice(0, 3000)}` : ''} Help the user understand concepts, answer questions, and provide educational guidance.`
    }

    const messages = [
      systemMessage,
      ...(previousMessages || []).slice(0, -1).map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content }
    ]

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    })

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I cannot generate a response at this time.'

    // Save AI message
    const { data: assistantMessage, error: assistantError } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: aiResponse,
        metadata: { model: 'gpt-3.5-turbo' }
      })
      .select()
      .single()

    if (assistantError) {
      console.error('Error saving assistant message:', assistantError)
      return NextResponse.json(
        { error: 'Failed to save AI response' },
        { status: 500 }
      )
    }

    // Update session last_message_at
    await supabase
      .from('chat_sessions')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', sessionId)

    return NextResponse.json({
      userMessage,
      assistantMessage
    })

  } catch (error) {
    console.error('Error in chat messages route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 