import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../supabase/server';
import { processYouTubeVideo, processTextContent, processPDFContent } from '@/lib/content-processors';
import { CreateSessionRequest } from '@/types/study-session';
import pdf from 'pdf-parse';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateSessionRequest = await request.json();
    const { title, source_type, source_url, document_id, content_text } = body;

    let processedContent;

    try {
      switch (source_type) {
        case 'youtube':
          if (!source_url) {
            return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
          }
          processedContent = await processYouTubeVideo(source_url);
          break;

        case 'text':
          if (!content_text) {
            return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
          }
          processedContent = await processTextContent(content_text, title);
          break;

        case 'document':
        case 'pdf':
          if (!document_id) {
            return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
          }
          
          // Get document from database
          const { data: document, error: docError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', document_id)
            .eq('user_id', user.id)
            .single();

          if (docError || !document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
          }

          // Get file from storage
          const { data: fileData, error: storageError } = await supabase.storage
            .from('documents')
            .download(document.file_path);

          if (storageError || !fileData) {
            return NextResponse.json({ error: 'Failed to load document' }, { status: 500 });
          }

          // Extract text from PDF
          const buffer = await fileData.arrayBuffer();
          const pdfData = await pdf(Buffer.from(buffer));
          
          processedContent = await processPDFContent(pdfData.text, document.file_name);
          break;

        default:
          return NextResponse.json({ error: 'Invalid source type' }, { status: 400 });
      }
    } catch (processingError) {
      console.error('Content processing error:', processingError);
      return NextResponse.json({ 
        error: 'Failed to process content', 
        details: processingError instanceof Error ? processingError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Create study session
    const { data: session, error: sessionError } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        title: processedContent.title,
        subject: processedContent.auto_labels.subject,
        topic: processedContent.auto_labels.topic,
        level: processedContent.auto_labels.level,
        source_type,
        source_url,
        document_id,
        content_text: processedContent.text,
        auto_labels: processedContent.auto_labels,
        status: 'active'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json({ error: 'Failed to create study session' }, { status: 500 });
    }

    return NextResponse.json({ session }, { status: 201 });

  } catch (error) {
    console.error('Study session creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
    const subject = searchParams.get('subject');
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (subject) {
      query = query.eq('subject', subject);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Sessions fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    return NextResponse.json({ sessions });

  } catch (error) {
    console.error('Study sessions fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 