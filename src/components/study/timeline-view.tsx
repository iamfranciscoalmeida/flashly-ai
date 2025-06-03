'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, RotateCcw } from 'lucide-react';
import { SessionContent, TimelineContent } from '@/types/study-session';

interface TimelineViewProps {
  content: SessionContent | undefined;
  onGenerate: () => void;
}

export default function TimelineView({ content, onGenerate }: TimelineViewProps) {
  if (!content) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Timeline Yet</h3>
          <p className="text-muted-foreground mb-4">
            Generate a timeline to see the chronological flow of your study material.
          </p>
          <Button onClick={onGenerate}>
            <Clock className="mr-2 h-4 w-4" />
            Generate Timeline
          </Button>
        </div>
      </div>
    );
  }

  const timelineData = content.content as TimelineContent;

  const getImportanceBadgeVariant = (importance?: string) => {
    switch (importance) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Timeline</h3>
          <Button variant="outline" size="sm" onClick={onGenerate}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border"></div>

          {/* Timeline events */}
          <div className="space-y-6">
            {timelineData.events?.map((event, index) => (
              <div key={index} className="relative flex items-start gap-4">
                {/* Timeline dot */}
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center z-10">
                  <div className="w-3 h-3 bg-primary-foreground rounded-full"></div>
                </div>

                {/* Event content */}
                <Card className="flex-1">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{event.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        {event.importance && (
                          <Badge variant={getImportanceBadgeVariant(event.importance)}>
                            {event.importance}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {event.date}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {event.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {timelineData.events?.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No timeline events available.</p>
              <Button onClick={onGenerate} className="mt-4">
                Regenerate Timeline
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 