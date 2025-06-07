import { NextRequest, NextResponse } from 'next/server';
import { GoogleDriveService } from '@/lib/google-drive-service';
import { createClient } from '@/supabase/server';

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('No text could be extracted from the PDF');
    }
    
    // Clean up the extracted text
    let cleanedText = data.text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/Page \d+ of \d+/gi, '')
      .replace(/^\d+\s*$/gm, '')
      .replace(/\f/g, '\n')
      .trim();
    
    return cleanedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { fileId, sessionId } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Get valid access token
    const accessToken = await GoogleDriveService.getValidAccessToken(user.id);
    
    // Initialize Drive service
    const driveService = new GoogleDriveService(accessToken, user.id);
    
    // Get file metadata
    const fileMetadata = await driveService.getFile(fileId);
    
    // Check if file already exists in documents table
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('*')
      .eq('drive_file_id', fileId)
      .eq('user_id', user.id)
      .single();

    if (existingDoc) {
      // If document already exists and has extracted text, return it
      if (existingDoc.extracted_text) {
        return NextResponse.json({
          document: existingDoc,
          message: 'Document already loaded'
        });
      }
    }

    let extractedText = '';
    
    // Extract text based on file type
    if (fileMetadata.mimeType === 'application/pdf') {
      // Download and extract text from PDF
      const buffer = await driveService.downloadFile(fileId, fileMetadata.mimeType!);
      extractedText = await extractTextFromPDF(buffer);
    } else if (fileMetadata.mimeType?.startsWith('application/vnd.google-apps.')) {
      // Export Google Workspace files as text
      extractedText = await driveService.exportAsText(fileId);
    } else if (fileMetadata.mimeType?.startsWith('text/')) {
      // For text files, download and convert to string
      const buffer = await driveService.downloadFile(fileId, fileMetadata.mimeType);
      extractedText = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    // Create or update document record
    const documentData = {
      user_id: user.id,
      file_name: fileMetadata.name || 'Untitled',
      file_path: '', // Not used for Drive files
      file_size: parseInt(fileMetadata.size || '0'),
      file_type: fileMetadata.mimeType || 'unknown',
      status: 'completed',
      source_type: 'google_drive',
      drive_file_id: fileId,
      drive_url: fileMetadata.webViewLink || '',
      extracted_text: extractedText,
    };

    let documentId;
    
    if (existingDoc) {
      // Update existing document
      const { data, error } = await supabase
        .from('documents')
        .update(documentData)
        .eq('id', existingDoc.id)
        .select()
        .single();
        
      if (error) throw error;
      documentId = data.id;
    } else {
      // Create new document
      const { data, error } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single();
        
      if (error) throw error;
      documentId = data.id;
    }

    // Link to chat session if provided
    if (sessionId) {
      await supabase
        .from('chat_sessions')
        .update({ document_id: documentId })
        .eq('id', sessionId);
    }

    // Store in linked_drive_files table
    await supabase
      .from('linked_drive_files')
      .upsert({
        user_id: user.id,
        file_id: fileId,
        name: fileMetadata.name || 'Untitled',
        mime_type: fileMetadata.mimeType || 'unknown',
        drive_url: fileMetadata.webViewLink || '',
        linked_to_session: sessionId,
        size_bytes: parseInt(fileMetadata.size || '0'),
        last_modified_at: fileMetadata.modifiedTime,
      }, {
        onConflict: 'user_id,file_id'
      });

    return NextResponse.json({
      document: {
        id: documentId,
        file_name: fileMetadata.name,
        drive_url: fileMetadata.webViewLink,
        extracted_text: extractedText,
      },
      message: 'Document loaded successfully'
    });
  } catch (error: any) {
    console.error('Error fetching Drive file:', error);
    
    if (error.message === 'No Google Drive connection found') {
      return NextResponse.json(
        { error: 'Google Drive not connected' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    );
  }
}