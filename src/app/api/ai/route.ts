import { createClient } from "../../../../supabase/server";
import { NextResponse } from "next/server";

// Function to extract text from PDF (simplified for now)
async function extractTextFromPDF(fileUrl: string): Promise<string> {
  // In a real implementation, you would use a PDF parsing library
  // For now, we'll simulate text extraction
  console.log(`Extracting text from ${fileUrl}`);

  // Simulate a delay for text extraction
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Return a placeholder text
  return "This is the extracted text from the PDF document. It would contain all the content from the uploaded file.";
}

// Function to generate flashcards and quizzes using an LLM
async function generateStudyContent(
  text: string,
  documentName: string,
): Promise<{
  flashcards: Array<{ question: string; answer: string }>;
  quizzes: Array<{ question: string; options: string[]; correct: string }>;
}> {
  // In a real implementation, you would call an LLM API like OpenAI
  // For now, we'll return mock data
  console.log(`Generating study content for ${documentName}`);

  // Simulate a delay for AI processing
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Mock flashcards
  const flashcards = [
    { question: "What is the capital of France?", answer: "Paris" },
    {
      question: "What is the largest planet in our solar system?",
      answer: "Jupiter",
    },
    { question: "What is the chemical symbol for gold?", answer: "Au" },
    {
      question: "Who wrote 'Romeo and Juliet'?",
      answer: "William Shakespeare",
    },
    { question: "What is the formula for water?", answer: "H₂O" },
  ];

  // Mock quizzes
  const quizzes = [
    {
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correct: "Paris",
    },
    {
      question: "What is the largest planet in our solar system?",
      options: ["Earth", "Jupiter", "Saturn", "Neptune"],
      correct: "Jupiter",
    },
    {
      question: "What is the chemical symbol for gold?",
      options: ["Go", "Au", "Ag", "Gd"],
      correct: "Au",
    },
    {
      question: "Who wrote 'Romeo and Juliet'?",
      options: [
        "Charles Dickens",
        "Jane Austen",
        "William Shakespeare",
        "Mark Twain",
      ],
      correct: "William Shakespeare",
    },
    {
      question: "What is the formula for water?",
      options: ["H₂O", "CO₂", "NaCl", "O₂"],
      correct: "H₂O",
    },
  ];

  return { flashcards, quizzes };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const { documentId, folderId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 },
      );
    }

    // Get the document details
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (documentError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Check if user is premium or has not exceeded free tier limit
    const isPremium = user.user_metadata?.is_pro === true;

    if (!isPremium) {
      // Check document count for free tier users
      const { count, error: countError } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (countError) {
        return NextResponse.json(
          { error: "Failed to check document count" },
          { status: 500 },
        );
      }

      if ((count || 0) > 1) {
        return NextResponse.json(
          { error: "Free tier limit exceeded" },
          { status: 403 },
        );
      }
    }

    // Create a processing job
    const { data: job, error: jobError } = await supabase
      .from("processing_jobs")
      .insert({
        user_id: user.id,
        document_id: documentId,
        status: "processing",
      })
      .select()
      .single();

    if (jobError) {
      return NextResponse.json(
        { error: "Failed to create processing job" },
        { status: 500 },
      );
    }

    // Update document status
    await supabase
      .from("documents")
      .update({ status: "processing" })
      .eq("id", documentId);

    // Get the file URL from Supabase Storage
    const fileUrl = supabase.storage
      .from("study-documents")
      .getPublicUrl(document.file_path).data.publicUrl;

    // Extract text from the document
    const extractedText = await extractTextFromPDF(fileUrl);

    // Generate flashcards and quizzes using an LLM
    const { flashcards, quizzes } = await generateStudyContent(
      extractedText,
      document.file_name,
    );

    // Save flashcards to the database
    const { error: flashcardsError } = await supabase.from("flashcards").insert(
      flashcards.map((fc) => ({
        user_id: user.id,
        document_id: documentId,
        folder_id: folderId || null,
        question: fc.question,
        answer: fc.answer,
      })),
    );

    if (flashcardsError) {
      console.error("Error saving flashcards:", flashcardsError);
      // Update job status to error
      await supabase
        .from("processing_jobs")
        .update({
          status: "error",
          error_message: "Failed to save flashcards",
        })
        .eq("id", job.id);

      return NextResponse.json(
        { error: "Failed to save flashcards" },
        { status: 500 },
      );
    }

    // Save quizzes to the database
    const { error: quizzesError } = await supabase.from("quizzes").insert(
      quizzes.map((quiz) => ({
        user_id: user.id,
        document_id: documentId,
        folder_id: folderId || null,
        question: quiz.question,
        options: quiz.options,
        correct: quiz.correct,
      })),
    );

    if (quizzesError) {
      console.error("Error saving quizzes:", quizzesError);
      // Update job status to error
      await supabase
        .from("processing_jobs")
        .update({
          status: "error",
          error_message: "Failed to save quizzes",
        })
        .eq("id", job.id);

      return NextResponse.json(
        { error: "Failed to save quizzes" },
        { status: 500 },
      );
    }

    // Update document status to completed
    await supabase
      .from("documents")
      .update({ status: "completed" })
      .eq("id", documentId);

    // Update job status to completed
    await supabase
      .from("processing_jobs")
      .update({ status: "completed" })
      .eq("id", job.id);

    return NextResponse.json({
      success: true,
      message: "Study content generated successfully",
      flashcardCount: flashcards.length,
      quizCount: quizzes.length,
    });
  } catch (error) {
    console.error("Error processing document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
