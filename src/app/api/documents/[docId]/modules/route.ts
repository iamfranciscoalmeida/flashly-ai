import { createClient } from "../../../../../../supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { docId: string } }
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

    const { docId } = params;
    
    if (!docId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Verify the document belongs to the user
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id")
      .eq("id", docId)
      .eq("user_id", user.id)
      .single();

    if (documentError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Fetch all modules for this document
    const { data: modules, error: modulesError } = await supabase
      .from("modules")
      .select("*")
      .eq("document_id", docId)
      .order("order", { ascending: true });

    if (modulesError) {
      return NextResponse.json(
        { error: "Failed to fetch modules" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      modules: modules || [],
    });

  } catch (error) {
    console.error("Error fetching modules:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { docId: string } }
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

    const { docId } = params;
    
    if (!docId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { name, start_page, end_page, content_excerpt } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Module name is required" },
        { status: 400 }
      );
    }

    // Verify the document belongs to the user
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", docId)
      .eq("user_id", user.id)
      .single();

    if (documentError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Get the next order number
    const { data: existingModules, error: orderError } = await supabase
      .from("modules")
      .select("order")
      .eq("document_id", docId)
      .order("order", { ascending: false })
      .limit(1);

    if (orderError) {
      return NextResponse.json(
        { error: "Failed to determine module order" },
        { status: 500 }
      );
    }

    const nextOrder = existingModules && existingModules.length > 0 
      ? existingModules[0].order + 1 
      : 0;

    // Create the new module
    const { data: newModule, error: moduleError } = await supabase
      .from("modules")
      .insert({
        title: name.trim(),
        document_id: docId,
        folder_id: document.folder_id,
        user_id: user.id,
        order: nextOrder,
        start_page: start_page || null,
        end_page: end_page || null,
        content_excerpt: content_excerpt || null,
      })
      .select()
      .single();

    if (moduleError) {
      console.error("Error creating module:", moduleError);
      return NextResponse.json(
        { error: "Failed to create module" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Module created successfully",
      module: newModule,
    });

  } catch (error) {
    console.error("Error creating module:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 