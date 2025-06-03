'use client';

import { useState, useEffect } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, 
  Brain, 
  FileQuestion, 
  BookOpen, 
  Network, 
  Clock,
  Youtube,
  FileText,
  Upload
} from 'lucide-react';
import { StudySession, ChatMessage, SessionContent } from '@/types/study-session';
import ChatPanel from './chat-panel';
import ContentViewer from './content-viewer';
import FlashcardsView from './flashcards-view';
import QuizView from './quiz-view';
import SummaryView from './summary-view';
import MindmapView from './mindmap-view';
import TimelineView from './timeline-view';

interface StudyInterfaceProps {
  sessionId: string;
  onBack: () => void;
}

export default function StudyInterface({ sessionId, onBack }: StudyInterfaceProps) {
  const [session, setSession] = useState<StudySession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionContent, setSessionContent] = useState<SessionContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('chat');

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/study-sessions/${sessionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load session');
      }

      const data = await response.json();
      setSession(data.session);
      setMessages(data.messages || []);
      setSessionContent(data.content || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const handleContentGenerated = (content: SessionContent) => {
    setSessionContent(prev => [content, ...prev]);
    // Switch to the appropriate tab
    setActiveTab(content.content_type);
  };

  const generateContent = async (contentType: SessionContent['content_type']) => {
    try {
      const response = await fetch(`/api/study-sessions/${sessionId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content_type: contentType }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const { content } = await response.json();
      handleContentGenerated(content);
    } catch (err) {
      console.error('Error generating content:', err);
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'youtube':
        return <Youtube className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'document':
      case 'pdf':
        return <Upload className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getContentByType = (type: SessionContent['content_type']) => {
    return sessionContent.find(content => content.content_type === type);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading study session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || 'Session not found'}</p>
          <Button onClick={onBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onBack}>
              ← Back
            </Button>
            <div className="flex items-center gap-2">
              {getSourceIcon(session.source_type)}
              <h1 className="text-xl font-semibold">{session.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session.subject && (
              <Badge variant="secondary">{session.subject}</Badge>
            )}
            {session.topic && (
              <Badge variant="outline">{session.topic}</Badge>
            )}
            {session.level && (
              <Badge variant="outline">{session.level}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Panel - Content Viewer */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full p-4">
              <ContentViewer session={session} />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Chat and Features */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="border-b p-4">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="chat" className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Chat</span>
                    </TabsTrigger>
                    <TabsTrigger value="flashcards" className="flex items-center gap-1">
                      <Brain className="h-4 w-4" />
                      <span className="hidden sm:inline">Cards</span>
                    </TabsTrigger>
                    <TabsTrigger value="quiz" className="flex items-center gap-1">
                      <FileQuestion className="h-4 w-4" />
                      <span className="hidden sm:inline">Quiz</span>
                    </TabsTrigger>
                    <TabsTrigger value="summary" className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span className="hidden sm:inline">Summary</span>
                    </TabsTrigger>
                    <TabsTrigger value="mindmap" className="flex items-center gap-1">
                      <Network className="h-4 w-4" />
                      <span className="hidden sm:inline">Mind Map</span>
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span className="hidden sm:inline">Timeline</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="chat" className="h-full m-0">
                    <ChatPanel
                      sessionId={sessionId}
                      messages={messages}
                      onNewMessage={handleNewMessage}
                      onGenerateContent={generateContent}
                    />
                  </TabsContent>

                  <TabsContent value="flashcards" className="h-full m-0">
                    <FlashcardsView
                      content={getContentByType('flashcards')}
                      onGenerate={() => generateContent('flashcards')}
                    />
                  </TabsContent>

                  <TabsContent value="quiz" className="h-full m-0">
                    <QuizView
                      content={getContentByType('quiz')}
                      onGenerate={() => generateContent('quiz')}
                    />
                  </TabsContent>

                  <TabsContent value="summary" className="h-full m-0">
                    <SummaryView
                      content={getContentByType('summary')}
                      onGenerate={() => generateContent('summary')}
                    />
                  </TabsContent>

                  <TabsContent value="mindmap" className="h-full m-0">
                    <MindmapView
                      content={getContentByType('mindmap')}
                      onGenerate={() => generateContent('mindmap')}
                    />
                  </TabsContent>

                  <TabsContent value="timeline" className="h-full m-0">
                    <TimelineView
                      content={getContentByType('timeline')}
                      onGenerate={() => generateContent('timeline')}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
} 