import { createClient } from "../../../../../../supabase/server";
import { NextResponse } from "next/server";

// Get materials for a conversation
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

    // Get materials
    const { data: materials, error } = await supabase
      .from("conversation_materials")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching materials:", error);
      return NextResponse.json(
        { error: "Failed to fetch materials" },
        { status: 500 },
      );
    }

    return NextResponse.json({ materials });
  } catch (error) {
    console.error("Error in GET /api/conversations/[id]/materials:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
