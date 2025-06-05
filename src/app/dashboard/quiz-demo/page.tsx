"use client";

import { useState } from "react";
import { StandaloneQuizViewer } from "@/components/standalone-quiz-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shuffle, RefreshCw } from "lucide-react";
import Link from "next/link";

// Sample quiz questions for demonstration
const sampleQuizQuestions = [
  {
    question: "What is the fundamental theorem of calculus?",
    options: [
      "It relates differentiation and integration",
      "It proves that all functions are continuous",
      "It defines the limit of a function",
      "It establishes the chain rule"
    ],
    correct: "It relates differentiation and integration",
    explanation: "The fundamental theorem of calculus establishes the relationship between differentiation and integration, showing that they are inverse operations. It has two parts: the first part provides an antiderivative for continuous functions, and the second part provides a method for evaluating definite integrals.",
    difficulty_level: "medium",
    tags: ["calculus", "integration", "differentiation", "fundamental-theorem"],
    source_reference: {
      module: "Calculus I",
      page: 142,
      generated_at: new Date().toISOString()
    }
  },
  {
    question: "In set theory, what does the symbol ∪ represent?",
    options: [
      "Intersection of sets",
      "Union of sets", 
      "Complement of a set",
      "Subset relation"
    ],
    correct: "Union of sets",
    explanation: "The symbol ∪ represents the union of sets. The union of two sets A and B, written as A ∪ B, is the set containing all elements that are in A, or in B, or in both. For example, if A = {1, 2, 3} and B = {3, 4, 5}, then A ∪ B = {1, 2, 3, 4, 5}.",
    difficulty_level: "easy",
    tags: ["set-theory", "union", "symbols", "basic-operations"],
    source_reference: {
      module: "Discrete Mathematics",
      page: 23,
      generated_at: new Date().toISOString()
    }
  },
  {
    question: "What is the derivative of sin(x) with respect to x?",
    options: [
      "cos(x)",
      "-cos(x)",
      "sin(x)",
      "-sin(x)"
    ],
    correct: "cos(x)",
    explanation: "The derivative of sin(x) with respect to x is cos(x). This is one of the fundamental trigonometric derivatives that forms the basis for more complex differentiation problems involving trigonometric functions.",
    difficulty_level: "easy",
    tags: ["calculus", "derivatives", "trigonometry", "basic-rules"],
    source_reference: {
      module: "Calculus I",
      page: 89,
      generated_at: new Date().toISOString()
    }
  },
  {
    question: "In linear algebra, what is the determinant of a 2x2 matrix [[a,b],[c,d]]?",
    options: [
      "ad + bc",
      "ad - bc",
      "ac - bd",
      "ab - cd"
    ],
    correct: "ad - bc",
    explanation: "For a 2x2 matrix [[a,b],[c,d]], the determinant is calculated as ad - bc. This formula is fundamental in linear algebra and is used to determine if a matrix is invertible (determinant ≠ 0) and to calculate areas and volumes in geometric applications.",
    difficulty_level: "medium",
    tags: ["linear-algebra", "determinant", "matrix", "2x2"],
    source_reference: {
      module: "Linear Algebra",
      page: 67,
      generated_at: new Date().toISOString()
    }
  },
  {
    question: "What is the limit of (sin(x))/x as x approaches 0?",
    options: [
      "0",
      "1",
      "∞",
      "undefined"
    ],
    correct: "1",
    explanation: "The limit of (sin(x))/x as x approaches 0 is 1. This is a famous limit in calculus and is often used to derive other trigonometric limits. It can be proven using the squeeze theorem or L'Hôpital's rule.",
    difficulty_level: "hard",
    tags: ["calculus", "limits", "trigonometry", "famous-limits"],
    source_reference: {
      module: "Calculus I",
      page: 156,
      generated_at: new Date().toISOString()
    }
  },
  {
    question: "In probability theory, what does P(A|B) represent?",
    options: [
      "The probability of A and B occurring together",
      "The probability of A given that B has occurred",
      "The probability of A or B occurring",
      "The probability of A minus the probability of B"
    ],
    correct: "The probability of A given that B has occurred",
    explanation: "P(A|B) represents conditional probability - the probability of event A occurring given that event B has already occurred. It's calculated as P(A|B) = P(A ∩ B) / P(B), provided P(B) > 0.",
    difficulty_level: "medium",
    tags: ["probability", "conditional-probability", "statistics", "notation"],
    source_reference: {
      module: "Probability and Statistics",
      page: 78,
      generated_at: new Date().toISOString()
    }
  },
  {
    question: "What is the quadratic formula?",
    options: [
      "x = (-b ± √(b² - 4ac)) / 2a",
      "x = (-b ± √(b² + 4ac)) / 2a",
      "x = (b ± √(b² - 4ac)) / 2a",
      "x = (-b ± √(b² - 4ac)) / a"
    ],
    correct: "x = (-b ± √(b² - 4ac)) / 2a",
    explanation: "The quadratic formula x = (-b ± √(b² - 4ac)) / 2a is used to solve quadratic equations of the form ax² + bx + c = 0. The expression under the square root (b² - 4ac) is called the discriminant and determines the nature of the roots.",
    difficulty_level: "easy",
    tags: ["algebra", "quadratic-formula", "equations", "roots"],
    source_reference: {
      module: "Algebra II",
      page: 134,
      generated_at: new Date().toISOString()
    }
  },
  {
    question: "In graph theory, what is a Hamiltonian path?",
    options: [
      "A path that visits every vertex exactly once",
      "A path that visits every edge exactly once",
      "A path that forms a cycle",
      "A path with minimum weight"
    ],
    correct: "A path that visits every vertex exactly once",
    explanation: "A Hamiltonian path is a path in a graph that visits every vertex exactly once. If the path forms a cycle (returns to the starting vertex), it's called a Hamiltonian cycle. This concept is important in optimization problems like the traveling salesman problem.",
    difficulty_level: "hard",
    tags: ["graph-theory", "hamiltonian-path", "vertices", "optimization"],
    source_reference: {
      module: "Discrete Mathematics",
      page: 203,
      generated_at: new Date().toISOString()
    }
  },
  {
    question: "What is the integral of 1/x with respect to x?",
    options: [
      "ln|x| + C",
      "x²/2 + C",
      "1/x² + C",
      "-1/x² + C"
    ],
    correct: "ln|x| + C",
    explanation: "The integral of 1/x with respect to x is ln|x| + C, where C is the constant of integration. The absolute value is important because the natural logarithm is only defined for positive numbers, but 1/x is defined for all x ≠ 0.",
    difficulty_level: "medium",
    tags: ["calculus", "integration", "logarithm", "basic-integrals"],
    source_reference: {
      module: "Calculus I",
      page: 198,
      generated_at: new Date().toISOString()
    }
  },
  {
    question: "In complex analysis, what is Euler's formula?",
    options: [
      "e^(iθ) = cos(θ) + i·sin(θ)",
      "e^(iθ) = cos(θ) - i·sin(θ)",
      "e^(iθ) = sin(θ) + i·cos(θ)",
      "e^(iθ) = cos(θ) + sin(θ)"
    ],
    correct: "e^(iθ) = cos(θ) + i·sin(θ)",
    explanation: "Euler's formula states that e^(iθ) = cos(θ) + i·sin(θ), where i is the imaginary unit and θ is any real number. This remarkable formula connects exponential functions with trigonometric functions and is fundamental in complex analysis.",
    difficulty_level: "hard",
    tags: ["complex-analysis", "euler-formula", "exponential", "trigonometry"],
    source_reference: {
      module: "Complex Analysis",
      page: 45,
      generated_at: new Date().toISOString()
    }
  }
];

