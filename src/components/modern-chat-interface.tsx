'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  Link2, 
  Mic, 
  Send, 
  FileText, 
  Youtube, 
  Globe,
  Plus,
  Sparkles,
  Brain,
  BookOpen,
  StickyNote,
  User,
  Bot,
  ArrowUp,
  Paperclip,
  X,
  FileIcon,
  Image,
  Music,
  Video,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Copy,
  MoreVertical,
  Download,
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  attachments?: FileAttachment[];
  feedback?: 'positive' | 'negative';
  isTyping?: boolean;
}

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  progress?: number;
}

interface ModernChatInterfaceProps {
  sessionId: string;
  onNewContent?: (content: string, type: 'upload' | 'paste' | 'record') => void;
}

export function ModernChatInterface({ sessionId, onNewContent }: ModernChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [sessionContent, setSessionContent] = useState<string>('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load message history when session changes
  useEffect(() => {
    const loadMessageHistory = async () => {
      if (!sessionId) return;
      
      setIsLoadingHistory(true);
      try {
        const response = await fetch(`/api/chat/messages?sessionId=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            const formattedMessages: Message[] = data.messages.map((msg: any) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.created_at),
              status: 'sent' as const,
              attachments: msg.metadata?.attachments || []
            }));
            setMessages(formattedMessages);
            setShowLandingPage(false);
          }
        }
      } catch (error) {
        console.error('Error loading message history:', error);
        toast({
          title: "Error",
          description: "Failed to load message history",
          variant: "destructive",
        });
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadMessageHistory();
  }, [sessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // File upload handlers
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newAttachments: FileAttachment[] = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'uploading' as const,
      progress: 0
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    
    // Simulate file upload with progress
    newAttachments.forEach((attachment, index) => {
      simulateFileUpload(attachment.id, files[index]);
    });
  };

  const simulateFileUpload = async (attachmentId: string, file: File) => {
    // Simulate progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setAttachments((prev: FileAttachment[]) => prev.map((att: FileAttachment) => 
        att.id === attachmentId ? { ...att, progress } : att
      ));
    }

    // Mark as processing
    setAttachments((prev: FileAttachment[]) => prev.map((att: FileAttachment) => 
      att.id === attachmentId ? { ...att, status: 'processing' as const } : att
    ));

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mark as ready
    setAttachments((prev: FileAttachment[]) => prev.map((att: FileAttachment) => 
      att.id === attachmentId ? { ...att, status: 'ready' as const, url: URL.createObjectURL(file) } : att
    ));

    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setSessionContent((prev: string) => prev + '\n\n' + content);
      onNewContent?.(content, 'upload');
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Message handlers
  const addMessage = (role: Message['role'], content: string, attachments?: FileAttachment[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      status: 'sending',
      attachments: attachments?.filter(att => att.status === 'ready')
    };
    
    setMessages((prev: Message[]) => [...prev, newMessage]);
    
    // Mark as sent after a short delay
    setTimeout(() => {
      setMessages((prev: Message[]) => prev.map((msg: Message) => 
        msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
      ));
    }, 300);
    
    return newMessage;
  };

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    setShowLandingPage(false);
    const userMessage = input;
    const readyAttachments = attachments.filter((att: FileAttachment) => att.status === 'ready');
    
    // Add user message immediately for better UX
    const tempUserMessage = addMessage('user', userMessage, readyAttachments);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages((prev: Message[]) => [...prev, typingMessage]);

    try {
      // Call the real API
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: userMessage,
          attachments: readyAttachments,
          context: sessionContent
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Remove typing indicator
      setMessages((prev: Message[]) => prev.filter((msg: Message) => msg.id !== 'typing'));
      
      // Add AI response
      if (data.aiMessage) {
        addMessage('assistant', data.aiMessage.content);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove typing indicator
      setMessages((prev: Message[]) => prev.filter((msg: Message) => msg.id !== 'typing'));
      
      // Show error message
      addMessage('assistant', 'I apologize, but I encountered an error. Please try again or refresh the page if the issue persists.');
      
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages((prev: Message[]) => prev.map((msg: Message) => 
      msg.id === messageId ? { ...msg, feedback } : msg
    ));
    toast({
      title: feedback === 'positive' ? "Thanks for your feedback!" : "Feedback noted",
      description: feedback === 'positive' 
        ? "Glad this was helpful!" 
        : "We'll work on improving our responses.",
    });
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied!",
      description: "Message copied to clipboard",
    });
  };

  const generateContent = async (type: 'flashcards' | 'quiz' | 'summary' | 'notes') => {
    if (!sessionContent && messages.filter((m: Message) => m.role === 'user').length === 0) {
      toast({
        title: "No content available",
        description: "Please upload content or ask a question first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setShowLandingPage(false);
    
    // Add user message
    addMessage('user', `Generate ${type} from the content`);
    
    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const response = await fetch('/api/chat/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          type,
          content: sessionContent,
          options: { quantity: 10, difficulty: 'medium' }
        })
      });

      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));

      if (response.ok) {
        const data = await response.json();
        addMessage('assistant', `Here are your generated ${type}:\n\n${JSON.stringify(data.content, null, 2)}`);
      } else {
        throw new Error('Failed to generate content');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));
      toast({
        title: "Generation failed",
        description: `Failed to generate ${type}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Landing page component
  if (showLandingPage && messages.length === 0 && !isLoadingHistory) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-white to-gray-50">
        {/* Hero Section */}
        <div className="text-center py-12 px-6">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent"
          >
            What would you like to learn today?
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600"
          >
            Upload your materials, paste content, or ask questions to get started
          </motion.p>
        </div>

        {/* Upload Options Grid */}
        <div className="flex-1 max-w-5xl mx-auto px-6 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          >
            {/* Upload Files */}
            <Card 
              className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-primary group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Upload Files</h3>
                <p className="text-sm text-gray-600">PDFs, Documents, Images</p>
                <p className="text-xs text-gray-400 mt-2">Drag & drop supported</p>
              </div>
            </Card>

            {/* Paste Content */}
            <Card 
              className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-primary group"
              onClick={() => {
                setShowLandingPage(false);
                setTimeout(() => textareaRef.current?.focus(), 100);
              }}
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Link2 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Paste Content</h3>
                <p className="text-sm text-gray-600">YouTube, Web links, Text</p>
                <p className="text-xs text-gray-400 mt-2">Smart content extraction</p>
              </div>
            </Card>

            {/* Record Audio */}
            <Card className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-primary group">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Mic className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Record Audio</h3>
                <p className="text-sm text-gray-600">Voice notes, Lectures</p>
                <p className="text-xs text-gray-400 mt-2">Live transcription</p>
              </div>
            </Card>
          </motion.div>

          {/* Quick Start Input */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-3xl mx-auto"
          >
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Or just ask me anything..."
                className="pr-12 min-h-[80px] text-lg rounded-2xl border-2 focus:border-primary transition-colors resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button
                size="icon"
                className="absolute right-3 bottom-3 rounded-full h-10 w-10 bg-primary hover:bg-primary/90"
                onClick={sendMessage}
                disabled={!input.trim() && attachments.length === 0}
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>

          {/* Recently Used / Suggested Topics */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 text-center"
          >
            <p className="text-sm text-gray-500 mb-4">Popular topics</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Biology', 'History', 'Mathematics', 'Literature', 'Physics', 'Chemistry'].map((topic) => (
                <Badge 
                  key={topic}
                  variant="secondary" 
                  className="cursor-pointer hover:bg-primary hover:text-white transition-colors"
                  onClick={() => {
                    setInput(`Teach me about ${topic}`);
                    setShowLandingPage(false);
                  }}
                >
                  {topic}
                </Badge>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          multiple
          accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.mp4"
        />
      </div>
    );
  }

  // Loading state
  if (isLoadingHistory) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading conversation...</p>
        </div>
      </div>
    );
  }

  // Main chat interface
  return (
    <TooltipProvider>
      <div 
        className="h-full flex flex-col bg-white"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drop zone overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center"
            >
              <div className="bg-white rounded-2xl p-8 shadow-2xl border-2 border-dashed border-primary">
                <Upload className="h-16 w-16 text-primary mx-auto mb-4" />
                <p className="text-lg font-semibold">Drop your files here</p>
                <p className="text-sm text-gray-600 mt-2">We support PDFs, documents, images, and more</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              AI Study Assistant
            </h2>
            <Badge variant="secondary">GPT-4 Powered</Badge>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setMessages([]);
              setShowLandingPage(true);
              setSessionContent('');
              setAttachments([]);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* AI Tools Bar */}
        <div className="border-b px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateContent('flashcards')}
              disabled={isLoading}
              className="flex items-center gap-2 hover:bg-primary hover:text-white transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Flashcards
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateContent('quiz')}
              disabled={isLoading}
              className="flex items-center gap-2 hover:bg-primary hover:text-white transition-colors"
            >
              <Brain className="h-4 w-4" />
              Quiz
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateContent('summary')}
              disabled={isLoading}
              className="flex items-center gap-2 hover:bg-primary hover:text-white transition-colors"
            >
              <FileText className="h-4 w-4" />
              Summary
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateContent('notes')}
              disabled={isLoading}
              className="flex items-center gap-2 hover:bg-primary hover:text-white transition-colors"
            >
              <StickyNote className="h-4 w-4" />
              Study Notes
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="py-4 max-w-4xl mx-auto">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={cn(
                    "mb-6 flex gap-3",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={cn(
                    "group relative max-w-[80%] rounded-2xl px-4 py-3",
                    message.role === 'user' 
                      ? 'bg-primary text-white ml-12' 
                      : 'bg-gray-100 text-gray-900 mr-12'
                  )}>
                    {/* Message content */}
                    {message.isTyping ? (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 bg-gray-400 rounded-full"
                              animate={{ y: [0, -10, 0] }}
                              transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                delay: i * 0.1
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                        
                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {message.attachments.map((attachment) => (
                              <div key={attachment.id} className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
                                <FileIcon className="h-4 w-4" />
                                <span className="text-sm">{attachment.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Message metadata */}
                        <div className={cn(
                          "flex items-center gap-2 mt-2 text-xs",
                          message.role === 'user' ? 'text-white/70' : 'text-gray-500'
                        )}>
                          <Clock className="h-3 w-3" />
                          {new Date(message.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                          {message.status === 'sending' && <Loader2 className="h-3 w-3 animate-spin" />}
                          {message.status === 'sent' && <CheckCircle2 className="h-3 w-3" />}
                          {message.status === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
                        </div>
                      </>
                    )}
                    
                    {/* Message actions */}
                    {!message.isTyping && (
                      <div className={cn(
                        "absolute -bottom-8 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                        message.role === 'user' && 'left-auto right-0'
                      )}>
                        {message.role === 'assistant' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => handleFeedback(message.id, 'positive')}
                            >
                              <ThumbsUp className={cn(
                                "h-3 w-3",
                                message.feedback === 'positive' && "fill-current"
                              )} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => handleFeedback(message.id, 'negative')}
                            >
                              <ThumbsDown className={cn(
                                "h-3 w-3",
                                message.feedback === 'negative' && "fill-current"
                              )} />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => copyMessage(message.content)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 px-2">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Export
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-gray-200">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-white/80 backdrop-blur-sm px-4 py-4">
          <div className="max-w-4xl mx-auto">
            {/* File attachments preview */}
            {attachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div 
                    key={attachment.id}
                    className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm"
                  >
                    {attachment.status === 'uploading' && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{attachment.name}</span>
                        <Progress value={attachment.progress} className="w-20 h-1" />
                      </>
                    )}
                    {attachment.status === 'processing' && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>{attachment.name}</span>
                        <span className="text-xs text-gray-500">Processing...</span>
                      </>
                    )}
                    {attachment.status === 'ready' && (
                      <>
                        <FileIcon className="h-4 w-4 text-green-600" />
                        <span>{attachment.name}</span>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </>
                    )}
                    {attachment.status === 'error' && (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-red-600">{attachment.name}</span>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => setAttachments(prev => prev.filter(a => a.id !== attachment.id))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Input controls */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="min-h-[52px] max-h-[200px] pr-12 resize-none rounded-xl"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-2 bottom-2 h-8 w-8"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach files</TooltipContent>
                </Tooltip>
              </div>
              <Button
                onClick={sendMessage}
                disabled={(!input.trim() && attachments.length === 0) || isLoading}
                className="rounded-xl"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span>Powered by GPT-4</span>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          multiple
          accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.mp4"
        />
      </div>
    </TooltipProvider>
  );
}