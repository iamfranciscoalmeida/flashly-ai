import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../../supabase/server';
import OpenAI from 'openai';
import { GenerateContentRequest } from '@/types/study-session';

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
    const { content_type, custom_instructions }: GenerateContentRequest = await request.json();

    if (!content_type) {
      return NextResponse.json({ error: 'Content type is required' }, { status: 400 });
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

    if (!session.content_text) {
      return NextResponse.json({ error: 'No content available for generation' }, { status: 400 });
    }

    // Generate content based on type
    let generatedContent;
    let title = '';

    try {
      switch (content_type) {
        case 'flashcards':
          generatedContent = await generateFlashcards(session.content_text, session.subject, custom_instructions);
          title = 'Generated Flashcards';
          break;
        case 'quiz':
          generatedContent = await generateQuiz(session.content_text, session.subject, custom_instructions);
          title = 'Generated Quiz';
          break;
        case 'summary':
          generatedContent = await generateSummary(session.content_text, session.subject, custom_instructions);
          title = 'Content Summary';
          break;
        case 'mindmap':
          generatedContent = await generateMindmap(session.content_text, session.subject, custom_instructions);
          title = 'Mind Map';
          break;
        case 'timeline':
          generatedContent = await generateTimeline(session.content_text, session.subject, custom_instructions);
          title = 'Timeline';
          break;
        default:
          return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
      }
    } catch (generateError) {
      console.error('Content generation error:', generateError);
      return NextResponse.json({ 
        error: 'Failed to generate content', 
        details: generateError instanceof Error ? generateError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Save generated content
    const { data: savedContent, error: saveError } = await supabase
      .from('session_content')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        content_type,
        title,
        content: generatedContent
      })
      .select()
      .single();

    if (saveError) {
      console.error('Content save error:', saveError);
      return NextResponse.json({ error: 'Failed to save generated content' }, { status: 500 });
    }

    return NextResponse.json({ content: savedContent });

  } catch (error) {
    console.error('Content generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateFlashcards(content: string, subject?: string, customInstructions?: string) {
  const prompt = `
  Generate flashcards based on the following content. Create 10-15 high-quality flashcards that cover the key concepts and facts.

  Subject: ${subject || 'General'}
  Content: ${content.substring(0, 3000)}...

  ${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}

  Format your response as a JSON object with this structure:
  {
    "flashcards": [
      {
        "id": "unique_id",
        "question": "Question text",
        "answer": "Answer text",
        "difficulty": "easy|medium|hard",
        "tags": ["tag1", "tag2"]
      }
    ]
  }

  Make questions clear and concise. Answers should be comprehensive but not too long.
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const result = response.choices[0]?.message?.content;
  if (!result) throw new Error('No response from OpenAI');

  return JSON.parse(result);
}

async function generateQuiz(content: string, subject?: string, customInstructions?: string) {
  const prompt = `
  Create a multiple-choice quiz based on the following content. Generate 8-12 questions with 4 options each.

  Subject: ${subject || 'General'}
  Content: ${content.substring(0, 3000)}...

  ${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}

  Format your response as a JSON object with this structure:
  {
    "questions": [
      {
        "id": "unique_id",
        "question": "Question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": 0,
        "explanation": "Why this answer is correct",
        "difficulty": "easy|medium|hard"
      }
    ]
  }

  Make sure questions test understanding, not just memorization. Include good distractors.
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2500,
  });

  const result = response.choices[0]?.message?.content;
  if (!result) throw new Error('No response from OpenAI');

  return JSON.parse(result);
}

async function generateSummary(content: string, subject?: string, customInstructions?: string) {
  const prompt = `
  Create a comprehensive summary of the following content. Include key points and main topics.

  Subject: ${subject || 'General'}
  Content: ${content.substring(0, 4000)}...

  ${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}

  Format your response as a JSON object with this structure:
  {
    "summary": "Main summary paragraph",
    "key_points": ["Point 1", "Point 2", "Point 3", ...],
    "main_topics": ["Topic 1", "Topic 2", "Topic 3", ...],
    "difficulty_level": "easy|medium|hard"
  }

  Make the summary concise but comprehensive, covering all important aspects.
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 1500,
  });

  const result = response.choices[0]?.message?.content;
  if (!result) throw new Error('No response from OpenAI');

  return JSON.parse(result);
}

async function generateMindmap(content: string, subject?: string, customInstructions?: string) {
  const prompt = `
  Create a mind map structure based on the following content. Organize information hierarchically.

  Subject: ${subject || 'General'}
  Content: ${content.substring(0, 3000)}...

  ${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}

  Format your response as a JSON object with this structure:
  {
    "central_topic": "Main topic",
    "branches": [
      {
        "title": "Branch title",
        "subtopics": ["Subtopic 1", "Subtopic 2", ...],
        "connections": ["Connection to other branches"]
      }
    ]
  }

  Create a clear hierarchy with meaningful connections between concepts.
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 1500,
  });

  const result = response.choices[0]?.message?.content;
  if (!result) throw new Error('No response from OpenAI');

  return JSON.parse(result);
}

async function generateTimeline(content: string, subject?: string, customInstructions?: string) {
  const prompt = `
  Create a timeline based on the following content. Identify chronological events or sequential processes.

  Subject: ${subject || 'General'}
  Content: ${content.substring(0, 3000)}...

  ${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}

  Format your response as a JSON object with this structure:
  {
    "events": [
      {
        "date": "Date or sequence indicator",
        "title": "Event title",
        "description": "Event description",
        "importance": "high|medium|low"
      }
    ]
  }

  If no clear chronological events exist, create a process timeline or conceptual sequence.
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 1500,
  });

  const result = response.choices[0]?.message?.content;
  if (!result) throw new Error('No response from OpenAI');

  return JSON.parse(result);
} 