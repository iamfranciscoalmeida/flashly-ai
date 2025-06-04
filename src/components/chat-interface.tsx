"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import {
  Send,
  Brain,
  FileQuestion,
  BookOpen,
  Network,
  Clock,
  Upload,
  Youtube,
  Type,
  Loader2,
  Sparkles,
} from "lucide-react";
import ContextInput from "./context-input";
import StudyMaterialsPanel from "./study-materials-panel";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  context_type: string;
  context_source?: string;
  context_blob?: string;
  created_at: string;
  updated_at: string;
}

interface ChatInterfaceProps {
  conversation: Conversation;
  onConversationUpdate: (conversation: Conversation) => void;
}

export default function ChatInterface({
  conversation,
  onConversationUpdate,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [showContextInput, setShowContextInput] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `/api/conversations/${conversation.id}/messages`,
      );
      const data = await response.json();
      if (response.ok) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setLoading(true);

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await fetch(
        `/api/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: userMessage }),
        },
      );

      const data = await response.json();
      if (response.ok) {
        // Refresh messages to get the actual saved messages
        await fetchMessages();

        // Auto-generate title if this is the first message
        if (messages.length === 0) {
          generateTitle();
        }
      } else {
        console.error("Error sending message:", data.error);
        // Remove the temporary message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove the temporary message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const generateTitle = async () => {
    try {
      const response = await fetch(
        `/api/conversations/${conversation.id}/title`,
        {
          method: "POST",
        },
      );
      const data = await response.json();
      if (response.ok) {
        const updatedConversation = { ...conversation, title: data.title };
        onConversationUpdate(updatedConversation);
      }
    } catch (error) {
      console.error("Error generating title:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleContextUpdate = (
    contextType: string,
    contextSource: string,
    contextBlob: string,
  ) => {
    const updatedConversation = {
      ...conversation,
      context_type: contextType,
      context_source: contextSource,
      context_blob: contextBlob,
    };
    onConversationUpdate(updatedConversation);
    setShowContextInput(false);
  };

  const getContextIcon = () => {
    switch (conversation.context_type) {
      case "file":
        return <Upload className="h-4 w-4" />;
      case "youtube":
        return <Youtube className="h-4 w-4" />;
      case "text":
        return <Type className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{conversation.title}</h2>
            {conversation.context_type !== "none" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {getContextIcon()}
                <span className="capitalize">{conversation.context_type}</span>
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowContextInput(!showContextInput)}
            >
              Add Context
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMaterials(!showMaterials)}
              className="flex items-center gap-1"
            >
              <Sparkles className="h-4 w-4" />
              Materials
            </Button>
          </div>
        </div>

        {/* Context Input Panel */}
        {showContextInput && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <ContextInput
              conversationId={conversation.id}
              onContextUpdate={handleContextUpdate}
              onClose={() => setShowContextInput(false)}
            />
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className={`flex flex-col ${showMaterials ? "flex-1" : "w-full"}`}>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-blue-50 p-4 rounded-lg inline-block">
                    <Brain className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-blue-800">
                      Start your AI-powered study session! Ask questions,
                      request explanations, or generate study materials.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 p-3 rounded-lg flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Action Buttons */}
          <div className="border-t p-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMaterials(true)}
                className="flex items-center gap-1"
              >
                <Brain className="h-4 w-4" />
                Flashcards
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMaterials(true)}
                className="flex items-center gap-1"
              >
                <FileQuestion className="h-4 w-4" />
                Quiz
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMaterials(true)}
                className="flex items-center gap-1"
              >
                <BookOpen className="h-4 w-4" />
                Summary
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMaterials(true)}
                className="flex items-center gap-1"
              >
                <Network className="h-4 w-4" />
                Mind Map
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMaterials(true)}
                className="flex items-center gap-1"
              >
                <Clock className="h-4 w-4" />
                Timeline
              </Button>
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question or request help with your studies..."
                className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                disabled={loading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || loading}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Study Materials Panel */}
        {showMaterials && (
          <div className="w-96 border-l bg-gray-50">
            <StudyMaterialsPanel
              conversationId={conversation.id}
              onClose={() => setShowMaterials(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
