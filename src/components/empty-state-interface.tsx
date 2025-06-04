'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Youtube, 
  Camera, 
  CloudUpload,
  Upload,
  Link,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface EmptyStateInterfaceProps {
  onCreateSession: (type: string, data: any) => void;
  isCreating?: boolean;
}

export function EmptyStateInterface({ onCreateSession, isCreating }: EmptyStateInterfaceProps) {
  const [showYoutubeDialog, setShowYoutubeDialog] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadType, setUploadType] = useState<'pdf' | 'image'>('pdf');

  const uploadOptions = [
    {
      id: 'pdf',
      icon: FileText,
      title: 'Upload PDF',
      description: 'Study from your documents',
      color: 'bg-blue-500',
      action: () => {
        setUploadType('pdf');
        setShowUploadDialog(true);
      }
    },
    {
      id: 'youtube',
      icon: Youtube,
      title: 'YouTube Link',
      description: 'Learn from video content',
      color: 'bg-red-500',
      action: () => setShowYoutubeDialog(true)
    },
    {
      id: 'image',
      icon: Camera,
      title: 'Upload Images',
      description: 'Study from photos & notes',
      color: 'bg-green-500',
      action: () => {
        setUploadType('image');
        setShowUploadDialog(true);
      }
    },
    {
      id: 'drive',
      icon: CloudUpload,
      title: 'Google Drive',
      description: 'Import from your Drive',
      color: 'bg-yellow-500',
      action: () => {
        // TODO: Implement Google Drive integration
        console.log('Google Drive integration coming soon');
      }
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    onCreateSession(uploadType, { file });
    setShowUploadDialog(false);
  };

  const handleYoutubeSubmit = () => {
    if (!youtubeUrl.trim()) return;
    
    onCreateSession('youtube', { url: youtubeUrl });
    setYoutubeUrl('');
    setShowYoutubeDialog(false);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center h-full px-4">
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-3">Welcome to StudyWithAI</h1>
            <p className="text-xl text-gray-600">
              Upload your study materials and start learning with AI assistance
            </p>
          </div>

          {/* Upload Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {uploadOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={option.action}
                  disabled={isCreating}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border-2 border-gray-200",
                    "p-6 text-left transition-all duration-200",
                    "hover:border-gray-300 hover:shadow-lg",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-lg text-white transition-transform group-hover:scale-110",
                      option.color
                    )}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{option.title}</h3>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Tips */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold mb-3">Quick Tips:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Upload PDFs up to 50MB for comprehensive study sessions</li>
              <li>• YouTube videos are transcribed automatically for easy learning</li>
              <li>• Take photos of handwritten notes or textbook pages</li>
              <li>• Generate flashcards, quizzes, and summaries from any content</li>
            </ul>
          </div>
        </div>
      </div>

      {/* YouTube URL Dialog */}
      <Dialog open={showYoutubeDialog} onOpenChange={setShowYoutubeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add YouTube Video</DialogTitle>
            <DialogDescription>
              Enter a YouTube URL to start learning from video content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">YouTube URL</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={youtubeUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="pl-10"
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') handleYoutubeSubmit();
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowYoutubeDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleYoutubeSubmit}
                disabled={!youtubeUrl.trim() || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Start Learning'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Upload {uploadType === 'pdf' ? 'PDF Document' : 'Images'}
            </DialogTitle>
            <DialogDescription>
              {uploadType === 'pdf' 
                ? 'Select a PDF file to start studying'
                : 'Upload photos of your handwritten notes or textbook pages'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept={uploadType === 'pdf' ? '.pdf' : 'image/*'}
                onChange={handleFileUpload}
                disabled={isCreating}
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <Upload className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  {uploadType === 'pdf' 
                    ? 'PDF files up to 50MB'
                    : 'PNG, JPG, HEIC up to 10MB'
                  }
                </p>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}