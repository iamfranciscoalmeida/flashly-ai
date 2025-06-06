'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface MicToggleProps {
  isVoiceMode: boolean
  onToggle: () => void
  isRecording?: boolean
  isProcessing?: boolean
  disabled?: boolean
  className?: string
}

export default function MicToggle({
  isVoiceMode,
  onToggle,
  isRecording = false,
  isProcessing = false,
  disabled = false,
  className
}: MicToggleProps) {
  const getTooltipText = () => {
    if (disabled) return 'Voice features unavailable'
    if (isProcessing) return 'Processing voice...'
    if (isRecording) return 'Recording... Click to stop'
    if (isVoiceMode) return 'Switch to text input'
    return 'Switch to voice input'
  }

  const getIcon = () => {
    if (isProcessing) {
      return <Loader2 className="h-4 w-4 animate-spin" />
    }
    
    if (isVoiceMode) {
      return <Mic className={cn("h-4 w-4", isRecording && "animate-pulse")} />
    }
    
    return <MicOff className="h-4 w-4" />
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isVoiceMode ? "default" : "outline"}
            size="sm"
            onClick={onToggle}
            disabled={disabled || isProcessing}
            className={cn(
              "transition-all duration-200",
              isRecording && "bg-red-500 hover:bg-red-600 text-white",
              isVoiceMode && !isRecording && "bg-primary hover:bg-primary/90",
              className
            )}
          >
            {getIcon()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 