'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Sparkles, 
  Download, 
  RefreshCw, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Brain
} from 'lucide-react';
import { SectionSelectionModal, DocumentSection, DocumentAnalysis } from './section-selection-modal';
import { EnhancedStudyContentDisplay, TieredSummaryContent, StructuredNotesContent } from './enhanced-study-content-display';

export type ContentType = 'tiered-summary' | 'structured-notes';
export type SummaryTier = 'tldr' | 'detailed' | 'exam-ready';
export type NotesFormat = 'outline' | 'cornell' | 'mindmap' | 'bullet';

interface GenerationOptions {
  tier?: SummaryTier;
  format?: NotesFormat;
  difficulty?: 'easy' | 'medium' | 'hard';
  selectedSections?: DocumentSection[];
  forceRegenerate?: boolean;
}

interface GenerationResult {
  id: string;
  content: TieredSummaryContent | StructuredNotesContent;
  type: ContentType;
  metadata: {
    processingStrategy: string;
    tokensUsed: number;
    processingTime: number;
    cached: boolean;
    cacheKey?: string;
  };
}

interface EnhancedStudyGeneratorProps {
  content: string;
  documentId?: string;
  sessionId?: string;
  moduleId?: string;
  onContentGenerated?: (type: ContentType, result: GenerationResult) => void;
  className?: string;
}

