import { createClient } from "../../../../../../supabase/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate study materials from conversation context
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, options = {} } = await request.json();
    const conversationId = params.id;

    // Get the conversation and its context
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    // Get conversation messages for additional context
    const { data: messages } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    const conversationContext =
      messages?.map((m) => `${m.role}: ${m.content}`).join("\n") || "";
    const fullContext = `${conversation.context_blob || ""}\n\nConversation History:\n${conversationContext}`;

    let prompt = "";
    let expectedFormat = "";

    switch (type) {
      case "flashcards":
        prompt = `Based on the following study material and conversation, generate ${options.num_cards || 5} flashcards. Each flashcard should have a clear question and a comprehensive answer.\n\nMaterial: ${fullContext}`;
        expectedFormat =
          "Return a JSON object with a 'flashcards' array, where each item has 'question' and 'answer' fields.";
        break;
      case "quiz":
        prompt = `Based on the following study material and conversation, generate ${options.num_questions || 5} multiple choice quiz questions. Each question should have 4 options (A, B, C, D) and indicate the correct answer.\n\nMaterial: ${fullContext}`;
        expectedFormat =
          "Return a JSON object with a 'questions' array, where each item has 'stem' (question), 'choices' (array of 4 options), and 'correct' (letter A-D) fields.";
        break;
      case "summary":
        prompt = `Based on the following study material and conversation, create a comprehensive summary that captures the key points, main concepts, and important details.\n\nMaterial: ${fullContext}`;
        expectedFormat =
          "Return a JSON object with a 'summary' field containing the text summary.";
        break;
      case "mindmap":
        prompt = `Based on the following study material and conversation, create a mind map structure with a central topic and branching subtopics and details.\n\nMaterial: ${fullContext}`;
        expectedFormat =
          "Return a JSON object with a 'mindmap' field containing a hierarchical structure with 'central_topic' and 'branches' (each with 'topic' and 'subtopics').";
        break;
      case "timeline":
        prompt = `Based on the following study material and conversation, create a timeline of important events, dates, or sequential steps if applicable.\n\nMaterial: ${fullContext}`;
        expectedFormat =
          "Return a JSON object with a 'timeline' field containing an array of events, each with 'date', 'title', and 'description' fields.";
        break;
      default:
        return NextResponse.json(
          { error: "Invalid material type" },
          { status: 400 },
        );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an AI that generates study materials. ${expectedFormat} Always return valid JSON.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      return NextResponse.json(
        { error: "Failed to generate content" },
        { status: 500 },
      );
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (parseError) {
      console.error("Failed to parse AI response:", response);
      return NextResponse.json(
        { error: "Failed to parse generated content" },
        { status: 500 },
      );
    }

    // Save the generated material
    const { data: material, error: materialError } = await supabase
      .from("conversation_materials")
      .insert({
        conversation_id: conversationId,
        type,
        payload: parsedResponse,
      })
      .select()
      .single();

    if (materialError) {
      console.error("Error saving material:", materialError);
      return NextResponse.json(
        { error: "Failed to save generated material" },
        { status: 500 },
      );
    }

    return NextResponse.json({ material });
  } catch (error) {
    console.error("Error in POST /api/conversations/[id]/generate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
