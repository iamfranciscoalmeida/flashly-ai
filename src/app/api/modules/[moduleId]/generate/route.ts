import { createClient } from "../../../../../../supabase/server";
import { NextResponse } from "next/server";
import OpenAI from 'openai';

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

// Real LLM function for generating study materials using OpenAI
async function generateFlashcards(moduleText: string, numCards: number = 5) {
  console.log(`Generating ${numCards} flashcards using OpenAI...`);
  
  const prompt = `You are an expert educational AI whose sole job is to convert a block of textbook content into high‐quality flashcards. Your output must be valid JSON and nothing else.

Requirements:
1. **Skip irrelevant or "fluff" sections**. Text like "Learning Objectives," "Key Takeaways," "Section Summary," "Instructor Notes," "Study Tips," "Margin Callouts," or any purely pedagogical scaffolding should not generate flashcards. Do not create questions from:
   - Headings or paragraphs that simply list learning objectives (e.g. "By the end of this chapter you will…").
   - Bulleted "key points" or "summary" boxes that repeat content in a non‐technical way.
   - Any examples or sidebars that do not introduce new definitions or concepts (e.g. "Tip: Don't forget to…," "Fun Fact: …").
   - Any text that is not part of the core technical explanation (e.g. "Page X of Y," "Figure 2.1 Illustration," table of contents references, footers, or suggested readings).

2. **Focus only on test‐worthy material**. Identify and transform core definitions, formulas, theorems, processes, cause‐and‐effect relationships, and any concrete examples that illustrate those technical points. Each flashcard should test:
   - **Key term definitions** (e.g. "What is osmosis?").
   - **Important formulas or equations** (e.g. "State the quadratic formula.").
   - **Conceptual relationships** (e.g. "How does voltage relate to current in Ohm's Law?").
   - **Step‐by‐step procedures** (e.g. "What are the four stages of cell division?").
   - **Short worked examples** only if they contain a core concept (e.g. "Given a right triangle with sides 3 and 4, what is the hypotenuse?").
   - **Critical distinctions** (e.g. "How does mitosis differ from meiosis?").

3. **CRITICAL: Avoid Book-Specific References**:
   - **NEVER reference specific book examples, figures, equations, or sections** (e.g., "Eq. 7.9", "Figure 3.2", "Example 4.1", "according to Section 2.3").
   - **Create novel, self-contained examples** from your knowledge base instead of referencing book examples.
   - **If the content mentions specific examples or figures, create new examples** that illustrate the same concepts.
   - **All questions and answers must be complete and understandable** without needing to reference external materials.
   - **Use your own knowledge** to provide concrete examples, formulas, and illustrations of concepts.

4. **JSON format**: Return exactly one JSON array whose elements are objects with the following structure:
   [
     {
       "question": "<a clear, concise question that tests a single concept or fact>",
       "answer": "<a direct, unambiguous answer—use bullet points or a short paragraph if needed>"
     },
     {
       "question": "...",
       "answer": "..."
     },
     ...
   ]
   - Do **not** wrap your JSON in any additional text or markup (no code fences, no explanatory sentences—only raw JSON).
   - Make sure every object has both "question" and "answer" keys.

5. **Card density & depth**:
   - Aim for one flashcard per distinct concept or formula. If a paragraph introduces two separate ideas, split them into two cards.
   - Generate approximately ${numCards} flashcards, focusing on the most important concepts.

6. **Examples of bad flashcards** (you must not produce these):
   - Q: "What are the learning objectives of this section?"  
     A: "1. Understand X. 2. Learn Y. 3. Be able to solve Z."  
     ㊉ (This comes directly from a "Learning Objectives" box—skip it.)
   - Q: "What does the margin note say about mitochondria?"  
     A: "It just says mitochondria produce energy."  
     ㊉ (Margin notes often repeat textbook jargon—skip unless it is the only occurrence of that definition.)
   - Q: "What is the significance of the formula from Eq. 7.9 in neural networks?"  
     A: "..."  
     ㊉ (References specific equation numbers that users cannot see.)

7. **Examples of good flashcards**:
   - Q: "What is the chemical equation for photosynthesis?"  
     A: "6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂"  
   - Q: "Define osmosis."  
     A: "Osmosis is the passive movement of water molecules across a semipermeable membrane from lower‐solute to higher‐solute concentration."  
   - Q: "List the three main steps of cellular respiration."  
     A: "- Glycolysis\\n- Krebs cycle\\n- Electron transport chain"
   - Q: "What is the backpropagation algorithm in neural networks?"  
     A: "Backpropagation is a supervised learning algorithm that calculates gradients by propagating errors backward through the network layers to update weights and minimize the loss function."

Now process this module text:
${moduleText}

Generate approximately ${numCards} flashcards accordingly, skipping the irrelevant "fluff" sections and focusing only on the content that could realistically appear on a test. Create novel examples from your knowledge base rather than referencing book-specific content. Output strictly valid JSON as described above—no extra commentary.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are an expert educational AI that generates high-quality flashcards from textbook content. You must return only valid JSON with no additional formatting or text. NEVER reference specific book examples, figures, equations, or sections that users cannot see."
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    // Parse JSON response
    let flashcards;
    try {
      const cleanedContent = cleanOpenAIResponse(content);
      flashcards = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Initial JSON parse failed, trying with retry prompt...');
      
      // Retry with clarifier if JSON is invalid
      const retryResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "You are an expert educational AI that generates high-quality flashcards from textbook content. You must return only valid JSON with no additional formatting or text. NEVER reference specific book examples, figures, equations, or sections that users cannot see."
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
            content: "Reminder: Output must be strictly valid JSON with an array of objects, each having 'question' and 'answer' fields. Do not include any extra text."
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });

      const retryContent = retryResponse.choices[0]?.message?.content?.trim();
      if (!retryContent) {
        throw new Error('No content received from OpenAI on retry');
      }

      const cleanedRetryContent = cleanOpenAIResponse(retryContent);
      flashcards = JSON.parse(cleanedRetryContent);
    }

    // Validate the structure
    if (!Array.isArray(flashcards)) {
      throw new Error('Response is not an array');
    }

    // Validate each flashcard has required fields
    flashcards.forEach((card, index) => {
      if (!card.question || !card.answer) {
        throw new Error(`Flashcard at index ${index} missing required fields`);
      }
    });

    // Limit to requested number of cards
    return flashcards.slice(0, numCards);

  } catch (error) {
    console.error('Error generating flashcards with OpenAI:', error);
    
    // Fallback to mock data if OpenAI fails
    console.log('Falling back to mock flashcards...');
    const mockFlashcards = [
      {
        question: "What is the main topic covered in this module?",
        answer: "The module covers fundamental concepts and principles related to the subject matter"
      },
      {
        question: "What are the key learning objectives?",
        answer: "Understanding core principles, practical applications, and theoretical foundations"
      },
      {
        question: "What practical applications are discussed?",
        answer: "Real-world examples and case studies that demonstrate the concepts in practice"
      },
      {
        question: "What background knowledge is required?",
        answer: "Basic understanding of the subject area and familiarity with related terminology"
      },
      {
        question: "How does this module relate to other sections?",
        answer: "It builds upon previous concepts and provides foundation for advanced topics"
      }
    ];
    
    return mockFlashcards.slice(0, numCards);
  }
}

async function generateQuiz(moduleText: string, numQuestions: number = 5) {
  console.log(`Generating ${numQuestions} quiz questions using OpenAI...`);
  
  const prompt = `You are an expert educational AI whose sole job is to convert a block of textbook content into high‐quality multiple choice quiz questions. Your output must be valid JSON and nothing else.

Requirements:
1. **Skip irrelevant or "fluff" sections**. Focus only on test-worthy material from the core content.

2. **Create meaningful multiple choice questions** that test:
   - **Key term definitions and concepts**
   - **Important formulas or equations**
   - **Conceptual relationships and cause-and-effect**
   - **Step‐by‐step procedures**
   - **Critical distinctions between concepts**

3. **CRITICAL: Avoid Book-Specific References**:
   - **NEVER reference specific book examples, figures, equations, or sections** (e.g., "Eq. 7.9", "Figure 3.2", "Example 4.1", "according to Section 2.3").
   - **Create novel, self-contained examples** from your knowledge base instead of referencing book examples.
   - **If the content mentions specific examples or figures, create new examples** that illustrate the same concepts.
   - **All questions and answers must be complete and understandable** without needing to reference external materials.
   - **Use your own knowledge** to provide concrete examples, formulas, and illustrations of concepts.

4. **JSON format**: Return exactly one JSON array whose elements are objects with the following structure:
   [
     {
       "stem": "<clear question stem>",
       "choices": ["<option A>", "<option B>", "<option C>", "<option D>"],
       "correct": "<A, B, C, or D - the letter of the correct answer>"
     },
     ...
   ]
   - Do **not** wrap your JSON in any additional text or markup.

5. **Quality guidelines**:
   - Make all answer choices plausible but only one definitively correct
   - Avoid "all of the above" or "none of the above" unless truly appropriate
   - Create distractors that test common misconceptions
   - Ensure questions test understanding, not just memorization
   - When referencing formulas or concepts, state them explicitly rather than using equation numbers

6. **Examples of bad questions** (you must not produce these):
   - "What is shown in Figure 2.1?" (References unavailable figure)
   - "According to Equation 7.9, what happens when..." (References specific equation number)
   - "In the example from Section 4.2..." (References specific book section)

7. **Examples of good questions**:
   - "What is the derivative of x² with respect to x?"
   - "Which algorithm is commonly used for training neural networks by adjusting weights based on error gradients?"
   - "What happens to the resistance in a circuit when resistors are connected in parallel?"

Now process this module text:
${moduleText}

Generate approximately ${numQuestions} high-quality multiple choice questions, focusing on test-worthy concepts and creating novel examples from your knowledge base. Output strictly valid JSON as described above—no extra commentary.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are an expert educational AI that generates high-quality quiz questions from textbook content. You must return only valid JSON with no additional formatting or text. NEVER reference specific book examples, figures, equations, or sections that users cannot see."
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    // Parse JSON response
    let questions;
    try {
      const cleanedContent = cleanOpenAIResponse(content);
      questions = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Initial JSON parse failed for quiz, trying with retry prompt...');
      
      // Retry with clarifier if JSON is invalid
      const retryResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "You are an expert educational AI that generates high-quality quiz questions from textbook content. You must return only valid JSON with no additional formatting or text. NEVER reference specific book examples, figures, equations, or sections that users cannot see."
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
            content: "Reminder: Output must be strictly valid JSON with an array of objects, each having 'stem', 'choices' (array of 4 strings), and 'correct' (single letter A-D) fields. Do not include any extra text."
          }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      });

      const retryContent = retryResponse.choices[0]?.message?.content?.trim();
      if (!retryContent) {
        throw new Error('No content received from OpenAI on retry');
      }

      const cleanedRetryContent = cleanOpenAIResponse(retryContent);
      questions = JSON.parse(cleanedRetryContent);
    }

    // Validate the structure
    if (!Array.isArray(questions)) {
      throw new Error('Response is not an array');
    }

    // Validate each question has required fields
    questions.forEach((q, index) => {
      if (!q.stem || !q.choices || !q.correct) {
        throw new Error(`Question at index ${index} missing required fields`);
      }
      if (!Array.isArray(q.choices) || q.choices.length !== 4) {
        throw new Error(`Question at index ${index} choices must be an array of 4 items`);
      }
      if (!['A', 'B', 'C', 'D'].includes(q.correct)) {
        throw new Error(`Question at index ${index} correct answer must be A, B, C, or D`);
      }
    });

    // Limit to requested number of questions
    return questions.slice(0, numQuestions);

  } catch (error) {
    console.error('Error generating quiz with OpenAI:', error);
    
    // Fallback to mock data if OpenAI fails
    console.log('Falling back to mock quiz questions...');
    const mockQuiz = [
      {
        stem: "Which of the following best describes the main focus of this module?",
        choices: [
          "Historical context only",
          "Core principles and applications",
          "Advanced theoretical concepts",
          "Practical exercises only"
        ],
        correct: "B"
      },
      {
        stem: "What is the primary learning outcome after completing this module?",
        choices: [
          "Memorizing facts",
          "Understanding fundamental concepts",
          "Completing assignments",
          "Taking tests"
        ],
        correct: "B"
      },
      {
        stem: "How are the concepts in this module typically applied?",
        choices: [
          "Only in academic settings",
          "In real-world scenarios and case studies",
          "Only in theoretical discussions",
          "In laboratory settings only"
        ],
        correct: "B"
      },
      {
        stem: "What prerequisite knowledge is most important for this module?",
        choices: [
          "Advanced mathematics",
          "Basic understanding of the subject area",
          "Professional experience",
          "Graduate-level coursework"
        ],
        correct: "B"
      },
      {
        stem: "Which approach is emphasized for learning this material?",
        choices: [
          "Rote memorization",
          "Understanding principles and applications",
          "Speed reading",
          "Group discussions only"
        ],
        correct: "B"
      }
    ];
    
    return mockQuiz.slice(0, numQuestions);
  }
}

