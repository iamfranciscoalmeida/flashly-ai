"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardNavbar from "@/components/dashboard-navbar";
import ChatInterface from "@/components/chat-interface";
import ConversationList from "@/components/conversation-list";
import { createClient } from "../../../supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  context_type: string;
  created_at: string;
  updated_at: string;
  folders?: {
    id: string;
    name: string;
    icon?: string;
  };
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/sign-in");
        return;
      }
      setUser(user);
      await fetchConversations();
      setLoading(false);
    };

    checkAuth();
  }, [supabase, router]);

  useEffect(() => {
    const conversationId = searchParams.get("id");
    if (conversationId && conversations.length > 0) {
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation) {
        setSelectedConversation(conversation);
      }
    }
  }, [searchParams, conversations]);

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations");
      const data = await response.json();
      if (response.ok) {
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "New Conversation",
          context_type: "none",
        }),
      });

      const data = await response.json();
      if (response.ok) {
        const newConversation = data.conversation;
        setConversations((prev) => [newConversation, ...prev]);
        setSelectedConversation(newConversation);
        router.push(`/chat?id=${newConversation.id}`);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    router.push(`/chat?id=${conversation.id}`);
  };

  const handleConversationUpdate = (updatedConversation: Conversation) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === updatedConversation.id ? updatedConversation : c,
      ),
    );
    if (selectedConversation?.id === updatedConversation.id) {
      setSelectedConversation(updatedConversation);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
          {/* Conversation List Sidebar */}
          <div className="lg:col-span-1 bg-card rounded-lg border p-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Conversations</h2>
              <Button
                size="sm"
                onClick={handleNewConversation}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New</span>
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ConversationList
                conversations={conversations}
                selectedConversation={selectedConversation}
                onSelectConversation={handleSelectConversation}
              />
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3 bg-card rounded-lg border overflow-hidden flex flex-col">
            {selectedConversation ? (
              <ChatInterface
                conversation={selectedConversation}
                onConversationUpdate={handleConversationUpdate}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    Start a New Conversation
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Select a conversation or create a new one to begin your
                    AI-powered study session.
                  </p>
                  <Button
                    onClick={handleNewConversation}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New Conversation
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
