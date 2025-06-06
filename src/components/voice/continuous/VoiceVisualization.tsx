import { useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConversationState } from './ConversationStateMachine';

interface VoiceVisualizationProps {
  audioLevel: number;          // 0-100 volume level
  isListening: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  vadConfidence: number;       // VAD confidence level
  state?: ConversationState;
  className?: string;
}

export function VoiceVisualization({
  audioLevel,
  isListening,
  isRecording,
  isSpeaking,
  vadConfidence,
  state,
  className
}: VoiceVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Get icon based on state
  const getIcon = () => {
    if (state === ConversationState.ERROR) {
      return <AlertCircle className="h-8 w-8 text-red-500" />;
    }
    if (state === ConversationState.PROCESSING) {
      return <Loader2 className="h-8 w-8 animate-spin" />;
    }
    if (!isListening && !isRecording && !isSpeaking) {
      return <MicOff className="h-8 w-8 text-gray-400" />;
    }
    return <Mic className="h-8 w-8" />;
  };

  // Get ring colors based on state
  const getRingColor = () => {
    if (state === ConversationState.ERROR) return 'bg-red-500/20';
    if (isRecording) return 'bg-red-500/20';
    if (isSpeaking) return 'bg-green-500/20';
    if (isListening) return 'bg-blue-500/20';
    return 'bg-gray-500/20';
  };

  // Draw audio waveform
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (audioLevel > 0) {
        const bars = 32;
        const barWidth = canvas.width / bars;
        const barSpacing = 2;

        ctx.fillStyle = isRecording ? '#ef4444' : isSpeaking ? '#10b981' : '#3b82f6';
        ctx.globalAlpha = 0.8;

        for (let i = 0; i < bars; i++) {
          const variance = Math.random() * 0.5 + 0.5;
          const barHeight = (audioLevel / 100) * canvas.height * variance;
          const x = i * barWidth + barSpacing / 2;
          const y = (canvas.height - barHeight) / 2;

          ctx.fillRect(x, y, barWidth - barSpacing, barHeight);
        }
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioLevel, isRecording, isSpeaking]);

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Background rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[1, 2, 3].map((ring) => (
          <div
            key={ring}
            className={cn(
              "absolute rounded-full transition-all duration-500",
              getRingColor(),
              (isListening || isRecording || isSpeaking) && "animate-pulse"
            )}
            style={{
              width: `${60 + ring * 40}px`,
              height: `${60 + ring * 40}px`,
              opacity: Math.max(0.1, (audioLevel / 100) * 0.3 / ring)
            }}
          />
        ))}
      </div>

      {/* Waveform canvas */}
      <canvas
        ref={canvasRef}
        width={200}
        height={60}
        className="absolute inset-0 m-auto"
        style={{ width: '200px', height: '60px' }}
      />

      {/* Center icon */}
      <div className={cn(
        "relative z-10 rounded-full p-4 transition-all duration-300",
        isRecording && "bg-red-500/10 scale-110",
        isSpeaking && "bg-green-500/10",
        isListening && "bg-blue-500/10",
        state === ConversationState.ERROR && "bg-red-500/10"
      )}>
        {getIcon()}
      </div>

      {/* VAD confidence indicator */}
      {vadConfidence > 0 && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full mt-2">
          <div className="flex items-center gap-1">
            {[0.2, 0.4, 0.6, 0.8, 1].map((threshold, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 h-3 rounded-full transition-all duration-200",
                  vadConfidence >= threshold ? "bg-green-500" : "bg-gray-300"
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SimpleVoiceVisualizationProps {
  isActive: boolean;
  state?: ConversationState;
  className?: string;
}

export function SimpleVoiceVisualization({ 
  isActive, 
  state,
  className 
}: SimpleVoiceVisualizationProps) {
  return (
    <div className={cn("relative", className)}>
      <div className={cn(
        "relative rounded-full p-3 transition-all duration-300",
        isActive && "animate-pulse",
        state === ConversationState.RECORDING && "bg-red-500/20 scale-110",
        state === ConversationState.SPEAKING && "bg-green-500/20",
        state === ConversationState.LISTENING && "bg-blue-500/20",
        state === ConversationState.ERROR && "bg-red-500/20"
      )}>
        {state === ConversationState.ERROR ? (
          <AlertCircle className="h-6 w-6 text-red-500" />
        ) : state === ConversationState.PROCESSING ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : isActive ? (
          <Mic className="h-6 w-6" />
        ) : (
          <MicOff className="h-6 w-6 text-gray-400" />
        )}
      </div>
    </div>
  );
}

interface AudioLevelMeterProps {
  level: number; // 0-100
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function AudioLevelMeter({ 
  level, 
  orientation = 'horizontal',
  className 
}: AudioLevelMeterProps) {
  const bars = 10;
  const activeBarCount = Math.ceil((level / 100) * bars);

  return (
    <div className={cn(
      "flex gap-1",
      orientation === 'vertical' ? 'flex-col-reverse' : 'flex-row',
      className
    )}>
      {Array.from({ length: bars }).map((_, i) => {
        const isActive = i < activeBarCount;
        const isHigh = i >= bars * 0.7;
        const isMedium = i >= bars * 0.4;

        return (
          <div
            key={i}
            className={cn(
              "transition-all duration-100",
              orientation === 'vertical' ? 'w-2 h-1' : 'w-1 h-4',
              isActive ? (
                isHigh ? 'bg-red-500' :
                isMedium ? 'bg-yellow-500' :
                'bg-green-500'
              ) : 'bg-gray-300'
            )}
          />
        );
      })}
    </div>
  );
}