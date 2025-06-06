import { useCallback, useEffect, useRef, useState } from 'react';

interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

interface UseTTSPlayerProps {
  apiEndpoint?: string;
  defaultVoice?: string;
  defaultSpeed?: number;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onError?: (error: Error) => void;
}

export function useTTSPlayer({
  apiEndpoint = '/api/voice/speak-streaming',
  defaultVoice = 'alloy',
  defaultSpeed = 1.0,
  onPlaybackStart,
  onPlaybackEnd,
  onError
}: UseTTSPlayerProps = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const ttsQueueRef = useRef<TTSRequest[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const processingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Generate speech from text
  const generateSpeech = useCallback(async (request: TTSRequest): Promise<string | null> => {
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: request.text,
          voice: request.voice || defaultVoice,
          speed: request.speed || defaultSpeed,
          response_format: 'mp3'
        })
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.error('TTS generation error:', error);
      onError?.(error as Error);
      return null;
    }
  }, [apiEndpoint, defaultVoice, defaultSpeed, onError]);

  // Play audio URL
  const playAudio = useCallback(async (audioUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      
      // Ensure audio context is resumed (for mobile browsers)
      const context = initAudioContext();
      if (context.state === 'suspended') {
        context.resume();
      }

      audio.onloadeddata = () => {
        console.log('Audio loaded, starting playback');
      };

      audio.onplay = () => {
        setIsPlaying(true);
        currentAudioRef.current = audio;
      };

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl); // Clean up
        currentAudioRef.current = null;
        resolve();
      };

      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl); // Clean up
        currentAudioRef.current = null;
        console.error('Audio playback error:', error);
        reject(new Error('Audio playback failed'));
      };

      audio.play().catch((error) => {
        console.error('Failed to play audio:', error);
        reject(error);
      });
    });
  }, [initAudioContext]);

  // Process TTS queue
  const processQueue = useCallback(async () => {
    if (processingRef.current || ttsQueueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    onPlaybackStart?.();

    while (ttsQueueRef.current.length > 0) {
      const request = ttsQueueRef.current.shift()!;
      setCurrentText(request.text);
      request.onStart?.();

      const audioUrl = await generateSpeech(request);
      
      if (audioUrl) {
        try {
          await playAudio(audioUrl);
        } catch (error) {
          console.error('Playback error:', error);
          onError?.(error as Error);
        }
      }

      request.onEnd?.();
    }

    setIsPlaying(false);
    setCurrentText('');
    processingRef.current = false;
    onPlaybackEnd?.();
  }, [generateSpeech, playAudio, onPlaybackStart, onPlaybackEnd, onError]);

  // Add text to TTS queue
  const speak = useCallback((text: string, options?: Omit<TTSRequest, 'text'>) => {
    if (!text.trim()) return;

    const request: TTSRequest = {
      text,
      ...options
    };

    ttsQueueRef.current.push(request);
    processQueue();
  }, [processQueue]);

  // Stop current playback
  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
    }

    // Clear the queue
    ttsQueueRef.current = [];
    processingRef.current = false;
    setIsPlaying(false);
    setCurrentText('');
  }, []);

  // Pause current playback
  const pause = useCallback(() => {
    if (currentAudioRef.current && !currentAudioRef.current.paused) {
      currentAudioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Resume current playback
  const resume = useCallback(() => {
    if (currentAudioRef.current && currentAudioRef.current.paused) {
      currentAudioRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stop]);

  return {
    isPlaying,
    currentText,
    speak,
    stop,
    pause,
    resume,
    queueLength: ttsQueueRef.current.length
  };
}

// Browser TTS fallback
export class BrowserTTS {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();
  }

  private loadVoices() {
    this.voices = this.synth.getVoices();
    
    // Chrome loads voices asynchronously
    if (this.voices.length === 0) {
      this.synth.addEventListener('voiceschanged', () => {
        this.voices = this.synth.getVoices();
      });
    }
  }

  speak(text: string, options?: {
    voice?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
  }) {
    // Cancel any ongoing speech
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice
    if (options?.voice) {
      const voice = this.voices.find(v => v.name.includes(options.voice!));
      if (voice) {
        utterance.voice = voice;
      }
    }

    // Set properties
    utterance.rate = options?.rate || 1;
    utterance.pitch = options?.pitch || 1;
    utterance.volume = options?.volume || 1;

    // Set callbacks
    utterance.onstart = () => {
      console.log('Browser TTS started');
      options?.onStart?.();
    };

    utterance.onend = () => {
      console.log('Browser TTS ended');
      this.currentUtterance = null;
      options?.onEnd?.();
    };

    utterance.onerror = (event) => {
      console.error('Browser TTS error:', event);
      this.currentUtterance = null;
      options?.onError?.(new Error(`TTS error: ${event.error}`));
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  stop() {
    this.synth.cancel();
    this.currentUtterance = null;
  }

  pause() {
    this.synth.pause();
  }

  resume() {
    this.synth.resume();
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  isAvailable(): boolean {
    return 'speechSynthesis' in window;
  }
}

// Utility to split text for better TTS performance
export function splitTextForTTS(text: string, maxLength: number = 200): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}