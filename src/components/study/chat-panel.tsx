'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Brain, 
  FileQuestion, 
  BookOpen, 
  Network, 
  Clock, 
  Loader2 
} from 'lucide-react';
import { ChatMessage, SessionContent } from '@/types/study-session';

interface ChatPanelProps {
  sessionId: string;
  messages: ChatMessage[];
  onNewMessage: (message: ChatMessage) => void;
  onGenerateContent: (type: SessionContent['content_type']) => void;
}

export default function ChatPanel({ 
  sessionId, 
  messages, 
  onNewMessage, 
  onGenerateContent 
}: ChatPanelProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Add user message immediately
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      user_id: 'current-user',
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    onNewMessage(tempUserMessage);

    try {
      const response = await fetch(`/api/study-sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          include_context: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const { message: aiResponse } = await response.json();

      // Add AI response
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        session_id: sessionId,
        user_id: 'current-user',
        role: 'assistant',
        content: aiResponse,
        created_at: new Date().toISOString(),
      };
      onNewMessage(aiMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        session_id: sessionId,
        user_id: 'current-user',
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        created_at: new Date().toISOString(),
      };
      onNewMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    {
      label: 'Generate Flashcards',
      icon: Brain,
      action: () => onGenerateContent('flashcards'),
    },
    {
      label: 'Create Quiz',
      icon: FileQuestion,
      action: () => onGenerateContent('quiz'),
    },
    {
      label: 'Summarize',
      icon: BookOpen,
      action: () => onGenerateContent('summary'),
    },
    {
      label: 'Mind Map',
      icon: Network,
      action: () => onGenerateContent('mindmap'),
    },
    {
      label: 'Timeline',
      icon: Clock,
      action: () => onGenerateContent('timeline'),
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Quick Actions */}
      <div className="p-4 border-b">
        <h3 className="text-sm font-medium mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={action.action}
              className="flex items-center gap-2 text-xs"
            >
              <action.icon className="h-3 w-3" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Start a conversation with your AI tutor!</p>
              <p className="text-sm mt-2">
                Ask questions about the content or use the quick actions above.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <Card
                  className={`max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <CardContent className="p-3">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </CardContent>
                </Card>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <Card className="bg-muted">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your study material..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 