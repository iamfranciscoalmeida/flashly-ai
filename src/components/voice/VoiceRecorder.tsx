'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Mic, MicOff, Play, Pause, Square, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void
  isRecording?: boolean
  onRecordingStart?: () => void
  onRecordingStop?: () => void
  className?: string
  disabled?: boolean
}

export default function VoiceRecorder({
  onRecordingComplete,
  isRecording: externalIsRecording,
  onRecordingStart,
  onRecordingStop,
  className,
  disabled = false
}: VoiceRecorderProps) {
  const [internalIsRecording, setInternalIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])
  
  const isRecording = externalIsRecording ?? internalIsRecording

  useEffect(() => {
    // Check for microphone permission on mount
    checkMicrophonePermission()
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [])

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setIsPermissionGranted(true)
      stream.getTracks().forEach(track => track.stop()) // Stop the test stream
    } catch (error) {
      console.error('Microphone permission denied:', error)
      setIsPermissionGranted(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' })
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        
        onRecordingComplete(audioBlob, recordingTime)
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setInternalIsRecording(true)
      setRecordingTime(0)
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      onRecordingStart?.()

    } catch (error) {
      console.error('Error starting recording:', error)
      setIsPermissionGranted(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setInternalIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      onRecordingStop?.()
    }
  }

  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const pauseRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isPermissionGranted === false) {
    return (
      <Card className={cn("p-4 text-center", className)}>
        <div className="flex flex-col items-center gap-3">
          <MicOff className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Microphone Access Required</p>
            <p className="text-sm text-muted-foreground">
              Please allow microphone access to use voice features
            </p>
          </div>
          <Button onClick={checkMicrophonePermission} variant="outline">
            Grant Permission
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || isPermissionGranted === null}
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            className={cn(
              "rounded-full p-3",
              isRecording && "animate-pulse"
            )}
          >
            {isRecording ? (
              <Square className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
          
          {isRecording && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
            </div>
          )}
          
          {!isRecording && recordingTime > 0 && (
            <div className="text-sm text-muted-foreground">
              Recorded: {formatTime(recordingTime)}
            </div>
          )}
        </div>

        {audioUrl && !isRecording && (
          <div className="flex items-center gap-2">
            <Button
              onClick={isPlaying ? pauseRecording : playRecording}
              variant="outline"
              size="sm"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
    </Card>
  )
} 