export function EnhancedStudyGenerator({
  content,
  documentId,
  sessionId,
  moduleId,
  onContentGenerated,
  className
}: EnhancedStudyGeneratorProps) {
  const [activeTab, setActiveTab] = useState<ContentType>('tiered-summary');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysis | null>(null);
  const [currentOptions, setCurrentOptions] = useState<GenerationOptions>({});
  const [generatedContent, setGeneratedContent] = useState<{
    [key in ContentType]?: GenerationResult;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const generateContent = async (
    type: ContentType,
    options: GenerationOptions = {}
  ) => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/study/enhanced-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          type,
          options,
          documentId,
          sessionId,
          moduleId
        })
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      if (data.requiresUserInput) {
        // Document requires section selection
        setDocumentAnalysis(data.analysis);
                 setCurrentOptions(options);
        setShowSectionModal(true);
        return;
      }

      if (data.success && data.data) {
        const result: GenerationResult = data.data;
        setGeneratedContent(prev => ({
          ...prev,
          [type]: result
        }));
        onContentGenerated?.(type, result);
      }

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate content');
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleSectionSelection = async (selectedSections: DocumentSection[]) => {
    setShowSectionModal(false);
    const options = { ...currentOptions, selectedSections };
    await generateContent(activeTab, options);
  };

  const handleAutoProcess = async () => {
    setShowSectionModal(false);
    const options = { ...currentOptions, forceStrategy: 'auto-chunk' };
    await generateContent(activeTab, options);
  };

  const handleRegenerate = async (type: ContentType) => {
    const options = { ...currentOptions, forceRegenerate: true };
    await generateContent(type, options);
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'txt' | 'md', type: ContentType) => {
    const result = generatedContent[type];
    if (!result) return;

    // Create downloadable content
    const content = JSON.stringify(result.content, null, 2);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-${type}-${Date.now()}.${format === 'txt' ? 'txt' : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderSummaryGenerator = () => (
    <div className="space-y-6">
      {/* Tier Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Summary Tier</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { 
              tier: 'tldr' as SummaryTier, 
              label: 'TL;DR', 
              description: 'Quick overview (~100 words)',
              icon: Zap,
              color: 'text-green-600'
            },
            { 
              tier: 'detailed' as SummaryTier, 
              label: 'Detailed', 
              description: 'Comprehensive summary (~500 words)',
              icon: FileText,
              color: 'text-blue-600'
            },
            { 
              tier: 'exam-ready' as SummaryTier, 
              label: 'Exam Ready', 
              description: 'Study-focused content (~800 words)',
              icon: Brain,
              color: 'text-purple-600'
            }
          ].map(({ tier, label, description, icon: Icon, color }) => (
            <Card 
              key={tier}
              className={`cursor-pointer transition-all duration-200 ${
                currentOptions.tier === tier 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setCurrentOptions(prev => ({ ...prev, tier }))}
            >
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <span className="font-medium">{label}</span>
                </div>
                <p className="text-sm text-gray-600">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={() => generateContent('tiered-summary', currentOptions)}
        disabled={isGenerating}
        className="w-full h-12"
        size="lg"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Generating Summary...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Summary
          </>
        )}
      </Button>
    </div>
  );

  const renderNotesGenerator = () => (
    <div className="space-y-6">
      {/* Format Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Notes Format</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { 
              format: 'outline' as NotesFormat, 
              label: 'Outline', 
              description: 'Hierarchical structure with Roman numerals',
              icon: FileText
            },
            { 
              format: 'cornell' as NotesFormat, 
              label: 'Cornell Notes', 
              description: 'Notes, cues, and summary sections',
              icon: FileText
            },
            { 
              format: 'mindmap' as NotesFormat, 
              label: 'Mind Map', 
              description: 'Visual branching structure',
              icon: Brain
            },
            { 
              format: 'bullet' as NotesFormat, 
              label: 'Bullet Points', 
              description: 'Clean bullet point format',
              icon: FileText
            }
          ].map(({ format, label, description, icon: Icon }) => (
            <Card 
              key={format}
              className={`cursor-pointer transition-all duration-200 ${
                currentOptions.format === format 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setCurrentOptions(prev => ({ ...prev, format }))}
            >
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">{label}</span>
                </div>
                <p className="text-sm text-gray-600">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Difficulty Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Difficulty Level</h3>
        <div className="flex gap-2">
          {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
            <Button
              key={difficulty}
              variant={currentOptions.difficulty === difficulty ? 'default' : 'outline'}
              onClick={() => setCurrentOptions(prev => ({ ...prev, difficulty }))}
              className="capitalize"
            >
              {difficulty}
            </Button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={() => generateContent('structured-notes', currentOptions)}
        disabled={isGenerating || !currentOptions.format}
        className="w-full h-12"
        size="lg"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Generating Notes...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            Generate Notes
          </>
        )}
      </Button>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Enhanced Study Generator</h2>
        <p className="text-gray-600">
          Generate production-grade study materials with intelligent processing
        </p>
      </div>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Generating content...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentType)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tiered-summary" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Tiered Summary
            {generatedContent['tiered-summary'] && (
              <CheckCircle className="h-3 w-3 text-green-600" />
            )}
          </TabsTrigger>
          <TabsTrigger value="structured-notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Structured Notes
            {generatedContent['structured-notes'] && (
              <CheckCircle className="h-3 w-3 text-green-600" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tiered-summary" className="space-y-6">
          {generatedContent['tiered-summary'] ? (
            <EnhancedStudyContentDisplay
              type="summary"
              content={generatedContent['tiered-summary'].content as TieredSummaryContent}
                             metadata={{
                 tokensUsed: generatedContent['tiered-summary'].metadata.tokensUsed,
                 processingTime: generatedContent['tiered-summary'].metadata.processingTime,
                 cached: generatedContent['tiered-summary'].metadata.cached,
                 cacheKey: generatedContent['tiered-summary'].metadata.cacheKey,
                 sourceReferences: [],
                 keyTerms: []
               }}
              onRegenerate={() => handleRegenerate('tiered-summary')}
              onExport={(format) => handleExport(format, 'tiered-summary')}
              isRegenerating={isGenerating}
            />
          ) : (
            renderSummaryGenerator()
          )}
        </TabsContent>

        <TabsContent value="structured-notes" className="space-y-6">
          {generatedContent['structured-notes'] ? (
            <EnhancedStudyContentDisplay
              type="notes"
              content={generatedContent['structured-notes'].content as StructuredNotesContent}
              metadata={{
                tokensUsed: generatedContent['structured-notes'].metadata.tokensUsed,
                processingTime: generatedContent['structured-notes'].metadata.processingTime,
                cacheKey: generatedContent['structured-notes'].metadata.cacheKey,
                cached: generatedContent['structured-notes'].metadata.cached,
                sourceReferences: [],
                keyTerms: []
              }}
              onRegenerate={() => handleRegenerate('structured-notes')}
              onExport={(format) => handleExport(format, 'structured-notes')}
              isRegenerating={isGenerating}
            />
          ) : (
            renderNotesGenerator()
          )}
        </TabsContent>
      </Tabs>

      {/* Section Selection Modal */}
      <SectionSelectionModal
        open={showSectionModal}
        onOpenChange={setShowSectionModal}
        analysis={documentAnalysis!}
        onSectionSelect={handleSectionSelection}
        onAutoProcess={handleAutoProcess}
        isProcessing={isGenerating}
      />
    </div>
  );
} 