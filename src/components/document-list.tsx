"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  FolderIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface Document {
  id: string;
  file_name: string;
  created_at: string;
  status: "processing" | "completed" | "error";
  file_path: string;
  folder_id: string | null;
}

interface Folder {
  id: string;
  name: string;
}

interface DocumentListProps {
  onSelectDocument: (document: Document) => void;
  selectedFolderId: string | null;
}

export default function DocumentList({
  onSelectDocument,
  selectedFolderId,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
          .eq("user_id", user.id);

        if (error) throw error;
        setFolders(data || []);
      } catch (error) {
        console.error("Error fetching folders:", error);
      }
    };

    fetchFolders();
  }, [supabase]);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase
          .from("documents")
          .select("*")
          .eq("user_id", user.id);

        // Filter by folder if a folder is selected
        if (selectedFolderId) {
          query = query.eq("folder_id", selectedFolderId);
        } else {
          // For "All Files" view, include documents with null folder_id
          query = query.is("folder_id", null);
        }

        const { data, error } = await query.order("created_at", {
          ascending: false,
        });

        if (error) throw error;
        setDocuments(data || []);

        // Select the first document by default if available
        if (data && data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
          onSelectDocument(data[0]);
        } else if (data && data.length === 0) {
          // Clear selection if no documents
          setSelectedId(null);
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
    setSelectedId(null); // Reset selection when folder changes

    // Set up real-time subscription for document updates
    const subscription = supabase
      .channel("documents-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents" },
        (payload) => {
          // Type the payload data properly
          const newDoc = payload.new as Document | null;
          const oldDoc = payload.old as Document | null;
          
          // Only process changes for the current folder view
          const isRelevantToCurrentView =
            (selectedFolderId && newDoc?.folder_id === selectedFolderId) ||
            (!selectedFolderId && !newDoc?.folder_id);

          // Handle different types of changes
          if (payload.eventType === "INSERT" && isRelevantToCurrentView && newDoc) {
            setDocuments((prev) => [newDoc, ...prev]);
          } else if (payload.eventType === "UPDATE" && newDoc && oldDoc) {
            // For updates, we need to handle documents moving between folders

            // Document moved into current folder view
            if (
              isRelevantToCurrentView &&
              oldDoc.folder_id !== newDoc.folder_id
            ) {
              setDocuments((prev) => [newDoc, ...prev]);
            }
            // Document moved out of current folder view
            else if (
              !isRelevantToCurrentView &&
              oldDoc.folder_id !== newDoc.folder_id
            ) {
              setDocuments((prev) =>
                prev.filter((doc) => doc.id !== newDoc.id),
              );
            }
            // Document updated within current folder view
            else if (isRelevantToCurrentView) {
              setDocuments((prev) =>
                prev.map((doc) => (doc.id === newDoc.id ? newDoc : doc)),
              );

              // If the updated document is the selected one, update the selection
              if (selectedId === newDoc.id) {
                onSelectDocument(newDoc);
              }
            }
          } else if (payload.eventType === "DELETE" && oldDoc) {
            setDocuments((prev) =>
              prev.filter((doc) => doc.id !== oldDoc.id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, onSelectDocument, selectedId, selectedFolderId]);

  const handleSelectDocument = (document: Document) => {
    setSelectedId(document.id);
    onSelectDocument(document);
  };

  const moveDocumentToFolder = async (
    documentId: string,
    folderId: string | null,
  ) => {
    try {
      const { error } = await supabase
        .from("documents")
        .update({ folder_id: folderId })
        .eq("id", documentId);

      if (error) throw error;
    } catch (error) {
      console.error("Error moving document to folder:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processing":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "processing":
        return "Processing";
      case "completed":
        return "Ready";
      case "error":
        return "Error";
      default:
        return "Unknown";
    }
  };

  // Function to check if a document has flashcards or quizzes
  const checkStudyMaterials = async (documentId: string) => {
    try {
      // Check for flashcards
      const { count: flashcardCount } = await supabase
        .from("flashcards")
        .select("*", { count: "exact", head: true })
        .eq("document_id", documentId);

      // Check for quizzes
      const { count: quizCount } = await supabase
        .from("quizzes")
        .select("*", { count: "exact", head: true })
        .eq("document_id", documentId);

      return { flashcardCount, quizCount };
    } catch (error) {
      console.error("Error checking study materials:", error);
      return { flashcardCount: 0, quizCount: 0 };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
        <FileText className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {selectedFolderId ? "This folder is empty" : "No documents yet"}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {selectedFolderId
            ? "Upload documents and move them to this folder"
            : "Upload your first document to get started with AI-powered study materials."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-220px)] pr-2">
      {documents.map((document) => (
        <Card
          key={document.id}
          className={`cursor-pointer transition-all hover:shadow-md ${selectedId === document.id ? "ring-2 ring-blue-500" : ""}`}
          onClick={() => handleSelectDocument(document)}
        >
          <CardHeader className="py-3 px-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium truncate">
                {document.file_name}
              </CardTitle>
              <div className="flex items-center gap-1 text-xs">
                {getStatusIcon(document.status)}
                <span className="text-gray-500">
                  {getStatusText(document.status)}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                {new Date(document.created_at).toLocaleDateString()}
              </p>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FolderIcon className="h-3 w-3 mr-1" />
                      Move
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        moveDocumentToFolder(document.id, null);
                      }}
                      className={
                        !document.folder_id
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }
                    >
                      All Files
                    </DropdownMenuItem>
                    {folders.map((folder) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveDocumentToFolder(document.id, folder.id);
                        }}
                        className={
                          document.folder_id === folder.id
                            ? "bg-accent text-accent-foreground"
                            : ""
                        }
                      >
                        {folder.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectDocument(document);
                  }}
                >
                  {document.status === "completed" ? "View" : "Processing..."}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
