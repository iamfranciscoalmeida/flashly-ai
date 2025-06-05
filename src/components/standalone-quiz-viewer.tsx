"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
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
  Shuffle,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Brain,
  Target,
} from "lucide-react";
import { Progress } from "./ui/progress";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";

interface StandaloneQuizQuestion {
  question: string;
  options?: string[];
  correct: string;
  explanation?: string;
  difficulty_level?: string;
  tags?: string[];
  source_reference?: {
    module?: string;
    page?: number;
    generated_at?: string;
  };
}

interface QuizAnswer {
  questionIndex: number;
  answer: string;
  isCorrect?: boolean;
  aiGrading?: {
    score: number;
    feedback: string;
    correctness: 'correct' | 'partial' | 'incorrect';
  };
}

interface StandaloneQuizViewerProps {
  questions: StandaloneQuizQuestion[];
  title?: string;
  mode?: 'multiple-choice' | 'free-answer';
  onModeChange?: (mode: 'multiple-choice' | 'free-answer') => void;
  onShuffle?: () => void;
  onRegenerate?: () => void;
  isLoading?: boolean;
}

export function StandaloneQuizViewer({
  questions,
  title = "Quiz Session",
  mode = 'multiple-choice',
  onModeChange,
  onShuffle,
  onRegenerate,
  isLoading = false,
}: StandaloneQuizViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [isGrading, setIsGrading] = useState(false);

  useEffect(() => {
    // Reset when questions change
    setAnswers([]);
    setCurrentIndex(0);
    setCurrentAnswer("");
    setShowResults(false);
  }, [questions]);

  if (!questions || questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No quiz questions available</p>
          <p className="text-sm">Generate some quiz questions to get started!</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isBookmarked = bookmarkedQuestions.has(currentIndex);
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const currentQuestionAnswer = answers.find(a => a.questionIndex === currentIndex);

  const handleAnswerSelect = (answer: string) => {
    setCurrentAnswer(answer);
  };

  const submitAnswer = async () => {
    const answer: QuizAnswer = {
      questionIndex: currentIndex,
      answer: currentAnswer,
    };

    if (mode === 'multiple-choice') {
      // For multiple choice, check against correct answer
      answer.isCorrect = currentAnswer === currentQuestion.correct;
    } else {
      // For free answer, use AI grading
      setIsGrading(true);
      try {
        const grading = await gradeAnswerWithAI(
          currentQuestion.question,
          currentAnswer,
          currentQuestion.correct,
          currentQuestion.explanation
        );
        answer.aiGrading = grading;
        answer.isCorrect = grading.correctness === 'correct';
      } catch (error) {
        console.error('Error grading answer:', error);
        // Fallback: simple string comparison
        answer.isCorrect = currentAnswer.toLowerCase().includes(currentQuestion.correct.toLowerCase());
      } finally {
        setIsGrading(false);
      }
    }

    setAnswers(prev => {
      const existing = prev.filter(a => a.questionIndex !== currentIndex);
      return [...existing, answer];
    });

    setShowResults(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      const nextAnswer = answers.find(a => a.questionIndex === currentIndex + 1);
      setCurrentAnswer(nextAnswer?.answer || "");
      setShowResults(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      const prevAnswer = answers.find(a => a.questionIndex === currentIndex - 1);
      setCurrentAnswer(prevAnswer?.answer || "");
      setShowResults(!!prevAnswer);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setAnswers([]);
    setCurrentAnswer("");
    setShowResults(false);
  };

  const handleJumpToQuestion = (index: number) => {
    setCurrentIndex(index);
    const answer = answers.find(a => a.questionIndex === index);
    setCurrentAnswer(answer?.answer || "");
    setShowResults(!!answer);
  };

  const toggleBookmark = () => {
    const newBookmarked = new Set(bookmarkedQuestions);
    if (isBookmarked) {
      newBookmarked.delete(currentIndex);
    } else {
      newBookmarked.add(currentIndex);
    }
    setBookmarkedQuestions(newBookmarked);
  };

  const copyQuestion = async () => {
    const questionText = `Q: ${currentQuestion.question}\n\nA: ${currentQuestion.correct}${currentQuestion.explanation ? `\n\nExplanation: ${currentQuestion.explanation}` : ''}`;
    await navigator.clipboard.writeText(questionText);
    setCopiedIndex(currentIndex);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const generateHint = (question: string) => {
    const words = question.split(' ');
    if (words.length > 5) {
      return `Think about: ${words.slice(0, 3).join(' ')}...`;
    }
    return "Think about the key concepts in this question.";
  };

  const getScore = () => {
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    return {
      correct: correctAnswers,
      total: answers.length,
      percentage: answers.length > 0 ? Math.round((correctAnswers / answers.length) * 100) : 0
    };
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
          Quiz session • {questions.length} questions • {formatTime(Date.now() - sessionStartTime)} elapsed
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex justify-center">
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <Button
            variant={mode === 'multiple-choice' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onModeChange?.('multiple-choice')}
            className="flex items-center gap-2"
          >
            <Target className="h-4 w-4" />
            Multiple Choice
          </Button>
          <Button
            variant={mode === 'free-answer' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onModeChange?.('free-answer')}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Free Answer
          </Button>
        </div>
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
            Question {currentIndex + 1} of {questions.length}
          </span>
          {currentQuestion.difficulty_level && (
            <Badge 
              variant={
                currentQuestion.difficulty_level === 'easy' ? 'default' :
                currentQuestion.difficulty_level === 'medium' ? 'secondary' : 'destructive'
              }
            >
              {currentQuestion.difficulty_level}
            </Badge>
          )}
          {currentQuestionAnswer && (
            <Badge variant={currentQuestionAnswer.isCorrect ? 'default' : 'destructive'}>
              {currentQuestionAnswer.isCorrect ? 'Correct' : 'Incorrect'}
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
            disabled={currentIndex === 0 && answers.length === 0}
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
            onClick={copyQuestion}
            disabled={copiedIndex === currentIndex}
          >
            <Copy className="h-4 w-4" />
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
      {showHints && !showResults && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Hint</span>
            </div>
            <p className="text-sm text-yellow-700">
              {generateHint(currentQuestion.question)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Question Card */}
      <Card className="min-h-[400px]">
        <CardHeader>
          <CardTitle className="text-xl">
            {currentQuestion.question}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Answer Input */}
          {!showResults && (
            <div className="space-y-4">
              {mode === 'multiple-choice' && currentQuestion.options ? (
                <RadioGroup value={currentAnswer} onValueChange={handleAnswerSelect}>
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="free-answer">Your Answer:</Label>
                  <Textarea
                    id="free-answer"
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    className="min-h-[120px]"
                  />
                </div>
              )}

              <Button
                onClick={submitAnswer}
                disabled={!currentAnswer.trim() || isGrading}
                className="w-full"
              >
                {isGrading ? (
                  <>
                    <Brain className="h-4 w-4 mr-2 animate-pulse" />
                    AI is grading your answer...
                  </>
                ) : (
                  'Submit Answer'
                )}
              </Button>
            </div>
          )}

          {/* Results Display */}
          {showResults && currentQuestionAnswer && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${currentQuestionAnswer.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {currentQuestionAnswer.isCorrect ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-medium ${currentQuestionAnswer.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                    {currentQuestionAnswer.isCorrect ? 'Correct!' : 'Incorrect'}
                  </span>
                </div>
                
                <p className={`text-sm ${currentQuestionAnswer.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  Your answer: {currentQuestionAnswer.answer}
                </p>
                
                {!currentQuestionAnswer.isCorrect && (
                  <p className="text-sm text-gray-700 mt-2">
                    Correct answer: {currentQuestion.correct}
                  </p>
                )}
              </div>

              {/* AI Grading Feedback */}
              {currentQuestionAnswer.aiGrading && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">AI Feedback</span>
                      <Badge variant="outline">
                        Score: {currentQuestionAnswer.aiGrading.score}/100
                      </Badge>
                    </div>
                    <p className="text-sm text-blue-700">
                      {currentQuestionAnswer.aiGrading.feedback}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Explanation */}
              {currentQuestion.explanation && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-800">Explanation</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {currentQuestion.explanation}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Tags and References */}
              {(currentQuestion.tags || currentQuestion.source_reference) && (
                <div className="space-y-2">
                  {currentQuestion.tags && currentQuestion.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {currentQuestion.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Hash className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {currentQuestion.source_reference && (
                    <div className="text-xs text-gray-500 space-y-1">
                      {currentQuestion.source_reference.module && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>Module: {currentQuestion.source_reference.module}</span>
                        </div>
                      )}
                      {currentQuestion.source_reference.generated_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Generated: {new Date(currentQuestion.source_reference.generated_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>

        {copiedIndex === currentIndex && (
          <div className="absolute top-4 right-4 bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm">
            Copied to clipboard!
          </div>
        )}
      </Card>

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

        <div className="flex space-x-1 max-w-xs overflow-x-auto">
          {questions.map((_, index) => {
            const answer = answers.find(a => a.questionIndex === index);
            return (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentIndex
                    ? 'bg-blue-500 scale-125'
                    : answer
                    ? answer.isCorrect
                      ? 'bg-green-500'
                      : 'bg-red-500'
                    : bookmarkedQuestions.has(index)
                    ? 'bg-yellow-500'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                onClick={() => handleJumpToQuestion(index)}
                title={`Question ${index + 1}${bookmarkedQuestions.has(index) ? ' (Bookmarked)' : ''}${answer ? (answer.isCorrect ? ' ✓' : ' ✗') : ''}`}
              />
            );
          })}
        </div>

        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === questions.length - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Quiz Statistics */}
      {answers.length > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
                <div className="text-xs text-gray-600">Total Questions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{getScore().correct}</div>
                <div className="text-xs text-gray-600">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{getScore().total - getScore().correct}</div>
                <div className="text-xs text-gray-600">Incorrect</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{getScore().percentage}%</div>
                <div className="text-xs text-gray-600">Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookmarked Questions Quick Access */}
      {bookmarkedQuestions.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookmarkCheck className="h-5 w-5 text-yellow-500" />
              Bookmarked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(bookmarkedQuestions).map((index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleJumpToQuestion(index)}
                  className="text-xs"
                >
                  Question {index + 1}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// AI Grading Function
async function gradeAnswerWithAI(
  question: string,
  userAnswer: string,
  correctAnswer: string,
  explanation?: string
): Promise<{
  score: number;
  feedback: string;
  correctness: 'correct' | 'partial' | 'incorrect';
}> {
  try {
    const response = await fetch('/api/ai/grade-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        userAnswer,
        correctAnswer,
        explanation
      })
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error grading answer:', error);
  }

  // Fallback grading
  const userLower = userAnswer.toLowerCase().trim();
  const correctLower = correctAnswer.toLowerCase().trim();
  
  if (userLower === correctLower) {
    return {
      score: 100,
      feedback: "Perfect! Your answer matches the correct answer exactly.",
      correctness: 'correct'
    };
  } else if (userLower.includes(correctLower) || correctLower.includes(userLower)) {
    return {
      score: 75,
      feedback: "Good! Your answer contains key elements of the correct answer, but could be more complete.",
      correctness: 'partial'
    };
  } else {
    return {
      score: 0,
      feedback: "Your answer doesn't match the expected response. Please review the explanation and try again.",
      correctness: 'incorrect'
    };
  }
} 