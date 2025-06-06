import { ConversationState } from './ConversationStateMachine';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Mic, Bot, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationStatusProps {
  state: ConversationState;
  transcript: string;
  aiResponse: string;
  confidence: number;
  className?: string;
}

export function ConversationStatus({
  state,
  transcript,
  aiResponse,
  confidence,
  className
}: ConversationStatusProps) {
  const getStateIcon = () => {
    switch (state) {
      case ConversationState.IDLE:
        return null;
      case ConversationState.LISTENING:
      case ConversationState.RECORDING:
        return <Mic className="h-4 w-4" />;
      case ConversationState.PROCESSING:
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case ConversationState.SPEAKING:
        return <Bot className="h-4 w-4" />;
      case ConversationState.ERROR:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case ConversationState.TIMEOUT:
        return <XCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStateBadgeVariant = () => {
    switch (state) {
      case ConversationState.IDLE:
        return 'secondary';
      case ConversationState.LISTENING:
        return 'default';
      case ConversationState.RECORDING:
        return 'destructive';
      case ConversationState.PROCESSING:
      case ConversationState.SPEAKING:
        return 'default';
      case ConversationState.ERROR:
        return 'destructive';
      case ConversationState.TIMEOUT:
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* State indicator */}
      <div className="flex items-center gap-2">
        <Badge variant={getStateBadgeVariant()} className="flex items-center gap-1">
          {getStateIcon()}
          <span className="text-xs font-medium capitalize">
            {state.replace('_', ' ')}
          </span>
        </Badge>
        
        {/* Confidence indicator */}
        {confidence > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Confidence:</span>
            <Progress value={confidence * 100} className="w-20 h-2" />
            <span>{Math.round(confidence * 100)}%</span>
          </div>
        )}
      </div>

      {/* Live transcript */}
      {transcript && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-2">
              <Mic className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                You
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {transcript}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* AI response */}
      {aiResponse && (
        <Card className="p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-2">
              <Bot className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                AI Tutor
              </p>
              <p className="text-sm text-green-800 dark:text-green-200">
                {aiResponse}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

interface SimpleConversationStatusProps {
  isActive: boolean;
  message?: string;
  className?: string;
}

export function SimpleConversationStatus({
  isActive,
  message,
  className
}: SimpleConversationStatusProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "w-2 h-2 rounded-full transition-colors",
        isActive ? "bg-green-500 animate-pulse" : "bg-gray-300"
      )} />
      <span className="text-sm text-muted-foreground">
        {message || (isActive ? 'Active' : 'Inactive')}
      </span>
    </div>
  );
}