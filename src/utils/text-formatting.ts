/**
 * Utility functions for formatting text content
 */

/**
 * Converts literal \n sequences to actual newline characters
 * This fixes issues where AI-generated content contains escaped newlines
 * @param text - The text to format
 * @returns The formatted text with proper line breaks
 */
export function formatAIGeneratedText(text: string): string {
  if (!text) return text;
  
  return text
    // Convert literal \n to actual newlines
    .replace(/\\n/g, '\n')
    // Convert literal \t to actual tabs
    .replace(/\\t/g, '\t')
    // Clean up any double newlines to single newlines for better readability
    .replace(/\n\n\n+/g, '\n\n')
    // Trim any leading/trailing whitespace
    .trim();
}

/**
 * Formats text specifically for display in components with whitespace-pre-wrap
 * @param text - The text to format
 * @returns The formatted text ready for display
 */
export function formatForPreWrap(text: string): string {
  return formatAIGeneratedText(text);
} 