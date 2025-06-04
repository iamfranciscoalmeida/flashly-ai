"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import {
  MessageSquare,
  Search,
  FileText,
  Youtube,
  Type,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
}

const getContextIcon = (contextType: string) => {
  switch (contextType) {
    case "file":
      return <FileText className="h-3 w-3" />;
    case "youtube":
      return <Youtube className="h-3 w-3" />;
    case "text":
      return <Type className="h-3 w-3" />;
    default:
      return <MessageSquare className="h-3 w-3" />;
  }
};

const getContextColor = (contextType: string) => {
  switch (contextType) {
    case "file":
      return "bg-blue-100 text-blue-800";
    case "youtube":
      return "bg-red-100 text-red-800";
    case "text":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">
                {searchTerm ? "No conversations found" : "No conversations yet"}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <Button
                key={conversation.id}
                variant={
                  selectedConversation?.id === conversation.id
                    ? "default"
                    : "ghost"
                }
                className="w-full justify-start h-auto p-3 text-left"
                onClick={() => onSelectConversation(conversation)}
              >
                <div className="flex flex-col items-start w-full">
                  <div className="flex items-center justify-between w-full mb-1">
                    <h3 className="font-medium text-sm truncate flex-1">
                      {conversation.title}
                    </h3>
                    <Badge
                      variant="secondary"
                      className={`ml-2 text-xs ${getContextColor(conversation.context_type)}`}
                    >
                      {getContextIcon(conversation.context_type)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between w-full">
                    {conversation.folders && (
                      <span className="text-xs text-muted-foreground truncate">
                        {conversation.folders.name}
                      </span>
                    )}
                    <div className="flex items-center text-xs text-muted-foreground ml-auto">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDistanceToNow(new Date(conversation.updated_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </div>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
