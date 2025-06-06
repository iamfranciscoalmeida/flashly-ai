"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Settings,
  RefreshCw
} from "lucide-react";

interface OrganizationResult {
  collections: any[];
  items_organized: number;
  success: boolean;
  error?: string;
}

interface ContentOrganizerProps {
  onOrganizationComplete: (result: OrganizationResult) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function ContentOrganizer({
  onOrganizationComplete,
  onClose,
  isOpen
}: ContentOrganizerProps) {
  const [organizing, setOrganizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string>("");
  const [result, setResult] = useState<OrganizationResult | null>(null);
  const [options, setOptions] = useState({
    clear_existing: true,
    confidence_threshold: 0.7,
    max_collections: 15,
    merge_similar: true
  });

  const startOrganization = async () => {
    setOrganizing(true);
    setProgress(0);
    setStage("Analyzing your content...");
    setResult(null);

    try {
      // Simulate progress updates
      const progressSteps = [
        { progress: 20, stage: "Fetching your study materials..." },
        { progress: 40, stage: "AI analyzing content patterns..." },
        { progress: 60, stage: "Identifying subjects and topics..." },
        { progress: 80, stage: "Creating smart collections..." },
        { progress: 95, stage: "Organizing items into collections..." }
      ];

      let stepIndex = 0;
      const progressInterval = setInterval(() => {
        if (stepIndex < progressSteps.length) {
          const step = progressSteps[stepIndex];
          setProgress(step.progress);
          setStage(step.stage);
          stepIndex++;
        }
      }, 1000);

      const response = await fetch('/api/dashboard/collections/organize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ options }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Failed to organize content');
      }

      const data = await response.json();
      
      setProgress(100);
      setStage("Organization complete!");
      setResult(data);
      
      // Notify parent component
      onOrganizationComplete(data);
      
    } catch (error) {
      setStage("Organization failed");
      setResult({
        collections: [],
        items_organized: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setOrganizing(false);
    }
  };

  const handleClose = () => {
    if (!organizing) {
      onClose();
      // Reset state
      setProgress(0);
      setStage("");
      setResult(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Organize My Content
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!organizing && !result && (
            <>
              {/* Organization options */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Organization Settings</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Replace existing collections</span>
                      <input
                        type="checkbox"
                        checked={options.clear_existing}
                        onChange={(e) => setOptions(prev => ({ ...prev, clear_existing: e.target.checked }))}
                        className="rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Merge similar content</span>
                      <input
                        type="checkbox"
                        checked={options.merge_similar}
                        onChange={(e) => setOptions(prev => ({ ...prev, merge_similar: e.target.checked }))}
                        className="rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Confidence Threshold: {Math.round(options.confidence_threshold * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="0.9"
                        step="0.1"
                        value={options.confidence_threshold}
                        onChange={(e) => setOptions(prev => ({ ...prev, confidence_threshold: parseFloat(e.target.value) }))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Max Collections: {options.max_collections}
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="25"
                        step="5"
                        value={options.max_collections}
                        onChange={(e) => setOptions(prev => ({ ...prev, max_collections: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg text-sm">
                  <p className="text-blue-800">
                    Our AI will analyze your flashcards, quizzes, documents, and chat content to create smart collections organized by subject and topic.
                  </p>
                </div>
              </div>

              <Button 
                onClick={startOrganization} 
                className="w-full flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Start Organization
              </Button>
            </>
          )}

          {organizing && (
            <div className="space-y-4">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-500" />
                <p className="font-medium">{stage}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg text-sm">
                <p className="text-yellow-800">
                  Please don't close this window while AI is organizing your content.
                </p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {result.success ? (
                <>
                  <div className="text-center">
                    <CheckCircle className="h-8 w-8 mx-auto mb-3 text-green-500" />
                    <h3 className="font-semibold text-green-800">Organization Complete!</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-xl font-bold text-blue-600">
                        {result.collections.length}
                      </div>
                      <div className="text-sm text-blue-800">Collections Created</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-xl font-bold text-green-600">
                        {result.items_organized}
                      </div>
                      <div className="text-sm text-green-800">Items Organized</div>
                    </div>
                  </div>

                  {result.collections.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">New Collections:</h4>
                      <div className="space-y-1">
                        {result.collections.slice(0, 5).map((collection, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="truncate">{collection.title}</span>
                            <Badge variant="secondary" className="text-xs">
                              {collection.subject || 'General'}
                            </Badge>
                          </div>
                        ))}
                        {result.collections.length > 5 && (
                          <div className="text-xs text-gray-500">
                            ...and {result.collections.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-3 text-red-500" />
                    <h3 className="font-semibold text-red-800">Organization Failed</h3>
                    <p className="text-sm text-red-600 mt-1">
                      {result.error || 'An unknown error occurred'}
                    </p>
                  </div>

                  <Button 
                    variant="outline" 
                    onClick={startOrganization}
                    className="w-full flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                </>
              )}

              <Button 
                variant={result.success ? "default" : "outline"}
                onClick={handleClose}
                className="w-full"
              >
                {result.success ? "View Collections" : "Close"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 