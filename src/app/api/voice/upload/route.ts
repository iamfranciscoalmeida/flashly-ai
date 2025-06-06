import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;
    const messageId = formData.get('messageId') as string;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    try {
      // Generate a unique file name
      const timestamp = Date.now();
      const fileName = `${user.id}/${sessionId}/${messageId || timestamp}.${audioFile.type.split('/')[1]}`;
      
      // Convert File to ArrayBuffer for upload
      const arrayBuffer = await audioFile.arrayBuffer();
      
      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-sessions')
        .upload(fileName, arrayBuffer, {
          contentType: audioFile.type,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return NextResponse.json({ 
          error: 'Failed to upload audio file',
          details: uploadError.message
        }, { status: 500 });
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('voice-sessions')
        .getPublicUrl(fileName);

      return NextResponse.json({
        success: true,
        audioUrl: urlData.publicUrl,
        fileName: fileName,
        size: audioFile.size
      });

    } catch (storageError) {
      console.error('File processing error:', storageError);
      return NextResponse.json({ 
        error: 'Failed to process audio file',
        details: storageError instanceof Error ? storageError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Voice upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    
    if (!fileName) {
      return NextResponse.json({ error: 'File name required' }, { status: 400 });
    }

    // Verify the file belongs to the current user
    if (!fileName.startsWith(user.id + '/')) {
      return NextResponse.json({ error: 'Unauthorized file access' }, { status: 403 });
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('voice-sessions')
      .remove([fileName]);

    if (deleteError) {
      console.error('Storage delete error:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete audio file',
        details: deleteError.message
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Voice delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 