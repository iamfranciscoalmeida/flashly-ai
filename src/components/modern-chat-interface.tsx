'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  Link2, 
  Mic, 
  Send, 
  FileText, 
  Youtube, 
  Globe,
  Plus,
  Sparkles,
  Brain,
  BookOpen,
  StickyNote,
  User,
  Bot,
  ArrowUp,
  Paperclip,
  X,
  FileIcon,
  Image,
  Music,
  Video,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Copy,
  MoreVertical,
  Download,
  Share2,
  Menu,
  MessageSquare,
  Trash2,
  ChevronRight,
  Edit,
  FileDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { formatForPreWrap } from '@/utils/text-formatting';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import { DocumentViewer } from "@/components/document-viewer";
import { StandaloneFlashcardViewer } from "@/components/standalone-flashcard-viewer";
import { StandaloneQuizViewer } from "@/components/standalone-quiz-viewer";
import { GenerationSettingsModal } from "@/components/generation-settings-modal";

interface ChatSession {
  id: string;
  title: string;
  last_message_at: string;
  created_at: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  attachments?: FileAttachment[];
  feedback?: 'positive' | 'negative';
  isTyping?: boolean;
  type?: string;
  specialContent?: any;
}

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  progress?: number;
  documentId?: string;
}

interface ModernChatInterfaceProps {
  sessionId: string;
  userId: string;
  onNewContent?: (content: string, type: 'upload' | 'paste' | 'record') => void;
}

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

