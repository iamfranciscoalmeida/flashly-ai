import { createClient } from "../../../../../../supabase/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate a title for the conversation
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

    // Get first few messages to understand the topic
    const { data: messages } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(4);

    const conversationStart =
      messages?.map((m) => `${m.role}: ${m.content}`).join("\n") || "";
    const contextInfo = conversation.context_blob
      ? `Context: ${conversation.context_blob.substring(0, 500)}...`
      : "";

    const prompt = `Based on this conversation and context, suggest a short, descriptive title (max 6 words) that captures what this study session is about:\n\n${contextInfo}\n\nConversation:\n${conversationStart}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You generate short, descriptive titles for study conversations. Return only the title, nothing else. Keep it under 6 words and make it specific to the topic being studied.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 20,
      temperature: 0.5,
    });

    const suggestedTitle =
      completion.choices[0]?.message?.content?.trim() || "Study Session";

    // Update the conversation title
    const { error: updateError } = await supabase
      .from("conversations")
      .update({ title: suggestedTitle })
      .eq("id", conversationId);

    if (updateError) {
      console.error("Error updating conversation title:", updateError);
      return NextResponse.json(
        { error: "Failed to update title" },
        { status: 500 },
      );
    }

    return NextResponse.json({ title: suggestedTitle });
  } catch (error) {
    console.error("Error in POST /api/conversations/[id]/title:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
