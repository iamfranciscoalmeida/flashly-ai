import { useCallback, useEffect, useRef, useState } from 'react';

interface AudioChunk {
  blob: Blob;
  timestamp: number;
  duration: number;
}

interface UseContinuousRecorderProps {
  enabled?: boolean;
  chunkDuration?: number; // Duration of each chunk in ms (default 1000ms)
  mimeType?: string;
  onChunkReady?: (chunk: AudioChunk) => void;
  onError?: (error: Error) => void;
}

export function useContinuousRecorder({
  enabled = false,
  chunkDuration = 1000,
  mimeType = 'audio/webm;codecs=opus',
  onChunkReady,
  onError
}: UseContinuousRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const chunkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for supported mime types
  const getSupportedMimeType = useCallback(() => {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return mimeTypes[0]; // Fallback to first option
  }, []);

  // Initialize audio recording
  const initialize = useCallback(async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Optimal for Whisper
        }
      });

      streamRef.current = stream;

      // Create audio context for processing
      const ctx = new AudioContext({ sampleRate: 16000 });
      setAudioContext(ctx);

      // Setup MediaRecorder
      const supportedMimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
        audioBitsPerSecond: 128000
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        onError?.(new Error('MediaRecorder error'));
      };

      mediaRecorderRef.current = recorder;

      console.log('Continuous recorder initialized with mime type:', supportedMimeType);
      return true;
    } catch (error) {
      console.error('Failed to initialize continuous recorder:', error);
      onError?.(error as Error);
      return false;
    }
  }, [getSupportedMimeType, onError]);

  // Process and emit chunks
  const processChunks = useCallback(() => {
    if (chunksRef.current.length === 0) return;

    const blob = new Blob(chunksRef.current, { type: mimeType });
    const now = Date.now();
    const duration = now - startTimeRef.current;

    const chunk: AudioChunk = {
      blob,
      timestamp: startTimeRef.current,
      duration
    };

    onChunkReady?.(chunk);

    // Reset for next chunk
    chunksRef.current = [];
    startTimeRef.current = now;
  }, [mimeType, onChunkReady]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (isRecording || !enabled) return;

    const initialized = await initialize();
    if (!initialized || !mediaRecorderRef.current) return;

    try {
      // Start recording
      mediaRecorderRef.current.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);

      // Setup chunk processing interval
      const processInterval = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.requestData(); // Force data availability
          processChunks();
        }

        chunkTimeoutRef.current = setTimeout(processInterval, chunkDuration);
      };

      chunkTimeoutRef.current = setTimeout(processInterval, chunkDuration);

      console.log('Started continuous recording');
    } catch (error) {
      console.error('Failed to start recording:', error);
      onError?.(error as Error);
      setIsRecording(false);
    }
  }, [enabled, isRecording, initialize, processChunks, chunkDuration, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      if (chunkTimeoutRef.current) {
        clearTimeout(chunkTimeoutRef.current);
        chunkTimeoutRef.current = null;
      }

      // Process any remaining chunks
      processChunks();

      setIsRecording(false);
      console.log('Stopped continuous recording');
    } catch (error) {
      console.error('Error stopping recording:', error);
      onError?.(error as Error);
    }
  }, [isRecording, processChunks, onError]);

  // Clean up resources
  const cleanup = useCallback(() => {
    stopRecording();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }

    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, [stopRecording, audioContext]);

  // Handle enabled state changes
  useEffect(() => {
    if (enabled) {
      startRecording();
    } else {
      stopRecording();
    }

    return () => {
      if (enabled) {
        stopRecording();
      }
    };
  }, [enabled, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    cleanup
  };
}

// Utility function to convert audio blob to base64
export async function audioBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]); // Remove data URL prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Utility function to convert audio blob to ArrayBuffer
export async function audioBlobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}

// Utility function to convert Float32Array to Blob
export function float32ArrayToBlob(buffer: Float32Array, sampleRate: number = 16000): Blob {
  // Convert Float32Array to 16-bit PCM
  const length = buffer.length;
  const arrayBuffer = new ArrayBuffer(length * 2);
  const view = new DataView(arrayBuffer);

  let offset = 0;
  for (let i = 0; i < length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  // Create WAV header
  const wavHeader = createWavHeader(arrayBuffer.byteLength, sampleRate);
  
  // Combine header and data
  return new Blob([wavHeader, arrayBuffer], { type: 'audio/wav' });
}

// Create WAV header for PCM data
function createWavHeader(dataLength: number, sampleRate: number): ArrayBuffer {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // "RIFF" chunk descriptor
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, dataLength + 36, true); // file size - 8
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " sub-chunk
  view.setUint32(12, 0x666D7420, false); // "fmt "
  view.setUint32(16, 16, true); // subchunk size
  view.setUint16(20, 1, true); // audio format (PCM)
  view.setUint16(22, 1, true); // number of channels
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // "data" sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataLength, true); // subchunk size

  return header;
}