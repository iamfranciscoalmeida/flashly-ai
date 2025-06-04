import { createClient } from "../../../../../../supabase/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add a message to a conversation and get AI response
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

    const { content } = await request.json();
    const conversationId = params.id;

    // Get the conversation to check ownership and get context
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

    // Save user message
    const { error: userMsgError } = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content,
      });

    if (userMsgError) {
      console.error("Error saving user message:", userMsgError);
      return NextResponse.json(
        { error: "Failed to save message" },
        { status: 500 },
      );
    }

    // Get conversation history
    const { data: messages, error: msgError } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (msgError) {
      console.error("Error fetching messages:", msgError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 },
      );
    }

    // Prepare messages for OpenAI
    const openaiMessages = [
      {
        role: "system" as const,
        content: `You are a helpful AI tutor. ${conversation.context_blob ? `Here is the context material the student is studying: ${conversation.context_blob}` : ""} Help the student learn and understand the material. Be encouraging and provide clear explanations.`,
      },
      ...messages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    ];

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: openaiMessages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const aiResponse =
      completion.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response.";

    // Save AI response
    const { error: aiMsgError } = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: aiResponse,
      });

    if (aiMsgError) {
      console.error("Error saving AI message:", aiMsgError);
      return NextResponse.json(
        { error: "Failed to save AI response" },
        { status: 500 },
      );
    }

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return NextResponse.json({ message: aiResponse });
  } catch (error) {
    console.error("Error in POST /api/conversations/[id]/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Get messages for a conversation
export async function GET(
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

    const conversationId = params.id;

    // Verify conversation ownership
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    // Get messages
    const { data: messages, error } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 },
      );
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error in GET /api/conversations/[id]/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
