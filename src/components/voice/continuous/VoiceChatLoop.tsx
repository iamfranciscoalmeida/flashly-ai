'use client';

import { useCallback, useEffect, useState } from 'react';
import { useConversationStateMachine, ConversationState, getStateMessage } from './ConversationStateMachine';
import { useVADProcessor } from './VADProcessor';
import { useContinuousRecorder, float32ArrayToBlob } from './ContinuousRecorder';
import { useStreamingTranscriber } from './StreamingTranscriber';
import { useTTSPlayer } from './TTSPlayer';
import { VoiceVisualization, SimpleVoiceVisualization } from './VoiceVisualization';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceChatLoopProps {
  sessionId: string;
  onTranscript: (text: string) => void;
  onAIResponse: (text: string, audioUrl?: string) => void;
  onStateChange?: (state: ConversationState) => void;
  onError?: (error: Error) => void;
  autoRestart?: boolean;
  timeoutDuration?: number;
  useSimpleUI?: boolean;
  className?: string;
}

export default function VoiceChatLoop({
  sessionId,
  onTranscript,
  onAIResponse,
  onStateChange,
  onError,
  autoRestart = true,
  timeoutDuration = 30000,
  useSimpleUI = false,
  className
}: VoiceChatLoopProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [error, setError] = useState<string | null>(null);

  // State machine
  const {
    currentState,
    isActive,
    transitionTo,
    startConversation,
    stopConversation,
    handleError: handleStateMachineError,
    updateActivity
  } = useConversationStateMachine({
    sessionId,
    autoRestart,
    timeoutDuration,
    onStateChange: (state) => {
      console.log('State changed to:', state);
      onStateChange?.(state);
    },
    onTimeout: () => {
      console.log('Conversation timed out');
      setError('Conversation timed out due to inactivity');
    },
    onError: (error) => {
      console.error('State machine error:', error);
      setError(error.message);
      onError?.(error);
    }
  });

  // VAD processor
  const {
    isListening,
    audioLevel,
    vadConfidence,
    start: startVAD,
    stop: stopVAD
  } = useVADProcessor({
    enabled: isEnabled && currentState === ConversationState.LISTENING,
    onSpeechStart: () => {
      console.log('Speech detected, starting recording');
      transitionTo(ConversationState.RECORDING);
    },
    onSpeechEnd: async (audio) => {
      console.log('Speech ended, processing audio');
      transitionTo(ConversationState.PROCESSING);
      
      // Convert Float32Array to Blob and transcribe
      const audioBlob = float32ArrayToBlob(audio);
      transcriber.addToQueue(audioBlob);
    },
    onVADMisfire: () => {
      console.log('VAD misfire, returning to listening');
      if (currentState === ConversationState.RECORDING) {
        transitionTo(ConversationState.LISTENING);
      }
    },
    onError: (error) => {
      console.error('VAD error:', error);
      handleStateMachineError(error);
    }
  });

  // Continuous recorder (as backup for VAD)
  const {
    isRecording,
    startRecording,
    stopRecording
  } = useContinuousRecorder({
    enabled: false, // We're using VAD instead
    onChunkReady: (chunk) => {
      console.log('Audio chunk ready:', chunk.duration);
      // This is backup if VAD fails
    },
    onError: handleStateMachineError
  });

  // Streaming transcriber
  const transcriber = useStreamingTranscriber({
    onTranscription: async (result) => {
      console.log('Transcription result:', result);
      setTranscript(result.text);
      onTranscript(result.text);
      updateActivity();

      // Send to chat API
      try {
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            message: result.text,
            isVoice: true,
            isContinuous: true,
            vadConfidence: result.confidence
          })
        });

        if (!response.ok) {
          throw new Error('Failed to get AI response');
        }

        const data = await response.json();
        const aiText = data.aiMessage?.content || '';
        
        setAiResponse(aiText);
        onAIResponse(aiText);
        
        // Transition to speaking state
        transitionTo(ConversationState.SPEAKING);
        
        // Generate TTS
        ttsPlayer.speak(aiText, {
          onEnd: () => {
            console.log('TTS finished, returning to listening');
            if (autoRestart && isActive) {
              transitionTo(ConversationState.LISTENING);
            } else {
              transitionTo(ConversationState.IDLE);
            }
          }
        });
      } catch (error) {
        console.error('Chat API error:', error);
        handleStateMachineError(error as Error);
      }
    },
    onError: handleStateMachineError
  });

  // TTS player
  const ttsPlayer = useTTSPlayer({
    onPlaybackStart: () => {
      console.log('TTS playback started');
      updateActivity();
    },
    onPlaybackEnd: () => {
      console.log('TTS playback ended');
      updateActivity();
    },
    onError: handleStateMachineError
  });

  // Handle enable/disable
  const handleToggle = useCallback(() => {
    if (isEnabled) {
      setIsEnabled(false);
      stopConversation();
      stopVAD();
      stopRecording();
      ttsPlayer.stop();
      setTranscript('');
      setAiResponse('');
      setError(null);
    } else {
      setIsEnabled(true);
      setError(null);
      startConversation();
    }
  }, [isEnabled, startConversation, stopConversation, stopVAD, stopRecording, ttsPlayer]);

  // Handle mute/unmute
  const handleMuteToggle = useCallback(() => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      ttsPlayer.stop();
    }
  }, [isMuted, ttsPlayer]);

  // Effect to start/stop VAD based on state
  useEffect(() => {
    if (currentState === ConversationState.LISTENING) {
      startVAD();
    } else {
      stopVAD();
    }
  }, [currentState, startVAD, stopVAD]);

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  if (useSimpleUI) {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <Button
          variant={isEnabled ? "destructive" : "default"}
          size="icon"
          onClick={handleToggle}
          className="relative"
        >
          {isEnabled ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        
        <SimpleVoiceVisualization
          isActive={isActive}
          state={currentState}
        />
        
        <span className="text-sm text-muted-foreground">
          {getStateMessage(currentState)}
        </span>
      </div>
    );
  }

  return (
    <Card className={cn("p-6 space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Voice Conversation</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMuteToggle}
            disabled={!isEnabled}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main visualization */}
      <div className="flex flex-col items-center space-y-4">
        <VoiceVisualization
          audioLevel={audioLevel}
          isListening={isListening}
          isRecording={currentState === ConversationState.RECORDING}
          isSpeaking={currentState === ConversationState.SPEAKING}
          vadConfidence={vadConfidence}
          state={currentState}
          className="w-64 h-64"
        />

        {/* Status text */}
        <p className="text-center text-muted-foreground">
          {getStateMessage(currentState)}
        </p>

        {/* Control button */}
        <Button
          variant={isEnabled ? "destructive" : "default"}
          size="lg"
          onClick={handleToggle}
          className="w-48"
        >
          {isEnabled ? (
            <>
              <MicOff className="h-4 w-4 mr-2" />
              Stop Conversation
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              Start Conversation
            </>
          )}
        </Button>
      </div>

      {/* Conversation display */}
      {(transcript || aiResponse) && (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {transcript && (
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">You</p>
              <p className="text-sm text-blue-800 dark:text-blue-200">{transcript}</p>
            </div>
          )}
          
          {aiResponse && (
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">AI Tutor</p>
              <p className="text-sm text-green-800 dark:text-green-200">{aiResponse}</p>
            </div>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Auto-restart</span>
            <input
              type="checkbox"
              checked={autoRestart}
              disabled
              className="toggle"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Timeout</span>
            <span className="text-sm text-muted-foreground">{timeoutDuration / 1000}s</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">VAD Confidence</span>
            <span className="text-sm text-muted-foreground">{(vadConfidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}
    </Card>
  );
}