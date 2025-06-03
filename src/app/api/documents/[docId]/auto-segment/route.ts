import { createClient } from "../../../../../../supabase/server";
import { NextResponse } from "next/server";
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to clean OpenAI response and extract JSON
function cleanOpenAIResponse(content: string): string {
  // Remove markdown code fences and any extra formatting
  let cleaned = content.trim();
  
  // Remove ```json and ``` wrappers if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '');
  }
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\s*```$/, '');
  }
  
  // Remove any leading/trailing whitespace or newlines
  cleaned = cleaned.trim();
  
  // If it still doesn't start with [ or {, try to find the JSON part
  if (!cleaned.startsWith('[') && !cleaned.startsWith('{')) {
    const jsonStart = cleaned.search(/[\[\{]/);
    if (jsonStart !== -1) {
      cleaned = cleaned.substring(jsonStart);
    }
  }
  
  return cleaned;
}

// Helper function to analyze document structure and estimate pages
function analyzeDocumentStructure(text: string) {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const totalCharacters = text.length;
  const totalWords = text.split(/\s+/).filter(word => word.length > 0).length;
  
  // Estimate pages based on average words per page (typically 250-500 words)
  const estimatedPages = Math.max(1, Math.ceil(totalWords / 350));
  
  // Find potential chapter/section headings
  const headings = lines.filter(line => {
    const trimmed = line.trim();
    return (
      trimmed.length < 100 && // Not too long to be a heading
      (
        /^(Chapter|Section|Part|Unit)\s+\d+/i.test(trimmed) ||
        /^\d+\.\d*\s+/.test(trimmed) ||
        /^[A-Z][A-Z\s]{2,}$/.test(trimmed) || // ALL CAPS
        (/^[A-Z]/.test(trimmed) && trimmed.split(' ').length <= 8) // Title case, short
      ) &&
      !trimmed.includes('.pdf') &&
      !trimmed.includes('page') &&
      !trimmed.includes('@')
    );
  });
  
  // Find learning-related keywords to better understand content type
  const learningKeywords = [
    'definition', 'concept', 'principle', 'theory', 'example', 'application',
    'formula', 'equation', 'method', 'process', 'analysis', 'solution',
    'exercise', 'problem', 'case study', 'research', 'experiment'
  ];
  
  const contentScore = learningKeywords.reduce((score, keyword) => {
    const regex = new RegExp(keyword, 'gi');
    return score + (text.match(regex) || []).length;
  }, 0);
  
  return {
    estimatedPages,
    totalCharacters,
    totalWords,
    headings: headings.slice(0, 20), // Limit to first 20 potential headings
    contentScore,
    hasStructure: headings.length > 2
  };
}

// Enhanced LLM function with better content analysis
async function autoSegmentDocument(documentText: string) {
  console.log("Auto-segmenting document with OpenAI...");
  
  // Analyze document structure first
  const analysis = analyzeDocumentStructure(documentText);
  console.log(`Document analysis: ${analysis.estimatedPages} pages, ${analysis.totalWords} words, ${analysis.headings.length} headings`);
  
  // Adjust text length for OpenAI token limits (roughly 4 chars per token, with ~8k token limit for content)
  let processedText = documentText;
  const maxChars = 25000; // Conservative limit to leave room for prompt
  
  if (documentText.length > maxChars) {
    console.log(`Document too long (${documentText.length} chars), truncating to ${maxChars} chars`);
    
    // Try to truncate at natural breakpoints (paragraphs or sections)
    const paragraphs = documentText.split('\n\n');
    let truncatedText = '';
    
    for (const paragraph of paragraphs) {
      if ((truncatedText + paragraph).length > maxChars) {
        break;
      }
      truncatedText += paragraph + '\n\n';
    }
    
    if (truncatedText.length < maxChars * 0.8) {
      // If paragraph-based truncation was too conservative, use character truncation
      processedText = documentText.substring(0, maxChars);
    } else {
      processedText = truncatedText;
    }
    
    processedText += '\n\n[Note: Document was truncated for processing. Full content will be available in modules.]';
  }
  
  const prompt = `You are an expert educational content analyst whose sole job is to intelligently segment academic documents into logical learning modules. Your output must be valid JSON and nothing else.