export default function QuizDemoPage() {
  const [questions, setQuestions] = useState(sampleQuizQuestions);
  const [mode, setMode] = useState<'multiple-choice' | 'free-answer'>('multiple-choice');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleShuffle = () => {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
  };

  const handleRegenerate = () => {
    setIsRegenerating(true);
    // Simulate regeneration delay
    setTimeout(() => {
      const shuffled = [...sampleQuizQuestions].sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
      setIsRegenerating(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/study">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Study Dashboard
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">
                Interactive Quiz Demo
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShuffle}
                className="flex items-center gap-2"
              >
                <Shuffle className="h-4 w-4" />
                Shuffle
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Quiz Demo Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Multiple Choice Mode:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Select from 4 answer options</li>
                  <li>• Instant feedback on correctness</li>
                  <li>• Detailed explanations for each answer</li>
                  <li>• Progress tracking and scoring</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Free Answer Mode:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Type your own answers</li>
                  <li>• AI-powered grading with feedback</li>
                  <li>• Partial credit for incomplete answers</li>
                  <li>• Educational feedback for improvement</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Viewer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <StandaloneQuizViewer
          questions={questions}
          title="Mathematics Quiz Demo"
          mode={mode}
          onModeChange={setMode}
          onShuffle={handleShuffle}
          onRegenerate={handleRegenerate}
          isLoading={isRegenerating}
        />
      </div>
    </div>
  );
} 