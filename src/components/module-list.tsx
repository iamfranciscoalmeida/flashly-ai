"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Book, CheckCircle, Clock, Edit, Trash2, Zap, Plus, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface Module {
  id: string;
  title: string;
  document_id: string;
  order: number;
  summary: string | null;
  created_at: string;
  completed?: boolean;
  start_page?: number | null;
  end_page?: number | null;
  content_excerpt?: string | null;
}

interface ModuleListProps {
  documentId: string;
  onSelectModule: (module: Module | null) => void;
  selectedModuleId: string | null;
}

export default function ModuleList({
  documentId,
  onSelectModule,
  selectedModuleId,
}: ModuleListProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [deletingModule, setDeletingModule] = useState<Module | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  
  // New module form state
  const [newModule, setNewModule] = useState({
    name: "",
    start_page: "",
    end_page: "",
    content_excerpt: "",
  });
  
  const supabase = createClient();

  useEffect(() => {
    if (!documentId) return;

    const fetchModules = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("modules")
          .select("*")
          .eq("document_id", documentId)
          .order("order", { ascending: true });

        if (error) throw error;
        setModules(data || []);

        // Select the first module by default if available
        if (data && data.length > 0 && !selectedModuleId) {
          onSelectModule(data[0]);
        }
      } catch (error) {
        console.error("Error fetching modules:", error);
        setError("Failed to fetch modules");
      } finally {
        setLoading(false);
      }
    };

    fetchModules();

    // Set up real-time subscription for module updates
    const subscription = supabase
      .channel(`modules-${documentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "modules",
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          // Type the payload data properly
          const newModule = payload.new as Module | null;
          const oldModule = payload.old as Module | null;
          
          if (payload.eventType === "INSERT" && newModule) {
            setModules((prev) =>
              [...prev, newModule].sort(
                (a, b) => a.order - b.order,
              ),
            );
          } else if (payload.eventType === "UPDATE" && newModule) {
            setModules((prev) =>
              prev
                .map((module) =>
                  module.id === newModule.id
                    ? newModule
                    : module,
                )
                .sort((a, b) => a.order - b.order),
            );
          } else if (payload.eventType === "DELETE" && oldModule) {
            setModules((prev) =>
              prev.filter((module) => module.id !== oldModule.id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [documentId, supabase, onSelectModule, selectedModuleId]);

  const handleSelectModule = (module: Module) => {
    onSelectModule(module);
  };

  const handleEditModule = (module: Module, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingModule(module);
    setNewModuleTitle(module.title);
    setShowEditDialog(true);
  };

  const handleDeleteModule = (module: Module, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingModule(module);
    setShowDeleteDialog(true);
  };

  const confirmDeleteModule = async () => {
    if (!deletingModule) return;

    try {
      setIsDeleting(true);
      setError(null);

      const response = await fetch(`/api/modules/${deletingModule.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete module');
      }

      // Close dialog and reset state
      setShowDeleteDialog(false);
      setDeletingModule(null);

      // If the deleted module was selected, clear the selection
      if (selectedModuleId === deletingModule.id) {
        // Select the first remaining module or null if none exist
        const remainingModules = modules.filter(m => m.id !== deletingModule.id);
        if (remainingModules.length > 0) {
          onSelectModule(remainingModules[0]);
        } else {
          onSelectModule(null);
        }
      }

    } catch (error) {
      console.error('Error deleting module:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete module');
    } finally {
      setIsDeleting(false);
    }
  };

  const saveModuleTitle = async () => {
    if (!editingModule || !newModuleTitle.trim()) return;

    try {
      const { error } = await supabase
        .from("modules")
        .update({ title: newModuleTitle.trim() })
        .eq("id", editingModule.id);

      if (error) throw error;
      setShowEditDialog(false);
      setEditingModule(null);
      setNewModuleTitle("");
    } catch (error) {
      console.error("Error updating module title:", error);
      setError("Failed to update module title");
    }
  };

  const handleAutoGenerate = async (replace: boolean = false) => {
    try {
      setIsAutoGenerating(true);
      setError(null);
      
      const response = await fetch(`/api/documents/${documentId}/auto-segment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ replace }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 409 && result.requiresReplace) {
          setShowReplaceDialog(true);
          return;
        }
        throw new Error(result.error || 'Failed to auto-generate modules');
      }

      // The modules will be automatically updated via the real-time subscription
      console.log('Auto-generated modules successfully:', result);
      setShowReplaceDialog(false);
      
    } catch (error) {
      console.error('Error auto-generating modules:', error);
      setError(error instanceof Error ? error.message : 'Failed to auto-generate modules');
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const handleAddModule = async () => {
    if (!newModule.name.trim()) {
      setError("Module name is required");
      return;
    }

    try {
      setError(null);
      
      const response = await fetch(`/api/documents/${documentId}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newModule.name.trim(),
          start_page: newModule.start_page ? parseInt(newModule.start_page) : null,
          end_page: newModule.end_page ? parseInt(newModule.end_page) : null,
          content_excerpt: newModule.content_excerpt.trim() || null,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create module');
      }

      // Reset form and close dialog
      setNewModule({
        name: "",
        start_page: "",
        end_page: "",
        content_excerpt: "",
      });
      setShowAddDialog(false);
      
    } catch (error) {
      console.error('Error creating module:', error);
      setError(error instanceof Error ? error.message : 'Failed to create module');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
        <Book className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No modules found
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Get started by creating modules for this document.
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => handleAutoGenerate(true)}
            disabled={isAutoGenerating}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            {isAutoGenerating ? "Generating..." : "Auto-Generate Modules"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Module
          </Button>
        </div>
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-220px)] pr-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Modules</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAutoGenerate(true)}
            disabled={isAutoGenerating}
            className="flex items-center gap-1"
          >
            <Zap className="h-3 w-3" />
            {isAutoGenerating ? "Generating..." : "Auto-Generate"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      
      {modules.map((module) => (
        <Card
          key={module.id}
          className={`cursor-pointer transition-all hover:shadow-md ${selectedModuleId === module.id ? "ring-2 ring-blue-500" : ""}`}
          onClick={() => handleSelectModule(module)}
        >
          <CardHeader className="py-3 px-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium truncate">
                {module.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                {module.completed ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-500" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-blue-100"
                  onClick={(e) => handleEditModule(module, e)}
                  title="Edit module"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-red-100"
                  onClick={(e) => handleDeleteModule(module, e)}
                  title="Delete module"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-2 px-4">
            {module.summary && (
              <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                {module.summary}
              </p>
            )}
            {(module.start_page || module.end_page) && (
              <p className="text-xs text-gray-400">
                Pages: {module.start_page || "?"} - {module.end_page || "?"}
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Edit Module Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Module</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="text"
              placeholder="Module title"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveModuleTitle()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewModuleTitle("");
                setEditingModule(null);
                setShowEditDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveModuleTitle}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Module Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Module</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name *
              </Label>
              <Input
                id="name"
                placeholder="Module name"
                className="col-span-3"
                value={newModule.name}
                onChange={(e) => setNewModule({ ...newModule, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start_page" className="text-right">
                Start Page
              </Label>
              <Input
                id="start_page"
                type="number"
                placeholder="1"
                className="col-span-3"
                value={newModule.start_page}
                onChange={(e) => setNewModule({ ...newModule, start_page: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end_page" className="text-right">
                End Page
              </Label>
              <Input
                id="end_page"
                type="number"
                placeholder="10"
                className="col-span-3"
                value={newModule.end_page}
                onChange={(e) => setNewModule({ ...newModule, end_page: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="content_excerpt" className="text-right pt-2">
                Excerpt
              </Label>
              <Textarea
                id="content_excerpt"
                placeholder="Brief content description (optional)"
                className="col-span-3"
                rows={3}
                value={newModule.content_excerpt}
                onChange={(e) => setNewModule({ ...newModule, content_excerpt: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewModule({
                  name: "",
                  start_page: "",
                  end_page: "",
                  content_excerpt: "",
                });
                setShowAddDialog(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddModule}>Add Module</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Modules Confirmation Dialog */}
      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Existing Modules?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              This document already has modules. Auto-generating new modules will delete all existing modules and their associated study materials (flashcards, quizzes, summaries).
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Warning</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                This action cannot be undone. All existing modules and study materials will be permanently deleted.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReplaceDialog(false);
                setIsAutoGenerating(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleAutoGenerate(true)}
              disabled={isAutoGenerating}
              className="bg-red-600 hover:bg-red-700"
            >
              {isAutoGenerating ? "Replacing..." : "Replace Modules"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Module Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Module</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete the module "{deletingModule?.title}"?
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Warning</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                This action cannot be undone. All associated study materials (flashcards, quizzes, summaries) will also be permanently deleted.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeletingModule(null);
                setError(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteModule}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Module"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
