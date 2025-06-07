import { NextResponse } from 'next/server';
import { createClient } from '@/supabase/server';

export async function POST() {
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

    // Delete Google tokens
    const { error: deleteError } = await supabase
      .from('user_google_tokens')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting tokens:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect Google Drive' },
        { status: 500 }
      );
    }

    // Optionally, clean up linked files (or keep them for reference)
    // await supabase
    //   .from('linked_drive_files')
    //   .delete()
    //   .eq('user_id', user.id);

    return NextResponse.json({
      message: 'Google Drive disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting Google Drive:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Google Drive' },
      { status: 500 }
    );
  }
}