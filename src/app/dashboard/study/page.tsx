"use client";

import { useState, useEffect } from "react";
import DashboardNavbar from "@/components/dashboard-navbar";
import DocumentList from "@/components/document-list";
import FlashcardGenerator from "@/components/flashcard-generator";
import DashboardViewToggle from "@/components/dashboard-view-toggle";
import FolderSidebar from "@/components/folder-sidebar";
import ModuleList from "@/components/module-list";
import { createClient } from "../../../../supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, Layers } from "lucide-react";
import Link from "next/link";

interface Document {
  id: string;
  file_name: string;
  status: "processing" | "completed" | "error";
  file_path: string;
  folder_id: string | null;
}

interface Module {
  id: string;
  title: string;
  document_id: string;
  order: number;
  summary: string | null;
  created_at: string;
  completed?: boolean;
}

export default function StudyDashboard() {
  const [view, setView] = useState<"split" | "full">("split");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showModules, setShowModules] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/sign-in");
        return;
      }
      setUser(user);
      setLoading(false);
    };

    checkAuth();

    // Check if mobile view
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [supabase, router]);

  const handleSelectDocument = (document: Document) => {
    setSelectedDocument(document);
    setSelectedModule(null); // Clear module selection when changing documents
    setShowModules(true); // Show modules when a document is selected
  };

  const handleSelectModule = (module: Module | null) => {
    setSelectedModule(module);
  };

  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedDocument(null); // Clear document selection when changing folders
    setSelectedModule(null); // Clear module selection when changing folders
    setShowModules(false); // Hide modules when changing folders
  };

  const handleViewChange = (newView: "split" | "full") => {
    setView(newView);
  };

  const toggleModuleView = () => {
    setShowModules(!showModules);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <main className="container mx-auto px-4 py-8">
        {/* Header with view toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Study Dashboard</h1>
            <p className="text-muted-foreground">
              Generate and review your study materials
            </p>
          </div>
          <div className="flex items-center gap-4">
            <DashboardViewToggle view={view} onViewChange={handleViewChange} />
            <Link href="/dashboard/flashcards-demo">
              <Button size="sm" variant="outline" className="flex items-center gap-1">
                <Layers className="h-4 w-4" />
                <span>Demo Flashcards</span>
              </Button>
            </Link>
            <Link href="/dashboard/quiz-demo">
              <Button size="sm" variant="outline" className="flex items-center gap-1">
                <Layers className="h-4 w-4" />
                <span>Demo Quiz</span>
              </Button>
            </Link>
            <Link href="/dashboard/upload">
              <Button size="sm" className="flex items-center gap-1">
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Main content area with conditional layout */}
        <div
          className={`grid ${view === "split" ? "grid-cols-1 lg:grid-cols-3 gap-6" : "grid-cols-1"}`}
        >
          {/* Document list and folders (hidden in full view) */}
          {view === "split" && (
            <div className="lg:col-span-1 bg-card rounded-lg border p-4 h-[calc(100vh-200px)] overflow-hidden flex flex-col">
              {/* Mobile folder dropdown */}
              {isMobile && (
                <FolderSidebar
                  onSelectFolder={handleSelectFolder}
                  selectedFolderId={selectedFolderId}
                  isMobile={true}
                  className="mb-4"
                />
              )}

              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Desktop folder sidebar */}
                {!isMobile && (
                  <FolderSidebar
                    onSelectFolder={handleSelectFolder}
                    selectedFolderId={selectedFolderId}
                    className="mb-4"
                  />
                )}

                {/* Toggle between documents and modules */}
                {selectedDocument && (
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">
                      {showModules
                        ? "Modules"
                        : selectedFolderId
                          ? "Folder Documents"
                          : "All Files"}
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleModuleView}
                      className="flex items-center gap-1"
                    >
                      <Layers className="h-4 w-4" />
                      <span>
                        {showModules ? "Show Documents" : "Show Modules"}
                      </span>
                    </Button>
                  </div>
                )}

                {!selectedDocument || !showModules ? (
                  // Show document list when no document is selected or modules view is not active
                  <>
                    {!selectedDocument && (
                      <h2 className="text-lg font-semibold mb-4">
                        {selectedFolderId ? "Folder Documents" : "All Files"}
                      </h2>
                    )}
                    <DocumentList
                      onSelectDocument={handleSelectDocument}
                      selectedFolderId={selectedFolderId}
                    />
                  </>
                ) : (
                  // Show module list when a document is selected and modules view is active
                  <ModuleList
                    documentId={selectedDocument.id}
                    onSelectModule={handleSelectModule}
                    selectedModuleId={selectedModule?.id || null}
                  />
                )}
              </div>
            </div>
          )}

          {/* Flashcard/Quiz area */}
          <div
            className={`${view === "split" ? "lg:col-span-2" : ""} bg-card rounded-lg border p-6 h-[calc(100vh-200px)] overflow-auto`}
          >
            <FlashcardGenerator
              document={selectedDocument}
              selectedModule={selectedModule}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
