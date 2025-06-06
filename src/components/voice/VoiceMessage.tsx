'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Play, Pause, Volume2, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceMessageProps {
  audioUrl: string
  transcript?: string
  duration?: number
  className?: string
  isAssistant?: boolean
}

export default function VoiceMessage({
  audioUrl,
  transcript,
  duration,
  className,
  isAssistant = false
}: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(duration || 0)
  const [isLoading, setIsLoading] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setAudioDuration(audio.duration)
    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlayback = async () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      } else {
        await audio.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error('Error playing audio:', error)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !audioDuration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * audioDuration

    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const downloadAudio = () => {
    const link = document.createElement('a')
    link.href = audioUrl
    link.download = `voice-message-${Date.now()}.webm`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const progressPercentage = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0

  return (
    <Card className={cn(
      "p-4 max-w-sm",
      isAssistant ? "bg-muted/50" : "bg-primary/5",
      className
    )}>
      <div className="flex items-center gap-3">
        <Button
          onClick={togglePlayback}
          disabled={isLoading}
          variant="ghost"
          size="sm"
          className="rounded-full p-2 shrink-0"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          {/* Waveform/Progress Bar */}
          <div
            className="relative h-8 bg-muted rounded-md cursor-pointer group mb-1"
            onClick={handleSeek}
          >
            {/* Progress Bar */}
            <div
              className="absolute left-0 top-0 h-full bg-primary/20 rounded-md transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
            
            {/* Progress Indicator */}
            <div
              className="absolute top-1/2 w-2 h-2 bg-primary rounded-full transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progressPercentage}%`, marginLeft: '-4px' }}
            />

            {/* Simple waveform visualization */}
            <div className="absolute inset-0 flex items-center justify-center gap-0.5 opacity-30">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-current rounded-full"
                  style={{
                    height: `${20 + Math.random() * 60}%`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Time Display */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(audioDuration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Volume2 className="h-3 w-3 text-muted-foreground" />
          <Button
            onClick={downloadAudio}
            variant="ghost"
            size="sm"
            className="p-1"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-sm text-muted-foreground italic">
            "{transcript}"
          </p>
        </div>
      )}

      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        className="hidden"
      />
    </Card>
  )
} 