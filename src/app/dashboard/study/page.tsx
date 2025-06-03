"use client";

import { useState, useEffect } from "react";
import DashboardNavbar from "@/components/dashboard-navbar";
import DocumentList from "@/components/document-list";
import FlashcardGenerator from "@/components/flashcard-generator";
import DashboardViewToggle from "@/components/dashboard-view-toggle";
import FolderSidebar from "@/components/folder-sidebar";
import ModuleList from "@/components/module-list";
import { createClient } from "../../../../supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, Layers } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Youtube, FileText, Clock, BookOpen, Brain } from 'lucide-react';
import { StudySession } from '@/types/study-session';
import SessionCreator from '@/components/study/session-creator';
import StudyInterface from '@/components/study/study-interface';

interface Document {
  id: string;
  file_name: string;
  status: "processing" | "completed" | "error";
  file_path: string;
  folder_id: string | null;
}

interface Module {
  id: string;
  title: string;
  document_id: string;
  order: number;
  summary: string | null;
  created_at: string;
  completed?: boolean;
}

export default function StudyPage() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/study-sessions');
      if (response.ok) {
        const { sessions } = await response.json();
        setSessions(sessions || []);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionCreated = (sessionId: string) => {
    setShowCreator(false);
    setActiveSessionId(sessionId);
    loadSessions(); // Refresh the list
  };

  const handleSessionSelect = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleBackToList = () => {
    setActiveSessionId(null);
    loadSessions(); // Refresh when returning to list
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

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.topic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If viewing a specific session
  if (activeSessionId) {
    return <StudyInterface sessionId={activeSessionId} onBack={handleBackToList} />;
  }

  // If showing session creator
  if (showCreator) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="container mx-auto p-8">
          <SessionCreator
            onSessionCreated={handleSessionCreated}
            onClose={() => setShowCreator(false)}
          />
        </div>
      </div>
    );
  }

  // Main sessions list view
  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="container mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Study Sessions</h1>
            <p className="text-muted-foreground mt-1">
              Manage your AI-powered study sessions
            </p>
          </div>
          <Button onClick={() => setShowCreator(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Session
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions by title, subject, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Sessions Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading sessions...</p>
            </div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-12">
            {sessions.length === 0 ? (
              <div>
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Study Sessions Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first study session to get started with AI-powered learning.
                </p>
                <Button onClick={() => setShowCreator(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Session
                </Button>
              </div>
            ) : (
              <div>
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Sessions Found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or create a new session.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSessions.map((session) => (
              <Card
                key={session.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleSessionSelect(session.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getSourceIcon(session.source_type)}
                      <CardTitle className="text-lg line-clamp-2">
                        {session.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Labels */}
                    <div className="flex flex-wrap gap-2">
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

                    {/* Content preview */}
                    {session.content_text && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {session.content_text.substring(0, 150)}...
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(session.created_at).toLocaleDateString()}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {session.source_type}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {sessions.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{sessions.length}</p>
                    <p className="text-sm text-muted-foreground">Total Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Brain className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {new Set(sessions.map(s => s.subject).filter(Boolean)).size}
                    </p>
                    <p className="text-sm text-muted-foreground">Subjects</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Youtube className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {sessions.filter(s => s.source_type === 'youtube').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Video Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
