'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, RotateCcw } from 'lucide-react';
import { SessionContent, SummaryContent } from '@/types/study-session';

interface SummaryViewProps {
  content: SessionContent | undefined;
  onGenerate: () => void;
}

export default function SummaryView({ content, onGenerate }: SummaryViewProps) {
  if (!content) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Summary Yet</h3>
          <p className="text-muted-foreground mb-4">
            Generate a summary from your study material to get key insights.
          </p>
          <Button onClick={onGenerate}>
            <BookOpen className="mr-2 h-4 w-4" />
            Generate Summary
          </Button>
        </div>
      </div>
    );
  }

  const summaryData = content.content as SummaryContent;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Summary</h3>
          <div className="flex items-center gap-2">
            {summaryData.difficulty_level && (
              <Badge variant="outline">{summaryData.difficulty_level}</Badge>
            )}
            <Button variant="outline" size="sm" onClick={onGenerate}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Main Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{summaryData.summary}</p>
            </CardContent>
          </Card>

          {/* Key Points */}
          {summaryData.key_points && summaryData.key_points.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Points</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {summaryData.key_points.map((point, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2"></span>
                      <span className="text-sm">{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Main Topics */}
          {summaryData.main_topics && summaryData.main_topics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Main Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {summaryData.main_topics.map((topic, index) => (
                    <Badge key={index} variant="secondary">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 