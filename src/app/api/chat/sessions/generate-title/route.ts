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

    const { sessionId, titleSource, fileName, documentContent } = await request.json();

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

    let generatedTitle = 'Learning Session';

    // Handle different title generation sources
    if (titleSource === 'fileName' && fileName) {
      // Generate title from file name
      generatedTitle = await generateTitleFromFileName(fileName);
    } else if (titleSource === 'documentContent' && documentContent) {
      // Generate title from document content
      generatedTitle = await generateTitleFromDocument(documentContent, fileName);
    } else if (titleSource === 'chat' || !titleSource) {
      // Generate title from chat messages (default behavior)
      generatedTitle = await generateTitleFromChat(supabase, sessionId);
    }

    // Update session title
    const { error: updateError } = await supabase
      .from('chat_sessions')
      .update({ title: generatedTitle })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session title:', updateError);
      return NextResponse.json({ error: 'Failed to update title' }, { status: 500 });
    }

    return NextResponse.json({ title: generatedTitle });

  } catch (error) {
    console.error('Generate title error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateTitleFromFileName(fileName: string): Promise<string> {
  try {
    // Remove file extension and clean up
    const cleanFileName = fileName
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[_-]/g, ' ')    // Replace underscores and dashes with spaces
      .replace(/\s+/g, ' ')     // Normalize spaces
      .trim();

    // If the filename is already descriptive enough, use it directly (with some cleanup)
    if (cleanFileName.length > 3 && cleanFileName.length < 50) {
      // Use AI to improve the filename into a proper title
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: `Convert this filename into a clean, educational title (3-6 words). Focus on the subject matter and make it clear and descriptive. Examples: "Biology Cell Division", "Calculus Integration", "History World War 2", "Python Programming". Keep it concise and academic.`
        }, {
          role: 'user',
          content: cleanFileName
        }],
        temperature: 0.3,
        max_tokens: 30,
      });

      const aiTitle = completion.choices[0]?.message?.content?.trim();
      if (aiTitle) {
        return aiTitle.replace(/^["']|["']$/g, ''); // Remove quotes
      }
    }

    // Fallback to a processed version of the filename
    return cleanFileName.length > 30 
      ? cleanFileName.substring(0, 30) + '...'
      : cleanFileName || 'Document Study';
      
  } catch (error) {
    console.error('Error generating title from filename:', error);
    // Fallback to simple filename processing
    return fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 30) || 'Document Study';
  }
}

async function generateTitleFromDocument(documentContent: string, fileName?: string): Promise<string> {
  try {
    // Extract first few paragraphs or sentences for context
    const contentPreview = documentContent
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 2000); // Limit to first 2000 characters

    const contextInfo = fileName ? `Document: ${fileName}\n\n` : '';

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'system',
        content: `Based on the document content below, generate a concise, descriptive title (3-6 words) that captures the main topic or subject. Focus on the key concepts, subject area, or educational content. Examples: "Biology Cell Division", "Physics Wave Motion", "History Ancient Rome", "Chemistry Organic Compounds", "Math Calculus Basics". Be specific and educational.`
      }, {
        role: 'user',
        content: `${contextInfo}Content preview:\n${contentPreview}`
      }],
      temperature: 0.3,
      max_tokens: 40,
    });

    const generatedTitle = completion.choices[0]?.message?.content?.trim();
    if (generatedTitle) {
      return generatedTitle.replace(/^["']|["']$/g, ''); // Remove quotes
    }

    // Fallback to filename-based title
    if (fileName) {
      return await generateTitleFromFileName(fileName);
    }

    return 'Document Study';
    
  } catch (error) {
    console.error('Error generating title from document content:', error);
    // Fallback to filename if available
    if (fileName) {
      return await generateTitleFromFileName(fileName);
    }
    return 'Document Study';
  }
}

async function generateTitleFromChat(supabase: any, sessionId: string): Promise<string> {
  try {
    // Get recent messages from the session
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('content, role, metadata')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10);

    if (messagesError || !messages || messages.length === 0) {
      return 'Learning Session';
    }

    // Check if there are any document attachments for additional context
    let documentContext = '';
    const firstMessage = messages.find((m: any) => m.metadata?.attachments?.length > 0);
    if (firstMessage?.metadata?.attachments?.[0]) {
      const attachment = firstMessage.metadata.attachments[0];
      documentContext = `Document: ${attachment.name}\n`;
    }

    // Generate title using OpenAI
    const conversationContext = messages
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => `${m.role}: ${m.content}`)
      .join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'system',
        content: `Based on the conversation below, generate a concise, descriptive title (3-6 words) that captures the main topic or subject being discussed. Focus on the key learning concepts, subjects, or activities mentioned. Examples: "Biology Cell Division", "Calculus Integration Problems", "History World War 2", "Python Data Structures", "Marketing Strategy Analysis". Be specific and educational.`
      }, {
        role: 'user',
        content: `${documentContext}${conversationContext}`
      }],
      temperature: 0.7,
      max_tokens: 50,
    });

    const generatedTitle = completion.choices[0]?.message?.content?.trim() || 'Learning Session';
    return generatedTitle.replace(/^["']|["']$/g, ''); // Remove quotes
    
  } catch (error) {
    console.error('Error generating title from chat:', error);
    return 'Learning Session';
  }
} 