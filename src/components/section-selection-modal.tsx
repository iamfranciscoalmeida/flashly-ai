'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Clock, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Zap
} from 'lucide-react';

export interface DocumentSection {
  title: string;
  startPage?: number;
  endPage?: number;
  tokenCount: number;
  excerpt: string;
}

export interface DocumentAnalysis {
  totalTokens: number;
  requiresChunking: boolean;
  suggestedSections?: DocumentSection[];
  processingStrategy: 'single' | 'user-selection' | 'auto-chunk' | 'hybrid';
}

interface SectionSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: DocumentAnalysis;
  onSectionSelect: (selectedSections: DocumentSection[]) => void;
  onAutoProcess: () => void;
  isProcessing?: boolean;
}

export function SectionSelectionModal({
  open,
  onOpenChange,
  analysis,
  onSectionSelect,
  onAutoProcess,
  isProcessing = false
}: SectionSelectionModalProps) {
  const [selectedSections, setSelectedSections] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const suggestedSections = analysis.suggestedSections || [];
  const totalSelectedTokens = Array.from(selectedSections)
    .reduce((sum, index) => sum + suggestedSections[index].tokenCount, 0);

  const handleSectionToggle = (index: number) => {
    const newSelected = new Set(selectedSections);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSections(newSelected);
    setSelectAll(newSelected.size === suggestedSections.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedSections(new Set());
    } else {
      setSelectedSections(new Set(suggestedSections.map((_, index) => index)));
    }
    setSelectAll(!selectAll);
  };

  const handleProcessSelected = () => {
    const selected = Array.from(selectedSections).map(index => suggestedSections[index]);
    onSectionSelect(selected);
  };

  const formatTokenCount = (tokens: number) => {
    if (tokens > 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const getTokensColor = (tokens: number) => {
    if (tokens > 4000) return 'text-red-600';
    if (tokens > 2000) return 'text-yellow-600';
    return 'text-green-600';
  };

  const estimatedProcessingTime = Math.ceil(totalSelectedTokens / 1000) * 10; // ~10 seconds per 1K tokens

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Document Section Selection
          </DialogTitle>
          <DialogDescription>
            This document is large ({formatTokenCount(analysis.totalTokens)} tokens). 
            Select specific sections to process for better quality results, or let us process it automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Total Sections</span>
                </div>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {suggestedSections.length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Selected</span>
                </div>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {selectedSections.size}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Tokens</span>
                </div>
                <p className={`text-2xl font-bold mt-1 ${getTokensColor(totalSelectedTokens)}`}>
                  {formatTokenCount(totalSelectedTokens)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Est. Time</span>
                </div>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {estimatedProcessingTime}s
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Section Selection */}
          <div className="space-y-4">
            {/* Select All Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Select all sections ({suggestedSections.length})
                </label>
              </div>
              {selectedSections.size > 0 && (
                <Badge variant="outline">
                  {selectedSections.size} of {suggestedSections.length} selected
                </Badge>
              )}
            </div>

            {/* Sections List */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {suggestedSections.map((section, index) => (
                  <Card 
                    key={index} 
                    className={`transition-all duration-200 ${
                      selectedSections.has(index) 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id={`section-${index}`}
                            checked={selectedSections.has(index)}
                            onCheckedChange={() => handleSectionToggle(index)}
                          />
                          <div className="flex-1">
                            <CardTitle className="text-sm font-medium">
                              {section.title}
                            </CardTitle>
                            {(section.startPage || section.endPage) && (
                              <p className="text-xs text-gray-500 mt-1">
                                Pages {section.startPage || 'N/A'} - {section.endPage || 'N/A'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getTokensColor(section.tokenCount)}`}
                          >
                            {formatTokenCount(section.tokenCount)} tokens
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {section.excerpt}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <Separator className="my-4" />

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 text-left">
            {totalSelectedTokens > 8000 && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                Large selection may take longer to process
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onAutoProcess}
              disabled={isProcessing}
            >
              <Zap className="h-4 w-4 mr-2" />
              Auto Process
            </Button>
            
            <Button
              onClick={handleProcessSelected}
              disabled={selectedSections.size === 0 || isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Process Selected ({selectedSections.size})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 