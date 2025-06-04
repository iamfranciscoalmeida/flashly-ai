import { createClient } from "../../../../supabase/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create a new conversation
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, context_type, context_source, context_blob, space_id } =
      await request.json();

    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title: title || "New Conversation",
        context_type: context_type || "none",
        context_source,
        context_blob,
        space_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 },
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Error in POST /api/conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Get conversations for the user
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get("space_id");

    let query = supabase
      .from("conversations")
      .select(
        `
        *,
        folders:space_id(id, name, icon)
      `,
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (spaceId) {
      query = query.eq("space_id", spaceId);
    }

    const { data: conversations, error } = await query;

    if (error) {
      console.error("Error fetching conversations:", error);
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 },
      );
    }

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Error in GET /api/conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
