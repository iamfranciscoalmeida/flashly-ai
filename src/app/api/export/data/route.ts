import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { options, format } = await request.json();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const exportData: any = {};

    // Export flashcards
    if (options.flashcards) {
      const { data: flashcards } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user.id);
      
      exportData.flashcards = flashcards || [];
    }

    // Export study progress
    if (options.study_progress) {
      const { data: progress } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id);
      
      exportData.study_progress = progress || [];
    }

    // Export user profile
    if (options.user_profile) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      exportData.user_profile = {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        ...profile
      };
    }

    // Export activity logs
    if (options.activity_logs) {
      const { data: activities } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1000);
      
      exportData.activity_logs = activities || [];
    }

    // Export settings
    if (options.settings) {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      exportData.settings = settings || {};
    }

    // Add export metadata
    exportData.export_info = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      format: format,
      version: '1.0'
    };

    let responseData: string;
    let contentType: string;
    let filename: string;

    if (format === 'json') {
      responseData = JSON.stringify(exportData, null, 2);
      contentType = 'application/json';
      filename = `studywith-ai-export-${new Date().toISOString().split('T')[0]}.json`;
    } else if (format === 'csv') {
      // Convert to CSV format (simplified)
      const csvRows: string[] = [];
      
      // Add headers
      csvRows.push('Type,ID,Title,Content,Created At');
      
      // Add flashcards
      if (exportData.flashcards) {
        exportData.flashcards.forEach((card: any) => {
          csvRows.push(`Flashcard,${card.id},"${card.title || ''}","${card.content || ''}",${card.created_at}`);
        });
      }
      
      responseData = csvRows.join('\n');
      contentType = 'text/csv';
      filename = `studywith-ai-export-${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      return NextResponse.json(
        { error: 'Invalid format' },
        { status: 400 }
      );
    }

    return new NextResponse(responseData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 