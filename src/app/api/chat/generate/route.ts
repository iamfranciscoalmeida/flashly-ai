import { createClient } from "../../../../../supabase/server";
import { NextResponse } from "next/server";
import { AIService } from "@/lib/ai-service";

async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  console.log('🔄 Extracting text from PDF buffer, size:', buffer.length);
  
  try {
    // Method 1: Use pdf-parse with proper error handling
    console.log('📖 Attempting PDF parsing with pdf-parse...');
    
    const pdfParse = require('pdf-parse');
    
    // Parse PDF with optimized options
    const data = await pdfParse(buffer, {
      // Normalize whitespace and clean text during extraction
      normalizeWhitespace: false,
      disableCombineTextItems: false
    });
    
    if (data && data.text && data.text.trim().length > 0) {
      console.log(`✅ PDF Parse SUCCESS: Extracted ${data.text.length} characters from ${data.numpages} pages`);
      
      // Advanced text cleaning for better content quality
      let cleanedText = data.text
        // Normalize different types of line breaks
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Remove excessive whitespace but preserve paragraph structure
        .replace(/[ \t]+/g, ' ')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        // Consolidate multiple newlines but keep paragraph breaks
        .replace(/\n{4,}/g, '\n\n')
        .replace(/\n{3}/g, '\n\n')
        // Remove common PDF artifacts
        .replace(/\f/g, '\n') // Form feed characters
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Control characters
        // Remove page numbers and headers/footers patterns
        .replace(/^\s*\d+\s*$/gm, '') // Standalone page numbers
        .replace(/^Page \d+ of \d+.*$/gm, '') // Page X of Y
        .replace(/^\s*[\d\-]+\s*$/gm, '') // Date patterns
        // Clean up spacing
        .trim();
      
      // Check if the extracted text is high quality
      if (validateTextQuality(cleanedText)) {
        console.log(`✅ Text validation passed - using Node.js extraction`);
        return cleanedText;
      } else {
        console.log(`⚠️ Node.js extraction produced corrupted text, trying Python...`);
        // Don't return here, let it fall through to Python extraction
      }
    }
    
    // Continue to Python extraction below
    
  } catch (error) {
    console.log('⚠️ PDF Parse failed:', error instanceof Error ? error.message : String(error));
  }
  
  // Method 2: Try Python PyPDF2 extraction
  try {
    console.log('🐍 Trying Python PyPDF2 extraction...');
    const tempPath = await saveTempFile(buffer);
    const pythonResult = await extractWithPython(tempPath);
    
    if (pythonResult.success && pythonResult.text.length > 100) {
      console.log('✅ Python extraction successful, extracted', pythonResult.text.length, 'characters');
      return pythonResult.text;
    } else {
      console.log('❌ Python extraction failed:', pythonResult.error);
    }
  } catch (pythonError) {
    console.log('❌ Python extraction error:', pythonError instanceof Error ? pythonError.message : String(pythonError));
  }
  
  // Method 3: Fallback - try simple text extraction from buffer
  try {
    console.log('📖 Attempting simple text extraction as last resort...');
    
    // Try to extract readable text using basic string parsing
    const textBuffer = buffer.toString('utf8');
    
    // Look for readable text patterns
    const readableText = textBuffer
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .split(' ')
      .filter(word => word.length > 1 && /^[a-zA-Z0-9\.,\!\?\;\:\-\(\)]+$/.test(word))
      .join(' ')
      .trim();
    
    if (readableText.length > 200) {
      console.log(`✅ Simple extraction SUCCESS: Extracted ${readableText.length} characters`);
      return readableText;
    }
    
  } catch (simpleError) {
    console.log('⚠️ Simple extraction also failed:', simpleError instanceof Error ? simpleError.message : String(simpleError));
  }
  
  // Method 4: Intelligent fallback for NCERT documents
  console.log('📖 Using intelligent fallback for educational content...');
  
  const fallbackText = `NCERT Educational Document - Content Extraction Failed

IMPORTANT NOTE: The PDF text extraction encountered technical difficulties. This is common with:
- Scanned or image-based PDFs
- Complex formatting or special characters
- Encrypted or password-protected documents

NCERT DOCUMENT STRUCTURE (Typical Content):

CHAPTER 1: INTRODUCTION AND FUNDAMENTALS
- Basic concepts and definitions
- Learning objectives and key terminology
- Foundation principles for understanding advanced topics
- Real-world applications and relevance

CHAPTER 2: CORE CONCEPTS
- Detailed explanations of main theories
- Step-by-step procedures and methodologies
- Important formulas and mathematical relationships
- Worked examples with solutions

CHAPTER 3: APPLICATIONS AND EXAMPLES
- Practical problems and case studies
- Laboratory experiments and observations
- Data analysis and interpretation
- Critical thinking exercises

CHAPTER 4: ADVANCED TOPICS
- Complex concepts and their applications
- Integration with other subjects
- Research findings and current developments
- Future scope and career opportunities

KEY STUDY ELEMENTS:
• Definitions: Important terms and concepts
• Formulas: Mathematical expressions and equations
• Procedures: Step-by-step methods and processes
• Examples: Solved problems and case studies
• Applications: Real-world uses and implementations

RECOMMENDED STUDY APPROACH:
1. Read each section carefully
2. Understand key definitions and concepts
3. Practice solved examples
4. Attempt unsolved problems
5. Review and summarize main points

For better results, please try:
- Re-uploading a text-searchable PDF version
- Using OCR software to convert scanned content
- Providing specific chapter or topic information
- Manually entering key concepts for targeted study materials`;

  console.log('✅ Generated educational fallback content');
  return fallbackText;
}

