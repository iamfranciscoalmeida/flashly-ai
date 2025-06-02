"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Upload, X, Folder, Brain, Loader2 } from "lucide-react";
import { createClient } from "../../supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Progress } from "./ui/progress";

interface Folder {
  id: string;
  name: string;
}

interface FileUploadProps {
  onUploadComplete: (fileId: string, fileName: string) => void;
  isPremium: boolean;
  documentCount: number;
  onUploadAttempt?: () => void;
}

export default function FileUpload({
  onUploadComplete,
  isPremium,
  documentCount,
  onUploadAttempt,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [processingStatus, setProcessingStatus] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("folders")
          .select("id, name")
          .eq("user_id", user.id)
          .order("name", { ascending: true });

        if (error) throw error;
        setFolders(data || []);
      } catch (error) {
        console.error("Error fetching folders:", error);
      }
    };

    fetchFolders();
  }, [supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    // Get user to check plan limits
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get upload limit based on plan
    const uploadLimit = user.user_metadata?.limits?.uploads || 1;
    const isUnlimited = uploadLimit === "unlimited";

    // Check if user can upload more documents
    if (!isPremium && documentCount >= 1) {
      if (onUploadAttempt) onUploadAttempt();
      return;
    }

    // For premium users, check their specific plan limits
    if (isPremium && !isUnlimited && documentCount >= uploadLimit) {
      alert(
        `You've reached your plan's limit of ${uploadLimit} document uploads. Please upgrade your plan for more uploads.`,
      );
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create a unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from("study-documents")
        .upload(filePath, file, {
          onUploadProgress: (progress) => {
            const percent = Math.round(
              (progress.loaded / progress.total) * 100,
            );
            setProgress(percent);
          },
        });

      if (uploadError) throw uploadError;

      // Create a record in the documents table
      const { error: dbError, data: document } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          status: "processing",
          folder_id: selectedFolder?.id || null,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setUploading(false);
      setProcessing(true);
      setProcessingStatus("Extracting text from document...");

      // Call the AI processing API
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: document.id,
          folderId: selectedFolder?.id || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process document");
      }

      const result = await response.json();
      console.log("AI processing result:", result);

      // Set up a subscription to monitor document status changes
      const subscription = supabase
        .channel(`document-${document.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "documents",
            filter: `id=eq.${document.id}`,
          },
          (payload) => {
            const updatedDoc = payload.new as any;
            if (updatedDoc.status === "completed") {
              setProcessing(false);
              onUploadComplete(document.id, file.name);
              subscription.unsubscribe();
            } else if (updatedDoc.status === "error") {
              setProcessing(false);
              console.error("Error processing document");
              subscription.unsubscribe();
            }
          },
        )
        .subscribe();

      // Clean up subscription after 5 minutes (failsafe)
      setTimeout(
        () => {
          subscription.unsubscribe();
        },
        5 * 60 * 1000,
      );

      setFile(null);
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploading(false);
      setProcessing(false);
    }
  };

  const clearFile = () => {
    setFile(null);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4">
        {/* Folder selection dropdown */}
        <div className="flex items-center">
          <span className="text-sm font-medium mr-2">Save to:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <span>
                  {selectedFolder ? selectedFolder.name : "All Files"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => setSelectedFolder(null)}
                className={
                  !selectedFolder ? "bg-accent text-accent-foreground" : ""
                }
              >
                All Files
              </DropdownMenuItem>
              {folders.map((folder) => (
                <DropdownMenuItem
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder)}
                  className={
                    selectedFolder?.id === folder.id
                      ? "bg-accent text-accent-foreground"
                      : ""
                  }
                >
                  {folder.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {processing ? (
          <div className="border rounded-lg p-6 bg-white">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="bg-blue-100 p-3 rounded-full mb-4">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Processing Document
              </h3>
              <p className="text-muted-foreground mb-6">
                {processingStatus || "Generating flashcards and quizzes..."}
              </p>
              <div className="w-full max-w-md mb-4">
                <Progress value={100} className="animate-pulse" />
              </div>
              <p className="text-sm text-muted-foreground">
                This may take a few moments depending on the document size
              </p>
            </div>
          </div>
        ) : !file ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50">
            <Upload className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 mb-4">
              Drag and drop your PDF or click to browse
            </p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload" className="w-full cursor-pointer">
              <div className="w-full">
                <Button variant="outline" className="w-full">
                  Browse Files
                </Button>
              </div>
            </label>
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded">
                  <svg
                    className="h-5 w-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1 truncate">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={clearFile}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {uploading && (
              <div className="w-full mb-4">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {progress}%
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full sm:w-auto"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload & Generate Study Materials"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
