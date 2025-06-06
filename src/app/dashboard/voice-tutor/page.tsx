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

  // Initialize session
  useEffect(() => {
    async function initSession() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        // Create a new chat session for voice tutor
        const { data: session, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            title: 'Voice Tutor Session',
            description: 'Continuous voice conversation with AI tutor',
            metadata: {
              type: 'voice',
              mode: 'continuous'
            }
          })
          .select()
          .single();

        if (sessionError) {
          console.error('Failed to create session:', sessionError);
          setError('Failed to initialize voice tutor session');
          return;
        }

        setSessionId(session.id);
        setIsLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize voice tutor');
        setIsLoading(false);
      }
    }

    initSession();
  }, [router]);

  const handleTranscript = (text: string) => {
    setTranscripts(prev => [...prev, text]);
    setConfidence(0.95); // Mock confidence for demo
  };

  const handleAIResponse = (text: string) => {
    setAiResponses(prev => [...prev, text]);
  };

  const handleStateChange = (state: ConversationState) => {
    setCurrentState(state);
  };

  const handleError = (error: Error) => {
    console.error('Voice tutor error:', error);
    setError(error.message);
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

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="p-4 mt-6 bg-muted/30">
          <h4 className="text-sm font-semibold mb-2">Debug Info</h4>
          <div className="text-xs space-y-1 font-mono">
            <p>Session ID: {sessionId}</p>
            <p>Current State: {currentState}</p>
            <p>Transcripts: {transcripts.length}</p>
            <p>AI Responses: {aiResponses.length}</p>
          </div>
        </Card>
      )}
    </div>
  );
}