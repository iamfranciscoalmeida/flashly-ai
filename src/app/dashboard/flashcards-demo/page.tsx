"use client";

import { useState } from "react";
import { StandaloneFlashcardViewer } from "@/components/standalone-flashcard-viewer";
import DashboardNavbar from "@/components/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shuffle } from "lucide-react";
import Link from "next/link";

// Your latest generated flashcards data
const generatedFlashcards = [
  {
    question: "What does the cartesian product P × Q represent given two non-empty sets P and Q?",
    answer: "The cartesian product P × Q represents the set of all ordered pairs (p, q) where p is an element of P and q is an element of Q. This means every possible combination of elements from set P with elements from set Q will be included in the cartesian product.",
    difficulty_level: "medium",
    tags: ["cartesian_product", "set_theory", "ordered_pairs"],
    source_reference: {
      module: "Sets and Relations",
      generated_at: "2025-06-05T15:36:02.138Z"
    }
  },
  {
    question: "Why is the cartesian product P × Q not necessarily equal to Q × P?",
    answer: "The cartesian product P × Q is not necessarily equal to Q × P because the order of the elements in the ordered pairs matters. In P × Q, the first element of each pair comes from P and the second from Q, while in Q × P, the order is reversed. This difference in order means that, unless P and Q are the same set, P × Q and Q × P will contain different ordered pairs.",
    difficulty_level: "medium",
    tags: ["cartesian_product", "ordered_pairs", "set_theory"],
    source_reference: {
      module: "Sets and Relations",
      generated_at: "2025-06-05T15:36:02.138Z"
    }
  },
  {
    question: "Given the equation (x + 1, y - 2) = (3, 1), find the values of x and y.",
    answer: "To find the values of x and y, equate the corresponding elements in the ordered pairs. x + 1 = 3 and y - 2 = 1. Solving these, x = 2 and y = 3.",
    difficulty_level: "medium",
    tags: ["ordered_pairs", "algebra", "equation_solving"],
    source_reference: {
      module: "Sets and Relations",
      generated_at: "2025-06-05T15:36:02.138Z"
    }
  },
  {
    question: "What does it mean for a relation R from set A to set B to be a function?",
    answer: "A relation R from set A to set B is a function if for every element in set A, there is exactly one corresponding element in set B. This means that every element of A is associated with a single, unique element of B, ensuring that R satisfies the definition of a function.",
    difficulty_level: "medium",
    tags: ["relations", "functions", "set_theory"],
    source_reference: {
      module: "Functions",
      generated_at: "2025-06-05T15:36:02.138Z"
    }
  },
  {
    question: "How can you determine the number of relations from set A to set B given their cardinalities?",
    answer: "The number of possible relations from set A to set B can be determined by calculating 2^(n*m), where n is the cardinality (number of elements) of set A, and m is the cardinality of set B. This is because each element in A can either be related or not related to each element in B, leading to 2 possibilities for each pair, hence the formula.",
    difficulty_level: "medium",
    tags: ["relations", "cardinality", "set_theory"],
    source_reference: {
      module: "Relations",
      generated_at: "2025-06-05T15:36:02.138Z"
    }
  },
  {
    question: "If P = {1, 2}, form the set P × P × P.",
    answer: "The set P × P × P, given P = {1, 2}, is the set of all ordered triples where each element comes from P. So, P × P × P = {(1, 1, 1), (1, 1, 2), (1, 2, 1), (1, 2, 2), (2, 1, 1), (2, 1, 2), (2, 2, 1), (2, 2, 2)}.",
    difficulty_level: "medium",
    tags: ["cartesian_product", "ordered_triples", "set_theory"],
    source_reference: {
      module: "Sets and Relations",
      generated_at: "2025-06-05T15:36:02.138Z"
    }
  },
  {
    question: "What is the intersection of two sets and how is it represented?",
    answer: "The intersection of two sets, denoted as A ∩ B, is the set containing all elements that are both in set A and set B. For example, if A = {1, 2, 3} and B = {3, 4, 5}, then A ∩ B = {3}, as 3 is the only element common to both sets.",
    difficulty_level: "medium",
    tags: ["intersection", "set_theory", "sets"],
    source_reference: {
      module: "Set Operations",
      generated_at: "2025-06-05T15:36:02.138Z"
    }
  },
  {
    question: "Given A × B = {(p, q), (p, r), (m, q), (m, r)}, find sets A and B.",
    answer: "From the given cartesian product A × B, we can deduce that set A must contain the elements {p, m} and set B must contain the elements {q, r}. This is because the first elements of the ordered pairs come from set A and the second elements come from set B.",
    difficulty_level: "medium",
    tags: ["cartesian_product", "set_theory", "deduction"],
    source_reference: {
      module: "Sets and Relations",
      generated_at: "2025-06-05T15:36:02.138Z"
    }
  },
  {
    question: "What does it mean for a function to have either R or one of its subsets as its range?",
    answer: "When a function has either R (the set of all real numbers) or one of its subsets as its range, it means that the outputs of the function are real numbers. The range of the function is the set of all possible outputs, and in this case, these outputs are either all real numbers or a specific subset of the real numbers.",
    difficulty_level: "medium",
    tags: ["functions", "range", "real_numbers"],
    source_reference: {
      module: "Functions",
      generated_at: "2025-06-05T15:36:02.138Z"
    }
  },
  {
    question: "Explain how to find the domain of the function 2x^3 - 5x^2 + 5x - 4.",
    answer: "The domain of the function 2x^3 - 5x^2 + 5x - 4, being a polynomial function, is all real numbers. This is because polynomial functions are defined for every real number x, hence the domain is the set of all real numbers, denoted by R.",
    difficulty_level: "medium",
    tags: ["functions", "domain", "polynomial_functions"],
    source_reference: {
      module: "Functions",
      generated_at: "2025-06-05T15:36:02.138Z"
    }
  }
];

export default function FlashcardsDemoPage() {
  const [flashcards, setFlashcards] = useState(generatedFlashcards);
  const [isShuffled, setIsShuffled] = useState(false);

  const handleShuffle = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setIsShuffled(true);
  };

  const handleReset = () => {
    setFlashcards(generatedFlashcards);
    setIsShuffled(false);
  };

  const handleRegenerate = () => {
    // In a real app, this would call an API to regenerate flashcards
    console.log("Regenerating flashcards...");
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/study">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Study
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Mathematics Flashcards
              </h1>
              <p className="text-gray-600 mt-1">
                Sets, Relations & Functions • 10 cards
                {isShuffled && " • Shuffled"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {isShuffled && (
              <Button variant="outline" onClick={handleReset}>
                Reset Order
              </Button>
            )}
          </div>
        </div>

        {/* Flashcard Viewer */}
        <StandaloneFlashcardViewer
          flashcards={flashcards}
          title="Mathematics Study Session"
          onShuffle={handleShuffle}
          onRegenerate={handleRegenerate}
        />

        {/* Additional Study Options */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Study Tips
          </h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <h3 className="font-medium mb-2">🧠 Effective Study Techniques</h3>
              <ul className="space-y-1">
                <li>• Use the hint button when stuck</li>
                <li>• Bookmark difficult cards for review</li>
                <li>• Try auto-play mode for passive learning</li>
                <li>• Review source references for context</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">⚡ Quick Actions</h3>
              <ul className="space-y-1">
                <li>• Click the card to flip it</li>
                <li>• Use keyboard arrows to navigate</li>
                <li>• Copy cards to share with others</li>
                <li>• Shuffle for randomized practice</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 