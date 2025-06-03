'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Youtube, FileText, Upload } from 'lucide-react';
import { StudySession } from '@/types/study-session';

interface ContentViewerProps {
  session: StudySession;
}

export default function ContentViewer({ session }: ContentViewerProps) {
  const renderContent = () => {
    switch (session.source_type) {
      case 'youtube':
        return (
          <div className="space-y-4">
            {session.source_url && (
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${extractVideoId(session.source_url)}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full rounded-lg"
                />
              </div>
            )}
            {session.content_text && (
              <div>
                <h3 className="text-sm font-medium mb-2">Transcript</h3>
                <ScrollArea className="h-64 border rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">{session.content_text}</p>
                </ScrollArea>
              </div>
            )}
          </div>
        );

      case 'text':
        return (
          <ScrollArea className="h-full">
            <div className="p-4">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {session.content_text}
              </p>
            </div>
          </ScrollArea>
        );

      case 'document':
      case 'pdf':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Upload className="h-4 w-4" />
              <span>Document Content</span>
            </div>
            <ScrollArea className="h-full">
              <div className="p-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {session.content_text}
                </p>
              </div>
            </ScrollArea>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No content available</p>
          </div>
        );
    }
  };

  const getIcon = () => {
    switch (session.source_type) {
      case 'youtube':
        return <Youtube className="h-5 w-5" />;
      case 'text':
        return <FileText className="h-5 w-5" />;
      case 'document':
      case 'pdf':
        return <Upload className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getIcon()}
          Study Material
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {renderContent()}
      </CardContent>
    </Card>
  );
}

function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
} 