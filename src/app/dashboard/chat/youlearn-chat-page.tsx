'use client';

import { ModernChatInterface } from '@/components/modern-chat-interface';
import { useState, useEffect } from 'react';
import { createClient } from '@/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  MessageSquare, 
  Clock,
  Trash2,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
      <div className="h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading your learning sessions...</p>
        </div>
      </div>
    );
  }

  // If no current session, show session selector
  if (!currentSession) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-b from-white to-gray-50">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm">
          <h1 className="text-2xl font-bold">Learning Sessions</h1>
          <Button onClick={createNewSession} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {sessions.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 max-w-2xl mx-auto"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Start Your Learning Journey</h2>
              <p className="text-lg text-gray-600 mb-8">Create a session to upload content, ask questions, and generate personalized study materials with AI</p>
              <Button onClick={createNewSession} size="lg" className="rounded-xl">
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Session
              </Button>
            </motion.div>
          ) : (
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold">Recent Sessions</h2>
                <Badge variant="secondary">{sessions.length} total</Badge>
              </div>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {sessions.map((session: ChatSession, index: number) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className="p-6 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-primary group relative overflow-hidden"
                      onClick={() => selectSession(session)}
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                      <div className="relative">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                            <MessageSquare className="h-5 w-5" />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-2"
                            onClick={(e: React.MouseEvent) => deleteSession(session.id, e)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                        <h3 className="font-semibold text-lg mb-2 truncate">{session.title}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(session.last_message_at).toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show the modern chat interface with session management
  return (
    <div className="h-screen flex relative">
      {/* Mobile sidebar toggle */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-4 left-4 z-50 md:hidden"
        onClick={() => setShowSidebar(!showSidebar)}
      >
        {showSidebar ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Sidebar overlay for mobile */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ 
          x: showSidebar ? 0 : -320,
          opacity: showSidebar ? 1 : 0
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "w-80 bg-gray-50 border-r flex flex-col fixed md:relative h-full z-50",
          "md:translate-x-0 md:opacity-100"
        )}
      >
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Sessions</h3>
            <Button size="sm" onClick={createNewSession} className="rounded-lg">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {sessions.map((session: ChatSession) => (
              <motion.div
                key={session.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={cn(
                    "p-4 cursor-pointer hover:shadow-md transition-all group",
                    currentSession?.id === session.id && "bg-primary/10 border-primary shadow-md"
                  )}
                  onClick={() => selectSession(session)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className={cn(
                          "h-4 w-4",
                          currentSession?.id === session.id ? "text-primary" : "text-gray-500"
                        )} />
                        <p className="text-sm font-medium truncate">{session.title}</p>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(session.last_message_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {currentSession?.id === session.id && (
                        <ChevronRight className="h-4 w-4 text-primary" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                        onClick={(e: React.MouseEvent) => deleteSession(session.id, e)}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-4 border-t bg-white">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => setCurrentSession(null)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            View All Sessions
          </Button>
        </div>
      </motion.div>

      {/* Main chat interface */}
      <div className="flex-1 relative md:ml-0">
        {/* Desktop sidebar toggle */}
        <Button
          variant="outline"
          size="sm"
          className="absolute top-4 left-4 z-20 hidden md:flex items-center gap-2"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <Menu className="h-4 w-4" />
          Sessions
        </Button>

        <ModernChatInterface 
          sessionId={currentSession.id}
          onNewContent={(content, type) => {
            console.log('New content added:', { content: content.substring(0, 100), type });
            // Update session last_message_at
            supabase
              .from('chat_sessions')
              .update({ last_message_at: new Date().toISOString() })
              .eq('id', currentSession.id)
              .then(() => loadSessions());
          }}
        />
      </div>
    </div>
  );
} 