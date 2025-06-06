"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartCollectionWithStats } from "@/types/database";
import { 
  BookOpen, 
  GraduationCap, 
  FileText, 
  MessageSquare,
  Sparkles,
  Clock,
  TrendingUp,
  Play,
  MoreHorizontal,
  Loader2,
  Search,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Calculator,
  FlaskConical,
  Brain,
  Palette
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface SmartCollectionsGridProps {
  collections: SmartCollectionWithStats[];
  loading?: boolean;
  onCollectionClick: (collection: SmartCollectionWithStats) => void;
  onOrganizeContent: () => void;
  onCreateCollection?: () => void;
}

// Enhanced subject themes with better organization
const SUBJECT_THEMES = {
  'Mathematics': { color: 'blue', icon: Calculator, bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  'Science': { color: 'green', icon: FlaskConical, bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  'Biology': { color: 'emerald', icon: FlaskConical, bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  'Chemistry': { color: 'purple', icon: FlaskConical, bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  'Physics': { color: 'indigo', icon: FlaskConical, bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  'Computer Science': { color: 'slate', icon: Brain, bgColor: 'bg-slate-50', borderColor: 'border-slate-200' },
  'Machine Learning': { color: 'violet', icon: Brain, bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
  'History': { color: 'amber', icon: BookOpen, bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  'Literature': { color: 'rose', icon: BookOpen, bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
  'Art': { color: 'pink', icon: Palette, bgColor: 'bg-pink-50', borderColor: 'border-pink-200' },
  'General': { color: 'gray', icon: BookOpen, bgColor: 'bg-gray-50', borderColor: 'border-gray-200' }
} as const;

// Icon mapping for different subjects
const getSubjectIcon = (icon: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'book': <BookOpen className="h-5 w-5" />,
    'book-open': <BookOpen className="h-5 w-5" />,
    'calculator': <GraduationCap className="h-5 w-5" />,
    'flask': <GraduationCap className="h-5 w-5" />,
    'dna': <GraduationCap className="h-5 w-5" />,
    'atom': <GraduationCap className="h-5 w-5" />,
    'scroll': <FileText className="h-5 w-5" />,
    'computer': <GraduationCap className="h-5 w-5" />,
    'briefcase': <GraduationCap className="h-5 w-5" />,
    'palette': <GraduationCap className="h-5 w-5" />,
    'music': <GraduationCap className="h-5 w-5" />,
    'heart-pulse': <GraduationCap className="h-5 w-5" />,
    'cog': <GraduationCap className="h-5 w-5" />,
    'scale': <GraduationCap className="h-5 w-5" />,
    'brain': <GraduationCap className="h-5 w-5" />,
    'thinking': <GraduationCap className="h-5 w-5" />,
    'languages': <GraduationCap className="h-5 w-5" />
  };
  
  return iconMap[icon] || <BookOpen className="h-5 w-5" />;
};

// Color theme mapping
const getColorTheme = (theme: string) => {
  const colorMap: Record<string, string> = {
    'blue': 'bg-blue-500 hover:bg-blue-600',
    'green': 'bg-green-500 hover:bg-green-600',
    'emerald': 'bg-emerald-500 hover:bg-emerald-600',
    'purple': 'bg-purple-500 hover:bg-purple-600',
    'indigo': 'bg-indigo-500 hover:bg-indigo-600',
    'amber': 'bg-amber-500 hover:bg-amber-600',
    'rose': 'bg-rose-500 hover:bg-rose-600',
    'pink': 'bg-pink-500 hover:bg-pink-600',
    'slate': 'bg-slate-500 hover:bg-slate-600',
    'orange': 'bg-orange-500 hover:bg-orange-600',
    'violet': 'bg-violet-500 hover:bg-violet-600',
    'cyan': 'bg-cyan-500 hover:bg-cyan-600',
    'red': 'bg-red-500 hover:bg-red-600',
    'gray': 'bg-gray-500 hover:bg-gray-600',
    'stone': 'bg-stone-500 hover:bg-stone-600',
    'teal': 'bg-teal-500 hover:bg-teal-600',
    'neutral': 'bg-neutral-500 hover:bg-neutral-600'
  };
  
  return colorMap[theme] || 'bg-blue-500 hover:bg-blue-600';
};

// Format last studied time
const formatLastStudied = (timestamp: string | null) => {
  if (!timestamp) return 'Never studied';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return date.toLocaleDateString();
};

const SmartCollectionsGrid: React.FC<SmartCollectionsGridProps> = ({
  collections,
  loading = false,
  onCollectionClick,
  onOrganizeContent,
  onCreateCollection
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  // Group collections by subject
  const collectionsBySubject = useMemo(() => {
    const filtered = collections.filter(collection =>
      collection.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.topic?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped = filtered.reduce((acc, collection) => {
      const subject = collection.subject || 'General';
      if (!acc[subject]) {
        acc[subject] = [];
      }
      acc[subject].push(collection);
      return acc;
    }, {} as Record<string, SmartCollectionWithStats[]>);

    // Sort subjects alphabetically, but keep General at the end
    const sortedSubjects = Object.keys(grouped).sort((a, b) => {
      if (a === 'General') return 1;
      if (b === 'General') return -1;
      return a.localeCompare(b);
    });

    return sortedSubjects.map(subject => ({
      subject,
      collections: grouped[subject].sort((a, b) => b.total_items - a.total_items)
    }));
  }, [collections, searchTerm]);

  const toggleSubject = (subject: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subject)) {
      newExpanded.delete(subject);
    } else {
      newExpanded.add(subject);
    }
    setExpandedSubjects(newExpanded);
  };

  // Auto-expand subjects when there are few collections or when searching
  const shouldShowExpanded = (subject: string) => {
    return expandedSubjects.has(subject) || 
           collectionsBySubject.length <= 3 || 
           searchTerm.length > 0;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Study Collections</h2>
          <p className="text-muted-foreground">
            AI-organized study materials by subject and topic
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={onOrganizeContent}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Reorganize
          </Button>
          {onCreateCollection && (
            <Button onClick={onCreateCollection} size="sm">
              Create Collection
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search collections by title, subject, or topic..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Subject-based Organization */}
      {collectionsBySubject.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No matching collections' : 'No Collections Yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm 
              ? 'Try adjusting your search terms or clear the search to see all collections.'
              : 'Start by uploading documents or creating flashcards, then organize your content with AI.'
            }
          </p>
          {searchTerm && (
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {collectionsBySubject.map(({ subject, collections: subjectCollections }) => {
            const theme = SUBJECT_THEMES[subject as keyof typeof SUBJECT_THEMES] || SUBJECT_THEMES.General;
            const Icon = theme.icon;
            const isExpanded = shouldShowExpanded(subject);
            const totalItems = subjectCollections.reduce((sum, col) => sum + col.total_items, 0);

            return (
              <div key={subject} className={`rounded-lg border-2 ${theme.borderColor} ${theme.bgColor}`}>
                {/* Subject Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-opacity-80 transition-colors"
                  onClick={() => toggleSubject(subject)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {isExpanded ? (
                        <FolderOpen className="h-5 w-5 text-gray-600" />
                      ) : (
                        <Folder className="h-5 w-5 text-gray-600" />
                      )}
                      <Icon className={`h-5 w-5 text-${theme.color}-600`} />
                      <div>
                        <h3 className="font-semibold text-gray-900">{subject}</h3>
                        <p className="text-sm text-gray-600">
                          {subjectCollections.length} collection{subjectCollections.length !== 1 ? 's' : ''}, {totalItems} item{totalItems !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className={`bg-${theme.color}-100 text-${theme.color}-700`}>
                        {subjectCollections.length}
                      </Badge>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Collections Grid */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {subjectCollections.map((collection) => (
                        <Card 
                          key={collection.id}
                          className="cursor-pointer hover:shadow-md transition-shadow bg-white border-gray-200"
                          onClick={() => onCollectionClick(collection)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-sm font-medium text-gray-900 mb-1">
                                  {collection.title}
                                </CardTitle>
                                {collection.topic && (
                                  <p className="text-xs text-gray-500 mb-2">{collection.topic}</p>
                                )}
                              </div>
                              <Icon className={`h-4 w-4 text-${theme.color}-500 flex-shrink-0 ml-2`} />
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-1 mb-3">
                              {collection.flashcard_count > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {collection.flashcard_count} cards
                                </Badge>
                              )}
                              {collection.quiz_count > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {collection.quiz_count} quizzes
                                </Badge>
                              )}
                              {collection.document_count > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {collection.document_count} docs
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{collection.total_items} total items</span>
                              {collection.ai_confidence_score && (
                                <span className="text-blue-600">
                                  {Math.round(collection.ai_confidence_score * 100)}% confidence
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SmartCollectionsGrid; 