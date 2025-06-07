import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/supabase/server';
import OpenAI from 'openai';
import { checkWaitlistMode } from '@/lib/config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    // Check if we're in waitlist mode
    const waitlistCheck = checkWaitlistMode();
    if (waitlistCheck.isWaitlistMode && waitlistCheck.response) {
      return waitlistCheck.response;
    }

    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { text, voice = 'alloy', speed = 1 } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    try {
      // Generate speech using OpenAI TTS
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
        input: text,
        speed: speed
      });

      // Convert the response to a buffer
      const buffer = Buffer.from(await mp3.arrayBuffer());

      // Return the audio file
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      });

    } catch (openaiError) {
      console.error('OpenAI TTS error:', openaiError);
      
      // Fallback for development - return a simple error audio or mock response
      if (process.env.NODE_ENV === 'development') {
        console.warn('TTS failed in development, returning mock response');
        return NextResponse.json({
          error: 'TTS not available in development',
          mock: true
        }, { status: 503 });
      }
      
      return NextResponse.json({ 
        error: 'Text-to-speech failed',
        details: openaiError instanceof Error ? openaiError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 