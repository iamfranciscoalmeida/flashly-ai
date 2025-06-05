'use client';

import { YouLearnChatInterface } from '@/components/youlearn-chat-interface';
import { useState, useEffect } from 'react';
import { createClient } from '@/supabase/client';

export default function YouLearnPage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Just set loading to false - don't auto-create sessions
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Setting up your learning session...</p>
        </div>
      </div>
    );
  }

  // Always show the YouLearnChatInterface - it will handle session creation when needed
  return (
    <div className="h-screen">
      <YouLearnChatInterface 
        sessionId={sessionId}
        onNewContent={(content: string, type: 'upload' | 'paste' | 'record') => {
          console.log('New content added:', { content: content.substring(0, 100), type });
        }}
      />
    </div>
  );
} 