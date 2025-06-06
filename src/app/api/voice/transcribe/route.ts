import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    try {
      // Convert File to a format that OpenAI accepts
      const audioBuffer = await audioFile.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: audioFile.type });
      
      // Create a File object for OpenAI
      const audioForOpenAI = new File([audioBlob], audioFile.name, { type: audioFile.type });

      // Transcribe using OpenAI Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: audioForOpenAI,
        model: 'whisper-1',
        response_format: 'json',
        language: 'en' // Can be made configurable
      });

      return NextResponse.json({
        text: transcription.text,
        success: true
      });

    } catch (openaiError) {
      console.error('OpenAI transcription error:', openaiError);
      
      // Fallback to a mock response for development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Using mock transcription for development');
        return NextResponse.json({
          text: "This is a mock transcription for development purposes.",
          success: true,
          mock: true
        });
      }
      
      return NextResponse.json({ 
        error: 'Transcription failed',
        details: openaiError instanceof Error ? openaiError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Transcription API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 