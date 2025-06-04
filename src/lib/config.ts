/**
 * Configuration utility for app-wide settings
 */

export const config = {
  /**
   * Whether the app is in waitlist mode
   * When true: hides auth buttons, shows waitlist signup, hides pricing
   * When false: shows normal auth flow and pricing
   */
  isWaitlistMode: process.env.NEXT_PUBLIC_WAITLIST_MODE === 'true',
  
  /**
   * App metadata
   */
  app: {
    name: 'StudyWithAI',
    description: 'AI-powered study companion for creating flashcards and quizzes',
  },
  
  /**
   * Waitlist configuration
   */
  waitlist: {
    title: 'Your AI Study Companion is Almost Ready',
    subtitle: 'Join the waitlist and be first to try flashcards, quizzes, and smart study sessions with AI.',
    successMessage: 'Thanks! You\'re on the waitlist!',
    features: [
      'AI-generated flashcards',
      'Smart quizzes', 
      'Spaced repetition'
    ]
  }
} as const;

/**
 * Helper function to check if we're in waitlist mode
 */
export const isWaitlistMode = () => config.isWaitlistMode;

/**
 * Helper function to get waitlist config
 */
export const getWaitlistConfig = () => config.waitlist; 