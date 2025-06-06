import { useCallback, useEffect, useRef, useState } from 'react';

export enum ConversationState {
  IDLE = 'idle',
  LISTENING = 'listening',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  SPEAKING = 'speaking',
  ERROR = 'error',
  TIMEOUT = 'timeout'
}

export interface ConversationContext {
  currentState: ConversationState;
  sessionId: string;
  isActive: boolean;
  lastActivity: number;
  errorCount: number;
  autoRestart: boolean;
}

interface StateTransition {
  from: ConversationState;
  to: ConversationState;
  condition?: () => boolean;
}

interface UseConversationStateMachineProps {
  sessionId: string;
  autoRestart?: boolean;
  timeoutDuration?: number;
  onStateChange?: (state: ConversationState) => void;
  onTimeout?: () => void;
  onError?: (error: Error) => void;
}

export function useConversationStateMachine({
  sessionId,
  autoRestart = true,
  timeoutDuration = 30000,
  onStateChange,
  onTimeout,
  onError
}: UseConversationStateMachineProps) {
  const [context, setContext] = useState<ConversationContext>({
    currentState: ConversationState.IDLE,
    sessionId,
    isActive: false,
    lastActivity: Date.now(),
    errorCount: 0,
    autoRestart
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorRetryRef = useRef<NodeJS.Timeout | null>(null);

  // Valid state transitions
  const validTransitions: StateTransition[] = [
    { from: ConversationState.IDLE, to: ConversationState.LISTENING },
    { from: ConversationState.LISTENING, to: ConversationState.RECORDING },
    { from: ConversationState.RECORDING, to: ConversationState.PROCESSING },
    { from: ConversationState.PROCESSING, to: ConversationState.SPEAKING },
    { from: ConversationState.SPEAKING, to: ConversationState.LISTENING },
    { from: ConversationState.LISTENING, to: ConversationState.IDLE },
    { from: ConversationState.ERROR, to: ConversationState.IDLE },
    { from: ConversationState.TIMEOUT, to: ConversationState.IDLE }
  ];

  // Check if transition is valid
  const isValidTransition = useCallback((from: ConversationState, to: ConversationState) => {
    return validTransitions.some(t => t.from === from && t.to === to);
  }, []);

  // Reset timeout
  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (context.isActive && context.currentState !== ConversationState.IDLE) {
      timeoutRef.current = setTimeout(() => {
        transitionTo(ConversationState.TIMEOUT);
        onTimeout?.();
      }, timeoutDuration);
    }
  }, [context.isActive, context.currentState, timeoutDuration, onTimeout]);

  // Update last activity
  const updateActivity = useCallback(() => {
    setContext(prev => ({
      ...prev,
      lastActivity: Date.now()
    }));
    resetTimeout();
  }, [resetTimeout]);

  // Transition to new state
  const transitionTo = useCallback((newState: ConversationState) => {
    setContext(prev => {
      if (!isValidTransition(prev.currentState, newState)) {
        console.warn(`Invalid transition from ${prev.currentState} to ${newState}`);
        return prev;
      }

      const updatedContext = {
        ...prev,
        currentState: newState,
        lastActivity: Date.now(),
        isActive: newState !== ConversationState.IDLE && newState !== ConversationState.ERROR
      };

      // Handle auto-restart for speaking to listening transition
      if (newState === ConversationState.LISTENING && prev.currentState === ConversationState.SPEAKING) {
        if (!prev.autoRestart) {
          return { ...updatedContext, currentState: ConversationState.IDLE, isActive: false };
        }
      }

      return updatedContext;
    });

    updateActivity();
    onStateChange?.(newState);
  }, [isValidTransition, updateActivity, onStateChange]);

  // Handle errors
  const handleError = useCallback((error: Error) => {
    setContext(prev => ({
      ...prev,
      errorCount: prev.errorCount + 1,
      currentState: ConversationState.ERROR
    }));

    onError?.(error);

    // Auto-retry logic with exponential backoff
    const retryDelay = Math.min(1000 * Math.pow(2, context.errorCount), 10000);
    
    if (errorRetryRef.current) {
      clearTimeout(errorRetryRef.current);
    }

    errorRetryRef.current = setTimeout(() => {
      if (context.errorCount < 3) {
        transitionTo(ConversationState.IDLE);
        // Optionally auto-restart
        if (context.autoRestart) {
          setTimeout(() => transitionTo(ConversationState.LISTENING), 500);
        }
      }
    }, retryDelay);
  }, [context.errorCount, context.autoRestart, transitionTo, onError]);

  // Start conversation
  const startConversation = useCallback(() => {
    if (context.currentState === ConversationState.IDLE) {
      transitionTo(ConversationState.LISTENING);
    }
  }, [context.currentState, transitionTo]);

  // Stop conversation
  const stopConversation = useCallback(() => {
    transitionTo(ConversationState.IDLE);
    setContext(prev => ({ ...prev, isActive: false }));
  }, [transitionTo]);

  // Reset error count on successful transition
  useEffect(() => {
    if (context.currentState === ConversationState.LISTENING && context.errorCount > 0) {
      setContext(prev => ({ ...prev, errorCount: 0 }));
    }
  }, [context.currentState, context.errorCount]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (errorRetryRef.current) {
        clearTimeout(errorRetryRef.current);
      }
    };
  }, []);

  return {
    context,
    currentState: context.currentState,
    isActive: context.isActive,
    transitionTo,
    startConversation,
    stopConversation,
    handleError,
    updateActivity
  };
}

// Helper function to get human-readable state messages
export function getStateMessage(state: ConversationState): string {
  switch (state) {
    case ConversationState.IDLE:
      return 'Ready to start';
    case ConversationState.LISTENING:
      return 'Listening for your voice...';
    case ConversationState.RECORDING:
      return 'Recording your message...';
    case ConversationState.PROCESSING:
      return 'Processing your message...';
    case ConversationState.SPEAKING:
      return 'AI is responding...';
    case ConversationState.ERROR:
      return 'An error occurred. Retrying...';
    case ConversationState.TIMEOUT:
      return 'Session timed out due to inactivity';
    default:
      return 'Unknown state';
  }
}