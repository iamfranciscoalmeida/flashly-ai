'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { 
  Send, 
  Loader2,
  User,
  Bot,
  Paperclip,
  FileText,
  Youtube,
  Image as ImageIcon,
  Link,
  X,
  Plus
} from 'lucide-react';
import { Message } from '@/types/database';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AIToolbar } from './ai-toolbar';

interface ChatInterfaceV2Props {
  sessionId: string;
  documentId?: string;
  moduleId?: string;
  onContentGenerated?: (type: string, content: any) => void;
  onAddContent?: (type: string, data: any) => void;
}

interface Attachment {
  id: string;
  type: 'pdf' | 'youtube' | 'image';
  name: string;
  data?: any;
}

export function ChatInterfaceV2({ 
  sessionId, 
  documentId, 
  moduleId,
  onContentGenerated,
  onAddContent
}: ChatInterfaceV2Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showYoutubeDialog, setShowYoutubeDialog] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();

  // Load messages for the session
  useEffect(() => {
    loadMessages();
  }, [sessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
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
      metadata: { attachments },
      created_at: new Date().toISOString()
    };

    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          content: input,
          documentId,
          moduleId,
          attachments
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

  const handleFileUpload = (type: 'pdf' | 'image') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'pdf' ? '.pdf' : 'image/*';
      fileInputRef.current.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          const attachment: Attachment = {
            id: Date.now().toString(),
            type,
            name: file.name,
            data: file
          };
          setAttachments([...attachments, attachment]);
          onAddContent?.(type, { file });
        }
      };
      fileInputRef.current.click();
    }
    setShowAttachmentMenu(false);
  };

  const handleYoutubeAdd = () => {
    if (youtubeUrl.trim()) {
      const attachment: Attachment = {
        id: Date.now().toString(),
        type: 'youtube',
        name: 'YouTube Video',
        data: { url: youtubeUrl }
      };
      setAttachments([...attachments, attachment]);
      onAddContent?.('youtube', { url: youtubeUrl });
      setYoutubeUrl('');
      setShowYoutubeDialog(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* AI Toolbar */}
      <AIToolbar
        sessionId={sessionId}
        documentId={documentId}
        moduleId={moduleId}
        onContentGenerated={onContentGenerated}
        className="border-b"
      />

      {/* Messages Area */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">How can I help you study today?</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Ask questions, upload materials, or generate study content from your documents
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowAttachmentMenu(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Study Material
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={cn(
                    "max-w-[85%] md:max-w-[75%]",
                    message.role === 'user' ? 'order-1' : 'order-2'
                  )}>
                    <div className={cn(
                      "rounded-2xl px-4 py-3",
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    )}>
                      <div className={cn(
                        "prose prose-sm max-w-none",
                        message.role === 'user' ? 'prose-invert' : 'dark:prose-invert'
                      )}>
                        <ReactMarkdown
                          components={{
                            code(props: any) {
                              const {node, inline, className, children, ...rest} = props;
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={theme === 'dark' ? oneDark : tomorrow}
                                  language={match[1]}
                                  PreTag="div"
                                  className="rounded-lg"
                                  {...rest}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className={cn("px-1 py-0.5 rounded-sm bg-primary/10", className)} {...rest}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      {message.metadata?.attachments && message.metadata.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.metadata.attachments.map((att: Attachment) => (
                            <div key={att.id} className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-xs">
                              {att.type === 'pdf' && <FileText className="h-3 w-3" />}
                              {att.type === 'youtube' && <Youtube className="h-3 w-3" />}
                              {att.type === 'image' && <ImageIcon className="h-3 w-3" />}
                              <span className="truncate max-w-[100px]">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8 mt-1 order-2">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t">
        <div className="max-w-4xl mx-auto p-4">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachments.map(attachment => (
                <Card key={attachment.id} className="flex items-center gap-2 px-3 py-1.5">
                  {attachment.type === 'pdf' && <FileText className="h-4 w-4 text-blue-500" />}
                  {attachment.type === 'youtube' && <Youtube className="h-4 w-4 text-red-500" />}
                  {attachment.type === 'image' && <ImageIcon className="h-4 w-4 text-green-500" />}
                  <span className="text-sm truncate max-w-[150px]">{attachment.name}</span>
                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Card>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className="h-10 w-10"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              
              {showAttachmentMenu && (
                <Card className="absolute bottom-12 left-0 p-2 shadow-lg">
                  <button
                    onClick={() => handleFileUpload('pdf')}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-md w-full text-left text-sm"
                  >
                    <FileText className="h-4 w-4 text-blue-500" />
                    Upload PDF
                  </button>
                  <button
                    onClick={() => {
                      setShowYoutubeDialog(true);
                      setShowAttachmentMenu(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-md w-full text-left text-sm"
                  >
                    <Youtube className="h-4 w-4 text-red-500" />
                    YouTube Link
                  </button>
                  <button
                    onClick={() => handleFileUpload('image')}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-md w-full text-left text-sm"
                  >
                    <ImageIcon className="h-4 w-4 text-green-500" />
                    Upload Image
                  </button>
                </Card>
              )}
            </div>
            
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or describe what you want to learn..."
              className="flex-1 min-h-[44px] max-h-[200px] resize-none"
              rows={1}
              disabled={isLoading}
            />
            
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-10 w-10"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
      />

      {/* YouTube Dialog */}
      <Dialog open={showYoutubeDialog} onOpenChange={setShowYoutubeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add YouTube Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleYoutubeAdd();
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowYoutubeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleYoutubeAdd} disabled={!youtubeUrl.trim()}>
                Add Video
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}