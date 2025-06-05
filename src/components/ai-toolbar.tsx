'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Brain, 
  FileText, 
  StickyNote,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentGeneratorModal } from './content-generator-modal';

interface AIToolbarProps {
  sessionId: string;
  documentId?: string;
  moduleId?: string;
  onContentGenerated?: (type: string, content: any) => void;
  className?: string;
}

type ContentType = 'flashcards' | 'quiz' | 'summary' | 'notes';

export function AIToolbar({ 
  sessionId, 
  documentId, 
  moduleId,
  onContentGenerated,
  className 
}: AIToolbarProps) {
  const [activeModal, setActiveModal] = useState<ContentType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const tools = [
    { 
      id: 'flashcards' as ContentType,
      icon: Sparkles, 
      label: 'Flashcards',
      description: 'Generate study flashcards'
    },
    { 
      id: 'quiz' as ContentType,
      icon: Brain, 
      label: 'Quiz',
      description: 'Create practice questions'
    },
    { 
      id: 'summary' as ContentType,
      icon: FileText, 
      label: 'Summary',
      description: 'Summarize key concepts'
    },
    { 
      id: 'notes' as ContentType,
      icon: StickyNote, 
      label: 'Study Notes',
      description: 'Create organized notes'
    }
  ];

  const handleGenerateContent = async (type: ContentType, options: any) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/chat/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          documentId,
          moduleId,
          type,
          options
        })
      });

      if (response.ok) {
        const data = await response.json();
        onContentGenerated?.(type, data.content);
        setActiveModal(null);
      }
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className={cn(
        "flex items-center gap-2 p-3 bg-gray-50 border-b",
        className
      )}>
        <span className="text-sm font-medium text-gray-700 mr-2">
          AI Tools:
        </span>
        <div className="flex gap-2 flex-wrap">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Button
                key={tool.id}
                variant="outline"
                size="sm"
                onClick={() => setActiveModal(tool.id)}
                className={cn(
                  "flex items-center gap-2",
                  "bg-white hover:bg-primary hover:text-white",
                  "border-gray-300 transition-all duration-200"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tool.label}</span>
              </Button>
            );
          })}
        </div>
        {isGenerating && (
          <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating...</span>
          </div>
        )}
      </div>

      {/* Content Generator Modal */}
      {activeModal && (
        <ContentGeneratorModal
          type={activeModal}
          isOpen={!!activeModal}
          onClose={() => setActiveModal(null)}
          onGenerate={(options) => handleGenerateContent(activeModal, options)}
          isGenerating={isGenerating}
        />
      )}
    </>
  );
}