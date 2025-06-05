import { createClient } from "../../../../../supabase/server";
import { NextResponse } from "next/server";
import { AIService } from "@/lib/ai-service";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    console.log("Received request body:", body);
    const { sessionId, documentId, moduleId, type, options, content: providedContent } = body;

    if (!sessionId || !type) {
      console.log("Missing required parameters:", { sessionId, type });
      return NextResponse.json(
        { error: "Session ID and type are required" },
        { status: 400 }
      );
    }

    // Get content from multiple sources
    let content = "";
    let moduleTitle = "";
    
    // Priority 1: Use provided content directly (for YouLearn-style)
    if (providedContent) {
      content = providedContent;
    } 
    // Priority 2: Get document content if available
    else if (documentId) {
      // Get document text
      const { data: document } = await supabase
        .from("documents")
        .select("extracted_text, file_name")
        .eq("id", documentId)
        .single();

      if (document && document.extracted_text) {
        content = document.extracted_text;
        
        // If specific module is selected, get module content
        if (moduleId) {
          const { data: module } = await supabase
            .from("modules")
            .select("title, content_excerpt, start_page, end_page")
            .eq("id", moduleId)
            .single();

          if (module) {
            moduleTitle = module.title;
            // In a real implementation, extract specific pages from the document
            // For now, use the content excerpt
            if (module.content_excerpt) {
              content = module.content_excerpt;
            }
          }
        }
        
        // Apply page range if specified
        if (options?.pageRange && document.extracted_text) {
          // In a real implementation, extract specific pages
          // For now, we'll use a portion of the text
          const wordsPerPage = 300;
          const startIndex = (options.pageRange.start - 1) * wordsPerPage;
          const endIndex = options.pageRange.end * wordsPerPage;
          const words = document.extracted_text.split(' ');
          content = words.slice(startIndex, endIndex).join(' ');
        }
      }
    } 
    // Priority 3: Get recent messages from the chat as context
    else {
      const { data: messages } = await supabase
        .from("messages")
        .select("content, role")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (messages && messages.length > 0) {
        // Combine recent messages as context, filtering out system messages
        content = messages
          .reverse()
          .filter(m => m.role === 'user') // Only use user messages for content generation
          .map(m => m.content)
          .join('\n\n');
      }
    }

    if (!content || content.trim().length < 50) {
      console.log("No sufficient content available. Content length:", content.length);
      return NextResponse.json(
        { error: "No sufficient content available to generate study materials. Please provide more detailed content or ask questions first." },
        { status: 400 }
      );
    }

    // Generate content based on type
    let generatedContent;
    
    switch (type) {
      case 'flashcards':
        generatedContent = await AIService.generateFlashcards({
          content,
          moduleTitle,
          count: options.quantity || 10,
          difficulty: options.difficulty || 'medium'
        });
        break;
        
      case 'quiz':
        generatedContent = await AIService.generateQuiz({
          content,
          moduleTitle,
          count: options.quantity || 10,
          difficulty: options.difficulty || 'medium'
        });
        break;
        
      case 'summary':
        generatedContent = await AIService.generateSummary({
          content,
          moduleTitle,
          maxLength: options.quantity || 500
        });
        break;
        
      case 'notes':
        generatedContent = await AIService.generateStudyNotes({
          content,
          moduleTitle,
          style: 'outline'
        });
        break;
        
      default:
        return NextResponse.json(
          { error: "Invalid content type" },
          { status: 400 }
        );
    }

    // Save generated content to database
    const { data: savedContent, error: saveError } = await supabase
      .from("generated_content")
      .insert({
        message_id: null, // Not tied to a specific message
        type,
        content: generatedContent
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving generated content:", saveError);
    }

    return NextResponse.json({
      success: true,
      content: generatedContent,
      savedId: savedContent?.id
    });
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}