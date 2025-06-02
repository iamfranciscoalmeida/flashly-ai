"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Book, CheckCircle, Clock, Edit, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";

interface Module {
  id: string;
  title: string;
  document_id: string;
  order: number;
  summary: string | null;
  created_at: string;
  completed?: boolean;
}

interface ModuleListProps {
  documentId: string;
  onSelectModule: (module: Module) => void;
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
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState("");
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
          if (payload.eventType === "INSERT") {
            setModules((prev) =>
              [...prev, payload.new as Module].sort(
                (a, b) => a.order - b.order,
              ),
            );
          } else if (payload.eventType === "UPDATE") {
            setModules((prev) =>
              prev
                .map((module) =>
                  module.id === payload.new.id
                    ? (payload.new as Module)
                    : module,
                )
                .sort((a, b) => a.order - b.order),
            );
          } else if (payload.eventType === "DELETE") {
            setModules((prev) =>
              prev.filter((module) => module.id !== payload.old.id),
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
          This document hasn't been processed into modules yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-220px)] pr-2">
      <h2 className="text-lg font-semibold mb-4">Modules</h2>
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
                  className="h-7 w-7 p-0"
                  onClick={(e) => handleEditModule(module, e)}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-2 px-4">
            {module.summary && (
              <p className="text-xs text-gray-500 line-clamp-2">
                {module.summary}
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
            <input
              type="text"
              placeholder="Module title"
              className="w-full p-2 border rounded-md"
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
    </div>
  );
}
