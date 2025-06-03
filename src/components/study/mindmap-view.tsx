'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Network, RotateCcw } from 'lucide-react';
import { SessionContent, MindmapContent } from '@/types/study-session';

interface MindmapViewProps {
  content: SessionContent | undefined;
  onGenerate: () => void;
}

export default function MindmapView({ content, onGenerate }: MindmapViewProps) {
  if (!content) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Network className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Mind Map Yet</h3>
          <p className="text-muted-foreground mb-4">
            Generate a mind map to visualize the connections in your study material.
          </p>
          <Button onClick={onGenerate}>
            <Network className="mr-2 h-4 w-4" />
            Generate Mind Map
          </Button>
        </div>
      </div>
    );
  }

  const mindmapData = content.content as MindmapContent;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Mind Map</h3>
          <Button variant="outline" size="sm" onClick={onGenerate}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Central Topic */}
          <div className="text-center">
            <Card className="inline-block bg-primary text-primary-foreground">
              <CardContent className="p-4">
                <h2 className="text-lg font-bold">{mindmapData.central_topic}</h2>
              </CardContent>
            </Card>
          </div>

          {/* Branches */}
          <div className="grid gap-6">
            {mindmapData.branches?.map((branch, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base bg-secondary text-secondary-foreground p-2 rounded">
                    {branch.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Subtopics */}
                  {branch.subtopics && branch.subtopics.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Subtopics:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {branch.subtopics.map((subtopic, subIndex) => (
                          <div
                            key={subIndex}
                            className="p-2 bg-muted rounded text-sm"
                          >
                            {subtopic}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Connections */}
                  {branch.connections && branch.connections.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Connections:</h4>
                      <div className="flex flex-wrap gap-1">
                        {branch.connections.map((connection, connIndex) => (
                          <span
                            key={connIndex}
                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                          >
                            {connection}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>

                {/* Visual connection line to center */}
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-px h-4 bg-border"></div>
              </Card>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
} 