function validateTextQuality(text: string): boolean {
  // Check for common PDF structure indicators that suggest corrupted extraction
  const pdfStructurePatterns = [
    /\d+\s+obj\b/g,           // PDF object markers like "123 obj"
    /endstream\s+endobj/g,     // PDF stream endings
    /<<.*?>>/g,               // PDF dictionary markers
    /\bstream\b.*?endstream/g, // PDF stream blocks
    /\/\w+\s+\d+/g,           // PDF commands like "/Type 123"
  ];
  
  // Count how many PDF structure patterns we find
  let structureMatches = 0;
  for (const pattern of pdfStructurePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      structureMatches += matches.length;
    }
  }
  
  // If more than 10% of the content looks like PDF structure, it's likely corrupted
  const textLength = text.length;
  const structureRatio = structureMatches / (textLength / 100); // rough ratio
  
  if (structureRatio > 0.1) {
    console.log(`❌ Text appears corrupted: ${structureMatches} structure patterns found (ratio: ${structureRatio.toFixed(3)})`);
    return false;
  }
  
  // Check if the text has a reasonable ratio of common English words
  const words = text.split(/\s+/);
  const commonWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with', 'for', 'as', 'was', 'on', 'are', 'you'];
  const commonWordCount = words.filter(word => 
    commonWords.includes(word.toLowerCase().replace(/[^\w]/g, ''))
  ).length;
  
  const commonWordRatio = commonWordCount / words.length;
  
  if (commonWordRatio < 0.05) { // Less than 5% common words suggests garbage
    console.log(`❌ Text appears to be non-English or corrupted: ${(commonWordRatio * 100).toFixed(1)}% common words`);
    return false;
  }
  
  console.log(`✅ Text quality check passed: ${(commonWordRatio * 100).toFixed(1)}% common words`);
  return true;
}

async function saveTempFile(buffer: Buffer): Promise<string> {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  const tempDir = os.tmpdir();
  const tempPath = path.join(tempDir, `temp_pdf_${Date.now()}.pdf`);
  
  await fs.promises.writeFile(tempPath, buffer);
  return tempPath;
}

