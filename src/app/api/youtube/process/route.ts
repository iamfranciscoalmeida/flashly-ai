import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/supabase/server';

// YouTube URL parsing function
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

// Function to extract transcript using YouTube Transcript API
async function extractTranscript(videoId: string): Promise<{ text: string; segments: any[] }> {
  try {
    // For now, we'll use a placeholder response
    // In production, you would use libraries like youtube-transcript or YouTube Data API v3
    
    // Placeholder implementation - replace with actual transcript extraction
    const response = await fetch(`https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${process.env.YOUTUBE_API_KEY}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch video captions');
    }
    
    const data = await response.json();
    
    // This is a simplified implementation
    // You would need to implement actual transcript extraction logic here
    const placeholderTranscript = `This is a placeholder transcript for video ${videoId}. 
    In a real implementation, this would contain the actual video transcript 
    extracted using the YouTube Transcript API or similar service.
    
    The transcript would be segmented with timestamps for navigation and 
    would include all spoken content from the video.`;
    
    const segments = [
      { start: 0, end: 30, text: "Introduction and overview" },
      { start: 30, end: 120, text: "Main concepts explanation" },
      { start: 120, end: 300, text: "Detailed examples and applications" },
      { start: 300, end: 450, text: "Summary and key takeaways" }
    ];
    
    return {
      text: placeholderTranscript,
      segments
    };
  } catch (error) {
    console.error('Error extracting transcript:', error);
    throw new Error('Failed to extract video transcript');
  }
}

// Function to get video metadata
async function getVideoMetadata(videoId: string) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch video metadata');
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }
    
    const video = data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;
    
    return {
      title: snippet.title,
      description: snippet.description,
      channelTitle: snippet.channelTitle,
      publishedAt: snippet.publishedAt,
      duration: contentDetails.duration,
      thumbnailUrl: snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
      tags: snippet.tags || []
    };
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    throw new Error('Failed to fetch video metadata');
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { url, sessionId } = await request.json();

    if (!url || !sessionId) {
      return NextResponse.json({ error: 'URL and sessionId are required' }, { status: 400 });
    }

    // Extract video ID from URL
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Check if video already exists in database
    const { data: existingVideo, error: checkError } = await supabase
      .from('youtube_videos')
      .select('*')
      .eq('video_id', videoId)
      .eq('user_id', user.id)
      .single();

    if (!checkError && existingVideo) {
      // Video already processed, link to session and return
      await supabase
        .from('chat_sessions')
        .update({ youtube_video_id: existingVideo.id })
        .eq('id', sessionId);

      return NextResponse.json({
        success: true,
        video: {
          id: existingVideo.id,
          title: existingVideo.title,
          url: existingVideo.original_url,
          videoId: existingVideo.video_id
        }
      });
    }

    // Get video metadata and transcript
    const metadata = await getVideoMetadata(videoId);
    const { text: transcript, segments } = await extractTranscript(videoId);

    // Store video in database
    const { data: videoData, error: insertError } = await supabase
      .from('youtube_videos')
      .insert({
        user_id: user.id,
        video_id: videoId,
        title: metadata.title,
        description: metadata.description,
        channel_title: metadata.channelTitle,
        published_at: metadata.publishedAt,
        duration: metadata.duration,
        thumbnail_url: metadata.thumbnailUrl,
        original_url: url,
        transcript: transcript,
        transcript_segments: segments,
        tags: metadata.tags,
        status: 'completed'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save video data' }, { status: 500 });
    }

    // Link video to chat session
    await supabase
      .from('chat_sessions')
      .update({ youtube_video_id: videoData.id })
      .eq('id', sessionId);

    return NextResponse.json({
      success: true,
      video: {
        id: videoData.id,
        title: videoData.title,
        url: videoData.original_url,
        videoId: videoData.video_id,
        transcript: videoData.transcript,
        segments: videoData.transcript_segments
      }
    });

  } catch (error) {
    console.error('YouTube processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process YouTube video' },
      { status: 500 }
    );
  }
} 