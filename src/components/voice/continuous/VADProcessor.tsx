import { useCallback, useEffect, useRef, useState } from 'react';
import { MicVAD, RealTimeVADOptions } from '@ricky0123/vad-web';

export interface VADConfig {
  silenceThreshold?: number;     // -45dB default
  silenceDuration?: number;      // 800ms default
  speechThreshold?: number;      // -30dB default
  sampleRate?: number;          // 16000Hz for Whisper
  onSpeechStart?: () => void;
  onSpeechEnd?: (audio: Float32Array) => void;
  onVADMisfire?: () => void;
  onError?: (error: Error) => void;
}

interface UseVADProcessorProps extends VADConfig {
  enabled?: boolean;
}

export function useVADProcessor({
  enabled = false,
  silenceThreshold = -45,
  silenceDuration = 800,
  speechThreshold = -30,
  sampleRate = 16000,
  onSpeechStart,
  onSpeechEnd,
  onVADMisfire,
  onError
}: UseVADProcessorProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [vadConfidence, setVadConfidence] = useState(0);
  const vadRef = useRef<MicVAD | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize VAD
  const initialize = useCallback(async () => {
    if (isInitialized || vadRef.current) return;

    try {
      // Create audio context for level monitoring
      audioContextRef.current = new AudioContext({ sampleRate });
      
      // Configure VAD options
      const vadOptions: Partial<RealTimeVADOptions> = {
        onSpeechStart: () => {
          console.log('VAD: Speech detected');
          setIsListening(true);
          onSpeechStart?.();
        },
        onSpeechEnd: (audio) => {
          console.log('VAD: Speech ended');
          setIsListening(false);
          onSpeechEnd?.(audio);
        },
        onVADMisfire: () => {
          console.log('VAD: Misfire');
          setIsListening(false);
          onVADMisfire?.();
        },
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.35,
        redemptionFrames: 8,
        frameSamples: 1536,
        preSpeechPadFrames: 1,
        minSpeechFrames: 4,
        submitUserSpeechOnPause: true
      };

      // Create VAD instance
      vadRef.current = await MicVAD.new(vadOptions);
      
      // Setup audio level monitoring
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      setIsInitialized(true);
      console.log('VAD initialized successfully');
    } catch (error) {
      console.error('Failed to initialize VAD:', error);
      onError?.(error as Error);
      setIsInitialized(false);
    }
  }, [isInitialized, sampleRate, onSpeechStart, onSpeechEnd, onVADMisfire, onError]);

  // Monitor audio levels
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = Math.min(100, (average / 255) * 100);
    setAudioLevel(normalizedLevel);

    // Calculate VAD confidence based on audio level and thresholds
    const dbLevel = 20 * Math.log10(average / 255);
    if (dbLevel > speechThreshold) {
      setVadConfidence(Math.min(1, (dbLevel - speechThreshold) / 10));
    } else {
      setVadConfidence(0);
    }

    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
  }, [speechThreshold]);

  // Start VAD
  const start = useCallback(async () => {
    if (!enabled) return;
    
    await initialize();
    
    if (vadRef.current) {
      vadRef.current.start();
      monitorAudioLevel();
      console.log('VAD started');
    }
  }, [enabled, initialize, monitorAudioLevel]);

  // Stop VAD
  const stop = useCallback(() => {
    if (vadRef.current) {
      vadRef.current.pause();
      setIsListening(false);
      console.log('VAD stopped');
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    stop();
    
    if (vadRef.current) {
      vadRef.current.destroy();
      vadRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsInitialized(false);
    setAudioLevel(0);
    setVadConfidence(0);
  }, [stop]);

  // Effect to handle enabled state changes
  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }

    return () => {
      if (enabled) {
        stop();
      }
    };
  }, [enabled, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isInitialized,
    isListening,
    audioLevel,
    vadConfidence,
    start,
    stop,
    cleanup
  };
}

// Custom VAD implementation as fallback (using Web Audio API)
export class CustomVADProcessor {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private processor: ScriptProcessorNode | AudioWorkletNode | null = null;
  private isActive: boolean = false;
  private speechStartTime: number = 0;
  private silenceStartTime: number = 0;
  private config: Required<VADConfig>;

  constructor(config: VADConfig) {
    this.config = {
      silenceThreshold: config.silenceThreshold ?? -45,
      silenceDuration: config.silenceDuration ?? 800,
      speechThreshold: config.speechThreshold ?? -30,
      sampleRate: config.sampleRate ?? 16000,
      onSpeechStart: config.onSpeechStart ?? (() => {}),
      onSpeechEnd: config.onSpeechEnd ?? (() => {}),
      onVADMisfire: config.onVADMisfire ?? (() => {}),
      onError: config.onError ?? (() => {})
    };

    this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // Create processor (prefer AudioWorklet for better performance)
    if ('AudioWorkletNode' in window) {
      this.setupAudioWorklet();
    } else {
      this.setupScriptProcessor();
    }
  }

  private async setupAudioWorklet() {
    try {
      // In a real implementation, you'd load a separate worklet file
      // For now, we'll use ScriptProcessor as fallback
      this.setupScriptProcessor();
    } catch (error) {
      this.setupScriptProcessor();
    }
  }

  private setupScriptProcessor() {
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = this.processAudio.bind(this);
  }

  private processAudio(event: AudioProcessingEvent) {
    const inputData = event.inputBuffer.getChannelData(0);
    const rms = this.calculateRMS(inputData);
    const dbLevel = 20 * Math.log10(rms);

    if (dbLevel > this.config.speechThreshold && !this.isActive) {
      this.isActive = true;
      this.speechStartTime = Date.now();
      this.config.onSpeechStart();
    } else if (dbLevel < this.config.silenceThreshold && this.isActive) {
      if (this.silenceStartTime === 0) {
        this.silenceStartTime = Date.now();
      } else if (Date.now() - this.silenceStartTime > this.config.silenceDuration) {
        this.isActive = false;
        this.silenceStartTime = 0;
        
        // Extract the audio data
        const audioData = new Float32Array(inputData);
        this.config.onSpeechEnd(audioData);
      }
    } else if (dbLevel > this.config.silenceThreshold) {
      this.silenceStartTime = 0;
    }
  }

  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  async start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      if (this.processor) {
        this.analyser.connect(this.processor);
        this.processor.connect(this.audioContext.destination);
      }
    } catch (error) {
      this.config.onError(error as Error);
    }
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect();
    }
    if (this.analyser) {
      this.analyser.disconnect();
    }
  }

  destroy() {
    this.stop();
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}