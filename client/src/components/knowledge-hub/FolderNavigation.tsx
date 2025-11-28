import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Library,
  FolderInput,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface KnowledgeFolder {
  id: number;
  organizationId: number;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: number | null;
  folderType: string;
  icon?: string | null;
  color?: string | null;
  sortOrder: number;
  createdBy?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FolderNavigationProps {
  selectedFolderId: number | null;
  onFolderSelect: (folderId: number | null) => void;
  className?: string;
  isDragging?: boolean;
}


export function FolderNavigation({ selectedFolderId, onFolderSelect, className, isDragging = false }: FolderNavigationProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState<KnowledgeFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<number | null>(null);

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin" || currentUser?.role === "manager";

  const { data: folders = [], isLoading } = useQuery<KnowledgeFolder[]>({
    queryKey: ["/api/knowledge-base/folders"],
  });

  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; parentId: number | null }) => {
      const response = await apiRequest("/api/knowledge-base/folders", {
        method: "POST",
        body: data,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create folder');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Folder created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/folders"] });
      resetForm();
      setShowCreateDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<KnowledgeFolder> }) => {
      const response = await apiRequest(`/api/knowledge-base/folders/${id}`, {
        method: "PUT",
        body: data,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update folder');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Folder updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/folders"] });
      setShowEditDialog(false);
      setEditingFolder(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/knowledge-base/folders/${id}`, {
        method: "DELETE",
      });
      return id;
    },
    onSuccess: (deletedFolderId: number) => {
      toast({ title: "Folder deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/folders"] });
      if (selectedFolderId === deletedFolderId) {
        onFolderSelect(null);
      }
      setEditingFolder(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewFolderName("");
    setNewFolderDescription("");
    setNewFolderParentId(null);
  };

  const toggleFolder = (folderId: number) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate({
      name: newFolderName.trim(),
      description: newFolderDescription.trim() || undefined,
      parentId: newFolderParentId,
    });
  };

  const handleEditFolder = () => {
    if (!editingFolder || !newFolderName.trim()) return;
    updateFolderMutation.mutate({
      id: editingFolder.id,
      data: {
        name: newFolderName.trim(),
        description: newFolderDescription.trim() || null,
      },
    });
  };

  const handleDeleteFolder = (folder: KnowledgeFolder) => {
    if (!confirm(`Are you sure you want to delete "${folder.name}"? This action cannot be undone.`)) {
      return;
    }
    deleteFolderMutation.mutate(folder.id);
  };

  const openEditDialog = (folder: KnowledgeFolder) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setNewFolderDescription(folder.description || "");
    setShowEditDialog(true);
  };

  const rootFolders = folders.filter(f => !f.parentId);
  const getChildFolders = (parentId: number) => folders.filter(f => f.parentId === parentId);

  // Droppable folder item component
  const DroppableFolderItem = ({ folder, depth = 0 }: { folder: KnowledgeFolder; depth?: number }) => {
    const children = getChildFolders(folder.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    
    const { isOver, setNodeRef } = useDroppable({
      id: `folder-${folder.id}`,
    });

    return (
      <div>
        <div
          ref={setNodeRef}
          className={cn(
            "group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-all",
            isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted",
            depth > 0 && "ml-4",
            isDragging && "border border-dashed border-transparent",
            isDragging && isOver && "border-primary bg-primary/5 ring-2 ring-primary/20"
          )}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          data-testid={`folder-item-${folder.id}`}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-0.5 hover:bg-muted-foreground/10 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}

          <div
            className="flex-1 flex items-center gap-2 min-w-0"
            onClick={() => onFolderSelect(folder.id)}
          >
            {isDragging && isOver ? (
              <FolderInput className="h-4 w-4 flex-shrink-0 text-primary" />
            ) : isExpanded && hasChildren ? (
              <FolderOpen className="h-4 w-4 flex-shrink-0" style={{ color: folder.color || undefined }} />
            ) : (
              <Folder className="h-4 w-4 flex-shrink-0" style={{ color: folder.color || undefined }} />
            )}
            <span className="text-sm truncate">{folder.name}</span>
            {isDragging && isOver && (
              <span className="text-xs text-primary ml-auto">Drop here</span>
            )}
          </div>

          {!isDragging && isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setNewFolderParentId(folder.id);
                  setShowCreateDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add subfolder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditDialog(folder)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteFolder(folder)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {children.map((child) => (
              <DroppableFolderItem key={child.id} folder={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };
  
  // Droppable root zone for moving documents out of folders
  const RootDropZone = () => {
    const { isOver, setNodeRef } = useDroppable({
      id: 'folder-root',
    });
    
    if (!isDragging) return null;
    
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex items-center gap-2 px-2 py-2 rounded-md border border-dashed transition-all mb-2",
          isOver ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-muted-foreground/30"
        )}
      >
        <Library className={cn("h-4 w-4", isOver ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("text-sm", isOver ? "text-primary font-medium" : "text-muted-foreground")}>
          {isOver ? "Drop to remove from folder" : "Drop here for no folder"}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-2 p-2", className)}>
        <div className="h-6 bg-muted rounded animate-pulse" />
        <div className="h-6 bg-muted rounded animate-pulse" />
        <div className="h-6 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn("", className)}>
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-2">
          <Library className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Folders</span>
        </div>
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              resetForm();
              setShowCreateDialog(true);
            }}
            data-testid="create-folder-button"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Root drop zone - visible when dragging */}
      <RootDropZone />

      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors mb-1",
          selectedFolderId === null ? "bg-primary/10 text-primary" : "hover:bg-muted"
        )}
        onClick={() => onFolderSelect(null)}
        data-testid="all-documents-folder"
      >
        <Folder className="h-4 w-4" />
        <span className="text-sm">All Documents</span>
      </div>

      <div className="space-y-0.5">
        {rootFolders.map((folder) => (
          <DroppableFolderItem key={folder.id} folder={folder} />
        ))}
      </div>

      {folders.length === 0 && (
        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
          No folders yet. {isAdmin && "Click + to create one."}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Organize your knowledge base with folders
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                data-testid="input-folder-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder-description">Description (optional)</Label>
              <Input
                id="folder-description"
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder="Enter folder description"
                data-testid="input-folder-description"
              />
            </div>
            {newFolderParentId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Creating inside:</span>
                <Badge variant="secondary">
                  {folders.find(f => f.id === newFolderParentId)?.name}
                </Badge>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
              data-testid="button-create-folder"
            >
              {createFolderMutation.isPending ? "Creating..." : "Create Folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
            <DialogDescription>
              Update folder details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-folder-name">Name</Label>
              <Input
                id="edit-folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                data-testid="input-edit-folder-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-folder-description">Description (optional)</Label>
              <Input
                id="edit-folder-description"
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder="Enter folder description"
                data-testid="input-edit-folder-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditFolder}
              disabled={!newFolderName.trim() || updateFolderMutation.isPending}
              data-testid="button-update-folder"
            >
              {updateFolderMutation.isPending ? "Updating..." : "Update Folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
