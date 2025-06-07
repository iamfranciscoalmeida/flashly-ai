'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, FolderOpen, FileText, Image, ChevronRight, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  webViewLink?: string;
  parents?: string[];
}

interface GoogleDrivePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (file: DriveFile) => void;
  sessionId?: string;
}

export function GoogleDrivePicker({ open, onClose, onSelect, sessionId }: GoogleDrivePickerProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'My Drive' }
  ]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadFiles();
    }
  }, [open, currentFolderId]);

  const loadFiles = async (pageToken?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (currentFolderId) params.append('folderId', currentFolderId);
      if (pageToken) params.append('pageToken', pageToken);
      params.append('pageSize', '20');

      const response = await fetch(`/api/drive/files?${params}`);
      
      if (!response.ok) {
        const error = await response.json();
        if (response.status === 403) {
          toast({
            title: 'Google Drive not connected',
            description: 'Please connect your Google Drive account first.',
            variant: 'destructive',
          });
          onClose();
          return;
        }
        throw new Error(error.error || 'Failed to load files');
      }

      const data = await response.json();
      
      if (pageToken) {
        setFiles(prev => [...prev, ...data.files]);
      } else {
        setFiles(data.files);
      }
      
      setNextPageToken(data.nextPageToken);
    } catch (error) {
      console.error('Error loading files:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Google Drive files',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFiles();
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setFolderPath(prev => [...prev, { id: folderId, name: folderName }]);
  };

  const navigateBack = (index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    setCurrentFolderId(newPath[newPath.length - 1].id === 'root' ? null : newPath[newPath.length - 1].id);
  };

  const handleSelectFile = async (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      navigateToFolder(file.id, file.name);
      return;
    }

    // Check if file type is supported
    const supportedTypes = [
      'application/pdf',
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.google-apps.presentation',
      'text/plain',
      'text/csv',
      'text/markdown',
    ];

    if (!supportedTypes.some(type => file.mimeType.includes(type))) {
      toast({
        title: 'Unsupported file type',
        description: 'Please select a PDF, Google Doc, or text file.',
        variant: 'destructive',
      });
      return;
    }

    // Load file into chat
    setLoading(true);
    try {
      const response = await fetch('/api/drive/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id, sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to load file');
      }

      const data = await response.json();
      
      toast({
        title: 'File loaded',
        description: `${file.name} has been loaded into the chat.`,
      });

      onSelect(file);
      onClose();
    } catch (error) {
      console.error('Error loading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to load the selected file',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <FolderOpen className="h-5 w-5 text-blue-500" />;
    } else if (mimeType.includes('image')) {
      return <Image className="h-5 w-5 text-green-500" />;
    } else {
      return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '';
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select from Google Drive</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4">
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={loading}>
              Search
            </Button>
          </form>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm">
            {folderPath.map((folder, index) => (
              <div key={folder.id} className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateBack(index)}
                  className="px-2"
                >
                  {folder.name}
                </Button>
                {index < folderPath.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          {/* File list */}
          <ScrollArea className="flex-1 border rounded-md">
            {loading && files.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : files.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No files found
              </div>
            ) : (
              <div className="p-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 hover:bg-accent rounded-md cursor-pointer transition-colors"
                    onClick={() => handleSelectFile(file)}
                  >
                    {getFileIcon(file.mimeType)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{file.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)}
                        {file.modifiedTime && (
                          <span className="ml-2">
                            • {new Date(file.modifiedTime).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {nextPageToken && (
                  <Button
                    variant="outline"
                    onClick={() => loadFiles(nextPageToken)}
                    disabled={loading}
                    className="w-full mt-4"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Load more'
                    )}
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}