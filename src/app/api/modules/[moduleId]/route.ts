import { createClient } from "../../../../../supabase/server";
import { NextResponse } from "next/server";

export async function PUT(
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

    // Parse the request body
    const body = await request.json();
    const { title, start_page, end_page, content_excerpt, summary } = body;

    // Verify the module belongs to the user
    const { data: existingModule, error: moduleError } = await supabase
      .from("modules")
      .select("*")
      .eq("id", moduleId)
      .eq("user_id", user.id)
      .single();

    if (moduleError || !existingModule) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // Prepare update data (only include fields that are provided)
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (start_page !== undefined) updateData.start_page = start_page;
    if (end_page !== undefined) updateData.end_page = end_page;
    if (content_excerpt !== undefined) updateData.content_excerpt = content_excerpt;
    if (summary !== undefined) updateData.summary = summary;

    // Update the module
    const { data: updatedModule, error: updateError } = await supabase
      .from("modules")
      .update(updateData)
      .eq("id", moduleId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating module:", updateError);
      return NextResponse.json(
        { error: "Failed to update module" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Module updated successfully",
      module: updatedModule,
    });

  } catch (error) {
    console.error("Error updating module:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Verify the module belongs to the user
    const { data: existingModule, error: moduleError } = await supabase
      .from("modules")
      .select("*")
      .eq("id", moduleId)
      .eq("user_id", user.id)
      .single();

    if (moduleError || !existingModule) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // Delete the module (this will cascade delete associated study materials)
    const { error: deleteError } = await supabase
      .from("modules")
      .delete()
      .eq("id", moduleId);

    if (deleteError) {
      console.error("Error deleting module:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete module" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Module deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting module:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 