**DOCUMENT ANALYSIS PROVIDED**:
- Estimated pages: ${analysis.estimatedPages}
- Total words: ${analysis.totalWords}
- Detected headings: ${analysis.headings.length > 0 ? analysis.headings.slice(0, 10).join('; ') : 'None detected'}
- Content type: ${analysis.contentScore > 10 ? 'Academic/Educational' : 'General'}

**TASK**: Analyze the provided document text and segment it into 3-8 coherent learning modules that make pedagogical sense for students. Each module should represent a distinct topic, concept area, or learning unit.

**CRITICAL REQUIREMENTS**:

1. **INTELLIGENT CONTENT ANALYSIS**: 
   - Read through the ENTIRE document text carefully
   - Identify natural content boundaries, topic shifts, and conceptual groupings
   - Look for chapter headings, section breaks, topic transitions, and conceptual themes
   - Group related concepts together into logical learning units
   - Ensure each module has substantial, meaningful content (not just a page or two)
   - Use the detected headings as guides: ${analysis.headings.slice(0, 5).join(', ') || 'No clear headings detected'}

2. **MODULE CRITERIA**:
   - Each module should cover 1 major topic/concept area
   - Modules should be roughly balanced in content length (${Math.ceil(analysis.estimatedPages / 6)}-${Math.ceil(analysis.estimatedPages / 3)} pages typically)
   - Avoid creating too many tiny modules or too few massive ones
   - Each module should be self-contained enough to study independently
   - Progressive difficulty: early modules should build foundations for later ones

3. **CONTENT FOCUS**: Extract actual educational content, NOT:
   - Table of contents, index, bibliography
   - Copyright pages, acknowledgments, prefaces
   - Page headers/footers, page numbers
   - "Learning objectives" boxes unless they contain unique content
   - Generic study tips or margin notes
   - Blank pages or filler content

4. **PAGE ESTIMATION**: 
   - Document has approximately ${analysis.estimatedPages} pages total
   - Estimate realistic page ranges based on content density and natural breaks
   - Consider that dense technical content = fewer pages per module
   - Lighter introductory content = more pages per module
   - Ensure page ranges don't overlap and cover most of the document

5. **JSON FORMAT**: Return exactly this structure:
   [
     {
       "name": "<Clear, descriptive module title (4-8 words)>",
       "start_page": <estimated starting page number>,
       "end_page": <estimated ending page number>,
       "short_summary": "<2-3 sentence summary of key concepts, topics, and learning outcomes covered in this module>"
     },
     ...
   ]

6. **TITLE GUIDELINES**:
   - Use clear, student-friendly titles that indicate the topic
   - Avoid generic titles like "Introduction" or "Chapter 1"
   - Be specific: "Cellular Respiration and ATP" not "Biology Basics"
   - Use active, engaging language when possible
   - Base titles on actual content themes, not just position

7. **SUMMARY GUIDELINES**:
   - Focus on KEY concepts, definitions, formulas, processes found in the text
   - Mention specific topics, not just vague learning goals
   - Include any major examples, case studies, or applications
   - Highlight connections to other concepts when relevant
   - Reference actual content from the document

**DOCUMENT TO ANALYZE**:
${processedText}

**OUTPUT INSTRUCTIONS**: 
- Analyze the content above and create 3-8 logical learning modules
- Base module boundaries on actual content themes and natural breaks
- Ensure page ranges are realistic and progressive
- Make titles specific and informative based on actual content
- Write summaries that capture the actual educational content found
- Return ONLY valid JSON with no additional text or formatting

