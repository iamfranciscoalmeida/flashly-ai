'use client';

import React, { useState, useEffect } from 'react';
import { SplitView } from '@/components/split-view';
import { ChatInterface } from '@/components/chat-interface';
import { DocumentViewer } from '@/components/document-viewer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  MessageSquare, 
  FileText, 
  Search,
  FolderOpen,
  Clock
} from 'lucide-react';
import { EnhancedDocument, ChatSession } from '@/types/database';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';

interface ChatPageClientProps {
  initialDocuments: EnhancedDocument[];
  initialSessions: ChatSession[];
  userId: string;
}

export function ChatPageClient({ 
  initialDocuments, 
  initialSessions, 
  userId 
}: ChatPageClientProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [sessions, setSessions] = useState(initialSessions);
  const [selectedDocument, setSelectedDocument] = useState<EnhancedDocument | null>(null);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const supabase = createClient();

  // Filter documents based on search
  const filteredDocuments = documents.filter(doc => 
    doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Create a new chat session
  const createNewSession = async (documentId?: string) => {
    setIsCreatingSession(true);
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          document_id: documentId,
          title: documentId 
            ? `Chat about ${documents.find(d => d.id === documentId)?.file_name}` 
            : 'New Chat'
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSessions([data, ...sessions]);
        setSelectedSession(data);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Handle document selection
  const handleDocumentSelect = (document: EnhancedDocument) => {
    setSelectedDocument(document);
    // If there's no session or the current session is not for this document, create a new one
    if (!selectedSession || selectedSession.document_id !== document.id) {
      createNewSession(document.id);
    }
  };

  // Handle session selection
  const handleSessionSelect = async (session: ChatSession) => {
    setSelectedSession(session);
    // If the session has a document, select it
    if (session.document_id) {
      const doc = documents.find(d => d.id === session.document_id);
      if (doc) setSelectedDocument(doc);
    }
  };

  // Get document URL
  const getDocumentUrl = (document: EnhancedDocument) => {
    if (document.source_type === 'url' || document.source_type === 'youtube') {
      return document.source_url;
    }
    return supabase.storage.from('study-documents').getPublicUrl(document.file_path).data.publicUrl;
  };

  // Left panel content (documents and sessions)
  const leftPanel = (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-semibold mb-3">Study Materials</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {/* Recent Sessions */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Chats
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => createNewSession()}
                disabled={isCreatingSession}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {sessions.map((session) => (
                <Card
                  key={session.id}
                  className={cn(
                    "p-3 cursor-pointer hover:bg-gray-50 transition-colors",
                    selectedSession?.id === session.id && "bg-primary/5 border-primary"
                  )}
                  onClick={() => handleSessionSelect(session)}
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{session.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(session.last_message_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div className="p-4 border-t">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Documents
            </h3>
            <div className="space-y-2">
              {filteredDocuments.map((document) => (
                <Card
                  key={document.id}
                  className={cn(
                    "p-3 cursor-pointer hover:bg-gray-50 transition-colors",
                    selectedDocument?.id === document.id && "bg-primary/5 border-primary"
                  )}
                  onClick={() => handleDocumentSelect(document)}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{document.file_name}</p>
                      <p className="text-xs text-gray-500">
                        {(document.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  // Right panel content (document viewer and chat)
  const rightPanel = selectedSession ? (
    <SplitView
      leftPanel={
        selectedDocument ? (
          <DocumentViewer
            documentId={selectedDocument.id}
            documentUrl={getDocumentUrl(selectedDocument)}
            documentType={selectedDocument.file_type}
            pageCount={selectedDocument.page_count || undefined}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Select a document to view</p>
            </div>
          </div>
        )
      }
      rightPanel={
        <ChatInterface
          sessionId={selectedSession.id}
          documentId={selectedDocument?.id}
          onGenerateContent={(type) => {
            console.log('Generate content:', type);
            // TODO: Implement content generation
          }}
        />
      }
      defaultLeftWidth={50}
      minLeftWidth={30}
      maxLeftWidth={70}
    />
  ) : (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium mb-2">Start a new conversation</p>
        <p className="text-sm text-gray-500 mb-4">Select a document or create a new chat</p>
        <Button onClick={() => createNewSession()}>
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex">
      <SplitView
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        defaultLeftWidth={25}
        minLeftWidth={20}
        maxLeftWidth={40}
      />
    </div>
  );
}