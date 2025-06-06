"use client";

import { useState, useEffect } from "react";
import { SmartCollectionWithStats } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  CreditCard,
  HelpCircle,
  FileText,
  MessageSquare,
  Play,
  Search,
  Filter,
  Shuffle,
  X,
  Loader2
} from "lucide-react";

interface CollectionItem {
  id: string;
  item_type: 'flashcard' | 'quiz' | 'document' | 'chat_content';
  content: any;
  source_type: string;
  relevance_score: number;
}

interface CollectionDetailModalProps {
  collection: SmartCollectionWithStats | null;
  isOpen: boolean;
  onClose: () => void;
  onStudySession: (collection: SmartCollectionWithStats, type: 'flashcards' | 'quiz' | 'mixed') => void;
}

export default function CollectionDetailModal({
  collection,
  isOpen,
  onClose,
  onStudySession
}: CollectionDetailModalProps) {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (collection && isOpen) {
      fetchCollectionItems();
    }
  }, [collection, isOpen]);

  const fetchCollectionItems = async () => {
    if (!collection) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/collections/${collection.id}/items`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch collection items');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching collection items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = (type: CollectionItem['item_type']) => {
    return items
      .filter(item => item.item_type === type)
      .filter(item => 
        searchQuery === "" || 
        JSON.stringify(item.content).toLowerCase().includes(searchQuery.toLowerCase())
      );
  };

  const flashcardItems = filterItems('flashcard');
  const quizItems = filterItems('quiz');
  const documentItems = filterItems('document');
  const chatItems = filterItems('chat_content');

  const handleStudyNow = (type: 'flashcards' | 'quiz' | 'mixed') => {
    if (collection) {
      onStudySession(collection, type);
      onClose();
    }
  };

  if (!collection) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{collection.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{collection.subject || 'General'}</Badge>
                {collection.topic && (
                  <Badge variant="outline">{collection.topic}</Badge>
                )}
                <Badge 
                  variant="outline" 
                  className="text-xs"
                >
                  {collection.total_items} items
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="flashcards" className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  Cards ({collection.flashcard_count})
                </TabsTrigger>
                <TabsTrigger value="quizzes" className="flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                  Quizzes ({collection.quiz_count})
                </TabsTrigger>
                <TabsTrigger value="content" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Content
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Button 
                  onClick={() => handleStudyNow('mixed')}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Study Now
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleStudyNow('flashcards')}
                  disabled={collection.flashcard_count === 0}
                >
                  <CreditCard className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleStudyNow('quiz')}
                  disabled={collection.quiz_count === 0}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="overview" className="h-full">
                <div className="space-y-6">
                  {/* Collection stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <CreditCard className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                      <div className="text-2xl font-bold text-blue-600">
                        {collection.flashcard_count}
                      </div>
                      <div className="text-sm text-gray-600">Flashcards</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <HelpCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
                      <div className="text-2xl font-bold text-green-600">
                        {collection.quiz_count}
                      </div>
                      <div className="text-sm text-gray-600">Quizzes</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <FileText className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                      <div className="text-2xl font-bold text-purple-600">
                        {collection.document_count}
                      </div>
                      <div className="text-sm text-gray-600">Documents</div>
                    </div>
                    <div className="text-center p-4 bg-teal-50 rounded-lg">
                      <MessageSquare className="h-6 w-6 mx-auto mb-2 text-teal-600" />
                      <div className="text-2xl font-bold text-teal-600">
                        {collection.chat_content_count}
                      </div>
                      <div className="text-sm text-gray-600">Chat Content</div>
                    </div>
                  </div>

                  {/* AI Confidence */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">AI Organization Details</h4>
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Confidence Score: </span>
                        <span className="font-medium">
                          {Math.round(collection.ai_confidence_score * 100)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Auto-organized: </span>
                        <span className="font-medium">
                          {collection.auto_organized ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="flashcards" className="h-full overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search flashcards..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {flashcardItems.map((item, index) => (
                        <div key={item.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm text-gray-500">Card {index + 1}</span>
                            <Badge variant="outline" className="text-xs">
                              Score: {Math.round(item.relevance_score * 100)}%
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="font-medium text-sm">Q: </span>
                              <span className="text-sm">{item.content.question}</span>
                            </div>
                            <div>
                              <span className="font-medium text-sm">A: </span>
                              <span className="text-sm text-gray-600">{item.content.answer}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {flashcardItems.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          {searchQuery ? 'No flashcards found matching your search.' : 'No flashcards in this collection.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="quizzes" className="h-full overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search quiz questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {quizItems.map((item, index) => (
                        <div key={item.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm text-gray-500">Question {index + 1}</span>
                            <Badge variant="outline" className="text-xs">
                              Score: {Math.round(item.relevance_score * 100)}%
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="font-medium text-sm">{item.content.question}</div>
                            <div className="space-y-1">
                              {item.content.options?.map((option: string, optIndex: number) => (
                                <div 
                                  key={optIndex} 
                                  className={`text-sm px-2 py-1 rounded ${
                                    option === item.content.correct 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-50'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIndex)}. {option}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {quizItems.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          {searchQuery ? 'No quiz questions found matching your search.' : 'No quiz questions in this collection.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="content" className="h-full overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search all content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...documentItems, ...chatItems].map((item, index) => (
                        <div key={item.id} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {item.item_type === 'document' ? (
                              <FileText className="h-4 w-4 text-blue-500" />
                            ) : (
                              <MessageSquare className="h-4 w-4 text-teal-500" />
                            )}
                            <span className="text-sm font-medium capitalize">
                              {item.item_type.replace('_', ' ')}
                            </span>
                            <Badge variant="outline" className="text-xs ml-auto">
                              Score: {Math.round(item.relevance_score * 100)}%
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            {typeof item.content === 'string' 
                              ? item.content.substring(0, 200) + (item.content.length > 200 ? '...' : '')
                              : JSON.stringify(item.content).substring(0, 200) + '...'
                            }
                          </div>
                        </div>
                      ))}
                      
                      {[...documentItems, ...chatItems].length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          {searchQuery ? 'No content found matching your search.' : 'No additional content in this collection.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
} 