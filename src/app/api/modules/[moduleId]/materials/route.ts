import { createClient } from "../../../../../../supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { moduleId } = params;
    
    if (!moduleId) {
      return NextResponse.json(
        { error: "Module ID is required" },
        { status: 400 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    // Verify the module belongs to the user
    const { data: module, error: moduleError } = await supabase
      .from("modules")
      .select("*")
      .eq("id", moduleId)
      .eq("user_id", user.id)
      .single();

    if (moduleError || !module) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // Build query for study materials
    let query = supabase
      .from("study_materials")
      .select("*")
      .eq("module_id", moduleId);

    // Filter by type if specified
    if (type && ['flashcards', 'quiz', 'summary'].includes(type)) {
      query = query.eq("type", type);
    }

    const { data: materials, error: materialsError } = await query
      .order("created_at", { ascending: false });

    if (materialsError) {
      console.error("Error fetching study materials:", materialsError);
      return NextResponse.json(
        { error: "Failed to fetch study materials" },
        { status: 500 }
      );
    }

    // If a specific type was requested and found, return just that material
    if (type && materials && materials.length > 0) {
      return NextResponse.json({
        success: true,
        type: type,
        data: materials[0],
        payload: materials[0].payload,
      });
    }

    // Otherwise return all materials
    return NextResponse.json({
      success: true,
      materials: materials || [],
    });

  } catch (error) {
    console.error("Error fetching study materials:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 