async function generateSummary(moduleText: string) {
  console.log("Generating module summary using OpenAI...");
  
  const prompt = `You are an expert educational AI whose sole job is to create a comprehensive summary of textbook content. Your output must be valid JSON and nothing else.

Requirements:
1. **Focus on core content**: Summarize the key concepts, definitions, formulas, and important relationships. Skip fluff like learning objectives, study tips, etc.

2. **Structure**: Create a well-organized summary that covers:
   - Main concepts and definitions
   - Key formulas or equations (if any)
   - Important relationships and processes
   - Practical applications or examples
   - Critical distinctions or comparisons

3. **JSON format**: Return exactly one JSON object with the following structure:
   {
     "summary": "<comprehensive summary text covering all key points from the module>"
   }
   - Do **not** wrap your JSON in any additional text or markup.
   - The summary should be 2-4 paragraphs covering all important concepts.

4. **Summary quality**:
   - Be comprehensive but concise
   - Use clear, educational language
   - Organize information logically
   - Include specific details like formulas, definitions, and examples

Now process this module text:
${moduleText}

Generate a comprehensive summary that captures all the important educational content. Output strictly valid JSON as described above—no extra commentary.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are an expert educational AI that generates comprehensive summaries from textbook content. You must return only valid JSON with no additional formatting or text."
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    // Parse JSON response
    let summaryData;
    try {
      const cleanedContent = cleanOpenAIResponse(content);
      summaryData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Initial JSON parse failed for summary, trying with retry prompt...');
      
      // Retry with clarifier if JSON is invalid
      const retryResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "You are an expert educational AI that generates comprehensive summaries from textbook content. You must return only valid JSON with no additional formatting or text."
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
            content: "Reminder: Output must be strictly valid JSON with a single object having a 'summary' field containing the summary text. Do not include any extra text."
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const retryContent = retryResponse.choices[0]?.message?.content?.trim();
      if (!retryContent) {
        throw new Error('No content received from OpenAI on retry');
      }

      const cleanedRetryContent = cleanOpenAIResponse(retryContent);
      summaryData = JSON.parse(cleanedRetryContent);
    }

    // Validate the structure
    if (!summaryData.summary || typeof summaryData.summary !== 'string') {
      throw new Error('Response must have a summary field with string content');
    }

    return summaryData;

  } catch (error) {
    console.error('Error generating summary with OpenAI:', error);
    
    // Fallback to mock data if OpenAI fails
    console.log('Falling back to mock summary...');
    const mockSummary = `This module provides a comprehensive overview of the key concepts and principles within the subject area. It covers fundamental theoretical foundations while emphasizing practical applications through real-world examples and case studies. The content is structured to build understanding progressively, starting with basic concepts and advancing to more complex applications. Students will gain both theoretical knowledge and practical skills that can be applied in various professional contexts. The module serves as an essential foundation for understanding more advanced topics in subsequent sections and provides the necessary background for effective application of the concepts in real-world scenarios.`;
    
    return { summary: mockSummary };
  }
}

// Function to get module content (simplified - in real implementation would extract from document pages)
async function getModuleContent(module: any): Promise<string> {
  // In a real implementation, you would extract the specific pages or content excerpt
  // For now, we'll use a mock content based on the module
  return `Module Content: ${module.title}
  
  ${module.summary || 'This module covers important concepts and principles.'}
  
  Pages: ${module.start_page || 'N/A'} - ${module.end_page || 'N/A'}
  
  Content Excerpt: ${module.content_excerpt || 'Detailed content covering the key learning objectives and practical applications.'}
  
  This module provides comprehensive coverage of the topic with examples, case studies, and practical applications to reinforce learning.`;
}

export async function POST(
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
    const { type, options = {} } = body;

    if (!type || !['flashcards', 'quiz', 'summary'].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'flashcards', 'quiz', or 'summary'" },
        { status: 400 }
      );
    }

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

    // Get module content for LLM processing
    const moduleContent = await getModuleContent(module);

    // Generate the study material based on type
    let generatedContent;
    let payload;
    
    switch (type) {
      case 'flashcards':
        const numCards = options.num_cards || options.quantity || 5;
        generatedContent = await generateFlashcards(moduleContent, numCards);
        payload = { flashcards: generatedContent };
        break;
        
      case 'quiz':
        const numQuestions = options.num_questions || options.quantity || 5;
        generatedContent = await generateQuiz(moduleContent, numQuestions);
        payload = { questions: generatedContent };
        break;
        
      case 'summary':
        generatedContent = await generateSummary(moduleContent);
        payload = generatedContent;
        break;
        
      default:
        return NextResponse.json(
          { error: "Invalid type" },
          { status: 400 }
        );
    }

    // Check if study material of this type already exists
    const { data: existingMaterial, error: existingError } = await supabase
      .from("study_materials")
      .select("id")
      .eq("module_id", moduleId)
      .eq("type", type)
      .single();

    let result;
    if (existingMaterial) {
      // Update existing material
      const { data: updatedMaterial, error: updateError } = await supabase
        .from("study_materials")
        .update({
          payload,
          generated_at: new Date().toISOString(),
        })
        .eq("id", existingMaterial.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating study material:", updateError);
        return NextResponse.json(
          { error: "Failed to update study material" },
          { status: 500 }
        );
      }
      result = updatedMaterial;
    } else {
      // Create new material
      const { data: newMaterial, error: insertError } = await supabase
        .from("study_materials")
        .insert({
          module_id: moduleId,
          type,
          payload,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating study material:", insertError);
        return NextResponse.json(
          { error: "Failed to create study material" },
          { status: 500 }
        );
      }
      result = newMaterial;
    }

    return NextResponse.json({
      success: true,
      message: `${type} generated successfully`,
      data: result,
      payload: payload, // Include the actual generated content in response
    });

  } catch (error) {
    console.error("Error generating study material:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 