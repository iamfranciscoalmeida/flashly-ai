import { createClient } from "../../../../../supabase/server";
import { NextResponse } from "next/server";
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const { question, userAnswer, correctAnswer, explanation } = await request.json();

    if (!question || !userAnswer || !correctAnswer) {
      return NextResponse.json(
        { error: "Question, user answer, and correct answer are required" },
        { status: 400 }
      );
    }

    // Use AI to grade the answer
    const grading = await gradeAnswerWithAI(question, userAnswer, correctAnswer, explanation);

    return NextResponse.json(grading);
  } catch (error) {
    console.error("Error grading answer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const prompt = `You are an expert educational AI grader. Grade the following student answer on a scale of 0-100.

Question: ${question}

Correct Answer: ${correctAnswer}

Student Answer: ${userAnswer}

${explanation ? `Additional Context/Explanation: ${explanation}` : ''}

Provide a detailed assessment that includes:
1. A score from 0-100
2. Constructive feedback explaining what was correct/incorrect
3. Whether the answer is correct, partially correct, or incorrect

Be fair but thorough. Give partial credit for answers that contain some correct elements even if incomplete.

Respond in the following JSON format:
{
  "score": [0-100],
  "feedback": "Detailed explanation of the grading",
  "correctness": "correct" | "partial" | "incorrect"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are an expert educator and grader. Always respond with valid JSON only." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from AI grader');
    }

    const grading = JSON.parse(result);

    // Validate the response format
    if (typeof grading.score !== 'number' || 
        typeof grading.feedback !== 'string' ||
        !['correct', 'partial', 'incorrect'].includes(grading.correctness)) {
      throw new Error('Invalid response format from AI grader');
    }

    // Ensure score is within valid range
    grading.score = Math.max(0, Math.min(100, grading.score));

    return grading;

  } catch (error) {
    console.error('Error in AI grading:', error);
    
    // Fallback to simple string comparison
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
        feedback: "Good! Your answer contains key elements of the correct answer, but could be more complete or precise.",
        correctness: 'partial'
      };
    } else {
      return {
        score: 0,
        feedback: "Your answer doesn't match the expected response. Please review the question and the correct answer to understand what was expected.",
        correctness: 'incorrect'
      };
    }
  }
} 