import { createClient } from "../../../../../supabase/server";
import { NextResponse } from "next/server";

// Update a conversation
export async function PATCH(
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

    const updates = await request.json();
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

    // Update the conversation
    const { data: updatedConversation, error: updateError } = await supabase
      .from("conversations")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating conversation:", updateError);
      return NextResponse.json(
        { error: "Failed to update conversation" },
        { status: 500 },
      );
    }

    return NextResponse.json({ conversation: updatedConversation });
  } catch (error) {
    console.error("Error in PATCH /api/conversations/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Get a specific conversation
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

    const { data: conversation, error } = await supabase
      .from("conversations")
      .select(
        `
        *,
        folders:space_id(id, name, icon)
      `,
      )
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (error || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Error in GET /api/conversations/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
