'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../../supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, User, Plus, ArrowLeft, Mic, Volume2 } from 'lucide-react'
import type { ChatSession, Message } from '@/types/database'
import { cn } from '@/lib/utils'
import { formatForPreWrap } from '@/utils/text-formatting'
import VoiceRecorder from '@/components/voice/VoiceRecorder'
import VoiceMessage from '@/components/voice/VoiceMessage'
import Link from 'next/link'

export default function VoiceTutorPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  
  const supabase = createClient()

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      setUserId(session.user.id)

      // Load voice chat sessions only
      const { data: sessionsData } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('mode', 'voice')
        .order('last_message_at', { ascending: false })

      setSessions(sessionsData || [])
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const loadMessages = async (sessionId: string) => {
    try {
      const { data: messagesData } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      setMessages(messagesData || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleSessionSelect = async (session: ChatSession) => {
    setSelectedSession(session)
    await loadMessages(session.id)
  }

  const handleNewVoiceChat = async () => {
    if (!userId) return

    try {
      const { data: newSession, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title: 'New Voice Chat',
          mode: 'voice',
          last_message_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      setSessions(prev => [newSession, ...prev])
      setSelectedSession(newSession)
      setMessages([])
    } catch (error) {
      console.error('Error creating new voice chat:', error)
    }
  }

  const sendVoiceMessage = async (audioUrl: string, transcript: string) => {
    if (!selectedSession) return

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      session_id: selectedSession.id,
      role: 'user',
      content: transcript,
      audio_url: audioUrl,
      metadata: { isVoice: true },
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          message: transcript,
          audioUrl,
          isVoice: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => {
          const filtered = prev.filter(m => !m.id.startsWith('temp-'))
          return [...filtered, data.userMessage, data.aiMessage]
        })

        // Generate TTS for assistant response
        if (data.aiMessage?.content) {
          try {
            const ttsResponse = await fetch('/api/voice/speak', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: data.aiMessage.content,
                voice: 'alloy'
              })
            })

            if (ttsResponse.ok) {
              const audioBlob = await ttsResponse.blob()
              const assistantAudioUrl = URL.createObjectURL(audioBlob)
              
              // Update the assistant message with audio URL
              setMessages(prev => prev.map(msg => 
                msg.id === data.aiMessage.id 
                  ? { ...msg, audio_url: assistantAudioUrl }
                  : msg
              ))
            }
          } catch (ttsError) {
            console.error('TTS error:', ttsError)
          }
        }
      }
    } catch (error) {
      console.error('Error sending voice message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceRecording = async (audioBlob: Blob, duration: number) => {
    if (!selectedSession) return

    setIsProcessingVoice(true)
    try {
      // First transcribe the audio
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      
      const transcribeResponse = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      })

      if (transcribeResponse.ok) {
        const { text } = await transcribeResponse.json()
        
        // Upload audio file
        const uploadFormData = new FormData()
        uploadFormData.append('audio', audioBlob, 'recording.webm')
        uploadFormData.append('sessionId', selectedSession.id)
        
        const uploadResponse = await fetch('/api/voice/upload', {
          method: 'POST',
          body: uploadFormData
        })

        if (uploadResponse.ok) {
          const { audioUrl } = await uploadResponse.json()
          await sendVoiceMessage(audioUrl, text)
        } else {
          // Send without audio URL if upload fails
          await sendVoiceMessage('', text)
        }
      }
    } catch (error) {
      console.error('Voice processing error:', error)
    } finally {
      setIsProcessingVoice(false)
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <Link href="/dashboard/chat">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">Voice Tutor</h1>
              </div>
            </div>
            <Button onClick={handleNewVoiceChat} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              New Voice Chat
            </Button>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="px-3 py-2">
              <div className="space-y-1">
                {sessions.map((session: ChatSession) => (
                  <div
                    key={session.id}
                    className={cn(
                      "flex items-center justify-between mx-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group",
                      selectedSession?.id === session.id 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-gray-100 text-gray-700"
                    )}
                    onClick={() => handleSessionSelect(session)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Volume2 className="h-4 w-4 shrink-0" />
                      <p className="text-sm font-medium truncate">{session.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <>
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {!showSidebar && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowSidebar(true)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <div className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">{selectedSession.title}</h2>
                  </div>
                </div>
                {showSidebar && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowSidebar(false)}
                  >
                    Hide Sidebar
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mic className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Start a Voice Conversation</h3>
                    <p className="text-gray-600 mb-6">
                      Press and hold the microphone to record your question
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-4 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                      )}
                      
                      {message.audio_url ? (
                        <VoiceMessage
                          audioUrl={message.audio_url}
                          transcript={message.content}
                          isAssistant={message.role === 'assistant'}
                          className="max-w-md"
                        />
                      ) : (
                        <Card className={`max-w-md p-4 ${
                          message.role === 'user' 
                            ? 'bg-primary text-white' 
                            : 'bg-white'
                        }`}>
                          <p className="whitespace-pre-wrap">{formatForPreWrap(message.content)}</p>
                        </Card>
                      )}

                      {message.role === 'user' && (
                        <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Voice Input */}
            <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 p-6">
              <div className="max-w-4xl mx-auto">
                <VoiceRecorder
                  onRecordingComplete={handleVoiceRecording}
                  isRecording={isRecording}
                  onRecordingStart={() => setIsRecording(true)}
                  onRecordingStop={() => setIsRecording(false)}
                  disabled={isLoading || isProcessingVoice}
                  className="bg-white/50"
                />
                
                {(isLoading || isProcessingVoice) && (
                  <div className="text-center mt-4">
                    <p className="text-sm text-gray-600">
                      {isProcessingVoice ? 'Processing your voice...' : 'Getting response...'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mic className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-3">Welcome to StudySpeak</h2>
              <p className="text-gray-600 mb-6 max-w-md">
                Your AI voice tutor is ready to help you learn through natural conversation. 
                Start a new voice chat to begin.
              </p>
              <Button onClick={handleNewVoiceChat} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Start Voice Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 