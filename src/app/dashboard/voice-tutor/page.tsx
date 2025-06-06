'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VoiceChatLoop from '@/components/voice/continuous/VoiceChatLoop';
import { ConversationStatus } from '@/components/voice/continuous/ConversationStatus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createClient } from '@/supabase/client';
import { Mic, MicOff, Info, Settings2, MessageSquare } from 'lucide-react';
import { ConversationState } from '@/components/voice/continuous/ConversationStateMachine';

export default function VoiceTutorPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string>('');
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [aiResponses, setAiResponses] = useState<string[]>([]);
  const [currentState, setCurrentState] = useState<ConversationState>(ConversationState.IDLE);
  const [confidence, setConfidence] = useState(0);
  const [mode, setMode] = useState<'continuous' | 'push-to-talk'>('continuous');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced debugging state
  const [debugLogs, setDebugLogs] = useState<Array<{timestamp: string, type: string, message: string}>>([]);
  const [showDebug, setShowDebug] = useState(true);
  const [vadStatus, setVadStatus] = useState<string>('Initializing');
  const [microphonePermission, setMicrophonePermission] = useState<string>('Unknown');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [apiStatus, setApiStatus] = useState<{transcription: string, chat: string, tts: string}>({
    transcription: 'Not tested',
    chat: 'Not tested', 
    tts: 'Not tested'
  });

  // Debug logging function
  const addDebugLog = (type: string, message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setDebugLogs(prev => [...prev.slice(-19), {timestamp, type, message}]); // Keep last 20 logs
    console.log(`[${type}] ${message}`);
  };

  // Initialize session and debugging
  useEffect(() => {
    async function initSession() {
      addDebugLog('INIT', 'Starting voice tutor initialization');
      
      try {
        // Check microphone permission
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setMicrophonePermission(permissionStatus.state);
          addDebugLog('PERMISSION', `Microphone permission: ${permissionStatus.state}`);
        } catch (permError) {
          addDebugLog('WARNING', `Could not check microphone permission: ${permError}`);
          setMicrophonePermission('unknown');
        }

        // Get audio devices
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioInputs = devices.filter(device => device.kind === 'audioinput');
          setAudioDevices(audioInputs);
          addDebugLog('DEVICES', `Found ${audioInputs.length} audio input devices`);
        } catch (deviceError) {
          addDebugLog('ERROR', `Failed to enumerate devices: ${deviceError}`);
        }

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          addDebugLog('AUTH', 'No authenticated user, redirecting to login');
          router.push('/login');
          return;
        }

        addDebugLog('AUTH', `Authenticated user: ${user.id}`);

        // Create a new chat session for voice tutor
        const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
            user_id: user.id,
            title: 'Voice Tutor Session',
            mode: 'voice'
        })
        .select()
          .single();

        if (sessionError) {
          addDebugLog('ERROR', `Failed to create session: ${JSON.stringify(sessionError)}`);
          setError('Failed to initialize voice tutor session');
          return;
        }

        addDebugLog('SESSION', `Created session: ${session.id}`);
        setSessionId(session.id);
        setIsLoading(false);
        addDebugLog('INIT', 'Voice tutor initialization completed');
      } catch (err) {
        addDebugLog('ERROR', `Initialization error: ${err}`);
        setError('Failed to initialize voice tutor');
        setIsLoading(false);
      }
    }

    initSession();
  }, [router]);

    const handleTranscript = (text: string) => {
    addDebugLog('TRANSCRIPT', `Received: "${text}"`);
    setTranscripts(prev => [...prev, text]);
    setConfidence(0.95); // Mock confidence for demo
  };

  const handleAIResponse = (text: string) => {
    addDebugLog('AI_RESPONSE', `Received: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    setAiResponses(prev => [...prev, text]); 
  };

  const handleStateChange = (state: ConversationState) => {
    addDebugLog('STATE', `Changed to: ${state}`);
    setCurrentState(state);
  };

  const handleError = (error: Error) => {
    addDebugLog('ERROR', `Voice tutor error: ${error.message}`);
    setError(error.message);
  };

  // Test API endpoints
  const testAPIs = async () => {
    addDebugLog('TEST', 'Starting API tests...');
    
    // Test transcription API
    try {
      const transcribeResponse = await fetch('/api/voice/transcribe-streaming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });
      setApiStatus(prev => ({
        ...prev,
        transcription: transcribeResponse.ok ? 'Available' : `Error ${transcribeResponse.status}`
      }));
      addDebugLog('TEST', `Transcription API: ${transcribeResponse.status}`);
    } catch (error) {
      setApiStatus(prev => ({ ...prev, transcription: 'Failed' }));
      addDebugLog('TEST', `Transcription API failed: ${error}`);
    }

    // Test chat API
    try {
      const chatResponse = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: 'Test message',
          isVoice: true,
          test: true
        })
      });
      setApiStatus(prev => ({
        ...prev,
        chat: chatResponse.ok ? 'Available' : `Error ${chatResponse.status}`
      }));
      addDebugLog('TEST', `Chat API: ${chatResponse.status}`);
    } catch (error) {
      setApiStatus(prev => ({ ...prev, chat: 'Failed' }));
      addDebugLog('TEST', `Chat API failed: ${error}`);
    }

    // Test TTS API
    try {
      const ttsResponse = await fetch('/api/voice/speak-streaming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Test', test: true })
      });
      setApiStatus(prev => ({
        ...prev,
        tts: ttsResponse.ok ? 'Available' : `Error ${ttsResponse.status}`
      }));
      addDebugLog('TEST', `TTS API: ${ttsResponse.status}`);
    } catch (error) {
      setApiStatus(prev => ({ ...prev, tts: 'Failed' }));
      addDebugLog('TEST', `TTS API failed: ${error}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Initializing voice tutor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Voice Tutor</h1>
        <p className="text-muted-foreground">
          Have natural conversations with your AI tutor using continuous voice recognition
        </p>
          </div>
          
      {/* Feature info */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>How it works</AlertTitle>
        <AlertDescription>
          Click "Start Conversation" and speak naturally. The AI will listen, understand, and respond to your questions automatically.
          No need to press any buttons during the conversation!
        </AlertDescription>
      </Alert>

      {/* Mode selector */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'continuous' | 'push-to-talk')} className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="continuous">
            <MessageSquare className="h-4 w-4 mr-2" />
            Continuous Conversation
          </TabsTrigger>
          <TabsTrigger value="push-to-talk" disabled>
            <Mic className="h-4 w-4 mr-2" />
            Push to Talk (Coming Soon)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="continuous" className="space-y-6">
          {/* Main voice interface */}
          <VoiceChatLoop
            sessionId={sessionId}
            onTranscript={handleTranscript}
            onAIResponse={handleAIResponse}
            onStateChange={handleStateChange}
            onError={handleError}
            autoRestart={true}
            timeoutDuration={30000}
          />

          {/* Conversation history */}
          {(transcripts.length > 0 || aiResponses.length > 0) && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Conversation History</h3>
              <ConversationStatus
                state={currentState}
                transcript={transcripts[transcripts.length - 1] || ''}
                aiResponse={aiResponses[aiResponses.length - 1] || ''}
                confidence={confidence}
              />
                        </Card>
                      )}

          {/* Tips */}
          <Card className="p-6 bg-muted/50">
            <h3 className="text-lg font-semibold mb-3">Tips for Best Experience</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Speak clearly and at a normal pace</li>
              <li>• Wait for the AI to finish speaking before asking follow-up questions</li>
              <li>• The system will automatically detect when you start and stop speaking</li>
              <li>• Use headphones to prevent echo and improve recognition</li>
              <li>• Make sure you're in a quiet environment for best results</li>
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="push-to-talk">
          <Card className="p-12 text-center text-muted-foreground">
            <MicOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Push-to-talk mode coming soon!</p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enhanced Debug Panel */}
      <Card className="p-4 mt-6 bg-muted/30">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold">Debug Console</h4>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={testAPIs}
              disabled={!sessionId}
            >
              Test APIs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
            >
              {showDebug ? 'Hide' : 'Show'} Details
            </Button>
          </div>
        </div>

        {showDebug && (
          <div className="space-y-4">
            {/* System Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h5 className="text-xs font-semibold mb-2">System Status</h5>
                <div className="text-xs space-y-1 font-mono">
                  <p>Session ID: {sessionId || 'Not created'}</p>
                  <p>Current State: <span className="font-bold">{currentState}</span></p>
                  <p>Microphone: <span className={microphonePermission === 'granted' ? 'text-green-600' : 'text-red-600'}>{microphonePermission}</span></p>
                  <p>Audio Devices: {audioDevices.length}</p>
                  <p>Transcripts: {transcripts.length}</p>
                  <p>AI Responses: {aiResponses.length}</p>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-semibold mb-2">API Status</h5>
                <div className="text-xs space-y-1 font-mono">
                  <p>Transcription: <span className={apiStatus.transcription === 'Available' ? 'text-green-600' : 'text-red-600'}>{apiStatus.transcription}</span></p>
                  <p>Chat API: <span className={apiStatus.chat === 'Available' ? 'text-green-600' : 'text-red-600'}>{apiStatus.chat}</span></p>
                  <p>TTS API: <span className={apiStatus.tts === 'Available' ? 'text-green-600' : 'text-red-600'}>{apiStatus.tts}</span></p>
                </div>
              </div>
            </div>

            {/* Debug Logs */}
            <div>
              <h5 className="text-xs font-semibold mb-2">Real-time Logs</h5>
              <div className="bg-black text-green-400 p-3 rounded text-xs font-mono max-h-40 overflow-y-auto">
                {debugLogs.length === 0 ? (
                  <p className="text-gray-500">No logs yet...</p>
                ) : (
                  debugLogs.slice(-10).map((log, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="text-gray-500">{log.timestamp}</span>
                      <span className={
                        log.type === 'ERROR' ? 'text-red-400' :
                        log.type === 'STATE' ? 'text-blue-400' :
                        log.type === 'TRANSCRIPT' ? 'text-yellow-400' :
                        log.type === 'AI_RESPONSE' ? 'text-purple-400' :
                        'text-green-400'
                      }>[{log.type}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Audio Devices */}
            {audioDevices.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold mb-2">Audio Input Devices</h5>
                <div className="text-xs space-y-1">
                  {audioDevices.map((device, index) => (
                    <p key={index} className="font-mono">
                      {device.label || `Device ${index + 1}`} ({device.deviceId.substring(0, 8)}...)
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Conversation */}
            {(transcripts.length > 0 || aiResponses.length > 0) && (
              <div>
                <h5 className="text-xs font-semibold mb-2">Recent Conversation</h5>
                <div className="text-xs space-y-2 max-h-32 overflow-y-auto">
                  {transcripts.slice(-3).map((transcript, index) => (
                    <div key={`t-${index}`} className="bg-blue-100 p-2 rounded">
                      <strong>You:</strong> {transcript}
                    </div>
                  ))}
                  {aiResponses.slice(-3).map((response, index) => (
                    <div key={`r-${index}`} className="bg-green-100 p-2 rounded">
                      <strong>AI:</strong> {response.substring(0, 100)}{response.length > 100 ? '...' : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
} 