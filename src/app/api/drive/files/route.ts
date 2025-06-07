import { NextRequest, NextResponse } from 'next/server';
import { GoogleDriveService } from '@/lib/google-drive-service';
import { createClient } from '@/supabase/server';

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || undefined;
    const mimeType = searchParams.get('mimeType') || undefined;
    const folderId = searchParams.get('folderId') || undefined;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined;
    const pageToken = searchParams.get('pageToken') || undefined;

    // Get valid access token
    const accessToken = await GoogleDriveService.getValidAccessToken(user.id);
    
    // Initialize Drive service
    const driveService = new GoogleDriveService(accessToken, user.id);
    
    // List files
    const result = await driveService.listFiles({
      query,
      mimeType,
      folderId,
      pageSize,
      pageToken,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error listing Drive files:', error);
    
    if (error.message === 'No Google Drive connection found') {
      return NextResponse.json(
        { error: 'Google Drive not connected' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}