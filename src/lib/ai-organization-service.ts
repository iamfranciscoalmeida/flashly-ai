import { openai } from './openai-config';
import { createClient } from '@/supabase/client';
import { SmartCollection, CollectionItem, EnhancedFlashcard, EnhancedQuiz } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ContentAnalysisResult {
  subject: string;
  topic: string;
  subjects: Array<{
    name: string;
    confidence: number;
    color_theme: string;
    icon: string;
  }>;
  suggested_groupings: Array<{
    title: string;
    subject: string;
    topic: string;
    item_ids: string[];
    confidence: number;
    reasoning: string;
  }>;
}

export interface OrganizationOptions {
  mode: 'auto' | 'manual';
  merge_similar: boolean;
  confidence_threshold: number;
  max_collections: number;
}

// Subject mapping for themes and icons
const SUBJECT_THEMES = {
  'Mathematics': { color: 'blue', icon: 'calculator' },
  'Science': { color: 'green', icon: 'flask' },
  'Biology': { color: 'emerald', icon: 'dna' },
  'Chemistry': { color: 'purple', icon: 'flask' },
  'Physics': { color: 'indigo', icon: 'atom' },
  'History': { color: 'amber', icon: 'scroll' },
  'Literature': { color: 'rose', icon: 'book-open' },
  'Language': { color: 'pink', icon: 'languages' },
  'Computer Science': { color: 'slate', icon: 'computer' },
  'Business': { color: 'orange', icon: 'briefcase' },
  'Art': { color: 'violet', icon: 'palette' },
  'Music': { color: 'cyan', icon: 'music' },
  'Medicine': { color: 'red', icon: 'heart-pulse' },
  'Engineering': { color: 'gray', icon: 'cog' },
  'Law': { color: 'stone', icon: 'scale' },
  'Psychology': { color: 'teal', icon: 'brain' },
  'Philosophy': { color: 'neutral', icon: 'thinking' },
  'General': { color: 'blue', icon: 'book' }
} as const;

