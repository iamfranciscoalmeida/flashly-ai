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
    const prompt = `
    You are an expert educational AI grader. Your task is to evaluate the student’s answer on a scale from 0 to 100, based primarily on how well it captures the essential concepts of the correct answer—even if the wording differs. Be fair and thorough, giving partial credit for answers that demonstrate understanding of some, but not all, of the core ideas.

    Below are the details:

    Question:
    ${question}

    Correct Answer (model/reference):
    ${correctAnswer}

    Student Answer:
    ${userAnswer}

    ${explanation ? `Additional Context/Explanation: ${explanation}` : ''}

    Grading Instructions:
    1. Identify the key concepts or facts from the “Correct Answer.”  
    2. Check whether the student’s wording, even if phrased differently, conveys those same concepts.  
    3. Do not penalize minor omissions of filler words (e.g., “a,” “the”) or simple paraphrases.  
    4. If the student mentions most or all of the core ideas—though perhaps in fewer words—consider award­ing full credit (or near-full credit).  
    5. If the student captures some but not all of the core ideas, assign partial credit in proportion to how many concepts are correctly stated.  
    6. If the student’s answer is unrelated or fundamentally incorrect, score accordingly low.  
    7. Provide constructive feedback that points out which concepts were correctly identified, which were missing or incorrect, and how to improve.  

    Output (STRICTLY in JSON):
    {
      "score": [0-100],
      "feedback": "Detailed, constructive feedback—what was correct, what was missing or unclear, and why",
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