export function ModernChatInterface({ sessionId, userId, onNewContent }: ModernChatInterfaceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [sessionContent, setSessionContent] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [uploadedDocument, setUploadedDocument] = useState<{id: string, name: string, url: string, type: string} | null>(null);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [currentFlashcards, setCurrentFlashcards] = useState<any[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<any[]>([]);
  const [quizMode, setQuizMode] = useState<'multiple-choice' | 'free-answer'>('multiple-choice');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsType, setSettingsType] = useState<'flashcards' | 'quiz'>('flashcards');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Session management state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [showSidebar, setShowSidebar] = useState(true); // Show sidebar by default
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions on component mount
  useEffect(() => {
    loadSessions();
  }, [userId]);

  // Update current session when sessionId prop changes
  useEffect(() => {
    if (sessionId && sessions.length > 0) {
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        console.log('Updating currentSession to:', session.id, session.title);
        setCurrentSession(session);
      }
    }
  }, [sessionId, sessions]);

  // Session management functions
  const loadSessions = async () => {
    try {
      const supabase = (await import('@/supabase/client')).createClient();
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('User not authenticated:', authError);
        return;
      }

      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading sessions:', error);
        return;
      }

      setSessions(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const supabase = (await import('@/supabase/client')).createClient();
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('User not authenticated:', authError);
        toast({
          title: "Error",
          description: "User not authenticated. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: 'New Chat',
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        toast({
          title: "Error",
          description: "Failed to create new session. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setSessions([data, ...sessions]);
      setCurrentSession(data);
      setShowSidebar(false);
      
      // Navigate to the new session using Next.js router
      router.push(`/dashboard/chat?sessionId=${data.id}`);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const selectSession = (session: ChatSession) => {
    console.log('selectSession called with session:', session.id, 'current session:', currentSession?.id);
    
    if (currentSession?.id === session.id) {
      console.log('Same session selected, just closing sidebar');
      setShowSidebar(false);
      return;
    }
    
    console.log('Navigating to session:', session.id);
    // Navigate to the selected session using Next.js router for client-side navigation
    router.push(`/dashboard/chat?sessionId=${session.id}`);
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const supabase = (await import('@/supabase/client')).createClient();
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('User not authenticated:', authError);
        return;
      }

      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id); // Ensure user can only delete their own sessions

      if (error) {
        console.error('Error deleting session:', error);
        toast({
          title: "Error",
          description: "Failed to delete session. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(remainingSessions);
      
      if (currentSession?.id === sessionId) {
        // If we deleted the current session, navigate to another existing session or go back to session selector
        if (remainingSessions.length > 0) {
          // Navigate to the most recent remaining session
          const mostRecentSession = remainingSessions[0];
          router.push(`/dashboard/chat?sessionId=${mostRecentSession.id}`);
        } else {
          // No sessions left, go to session selector
          router.push('/dashboard/chat');
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const renameSession = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    
    try {
      const supabase = (await import('@/supabase/client')).createClient();
      
      const { error } = await supabase
        .from('chat_sessions')
        .update({ title: newTitle.trim() })
        .eq('id', sessionId);

      if (error) {
        console.error('Error renaming session:', error);
        toast({
          title: "Error",
          description: "Failed to rename session. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setSessions(sessions.map(s => 
        s.id === sessionId ? { ...s, title: newTitle.trim() } : s
      ));
      
      if (currentSession?.id === sessionId) {
        setCurrentSession({ ...currentSession, title: newTitle.trim() });
      }
      
      setEditingSession(null);
      setEditingTitle('');
      
      toast({
        title: "Success",
        description: "Session renamed successfully.",
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const exportSessionToPDF = async (sessionId: string) => {
    try {
      const supabase = (await import('@/supabase/client')).createClient();
      
      // Get session details
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;
      
      // Get all messages for this session
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        toast({
          title: "Error",
          description: "Failed to fetch chat messages.",
          variant: "destructive",
        });
        return;
      }

      // Create PDF content
      let pdfContent = `# ${session.title}\n\n`;
      pdfContent += `**Date:** ${new Date(session.created_at).toLocaleDateString()}\n\n`;
      pdfContent += `---\n\n`;
      
      messages?.forEach((message, index) => {
        const role = message.role === 'user' ? 'You' : 'AI Assistant';
        const timestamp = new Date(message.created_at).toLocaleTimeString();
        pdfContent += `**${role}** *(${timestamp})*\n\n`;
        pdfContent += `${message.content}\n\n`;
        if (index < messages.length - 1) {
          pdfContent += `---\n\n`;
        }
      });

      // Create a blob with the content
      const blob = new Blob([pdfContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Chat exported successfully as text file.",
      });
    } catch (error) {
      console.error('Error exporting session:', error);
      toast({
        title: "Error",
        description: "Failed to export session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startRename = (sessionId: string, currentTitle: string) => {
    setEditingSession(sessionId);
    setEditingTitle(currentTitle);
  };

  const cancelRename = () => {
    setEditingSession(null);
    setEditingTitle('');
  };

  // Load message history when session changes
  useEffect(() => {
    console.log('ModernChatInterface sessionId changed to:', sessionId);
    const loadMessageHistory = async () => {
      if (!sessionId) {
        // No sessionId provided - show session selector
        setIsLoadingHistory(false);
        setShowLandingPage(true);
        setMessages([]);
        setUploadedDocument(null);
        setSessionContent('');
        return;
      }
      
      setIsLoadingHistory(true);
      setMessages([]); // Clear current messages
      setShowLandingPage(true); // Reset to landing page
      setUploadedDocument(null); // Clear uploaded document
      setSessionContent(''); // Clear session content
      
      try {
        // Get session data including document_id
        const supabase = (await import('@/supabase/client')).createClient();
        const { data: sessionData, error: sessionError } = await supabase
          .from('chat_sessions')
          .select(`
            *,
            documents (
              id,
              file_name,
              file_path,
              file_type
            )
          `)
          .eq('id', sessionId)
          .single();

        if (sessionError) {
          console.error('Error loading session:', sessionError);
        }

        // If session has an associated document, restore it
        if (sessionData?.documents) {
          const doc = sessionData.documents;
          const { data: urlData } = supabase.storage
            .from('study-documents')
            .getPublicUrl(doc.file_path);
          
          setUploadedDocument({
            id: doc.id,
            name: doc.file_name,
            url: urlData.publicUrl,
            type: doc.file_type
          });
          console.log('Restored document for session:', doc.file_name);
        }

        const response = await fetch(`/api/chat/messages?sessionId=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            const formattedMessages: Message[] = data.messages.map((msg: any) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.created_at),
              status: 'sent' as const,
              attachments: msg.metadata?.attachments || [],
              type: msg.metadata?.type,
              specialContent: msg.metadata?.specialContent
            }));
            setMessages(formattedMessages);
            setShowLandingPage(false);
            
            // Restore session content if available
            const userMessages = formattedMessages.filter(m => m.role === 'user');
            if (userMessages.length > 0) {
              const content = userMessages.map(m => m.content).join('\n\n');
              setSessionContent(content);
            }
          } else {
            // No messages, show landing page only if no document is associated
            setShowLandingPage(!sessionData?.documents);
          }
        } else if (response.status === 401 || response.status === 403) {
          console.error('Authentication failed when loading messages');
          toast({
            title: "Authentication Error",
            description: "Please refresh the page and log in again.",
            variant: "destructive",
          });
        } else {
          console.error('Failed to load messages:', response.status);
          setShowLandingPage(true);
        }
      } catch (error) {
        console.error('Error loading message history:', error);
        toast({
          title: "Error",
          description: "Failed to load message history",
          variant: "destructive",
        });
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadMessageHistory();
  }, [sessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100);
      }
    }
  }, [messages]);

  // File upload handlers
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newAttachments: FileAttachment[] = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'uploading' as const,
      progress: 0
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    
    // Simulate file upload with progress
    newAttachments.forEach((attachment, index) => {
      simulateFileUpload(attachment.id, files[index]);
    });
  };

  const simulateFileUpload = async (attachmentId: string, file: File) => {
    // Simulate progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setAttachments((prev: FileAttachment[]) => prev.map((att: FileAttachment) => 
        att.id === attachmentId ? { ...att, progress } : att
      ));
    }

    // Mark as processing
    setAttachments((prev: FileAttachment[]) => prev.map((att: FileAttachment) => 
      att.id === attachmentId ? { ...att, status: 'processing' as const } : att
    ));

    try {
      // Upload file to Supabase storage for PDFs and other documents
      if (file.type === 'application/pdf' || file.type.includes('document') || file.type === 'text/plain') {
        const supabase = (await import('@/supabase/client')).createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Upload to Supabase storage
          const fileName = `${user.id}/${Date.now()}_${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('study-documents')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('study-documents')
            .getPublicUrl(fileName);

          // Create document record
          const { data: docData, error: docError } = await supabase
            .from('documents')
            .insert({
              user_id: user.id,
              file_name: file.name,
              file_path: fileName,
              file_size: file.size,
              file_type: file.type,
              status: 'processing',
              source_type: 'file'
            })
            .select()
            .single();

          if (docError) {
            console.error('Document creation error:', docError);
            throw docError;
          }

          // For PDFs, trigger text extraction and enhanced title generation
          if (file.type === 'application/pdf') {
            try {
              const extractResponse = await fetch('/api/documents/extract-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: docData.id })
              });
              
              if (extractResponse.ok) {
                console.log('Text extraction initiated for PDF');
                
                // After successful text extraction, generate a better title using document content
                // We'll do this with a slight delay to allow text extraction to complete
                setTimeout(async () => {
                  try {
                    // Get the extracted text
                    const { data: updatedDoc, error: docFetchError } = await supabase
                      .from('documents')
                      .select('extracted_text')
                      .eq('id', docData.id)
                      .single();

                    if (!docFetchError && updatedDoc?.extracted_text) {
                      const titleResponse = await fetch('/api/chat/sessions/generate-title', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          sessionId, 
                          titleSource: 'documentContent',
                          fileName: file.name,
                          documentContent: updatedDoc.extracted_text
                        })
                      });
                      
                      if (titleResponse.ok) {
                        const { title } = await titleResponse.json();
                        console.log('Generated enhanced title from document content:', title);
                        // Reload sessions to update the UI
                        loadSessions();
                      }
                    }
                  } catch (error) {
                    console.log('Failed to generate enhanced title from document content:', error);
                  }
                }, 3000); // 3 second delay to allow text extraction
              } else {
                console.warn('Failed to initiate text extraction');
              }
            } catch (extractError) {
              console.warn('Error initiating text extraction:', extractError);
            }
          }

          // Mark as ready with document info
          setAttachments((prev: FileAttachment[]) => prev.map((att: FileAttachment) => 
            att.id === attachmentId ? { 
              ...att, 
              status: 'ready' as const, 
              url: urlData.publicUrl,
              documentId: docData.id
            } : att
          ));

          // Set uploaded document for viewer
          setUploadedDocument({
            id: docData.id,
            name: file.name,
            url: urlData.publicUrl,
            type: file.type
          });

          // Update the current chat session to link it with this document
          if (sessionId) {
            try {
              const { error: updateError } = await supabase
                .from('chat_sessions')
                .update({ document_id: docData.id })
                .eq('id', sessionId);

              if (updateError) {
                console.error('Error linking document to session:', updateError);
              } else {
                console.log('Successfully linked document to session');
              }
            } catch (linkError) {
              console.error('Error updating session with document:', linkError);
            }

            // Generate title immediately based on file name
            try {
              const titleResponse = await fetch('/api/chat/sessions/generate-title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  sessionId, 
                  titleSource: 'fileName',
                  fileName: file.name
                })
              });
              
              if (titleResponse.ok) {
                const { title } = await titleResponse.json();
                console.log('Generated title from filename:', title);
                // Reload sessions to update the UI
                loadSessions();
              }
            } catch (error) {
              console.log('Failed to generate title from filename:', error);
            }
          }

          // Add message about upload
          addMessage('user', `Uploaded document: ${file.name}`);
          addMessage('assistant', `I've received your document "${file.name}". I can now help you analyze it, create study materials, or answer questions about its content!`);
          
          // Notify parent component
          onNewContent?.(file.name, 'upload');
          setShowLandingPage(false);

        } else {
          throw new Error('User not authenticated');
        }
      } else {
        // For other file types, create object URL
        const url = URL.createObjectURL(file);
        setAttachments((prev: FileAttachment[]) => prev.map((att: FileAttachment) => 
          att.id === attachmentId ? { ...att, status: 'ready' as const, url } : att
        ));

        // Read text content for text files
        if (file.type.startsWith('text/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            setSessionContent((prev: string) => prev + '\n\n' + content);
            onNewContent?.(content, 'upload');
          };
          reader.readAsText(file);
        }

        addMessage('user', `Uploaded file: ${file.name}`);
        addMessage('assistant', `I've received your file "${file.name}". How can I help you with it?`);
        setShowLandingPage(false);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setAttachments((prev: FileAttachment[]) => prev.map((att: FileAttachment) => 
        att.id === attachmentId ? { ...att, status: 'error' as const } : att
      ));
      
      addMessage('assistant', `Sorry, there was an error uploading "${file.name}". Please try again.`);
      
      toast({
        title: "Upload Error",
        description: `Failed to upload ${file.name}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Message handlers - now saves to database
  const addMessage = async (role: Message['role'], content: string, type?: string, specialContent?: any, attachments?: FileAttachment[], overrideSessionId?: string) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      status: 'sending',
      attachments: attachments?.filter(att => att.status === 'ready'),
      type,
      specialContent
    };
    
    setMessages((prev: Message[]) => [...prev, newMessage]);
    
    // Use override session ID if provided, otherwise use the prop sessionId
    const sessionIdToUse = overrideSessionId || sessionId;
    
    // Save to database (only for real messages, not typing indicators)
    if (role !== 'system' && !newMessage.isTyping && sessionIdToUse) {
      try {
        const supabase = (await import('@/supabase/client')).createClient();
        
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('User not authenticated:', authError);
          throw new Error('User not authenticated');
        }

        const { error: insertError } = await supabase
          .from('chat_messages')
          .insert({
            session_id: sessionIdToUse,
            user_id: user.id,
            role: role,
            content: content,
            metadata: {
              attachments: attachments?.filter(att => att.status === 'ready'),
              type: type,
              specialContent: specialContent
            }
          });

        if (insertError) {
          console.error('Database insert error:', insertError);
          throw insertError;
        }
        
        // Mark as sent
        setMessages((prev: Message[]) => prev.map((msg: Message) => 
          msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
        ));

        // Generate AI title more frequently and earlier
        const currentMessageCount = messages.length + 1;
        
        // Generate title after first user message (2 messages total) if no file was uploaded
        // Or after every 3 messages to keep titles updated with conversation evolution
        const shouldGenerateTitle = 
          (currentMessageCount === 2) || // After first user message
          (currentMessageCount >= 4 && currentMessageCount % 3 === 1); // Every 3 messages after that
          
        if (shouldGenerateTitle) {
          try {
            const titleResponse = await fetch('/api/chat/sessions/generate-title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                sessionId: sessionIdToUse,
                titleSource: 'chat'
              })
            });
            
            if (titleResponse.ok) {
              const { title } = await titleResponse.json();
              console.log('Generated new session title from chat:', title);
              // Reload sessions to update the UI
              loadSessions();
            }
          } catch (error) {
            console.log('Failed to generate title from chat:', error);
          }
        }
      } catch (error) {
        console.error('Failed to save message to database:', error);
        // Mark as error status
        setMessages((prev: Message[]) => prev.map((msg: Message) => 
          msg.id === newMessage.id ? { ...msg, status: 'error' } : msg
        ));
      }
    } else {
      // For typing indicators and system messages, just mark as sent locally
      setTimeout(() => {
        setMessages((prev: Message[]) => prev.map((msg: Message) => 
          msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
        ));
      }, 300);
    }
    
    return newMessage;
  };

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    // Auto-create a session if none exists
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      console.log('No session available, creating new session...');
      try {
        const supabase = (await import('@/supabase/client')).createClient();
        
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('User not authenticated:', authError);
          toast({
            title: "Error",
            description: "User not authenticated. Please refresh the page.",
            variant: "destructive",
          });
          return;
        }

        const { data, error } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            title: 'New Chat',
            last_message_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating session:', error);
          toast({
            title: "Error",
            description: "Failed to create new session. Please try again.",
            variant: "destructive",
          });
          return;
        }

        currentSessionId = data.id;
        setSessions(prev => [data, ...prev]);
        setCurrentSession(data);
        
        // Update URL to include the new session ID
        window.history.pushState({}, '', `/dashboard/chat?sessionId=${data.id}`);
        
        console.log('Created new session:', data.id);
      } catch (error) {
        console.error('Failed to create session:', error);
        toast({
          title: "Error",
          description: "Failed to create session. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    setShowLandingPage(false);
    const userMessage = input.trim();
    const readyAttachments = attachments.filter((att: FileAttachment) => att.status === 'ready');
    
    console.log('Sending message with:', { sessionId: currentSessionId, userMessage, attachments: readyAttachments.length });
    
    // Add user message immediately for better UX
    addMessage('user', userMessage, undefined, undefined, readyAttachments, currentSessionId);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages((prev: Message[]) => [...prev, typingMessage]);

    try {
      // Validate and prepare the request body
      const requestBody = {
        sessionId: currentSessionId,
        message: userMessage,
        attachments: readyAttachments,
        context: sessionContent || ''
      };

      console.log('Request body:', requestBody);

      // Call the real API
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', response.status, errorData);
        throw new Error(`Failed to send message: ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Remove typing indicator
      setMessages((prev: Message[]) => prev.filter((msg: Message) => msg.id !== 'typing'));
      
      // Add AI response
      if (data.aiMessage) {
        addMessage('assistant', data.aiMessage.content, undefined, undefined, undefined, currentSessionId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove typing indicator
      setMessages((prev: Message[]) => prev.filter((msg: Message) => msg.id !== 'typing'));
      
      // Show error message
      addMessage('assistant', 'I apologize, but I encountered an error. Please try again or refresh the page if the issue persists.', undefined, undefined, undefined, currentSessionId);
      
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages((prev: Message[]) => prev.map((msg: Message) => 
      msg.id === messageId ? { ...msg, feedback } : msg
    ));
    toast({
      title: feedback === 'positive' ? "Thanks for your feedback!" : "Feedback noted",
      description: feedback === 'positive' 
        ? "Glad this was helpful!" 
        : "We'll work on improving our responses.",
    });
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied!",
      description: "Message copied to clipboard",
    });
  };

  const generateContent = async (
    type: 'flashcards' | 'quiz' | 'summary' | 'notes', 
    settings?: { 
      count: number; 
      difficulty: 'easy' | 'medium' | 'hard' | 'mixed'; 
      difficultyDistribution: { easy: number; medium: number; hard: number; }; 
    }
  ) => {
    // Gather content from multiple sources
    let content = sessionContent || '';
    
    // Add conversation context to provide more context
    const conversationContext = messages
      .filter(m => m.role === 'user' && m.content.trim().length > 0 && !m.content.startsWith('Generate'))
      .map(m => m.content)
      .join('\n\n');
    
    if (conversationContext) {
      content += content ? `\n\nUser interactions:\n${conversationContext}` : conversationContext;
    }

    // If we have an uploaded document but no extracted content, 
    // let the API handle document text extraction
    if (uploadedDocument && !content.trim()) {
      content = `Please generate ${type} from the uploaded document: ${uploadedDocument.name}`;
    }

    // Check if we have any content to work with
    if (!content.trim() && !uploadedDocument) {
      toast({
        title: "No content available",
        description: "Please upload content, paste text, or have a conversation first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setIsGenerating(true);
    setShowLandingPage(false);
    
    // Add user message with settings info
    const settingsText = settings 
      ? ` (${settings.count} items, ${settings.difficulty === 'mixed' ? 'mixed difficulty' : settings.difficulty} difficulty)`
      : '';
    addMessage('user', `Generate ${type} from the ${uploadedDocument ? 'uploaded document' : 'content'}${settingsText}`);
    
    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      // Prepare options based on settings
      const options = {
        quantity: settings?.count || 10,
        difficulty: settings?.difficulty || 'medium',
        difficultyDistribution: settings?.difficulty === 'mixed' ? settings.difficultyDistribution : undefined
      };

      const response = await fetch('/api/chat/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          type,
          content: content.trim(),
          documentId: uploadedDocument?.id,
          options
        })
      });

      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));

      if (response.ok) {
        const data = await response.json();
        
        // Handle flashcards specially - show in interactive viewer
        if (type === 'flashcards' && data.content) {
          let flashcards = [];
          
          // Parse the flashcards from the response
          if (Array.isArray(data.content)) {
            flashcards = data.content;
          } else if (data.content.flashcards && Array.isArray(data.content.flashcards)) {
            flashcards = data.content.flashcards;
          } else if (typeof data.content === 'string') {
            try {
              const parsed = JSON.parse(data.content);
              flashcards = Array.isArray(parsed) ? parsed : (parsed.flashcards || []);
            } catch (e) {
              // If parsing fails, treat as non-flashcard content
              flashcards = [];
            }
          }
          
          if (flashcards.length > 0) {
            setCurrentFlashcards(flashcards);
            setShowFlashcards(true);
            await addMessage('assistant', `I've generated ${flashcards.length} flashcards for you! Click "View Flashcards" to start studying.`);
          } else {
            const formattedContent = typeof data.content === 'string' ? formatForPreWrap(data.content) : JSON.stringify(data.content, null, 2);
            await addMessage('assistant', `Here are your generated ${type}:\n\n${formattedContent}`);
          }
        } else if (type === 'quiz') {
          // Handle quiz content
          let quiz: any[] = [];
          if (Array.isArray(data.content)) {
            quiz = data.content;
          } else if (typeof data.content === 'string') {
            try {
              const parsed = JSON.parse(data.content);
              quiz = Array.isArray(parsed) ? parsed : (parsed.questions || []);
            } catch (e) {
              // If parsing fails, treat as non-quiz content
              quiz = [];
            }
          }
          
          if (quiz.length > 0) {
            setCurrentQuiz(quiz);
            setShowQuiz(true);
            await addMessage('assistant', `I've generated ${quiz.length} quiz questions for you! Choose your preferred mode and click "Take Quiz" to test your knowledge.`);
          } else {
            const formattedContent = typeof data.content === 'string' ? formatForPreWrap(data.content) : JSON.stringify(data.content, null, 2);
            await addMessage('assistant', `Here are your generated ${type}:\n\n${formattedContent}`);
          }
        } else {
          const formattedContent = typeof data.content === 'string' ? formatForPreWrap(data.content) : JSON.stringify(data.content, null, 2);
          await addMessage('assistant', `Here are your generated ${type}:\n\n${formattedContent}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to generate content: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));
      toast({
        title: "Generation failed",
        description: `Failed to generate ${type}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  // Settings modal handlers
  const handleOpenSettingsModal = (type: 'flashcards' | 'quiz') => {
    setSettingsType(type);
    setShowSettingsModal(true);
  };

  const handleGenerateWithSettings = (settings: any) => {
    setShowSettingsModal(false);
    generateContent(settingsType, settings);
  };

  const handlePasteContent = () => {
    if (pasteInput.trim()) {
      setSessionContent(prev => prev + '\n\n' + pasteInput);
      addMessage('user', `Pasted content: ${pasteInput.substring(0, 100)}${pasteInput.length > 100 ? '...' : ''}`);
      addMessage('assistant', `I've received your content. You can now ask me questions about it or generate study materials!`);
      onNewContent?.(pasteInput, 'paste');
      setPasteInput('');
      setShowPasteModal(false);
      setShowLandingPage(false);
    }
  };

  // Loading state
  if (isLoadingHistory) {
    return (
      <TooltipProvider>
        <div className="h-full flex bg-background">
          {/* Mobile sidebar toggle */}
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 left-4 z-50 md:hidden"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>

          {/* Sidebar overlay for mobile */}
          <AnimatePresence>
            {showSidebar && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setShowSidebar(false)}
              />
            )}
          </AnimatePresence>

          {/* Sidebar */}
          <AnimatePresence>
            {showSidebar && (
              <motion.div
                initial={{ x: -320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -320, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-80 bg-background border-r border-border flex flex-col h-full z-50 md:relative md:z-auto fixed"
          >
            <div className="p-4 border-b border-border bg-background">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Sessions</h3>
                    <Button size="sm" onClick={createNewSession} className="rounded-lg">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="py-2">
                    {(() => {
                      const groupedSessions = groupSessionsByDate(sessions);
                      return Object.entries(groupedSessions).map(([groupName, groupSessions]) => (
                        <div key={groupName} className="mb-6">
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4">
                            {groupName}
                          </h3>
                          <div className="space-y-1">
                            {groupSessions.map((session: ChatSession) => (
                              <motion.div
                                key={session.id}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-3"
                              >
                                <div
                                  className={cn(
                                    "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors group relative max-w-full",
                                                                    currentSession?.id === session.id 
                                  ? "bg-accent text-accent-foreground" 
                                  : "hover:bg-accent/50 text-foreground"
                                  )}
                                  onClick={() => selectSession(session)}
                                >
                                  <div className="flex-1 min-w-0 pr-2">
                                    {editingSession === session.id ? (
                                      <input
                                        type="text"
                                        value={editingTitle}
                                        onChange={(e) => setEditingTitle(e.target.value)}
                                        onBlur={() => renameSession(session.id, editingTitle)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            renameSession(session.id, editingTitle);
                                          } else if (e.key === 'Escape') {
                                            cancelRename();
                                          }
                                        }}
                                        className="text-sm font-medium bg-transparent border-none outline-none w-full focus:bg-background focus:border focus:border-primary rounded px-1"
                                        autoFocus
                                      />
                                    ) : (
                                      <p className="text-sm font-medium truncate max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">{session.title}</p>
                                    )}
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-accent flex-shrink-0"
                                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                      >
                                        <MoreVertical className="h-3 w-3 text-gray-500" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startRename(session.id, session.title);
                                        }}
                                      >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Rename
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          exportSessionToPDF(session.id);
                                        }}
                                      >
                                        <FileDown className="h-4 w-4 mr-2" />
                                        Export to Text
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteSession(session.id, e);
                                        }}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading content */}
          <div className="flex-1 flex items-center justify-center bg-muted">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-lg">Loading conversation...</p>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Main chat interface
  return (
    <TooltipProvider>
      <div className="h-full flex bg-background overflow-hidden">
        {/* Mobile sidebar toggle */}
        <Button
          variant="outline"
          size="icon"
          className="absolute top-4 left-4 z-50 md:hidden"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          {showSidebar ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>

        {/* Sidebar overlay for mobile */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setShowSidebar(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-80 bg-background border-r border-border flex flex-col h-full z-50 md:relative md:z-auto fixed"
            >
              <div className="p-4 border-b border-border bg-background">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Sessions</h3>
                  <Button size="sm" onClick={createNewSession} className="rounded-lg">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="py-2">
                  {(() => {
                    const groupedSessions = groupSessionsByDate(sessions);
                    return Object.entries(groupedSessions).map(([groupName, groupSessions]) => (
                      <div key={groupName} className="mb-6">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4">
                          {groupName}
                        </h3>
                        <div className="space-y-1">
                          {groupSessions.map((session: ChatSession) => (
                            <motion.div
                              key={session.id}
                              whileHover={{ x: 4 }}
                              whileTap={{ scale: 0.98 }}
                              className="px-3"
                            >
                              <div
                                className={cn(
                                  "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors group relative max-w-full",
                                  currentSession?.id === session.id 
                                    ? "bg-accent text-accent-foreground" 
                                    : "hover:bg-accent/50 text-foreground"
                                )}
                                onClick={() => selectSession(session)}
                              >
                                <div className="flex-1 min-w-0 pr-2">
                                  {editingSession === session.id ? (
                                    <input
                                      type="text"
                                      value={editingTitle}
                                      onChange={(e) => setEditingTitle(e.target.value)}
                                      onBlur={() => renameSession(session.id, editingTitle)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          renameSession(session.id, editingTitle);
                                        } else if (e.key === 'Escape') {
                                          cancelRename();
                                        }
                                      }}
                                                                              className="text-sm font-medium bg-transparent border-none outline-none w-full focus:bg-background focus:border focus:border-primary rounded px-1"
                                      autoFocus
                                    />
                                  ) : (
                                    <p className="text-sm font-medium truncate max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">{session.title}</p>
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-accent flex-shrink-0"
                                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="h-3 w-3 text-gray-500" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startRename(session.id, session.title);
                                      }}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        exportSessionToPDF(session.id);
                                      }}
                                    >
                                      <FileDown className="h-4 w-4 mr-2" />
                                      Export to Text
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSession(session.id, e);
                                      }}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Container */}
        <div 
          className={cn("flex-1 flex", uploadedDocument ? "flex-row" : "flex-col")}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
        {/* Drop zone overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-muted/90 backdrop-blur-sm z-50 flex items-center justify-center"
            >
              <div className="bg-background rounded-2xl p-8 shadow-2xl border-2 border-dashed border-border">
                <Upload className="h-16 w-16 text-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold">Drop your files here</p>
                <p className="text-sm text-muted-foreground mt-2">We support PDFs, documents, images, and more</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Document Viewer Panel */}
        {uploadedDocument && (
          <div className="w-1/2 border-r flex flex-col">
            <div className="border-b border-border px-4 py-3 bg-muted">
              <h3 className={cn(
                "font-medium text-sm text-gray-700",
                showSidebar ? "ml-12" : "ml-12"
              )}>
                {uploadedDocument.name}
              </h3>
            </div>
            <div className="flex-1">
              <DocumentViewer
                documentId={uploadedDocument.id}
                documentUrl={uploadedDocument.url}
                documentType={uploadedDocument.type}
                pageCount={1}
              />
            </div>
          </div>
        )}

        {/* Floating Sidebar Toggle Button */}
        <Button
          variant="default"
          size="sm"
          className={cn(
            "fixed top-[100px] z-30 w-10 h-10 p-0 transition-all duration-300 shadow-lg",
            "bg-background hover:bg-muted border border-border text-foreground hover:text-foreground",
            showSidebar ? "left-[336px]" : "left-4"
          )}
          onClick={() => setShowSidebar(!showSidebar)}
        >
          {showSidebar ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>

        {/* Chat Panel */}
        <div className={cn("flex flex-col h-full overflow-hidden bg-muted", uploadedDocument ? "w-1/2" : "w-full")}>

        {/* Messages Area - Takes remaining space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full px-4" ref={scrollAreaRef}>
          <div className="py-4 max-w-4xl mx-auto">
            {/* Landing page when no messages */}
            {showLandingPage && messages.length === 0 && !isLoadingHistory && (
              <div className="flex flex-col h-full min-h-[600px] bg-muted">
                {/* Hero Section */}
                <div className="text-center py-12 px-6">
                  <motion.h1 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent"
                  >
                    What would you like to learn today?
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg text-muted-foreground"
                  >
                    Upload your materials, paste content, or ask questions to get started
                  </motion.p>
                </div>

                {/* Upload Options Grid */}
                <div className="flex-1 max-w-5xl mx-auto px-6 w-full">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
                  >
                    {/* Upload Files */}
                    <Card 
                      className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-primary group"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Upload className="h-8 w-8 text-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Upload Files</h3>
                        <p className="text-sm text-muted-foreground">PDFs, Documents, Images</p>
                        <p className="text-xs text-muted-foreground/70 mt-2">Drag & drop supported</p>
                      </div>
                    </Card>

                    {/* Paste Content */}
                    <Card 
                      className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-primary group"
                      onClick={() => setShowPasteModal(true)}
                    >
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Link2 className="h-8 w-8 text-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Paste Content</h3>
                        <p className="text-sm text-muted-foreground">YouTube, Web links, Text</p>
                        <p className="text-xs text-muted-foreground/70 mt-2">Smart content extraction</p>
                      </div>
                    </Card>

                    {/* Record Audio */}
                    <Card className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-primary group">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Mic className="h-8 w-8 text-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Record Audio</h3>
                        <p className="text-sm text-muted-foreground">Voice notes, Lectures</p>
                        <p className="text-xs text-muted-foreground/70 mt-2">Live transcription</p>
                      </div>
                    </Card>
                  </motion.div>



                  {/* Recently Used / Suggested Topics */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-12 text-center"
                  >
                    <p className="text-sm text-muted-foreground mb-4">Popular topics</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {['Biology', 'History', 'Mathematics', 'Literature', 'Physics', 'Chemistry'].map((topic) => (
                        <Badge 
                          key={topic}
                          variant="secondary" 
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => {
                            setInput(`Teach me about ${topic}`);
                            setShowLandingPage(false);
                          }}
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            )}
            
            {/* Messages */}
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={cn(
                    "mb-6 flex gap-3",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-sm">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={cn(
                    "group relative max-w-[80%] rounded-2xl px-5 py-4 shadow-sm",
                    message.role === 'user' 
                      ? 'bg-muted/30 text-foreground border border-border/50' 
                      : 'bg-card text-foreground border border-border'
                    )}>
                    {/* Message content */}
                    {message.isTyping ? (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 bg-muted-foreground rounded-full"
                              animate={{ y: [0, -10, 0] }}
                              transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                delay: i * 0.1
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={cn(
                          "prose prose-sm max-w-none leading-relaxed",
                          message.role === 'user' 
                            ? "prose-slate dark:prose-invert [&_code]:bg-muted/50" 
                            : "prose-slate dark:prose-invert [&_code]:bg-muted"
                        )}>
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                        
                        {/* Flashcard View Button */}
                        {message.role === 'assistant' && 
                         message.content.includes('flashcards for you') && 
                         currentFlashcards.length > 0 && (
                          <div className="mt-3">
                            <Button
                              size="sm"
                              onClick={() => setShowFlashcards(true)}
                              className="flex items-center gap-2"
                            >
                              <Brain className="h-4 w-4" />
                              View Flashcards ({currentFlashcards.length})
                            </Button>
                          </div>
                        )}

                        {message.role === 'assistant' && 
                         message.content.includes('quiz questions for you') && 
                         currentQuiz.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {/* Quiz Mode Selection */}
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Mode:</span>
                              <div className="flex items-center bg-muted rounded-lg p-1">
                                <Button
                                  variant={quizMode === 'multiple-choice' ? 'default' : 'ghost'}
                                  size="sm"
                                  onClick={() => setQuizMode('multiple-choice')}
                                  className="h-7 px-3 text-xs"
                                >
                                  Multiple Choice
                                </Button>
                                <Button
                                  variant={quizMode === 'free-answer' ? 'default' : 'ghost'}
                                  size="sm"
                                  onClick={() => setQuizMode('free-answer')}
                                  className="h-7 px-3 text-xs"
                                >
                                  Free Answer
                                </Button>
                              </div>
                            </div>
                            
                            {/* Take Quiz Button */}
                            <Button
                              size="sm"
                              onClick={() => setShowQuiz(true)}
                              className="flex items-center gap-2"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Take Quiz ({currentQuiz.length} questions)
                            </Button>
                          </div>
                        )}
                        
                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {message.attachments.map((attachment) => (
                              <div key={attachment.id} className={cn(
                                "flex items-center gap-2 p-2 rounded-lg",
                                message.role === 'user' ? "bg-muted/50" : "bg-muted/30"
                              )}>
                                <FileIcon className="h-4 w-4" />
                                <span className="text-sm">{attachment.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Message metadata */}
                        <div className={cn(
                          "flex items-center gap-2 mt-2 text-xs text-muted-foreground"
                        )}>
                          <Clock className="h-3 w-3" />
                          {new Date(message.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                          {message.status === 'sending' && <Loader2 className="h-3 w-3 animate-spin" />}
                          {message.status === 'sent' && <CheckCircle2 className="h-3 w-3" />}
                          {message.status === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
                        </div>
                      </>
                    )}
                    
                    {/* Message actions */}
                    {!message.isTyping && (
                      <div className={cn(
                        "absolute -bottom-8 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                        message.role === 'user' && 'left-auto right-0'
                      )}>
                        {message.role === 'assistant' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => handleFeedback(message.id, 'positive')}
                            >
                              <ThumbsUp className={cn(
                                "h-3 w-3",
                                message.feedback === 'positive' && "fill-current"
                              )} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => handleFeedback(message.id, 'negative')}
                            >
                              <ThumbsDown className={cn(
                                "h-3 w-3",
                                message.feedback === 'negative' && "fill-current"
                              )} />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => copyMessage(message.content)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 px-2">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Export
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-sm">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
        </div>

        {/* AI Tools Row - Compact */}
        <div className="border-t border-border bg-muted px-4 py-2 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenSettingsModal('flashcards')}
                    disabled={isLoading}
                    className="h-8 px-2 text-xs hover:bg-white hover:shadow-sm transition-all"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Flashcards
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generate study flashcards</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenSettingsModal('quiz')}
                    disabled={isLoading}
                    className="h-8 px-2 text-xs hover:bg-white hover:shadow-sm transition-all"
                  >
                    <Brain className="h-3 w-3 mr-1" />
                    Quiz
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Create practice quiz</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => generateContent('summary')}
                    disabled={isLoading}
                    className="h-8 px-2 text-xs hover:bg-white hover:shadow-sm transition-all"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Summary
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generate content summary</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => generateContent('notes')}
                    disabled={isLoading}
                    className="h-8 px-2 text-xs hover:bg-white hover:shadow-sm transition-all"
                  >
                    <StickyNote className="h-3 w-3 mr-1" />
                    Notes
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generate study notes</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Input Area - Sticky at bottom */}
        <div className="border-t border-border bg-muted px-4 py-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            {/* File attachments preview */}
            {attachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div 
                    key={attachment.id}
                    className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm"
                  >
                    {attachment.status === 'uploading' && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{attachment.name}</span>
                        <Progress value={attachment.progress} className="w-20 h-1" />
                      </>
                    )}
                    {attachment.status === 'processing' && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-black" />
                        <span>{attachment.name}</span>
                        <span className="text-xs text-gray-500">Processing...</span>
                      </>
                    )}
                    {attachment.status === 'ready' && (
                      <>
                        <FileIcon className="h-4 w-4 text-green-600" />
                        <span>{attachment.name}</span>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </>
                    )}
                    {attachment.status === 'error' && (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-red-600">{attachment.name}</span>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => setAttachments(prev => prev.filter(a => a.id !== attachment.id))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Input controls */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="min-h-[52px] max-h-[200px] pr-12 resize-none rounded-xl bg-card border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-2 bottom-2 h-8 w-8"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach files</TooltipContent>
                </Tooltip>
              </div>
              <Button
                onClick={sendMessage}
                disabled={(!input.trim() && attachments.length === 0) || isLoading}
                className="rounded-xl"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span>Powered by GPT-4</span>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          multiple
          accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.mp4"
        />
        
        {/* Flashcard Viewer Overlay */}
        {showFlashcards && currentFlashcards.length > 0 && (
          <div className="absolute inset-0 bg-white z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white">
              <h2 className="text-xl font-semibold">Interactive Flashcards</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFlashcards(false)}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Back to Chat
              </Button>
            </div>
            
            {/* Flashcard Viewer */}
            <div className="flex-1 overflow-hidden">
              <StandaloneFlashcardViewer
                flashcards={currentFlashcards.map((card: any) => ({
                  question: card.question,
                  answer: card.answer,
                  difficulty_level: card.difficulty_level || 'medium',
                  tags: card.tags || [],
                  source_reference: {
                    module: 'Current Chat Session',
                    generated_at: new Date().toISOString(),
                    ...(card.source_reference || {})
                  }
                }))}
                title="Study Session Flashcards"
                onShuffle={() => {
                  const shuffled = [...currentFlashcards].sort(() => Math.random() - 0.5);
                  setCurrentFlashcards(shuffled);
                }}
                onRegenerate={() => {
                  setShowFlashcards(false);
                  handleOpenSettingsModal('flashcards');
                }}
              />
            </div>
          </div>
        )}
        
        {/* Quiz Viewer Overlay */}
        {showQuiz && currentQuiz.length > 0 && (
          <div className="absolute inset-0 bg-white z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white">
              <h2 className="text-xl font-semibold">Interactive Quiz</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowQuiz(false)}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Back to Chat
              </Button>
            </div>
            
            {/* Quiz Viewer */}
            <div className="flex-1 overflow-hidden">
              <StandaloneQuizViewer
                questions={currentQuiz.map((question: any) => ({
                  question: question.question,
                  options: question.options,
                  correct: question.correct,
                  explanation: question.explanation || '',
                  difficulty_level: question.difficulty_level || 'medium',
                  tags: question.tags || [],
                  source_reference: {
                    module: 'Current Chat Session',
                    generated_at: new Date().toISOString(),
                    ...(question.source_reference || {})
                  }
                }))}
                title="Quiz Session"
                mode={quizMode}
                onModeChange={(mode) => setQuizMode(mode)}
                onShuffle={() => {
                  const shuffled = [...currentQuiz].sort(() => Math.random() - 0.5);
                  setCurrentQuiz(shuffled);
                }}
                onRegenerate={() => {
                  setShowQuiz(false);
                  handleOpenSettingsModal('quiz');
                }}
              />
            </div>
          </div>
        )}

        {/* Paste Modal */}
        {showPasteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="p-6 max-w-2xl w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Paste Content</h3>
              <Textarea
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                placeholder="Paste your content here (YouTube URL, web link, text, etc.)"
                className="mb-4 min-h-[200px] text-base"
              />
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowPasteModal(false);
                    setPasteInput('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handlePasteContent} 
                  disabled={!pasteInput.trim()}
                  className="bg-black hover:bg-black/90"
                >
                  Add Content
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Generation Settings Modal */}
        <GenerationSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onGenerate={handleGenerateWithSettings}
          type={settingsType}
          isLoading={isGenerating}
        />
        
        </div> {/* Close Chat Panel */}
        </div> {/* Close Main Chat Container */}
      </div> {/* Close outermost container */}
    </TooltipProvider>
  );
}