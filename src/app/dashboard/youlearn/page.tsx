'use client';

import { YouLearnChatInterface } from '@/components/youlearn-chat-interface';
import { useState, useEffect } from 'react';
import { createClient } from '@/supabase/client';

export default function YouLearnPage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    createSession();
  }, []);

  const createSession = async () => {
    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      // Create a new chat session
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: 'YouLearn Chat',
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        return;
      }

      setSessionId(session.id);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (!sessionId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to create session. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <YouLearnChatInterface 
        sessionId={sessionId}
        onNewContent={(content, type) => {
          console.log('New content added:', { content: content.substring(0, 100), type });
        }}
      />
    </div>
  );
} 