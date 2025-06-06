import { useCallback, useRef, useState } from 'react';

interface TranscriptionResult {
  text: string;
  confidence: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    probability?: number;
  }>;
}

interface UseStreamingTranscriberProps {
  apiEndpoint?: string;
  useDeepgram?: boolean;
  onTranscription?: (result: TranscriptionResult) => void;
  onError?: (error: Error) => void;
}

export function useStreamingTranscriber({
  apiEndpoint = '/api/voice/transcribe-streaming',
  useDeepgram = false,
  onTranscription,
  onError
}: UseStreamingTranscriberProps = {}) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [lastTranscription, setLastTranscription] = useState<TranscriptionResult | null>(null);
  const transcriptionQueueRef = useRef<Blob[]>([]);
  const processingRef = useRef(false);

  // Transcribe audio blob
  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<TranscriptionResult | null> => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'speech.webm');
      formData.append('useDeepgram', String(useDeepgram));

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        text: result.text || '',
        confidence: result.confidence || 1,
        words: result.words
      };
    } catch (error) {
      console.error('Transcription error:', error);
      onError?.(error as Error);
      return null;
    }
  }, [apiEndpoint, useDeepgram, onError]);

  // Process transcription queue
  const processQueue = useCallback(async () => {
    if (processingRef.current || transcriptionQueueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    setIsTranscribing(true);

    while (transcriptionQueueRef.current.length > 0) {
      const audioBlob = transcriptionQueueRef.current.shift()!;
      const result = await transcribeAudio(audioBlob);

      if (result) {
        setLastTranscription(result);
        onTranscription?.(result);
      }
    }

    processingRef.current = false;
    setIsTranscribing(false);
  }, [transcribeAudio, onTranscription]);

  // Add audio to transcription queue
  const addToQueue = useCallback((audioBlob: Blob) => {
    transcriptionQueueRef.current.push(audioBlob);
    processQueue();
  }, [processQueue]);

  // Transcribe Float32Array (from VAD)
  const transcribeFloat32Array = useCallback(async (audioData: Float32Array, sampleRate: number = 16000) => {
    // Convert Float32Array to Blob using the utility from ContinuousRecorder
    const { float32ArrayToBlob } = await import('./ContinuousRecorder');
    const audioBlob = float32ArrayToBlob(audioData, sampleRate);
    addToQueue(audioBlob);
  }, [addToQueue]);

  // Clear transcription queue
  const clearQueue = useCallback(() => {
    transcriptionQueueRef.current = [];
  }, []);

  return {
    isTranscribing,
    lastTranscription,
    addToQueue,
    transcribeFloat32Array,
    clearQueue
  };
}

// Fallback: Browser-based speech recognition
export class BrowserSpeechRecognition {
  private recognition: any;
  private isListening: boolean = false;
  private onResult?: (result: TranscriptionResult) => void;
  private onError?: (error: Error) => void;

  constructor(onResult?: (result: TranscriptionResult) => void, onError?: (error: Error) => void) {
    this.onResult = onResult;
    this.onError = onError;

    // Check if speech recognition is available
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Browser speech recognition not available');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.setupRecognition();
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript;
      const confidence = lastResult[0].confidence || 1;

      const result: TranscriptionResult = {
        text: transcript,
        confidence,
        words: [] // Browser API doesn't provide word-level timestamps
      };

      this.onResult?.(result);
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.onError?.(new Error(`Speech recognition error: ${event.error}`));
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Auto-restart if needed
      if (this.isListening) {
        this.start();
      }
    };
  }

  start() {
    if (!this.recognition || this.isListening) return;

    try {
      this.recognition.start();
      this.isListening = true;
      console.log('Browser speech recognition started');
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.onError?.(error as Error);
    }
  }

  stop() {
    if (!this.recognition || !this.isListening) return;

    try {
      this.recognition.stop();
      this.isListening = false;
      console.log('Browser speech recognition stopped');
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
  }

  isAvailable(): boolean {
    return !!this.recognition;
  }
}

// Utility to merge overlapping transcriptions
export function mergeTranscriptions(
  previous: TranscriptionResult,
  current: TranscriptionResult,
  overlapThreshold: number = 0.5
): TranscriptionResult {
  if (!previous.text) return current;
  if (!current.text) return previous;

  // Simple merge strategy - could be improved with more sophisticated algorithms
  const prevWords = previous.text.toLowerCase().split(' ');
  const currWords = current.text.toLowerCase().split(' ');

  // Find overlap
  let overlapStart = -1;
  for (let i = Math.max(0, prevWords.length - currWords.length); i < prevWords.length; i++) {
    let matches = true;
    for (let j = 0; j < Math.min(currWords.length, prevWords.length - i); j++) {
      if (prevWords[i + j] !== currWords[j]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      overlapStart = i;
      break;
    }
  }

  // Merge based on overlap
  let mergedText: string;
  if (overlapStart >= 0) {
    const prevPart = prevWords.slice(0, overlapStart).join(' ');
    mergedText = prevPart + (prevPart ? ' ' : '') + current.text;
  } else {
    // No overlap found, just concatenate
    mergedText = previous.text + ' ' + current.text;
  }

  return {
    text: mergedText,
    confidence: (previous.confidence + current.confidence) / 2,
    words: [...(previous.words || []), ...(current.words || [])]
  };
}