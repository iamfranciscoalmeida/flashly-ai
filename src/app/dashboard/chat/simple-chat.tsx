'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../../supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Bot, User, Plus, Trash2 } from 'lucide-react'
import type { ChatSession, Message } from '@/types/database'
import { cn } from '@/lib/utils'
import { formatForPreWrap } from '@/utils/text-formatting'
import MicToggle from '@/components/voice/MicToggle'
import VoiceRecorder from '@/components/voice/VoiceRecorder'
import VoiceMessage from '@/components/voice/VoiceMessage'

// Helper function to group sessions by date periods like ChatGPT
const groupSessionsByDate = (sessions: ChatSession[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups: { [key: string]: ChatSession[] } = {
    Today: [],
    Yesterday: [],
    'Previous 7 days': [],
    'Previous 30 days': []
  };

  const monthGroups: { [key: string]: ChatSession[] } = {};

  sessions.forEach(session => {
    const sessionDate = new Date(session.last_message_at);
    const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());

    if (sessionDay.getTime() === today.getTime()) {
      groups.Today.push(session);
    } else if (sessionDay.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(session);
    } else if (sessionDate >= sevenDaysAgo) {
      groups['Previous 7 days'].push(session);
    } else if (sessionDate >= thirtyDaysAgo) {
      groups['Previous 30 days'].push(session);
    } else {
      const monthKey = sessionDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = [];
      }
      monthGroups[monthKey].push(session);
    }
  });

  // Sort month groups by date (most recent first)
  const sortedMonthKeys = Object.keys(monthGroups).sort((a, b) => {
    const dateA = new Date(a + ' 1');
    const dateB = new Date(b + ' 1');
    return dateB.getTime() - dateA.getTime();
  });

  // Combine all groups
  const result: { [key: string]: ChatSession[] } = {};
  
  // Add main groups if they have sessions
  Object.keys(groups).forEach(key => {
    if (groups[key].length > 0) {
      result[key] = groups[key];
    }
  });

  // Add month groups
  sortedMonthKeys.forEach(key => {
    result[key] = monthGroups[key];
  });

  return result;
};

export default function SimpleChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      setUserId(session.user.id)

      // Load chat sessions
      const { data: sessionsData } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('last_message_at', { ascending: false })

      setSessions(sessionsData || [])
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const loadMessages = async (sessionId: string) => {
    try {
      const { data: messagesData } = await supabase
        .from('messages')
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

  const handleNewChat = async () => {
    if (!userId) return

    try {
      const { data: newSession, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title: isVoiceMode ? 'New Voice Chat' : 'New Chat',
          mode: isVoiceMode ? 'voice' : 'text',
          last_message_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      setSessions(prev => [newSession, ...prev])
      setSelectedSession(newSession)
      setMessages([])
    } catch (error) {
      console.error('Error creating new chat:', error)
    }
  }

  const sendMessage = async (audioUrl?: string) => {
    if ((!input.trim() && !audioUrl) || isLoading || !selectedSession) return

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      session_id: selectedSession.id,
      role: 'user',
      content: input,
      audio_url: audioUrl,
      metadata: audioUrl ? { isVoice: true } : {},
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          message: input,
          audioUrl,
          isVoice: !!audioUrl
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => {
          const filtered = prev.filter(m => !m.id.startsWith('temp-'))
          return [...filtered, data.userMessage, data.aiMessage]
        })

        // Generate TTS for assistant response if in voice mode
        if (isVoiceMode && data.aiMessage?.content) {
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
              const audioUrl = URL.createObjectURL(audioBlob)
              
              // Update the assistant message with audio URL
              setMessages(prev => prev.map(msg => 
                msg.id === data.aiMessage.id 
                  ? { ...msg, audio_url: audioUrl }
                  : msg
              ))
            }
          } catch (ttsError) {
            console.error('TTS error:', ttsError)
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
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
        setInput(text)
        
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
          await sendMessage(audioUrl)
        } else {
          // Send without audio URL if upload fails
          await sendMessage()
        }
      }
    } catch (error) {
      console.error('Voice processing error:', error)
    } finally {
      setIsProcessingVoice(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Button onClick={handleNewChat} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="px-3 py-2">
            {(() => {
              const groupedSessions = groupSessionsByDate(sessions);
              return Object.entries(groupedSessions).map(([groupName, groupSessions]) => (
                <div key={groupName} className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                    {groupName}
                  </h3>
                  <div className="space-y-1">
                    {groupSessions.map((session: ChatSession) => (
                      <div
                        key={session.id}
                        className={cn(
                          "flex items-center justify-between mx-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group",
                          selectedSession?.id === session.id 
                            ? "bg-gray-200 text-gray-900" 
                            : "hover:bg-gray-100 text-gray-700"
                        )}
                        onClick={() => handleSessionSelect(session)}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-sm font-medium truncate overflow-hidden">{session.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold">{selectedSession.title}</h2>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Start a conversation</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}
                      
                      {message.audio_url ? (
                        <VoiceMessage
                          audioUrl={message.audio_url}
                          transcript={message.content}
                          isAssistant={message.role === 'assistant'}
                          className="max-w-[70%]"
                        />
                      ) : (
                        <Card className={`max-w-[70%] p-3 ${
                          message.role === 'user' 
                            ? 'bg-black text-white' 
                            : 'bg-white'
                        }`}>
                          <p className="whitespace-pre-wrap">{formatForPreWrap(message.content)}</p>
                        </Card>
                      )}

                      {message.role === 'user' && (
                        <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  {isVoiceMode ? (
                    <VoiceRecorder
                      onRecordingComplete={handleVoiceRecording}
                      isRecording={isRecording}
                      onRecordingStart={() => setIsRecording(true)}
                      onRecordingStop={() => setIsRecording(false)}
                      disabled={isLoading || isProcessingVoice}
                    />
                  ) : (
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message..."
                      className="min-h-[44px] max-h-32"
                      disabled={isLoading}
                    />
                  )}
                </div>
                
                <div className="flex gap-2">
                  <MicToggle
                    isVoiceMode={isVoiceMode}
                    onToggle={() => setIsVoiceMode(!isVoiceMode)}
                    isRecording={isRecording}
                    isProcessing={isProcessingVoice}
                  />
                  
                  {!isVoiceMode && (
                    <Button 
                      onClick={() => sendMessage()} 
                      disabled={!input.trim() || isLoading}
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Bot className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">Welcome to StudyWithAI</h2>
              <p className="text-gray-600 mb-4">Select a chat or create a new one to get started</p>
              <Button onClick={handleNewChat}>
                <Plus className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 