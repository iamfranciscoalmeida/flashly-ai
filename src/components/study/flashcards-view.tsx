'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { SessionContent, FlashcardContent } from '@/types/study-session';

interface FlashcardsViewProps {
  content: SessionContent | undefined;
  onGenerate: () => void;
}

export default function FlashcardsView({ content, onGenerate }: FlashcardsViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!content) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Flashcards Yet</h3>
          <p className="text-muted-foreground mb-4">
            Generate flashcards from your study material to start learning.
          </p>
          <Button onClick={onGenerate}>
            <Brain className="mr-2 h-4 w-4" />
            Generate Flashcards
          </Button>
        </div>
      </div>
    );
  }

  const flashcardData = content.content as FlashcardContent;
  const flashcards = flashcardData.flashcards || [];
  const currentCard = flashcards[currentIndex];

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    setIsFlipped(false);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    setIsFlipped(false);
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  if (flashcards.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">No flashcards available.</p>
          <Button onClick={onGenerate} className="mt-4">
            Regenerate Flashcards
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium">Flashcards</h3>
          <p className="text-sm text-muted-foreground">
            {currentIndex + 1} of {flashcards.length}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onGenerate}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Regenerate
        </Button>
      </div>

      {/* Flashcard */}
      <div className="flex-1 flex items-center justify-center">
        <Card 
          className="w-full max-w-md h-64 cursor-pointer transition-transform hover:scale-105"
          onClick={flipCard}
        >
          <CardContent className="h-full flex items-center justify-center p-6">
            <div className="text-center">
              {!isFlipped ? (
                <div>
                  <h4 className="text-lg font-medium mb-4">Question</h4>
                  <p className="text-sm">{currentCard.question}</p>
                </div>
              ) : (
                <div>
                  <h4 className="text-lg font-medium mb-4">Answer</h4>
                  <p className="text-sm">{currentCard.answer}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card Info */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {currentCard.difficulty && (
          <Badge variant={
            currentCard.difficulty === 'easy' ? 'secondary' :
            currentCard.difficulty === 'medium' ? 'default' : 'destructive'
          }>
            {currentCard.difficulty}
          </Badge>
        )}
        {currentCard.tags?.map((tag) => (
          <Badge key={tag} variant="outline">{tag}</Badge>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevCard}
          disabled={flashcards.length <= 1}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <Button
          variant={isFlipped ? "secondary" : "default"}
          onClick={flipCard}
        >
          {isFlipped ? "Show Question" : "Show Answer"}
        </Button>

        <Button
          variant="outline"
          onClick={nextCard}
          disabled={flashcards.length <= 1}
        >
          Next
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 