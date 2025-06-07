import { useCallback, useEffect, useRef, useState } from 'react';

interface SimpleVADProps {
  enabled: boolean;
  speechThreshold?: number;      // dB level for speech detection
  silenceThreshold?: number;     // dB level for silence
  silenceDuration?: number;      // ms of silence before ending speech
  minSpeechDuration?: number;    // minimum ms of speech required
  onSpeechStart?: () => void;
  onSpeechEnd?: (audio: Float32Array) => void;
  onError?: (error: Error) => void;
}

export function useSimpleVAD({
  enabled,
  speechThreshold = -35,
  silenceThreshold = -45,
  silenceDuration = 2000,
  minSpeechDuration = 500,
  onSpeechStart,
  onSpeechEnd,
  onError
}: SimpleVADProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Speech detection state
  const speechStartTimeRef = useRef<number>(0);
  const lastSpeechTimeRef = useRef<number>(0);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context and microphone
  const initialize = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      streamRef.current = stream;
      console.log('✅ Simple VAD initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Simple VAD initialization failed:', error);
      onError?.(error as Error);
      return false;
    }
  }, [onError]);

  // Calculate audio level in dB
  const calculateAudioLevel = useCallback((): number => {
    if (!analyserRef.current) return -100;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = Math.min(100, (average / 255) * 100);
    setAudioLevel(normalizedLevel);
    
    // Convert to dB
    const dbLevel = average > 0 ? 20 * Math.log10(average / 255) : -100;
    return dbLevel;
  }, []);

  // Capture audio data for later transcription
  const captureAudioData = useCallback(() => {
    if (!audioContextRef.current || !analyserRef.current) return;
    
    const bufferLength = analyserRef.current.fftSize;
    const dataArray = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(dataArray);
    
    audioBufferRef.current.push(new Float32Array(dataArray));
  }, []);

  // Main monitoring loop
  const monitorAudio = useCallback(() => {
    if (!enabled) return;
    
    const currentTime = Date.now();
    const audioLevel = calculateAudioLevel();
    
    // Capture audio data while monitoring
    captureAudioData();
    
    if (audioLevel > speechThreshold && !isSpeaking) {
      // Speech detected
      console.log(`🎙️ [${new Date().toLocaleTimeString()}] SIMPLE VAD: Speech detected (${audioLevel.toFixed(1)}dB)`);
      setIsSpeaking(true);
      speechStartTimeRef.current = currentTime;
      lastSpeechTimeRef.current = currentTime;
      audioBufferRef.current = []; // Start fresh buffer
      onSpeechStart?.();
      
    } else if (audioLevel > speechThreshold && isSpeaking) {
      // Continue speech
      lastSpeechTimeRef.current = currentTime;
      
    } else if (audioLevel <= silenceThreshold && isSpeaking) {
      // Check if silence duration exceeded
      const silenceTime = currentTime - lastSpeechTimeRef.current;
      const totalSpeechTime = lastSpeechTimeRef.current - speechStartTimeRef.current;
      
      if (silenceTime > silenceDuration) {
        if (totalSpeechTime >= minSpeechDuration) {
          // Valid speech ended
          console.log(`🎙️ [${new Date().toLocaleTimeString()}] SIMPLE VAD: Speech ended (${totalSpeechTime}ms, ${audioBufferRef.current.length} samples)`);
          
          // Concatenate all audio buffers
          const totalLength = audioBufferRef.current.reduce((sum, buffer) => sum + buffer.length, 0);
          const concatenatedAudio = new Float32Array(totalLength);
          let offset = 0;
          
          for (const buffer of audioBufferRef.current) {
            concatenatedAudio.set(buffer, offset);
            offset += buffer.length;
          }
          
          onSpeechEnd?.(concatenatedAudio);
        } else {
          console.log(`⚠️ [${new Date().toLocaleTimeString()}] SIMPLE VAD: Speech too short (${totalSpeechTime}ms), ignoring`);
        }
        
        setIsSpeaking(false);
        audioBufferRef.current = [];
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(monitorAudio);
  }, [enabled, isSpeaking, speechThreshold, silenceThreshold, silenceDuration, minSpeechDuration, calculateAudioLevel, captureAudioData, onSpeechStart, onSpeechEnd]);

  // Start monitoring
  const start = useCallback(async () => {
    if (!enabled) return;
    
    const initialized = await initialize();
    if (!initialized) return;
    
    setIsListening(true);
    monitorAudio();
    console.log('🎧 Simple VAD started listening');
  }, [enabled, initialize, monitorAudio]);

  // Stop monitoring
  const stop = useCallback(() => {
    setIsListening(false);
    setIsSpeaking(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    console.log('🔇 Simple VAD stopped');
  }, []);

  // Effect to handle enabled state changes
  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }
    
    return () => {
      stop();
    };
  }, [enabled]); // Only depend on enabled to prevent loops

  return {
    isListening,
    isSpeaking,
    audioLevel,
    start,
    stop
  };
} 