import { YoutubeTranscript } from 'youtube-transcript';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface ProcessedContent {
  text: string;
  title: string;
  auto_labels: {
    subject?: string;
    topic?: string;
    level?: string;
    keywords?: string[];
    difficulty?: string;
  };
}

export async function processYouTubeVideo(url: string): Promise<ProcessedContent> {
  try {
    // Extract video ID from URL
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Get transcript
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const text = transcript.map(item => item.text).join(' ');

    // Get video title using the transcript API (fallback method)
    const title = await getVideoTitle(videoId) || 'YouTube Video';

    // Auto-label the content
    const auto_labels = await autoLabelContent(text, title);

    return {
      text: cleanText(text),
      title,
      auto_labels,
    };
  } catch (error) {
    console.error('Error processing YouTube video:', error);
    throw new Error('Failed to process YouTube video');
  }
}

export async function processTextContent(text: string, title?: string): Promise<ProcessedContent> {
  try {
    const cleanedText = cleanText(text);
    const autoTitle = title || await generateTitleFromContent(cleanedText);
    const auto_labels = await autoLabelContent(cleanedText, autoTitle);

    return {
      text: cleanedText,
      title: autoTitle,
      auto_labels,
    };
  } catch (error) {
    console.error('Error processing text content:', error);
    throw new Error('Failed to process text content');
  }
}

export async function processPDFContent(text: string, filename: string): Promise<ProcessedContent> {
  try {
    const cleanedText = cleanText(text);
    const title = filename.replace('.pdf', '').replace(/[-_]/g, ' ');
    const auto_labels = await autoLabelContent(cleanedText, title);

    return {
      text: cleanedText,
      title,
      auto_labels,
    };
  } catch (error) {
    console.error('Error processing PDF content:', error);
    throw new Error('Failed to process PDF content');
  }
}

async function autoLabelContent(text: string, title: string): Promise<ProcessedContent['auto_labels']> {
  try {
    const prompt = `
    Analyze the following educational content and provide structured labels:

    Title: ${title}
    Content: ${text.substring(0, 2000)}...

    Please classify this content and respond with a JSON object containing:
    {
      "subject": "The main academic subject (e.g., Mathematics, Physics, History, etc.)",
      "topic": "The specific topic within the subject (e.g., Calculus, World War II, etc.)",
      "level": "The educational level (e.g., High School, College, Graduate, Professional)",
      "keywords": ["array", "of", "relevant", "keywords"],
      "difficulty": "easy, medium, or hard"
    }
    
    Respond only with the JSON object.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    try {
      return JSON.parse(result);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback to basic labels
      return {
        subject: 'General',
        topic: title,
        level: 'Unknown',
        keywords: [],
        difficulty: 'medium',
      };
    }
  } catch (error) {
    console.error('Error auto-labeling content:', error);
    return {
      subject: 'General',
      topic: title,
      level: 'Unknown',
      keywords: [],
      difficulty: 'medium',
    };
  }
}

async function generateTitleFromContent(text: string): Promise<string> {
  try {
    const prompt = `
    Generate a concise, descriptive title for this educational content (max 60 characters):
    
    ${text.substring(0, 1000)}...
    
    Respond with just the title, no quotes or extra text.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 20,
    });

    return response.choices[0]?.message?.content?.trim() || 'Study Material';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'Study Material';
  }
}

function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function getVideoTitle(videoId: string): Promise<string | null> {
  try {
    // This is a simplified approach - in production, you might want to use YouTube Data API
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    const data = await response.json();
    return data.title || null;
  } catch (error) {
    console.error('Error fetching video title:', error);
    return null;
  }
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .trim();
}

export type { ProcessedContent }; 