'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, 
  Sparkles, 
  FileText, 
  Brain, 
  BookOpen, 
  StickyNote,
  Loader2,
  User,
  Bot
} from 'lucide-react';
import { Message } from '@/types/database';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { AIToolbar } from './ai-toolbar';

interface ChatInterfaceProps {
  sessionId: string;
  documentId?: string;
  moduleId?: string;
  onGenerateContent?: (type: 'flashcards' | 'quiz' | 'summary' | 'notes') => void;
}

export function ChatInterface({ 
  sessionId, 
  documentId, 
  moduleId,
  onGenerateContent 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load messages for the session
  useEffect(() => {
    loadMessages();
  }, [sessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: input,
      metadata: {},
      created_at: new Date().toISOString()
    };

    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          content: input,
          documentId,
          moduleId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev: Message[]) => {
          const filtered = prev.filter((m: Message) => !m.id.startsWith('temp-'));
          return [...filtered, data.userMessage, data.assistantMessage];
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const onContentGenerated = (type: string, content: any) => {
    // Handle generated content - could add it as a message or trigger a callback
    console.log('Content generated:', type, content);
    // Optionally call the parent's onGenerateContent callback
    if (type === 'flashcards' || type === 'quiz' || type === 'summary' || type === 'notes') {
      onGenerateContent?.(type as 'flashcards' | 'quiz' | 'summary' | 'notes');
    }
  };

  const toolButtons = [
    { 
      icon: Sparkles, 
      label: 'Generate Flashcards', 
      type: 'flashcards' as const,
      color: 'text-purple-600 hover:bg-purple-50'
    },
    { 
      icon: Brain, 
      label: 'Create Quiz', 
      type: 'quiz' as const,
      color: 'text-blue-600 hover:bg-blue-50'
    },
    { 
      icon: FileText, 
      label: 'Summarize', 
      type: 'summary' as const,
      color: 'text-green-600 hover:bg-green-50'
    },
    { 
      icon: StickyNote, 
      label: 'Study Notes', 
      type: 'notes' as const,
      color: 'text-orange-600 hover:bg-orange-50'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
      {/* Chat Header */}
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Study Assistant
        </h2>
      </div>

      {/* AI Toolbar */}
      <AIToolbar
        sessionId={sessionId}
        documentId={documentId}
        moduleId={moduleId}
        onContentGenerated={onContentGenerated}
      />

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
        <div className="py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">Start a conversation</p>
              <p className="text-sm">Ask questions about your study materials or generate learning content</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={cn(
                  "max-w-[70%] rounded-lg px-4 py-2",
                  message.role === 'user' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-900'
                )}>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        code(props: any) {
                          const {node, inline, className, children, ...rest} = props;
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={tomorrow}
                              language={match[1]}
                              PreTag="div"
                              {...rest}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...rest}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>

                {message.role === 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-white">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Tool Buttons */}
      <div className="border-t px-6 py-3">
        <div className="flex gap-2 flex-wrap">
          {toolButtons.map(({ icon: Icon, label, type, color }) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => onGenerateContent?.(type)}
              className={cn("flex items-center gap-2", color)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t px-6 py-4">
        <div className="flex gap-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your study materials..."
            className="flex-1 min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="self-end"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}