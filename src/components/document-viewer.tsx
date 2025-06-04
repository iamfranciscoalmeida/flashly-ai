'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  FileText,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentViewerProps {
  documentId: string;
  documentUrl?: string;
  documentType: string;
  pageCount?: number;
  className?: string;
  onPageChange?: (page: number) => void;
}

export function DocumentViewer({
  documentId,
  documentUrl,
  documentType,
  pageCount = 1,
  className,
  onPageChange
}: DocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onPageChange?.(currentPage);
  }, [currentPage, onPageChange]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < pageCount) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleFullScreen = () => {
    const viewer = document.getElementById('document-viewer-content');
    if (viewer && viewer.requestFullscreen) {
      viewer.requestFullscreen();
    }
  };

  const renderDocument = () => {
    if (!documentUrl) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No document selected</p>
          </div>
        </div>
      );
    }

    if (documentType === 'application/pdf') {
      return (
        <iframe
          src={`${documentUrl}#page=${currentPage}`}
          className="w-full h-full border-0"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setError('Failed to load document');
          }}
        />
      );
    } else if (documentType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <img
            src={documentUrl}
            alt="Document"
            className="max-w-full max-h-full object-contain"
            style={{ transform: `scale(${zoom / 100})` }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError('Failed to load image');
            }}
          />
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Document preview not available</p>
            <p className="text-sm mt-2">Type: {documentType}</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-white rounded-lg shadow-sm", className)}>
      {/* Toolbar */}
      <div className="border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Page Navigation */}
          {pageCount > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600 min-w-[100px] text-center">
                Page {currentPage} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === pageCount}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom === 50}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 min-w-[50px] text-center">
            {zoom}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom === 200}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFullScreen}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 relative overflow-auto bg-gray-50" id="document-viewer-content">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <p>{error}</p>
            </div>
          </div>
        ) : (
          renderDocument()
        )}
      </div>
    </div>
  );
}