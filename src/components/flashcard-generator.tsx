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
} from "lucide-react";
import { createClient } from "../../supabase/client";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import GenerateFlashcardsModal from "./generate-flashcards-modal";

interface Document {
  id: string;
  file_name: string;
  status: "processing" | "completed" | "error";
  folder_id?: string | null;
}

interface Module {
  id: string;
  title: string;
  document_id: string;
  order: number;
  summary: string | null;
  created_at: string;
  completed?: boolean;
}

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  module_id?: string | null;
}

interface Quiz {
  id: string;
  question: string;
  options: string[];
  correct: string;
  module_id?: string | null;
}

interface FlashcardGeneratorProps {
  document: Document | null;
  selectedModule?: Module | null;
}

export default function FlashcardGenerator({
  document,
  selectedModule = null,
}: FlashcardGeneratorProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState({
    question: "",
    answer: "",
  });
  const [activeTab, setActiveTab] = useState("flashcards");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [moduleSummary, setModuleSummary] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (document && document.status === "completed") {
      setLoading(true);
      fetchStudyContent();
    } else {
      setFlashcards([]);
      setQuizzes([]);
      setModuleSummary(null);
    }
  }, [document, selectedModule]);

  const fetchStudyContent = async () => {
    if (!document) return;

    try {
      // Set module summary if a module is selected
      if (selectedModule) {
        setModuleSummary(selectedModule.summary);
      } else {
        setModuleSummary(null);
      }

      // Fetch flashcards - filter by module if selected
      let flashcardsQuery = supabase
        .from("flashcards")
        .select("*")
        .eq("document_id", document.id);

      if (selectedModule) {
        flashcardsQuery = flashcardsQuery.eq("module_id", selectedModule.id);
      } else {
        // If no module is selected, only get flashcards without a module_id
        // This maintains backward compatibility with older documents
        flashcardsQuery = flashcardsQuery.is("module_id", null);
      }

      const { data: flashcardsData, error: flashcardsError } =
        await flashcardsQuery;

      if (flashcardsError) throw flashcardsError;

      // Fetch quizzes - filter by module if selected
      let quizzesQuery = supabase
        .from("quizzes")
        .select("*")
        .eq("document_id", document.id);

      if (selectedModule) {
        quizzesQuery = quizzesQuery.eq("module_id", selectedModule.id);
      } else {
        // If no module is selected, only get quizzes without a module_id
        quizzesQuery = quizzesQuery.is("module_id", null);
      }

      const { data: quizzesData, error: quizzesError } = await quizzesQuery;

      if (quizzesError) throw quizzesError;

      setFlashcards(flashcardsData || []);
      setQuizzes(quizzesData || []);
      setCurrentFlashcardIndex(0);
      setCurrentQuizIndex(0);
      setFlipped(false);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setQuizScore({ correct: 0, total: 0 });
    } catch (error) {
      console.error("Error fetching study content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = () => {
    setFlipped(!flipped);
  };

  const handleNextFlashcard = () => {
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

  const handleEdit = () => {
    if (flashcards.length > 0) {
      setEditedContent({
        question: flashcards[currentFlashcardIndex].question,
        answer: flashcards[currentFlashcardIndex].answer,
      });
      setEditing(true);
    }
  };

  const handleSave = async () => {
    if (flashcards.length > 0) {
      try {
        const flashcardId = flashcards[currentFlashcardIndex].id;

        // Update in Supabase
        const { error } = await supabase
          .from("flashcards")
          .update({
            question: editedContent.question,
            answer: editedContent.answer,
          })
          .eq("id", flashcardId);

        if (error) throw error;

        // Update local state
        const updatedFlashcards = [...flashcards];
        updatedFlashcards[currentFlashcardIndex] = {
          ...updatedFlashcards[currentFlashcardIndex],
          question: editedContent.question,
          answer: editedContent.answer,
        };
        setFlashcards(updatedFlashcards);
        setEditing(false);
      } catch (error) {
        console.error("Error updating flashcard:", error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  const handleNextQuiz = () => {
    if (currentQuizIndex < quizzes.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
    } else {
      // End of quiz
      setShowAnswer(true);
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
    if (!showAnswer) {
      setSelectedAnswer(answer);
    }
  };

  const handleCheckAnswer = () => {
    if (selectedAnswer && quizzes.length > 0) {
      const currentQuiz = quizzes[currentQuizIndex];
      const isCorrect = selectedAnswer === currentQuiz.correct;

      setQuizScore((prev) => ({
        correct: isCorrect ? prev.correct + 1 : prev.correct,
        total: prev.total + 1,
      }));

      setShowAnswer(true);
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
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-gray-50 rounded-lg">
        <div className="mb-4">
          <svg
            className="h-16 w-16 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No document selected
        </h3>
        <p className="text-sm text-gray-500">
          Select a document from the list to view flashcards and quizzes.
        </p>
      </div>
    );
  }

  if (document.status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-white rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Processing Document
        </h3>
        <p className="text-sm text-gray-500">
          We're analyzing {document.file_name} to create your study materials.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-white rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Loading Study Materials
        </h3>
        <p className="text-sm text-gray-500">This will just take a moment...</p>
      </div>
    );
  }

  if (flashcards.length === 0 && quizzes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-white rounded-lg">
        <div className="mb-4">
          <Brain className="h-16 w-16 text-gray-300" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No study materials available
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {selectedModule
            ? `No study materials found for module "${selectedModule.title}".`
            : "There was an issue generating study materials for this document."}
        </p>
        <Button onClick={fetchStudyContent}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Module Summary Section */}
      {moduleSummary && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-blue-800">
              {selectedModule?.title || "Module Summary"}
            </h3>
          </div>
          <p className="text-sm text-blue-700">{moduleSummary}</p>
        </div>
      )}

      {/* Generate Flashcards Button */}
      {document && document.status === "completed" && (
        <div className="mb-4">
          <Button 
            onClick={() => setShowGenerateModal(true)} 
            className="w-full flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Generate AI Flashcards
          </Button>
        </div>
      )}

      <div className="mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="flashcards">
              Flashcards ({flashcards.length})
            </TabsTrigger>
            <TabsTrigger value="quiz">Quiz ({quizzes.length})</TabsTrigger>
          </TabsList>

          {/* Flashcards Tab */}
          <TabsContent value="flashcards" className="mt-4">
            {flashcards.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] p-6 text-center bg-gray-50 rounded-lg">
                <div className="mb-4">
                  <Brain className="h-12 w-12 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No flashcards available
                </h3>
                <p className="text-sm text-gray-500">
                  No flashcards were generated for this document.
                </p>
              </div>
            ) : editing ? (
              <div className="flex flex-col h-[400px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Edit Flashcard</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      <Save className="h-4 w-4 mr-1" /> Save
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  <div className="flex flex-col">
                    <Label className="text-sm font-medium mb-2">Question</Label>
                    <Textarea
                      className="flex-1 resize-none"
                      value={editedContent.question}
                      onChange={(e) =>
                        setEditedContent({
                          ...editedContent,
                          question: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col">
                    <Label className="text-sm font-medium mb-2">Answer</Label>
                    <Textarea
                      className="flex-1 resize-none"
                      value={editedContent.answer}
                      onChange={(e) =>
                        setEditedContent({
                          ...editedContent,
                          answer: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    Flashcard {currentFlashcardIndex + 1} of {flashcards.length}
                  </h3>
                  <Button size="sm" variant="outline" onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                </div>
                <div
                  className="relative h-[300px] w-full cursor-pointer"
                  onClick={handleFlip}
                >
                  <div
                    className={`absolute inset-0 flex items-center justify-center p-6 rounded-lg shadow-md bg-white transition-all duration-300 ${flipped ? "opacity-0 rotate-y-180 pointer-events-none" : "opacity-100"}`}
                  >
                    <div className="text-center">
                      <p className="text-xl">
                        {flashcards[currentFlashcardIndex]?.question}
                      </p>
                      <p className="text-sm text-gray-500 mt-4">
                        Click to reveal answer
                      </p>
                    </div>
                  </div>
                  <div
                    className={`absolute inset-0 flex items-center justify-center p-6 rounded-lg shadow-md bg-blue-50 transition-all duration-300 ${flipped ? "opacity-100" : "opacity-0 rotate-y-180 pointer-events-none"}`}
                  >
                    <div className="text-center">
                      <p className="text-xl">
                        {flashcards[currentFlashcardIndex]?.answer}
                      </p>
                      <p className="text-sm text-gray-500 mt-4">
                        Click to see question
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={handlePreviousFlashcard}
                    disabled={currentFlashcardIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <Button
                    onClick={handleNextFlashcard}
                    disabled={currentFlashcardIndex === flashcards.length - 1}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* Quiz Tab */}
          <TabsContent value="quiz" className="mt-4">
            {quizzes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] p-6 text-center bg-gray-50 rounded-lg">
                <div className="mb-4">
                  <Brain className="h-12 w-12 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No quizzes available
                </h3>
                <p className="text-sm text-gray-500">
                  No quizzes were generated for this document.
                </p>
              </div>
            ) : quizScore.total === quizzes.length && showAnswer ? (
              // Quiz results
              <div className="flex flex-col items-center justify-center h-[400px] p-6 text-center bg-white rounded-lg">
                <div className="mb-4">
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-3xl font-bold text-blue-600">
                      {Math.round((quizScore.correct / quizScore.total) * 100)}%
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Quiz Complete!</h3>
                <p className="text-lg mb-4">
                  You got {quizScore.correct} out of {quizScore.total} questions
                  correct
                </p>
                <Button onClick={resetQuiz}>Restart Quiz</Button>
              </div>
            ) : (
              // Quiz questions
              <div className="flex flex-col h-[400px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    Question {currentQuizIndex + 1} of {quizzes.length}
                  </h3>
                </div>

                <Card className="mb-4 flex-1">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {quizzes[currentQuizIndex]?.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={selectedAnswer || ""}
                      onValueChange={handleAnswerSelect}
                      className="space-y-3"
                      disabled={showAnswer}
                    >
                      {quizzes[currentQuizIndex]?.options.map(
                        (option, index) => (
                          <div
                            key={index}
                            className={`flex items-center space-x-2 rounded-md border p-3 ${showAnswer && option === quizzes[currentQuizIndex].correct ? "bg-green-50 border-green-200" : ""} ${showAnswer && selectedAnswer === option && option !== quizzes[currentQuizIndex].correct ? "bg-red-50 border-red-200" : ""}`}
                          >
                            <RadioGroupItem
                              value={option}
                              id={`option-${index}`}
                            />
                            <Label
                              htmlFor={`option-${index}`}
                              className="flex-1"
                            >
                              {option}
                            </Label>
                            {showAnswer &&
                              option === quizzes[currentQuizIndex].correct && (
                                <Check className="h-4 w-4 text-green-500" />
                              )}
                          </div>
                        ),
                      )}
                    </RadioGroup>
                  </CardContent>
                </Card>

                <div className="flex justify-between mt-auto">
                  <Button
                    variant="outline"
                    onClick={handlePreviousQuiz}
                    disabled={currentQuizIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>

                  {showAnswer ? (
                    <Button onClick={handleNextQuiz}>
                      {currentQuizIndex === quizzes.length - 1
                        ? "See Results"
                        : "Next Question"}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleCheckAnswer}
                      disabled={!selectedAnswer}
                    >
                      Check Answer
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>

      {/* Generate Flashcards Modal */}
      <GenerateFlashcardsModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        document={document}
        folderId={document?.folder_id || null}
        onGenerationComplete={fetchStudyContent}
      />
    </div>
  );
}
