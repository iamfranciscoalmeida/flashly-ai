'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CloudUpload, Loader2, ExternalLink } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface SaveToDriveButtonProps {
  content: any;
  type: 'flashcards' | 'quiz' | 'summary' | 'notes';
  fileName?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function SaveToDriveButton({ 
  content, 
  type, 
  fileName,
  variant = 'outline',
  size = 'sm',
  className 
}: SaveToDriveButtonProps) {
  const [saving, setSaving] = useState(false);
  const [savedFileUrl, setSavedFileUrl] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          type,
          fileName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 403) {
          toast({
            title: 'Google Drive not connected',
            description: 'Please connect your Google Drive account first.',
            variant: 'destructive',
          });
          return;
        }
        throw new Error(error.error || 'Failed to save to Drive');
      }

      const data = await response.json();
      setSavedFileUrl(data.file.url);

      toast({
        title: 'Saved to Google Drive',
        description: (
          <div className="flex items-center gap-2">
            <span>{data.file.name}</span>
            <a
              href={data.file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ),
      });
    } catch (error) {
      console.error('Error saving to Drive:', error);
      toast({
        title: 'Error',
        description: 'Failed to save to Google Drive',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSave}
      disabled={saving || !content}
      className={className}
    >
      {saving ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Saving...
        </>
      ) : savedFileUrl ? (
        <>
          <CloudUpload className="h-4 w-4 mr-2" />
          Saved to Drive
        </>
      ) : (
        <>
          <CloudUpload className="h-4 w-4 mr-2" />
          Save to Drive
        </>
      )}
    </Button>
  );
}