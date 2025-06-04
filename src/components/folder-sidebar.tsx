"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { Button } from "./ui/button";
import { Folder, FolderPlus, MoreVertical, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { PremiumCheck } from "./premium-check";

interface FolderData {
  id: string;
  name: string;
  created_at: string;
}

interface FolderDataWithCount extends FolderData {
  documentCount?: number;
}

interface FolderSidebarProps {
  onSelectFolder: (folderId: string | null) => void;
  selectedFolderId: string | null;
  className?: string;
  isMobile?: boolean;
}

export default function FolderSidebar({
  onSelectFolder,
  selectedFolderId,
  className = "",
  isMobile = false,
}: FolderSidebarProps) {
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showEditFolderDialog, setShowEditFolderDialog] = useState(false);
  const [showDeleteFolderDialog, setShowDeleteFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<FolderData | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<FolderDataWithCount | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [folderCount, setFolderCount] = useState(0);
  const [showUpsellDialog, setShowUpsellDialog] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Check premium status
        const isPro = user.user_metadata?.is_pro === true;
        setIsPremium(isPro);

        // Fetch folders
        const { data, error } = await supabase
          .from("folders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setFolders(data || []);
        setFolderCount(data?.length || 0);
      } catch (error) {
        console.error("Error fetching folders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFolders();

    // Set up real-time subscription for folder updates
    const subscription = supabase
      .channel("folders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "folders" },
        (payload) => {
          // Type the payload data properly
          const newFolder = payload.new as FolderData | null;
          const oldFolder = payload.old as FolderData | null;
          
          // Handle different types of changes
          if (payload.eventType === "INSERT" && newFolder) {
            setFolders((prev) => [newFolder, ...prev]);
            setFolderCount((prev) => prev + 1);
          } else if (payload.eventType === "UPDATE" && newFolder) {
            setFolders((prev) =>
              prev.map((folder) =>
                folder.id === newFolder.id
                  ? newFolder
                  : folder,
              ),
            );
          } else if (payload.eventType === "DELETE" && oldFolder) {
            setFolders((prev) =>
              prev.filter((folder) => folder.id !== oldFolder.id),
            );
            setFolderCount((prev) => prev - 1);
          }
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    // Get user to check plan limits
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get folder limit based on plan
    const folderLimit = user.user_metadata?.limits?.folders || 2;
    const isUnlimited = folderLimit === "unlimited";

    // Check if user can create more folders
    if (!isPremium && folderCount >= 2) {
      setShowUpsellDialog(true);
      return;
    }

    // For premium users, check their specific plan limits
    if (isPremium && !isUnlimited && folderCount >= folderLimit) {
      setShowUpsellDialog(true);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("folders").insert({
        user_id: user.id,
        name: newFolderName.trim(),
      });

      if (error) throw error;
      setNewFolderName("");
      setShowNewFolderDialog(false);
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  const handleEditFolder = async () => {
    if (!editingFolder || !newFolderName.trim()) return;

    try {
      const { error } = await supabase
        .from("folders")
        .update({ name: newFolderName.trim() })
        .eq("id", editingFolder.id);

      if (error) throw error;
      setNewFolderName("");
      setEditingFolder(null);
      setShowEditFolderDialog(false);
    } catch (error) {
      console.error("Error updating folder:", error);
    }
  };

  const handleDeleteFolder = async () => {
    if (!deletingFolder) return;

    try {
      // Check if folder has documents
      const { data: documents, error: countError } = await supabase
        .from("documents")
        .select("id")
        .eq("folder_id", deletingFolder.id);

      if (countError) throw countError;

      // If folder has documents, update them to have no folder
      if (documents && documents.length > 0) {
        const { error: updateError } = await supabase
          .from("documents")
          .update({ folder_id: null })
          .eq("folder_id", deletingFolder.id);

        if (updateError) throw updateError;
      }

      // Delete the folder
      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", deletingFolder.id);

      if (error) throw error;

      // If the deleted folder was selected, select "All Files"
      if (selectedFolderId === deletingFolder.id) {
        onSelectFolder(null);
      }

      setDeletingFolder(null);
      setShowDeleteFolderDialog(false);
    } catch (error) {
      console.error("Error deleting folder:", error);
    }
  };

  const openEditDialog = (folder: FolderData) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setShowEditFolderDialog(true);
  };

  const openDeleteDialog = async (folder: FolderData) => {
    setDeletingFolder(folder);

    // Check if folder has documents
    try {
      const { count, error } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("folder_id", folder.id);

      if (error) throw error;

      // Store document count in the deleting folder object
      setDeletingFolder({ ...folder, documentCount: count || 0 });
      setShowDeleteFolderDialog(true);
    } catch (error) {
      console.error("Error checking folder contents:", error);
      setDeletingFolder(folder);
      setShowDeleteFolderDialog(true);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Mobile dropdown view
  if (isMobile) {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center">
                  <Folder className="mr-2 h-4 w-4" />
                  <span>
                    {selectedFolderId
                      ? folders.find((f) => f.id === selectedFolderId)?.name ||
                        "Selected Folder"
                      : "All Files"}
                  </span>
                </div>
                <span className="ml-2">▼</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem
                className={`${!selectedFolderId ? "bg-accent text-accent-foreground" : ""}`}
                onClick={() => onSelectFolder(null)}
              >
                <Folder className="mr-2 h-4 w-4" /> All Files
              </DropdownMenuItem>

              {folders.map((folder) => (
                <DropdownMenuItem
                  key={folder.id}
                  className={`${selectedFolderId === folder.id ? "bg-accent text-accent-foreground" : ""}`}
                  onClick={() => onSelectFolder(folder.id)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <Folder className="mr-2 h-4 w-4" /> {folder.name}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(folder);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(folder);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </DropdownMenuItem>
              ))}

              <DropdownMenuItem onClick={() => setShowNewFolderDialog(true)}>
                <FolderPlus className="mr-2 h-4 w-4" /> New Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Dialogs */}
        {renderDialogs()}
      </div>
    );
  }

  // Desktop sidebar view
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Folders</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setShowNewFolderDialog(true)}
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      <Button
        variant={!selectedFolderId ? "secondary" : "ghost"}
        className="w-full justify-start text-sm mb-1"
        onClick={() => onSelectFolder(null)}
      >
        <Folder className="mr-2 h-4 w-4" /> All Files
      </Button>

      {folders.map((folder) => (
        <div key={folder.id} className="flex items-center group">
          <Button
            variant={selectedFolderId === folder.id ? "secondary" : "ghost"}
            className="w-full justify-start text-sm"
            onClick={() => onSelectFolder(folder.id)}
          >
            <Folder className="mr-2 h-4 w-4" />
            <span className="truncate">{folder.name}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(folder)}>
                <Edit className="mr-2 h-4 w-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openDeleteDialog(folder)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}

      {/* Dialogs */}
      {renderDialogs()}
    </div>
  );

  function renderDialogs() {
    return (
      <>
        {/* New Folder Dialog */}
        <Dialog
          open={showNewFolderDialog}
          onOpenChange={setShowNewFolderDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <input
                type="text"
                placeholder="Folder name"
                className="w-full p-2 border rounded-md"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setNewFolderName("");
                  setShowNewFolderDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateFolder}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Folder Dialog */}
        <Dialog
          open={showEditFolderDialog}
          onOpenChange={setShowEditFolderDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Folder</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <input
                type="text"
                placeholder="Folder name"
                className="w-full p-2 border rounded-md"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEditFolder()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setNewFolderName("");
                  setEditingFolder(null);
                  setShowEditFolderDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleEditFolder}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Folder Dialog */}
        <Dialog
          open={showDeleteFolderDialog}
          onOpenChange={setShowDeleteFolderDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Folder</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>
                Are you sure you want to delete the folder "
                {deletingFolder?.name}"?
              </p>
              {deletingFolder && (deletingFolder.documentCount ?? 0) > 0 && (
                <p className="mt-2 text-amber-600">
                  This folder contains {deletingFolder.documentCount} document
                  {(deletingFolder.documentCount ?? 0) !== 1 ? "s" : ""}. They will be
                  moved to "All Files".
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeletingFolder(null);
                  setShowDeleteFolderDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteFolder}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Premium Upsell Dialog */}
        <Dialog open={showUpsellDialog} onOpenChange={setShowUpsellDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upgrade to Premium</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>
                Free accounts are limited to 2 folders. Upgrade to Premium for
                unlimited folders and other benefits.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUpsellDialog(false)}
              >
                Cancel
              </Button>
              <Button asChild>
                <a href="/pricing">Upgrade Now</a>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
}
