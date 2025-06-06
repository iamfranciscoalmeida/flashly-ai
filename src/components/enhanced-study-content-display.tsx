'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  BookOpen,
  Key,
  ExternalLink,
  CheckCircle,
  RefreshCw,
  Share
} from 'lucide-react';

export interface TieredSummaryContent {
  tldr: string;
  detailed: string;
  examReady: string;
  sourceReferences: string[];
  keyTerms: string[];
  estimatedReadTime: number;
}

export interface StructuredNotesContent {
  content: string;
  format: 'outline' | 'cornell' | 'mindmap' | 'bullet';
  sections: Array<{
    title: string;
    content: string;
    sourceReference?: string;
  }>;
  keyPoints: string[];
  reviewQuestions: string[];
}

export interface StudyContentMetadata {
  tokensUsed: number;
  processingTime: number;
  cached: boolean;
  cacheKey: string;
  sourceReferences: string[];
  keyTerms: string[];
  estimatedReadTime?: number;
}

interface EnhancedStudyContentDisplayProps {
  type: 'summary' | 'notes';
  content: TieredSummaryContent | StructuredNotesContent;
  metadata: StudyContentMetadata;
  onRegenerate?: () => void;
  onExport?: (format: 'pdf' | 'docx' | 'txt' | 'md') => void;
  isRegenerating?: boolean;
}

export function EnhancedStudyContentDisplay({
  type,
  content,
  metadata,
  onRegenerate,
  onExport,
  isRegenerating = false
}: EnhancedStudyContentDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeTier, setActiveTier] = useState<'tldr' | 'detailed' | 'examReady'>('detailed');
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedStates({ ...copiedStates, [id]: true });
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const renderSummaryContent = (summaryContent: TieredSummaryContent) => {
    const tiers = [
      { 
        id: 'tldr', 
        label: 'TL;DR', 
        description: 'Quick overview', 
        icon: Zap,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        content: summaryContent.tldr
      },
      { 
        id: 'detailed', 
        label: 'Detailed', 
        description: 'Comprehensive summary', 
        icon: BookOpen,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        content: summaryContent.detailed
      },
      { 
        id: 'examReady', 
        label: 'Exam Ready', 
        description: 'Study-focused content', 
        icon: FileText,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        content: summaryContent.examReady
      }
    ] as const;

    return (
      <div className="space-y-6">
        {/* Tier Selection */}
        <Tabs value={activeTier} onValueChange={(value) => setActiveTier(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            {tiers.map((tier) => {
              const Icon = tier.icon;
              return (
                <TabsTrigger 
                  key={tier.id} 
                  value={tier.id}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {tier.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tiers.map((tier) => (
            <TabsContent key={tier.id} value={tier.id} className="mt-4">
              <Card className={tier.bgColor}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <tier.icon className={`h-5 w-5 ${tier.color}`} />
                      <CardTitle>{tier.label} Summary</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(tier.content, tier.id)}
                        className="flex items-center gap-1"
                      >
                        {copiedStates[tier.id] ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedStates[tier.id] ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{tier.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="study-content">
                    <div className="prose prose-sm max-w-none leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {tier.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Key Terms */}
        {summaryContent.keyTerms.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger 
              className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => toggleSection('key-terms')}
            >
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-orange-600" />
                <span className="font-medium">Key Terms ({summaryContent.keyTerms.length})</span>
              </div>
              {expandedSections.has('key-terms') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="flex flex-wrap gap-2">
                {summaryContent.keyTerms.map((term, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {term}
                  </Badge>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  };

  const renderNotesContent = (notesContent: StructuredNotesContent) => {
    return (
      <div className="space-y-6">
        {/* Format Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {notesContent.format} Format
          </Badge>
          <Badge variant="secondary">
            {notesContent.sections.length} Section{notesContent.sections.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Study Notes
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(notesContent.content, 'main-notes')}
                className="flex items-center gap-1"
              >
                {copiedStates['main-notes'] ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copiedStates['main-notes'] ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="study-content">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {notesContent.content}
                  </ReactMarkdown>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Sections */}
        {notesContent.sections.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Sections</h3>
            {notesContent.sections.map((section, index) => (
              <Collapsible key={index}>
                <CollapsibleTrigger 
                  className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSection(`section-${index}`)}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{section.title}</span>
                    {section.sourceReference && (
                      <Badge variant="outline" className="text-xs">
                        {section.sourceReference}
                      </Badge>
                    )}
                  </div>
                  {expandedSections.has(`section-${index}`) ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="pl-6 study-content">
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {section.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Key Points */}
        {notesContent.keyPoints.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger 
              className="flex items-center justify-between w-full p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
              onClick={() => toggleSection('key-points')}
            >
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Key Points ({notesContent.keyPoints.length})</span>
              </div>
              {expandedSections.has('key-points') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <ul className="space-y-2">
                {notesContent.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Review Questions */}
        {notesContent.reviewQuestions.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger 
              className="flex items-center justify-between w-full p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              onClick={() => toggleSection('review-questions')}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="font-medium">Review Questions ({notesContent.reviewQuestions.length})</span>
              </div>
              {expandedSections.has('review-questions') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <ol className="space-y-3">
                {notesContent.reviewQuestions.map((question, index) => (
                  <li key={index} className="text-sm">
                    <span className="font-medium text-green-700">{index + 1}. </span>
                    {question}
                  </li>
                ))}
              </ol>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold capitalize">
            {type === 'summary' ? 'Study Summary' : 'Study Notes'}
          </h2>
          {metadata.cached && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Cached Result
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRegenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </Button>
          )}

          {onExport && (
            <div className="flex items-center gap-1">
              {['pdf', 'docx', 'txt', 'md'].map((format) => (
                <Button
                  key={format}
                  variant="outline"
                  size="sm"
                  onClick={() => onExport(format as any)}
                  className="flex items-center gap-1 text-xs"
                >
                  <Download className="h-3 w-3" />
                  {format.toUpperCase()}
                </Button>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <Share className="h-3 w-3" />
            Share
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Tokens Used</span>
            </div>
            <p className="text-lg font-bold text-blue-600 mt-1">
              {metadata.tokensUsed.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Processing Time</span>
            </div>
            <p className="text-lg font-bold text-purple-600 mt-1">
              {(metadata.processingTime / 1000).toFixed(1)}s
            </p>
          </CardContent>
        </Card>

        {metadata.estimatedReadTime && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Read Time</span>
              </div>
              <p className="text-lg font-bold text-green-600 mt-1">
                {metadata.estimatedReadTime}min
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">References</span>
            </div>
            <p className="text-lg font-bold text-orange-600 mt-1">
              {metadata.sourceReferences.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Content */}
      {type === 'summary' 
        ? renderSummaryContent(content as TieredSummaryContent)
        : renderNotesContent(content as StructuredNotesContent)
      }

      {/* Source References */}
      {metadata.sourceReferences.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger 
            className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => toggleSection('source-references')}
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-gray-600" />
              <span className="font-medium">Source References ({metadata.sourceReferences.length})</span>
            </div>
            {expandedSections.has('source-references') ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <ul className="space-y-1">
              {metadata.sourceReferences.map((ref, index) => (
                <li key={index} className="text-sm text-gray-600">
                  • {ref}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
} 