'use client';

import { createClient } from "@/supabase/client";
import { ModernChatInterface } from "@/components/modern-chat-interface";
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ChatPageContent() {
  const [sessionId, setSessionId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Listen for URL parameter changes
  useEffect(() => {
    console.log('URL searchParams changed:', searchParams.toString());
    initializeChat();
  }, [searchParams]);

  const initializeChat = async () => {
    try {
      const supabase = createClient();
      
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/sign-in');
        return;
      }

      setUserId(user.id);

      // Check URL params for existing sessionId
      const existingSessionId = searchParams.get('sessionId');
      
      if (existingSessionId) {
        // Verify the session exists and belongs to the user
        const { data: existingSession, error: sessionError } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('id', existingSessionId)
          .eq('user_id', user.id)
          .single();
        
        if (!sessionError && existingSession) {
          console.log('Found existing session:', existingSession.id);
          setSessionId(existingSession.id);
          setIsLoading(false);
          return;
        }
      }

      // Don't auto-create sessions - redirect to a session selector instead
      console.log('No existing session found, should show session selector');
      setSessionId(''); // Clear sessionId to show session selector
    } catch (err) {
      console.error('Error initializing chat:', err);
      setError('Failed to initialize chat');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Setting up your chat session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button 
            onClick={initializeChat}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    // Show the ModernChatInterface without a sessionId - it will handle showing the session selector
    return (
      <div className="h-screen">
        <ModernChatInterface 
          sessionId=""
          userId={userId}
          onNewContent={(content: string, type: 'upload' | 'paste' | 'record') => {
            console.log('New content added:', { content: content.substring(0, 100), type });
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-screen">
      <ModernChatInterface 
        sessionId={sessionId}
        userId={userId}
        onNewContent={(content: string, type: 'upload' | 'paste' | 'record') => {
          console.log('New content added:', { content: content.substring(0, 100), type });
        }}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense 
      fallback={
        <div className="h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">Loading chat...</p>
          </div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}