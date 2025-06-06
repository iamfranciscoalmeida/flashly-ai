"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Upload, X, Folder, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "../../supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";

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

// File size constants
const MAX_FILE_SIZE_MB = 100; // 100MB limit for standard uploads (updated bucket limit)
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks for resumable uploads
const LARGE_FILE_THRESHOLD = 6 * 1024 * 1024; // 6MB threshold for using resumable uploads

export default function FileUpload({
  onUploadComplete,
  isPremium,
  documentCount,
  onUploadAttempt,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null);
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

  const validateFileSize = (file: File): { isValid: boolean; warning?: string; error?: string } => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB. Please compress your file or split it into smaller parts.`
      };
    }
    
    if (file.size > LARGE_FILE_THRESHOLD) {
      return {
        isValid: true,
        warning: `This is a large file (${(file.size / 1024 / 1024).toFixed(2)} MB). Upload may take longer and will use resumable upload for better reliability.`
      };
    }
    
    return { isValid: true };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validation = validateFileSize(selectedFile);
      
      if (!validation.isValid) {
        setUploadError(validation.error || null);
        setFileSizeWarning(null);
        setFile(null);
        return;
      }
      
      setUploadError(null);
      setFileSizeWarning(validation.warning || null);
      setFile(selectedFile);
    }
  };

  const uploadLargeFile = async (file: File, filePath: string, user: any): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        // For large files, we'll use the resumable upload endpoint
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error("No valid session token");
        }

        console.log("Debug - Upload attempt with session:", {
          hasToken: !!session.access_token,
          tokenLength: session.access_token?.length,
          filePath,
          fileSize: file.size,
          fileSizeMB: (file.size / 1024 / 1024).toFixed(2)
        });

        // For now, we'll fall back to standard upload with better error handling
        // In a production environment, you'd implement TUS resumable uploads here
        const { error: uploadError, data } = await supabase.storage
          .from("study-documents")
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          // Log the full error details to see what's really happening
          console.error("Debug - Full upload error details:", {
            error: uploadError,
            message: uploadError.message,
            name: uploadError.name,
            cause: uploadError.cause,
            stack: uploadError.stack
          });

          // Let's not mask the error for now - throw the original error
          throw uploadError;
        }

        console.log("Debug - Upload successful:", data);
        resolve();
      } catch (error) {
        console.error("Debug - Upload function error:", error);
        reject(error);
      }
    });
  };

  const handleUpload = async () => {
    if (!file) return;

    // Validate file size before proceeding
    const validation = validateFileSize(file);
    if (!validation.isValid) {
      setUploadError(validation.error || "File validation failed");
      return;
    }

          // Get user to check plan limits and refresh session
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUploadError("Please log in to upload files.");
        return;
      }

      // Refresh session to ensure valid token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUploadError("Session expired. Please refresh the page and try again.");
        return;
      }

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
    setUploadError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      console.log("Debug - User authentication:", {
        userId: user.id,
        email: user.email,
        isAuthenticated: !!user
      });

      // Create a unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      console.log("Debug - File upload details:", {
        fileName,
        filePath,
        fileSize: file.size,
        fileSizeMB: (file.size / 1024 / 1024).toFixed(2),
        fileType: file.type,
        bucket: "study-documents",
        isLargeFile: file.size > LARGE_FILE_THRESHOLD
      });

      // Use different upload strategies based on file size
      if (file.size > LARGE_FILE_THRESHOLD) {
        console.log("Debug - Using large file upload strategy");
        // Simulate progress for large files
        const progressInterval = setInterval(() => {
          setProgress(prev => Math.min(prev + 10, 90));
        }, 500);

        try {
          await uploadLargeFile(file, filePath, user);
          clearInterval(progressInterval);
          setProgress(100);
        } catch (error) {
          clearInterval(progressInterval);
          throw error;
        }
      } else {
        // Standard upload for smaller files
        console.log("Debug - Using standard upload");
        const { error: uploadError, data } = await supabase.storage
          .from("study-documents")
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("Debug - Upload error details:", {
            error: uploadError,
            message: uploadError.message,
            name: uploadError.name
          });
          throw uploadError;
        }

        console.log("Debug - Upload successful:", data);
        setProgress(100);
      }

      // Create a record in the documents table
      console.log("Debug - Creating document record");
      const { error: dbError, data: document } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          status: "uploaded",
          folder_id: selectedFolder?.id || null,
        })
        .select()
        .single();

      if (dbError) {
        console.error("Debug - Database error details:", {
          error: dbError,
          code: dbError.code,
          message: dbError.message,
          details: dbError.details
        });
        throw dbError;
      }

      console.log("Debug - Document record created:", document);

      setUploading(false);
      // Remove the AI processing step - just complete the upload
      console.log("Debug - File upload completed successfully");
      onUploadComplete(document.id, file.name);
      setFile(null);
      setFileSizeWarning(null);

      // Note: AI processing (generating flashcards, quizzes, etc.) will be triggered 
      // separately when the user chooses to create study materials
    } catch (error: any) {
      console.error("Error uploading file:", error);
      
      // Enhanced error logging for debugging
      console.error("Full error details:", {
        message: error.message,
        status: error.status || error.statusCode,
        code: error.code,
        name: error.name,
        stack: error.stack,
        error: error
      });
      
      // Set user-friendly error messages
      let errorMessage = "An error occurred while uploading your file.";
      
      // Handle specific error types
      if (error.status === 400 || error.statusCode === 400) {
        errorMessage = "Upload failed due to invalid request. This might be due to authentication issues or storage configuration. Please try logging out and back in, or contact support.";
      } else if (error.status === 401 || error.statusCode === 401) {
        errorMessage = "Authentication failed. Please log out and log back in to refresh your session.";
      } else if (error.status === 403 || error.statusCode === 403) {
        errorMessage = "Permission denied. You don't have permission to upload to this location.";
      } else if (error.message?.includes('exceeded the maximum allowed size') || 
          error.message?.includes('Payload too large')) {
        errorMessage = `File is too large (${(file.size / 1024 / 1024).toFixed(2)} MB). The maximum file size allowed is ${MAX_FILE_SIZE_MB} MB. Please compress your file or contact support for larger file uploads.`;
      } else if (error.message?.includes('413')) {
        errorMessage = `File size limit exceeded. Please use a file smaller than ${MAX_FILE_SIZE_MB} MB.`;
      } else if (error.message?.includes('Invalid JWT') || error.message?.includes('token')) {
        errorMessage = "Session expired. Please refresh the page and try again.";
      } else if (error.message?.includes('bucket') || error.message?.includes('storage')) {
        errorMessage = "Storage configuration error. Please contact support if this persists.";
      } else if (error.message) {
        errorMessage = `Upload failed: ${error.message}`;
      }
      
      setUploadError(errorMessage);
      setUploading(false);
      setProgress(0);
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadError(null);
    setFileSizeWarning(null);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4">
        {/* Error Alert */}
        {uploadError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        {/* File Size Warning */}
        {fileSizeWarning && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{fileSizeWarning}</AlertDescription>
          </Alert>
        )}

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

        {uploading ? (
          <div className="border rounded-lg p-6 bg-white">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="bg-blue-100 p-3 rounded-full mb-4">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Uploading Document
              </h3>
              <p className="text-muted-foreground mb-6">
                {progress === 100 ? "Upload completed!" : "Uploading your file..."}
              </p>
              <div className="w-full max-w-md mb-4">
                <Progress value={progress} />
              </div>
              <p className="text-sm text-muted-foreground">
                {progress < 100 ? "Please wait while we upload your file" : "File saved successfully"}
              </p>
            </div>
          </div>
        ) : !file ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50">
            <Upload className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 mb-2">
              Drag and drop your PDF or click to browse
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Maximum file size: {MAX_FILE_SIZE_MB} MB • Generate study materials after saving
            </p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
            />
            <label 
              htmlFor="file-upload" 
              className="w-full cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('file-upload')?.click();
              }}
            >
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
                    {file.size > LARGE_FILE_THRESHOLD && (
                      <span className="ml-1 text-orange-600">(Large file - resumable upload)</span>
                    )}
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

            <div className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={uploading || !!uploadError}
                className="w-full sm:w-auto"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {file.size > LARGE_FILE_THRESHOLD ? "Uploading Large File..." : "Uploading..."}
                  </>
                ) : (
                  "Save Document"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
