import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/supabase/server';
import OpenAI from 'openai';

// Initialize OpenAI if API key is available
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Available voices for OpenAI TTS
type VoiceOption = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { text, voice = 'alloy', speed = 1.0, response_format = 'mp3', test } = await request.json();

    // Handle test requests
    if (test) {
      return NextResponse.json({
        message: 'TTS API is working',
        test: true,
        availableVoices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
        apiConfigured: !!process.env.OPENAI_API_KEY
      });
    }

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Validate voice option
    const validVoices: VoiceOption[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const selectedVoice = validVoices.includes(voice as VoiceOption) ? voice as VoiceOption : 'alloy';

    // Validate speed (0.25 to 4.0)
    const validSpeed = Math.max(0.25, Math.min(4.0, speed));

    console.log('Generating TTS:', {
      textLength: text.length,
      voice: selectedVoice,
      speed: validSpeed,
      format: response_format
    });

    // Check if OpenAI is configured
    if (!openai) {
      return NextResponse.json({
        error: 'TTS service not configured',
        fallbackToBrowser: true
      }, { status: 503 });
    }

    try {
      // Generate speech using OpenAI TTS
      const mp3Response = await openai.audio.speech.create({
        model: 'tts-1-hd', // Using HD model for better quality
        voice: selectedVoice,
        input: text,
        speed: validSpeed
      });

      // Get audio data as buffer
      const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());

      // Log generation details
      console.log('TTS generation successful:', {
        bufferSize: audioBuffer.length,
        estimatedDuration: audioBuffer.length / (128000 / 8) // Rough estimate based on bitrate
      });

      // Return audio stream with proper headers
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600',
          'X-Voice-Used': selectedVoice,
          'X-Speed-Used': validSpeed.toString()
        }
      });
    } catch (openaiError: any) {
      console.error('OpenAI TTS error:', openaiError);
      
      // Check if we hit rate limits
      if (openaiError.status === 429) {
        return NextResponse.json({
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: openaiError.headers?.['retry-after'] || 60
        }, { status: 429 });
      }

      // Check if the text is too long
      if (openaiError.status === 400 && openaiError.message?.includes('maximum')) {
        return NextResponse.json({
          error: 'Text is too long. Please split into smaller chunks.',
          maxLength: 4096
        }, { status: 400 });
      }

      throw openaiError;
    }
  } catch (error: any) {
    console.error('TTS route error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS endpoint for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}