export class AIOrganizationService {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  /**
   * Analyze all user content and create smart collections
   */
  async organizeUserContent(
    userId: string, 
    options: Partial<OrganizationOptions> = {}
  ): Promise<{
    collections: SmartCollection[];
    items_organized: number;
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('🚀 Starting AI organization for user:', userId);
      
      const defaultOptions: OrganizationOptions = {
        mode: 'auto',
        merge_similar: true,
        confidence_threshold: 0.5,
        max_collections: 20,
        ...options
      };

      console.log('⚙️ Organization options:', defaultOptions);

      // 1. Fetch all user's study content
      const userContent = await this.fetchUserContent(userId);
      console.log('📚 Fetched content items:', userContent.length);
      
      if (userContent.length === 0) {
        console.log('⚠️ No content found to organize');
        return {
          collections: [],
          items_organized: 0,
          success: true,
          error: 'No content found to organize'
        };
      }

      console.log('🤖 Analyzing content with AI...');
      // 2. Analyze content with AI
      const analysisResult = await this.analyzeContent(userContent);
      console.log('📊 AI analysis result:', {
        subjects: analysisResult.subjects.length,
        groupings: analysisResult.suggested_groupings.length
      });

      // 3. Create collections based on analysis
      console.log('🏗️ Creating collections...');
      const collections = await this.createCollections(
        userId, 
        analysisResult, 
        defaultOptions
      );
      console.log('✅ Created collections:', collections.length);

      // 4. Organize items into collections
      console.log('📋 Organizing items into collections...');
      const itemsOrganized = await this.organizeItems(
        userId,
        collections,
        analysisResult.suggested_groupings,
        userContent
      );
      console.log('🎯 Items organized:', itemsOrganized);

      return {
        collections,
        items_organized: itemsOrganized,
        success: true
      };
    } catch (error) {
      console.error('❌ Error organizing user content:', error);
      return {
        collections: [],
        items_organized: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Fetch all user's study materials
   */
  private async fetchUserContent(userId: string) {
    console.log('📥 Fetching user content for:', userId);
    
    const [flashcards, quizzes, documents] = await Promise.all([
      // Fetch flashcards
      this.supabase
        .from('flashcards')
        .select('id, question, answer, document_id, module_id, tags, difficulty_level')
        .eq('user_id', userId),
      
      // Fetch quizzes
      this.supabase
        .from('quizzes')
        .select('id, question, options, correct, document_id, module_id, tags, difficulty_level')
        .eq('user_id', userId),
      
      // Fetch documents
      this.supabase
        .from('documents')
        .select('id, file_name, extracted_text, source_type')
        .eq('user_id', userId)
    ]);

    console.log('📊 Content counts:', {
      flashcards: flashcards.data?.length || 0,
      quizzes: quizzes.data?.length || 0,
      documents: documents.data?.length || 0
    });

    const content: any[] = [];

    // Process flashcards
    if (flashcards.data) {
      content.push(...flashcards.data.map((item: any) => ({
        id: item.id,
        type: 'flashcard' as const,
        content: `${item.question} ${item.answer}`,
        source_id: item.document_id || item.module_id,
        source_type: 'document_upload' as const,
        tags: item.tags || [],
        difficulty: item.difficulty_level
      })));
    }

    // Process quizzes
    if (quizzes.data) {
      content.push(...quizzes.data.map((item: any) => ({
        id: item.id,
        type: 'quiz' as const,
        content: `${item.question} ${item.options.join(' ')}`,
        source_id: item.document_id || item.module_id,
        source_type: 'document_upload' as const,
        tags: item.tags || [],
        difficulty: item.difficulty_level
      })));
    }

    // Process documents
    if (documents.data) {
      content.push(...documents.data.map((item: any) => ({
        id: item.id,
        type: 'document' as const,
        content: `${item.file_name} ${item.extracted_text?.substring(0, 1000) || ''}`,
        source_id: item.id,
        source_type: 'document_upload' as const,
        tags: [],
        difficulty: null
      })));
    }

    console.log('✅ Total content items processed:', content.length);
    return content;
  }

  /**
   * Analyze content using AI to determine subjects and groupings
   */
  private async analyzeContent(content: any[]): Promise<ContentAnalysisResult> {
    // Process more items to capture full content diversity
    const contentSample = content
      .slice(0, Math.min(100, content.length)) // Increased from 30 to 100
      .map(item => ({
        id: item.id,
        type: item.type,
        content: item.content.substring(0, 200), // Increased content length
        tags: item.tags
      }));

    console.log('🔍 Analyzing content sample:', contentSample.length, 'items');

    const prompt = `
      You are an expert educational content organizer. Given a large set of study materials (flashcards, quizzes, documents), your task is to:
      
      1. Identify 3-5 broad academic subjects that cover all items (e.g., Mathematics, Biology, Physics, History, Literature, Computer Science).
        • Use only the following available subjects: ${Object.keys(SUBJECT_THEMES).join(', ')}.
        • For each subject, assign:
          - “confidence”: a number between 0.0 and 1.0 indicating how strongly the sample items map to that subject.
          - “color_theme” and “icon” by choosing one of the values defined in your SUBJECT_THEMES mapping (colors: ${Array.from(new Set(Object.values(SUBJECT_THEMES).map(t => t.color))).join(', ')}; icons: ${Array.from(new Set(Object.values(SUBJECT_THEMES).map(t => t.icon))).join(', ')}).
      
      2. Create 3-5 “suggested_groupings.” Each grouping must:
        • Be tied to one of the broad subjects above.
        • Have a “title” that describes the core theme (e.g., “Calculus Basics,” “World War II Overview”).
        • Contain multiple related items drawn from the sample. 
        • Specify “item_ids” (array of IDs) from the sample that fit together.
        • Include a “confidence” score (0.0-1.0) for how well these items form a coherent group.
        • Add a brief “reasoning” sentence or two explaining why these items belong together.  
        • Use these field names exactly: title, subject, topic, item_ids, confidence, reasoning.
      
      3. Assume the full dataset (content.length = ${content.length}) looks similar to this sample of ${contentSample.length} items:
      ${JSON.stringify(contentSample, null, 2)}
      
      4. Return a single JSON object with this structure (no additional text outside the JSON block):
      \`\`\`json
      {
        "subject":       "<the single most common broad subject, string>",
        "topic":         "<general academic theme covering most content, string>",
        "subjects": [    // array of all detected broad subjects
          {
            "name":         "Mathematics",
            "confidence":   0.85,
            "color_theme":  "blue",
            "icon":         "calculator"
          }
          // … up to 5 subjects total
        ],
        "suggested_groupings": [   // array of 3-5 grouping objects
          {
            "title":      "Mathematics Fundamentals",
            "subject":    "Mathematics",
            "topic":      "General Mathematics",
            "item_ids":   ["item1", "item2", "item3"],
            "confidence": 0.90,
            "reasoning":  "These items all cover basic algebra and arithmetic operations."
          }
          // … additional groupings
        ]
      }
      \`\`\`
      
      Remember:
      - Focus strictly on BROAD academic subjects at a high-school/university level.
      - Cover **all** items in the dataset, not just a subset.
      - Use only the available color_theme/icon values from SUBJECT_THEMES.
      - Choose 3-5 subjects and 3-5 groupings.
      `;
    

    try {
      console.log('🤖 Calling OpenAI for content analysis...');
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert educational content organizer specializing in creating broad, comprehensive subject categories. Focus on university-level academic subjects that can encompass diverse content."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2 // Lower temperature for more consistent categorization
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      console.log('✅ AI analysis completed');
      
      // Validate and enhance the response
      return this.validateAnalysisResult(result, content);
    } catch (error) {
      console.error('❌ Error analyzing content with AI:', error);
      // Fallback to basic organization
      console.log('🔄 Using fallback organization');
      return this.fallbackOrganization(content);
    }
  }

  /**
   * Validate and enhance AI analysis result
   */
  private validateAnalysisResult(result: any, content: any[]): ContentAnalysisResult {
    console.log('🔍 Validating AI analysis result...');
    
    // Ensure all required fields exist
    const validatedResult: ContentAnalysisResult = {
      subject: result.subject || 'General',
      topic: result.topic || 'Mixed Topics',
      subjects: [],
      suggested_groupings: []
    };

    // Validate subjects
    if (result.subjects && Array.isArray(result.subjects)) {
      validatedResult.subjects = result.subjects.map((subject: any) => ({
        name: subject.name || 'General',
        confidence: Math.min(Math.max(subject.confidence || 0.5, 0), 1),
        color_theme: SUBJECT_THEMES[subject.name as keyof typeof SUBJECT_THEMES]?.color || 'blue',
        icon: SUBJECT_THEMES[subject.name as keyof typeof SUBJECT_THEMES]?.icon || 'book'
      }));
    }

    // Validate groupings
    if (result.suggested_groupings && Array.isArray(result.suggested_groupings)) {
      validatedResult.suggested_groupings = result.suggested_groupings
        .filter((group: any) => group.item_ids && group.item_ids.length > 0)
        .map((group: any) => ({
          title: group.title || 'Unnamed Collection',
          subject: group.subject || 'General',
          topic: group.topic || '',
          item_ids: group.item_ids.filter((id: string) => 
            content.find(item => item.id === id)
          ),
          confidence: Math.min(Math.max(group.confidence || 0.5, 0), 1),
          reasoning: group.reasoning || 'Items grouped by similarity'
        }))
        .filter((group: any) => group.item_ids.length > 0); // Only keep groups with valid items
    }

    const totalItemsInGroupings = validatedResult.suggested_groupings.reduce((sum, group) => sum + group.item_ids.length, 0);
    const coveragePercentage = Math.round((totalItemsInGroupings / content.length) * 100);

    console.log('✅ Validation complete:', {
      subjects: validatedResult.subjects.length,
      groupings: validatedResult.suggested_groupings.length,
      totalItems: content.length,
      itemsInGroupings: totalItemsInGroupings,
      coverage: `${coveragePercentage}%`
    });

    // If coverage is low, enhance with additional intelligent grouping
    if (coveragePercentage < 80) {
      console.log('⚠️ Low coverage detected, enhancing with intelligent grouping...');
      return this.enhanceWithIntelligentGrouping(validatedResult, content);
    }

    return validatedResult;
  }

  /**
   * Enhance AI result with intelligent grouping for uncategorized items
   */
  private enhanceWithIntelligentGrouping(result: ContentAnalysisResult, content: any[]): ContentAnalysisResult {
    console.log('🔧 Enhancing AI result with intelligent grouping...');
    
    // Find items not yet categorized
    const categorizedIds = new Set(result.suggested_groupings.flatMap(g => g.item_ids));
    const uncategorizedItems = content.filter(item => !categorizedIds.has(item.id));
    
    console.log(`📊 Found ${uncategorizedItems.length} uncategorized items out of ${content.length} total`);
    
    if (uncategorizedItems.length === 0) {
      return result;
    }

    // Use fallback organization for uncategorized items
    const fallbackResult = this.fallbackOrganization(uncategorizedItems);
    
    // Merge results
    const enhancedResult: ContentAnalysisResult = {
      ...result,
      subjects: [...result.subjects, ...fallbackResult.subjects],
      suggested_groupings: [...result.suggested_groupings, ...fallbackResult.suggested_groupings]
    };

    const totalItemsAfterEnhancement = enhancedResult.suggested_groupings.reduce((sum, group) => sum + group.item_ids.length, 0);
    const finalCoverage = Math.round((totalItemsAfterEnhancement / content.length) * 100);

    console.log('✅ Enhancement complete:', {
      finalCoverage: `${finalCoverage}%`,
      totalGroupings: enhancedResult.suggested_groupings.length,
      totalItemsOrganized: totalItemsAfterEnhancement
    });

    return enhancedResult;
  }

  /**
   * Fallback organization when AI fails
   */
  private fallbackOrganization(content: any[]): ContentAnalysisResult {
    console.log('🔄 Using fallback organization method');
    
    // Create broad subject-based groupings
    const subjectGroups: { [key: string]: any[] } = {
      'Mathematics': [],
      'Science': [],
      'Computer Science': [],
      'Literature': [],
      'History': [],
      'General': []
    };
    
    // Intelligent categorization based on content analysis
    content.forEach(item => {
      const contentLower = item.content.toLowerCase();
      const tags = item.tags || [];
      
      let assigned = false;
      
      // Check for mathematical content
      if (contentLower.match(/\b(math|equation|formula|calculate|algebra|geometry|function|derivative|integral|theorem|proof)\b/) || 
          tags.some((tag: string) => tag.toLowerCase().includes('math'))) {
        subjectGroups['Mathematics'].push(item);
        assigned = true;
      }
      // Check for science content
      else if (contentLower.match(/\b(science|physics|chemistry|biology|experiment|hypothesis|theory|research|lab|scientific)\b/) ||
               tags.some((tag: string) => ['science', 'physics', 'chemistry', 'biology'].includes(tag.toLowerCase()))) {
        subjectGroups['Science'].push(item);
        assigned = true;
      }
      // Check for computer science content
      else if (contentLower.match(/\b(programming|code|algorithm|software|computer|data|database|web|application|tech)\b/) ||
               tags.some((tag: string) => ['programming', 'coding', 'tech', 'computer'].includes(tag.toLowerCase()))) {
        subjectGroups['Computer Science'].push(item);
        assigned = true;
      }
      // Check for literature content
      else if (contentLower.match(/\b(literature|novel|poem|author|character|plot|theme|literary|book|writing)\b/) ||
               tags.some((tag: string) => ['literature', 'english', 'writing'].includes(tag.toLowerCase()))) {
        subjectGroups['Literature'].push(item);
        assigned = true;
      }
      // Check for history content
      else if (contentLower.match(/\b(history|historical|century|ancient|war|civilization|empire|revolution|political)\b/) ||
               tags.some((tag: string) => ['history', 'historical'].includes(tag.toLowerCase()))) {
        subjectGroups['History'].push(item);
        assigned = true;
      }
      
      // If not assigned to a specific category, put in General
      if (!assigned) {
        subjectGroups['General'].push(item);
      }
    });

    // Only keep groups that have items
    const activeGroups = Object.entries(subjectGroups).filter(([_, items]) => items.length > 0);

    const subjects = activeGroups.map(([subject, items]) => ({
      name: subject,
      confidence: 0.7,
      color_theme: SUBJECT_THEMES[subject as keyof typeof SUBJECT_THEMES]?.color || 'blue',
      icon: SUBJECT_THEMES[subject as keyof typeof SUBJECT_THEMES]?.icon || 'book'
    }));

    const suggested_groupings = activeGroups.map(([subject, items]) => ({
      title: `${subject} Collection`,
      subject: subject,
      topic: 'General',
      item_ids: items.map(item => item.id),
      confidence: 0.7,
      reasoning: `Content categorized as ${subject} based on keywords and context analysis`
    }));

    console.log('🔄 Fallback organization created:', {
      subjects: subjects.length,
      groupings: suggested_groupings.length,
      totalItems: suggested_groupings.reduce((sum, group) => sum + group.item_ids.length, 0)
    });

    return {
      subject: subjects[0]?.name || 'General',
      topic: 'Academic Content',
      subjects,
      suggested_groupings
    };
  }

  /**
   * Create smart collections based on analysis
   */
  private async createCollections(
    userId: string,
    analysis: ContentAnalysisResult,
    options: OrganizationOptions
  ): Promise<SmartCollection[]> {
    console.log('🏗️ Creating collections with options:', options);
    
    const collections: SmartCollection[] = [];

    // Filter groupings by confidence threshold
    const validGroupings = analysis.suggested_groupings
      .filter(group => group.confidence >= options.confidence_threshold)
      .slice(0, options.max_collections);

    console.log(`📋 Creating ${validGroupings.length} collections from ${analysis.suggested_groupings.length} suggested groupings`);

    for (const grouping of validGroupings) {
      const theme = SUBJECT_THEMES[grouping.subject as keyof typeof SUBJECT_THEMES] || 
                   SUBJECT_THEMES.General;

      try {
        console.log(`➕ Creating collection: "${grouping.title}"`);
        
        const { data, error } = await this.supabase
          .from('smart_collections')
          .insert({
            user_id: userId,
            title: grouping.title,
            subject: grouping.subject,
            topic: grouping.topic,
            color_theme: theme.color,
            subject_icon: theme.icon,
            ai_confidence_score: grouping.confidence,
            auto_organized: true
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating collection:', error);
          continue;
        }

        console.log(`✅ Created collection: ${data.id}`);
        collections.push(data);
      } catch (error) {
        console.error('❌ Error creating collection:', error);
      }
    }

    return collections;
  }

  /**
   * Organize items into collections
   */
  private async organizeItems(
    userId: string,
    collections: SmartCollection[],
    groupings: ContentAnalysisResult['suggested_groupings'],
    userContent: any[]
  ): Promise<number> {
    console.log('📋 Organizing items into collections...');
    
    let itemsOrganized = 0;

    for (const collection of collections) {
      const grouping = groupings.find(g => g.title === collection.title);
      if (!grouping) {
        console.log(`⚠️ No grouping found for collection: ${collection.title}`);
        continue;
      }

      console.log(`📦 Organizing ${grouping.item_ids.length} items into "${collection.title}"`);

      const collectionItems = grouping.item_ids.map(itemId => {
        const contentItem = userContent.find(item => item.id === itemId);
        return {
          collection_id: collection.id,
          item_type: contentItem?.type || 'flashcard',
          item_id: itemId,
          source_type: 'document_upload' as const,
          relevance_score: grouping.confidence
        };
      });

      try {
        const { error } = await this.supabase
          .from('collection_items')
          .insert(collectionItems);

        if (error) {
          console.error('❌ Error organizing items:', error);
        } else {
          itemsOrganized += collectionItems.length;
          console.log(`✅ Organized ${collectionItems.length} items into "${collection.title}"`);
        }
      } catch (error) {
        console.error('❌ Error organizing items:', error);
      }
    }

    return itemsOrganized;
  }

  /**
   * Get collections with stats for a user
   */
  async getCollectionsWithStats(userId: string): Promise<any[]> {
    try {
      console.log('📊 Fetching collections with stats for user:', userId);
      
      const { data, error } = await this.supabase
        .from('smart_collections')
        .select(`
          *,
          collection_items (
            id,
            item_type
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const collectionsWithStats = (data || []).map(collection => ({
        ...collection,
        flashcard_count: collection.collection_items?.filter((item: any) => item.item_type === 'flashcard').length || 0,
        quiz_count: collection.collection_items?.filter((item: any) => item.item_type === 'quiz').length || 0,
        document_count: collection.collection_items?.filter((item: any) => item.item_type === 'document').length || 0,
        chat_content_count: collection.collection_items?.filter((item: any) => item.item_type === 'chat_content').length || 0,
        total_items: collection.collection_items?.length || 0
      }));

      console.log('✅ Fetched collections:', collectionsWithStats.length);
      return collectionsWithStats;
    } catch (error) {
      console.error('❌ Error fetching collections with stats:', error);
      return [];
    }
  }
}

export const aiOrganizationService = new AIOrganizationService(); 