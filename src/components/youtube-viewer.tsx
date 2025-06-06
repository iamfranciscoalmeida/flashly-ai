'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Volume2,
  Maximize2,
  Clock,
  ChevronRight,
  MessageSquare,
  BookOpen,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface YouTubeViewerProps {
  videoId: string;
  title: string;
  transcript?: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  className?: string;
  onTimeClick?: (time: number) => void;
}

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export function YouTubeViewer({
  videoId,
  title,
  transcript = '',
  segments = [],
  className,
  onTimeClick
}: YouTubeViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSegment, setActiveSegment] = useState(0);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSegmentClick = (segment: TranscriptSegment, index: number) => {
    setActiveSegment(index);
    onTimeClick?.(segment.start);
    // In a real implementation, you would control the YouTube player here
  };

  const keyAreas = [
    { title: "Introduction", time: 0, description: "Video overview and main topics" },
    { title: "Core Concepts", time: 120, description: "Main learning objectives" },
    { title: "Examples", time: 300, description: "Practical applications" },
    { title: "Summary", time: 450, description: "Key takeaways" }
  ];

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Video Player Section */}
      <div className="flex-1 flex flex-col">
        {/* Video Player */}
        <div className="bg-black relative" style={{ aspectRatio: '16/9' }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
          />
        </div>

        {/* Video Info */}
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">{title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatTime(currentTime)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{segments.length} segments</span>
            </div>
          </div>
        </div>

        {/* Key Areas Navigation */}
        <div className="p-4 border-b">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Key Areas
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {keyAreas.map((area, index) => (
              <Card 
                key={index}
                className={cn(
                  "p-3 cursor-pointer transition-colors hover:bg-gray-50",
                  currentTime >= area.time && (index === keyAreas.length - 1 || currentTime < keyAreas[index + 1]?.time) 
                    ? "border-blue-500 bg-blue-50" : ""
                )}
                onClick={() => onTimeClick?.(area.time)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{area.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {formatTime(area.time)}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{area.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Transcript Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Transcript
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFullTranscript(!showFullTranscript)}
            >
              {showFullTranscript ? 'Show Segments' : 'Full Text'}
            </Button>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            {showFullTranscript ? (
              // Full transcript view
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {transcript || 'Transcript not available for this video.'}
                </p>
              </div>
            ) : (
              // Segmented transcript view
              <div className="space-y-3">
                {segments.length > 0 ? (
                  segments.map((segment, index) => (
                    <Card
                      key={index}
                      className={cn(
                        "p-3 cursor-pointer transition-colors hover:bg-gray-50",
                        activeSegment === index ? "border-blue-500 bg-blue-50" : ""
                      )}
                      onClick={() => handleSegmentClick(segment, index)}
                    >
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="text-xs mt-1">
                          {formatTime(segment.start)}
                        </Badge>
                        <p className="text-sm leading-relaxed flex-1">
                          {segment.text}
                        </p>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No transcript segments available</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
} 