'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  Upload, 
  Link, 
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
  ArrowUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface YouLearnChatProps {
  sessionId: string;
  onNewContent?: (content: string, type: 'upload' | 'paste' | 'record') => void;
}

export function YouLearnChatInterface({ sessionId, onNewContent }: YouLearnChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showInitialOptions, setShowInitialOptions] = useState(true);
  const [pasteInput, setPasteInput] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [sessionContent, setSessionContent] = useState<string>(''); // Store content for this session
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

     const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file) {
       const reader = new FileReader();
       reader.onload = (e) => {
         const content = e.target?.result as string;
         setSessionContent(prev => prev + '\n\n' + content);
         addMessage('user', `Uploaded file: ${file.name}`);
         addMessage('assistant', `I've received your file "${file.name}". You can now ask me questions about it or generate study materials!`);
         onNewContent?.(content, 'upload');
         setShowInitialOptions(false);
       };
       reader.readAsText(file);
     }
   };

     const handlePasteContent = () => {
     if (pasteInput.trim()) {
       setSessionContent(prev => prev + '\n\n' + pasteInput);
       addMessage('user', `Pasted content: ${pasteInput.substring(0, 100)}...`);
       addMessage('assistant', `I've received your content. You can now ask me questions about it or generate study materials!`);
       onNewContent?.(pasteInput, 'paste');
       setPasteInput('');
       setShowPasteModal(false);
       setShowInitialOptions(false);
     }
   };

  const handleDirectQuestion = () => {
    setShowInitialOptions(false);
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    addMessage('user', userMessage);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate AI response - replace with actual API call
      setTimeout(() => {
        addMessage('assistant', 'I understand your question. How can I help you learn better?');
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

     const generateContent = async (type: 'flashcards' | 'quiz' | 'summary' | 'notes') => {
     setIsLoading(true);
     try {
       // This will use the relative URL, which should work with any port
       const response = await fetch('/api/chat/generate', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           sessionId,
           type,
           content: sessionContent, // Pass the session content
           options: { quantity: 10, difficulty: 'medium' }
         })
       });

       if (response.ok) {
         const data = await response.json();
         addMessage('assistant', `Generated ${type}:\n\n${JSON.stringify(data.content, null, 2)}`);
       } else {
         const errorData = await response.json();
         addMessage('assistant', `Sorry, I couldn't generate ${type}. ${errorData.error || 'Please make sure you have content to work with.'}`);
       }
     } catch (error) {
       console.error('Error generating content:', error);
       addMessage('assistant', `Error generating ${type}. Please try again.`);
     } finally {
       setIsLoading(false);
     }
   };

  if (showInitialOptions && messages.length === 0) {
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold mb-4">What do you want to learn today?</h1>
        </div>

        {/* Input Options */}
        <div className="flex-1 max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Upload */}
            <Card 
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Upload</h3>
                <p className="text-sm text-gray-600">File, Audio, Video</p>
              </div>
            </Card>

            {/* Paste */}
            <Card 
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
              onClick={() => setShowPasteModal(true)}
            >
              <div className="text-center">
                <Link className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Paste</h3>
                <p className="text-sm text-gray-600">YouTube, Website, Text</p>
              </div>
            </Card>

            {/* Record */}
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary">
              <div className="text-center">
                <Mic className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Record</h3>
                <p className="text-sm text-gray-600">Record Class, Video Call</p>
              </div>
            </Card>
          </div>

          {/* Direct Question Input */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Or ask AI tutor"
                className="pr-12 min-h-[60px] text-lg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleDirectQuestion();
                    sendMessage();
                  }
                }}
              />
              <Button
                size="icon"
                className="absolute right-2 bottom-2 rounded-full"
                onClick={() => {
                  handleDirectQuestion();
                  sendMessage();
                }}
                disabled={!input.trim()}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept=".txt,.pdf,.doc,.docx"
        />

        {/* Paste Modal */}
        {showPasteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="p-6 max-w-md w-full mx-4">
              <h3 className="font-semibold mb-4">Paste Content</h3>
              <Textarea
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                placeholder="Paste your content here (YouTube URL, text, etc.)"
                className="mb-4 min-h-[120px]"
              />
              <div className="flex gap-2">
                <Button onClick={handlePasteContent} disabled={!pasteInput.trim()}>
                  Add Content
                </Button>
                <Button variant="outline" onClick={() => setShowPasteModal(false)}>
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Study Assistant
        </h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            setMessages([]);
            setShowInitialOptions(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* AI Tools */}
      <div className="border-b px-6 py-3 bg-gray-50">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateContent('flashcards')}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Flashcards
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateContent('quiz')}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Brain className="h-4 w-4" />
            Quiz
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateContent('summary')}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Summary
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateContent('notes')}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <StickyNote className="h-4 w-4" />
            Study Notes
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
        <div className="py-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              
              <div className={cn(
                "max-w-[70%] rounded-lg px-4 py-2",
                message.role === 'user' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 text-gray-900'
              )}>
                                 <div className="prose prose-sm max-w-none">
                   <ReactMarkdown>
                     {message.content}
                   </ReactMarkdown>
                 </div>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t px-6 py-4">
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your study materials..."
            className="flex-1 min-h-[60px] resize-none"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 