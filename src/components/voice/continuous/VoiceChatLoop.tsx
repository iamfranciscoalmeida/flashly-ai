'use client';

import { useCallback, useEffect, useState } from 'react';
import { useConversationStateMachine, ConversationState, getStateMessage } from './ConversationStateMachine';
import { useVADProcessor } from './VADProcessor';
import { useSimpleVAD } from './SimpleVAD';
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
  const [vadType, setVadType] = useState<'simple' | 'advanced'>('advanced');
  const [vadMisfires, setVadMisfires] = useState(0);

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
    // Adjust VAD sensitivity to reduce misfires
    silenceThreshold: -40,    // Less sensitive to background noise
    silenceDuration: 1200,    // Wait longer before considering speech ended
    speechThreshold: -35,     // Higher threshold for speech detection
    onSpeechStart: () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`🎙️ [${timestamp}] VAD: Speech detected, starting recording`);
      transitionTo(ConversationState.RECORDING);
    },
    onSpeechEnd: async (audio) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`🎙️ [${timestamp}] VAD: Speech ended, processing audio (${audio.length} samples)`);
      transitionTo(ConversationState.PROCESSING);
      
      // Convert Float32Array to Blob and transcribe
      const audioBlob = float32ArrayToBlob(audio);
      console.log(`📝 [${timestamp}] TRANSCRIPTION: Sending audio blob to transcriber (${audioBlob.size} bytes)`);
      transcriber.addToQueue(audioBlob);
    },
    onVADMisfire: () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`⚠️ [${timestamp}] VAD: Misfire detected - speech was too short or quiet, returning to listening`);
      
      // Track misfires and suggest fallback after too many
      setVadMisfires((prev: number) => {
        const newCount = prev + 1;
        if (newCount >= 5) {
          console.warn(`🔄 [${timestamp}] Too many VAD misfires (${newCount}). Switching to SimpleVAD.`);
          setVadType('simple');
          return 0; // Reset count
        }
        return newCount;
      });
      
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
      const transcriptionStartTime = Date.now();
      const timestamp = new Date().toLocaleTimeString();
      
      console.log(`🎤 [${timestamp}] TRANSCRIPTION COMPLETE:`, {
        text: result.text,
        confidence: result.confidence,
        length: result.text.length
      });
      
      setTranscript(result.text);
      onTranscript(result.text);
      updateActivity();

      // Skip empty transcriptions
      if (!result.text.trim()) {
        console.log(`⚠️ [${timestamp}] Empty transcription, returning to listening`);
        transitionTo(ConversationState.LISTENING);
        return;
      }

      // Send to chat API
      try {
        const chatStartTime = Date.now();
        console.log(`🤖 [${timestamp}] SENDING TO AI:`, {
          message: result.text,
          sessionId: sessionId.substring(0, 8) + '...',
          vadConfidence: result.confidence
        });

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

        const chatResponseTime = Date.now() - chatStartTime;

        if (!response.ok) {
          console.error(`❌ [${timestamp}] Chat API failed:`, {
            status: response.status,
            statusText: response.statusText,
            responseTime: chatResponseTime
          });
          throw new Error(`Chat API failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const aiText = data.aiMessage?.content || '';
        
        console.log(`✅ [${timestamp}] AI RESPONSE RECEIVED:`, {
          responseLength: aiText.length,
          responseTime: chatResponseTime,
          preview: aiText.substring(0, 100) + (aiText.length > 100 ? '...' : ''),
          totalProcessingTime: Date.now() - transcriptionStartTime
        });
        
        setAiResponse(aiText);
        onAIResponse(aiText);
        
        // Transition to speaking state
        transitionTo(ConversationState.SPEAKING);
        
        // Generate TTS
        const ttsStartTime = Date.now();
        console.log(`🔊 [${timestamp}] STARTING TTS GENERATION:`, {
          textLength: aiText.length,
          estimatedDuration: Math.ceil(aiText.length / 10) + 's'
        });

        ttsPlayer.speak(aiText, {
          onStart: () => {
            const ttsGenerationTime = Date.now() - ttsStartTime;
            console.log(`▶️ [${new Date().toLocaleTimeString()}] TTS PLAYBACK STARTED:`, {
              generationTime: ttsGenerationTime,
              totalPipelineTime: Date.now() - transcriptionStartTime
            });
          },
          onEnd: () => {
            const totalTime = Date.now() - transcriptionStartTime;
            console.log(`⏹️ [${new Date().toLocaleTimeString()}] TTS PLAYBACK FINISHED:`, {
              totalConversationTime: totalTime,
              nextAction: autoRestart && isActive ? 'returning to listening' : 'going idle'
            });
            
            if (autoRestart && isActive) {
              transitionTo(ConversationState.LISTENING);
            } else {
              transitionTo(ConversationState.IDLE);
            }
          }
        });
      } catch (error) {
        const errorTime = Date.now() - transcriptionStartTime;
        console.error(`❌ [${timestamp}] CHAT API ERROR (after ${errorTime}ms):`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        handleStateMachineError(error as Error);
      }
    },
    onError: (error) => {
      console.error(`❌ [${new Date().toLocaleTimeString()}] TRANSCRIPTION ERROR:`, error);
      handleStateMachineError(error);
    }
  });

  // Simple VAD as fallback when complex VAD misfires too much
  const simpleVAD = useSimpleVAD({
    enabled: vadType === 'simple' && isEnabled && currentState === ConversationState.LISTENING,
    speechThreshold: -30,
    silenceThreshold: -40,
    silenceDuration: 2000,
    minSpeechDuration: 800,
    onSpeechStart: () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`🔧 [${timestamp}] SIMPLE VAD: Speech detected, starting recording`);
      transitionTo(ConversationState.RECORDING);
    },
    onSpeechEnd: async (audio: Float32Array) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`🔧 [${timestamp}] SIMPLE VAD: Speech ended, processing audio (${audio.length} samples)`);
      transitionTo(ConversationState.PROCESSING);
      
      // Convert Float32Array to Blob and transcribe
      const audioBlob = float32ArrayToBlob(audio);
      console.log(`📝 [${timestamp}] TRANSCRIPTION: Sending audio blob to transcriber (${audioBlob.size} bytes)`);
      transcriber.addToQueue(audioBlob);
    },
    onError: (error: Error) => {
      const timestamp = new Date().toLocaleTimeString();
      console.error(`❌ [${timestamp}] SIMPLE VAD ERROR:`, error);
      handleStateMachineError(error);
    }
  });

  // TTS player
  const ttsPlayer = useTTSPlayer({
    onPlaybackStart: () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`🔊 [${timestamp}] TTS PLAYER: Starting audio playback`);
      updateActivity();
    },
    onPlaybackEnd: () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`🔇 [${timestamp}] TTS PLAYER: Audio playback complete`);
      updateActivity();
    },
    onError: (error) => {
      const timestamp = new Date().toLocaleTimeString();
      console.error(`❌ [${timestamp}] TTS PLAYER ERROR:`, error);
      handleStateMachineError(error);
    }
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