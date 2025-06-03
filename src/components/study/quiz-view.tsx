'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FileQuestion, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { SessionContent, QuizContent } from '@/types/study-session';

interface QuizViewProps {
  content: SessionContent | undefined;
  onGenerate: () => void;
}

export default function QuizView({ content, onGenerate }: QuizViewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  if (!content) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <FileQuestion className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Quiz Yet</h3>
          <p className="text-muted-foreground mb-4">
            Generate a quiz from your study material to test your knowledge.
          </p>
          <Button onClick={onGenerate}>
            <FileQuestion className="mr-2 h-4 w-4" />
            Generate Quiz
          </Button>
        </div>
      </div>
    );
  }

  const quizData = content.content as QuizContent;
  const questions = quizData.questions || [];

  if (questions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">No questions available.</p>
          <Button onClick={onGenerate} className="mt-4">
            Regenerate Quiz
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const answeredQuestions = Object.keys(selectedAnswers).length;

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correct_answer) {
        correct++;
      }
    });
    return correct;
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const submitQuiz = () => {
    setShowResults(true);
  };

  const resetQuiz = () => {
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
  };

  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score / totalQuestions) * 100);

    return (
      <div className="h-full flex flex-col p-4">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold mb-2">Quiz Results</h3>
          <div className="text-4xl font-bold mb-2">
            {score}/{totalQuestions}
          </div>
          <div className="text-lg text-muted-foreground">
            {percentage}% Correct
          </div>
        </div>

        <div className="flex-1 overflow-auto space-y-4">
          {questions.map((question, index) => {
            const userAnswer = selectedAnswers[index];
            const isCorrect = userAnswer === question.correct_answer;

            return (
              <Card key={question.id} className="border-l-4 border-l-muted">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">Question {index + 1}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-3">{question.question}</p>
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={`p-2 rounded text-sm ${
                          optionIndex === question.correct_answer
                            ? 'bg-green-100 text-green-800'
                            : optionIndex === userAnswer && !isCorrect
                            ? 'bg-red-100 text-red-800'
                            : 'bg-muted'
                        }`}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                  {question.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                      <strong>Explanation:</strong> {question.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={resetQuiz} variant="outline" className="flex-1">
            Retake Quiz
          </Button>
          <Button onClick={onGenerate} className="flex-1">
            <RotateCcw className="mr-2 h-4 w-4" />
            Generate New Quiz
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
          <h3 className="text-lg font-medium">Quiz</h3>
          <p className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">
            {answeredQuestions}/{totalQuestions} answered
          </Badge>
          <Button variant="outline" size="sm" onClick={onGenerate}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Question */}
      <Card className="flex-1 mb-4">
        <CardHeader>
          <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
          {currentQuestion.difficulty && (
            <Badge variant="outline" className="w-fit">
              {currentQuestion.difficulty}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedAnswers[currentQuestionIndex]?.toString()}
            onValueChange={(value) => 
              handleAnswerSelect(currentQuestionIndex, parseInt(value))
            }
          >
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevQuestion}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>

        <div className="flex gap-2">
          {currentQuestionIndex === totalQuestions - 1 ? (
            <Button
              onClick={submitQuiz}
              disabled={answeredQuestions < totalQuestions}
            >
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={nextQuestion}
              disabled={currentQuestionIndex === totalQuestions - 1}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 