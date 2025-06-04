'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Sparkles, 
  Brain, 
  FileText, 
  StickyNote,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentGeneratorModalProps {
  type: 'flashcards' | 'quiz' | 'summary' | 'notes';
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (options: GenerateOptions) => void;
  isGenerating: boolean;
}

export interface GenerateOptions {
  quantity: number;
  difficulty: 'easy' | 'medium' | 'hard';
  pageRange?: {
    start: number;
    end: number;
  };
  focusAreas?: string[];
}

export function ContentGeneratorModal({
  type,
  isOpen,
  onClose,
  onGenerate,
  isGenerating
}: ContentGeneratorModalProps) {
  const [quantity, setQuantity] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [pageRangeEnabled, setPageRangeEnabled] = useState(false);
  const [pageRange, setPageRange] = useState({ start: 1, end: 10 });

  const typeConfig = {
    flashcards: {
      icon: Sparkles,
      title: 'Generate Flashcards',
      description: 'Create study flashcards from your content',
      quantityLabel: 'Number of flashcards',
      quantityOptions: [5, 10, 15, 20],
      color: 'text-purple-600'
    },
    quiz: {
      icon: Brain,
      title: 'Generate Quiz',
      description: 'Create practice questions to test your knowledge',
      quantityLabel: 'Number of questions',
      quantityOptions: [5, 10, 15, 20],
      color: 'text-blue-600'
    },
    summary: {
      icon: FileText,
      title: 'Generate Summary',
      description: 'Create a comprehensive summary of key concepts',
      quantityLabel: 'Summary length (words)',
      quantityOptions: [250, 500, 750, 1000],
      color: 'text-green-600'
    },
    notes: {
      icon: StickyNote,
      title: 'Generate Study Notes',
      description: 'Create organized study notes with key points',
      quantityLabel: 'Note sections',
      quantityOptions: [3, 5, 7, 10],
      color: 'text-orange-600'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  const handleGenerate = () => {
    const options: GenerateOptions = {
      quantity,
      difficulty,
      ...(pageRangeEnabled && { pageRange })
    };
    onGenerate(options);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", config.color)} />
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Quantity Selection */}
          <div className="space-y-3">
            <Label>{config.quantityLabel}</Label>
            <RadioGroup
              value={quantity.toString()}
              onValueChange={(value: string) => setQuantity(parseInt(value))}
            >
              <div className="grid grid-cols-2 gap-3">
                {config.quantityOptions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.toString()} id={`quantity-${option}`} />
                    <Label htmlFor={`quantity-${option}`} className="cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Difficulty Selection */}
          <div className="space-y-3">
            <Label>Difficulty Level</Label>
            <RadioGroup value={difficulty} onValueChange={setDifficulty as any}>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="easy" id="difficulty-easy" />
                  <Label htmlFor="difficulty-easy" className="cursor-pointer">
                    Easy
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="difficulty-medium" />
                  <Label htmlFor="difficulty-medium" className="cursor-pointer">
                    Medium
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hard" id="difficulty-hard" />
                  <Label htmlFor="difficulty-hard" className="cursor-pointer">
                    Hard
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Page Range Selection (optional) */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="page-range"
                checked={pageRangeEnabled}
                onChange={(e) => setPageRangeEnabled(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="page-range" className="cursor-pointer">
                Specify page range (optional)
              </Label>
            </div>
            {pageRangeEnabled && (
              <div className="space-y-2 pl-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="start-page" className="text-xs">Start page</Label>
                    <input
                      type="number"
                      id="start-page"
                      value={pageRange.start}
                      onChange={(e) => setPageRange({ ...pageRange, start: parseInt(e.target.value) || 1 })}
                      min="1"
                      className="w-full mt-1 px-3 py-1 border rounded-md"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="end-page" className="text-xs">End page</Label>
                    <input
                      type="number"
                      id="end-page"
                      value={pageRange.end}
                      onChange={(e) => setPageRange({ ...pageRange, end: parseInt(e.target.value) || 10 })}
                      min={pageRange.start}
                      className="w-full mt-1 px-3 py-1 border rounded-md"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Icon className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}