import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/supabase/server';
import OpenAI from 'openai';
import { createClient as createDeepgramClient } from '@deepgram/sdk';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Initialize Deepgram if API key is available
const deepgram = process.env.DEEPGRAM_API_KEY 
  ? createDeepgramClient(process.env.DEEPGRAM_API_KEY)
  : null;

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

    // Get form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const useDeepgram = formData.get('useDeepgram') === 'true';

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log('Transcribing audio:', {
      fileName: audioFile.name,
      size: audioFile.size,
      type: audioFile.type,
      useDeepgram
    });

    // Use Deepgram if requested and available
    if (useDeepgram && deepgram) {
      try {
        const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
        
        const { result } = await deepgram.listen.prerecorded.transcribeFile(
          audioBuffer,
          {
            model: 'nova-2',
            language: 'en-US',
            punctuate: true,
            utterances: true,
            smart_format: true,
            diarize: false,
            mimetype: audioFile.type
          }
        );

        const transcript = result?.results?.channels?.[0]?.alternatives?.[0];
        
        if (!transcript) {
          throw new Error('No transcription result from Deepgram');
        }

        return NextResponse.json({
          text: transcript.transcript || '',
          confidence: transcript.confidence || 1,
          words: transcript.words?.map((w: any) => ({
            word: w.word,
            start: w.start,
            end: w.end,
            confidence: w.confidence
          })) || []
        });
      } catch (deepgramError) {
        console.error('Deepgram transcription error:', deepgramError);
        // Fall through to OpenAI
      }
    }

    // Use OpenAI Whisper as primary or fallback
    try {
      // Convert File to proper format for OpenAI
      const audioBuffer = await audioFile.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: audioFile.type });
      
      // Create a File object with proper name
      const file = new File([audioBlob], 'audio.webm', { type: audioFile.type });

      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        response_format: 'verbose_json',
        language: 'en'
      });

      // Extract detailed information if available
      const response: any = {
        text: transcription.text,
        confidence: 1, // Whisper doesn't provide confidence scores
        words: []
      };

      // Add word-level timestamps if available
      if ('words' in transcription && Array.isArray(transcription.words)) {
        response.words = transcription.words.map((w: any) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          probability: w.probability
        }));
        
        // Calculate average confidence from word probabilities
        if (response.words.length > 0) {
          const avgProbability = response.words.reduce((sum: number, w: any) => 
            sum + (w.probability || 1), 0) / response.words.length;
          response.confidence = avgProbability;
        }
      }

      // Log transcription for debugging
      console.log('Transcription successful:', {
        textLength: response.text.length,
        wordCount: response.words.length,
        confidence: response.confidence
      });

      return NextResponse.json(response);
    } catch (openaiError: any) {
      console.error('OpenAI transcription error:', openaiError);
      
      // If both services fail, return browser-based transcription hint
      return NextResponse.json({
        text: '',
        confidence: 0,
        error: 'Transcription services unavailable',
        fallbackToBrowser: true
      }, { status: 503 });
    }
  } catch (error: any) {
    console.error('Transcription route error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle Deepgram fallback errors
async function handleTranscriptionFallback(audioFile: File) {
  try {
    // This is a placeholder for browser-based fallback
    // In practice, this would be handled client-side
    return NextResponse.json({
      text: '',
      confidence: 0,
      error: 'Primary transcription failed',
      fallbackToBrowser: true
    }, { status: 503 });
  } catch (error) {
    console.error('Fallback transcription error:', error);
    throw error;
  }
}