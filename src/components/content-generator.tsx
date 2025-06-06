'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Brain, 
  FileText, 
  StickyNote,
  ChevronRight,
  ChevronLeft,
  Save,
  Copy,
  CheckCircle
} from 'lucide-react';
import { EnhancedFlashcard, EnhancedQuiz } from '@/types/database';
import { cn } from '@/lib/utils';
import { formatForPreWrap } from '@/utils/text-formatting';

interface ContentGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'flashcards' | 'quiz' | 'summary' | 'notes';
  content?: {
    flashcards?: Partial<EnhancedFlashcard>[];
    quiz?: Partial<EnhancedQuiz>[];
    summary?: string;
    notes?: string;
  };
  onSave?: () => void;
  isLoading?: boolean;
}

export function ContentGenerator({
  open,
  onOpenChange,
  type,
  content,
  onSave,
  isLoading
}: ContentGeneratorProps) {
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  const typeConfig = {
    flashcards: {
      icon: Sparkles,
      title: 'Generated Flashcards',
      description: 'Review and save your AI-generated flashcards',
      color: 'text-purple-600'
    },
    quiz: {
      icon: Brain,
      title: 'Generated Quiz',
      description: 'Review and save your AI-generated quiz questions',
      color: 'text-blue-600'
    },
    summary: {
      icon: FileText,
      title: 'Generated Summary',
      description: 'Review and save your AI-generated summary',
      color: 'text-green-600'
    },
    notes: {
      icon: StickyNote,
      title: 'Generated Study Notes',
      description: 'Review and save your AI-generated study notes',
      color: 'text-orange-600'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedStates({ ...copiedStates, [id]: true });
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const renderFlashcards = () => {
    if (!content?.flashcards || content.flashcards.length === 0) return null;
    
    const currentCard = content.flashcards[currentFlashcardIndex];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600">
            Card {currentFlashcardIndex + 1} of {content.flashcards.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentFlashcardIndex(prev => Math.max(0, prev - 1));
                setShowAnswer(false);
              }}
              disabled={currentFlashcardIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentFlashcardIndex(prev => Math.min(content.flashcards!.length - 1, prev + 1));
                setShowAnswer(false);
              }}
              disabled={currentFlashcardIndex === content.flashcards.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card 
          className="p-6 min-h-[200px] cursor-pointer transition-all hover:shadow-lg"
          onClick={() => setShowAnswer(!showAnswer)}
        >
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              {showAnswer ? 'Answer' : 'Question'}
            </p>
            <p className="text-lg font-medium">
              {showAnswer ? currentCard.answer : currentCard.question}
            </p>
            {currentCard.difficulty_level && (
              <div className="mt-4">
                <Badge variant="outline">{currentCard.difficulty_level}</Badge>
              </div>
            )}
          </div>
        </Card>

        <p className="text-center text-sm text-gray-500">
          Click card to {showAnswer ? 'see question' : 'reveal answer'}
        </p>
      </div>
    );
  };

  const renderQuiz = () => {
    if (!content?.quiz || content.quiz.length === 0) return null;

    return (
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-6">
          {content.quiz.map((question, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <p className="font-medium">
                    {index + 1}. {question.question}
                  </p>
                  {question.difficulty_level && (
                    <div>
                      <Badge variant="outline">{question.difficulty_level}</Badge>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2 pl-4">
                  {question.options?.map((option, optIndex) => (
                    <div 
                      key={optIndex}
                      className={cn(
                        "p-2 rounded",
                        option === question.correct && "bg-green-50 border border-green-200"
                      )}
                    >
                      <span className="font-medium mr-2">
                        {String.fromCharCode(65 + optIndex)}.
                      </span>
                      {option}
                      {option === question.correct && (
                        <CheckCircle className="inline-block ml-2 h-4 w-4 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>

                {question.explanation && (
                  <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                    <span className="font-medium">Explanation:</span> {question.explanation}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    );
  };

  const renderTextContent = () => {
    const text = type === 'summary' ? content?.summary : content?.notes;
    if (!text) return null;

    return (
      <div className="space-y-4">
        <Card className="p-4">
          <ScrollArea className="h-[400px]">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {formatForPreWrap(text)}
            </div>
          </ScrollArea>
        </Card>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCopy(text, type)}
          className="w-full"
        >
          {copiedStates[type] ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </>
          )}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", config.color)} />
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-sm text-gray-500">Generating content...</p>
              </div>
            </div>
          ) : (
            <>
              {type === 'flashcards' && renderFlashcards()}
              {type === 'quiz' && renderQuiz()}
              {(type === 'summary' || type === 'notes') && renderTextContent()}
            </>
          )}
        </div>

        {!isLoading && content && (
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSave}>
              <Save className="h-4 w-4 mr-2" />
              Save to Study Materials
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}