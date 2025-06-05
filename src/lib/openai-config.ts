import OpenAI from 'openai';

// Validate API key
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('❌ OPENAI_API_KEY is not set');
  throw new Error('OPENAI_API_KEY environment variable is required');
}

if (!apiKey.startsWith('sk-')) {
  console.error('❌ OPENAI_API_KEY appears to be invalid (should start with sk-)');
  throw new Error('OPENAI_API_KEY appears to be invalid');
}

// Create OpenAI instance with better configuration
export const openai = new OpenAI({
  apiKey,
  timeout: 60000, // 60 seconds timeout
  maxRetries: 3, // Retry failed requests up to 3 times
  defaultHeaders: {
    'User-Agent': 'StudyWithAI/1.0',
  },
});

// Enhanced wrapper function with better error handling
export async function callOpenAIWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`🤖 OpenAI API attempt ${attempt}/${maxRetries + 1}`);
      return await fn();
    } catch (error: any) {
      lastError = error;
      console.error(`❌ OpenAI API attempt ${attempt} failed:`, error.message);
      
      // Don't retry on certain errors
      if (
        error.status === 401 || // Invalid API key
        error.status === 403 || // Forbidden
        error.status === 400 || // Bad request
        error.message?.includes('Invalid API key') ||
        attempt === maxRetries + 1 // Last attempt
      ) {
        throw error;
      }
      
      // Wait before retrying
      if (attempt <= maxRetries) {
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError!;
}

// Test function to validate connection
export async function testOpenAIConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing OpenAI connection...');
    const response = await callOpenAIWithRetry(() =>
      openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hello, this is a connection test. Please respond with "OK".' }
        ],
        max_tokens: 5,
        temperature: 0,
      })
    );
    
    const content = response.choices[0]?.message?.content;
    console.log('✅ OpenAI connection test successful:', content);
    return true;
  } catch (error: any) {
    console.error('❌ OpenAI connection test failed:', error.message);
    return false;
  }
}

// Enhanced completion function with better error handling
export async function createChatCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    [key: string]: any;
  } = {}
): Promise<string> {
  const {
    model = 'gpt-4-turbo-preview',
    temperature = 0.7,
    max_tokens = 2000,
    ...otherOptions
  } = options;

  try {
    const response = await callOpenAIWithRetry(() =>
      openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens,
        ...otherOptions,
      })
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    return content;
  } catch (error: any) {
    console.error('❌ OpenAI chat completion failed:', error);
    
    // Provide more specific error messages
    if (error.status === 401) {
      throw new Error('OpenAI API key is invalid or expired');
    } else if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    } else if (error.status === 503) {
      throw new Error('OpenAI API is temporarily unavailable. Please try again later.');
    } else if (error.code === 'ECONNRESET' || error.message?.includes('Connection error')) {
      throw new Error('Network connection failed. Please check your internet connection and try again.');
    } else {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
}

export default openai; 