'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../supabase/client'
import { ChatInterface } from '@/components/chat-interface'
import FolderSidebar from '@/components/folder-sidebar'
import { EmptyStateInterface } from '@/components/empty-state-interface'
import type { ChatSession, Message, Folder } from '@/types/database'

export default function ChatPageClient() {
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
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

      // Load folders
      const { data: foldersData } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })

      // Load chat sessions
      const { data: sessionsData } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('last_message_at', { ascending: false })

      setFolders(foldersData || [])
      setSessions(sessionsData || [])
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setIsLoading(false)
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

  const handleNewChat = async (folderId?: string) => {
    if (!userId) return

    try {
      const { data: newSession, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title: 'New Chat',
          folder_id: folderId || null,
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

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)

      setSessions(prev => prev.filter(s => s.id !== sessionId))
      
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="w-80 border-r border-gray-200 bg-gray-50 p-4">
          <div className="animate-pulse">
            <div className="mb-4 h-8 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white">
      <FolderSidebar
        folders={folders}
        sessions={sessions}
        selectedSession={selectedSession}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onFoldersChange={setFolders}
      />
      
      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <ChatInterface
            session={selectedSession}
            messages={messages}
            onMessagesChange={setMessages}
          />
        ) : (
          <EmptyStateInterface
            onNewChat={handleNewChat}
            folders={folders}
          />
        )}
      </div>
    </div>
  )
} 