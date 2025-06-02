"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ChevronLeft, ChevronRight, Edit, Save, X } from "lucide-react";

interface Document {
  id: string;
  file_name: string;
  status: "processing" | "completed" | "error";
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface FlashcardGeneratorProps {
  document: Document | null;
}

export default function FlashcardGenerator({
  document,
}: FlashcardGeneratorProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState({ front: "", back: "" });
  const [activeTab, setActiveTab] = useState("flashcards");

  useEffect(() => {
    if (document && document.status === "completed") {
      setLoading(true);
      // In a real implementation, fetch flashcards from an API
      // For now, we'll simulate with mock data
      setTimeout(() => {
        const mockFlashcards = [
          {
            id: "1",
            front: "What is the capital of France?",
            back: "Paris",
          },
          {
            id: "2",
            front: "What is the largest planet in our solar system?",
            back: "Jupiter",
          },
          {
            id: "3",
            front: "What is the chemical symbol for gold?",
            back: "Au",
          },
          {
            id: "4",
            front: "Who wrote 'Romeo and Juliet'?",
            back: "William Shakespeare",
          },
          {
            id: "5",
            front: "What is the formula for water?",
            back: "H₂O",
          },
        ];
        setFlashcards(mockFlashcards);
        setCurrentIndex(0);
        setFlipped(false);
        setLoading(false);
      }, 1500);
    } else {
      setFlashcards([]);
    }
  }, [document]);

  const handleFlip = () => {
    setFlipped(!flipped);
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setFlipped(false);
    }
  };

  const handleEdit = () => {
    if (flashcards.length > 0) {
      setEditedContent({
        front: flashcards[currentIndex].front,
        back: flashcards[currentIndex].back,
      });
      setEditing(true);
    }
  };

  const handleSave = () => {
    if (flashcards.length > 0) {
      const updatedFlashcards = [...flashcards];
      updatedFlashcards[currentIndex] = {
        ...updatedFlashcards[currentIndex],
        front: editedContent.front,
        back: editedContent.back,
      };
      setFlashcards(updatedFlashcards);
      setEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
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
          Select a document from the list to generate flashcards and quizzes.
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
          Generating Flashcards
        </h3>
        <p className="text-sm text-gray-500">This will just take a moment...</p>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-white rounded-lg">
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
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No flashcards available
        </h3>
        <p className="text-sm text-gray-500">
          There was an issue generating flashcards for this document.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
            <TabsTrigger value="quiz">Quiz</TabsTrigger>
          </TabsList>
          <TabsContent value="flashcards" className="mt-4">
            {editing ? (
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
                    <label className="text-sm font-medium mb-2">Front</label>
                    <textarea
                      className="flex-1 p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editedContent.front}
                      onChange={(e) =>
                        setEditedContent({
                          ...editedContent,
                          front: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-2">Back</label>
                    <textarea
                      className="flex-1 p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editedContent.back}
                      onChange={(e) =>
                        setEditedContent({
                          ...editedContent,
                          back: e.target.value,
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
                    Flashcard {currentIndex + 1} of {flashcards.length}
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
                        {flashcards[currentIndex].front}
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
                      <p className="text-xl">{flashcards[currentIndex].back}</p>
                      <p className="text-sm text-gray-500 mt-4">
                        Click to see question
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={currentIndex === flashcards.length - 1}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
          <TabsContent value="quiz" className="mt-4">
            <div className="flex flex-col items-center justify-center h-[400px] p-6 text-center bg-gray-50 rounded-lg">
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
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                Quiz Coming Soon
              </h3>
              <p className="text-sm text-gray-500">
                We're working on generating quizzes from your documents.
              </p>
              <Button className="mt-4">Generate Quiz</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