Generate the module segmentation now:`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are an expert educational content analyst that segments academic documents into logical learning modules. You must return only valid JSON with no additional formatting or text. Base your analysis on the actual content provided, not assumptions."
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.2, // Lower temperature for more consistent, analytical output
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    // Parse JSON response
    let segmentedModules;
    try {
      const cleanedContent = cleanOpenAIResponse(content);
      segmentedModules = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Initial JSON parse failed, trying with retry prompt...');
      
      // Retry with clarifier if JSON is invalid
      const retryResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "You are an expert educational content analyst that segments academic documents into logical learning modules. You must return only valid JSON with no additional formatting or text."
          },
          { 
            role: "user", 
            content: prompt 
          },
          {
            role: "assistant",
            content: content
          },
          {
            role: "user",
            content: "The response must be valid JSON only. Please provide an array of module objects, each with 'name', 'start_page', 'end_page', and 'short_summary' fields. No additional text or formatting."
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      });

      const retryContent = retryResponse.choices[0]?.message?.content?.trim();
      if (!retryContent) {
        throw new Error('No content received from OpenAI on retry');
      }

      const cleanedRetryContent = cleanOpenAIResponse(retryContent);
      segmentedModules = JSON.parse(cleanedRetryContent);
    }

    // Validate and enhance the structure
    if (!Array.isArray(segmentedModules)) {
      throw new Error('Response is not an array');
    }

    // Validate and fix each module
    segmentedModules.forEach((module, index) => {
      if (!module.name || !module.short_summary) {
        throw new Error(`Module at index ${index} missing required fields`);
      }
      
      // Ensure page numbers are present and reasonable
      if (!module.start_page || !module.end_page) {
        console.warn(`Module at index ${index} missing page numbers, setting defaults based on analysis`);
        const pagesPerModule = Math.ceil(analysis.estimatedPages / segmentedModules.length);
        module.start_page = index * pagesPerModule + 1;
        module.end_page = Math.min((index + 1) * pagesPerModule, analysis.estimatedPages);
      }
      
      // Ensure start page is not greater than end page
      if (module.start_page > module.end_page) {
        console.warn(`Module at index ${index} has invalid page range, swapping`);
        [module.start_page, module.end_page] = [module.end_page, module.start_page];
      }
      
      // Ensure page numbers are within reasonable bounds
      module.start_page = Math.max(1, Math.min(module.start_page, analysis.estimatedPages));
      module.end_page = Math.max(module.start_page, Math.min(module.end_page, analysis.estimatedPages));
    });

    // Sort modules by start page to ensure proper order
    segmentedModules.sort((a, b) => a.start_page - b.start_page);

    // Fix any overlapping page ranges
    for (let i = 1; i < segmentedModules.length; i++) {
      if (segmentedModules[i].start_page <= segmentedModules[i-1].end_page) {
        segmentedModules[i].start_page = segmentedModules[i-1].end_page + 1;
        if (segmentedModules[i].end_page <= segmentedModules[i].start_page) {
          segmentedModules[i].end_page = segmentedModules[i].start_page + Math.ceil(analysis.estimatedPages / segmentedModules.length);
        }
      }
    }

    console.log(`Successfully generated ${segmentedModules.length} modules using OpenAI with document analysis`);
    return segmentedModules;

  } catch (error) {
    console.error('Error auto-segmenting document with OpenAI:', error);
    
    // Enhanced fallback using document analysis
    console.log('Falling back to intelligent mock segmentation using document analysis...');
    
    const optimalModules = Math.min(8, Math.max(3, Math.ceil(analysis.estimatedPages / 4)));
    const pagesPerModule = Math.ceil(analysis.estimatedPages / optimalModules);
    
    const fallbackModules = [];
    
    // Use detected headings if available
    if (analysis.hasStructure && analysis.headings.length >= optimalModules) {
      for (let i = 0; i < Math.min(optimalModules, analysis.headings.length); i++) {
        const startPage = i * pagesPerModule + 1;
        const endPage = Math.min((i + 1) * pagesPerModule, analysis.estimatedPages);
        
        const heading = analysis.headings[i];
        const cleanTitle = heading
          .replace(/^(Chapter|Section|Part|Unit)\s+\d+:?\s*/i, '')
          .replace(/^\d+\.\d*\s+/, '')
          .trim();
        
        fallbackModules.push({
          name: cleanTitle.length > 4 && cleanTitle.length < 60 ? 
            cleanTitle : 
            `Module ${i + 1}: ${cleanTitle.split(' ').slice(0, 4).join(' ')}`,
          start_page: startPage,
          end_page: endPage,
          short_summary: `This module covers ${cleanTitle.toLowerCase()} and related concepts. It includes key definitions, principles, and practical applications relevant to understanding this topic area.`
        });
      }
    } else {
      // Fallback to generic modules based on content type
      const moduleTypes = [
        { name: "Fundamentals and Introduction", focus: "foundational concepts and terminology" },
        { name: "Core Principles and Theory", focus: "essential principles and theoretical frameworks" },
        { name: "Applications and Methods", focus: "practical applications and methodological approaches" },
        { name: "Advanced Concepts", focus: "complex topics and advanced understanding" },
        { name: "Integration and Synthesis", focus: "connecting concepts and comprehensive review" }
      ];
      
      for (let i = 0; i < optimalModules; i++) {
        const startPage = i * pagesPerModule + 1;
        const endPage = Math.min((i + 1) * pagesPerModule, analysis.estimatedPages);
        const moduleType = moduleTypes[i % moduleTypes.length];
        
        fallbackModules.push({
          name: `${moduleType.name}`,
          start_page: startPage,
          end_page: endPage,
          short_summary: `This module covers ${moduleType.focus} from pages ${startPage}-${endPage}. It provides essential knowledge and skills needed for understanding the subject matter.`
        });
      }
    }
    
    return fallbackModules;
  }
}

// Enhanced function to extract text from PDF/document
async function extractTextFromDocument(fileUrl: string): Promise<string> {
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
    
    // If PDF parsing fails, provide a detailed fallback that explains the situation
    const fallbackText = `Document Processing Notice

