'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Youtube, FileText, Link, Loader2 } from 'lucide-react';
import { CreateSessionRequest } from '@/types/study-session';

interface SessionCreatorProps {
  onSessionCreated: (sessionId: string) => void;
  onClose: () => void;
}

export default function SessionCreator({ onSessionCreated, onClose }: SessionCreatorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const createSession = async (sessionData: CreateSessionRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/study-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const { session } = await response.json();
      onSessionCreated(session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleYouTubeSubmit = () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    createSession({
      title: 'YouTube Video Session',
      source_type: 'youtube',
      source_url: youtubeUrl.trim(),
    });
  };

  const handleTextSubmit = () => {
    if (!textContent.trim()) {
      setError('Please enter some text content');
      return;
    }

    createSession({
      title: textTitle.trim() || 'Text Study Session',
      source_type: 'text',
      content_text: textContent.trim(),
    });
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First upload the file
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const { document } = await uploadResponse.json();

      // Then create session with the document
      createSession({
        title: selectedFile.name.replace(/\.[^/.]+$/, ''),
        source_type: 'document',
        document_id: document.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Create New Study Session
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="youtube" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="youtube" className="flex items-center gap-2">
              <Youtube className="h-4 w-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Text
            </TabsTrigger>
            <TabsTrigger value="file" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube Video URL</Label>
              <Input
                id="youtube-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                Paste a YouTube video URL to extract transcript and create a study session
              </p>
            </div>
            <Button 
              onClick={handleYouTubeSubmit} 
              disabled={isLoading || !youtubeUrl.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Video...
                </>
              ) : (
                <>
                  <Link className="mr-2 h-4 w-4" />
                  Create Session from Video
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text-title">Title (Optional)</Label>
              <Input
                id="text-title"
                placeholder="Study Session Title"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="text-content">Study Content</Label>
              <Textarea
                id="text-content"
                placeholder="Paste your notes, lecture transcript, or any study material here..."
                className="min-h-[200px]"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                Enter any text content you want to study. This could be notes, articles, or lecture transcripts.
              </p>
            </div>
            <Button 
              onClick={handleTextSubmit} 
              disabled={isLoading || !textContent.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Content...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Create Session from Text
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="file" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Upload Document</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                Upload a PDF, Word document, or text file to create a study session
              </p>
            </div>
            {selectedFile && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
            <Button 
              onClick={handleFileUpload} 
              disabled={isLoading || !selectedFile}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading & Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Create Session from File
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 