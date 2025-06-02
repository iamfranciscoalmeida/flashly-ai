"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Loader2, Sparkles } from "lucide-react";

interface Module {
  id: string;
  title: string;
  document_id: string;
  order: number;
  summary: string | null;
}

interface Document {
  id: string;
  file_name: string;
  folder_id: string | null;
}

interface GenerateFlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  folderId: string | null;
  onGenerationComplete: () => void;
}

export default function GenerateFlashcardsModal({
  isOpen,
  onClose,
  document,
  folderId,
  onGenerationComplete,
}: GenerateFlashcardsModalProps) {
  const [scope, setScope] = useState<"folder" | "document" | "modules">(
    "document",
  );
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen && document) {
      fetchModules();
    }
  }, [isOpen, document]);

  const fetchModules = async () => {
    if (!document) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .eq("document_id", document.id)
        .order("order", { ascending: true });

      if (error) throw error;
      setModules(data || []);
      // Select all modules by default
      setSelectedModules(data?.map((m) => m.id) || []);
    } catch (error) {
      console.error("Error fetching modules:", error);
      setError("Failed to load modules. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleModuleToggle = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  const handleSelectAll = () => {
    setSelectedModules(modules.map((m) => m.id));
  };

  const handleDeselectAll = () => {
    setSelectedModules([]);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const payload = {
        scope,
        documentId: document?.id,
        folderId,
        moduleIds: scope === "modules" ? selectedModules : undefined,
      };

      const response = await fetch("/api/ai/generate-flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate flashcards");
      }

      const result = await response.json();
      console.log("Flashcard generation result:", result);
      onGenerationComplete();
      onClose();
    } catch (error) {
      console.error("Error generating flashcards:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to generate flashcards",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Flashcards</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Select scope:</h3>
            <RadioGroup
              value={scope}
              onValueChange={(value) => setScope(value as any)}
            >
              {folderId && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="folder" id="scope-folder" />
                  <Label htmlFor="scope-folder">Entire folder</Label>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="document" id="scope-document" />
                <Label htmlFor="scope-document">
                  Document: {document?.file_name}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="modules" id="scope-modules" />
                <Label htmlFor="scope-modules">Specific modules</Label>
              </div>
            </RadioGroup>
          </div>

          {scope === "modules" && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Select modules:</h3>
                <div className="space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs h-7 px-2"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAll}
                    className="text-xs h-7 px-2"
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : modules.length > 0 ? (
                <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                  {modules.map((module) => (
                    <div
                      key={module.id}
                      className="flex items-start space-x-2 py-2"
                    >
                      <Checkbox
                        id={`module-${module.id}`}
                        checked={selectedModules.includes(module.id)}
                        onCheckedChange={() => handleModuleToggle(module.id)}
                      />
                      <div>
                        <Label
                          htmlFor={`module-${module.id}`}
                          className="font-medium"
                        >
                          {module.title}
                        </Label>
                        {module.summary && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {module.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-2">
                  No modules found for this document.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={generating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={
              generating ||
              (scope === "modules" && selectedModules.length === 0)
            }
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Flashcards
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