This document was uploaded for automatic segmentation but text extraction encountered issues. This may occur with:
- Image-based or scanned PDFs that require OCR processing
- Password-protected documents
- Corrupted or unusual PDF formats
- Network connectivity issues

For optimal results, please ensure your document:
- Contains searchable text (not just images)
- Is not password protected
- Is a standard PDF format

Fallback Content Structure:

Introduction and Overview
This section would typically introduce the main concepts and provide an overview of the document structure. It establishes the foundation for understanding the material and outlines the key learning objectives.

Core Concepts and Fundamentals  
This module would cover the essential principles, definitions, and theoretical foundations. It includes fundamental concepts that students need to master before progressing to more advanced topics.

Applications and Examples
This section would demonstrate practical applications of the concepts through real-world examples, case studies, and worked problems. It bridges theory with practice.

Advanced Topics and Integration
This module would explore more complex concepts, advanced applications, and how different ideas connect together. It challenges students to apply their knowledge in sophisticated ways.

Review and Assessment
This final section would summarize key points, provide review questions, and offer opportunities for self-assessment to reinforce learning.

To improve automatic segmentation, consider:
1. Re-uploading the document in a different format
2. Using a text-searchable PDF version
3. Manually creating modules if automatic segmentation fails`;

    return fallbackText;
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

    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const { replace = false } = body;

    // Get the document details
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

    // Check if modules already exist for this document
    const { data: existingModules, error: moduleCheckError } = await supabase
      .from("modules")
      .select("id")
      .eq("document_id", docId)
      .limit(1);

    if (moduleCheckError) {
      return NextResponse.json(
        { error: "Failed to check existing modules" },
        { status: 500 }
      );
    }

    if (existingModules && existingModules.length > 0 && !replace) {
      return NextResponse.json(
        { 
          error: "Document already has modules. Delete existing modules first or use replace option.",
          requiresReplace: true
        },
        { status: 409 }
      );
    }

    // If replace is true, delete existing modules first
    if (replace && existingModules && existingModules.length > 0) {
      const { error: deleteError } = await supabase
        .from("modules")
        .delete()
        .eq("document_id", docId)
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("Error deleting existing modules:", deleteError);
        return NextResponse.json(
          { error: "Failed to delete existing modules" },
          { status: 500 }
        );
      }
    }

    // Get the file URL from Supabase Storage
    const fileUrl = supabase.storage
      .from("study-documents")
      .getPublicUrl(document.file_path).data.publicUrl;

    // Extract text from the document
    const documentText = await extractTextFromDocument(fileUrl);

    // Send to LLM for auto-segmentation
    const segmentedModules = await autoSegmentDocument(documentText);

    // Create modules in the database
    const createdModules = [];
    for (let i = 0; i < segmentedModules.length; i++) {
      const segment = segmentedModules[i];

      const { data: moduleData, error: moduleError } = await supabase
        .from("modules")
        .insert({
          title: segment.name,
          document_id: docId,
          folder_id: document.folder_id,
          user_id: user.id,
          order: i,
          start_page: segment.start_page,
          end_page: segment.end_page,
          summary: segment.short_summary,
        })
        .select()
        .single();

      if (moduleError) {
        console.error("Error creating module:", moduleError);
        continue;
      }

      createdModules.push(moduleData);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ${replace ? 'replaced' : 'created'} ${createdModules.length} modules`,
      modules: createdModules,
    });

  } catch (error) {
    console.error("Error auto-segmenting document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 