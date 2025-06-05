'use client';

import { YouLearnChatInterface } from '@/components/youlearn-chat-interface';
import { useState, useEffect } from 'react';
import { createClient } from '@/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  MessageSquare, 
  Clock,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatSession {
  id: string;
  title: string;
  last_message_at: string;
  created_at: string;
}

interface YouLearnChatPageProps {
  userId: string;
}

export function YouLearnChatPage({ userId }: YouLearnChatPageProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('last_message_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading sessions:', error);
        return;
      }

      setSessions(data || []);
      
      // If no current session and we have sessions, don't auto-select
      // Let user start fresh or choose existing
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title: 'New Learning Session',
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        return;
      }

      setSessions([data, ...sessions]);
      setCurrentSession(data);
      setShowSidebar(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const selectSession = (session: ChatSession) => {
    setCurrentSession(session);
    setShowSidebar(false);
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('Error deleting session:', error);
        return;
      }

      setSessions(sessions.filter(s => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your learning sessions...</p>
        </div>
      </div>
    );
  }

  // If no current session, show session selector or create new one
  if (!currentSession) {
    return (
      <div className="h-screen flex flex-col bg-white">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Learning Sessions</h1>
          <Button onClick={createNewSession}>
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">Start Your First Learning Session</h2>
              <p className="text-gray-600 mb-6">Create a session to upload content, ask questions, and generate study materials</p>
              <Button onClick={createNewSession} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Create New Session
              </Button>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Sessions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    className="p-4 cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary group"
                    onClick={() => selectSession(session)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => deleteSession(session.id, e)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    <h3 className="font-semibold mb-2 truncate">{session.title}</h3>
                    <p className="text-sm text-gray-500">
                      Last used: {new Date(session.last_message_at).toLocaleDateString()}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show the YouLearn interface with session management
  return (
    <div className="h-screen flex">
      {/* Sidebar for session management */}
      {showSidebar && (
        <div className="w-80 bg-gray-50 border-r flex flex-col">
          <div className="p-4 border-b bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Sessions</h3>
              <Button size="sm" onClick={createNewSession}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {sessions.map((session) => (
                <Card
                  key={session.id}
                  className={cn(
                    "p-3 cursor-pointer hover:bg-gray-100 transition-colors group",
                    currentSession?.id === session.id && "bg-primary/10 border-primary"
                  )}
                  onClick={() => selectSession(session)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{session.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(session.last_message_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => deleteSession(session.id, e)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main chat interface */}
      <div className="flex-1 relative">
        {/* Toggle sidebar button */}
        <Button
          variant="outline"
          size="sm"
          className="absolute top-4 left-4 z-10"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Sessions
        </Button>

        <YouLearnChatInterface 
          sessionId={currentSession.id}
          onNewContent={(content, type) => {
            console.log('New content added:', { content: content.substring(0, 100), type });
          }}
        />
      </div>
    </div>
  );
} 