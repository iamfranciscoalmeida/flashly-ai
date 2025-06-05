"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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
  Lightbulb,
  FileText,
  Clock,
  Hash,
  Eye,
  EyeOff,
  Shuffle,
  PlayCircle,
  PauseCircle,
} from "lucide-react";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";

interface StandaloneFlashcard {
  question: string;
  answer: string;
  difficulty_level?: string;
  tags?: string[];
  source_reference?: {
    module?: string;
    page?: number;
    generated_at?: string;
  };
}

interface StandaloneFlashcardViewerProps {
  flashcards: StandaloneFlashcard[];
  title?: string;
  onShuffle?: () => void;
  onRegenerate?: () => void;
  isLoading?: boolean;
}

export function StandaloneFlashcardViewer({
  flashcards,
  title = "Study Session",
  onShuffle,
  onRegenerate,
  isLoading = false,
}: StandaloneFlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [bookmarkedCards, setBookmarkedCards] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [studyMode, setStudyMode] = useState<'manual' | 'auto'>('manual');
  const [autoPlayInterval, setAutoPlayInterval] = useState<NodeJS.Timeout | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [cardStartTime, setCardStartTime] = useState(Date.now());

  useEffect(() => {
    setCardStartTime(Date.now());
  }, [currentIndex]);

  useEffect(() => {
    if (studyMode === 'auto' && !autoPlayInterval) {
      const interval = setInterval(() => {
        if (isFlipped) {
          handleNext();
        } else {
          setIsFlipped(true);
        }
      }, 5000);
      setAutoPlayInterval(interval);
    } else if (studyMode === 'manual' && autoPlayInterval) {
      clearInterval(autoPlayInterval);
      setAutoPlayInterval(null);
    }

    return () => {
      if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
      }
    };
  }, [studyMode, isFlipped, autoPlayInterval]);

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No flashcards available</p>
          <p className="text-sm">Upload some content to generate flashcards!</p>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const isBookmarked = bookmarkedCards.has(currentIndex);
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      // Loop back to start
      setCurrentIndex(0);
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

  const handleJumpToCard = (index: number) => {
    setCurrentIndex(index);
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
    const cardText = `Q: ${currentCard.question}\n\nA: ${currentCard.answer}`;
    await navigator.clipboard.writeText(cardText);
    setCopiedIndex(currentIndex);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const shareCard = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Flashcard',
        text: `Q: ${currentCard.question}\n\nA: ${currentCard.answer}`,
      });
    } else {
      copyCard();
    }
  };

  const generateHint = (question: string) => {
    // Simple hint generation based on question structure
    const words = question.split(' ');
    if (words.length > 5) {
      return `Think about: ${words.slice(0, 3).join(' ')}...`;
    }
    return "Think about the key concepts in this question.";
  };

  const toggleStudyMode = () => {
    setStudyMode(studyMode === 'manual' ? 'auto' : 'manual');
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600">
          Study session • {flashcards.length} cards • {formatTime(Date.now() - sessionStartTime)} elapsed
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">
            Card {currentIndex + 1} of {flashcards.length}
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
            onClick={() => setShowHints(!showHints)}
            className={`${showHints ? 'bg-yellow-100 text-yellow-800' : ''}`}
          >
            <Lightbulb className="h-4 w-4" />
          </Button>

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
            onClick={toggleStudyMode}
            className={`${studyMode === 'auto' ? 'bg-blue-100 text-blue-800' : ''}`}
          >
            {studyMode === 'auto' ? (
              <PauseCircle className="h-4 w-4" />
            ) : (
              <PlayCircle className="h-4 w-4" />
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

          {onShuffle && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShuffle}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
          )}

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

      {/* Hint Section */}
      {showHints && !isFlipped && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Hint</span>
            </div>
            <p className="text-sm text-yellow-700">
              {generateHint(currentCard.question)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Flashcard */}
      <div className="relative">
        <Card 
          className={`min-h-[400px] cursor-pointer transition-all duration-500 hover:shadow-xl ${
            isFlipped ? 'transform' : ''
          }`}
          onClick={handleFlip}
        >
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center">
              <Badge variant="outline" className="text-xs">
                {isFlipped ? 'ANSWER' : 'QUESTION'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
            <div className="w-full space-y-6">
              {/* Card Content */}
              <div className="text-xl font-medium leading-relaxed text-gray-900">
                {isFlipped ? currentCard.answer : currentCard.question}
              </div>

              {/* Tags - shown on answer side */}
              {currentCard.tags && currentCard.tags.length > 0 && isFlipped && (
                <div className="flex flex-wrap justify-center gap-2">
                  {currentCard.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      <Hash className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Source Reference - shown on answer side */}
              {currentCard.source_reference && isFlipped && (
                <div className="text-xs text-gray-500 space-y-1">
                  {currentCard.source_reference.module && (
                    <div className="flex items-center justify-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>Module: {currentCard.source_reference.module}</span>
                    </div>
                  )}
                  {currentCard.source_reference.page && (
                    <div className="flex items-center justify-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>Page: {currentCard.source_reference.page}</span>
                    </div>
                  )}
                  {currentCard.source_reference.generated_at && (
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Generated: {new Date(currentCard.source_reference.generated_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Flip Hint */}
              <div className="text-sm text-gray-500">
                💡 Click to {isFlipped ? 'see question' : 'reveal answer'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Copy confirmation */}
        {copiedIndex === currentIndex && (
          <div className="absolute top-4 right-4 bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm animate-fade-in">
            Copied to clipboard!
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

        {/* Card indicators */}
        <div className="flex space-x-1 max-w-xs overflow-x-auto">
          {flashcards.map((_, index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-blue-500 scale-125'
                  : bookmarkedCards.has(index)
                  ? 'bg-yellow-500'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              onClick={() => handleJumpToCard(index)}
              title={`Card ${index + 1}${bookmarkedCards.has(index) ? ' (Bookmarked)' : ''}`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          onClick={handleNext}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Study Statistics */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{flashcards.length}</div>
              <div className="text-xs text-gray-600">Total Cards</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{currentIndex + 1}</div>
              <div className="text-xs text-gray-600">Current</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{bookmarkedCards.size}</div>
              <div className="text-xs text-gray-600">Bookmarked</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(progress)}%
              </div>
              <div className="text-xs text-gray-600">Progress</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookmarked Cards Quick Access */}
      {bookmarkedCards.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookmarkCheck className="h-5 w-5 text-yellow-500" />
              Bookmarked Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(bookmarkedCards).map((index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleJumpToCard(index)}
                  className="text-xs"
                >
                  Card {index + 1}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 