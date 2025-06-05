"use client";

import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Bookmark,
  BookmarkCheck,
  Share2,
  Copy,
  RefreshCw,
} from "lucide-react";
import { EnhancedFlashcard } from "@/types/database";

interface InteractiveFlashcardViewerProps {
  flashcards: Partial<EnhancedFlashcard>[];
  onRegenerate?: () => void;
  isLoading?: boolean;
}

export function InteractiveFlashcardViewer({
  flashcards,
  onRegenerate,
  isLoading = false,
}: InteractiveFlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [bookmarkedCards, setBookmarkedCards] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No flashcards available</p>
          <p className="text-sm">Generate some flashcards to get started!</p>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const isBookmarked = bookmarkedCards.has(currentIndex);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const toggleBookmark = () => {
    const newBookmarked = new Set(bookmarkedCards);
    if (isBookmarked) {
      newBookmarked.delete(currentIndex);
    } else {
      newBookmarked.add(currentIndex);
    }
    setBookmarkedCards(newBookmarked);
  };

  const copyCard = async () => {
    const cardText = `Q: ${currentCard.question}\nA: ${currentCard.answer}`;
    await navigator.clipboard.writeText(cardText);
    setCopiedIndex(currentIndex);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const shareCard = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Flashcard',
        text: `Q: ${currentCard.question}\nA: ${currentCard.answer}`,
      });
    } else {
      copyCard();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header with navigation and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-600">
            {currentIndex + 1} of {flashcards.length}
          </span>
          {currentCard.difficulty_level && (
            <Badge 
              variant={
                currentCard.difficulty_level === 'easy' ? 'default' :
                currentCard.difficulty_level === 'medium' ? 'secondary' : 'destructive'
              }
            >
              {currentCard.difficulty_level}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={currentIndex === 0}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleBookmark}
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-4 w-4 text-yellow-500" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={copyCard}
            disabled={copiedIndex === currentIndex}
          >
            <Copy className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={shareCard}
          >
            <Share2 className="h-4 w-4" />
          </Button>

          {onRegenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Flashcard */}
      <div className="relative">
        <Card 
          className={`min-h-[300px] cursor-pointer transition-all duration-300 hover:shadow-lg ${
            isFlipped ? 'transform' : ''
          }`}
          onClick={handleFlip}
        >
          <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
            <div className="w-full">
              {/* Card Type Indicator */}
              <div className="flex justify-center mb-4">
                <Badge variant="outline" className="text-xs">
                  {isFlipped ? 'ANSWER' : 'QUESTION'}
                </Badge>
              </div>

              {/* Card Content */}
              <div className="space-y-6">
                <div className="text-lg font-medium leading-relaxed">
                  {isFlipped ? currentCard.answer : currentCard.question}
                </div>

                {/* Tags */}
                {currentCard.tags && currentCard.tags.length > 0 && isFlipped && (
                  <div className="flex flex-wrap justify-center gap-1">
                    {currentCard.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Flip Hint */}
              <div className="mt-6 text-sm text-gray-500">
                💡 Click to {isFlipped ? 'see question' : 'reveal answer'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Copy confirmation */}
        {copiedIndex === currentIndex && (
          <div className="absolute top-4 right-4 bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm">
            Copied!
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="flex space-x-1">
          {flashcards.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex
                  ? 'bg-blue-500'
                  : bookmarkedCards.has(index)
                  ? 'bg-yellow-500'
                  : 'bg-gray-300'
              }`}
              onClick={() => {
                setCurrentIndex(index);
                setIsFlipped(false);
              }}
            />
          ))}
        </div>

        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Study Progress */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{Math.round(((currentIndex + 1) / flashcards.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
          />
        </div>
        {bookmarkedCards.size > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            {bookmarkedCards.size} card{bookmarkedCards.size !== 1 ? 's' : ''} bookmarked
          </p>
        )}
      </div>
    </div>
  );
} 