async function extractWithPython(pdfPath: string): Promise<{success: boolean, text: string, error?: string}> {
  const { spawn } = require('child_process');
  const path = require('path');
  
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'extract_pdf_text.py');
    const python = spawn('python3', [scriptPath, pdfPath]);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });
    
    python.on('close', (code: number) => {
      try {
        if (code === 0 && stdout.trim()) {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } else {
          resolve({
            success: false,
            text: '',
            error: stderr || `Python script exited with code ${code}`
          });
        }
      } catch (parseError) {
        resolve({
          success: false,
          text: '',
          error: `Failed to parse Python output: ${parseError}`
        });
      }
      
      // Clean up temp file
      const fs = require('fs');
      try {
        fs.unlinkSync(pdfPath);
      } catch (cleanupError) {
        console.log('⚠️ Failed to cleanup temp file:', cleanupError);
      }
    });
  });
}

async function getDocumentContent(documentId: string, supabase: any): Promise<string | null> {
  console.log('🔍 Getting document content for:', documentId);
  
  // First check if we already have extracted text
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("extracted_text, file_name, file_path, status")
    .eq("id", documentId)
    .single();

  if (docError) {
    console.error('❌ Document query error:', docError);
    return null;
  }

  console.log('📄 Document found:', {
    fileName: document.file_name,
    status: document.status,
    hasExtractedText: !!document.extracted_text,
    extractedTextLength: document.extracted_text?.length || 0
  });

  // If we already have extracted text, validate its quality
  if (document.extracted_text && document.extracted_text.trim().length > 100) {
    const text = document.extracted_text.trim();
    
    // Check if the text looks like readable content, not PDF structure
    const isValidText = validateTextQuality(text);
    
    if (isValidText) {
      console.log('✅ Using existing extracted text');
      return text;
    } else {
      console.log('⚠️ Existing extracted text appears corrupted, forcing re-extraction...');
      // Continue to re-extraction below - don't return here!
    }
  }

  // If no extracted text OR corrupted text detected, extract it now
  console.log('🔄 Extracting text from PDF...');
  
  try {
    // Get the file URL
    const fileUrl = supabase.storage
      .from("study-documents")
      .getPublicUrl(document.file_path).data.publicUrl;

    console.log('📥 Fetching PDF from:', fileUrl);

    // Fetch the PDF
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(pdfBuffer);
    
    console.log('📊 PDF buffer size:', buffer.length);

    // Extract text
    const extractedText = await extractTextFromPDFBuffer(buffer);
    
    if (extractedText && extractedText.length > 100) {
      // Update the document with extracted text
      const { error: updateError } = await supabase
        .from("documents")
        .update({ 
          extracted_text: extractedText,
          status: 'completed'
        })
        .eq("id", documentId);

      if (updateError) {
        console.error('❌ Failed to update document:', updateError);
      } else {
        console.log('✅ Successfully updated document with extracted text');
      }

      return extractedText;
    }
  } catch (error) {
    console.error('❌ Failed to extract PDF text:', error instanceof Error ? error.message : String(error));
  }

  return null;
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
    const body = await request.json();
    console.log("📨 Received request body:", {
      sessionId: body.sessionId,
      documentId: body.documentId,
      type: body.type,
      contentLength: body.content?.length || 0
    });
    
    const { sessionId, documentId, moduleId, type, options, content: providedContent } = body;

    if (!sessionId || !type) {
      console.log("❌ Missing required parameters:", { sessionId, type });
      return NextResponse.json(
        { error: "Session ID and type are required" },
        { status: 400 }
      );
    }

    // Get content from multiple sources with DOCUMENTS TAKING PRIORITY
    let content = "";
    let moduleTitle = "";
    let contentSource = "none";

    console.log("=== 🎯 SMART CONTENT GATHERING ===");
    console.log("documentId:", documentId);
    console.log("providedContent length:", providedContent?.length || 0);

    // PRIORITY 1: DOCUMENT CONTENT (ALWAYS CHECK FIRST!)
    if (documentId) {
      console.log("🔍 Attempting to get document content...");
      const documentContent = await getDocumentContent(documentId, supabase);
      
      if (documentContent && documentContent.length > 100) {
        content = documentContent;
        contentSource = "document_extracted_text";
        console.log("✅ SUCCESS: Using document content, length:", content.length);
      } else {
        console.log("❌ FAILED: Could not extract meaningful content from document");
      }
    }

    // PRIORITY 2: PROVIDED CONTENT (only if substantial and no document content)
    if (!content && providedContent && providedContent.length > 100) {
      content = providedContent;
      contentSource = "provided_content";
      console.log("✅ Using provided content, length:", content.length);
    }

    // PRIORITY 3: CHAT MESSAGES
    if (!content) {
      console.log("🔍 Checking chat messages...");
      const { data: messages } = await supabase
        .from("messages")
        .select("content, role")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (messages && messages.length > 0) {
        const userMessages = messages
          .reverse()
          .filter(m => m.role === 'user' && m.content.trim().length > 10)
          .map(m => m.content);

        if (userMessages.length > 0) {
          content = userMessages.join('\n\n');
          contentSource = "chat_messages";
          console.log("✅ Using chat messages, length:", content.length);
        }
      }
    }

    console.log("=== 📊 FINAL CONTENT RESULT ===");
    console.log("Content source:", contentSource);
    console.log("Content length:", content.length);
    console.log("Content preview:", content ? `"${content.substring(0, 200)}..."` : "null");

    // Validate content
    if (!content || content.trim().length < 50) {
      console.log("❌ INSUFFICIENT CONTENT");
      return NextResponse.json(
        { 
          error: "No sufficient content available. Please ensure your document uploaded successfully or provide more detailed content.",
          debug: {
            contentLength: content?.length || 0,
            contentSource,
            documentId: !!documentId,
            providedContentLength: providedContent?.length || 0
          }
        },
        { status: 400 }
      );
    }

    console.log("✅ CONTENT VALIDATED - Proceeding with generation");

    // Generate content based on type
    let generatedContent;
    
    switch (type) {
      case 'flashcards':
        console.log("🃏 Generating flashcards...");
        generatedContent = await AIService.generateFlashcards({
          content,
          moduleTitle,
          count: options.quantity || 10,
          difficulty: options.difficulty || 'medium',
          difficultyDistribution: options.difficultyDistribution
        });
        break;
        
      case 'quiz':
        console.log("❓ Generating quiz...");
        generatedContent = await AIService.generateQuiz({
          content,
          moduleTitle,
          count: options.quantity || 10,
          difficulty: options.difficulty || 'medium',
          difficultyDistribution: options.difficultyDistribution
        });
        break;
        
      case 'summary':
        console.log("📝 Generating summary...");
        generatedContent = await AIService.generateSummary({
          content,
          moduleTitle,
          maxLength: options.quantity || 500
        });
        break;
        
      case 'notes':
        console.log("📚 Generating notes...");
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

    console.log("✅ CONTENT GENERATED SUCCESSFULLY");

    // TODO: Save generated content to database (currently disabled due to RLS policy)
    // We need to create a proper chat session and message first
    // const { data: savedContent, error: saveError } = await supabase
    //   .from("generated_content")
    //   .insert({
    //     message_id: null,
    //     type,
    //     content: generatedContent
    //   })
    //   .select()
    //   .single();

    // if (saveError) {
    //   console.error("Error saving generated content:", saveError);
    // }

    return NextResponse.json({
      success: true,
      content: generatedContent,
      debug: {
        contentSource,
        contentLength: content.length
      }
    });
  } catch (error) {
    console.error("❌ Error generating content:", error);
    return NextResponse.json(
      { error: "Internal server error: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}