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
    subtitle: 'Join the waitlist and be first to try StudyWithAI - the revolutionary platform that transforms PDFs into engaging video lessons and provides AI-powered tutoring.',
    successMessage: 'Thanks! You\'re now on our waitlist. We\'ll notify you as soon as we launch!',
    features: [
      'AI-generated flashcards from your documents',
      'Voice AI tutor for interactive learning',
      'PDF to video transformation technology',
      'Smart quizzes tailored to your content',
      'Spaced repetition learning system'
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

// Utility function to check waitlist mode and return appropriate response
export function checkWaitlistMode() {
  if (config.isWaitlistMode) {
    return {
      isWaitlistMode: true,
      response: new Response(
        JSON.stringify({
          error: "Service unavailable - We're in waitlist mode. Join our waitlist to be notified when we launch!",
          code: "WAITLIST_MODE_ACTIVE",
          waitlistUrl: "/",
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    };
  }
  
  return {
    isWaitlistMode: false,
    response: null
  };
} 