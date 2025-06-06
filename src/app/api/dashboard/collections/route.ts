import { createClient } from '../../../../supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Fetching collections...');
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log('❌ API: Unauthorized - no user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ API: User authenticated for collections fetch:', user.id);

    // Create AI organization service with the server-side supabase client
    const aiService = new (await import('@/lib/ai-organization-service')).AIOrganizationService(supabase);
    // Fetch collections with stats
    const collections = await aiService.getCollectionsWithStats(user.id);

    console.log(`✅ API: Successfully fetched ${collections.length} collections`);

    return NextResponse.json({
      success: true,
      collections
    });
  } catch (error) {
    console.error('❌ API: Error fetching collections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
} 