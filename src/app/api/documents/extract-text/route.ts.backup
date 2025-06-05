import { createClient } from "../../../../../supabase/server";
import { NextResponse } from "next/server";

async function extractTextFromPDF(fileUrl: string): Promise<string> {
  console.log(`Extracting text from ${fileUrl}`);
  
  try {
    // Fetch the PDF document
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }
    
    // Get the PDF data as a buffer
    const pdfBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(pdfBuffer);
    
    // Extract text using pdf-parse
    console.log('Extracting text from PDF using pdf-parse...');
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('No text could be extracted from the PDF');
    }
    
    console.log(`Successfully extracted ${data.text.length} characters from ${data.numpages} pages`);
    
    // Clean up the extracted text
    let cleanedText = data.text
      // Remove excessive whitespace and normalize line breaks
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      // Remove page numbers and headers/footers (basic patterns)
      .replace(/Page \d+ of \d+/gi, '')
      .replace(/^\d+\s*$/gm, '')
      // Remove common PDF artifacts
      .replace(/\f/g, '\n') // Form feed characters
      .trim();
    
    if (cleanedText.length < 100) {
      throw new Error('Extracted text is too short, might be an image-based PDF');
    }
    
    return cleanedText;
    
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Get the document details
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (documentError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Get the file URL from Supabase Storage
    const fileUrl = supabase.storage
      .from("study-documents")
      .getPublicUrl(document.file_path).data.publicUrl;

    // Extract text from the PDF
    const extractedText = await extractTextFromPDF(fileUrl);

    // Update the document with the extracted text
    const { error: updateError } = await supabase
      .from("documents")
      .update({ 
        extracted_text: extractedText,
        status: 'completed' // Mark as completed since text is extracted
      })
      .eq("id", documentId);

    if (updateError) {
      console.error("Error updating document with extracted text:", updateError);
      return NextResponse.json(
        { error: "Failed to update document" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Text extracted successfully",
      textLength: extractedText.length
    });

  } catch (error) {
    console.error("Error in text extraction:", error);
    return NextResponse.json(
      { error: "Failed to extract text from document" },
      { status: 500 }
    );
  }
} 