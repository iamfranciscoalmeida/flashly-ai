import { createClient } from "@/supabase/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Message } from "@/types/database";

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
    const { sessionId, content, documentId, moduleId } = await request.json();

    if (!sessionId || !content) {
      return NextResponse.json(
        { error: "Session ID and content are required" },
        { status: 400 }
      );
    }

    // Verify the session belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Get document context if available
    let documentContext = "";
    if (documentId) {
      const { data: document } = await supabase
        .from("documents")
        .select("extracted_text, file_name")
        .eq("id", documentId)
        .single();

      if (document && document.extracted_text) {
        documentContext = `Document: ${document.file_name}\n\nContent: ${document.extracted_text.substring(0, 3000)}...\n\n`;
      }

      // Get relevant modules if available
      if (moduleId) {
        const { data: module } = await supabase
          .from("modules")
          .select("title, summary, content_excerpt")
          .eq("id", moduleId)
          .single();

        if (module) {
          documentContext += `\nModule: ${module.title}\nSummary: ${module.summary}\nContent: ${module.content_excerpt}\n\n`;
        }
      }
    }

    // Save user message
    const { data: userMessage, error: userMessageError } = await supabase
      .from("messages")
      .insert({
        session_id: sessionId,
        role: "user",
        content: content,
        metadata: { documentId, moduleId }
      })
      .select()
      .single();

    if (userMessageError) {
      throw userMessageError;
    }

    // Get conversation history
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(10);

    // Prepare messages for OpenAI
    const conversationHistory = messages?.map((msg: Message) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content
    })) || [];

    // Add system message with context
    const systemMessage = {
      role: "system" as const,
      content: `You are an intelligent study assistant helping students learn from their materials. ${documentContext ? `Use the following document context to answer questions:\n\n${documentContext}` : ''} 
      
      Always provide helpful, accurate, and educational responses. When referencing specific information from the document, cite the source. If asked to generate study materials, create them based on the document content.`
    };

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [systemMessage, ...conversationHistory],
      temperature: 0.7,
      max_tokens: 1000
    });

    const assistantContent = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    // Save assistant message
    const { data: assistantMessage, error: assistantMessageError } = await supabase
      .from("messages")
      .insert({
        session_id: sessionId,
        role: "assistant",
        content: assistantContent,
        metadata: { 
          model: "gpt-4-turbo-preview",
          documentId, 
          moduleId,
          usage: completion.usage
        }
      })
      .select()
      .single();

    if (assistantMessageError) {
      throw assistantMessageError;
    }

    // Update session last message time
    await supabase
      .from("chat_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", sessionId);

    return NextResponse.json({
      success: true,
      userMessage,
      assistantMessage
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}