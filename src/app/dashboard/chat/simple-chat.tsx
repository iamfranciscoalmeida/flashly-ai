'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../../supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Bot, User, Plus } from 'lucide-react'
import type { ChatSession, Message } from '@/types/database'

export default function SimpleChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  
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
          title: 'New Chat',
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

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !selectedSession) return

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      session_id: selectedSession.id,
      role: 'user',
      content: input,
      metadata: {},
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
          content: input
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => {
          const filtered = prev.filter(m => !m.id.startsWith('temp-'))
          return [...filtered, data.userMessage, data.assistantMessage]
        })
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
          <div className="p-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSessionSelect(session)}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                  selectedSession?.id === session.id
                    ? 'bg-blue-100 text-blue-900'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-medium truncate">{session.title}</div>
                <div className="text-sm text-gray-500">
                  {new Date(session.last_message_at).toLocaleDateString()}
                </div>
              </button>
            ))}
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
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}
                      
                      <Card className={`max-w-[70%] p-3 ${
                        message.role === 'user' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white'
                      }`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </Card>

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
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="flex-1 min-h-[44px] max-h-32"
                  disabled={isLoading}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!input.trim() || isLoading}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
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