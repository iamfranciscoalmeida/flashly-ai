"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Save,
  X,
  Check,
  Brain,
  BookOpen,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { createClient } from "../../supabase/client";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { StandaloneFlashcardViewer } from "./standalone-flashcard-viewer";
import { ContentGeneratorModal } from "./content-generator-modal";
import { formatForPreWrap } from '@/utils/text-formatting';

interface Document {
  id: string;
  file_name: string;
  status: "processing" | "completed" | "error";
  folder_id: string | null;
}

interface Module {
  id: string;
  title: string;
  document_id: string;
  order: number;
  summary: string | null;
  created_at: string;
  completed?: boolean;
  start_page?: number | null;
  end_page?: number | null;
  content_excerpt?: string | null;
}

interface StudyMaterial {
  id: string;
  module_id: string;
  type: 'flashcards' | 'quiz' | 'summary';
  payload: any;
  generated_at: string | null;
}

interface Flashcard {
  question: string;
  answer: string;
}

interface QuizQuestion {
  stem: string;
  choices: string[];
  correct: string;
}

interface FlashcardGeneratorProps {
  document: Document | null;
  selectedModule?: Module | null;
}

export default function FlashcardGenerator({
  document,
  selectedModule = null,
}: FlashcardGeneratorProps) {
  const [studyMaterials, setStudyMaterials] = useState<Record<string, StudyMaterial>>({});
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState({
    question: "",
    answer: "",
  });
  const [activeTab, setActiveTab] = useState("flashcards");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [currentGenerationType, setCurrentGenerationType] = useState<'flashcards' | 'quiz' | 'summary'>('flashcards');
  const supabase = createClient();

  useEffect(() => {
    if (selectedModule) {
      fetchStudyMaterials();
    } else {
      setStudyMaterials({});
      setError(null);
    }
  }, [selectedModule]);

  const fetchStudyMaterials = async () => {
    if (!selectedModule) return;

    try {
      const response = await fetch(`/api/modules/${selectedModule.id}/materials`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch study materials');
      }

      // Convert array to object keyed by type
      const materialsMap: Record<string, StudyMaterial> = {};
      if (result.materials) {
        result.materials.forEach((material: StudyMaterial) => {
          materialsMap[material.type] = material;
        });
      }

      setStudyMaterials(materialsMap);
      setCurrentFlashcardIndex(0);
      setCurrentQuizIndex(0);
      setFlipped(false);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setQuizScore({ correct: 0, total: 0 });
    } catch (error) {
      console.error("Error fetching study materials:", error);
      setError(error instanceof Error ? error.message : 'Failed to fetch study materials');
    }
  };

  const handleGenerateFromModal = async (options: { quantity: number; difficulty: string; pageRange?: any }) => {
    const type = currentGenerationType;
    
    // Convert modal options to API format
    const apiOptions: any = {};
    
    if (type === 'flashcards') {
      apiOptions.num_cards = options.quantity;
    } else if (type === 'quiz') {
      apiOptions.num_questions = options.quantity;
    } else if (type === 'summary') {
      apiOptions.maxLength = options.quantity; // For summary, quantity represents word count
    }
    
    apiOptions.difficulty = options.difficulty;
    if (options.pageRange) {
      apiOptions.pageRange = options.pageRange;
    }
    
    setShowGenerateModal(false);
    await generateStudyMaterial(type, apiOptions);
  };

  const generateStudyMaterial = async (type: 'flashcards' | 'quiz' | 'summary', options: any = {}) => {
    if (!selectedModule) return;

    try {
      setLoading(prev => ({ ...prev, [type]: true }));
      setError(null);

      const response = await fetch(`/api/modules/${selectedModule.id}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          options,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to generate ${type}`);
      }

      // Update the study materials state
      setStudyMaterials(prev => ({
        ...prev,
        [type]: result.data,
      }));

      // Reset indices and states
      if (type === 'flashcards') {
        setCurrentFlashcardIndex(0);
        setFlipped(false);
      } else if (type === 'quiz') {
        setCurrentQuizIndex(0);
        setSelectedAnswer(null);
        setShowAnswer(false);
        setQuizScore({ correct: 0, total: 0 });
      }

    } catch (error) {
      console.error(`Error generating ${type}:`, error);
      setError(error instanceof Error ? error.message : `Failed to generate ${type}`);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleFlip = () => {
    setFlipped(!flipped);
  };

  const handleNextFlashcard = () => {
    const flashcards = studyMaterials.flashcards?.payload?.flashcards || [];
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

  const handleNextQuiz = () => {
    const questions = studyMaterials.quiz?.payload?.questions || [];
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

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleCheckAnswer = () => {
    const questions = studyMaterials.quiz?.payload?.questions || [];
    const currentQuestion = questions[currentQuizIndex];
    if (selectedAnswer && currentQuestion) {
      setShowAnswer(true);
      if (selectedAnswer === currentQuestion.correct) {
        setQuizScore(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }));
      } else {
        setQuizScore(prev => ({ ...prev, total: prev.total + 1 }));
      }
    }
  };

  const resetQuiz = () => {
    setCurrentQuizIndex(0);
    setSelectedAnswer(null);
    setShowAnswer(false);
    setQuizScore({ correct: 0, total: 0 });
  };

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <BookOpen className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No document selected
          </h3>
          <p className="text-sm text-gray-500">
            Please select a document to generate study materials.
          </p>
        </div>
      </div>
    );
  }

  if (!selectedModule) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Sparkles className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Select a module to generate materials
          </h3>
          <p className="text-sm text-gray-500">
            Choose a module from the sidebar to generate flashcards, quizzes, or summaries.
          </p>
        </div>
      </div>
    );
  }

  const flashcards = studyMaterials.flashcards?.payload?.flashcards || [];
  const questions = studyMaterials.quiz?.payload?.questions || [];
  const summary = studyMaterials.summary?.payload?.summary || "";

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Study Materials</h2>
        <div className="bg-blue-50 p-3 rounded-lg">
          <h3 className="font-medium text-blue-900">{selectedModule.title}</h3>
          {selectedModule.summary && (
            <p className="text-sm text-blue-700 mt-1">{selectedModule.summary}</p>
          )}
          {(selectedModule.start_page || selectedModule.end_page) && (
            <p className="text-xs text-blue-600 mt-1">
              Pages: {selectedModule.start_page || "?"} - {selectedModule.end_page || "?"}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="flashcards" className="flex-1 mt-4">
          {flashcards.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Brain className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No flashcards generated yet
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Generate AI-powered flashcards for this module.
                </p>
                <Button
                  onClick={() => {
                    setCurrentGenerationType('flashcards');
                    setShowGenerateModal(true);
                  }}
                  disabled={loading.flashcards}
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  {loading.flashcards ? "Generating..." : "Generate Flashcards"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-hidden">
              <StandaloneFlashcardViewer
                flashcards={flashcards.map((card: any) => ({
                  question: card.question,
                  answer: card.answer,
                  difficulty_level: card.difficulty_level || 'medium',
                  tags: card.tags || [],
                  source_reference: {
                    module: selectedModule?.title || 'Current Module',
                    generated_at: new Date().toISOString(),
                    ...(card.source_reference || {})
                  }
                }))}
                title={`${selectedModule?.title || 'Module'} Flashcards`}
                onShuffle={() => {
                  // Shuffle the current flashcards
                  const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
                  setStudyMaterials(prev => ({
                    ...prev,
                    flashcards: {
                      ...prev.flashcards,
                      payload: { ...prev.flashcards.payload, flashcards: shuffled }
                    }
                  }));
                }}
                onRegenerate={() => {
                  setCurrentGenerationType('flashcards');
                  setShowGenerateModal(true);
                }}
                isLoading={loading.flashcards}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="quiz" className="flex-1 mt-4">
          {questions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Check className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No quiz generated yet
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Generate AI-powered quiz questions for this module.
                </p>
                <Button
                  onClick={() => {
                    setCurrentGenerationType('quiz');
                    setShowGenerateModal(true);
                  }}
                  disabled={loading.quiz}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {loading.quiz ? "Generating..." : "Generate Quiz"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    Question {currentQuizIndex + 1} of {questions.length}
                  </span>
                  <span className="text-sm text-gray-500">
                    Score: {quizScore.correct}/{quizScore.total}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetQuiz}
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCurrentGenerationType('quiz');
                      setShowGenerateModal(true);
                    }}
                    disabled={loading.quiz}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {loading.quiz ? "Generating..." : "Regenerate"}
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {questions[currentQuizIndex]?.stem}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={selectedAnswer || ""}
                    onValueChange={handleAnswerSelect}
                    disabled={showAnswer}
                  >
                    {questions[currentQuizIndex]?.choices.map((choice: string, index: number) => {
                      const choiceLabel = String.fromCharCode(65 + index); // A, B, C, D
                      const isCorrect = choiceLabel === questions[currentQuizIndex]?.correct;
                      const isSelected = selectedAnswer === choiceLabel;
                      
                      return (
                        <div
                          key={index}
                          className={`flex items-center space-x-2 p-2 rounded ${
                            showAnswer
                              ? isCorrect
                                ? "bg-green-100 text-green-800"
                                : isSelected
                                ? "bg-red-100 text-red-800"
                                : ""
                              : ""
                          }`}
                        >
                          <RadioGroupItem value={choiceLabel} id={choiceLabel} />
                          <Label htmlFor={choiceLabel} className="flex-1 cursor-pointer">
                            {choiceLabel}. {choice}
                          </Label>
                          {showAnswer && isCorrect && (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                          {showAnswer && isSelected && !isCorrect && (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      );
                    })}
                  </RadioGroup>

                  <div className="mt-4 flex justify-between">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handlePreviousQuiz}
                        disabled={currentQuizIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleNextQuiz}
                        disabled={currentQuizIndex === questions.length - 1}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>

                    <Button
                      onClick={handleCheckAnswer}
                      disabled={!selectedAnswer || showAnswer}
                    >
                      Check Answer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="flex-1 mt-4">
          {!summary ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <BookOpen className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No summary generated yet
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Generate an AI-powered summary for this module.
                </p>
                <Button
                  onClick={() => {
                    setCurrentGenerationType('summary');
                    setShowGenerateModal(true);
                  }}
                  disabled={loading.summary}
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  {loading.summary ? "Generating..." : "Generate Summary"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCurrentGenerationType('summary');
                    setShowGenerateModal(true);
                  }}
                  disabled={loading.summary}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  {loading.summary ? "Generating..." : "Regenerate"}
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Module Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {formatForPreWrap(summary)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Content Generator Modal */}
      <ContentGeneratorModal
        type={currentGenerationType}
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerateFromModal}
        isGenerating={loading[currentGenerationType] || false}
      />
    </div>
  );
}

function CheckIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 12 2 2 4-4"/>
      <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
      <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
    </svg>
  );
}
