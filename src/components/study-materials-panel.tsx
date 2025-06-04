"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import {
  X,
  Brain,
  FileQuestion,
  BookOpen,
  Network,
  Clock,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";

interface StudyMaterial {
  id: string;
  type: string;
  payload: any;
  created_at: string;
}

interface StudyMaterialsPanelProps {
  conversationId: string;
  onClose: () => void;
}

export default function StudyMaterialsPanel({
  conversationId,
  onClose,
}: StudyMaterialsPanelProps) {
  const [materials, setMaterials] = useState<Record<string, StudyMaterial>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("flashcards");
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    fetchMaterials();
  }, [conversationId]);

  const fetchMaterials = async () => {
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/materials`,
      );
      const data = await response.json();
      if (response.ok) {
        const materialsMap: Record<string, StudyMaterial> = {};
        data.materials?.forEach((material: StudyMaterial) => {
          materialsMap[material.type] = material;
        });
        setMaterials(materialsMap);
      }
    } catch (error) {
      console.error("Error fetching materials:", error);
    }
  };

  const generateMaterial = async (type: string, options: any = {}) => {
    setLoading((prev) => ({ ...prev, [type]: true }));
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ type, options }),
        },
      );

      const data = await response.json();
      if (response.ok) {
        setMaterials((prev) => ({
          ...prev,
          [type]: data.material,
        }));

        // Reset indices when new material is generated
        if (type === "flashcards") {
          setCurrentFlashcardIndex(0);
          setFlipped(false);
        } else if (type === "quiz") {
          setCurrentQuizIndex(0);
          setSelectedAnswer(null);
          setShowAnswer(false);
          setQuizScore({ correct: 0, total: 0 });
        }
      }
    } catch (error) {
      console.error(`Error generating ${type}:`, error);
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleFlashcardFlip = () => {
    setFlipped(!flipped);
  };

  const handleNextFlashcard = () => {
    const flashcards = materials.flashcards?.payload?.flashcards || [];
    if (currentFlashcardIndex < flashcards.length - 1) {
      setCurrentFlashcardIndex(currentFlashcardIndex + 1);
      setFlipped(false);
    }
  };

  const handlePreviousFlashcard = () => {
    if (currentFlashcardIndex > 0) {
      setCurrentFlashcardIndex(currentFlashcardIndex - 1);
      setFlipped(false);
    }
  };

  const handleQuizAnswer = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleCheckAnswer = () => {
    const questions = materials.quiz?.payload?.questions || [];
    const currentQuestion = questions[currentQuizIndex];
    if (selectedAnswer && currentQuestion) {
      setShowAnswer(true);
      if (selectedAnswer === currentQuestion.correct) {
        setQuizScore((prev) => ({
          ...prev,
          correct: prev.correct + 1,
          total: prev.total + 1,
        }));
      } else {
        setQuizScore((prev) => ({ ...prev, total: prev.total + 1 }));
      }
    }
  };

  const handleNextQuiz = () => {
    const questions = materials.quiz?.payload?.questions || [];
    if (currentQuizIndex < questions.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
    }
  };

  const handlePreviousQuiz = () => {
    if (currentQuizIndex > 0) {
      setCurrentQuizIndex(currentQuizIndex - 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
    }
  };

  const flashcards = materials.flashcards?.payload?.flashcards || [];
  const questions = materials.quiz?.payload?.questions || [];
  const summary = materials.summary?.payload?.summary || "";
  const mindmap = materials.mindmap?.payload?.mindmap || null;
  const timeline = materials.timeline?.payload?.timeline || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Study Materials</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-5 m-4">
            <TabsTrigger value="flashcards" className="text-xs">
              <Brain className="h-3 w-3 mr-1" />
              Cards
            </TabsTrigger>
            <TabsTrigger value="quiz" className="text-xs">
              <FileQuestion className="h-3 w-3 mr-1" />
              Quiz
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="mindmap" className="text-xs">
              <Network className="h-3 w-3 mr-1" />
              Mind Map
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Timeline
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden px-4 pb-4">
            <TabsContent value="flashcards" className="h-full">
              {flashcards.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Brain className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-sm text-gray-500 mb-4">
                      Generate flashcards from your conversation
                    </p>
                    <Button
                      onClick={() =>
                        generateMaterial("flashcards", { num_cards: 5 })
                      }
                      disabled={loading.flashcards}
                      size="sm"
                    >
                      {loading.flashcards ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Brain className="mr-2 h-4 w-4" />
                      )}
                      Generate Flashcards
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 h-full flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      {currentFlashcardIndex + 1} of {flashcards.length}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        generateMaterial("flashcards", { num_cards: 5 })
                      }
                      disabled={loading.flashcards}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>

                  <Card
                    className="flex-1 cursor-pointer"
                    onClick={handleFlashcardFlip}
                  >
                    <CardContent className="p-4 flex items-center justify-center text-center h-full">
                      <div className="w-full">
                        <h4 className="text-sm font-medium mb-2">
                          {flipped ? "Answer" : "Question"}
                        </h4>
                        <p className="text-sm">
                          {flipped
                            ? flashcards[currentFlashcardIndex]?.answer
                            : flashcards[currentFlashcardIndex]?.question}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Click to {flipped ? "see question" : "reveal answer"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousFlashcard}
                      disabled={currentFlashcardIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextFlashcard}
                      disabled={currentFlashcardIndex === flashcards.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="quiz" className="h-full">
              {questions.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileQuestion className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-sm text-gray-500 mb-4">
                      Generate quiz questions from your conversation
                    </p>
                    <Button
                      onClick={() =>
                        generateMaterial("quiz", { num_questions: 5 })
                      }
                      disabled={loading.quiz}
                      size="sm"
                    >
                      {loading.quiz ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileQuestion className="mr-2 h-4 w-4" />
                      )}
                      Generate Quiz
                    </Button>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          Question {currentQuizIndex + 1} of {questions.length}
                        </span>
                        <Badge variant="secondary">
                          Score: {quizScore.correct}/{quizScore.total}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          generateMaterial("quiz", { num_questions: 5 })
                        }
                        disabled={loading.quiz}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">
                          {questions[currentQuizIndex]?.stem}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <RadioGroup
                          value={selectedAnswer || ""}
                          onValueChange={handleQuizAnswer}
                          disabled={showAnswer}
                        >
                          {questions[currentQuizIndex]?.choices.map(
                            (choice: string, index: number) => {
                              const choiceLabel = String.fromCharCode(
                                65 + index,
                              );
                              const isCorrect =
                                choiceLabel ===
                                questions[currentQuizIndex]?.correct;
                              const isSelected = selectedAnswer === choiceLabel;

                              return (
                                <div
                                  key={index}
                                  className={`flex items-center space-x-2 p-2 rounded text-sm ${
                                    showAnswer
                                      ? isCorrect
                                        ? "bg-green-100 text-green-800"
                                        : isSelected
                                          ? "bg-red-100 text-red-800"
                                          : ""
                                      : ""
                                  }`}
                                >
                                  <RadioGroupItem
                                    value={choiceLabel}
                                    id={choiceLabel}
                                  />
                                  <Label
                                    htmlFor={choiceLabel}
                                    className="flex-1 cursor-pointer text-xs"
                                  >
                                    {choiceLabel}. {choice}
                                  </Label>
                                  {showAnswer && isCorrect && (
                                    <Check className="h-3 w-3 text-green-600" />
                                  )}
                                </div>
                              );
                            },
                          )}
                        </RadioGroup>

                        <div className="mt-4 flex justify-between">
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handlePreviousQuiz}
                              disabled={currentQuizIndex === 0}
                            >
                              <ChevronLeft className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleNextQuiz}
                              disabled={
                                currentQuizIndex === questions.length - 1
                              }
                            >
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            onClick={handleCheckAnswer}
                            disabled={!selectedAnswer || showAnswer}
                          >
                            Check
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="summary" className="h-full">
              {!summary ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-sm text-gray-500 mb-4">
                      Generate a summary from your conversation
                    </p>
                    <Button
                      onClick={() => generateMaterial("summary")}
                      disabled={loading.summary}
                      size="sm"
                    >
                      {loading.summary ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <BookOpen className="mr-2 h-4 w-4" />
                      )}
                      Generate Summary
                    </Button>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateMaterial("summary")}
                        disabled={loading.summary}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm whitespace-pre-wrap">{summary}</p>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="mindmap" className="h-full">
              {!mindmap ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Network className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-sm text-gray-500 mb-4">
                      Generate a mind map from your conversation
                    </p>
                    <Button
                      onClick={() => generateMaterial("mindmap")}
                      disabled={loading.mindmap}
                      size="sm"
                    >
                      {loading.mindmap ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Network className="mr-2 h-4 w-4" />
                      )}
                      Generate Mind Map
                    </Button>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateMaterial("mindmap")}
                        disabled={loading.mindmap}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center mb-4">
                          <h4 className="font-semibold text-lg">
                            {mindmap.central_topic}
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {mindmap.branches?.map(
                            (branch: any, index: number) => (
                              <div
                                key={index}
                                className="border-l-2 border-blue-200 pl-4"
                              >
                                <h5 className="font-medium text-sm">
                                  {branch.topic}
                                </h5>
                                {branch.subtopics && (
                                  <ul className="mt-2 space-y-1">
                                    {branch.subtopics.map(
                                      (subtopic: string, subIndex: number) => (
                                        <li
                                          key={subIndex}
                                          className="text-xs text-gray-600 ml-4"
                                        >
                                          • {subtopic}
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="h-full">
              {timeline.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Clock className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-sm text-gray-500 mb-4">
                      Generate a timeline from your conversation
                    </p>
                    <Button
                      onClick={() => generateMaterial("timeline")}
                      disabled={loading.timeline}
                      size="sm"
                    >
                      {loading.timeline ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Clock className="mr-2 h-4 w-4" />
                      )}
                      Generate Timeline
                    </Button>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateMaterial("timeline")}
                        disabled={loading.timeline}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {timeline.map((event: any, index: number) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                {event.date}
                              </div>
                              <div className="flex-1">
                                <h5 className="font-medium text-sm">
                                  {event.title}
                                </h5>
                                <p className="text-xs text-gray-600 mt-1">
                                  {event.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
