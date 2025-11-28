import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from 'wouter';
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent, pointerWithin } from '@dnd-kit/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Users, Plus, FileText, Filter, Eye, Edit3, Trash2, Calendar, User, Tag, Search, X, UserPlus, Pencil, PanelLeftClose, PanelLeft, GraduationCap, ChevronDown, GripVertical, FolderInput, Folder, ExternalLink, FileCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { KnowledgeDocument, KnowledgeFolder } from '@shared/schema';
import { AssignTrainingDialog } from "@/components/training/AssignTrainingDialog";
import { EditAssignmentDialog } from "@/components/training/EditAssignmentDialog";
import { FolderNavigation } from "@/components/knowledge-hub/FolderNavigation";

interface ExtendedKnowledgeDocument extends KnowledgeDocument {
  author?: {
    id: number;
    fullName: string;
  };
}

interface KnowledgeBaseProgress {
  userId: number;
  userName: string;
  userEmail: string;
  totalDocuments: number;
  completedDocuments: number;
  pendingDocuments: number;
  overdueDocuments: number;
}

interface DocumentAssignment {
  id: number;
  documentId: number;
  documentTitle: string;
  userId: number;
  userName: string;
  userEmail: string;
  status: 'pending' | 'completed';
  dueDate?: string;
  completedAt?: string;
  assignedAt: string;
  priority?: string;
}

export default function KnowledgeBaseListing() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"documents" | "progress">("documents");
  
  // Folder navigation state
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [showFolderNav, setShowFolderNav] = useState(true);
  
  // Filter states
  const [documentStatusFilter, setDocumentStatusFilter] = useState<string>("all");
  const [selectedCategoriesFilter, setSelectedCategoriesFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [progressStatusFilter, setProgressStatusFilter] = useState<string>("all");
  const [progressDocumentFilter, setProgressDocumentFilter] = useState<string>("all");
  
  // Assignment dialog state
  const [showAssignTraining, setShowAssignTraining] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ExtendedKnowledgeDocument | null>(null);
  
  // Edit assignment dialog state
  const [showEditAssignment, setShowEditAssignment] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<DocumentAssignment | null>(null);
  
  // Drag and drop state
  const [draggedDocId, setDraggedDocId] = useState<number | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Fetch knowledge documents with filters
  const { data: documents = [], isLoading: documentsLoading } = useQuery<ExtendedKnowledgeDocument[]>({
    queryKey: ["/api/knowledge-base/documents", { 
      status: documentStatusFilter, 
      categories: selectedCategoriesFilter, // Updated to support array filtering
      search: searchQuery // Added search query parameter
    }],
    enabled: activeTab === "documents"
  });
  
  // Enhanced client-side filtering with search, multi-category support, and folder filtering
  const filteredDocuments = documents.filter(doc => {
    // Folder filter - if a folder is selected, only show documents in that folder
    if (selectedFolderId !== null && doc.folderId !== selectedFolderId) return false;
    
    // Status filter
    if (documentStatusFilter !== "all" && doc.status !== documentStatusFilter) return false;
    
    // Multi-category filter - check if document has any of the selected categories
    if (selectedCategoriesFilter.length > 0) {
      const hasMatchingCategory = selectedCategoriesFilter.some(filterCategory =>
        doc.categories?.includes(filterCategory)
      );
      if (!hasMatchingCategory) return false;
    }
    
    // Enhanced search - search in title, content, and categories
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = doc.title.toLowerCase().includes(query);
      const matchesContent = doc.content?.toLowerCase().includes(query) || false;
      const matchesCategories = doc.categories?.some(category => 
        category.toLowerCase().includes(query)
      ) || false;
      
      if (!matchesTitle && !matchesContent && !matchesCategories) return false;
    }
    
    return true;
  });

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin" || currentUser?.role === "manager";

  // Fetch team progress (admin only)
  const { data: progressData = [], isLoading: progressLoading } = useQuery<KnowledgeBaseProgress[]>({
    queryKey: ["/api/knowledge-base/team-progress"],
    enabled: activeTab === "progress" && isAdmin
  });

  // Fetch document assignments (admin only)
  const { data: assignmentDetails = [], isLoading: assignmentsLoading } = useQuery<DocumentAssignment[]>({
    queryKey: ["/api/knowledge-base/assignments"],
    enabled: activeTab === "progress" && isAdmin
  });

  const handleCreateDocument = () => {
    navigate('/knowledge-base/documents/new');
  };

  const handleCreateTrainingModule = () => {
    navigate('/knowledge-hub/training/modules/new');
  };

  const handleEditDocument = (document: ExtendedKnowledgeDocument) => {
    navigate(`/knowledge-base/documents/${document.id}/edit`);
  };

  const handleViewDocument = (document: ExtendedKnowledgeDocument) => {
    navigate(`/kb/documents/${document.id}`);
  };

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await apiRequest(`/api/knowledge-base/documents/${documentId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      return { documentId };
    },
    onMutate: async (documentId: number) => {
      await queryClient.cancelQueries({ queryKey: ['/api/knowledge-base/documents'] });
      const previousDocuments = queryClient.getQueryData<ExtendedKnowledgeDocument[]>(['/api/knowledge-base/documents']);
      
      queryClient.setQueryData<ExtendedKnowledgeDocument[]>(['/api/knowledge-base/documents'], (old) => {
        return old ? old.filter(doc => doc.id !== documentId) : [];
      });

      return { previousDocuments };
    },
    onSuccess: () => {
      toast({
        title: 'Document deleted successfully'
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['/api/knowledge-base/documents'],
        exact: true
      });
    },
    onError: (error: any, documentId: number, context) => {
      if (context?.previousDocuments) {
        queryClient.setQueryData(['/api/knowledge-base/documents'], context.previousDocuments);
      }
      
      console.error('Error deleting document:', error);
      toast({
        title: 'Failed to delete document',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/documents'] });
    }
  });

  const handleDeleteDocument = (document: ExtendedKnowledgeDocument) => {
    if (!confirm(`Are you sure you want to delete "${document.title}"?`)) {
      return;
    }

    deleteDocumentMutation.mutate(document.id);
  };

  // Move document mutation (single or bulk)
  const moveDocumentMutation = useMutation({
    mutationFn: async ({ documentIds, folderId }: { documentIds: number[]; folderId: number | null }) => {
      if (documentIds.length === 1) {
        const response = await apiRequest(`/api/knowledge-base/documents/${documentIds[0]}/move`, {
          method: 'PATCH',
          body: { folderId }
        });
        if (!response.ok) throw new Error('Failed to move document');
        return response.json();
      } else {
        const response = await apiRequest('/api/knowledge-base/documents/bulk-move', {
          method: 'PATCH',
          body: { documentIds, folderId }
        });
        if (!response.ok) throw new Error('Failed to move documents');
        return response.json();
      }
    },
    onSuccess: (_, { documentIds, folderId }) => {
      const count = documentIds.length;
      toast({
        title: `${count} document${count > 1 ? 's' : ''} moved successfully`,
        description: folderId ? 'Documents moved to folder' : 'Documents moved to root'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/folders'] });
      setSelectedDocIds(new Set());
      setSelectionMode(false);
    },
    onError: (error: any) => {
      console.error('Error moving documents:', error);
      toast({
        title: 'Failed to move documents',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    }
  });

  // Fetch folders for drop targets
  const { data: folders = [] } = useQuery<KnowledgeFolder[]>({
    queryKey: ['/api/knowledge-base/folders']
  });

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const docId = parseInt(String(event.active.id).replace('doc-', ''));
    setDraggedDocId(docId);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedDocId(null);

    if (!over) return;

    const docId = parseInt(String(active.id).replace('doc-', ''));
    const targetId = String(over.id);
    
    let targetFolderId: number | null = null;
    if (targetId === 'folder-root') {
      targetFolderId = null;
    } else if (targetId.startsWith('folder-')) {
      targetFolderId = parseInt(targetId.replace('folder-', ''));
    } else {
      return;
    }

    // Check if dragging multiple selected documents
    const idsToMove = selectedDocIds.has(docId) && selectedDocIds.size > 1
      ? Array.from(selectedDocIds)
      : [docId];

    moveDocumentMutation.mutate({ documentIds: idsToMove, folderId: targetFolderId });
  }, [selectedDocIds, moveDocumentMutation]);

  // Selection handlers
  const toggleDocSelection = (docId: number) => {
    const newSelected = new Set(selectedDocIds);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocIds(newSelected);
    if (newSelected.size === 0) setSelectionMode(false);
  };

  const selectAllVisible = () => {
    setSelectedDocIds(new Set(filteredDocuments.map(d => d.id)));
    setSelectionMode(true);
  };

  const clearSelection = () => {
    setSelectedDocIds(new Set());
    setSelectionMode(false);
  };

  const handleBulkMove = (folderId: number | null) => {
    if (selectedDocIds.size === 0) return;
    moveDocumentMutation.mutate({ 
      documentIds: Array.from(selectedDocIds), 
      folderId 
    });
  };

  // Get dragged document for overlay
  const draggedDocument = draggedDocId ? documents.find(d => d.id === draggedDocId) : null;

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignment: DocumentAssignment) => {
      await apiRequest(`/api/knowledge-base/documents/${assignment.documentId}/assignments/${assignment.id}`, {
        method: 'DELETE'
      });
      return assignment.id;
    },
    onSuccess: () => {
      toast({
        title: 'Assignment deleted successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/assignments'] });
    },
    onError: (error: any) => {
      console.error('Error deleting assignment:', error);
      toast({
        title: 'Failed to delete assignment',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    }
  });

  // Update assignment mutation
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ assignmentId, documentId, updates }: { 
      assignmentId: number; 
      documentId: number; 
      updates: any 
    }) => {
      const response = await apiRequest(
        `/api/knowledge-base/documents/${documentId}/assignments/${assignmentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Assignment updated successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/assignments'] });
      setShowEditAssignment(false);
      setSelectedAssignment(null);
    },
    onError: (error: any) => {
      console.error('Error updating assignment:', error);
      toast({
        title: 'Failed to update assignment',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    }
  });

  const handleDeleteAssignment = (assignment: DocumentAssignment) => {
    if (!confirm(`Are you sure you want to delete this assignment for ${assignment.userName}?`)) {
      return;
    }
    deleteAssignmentMutation.mutate(assignment);
  };

  const handleEditAssignment = (assignment: DocumentAssignment) => {
    setSelectedAssignment(assignment);
    setShowEditAssignment(true);
  };

  const handleUpdateAssignment = (assignmentId: number, updates: any) => {
    if (!selectedAssignment) return;
    updateAssignmentMutation.mutate({
      assignmentId,
      documentId: selectedAssignment.documentId,
      updates
    });
  };

  const handleAssignDocument = (document: ExtendedKnowledgeDocument) => {
    setSelectedDocument(document);
    setShowAssignTraining(true);
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'Unknown';
    const date = typeof dateString === 'string' ? dateString : dateString.toISOString();
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'default';
      case 'draft': return 'secondary';
      case 'archived': return 'outline';
      default: return 'outline';
    }
  };

  // Draggable Document Card component
  const DraggableDocumentCard = ({ document }: { document: ExtendedKnowledgeDocument }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: `doc-${document.id}`,
    });
    
    const isSelected = selectedDocIds.has(document.id);
    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
      <Card 
        ref={setNodeRef}
        style={style}
        className={`group hover:shadow-sm transition-shadow ${isDragging ? 'opacity-50 z-50' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`} 
        data-testid={`document-card-${document.id}`}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            {/* Selection checkbox (visible in selection mode or on hover) */}
            {isAdmin && (
              <div className={`flex items-center gap-1 ${selectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => {
                    toggleDocSelection(document.id);
                    if (!selectionMode) setSelectionMode(true);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`select-document-${document.id}`}
                />
                {/* Drag handle */}
                <div 
                  {...listeners} 
                  {...attributes}
                  className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )}
            
            <div className="flex-1 cursor-pointer" onClick={() => handleViewDocument(document)}>
              <h3 className="font-medium line-clamp-1 mb-1 text-[14px]">
                {document.title}
              </h3>
              <div className="flex items-center gap-2 mb-2">
                {document.author && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {document.author.fullName}
                  </span>
                )}
                <span className="text-muted-foreground flex items-center gap-1 text-[12px]">
                  <Calendar className="h-3 w-3" />
                  {formatDate(document.updatedAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(document.status)} className="px-1 py-0 text-[12px]">
                  {document.status}
                </Badge>
                {document.documentType && document.documentType !== 'internal_kb' && (
                  <Badge 
                    variant={document.documentType === 'external_file_link' ? 'outline' : 'secondary'} 
                    className="px-1 py-0 text-[12px] flex items-center gap-1"
                  >
                    {document.documentType === 'training_module' && <GraduationCap className="h-3 w-3" />}
                    {document.documentType === 'external_file_link' && <ExternalLink className="h-3 w-3" />}
                    {document.documentType === 'customer_kb' && <FileCheck className="h-3 w-3" />}
                    {document.documentType === 'training_module' && 'Training'}
                    {document.documentType === 'external_file_link' && 'External'}
                    {document.documentType === 'customer_kb' && 'Customer'}
                  </Badge>
                )}
                {document.categories && document.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {document.categories.slice(0, 2).map((category, index) => (
                      <Badge key={index} variant="outline" className="px-1 py-0 text-[12px]">
                        <Tag className="h-3 w-3 mr-1" />
                        {category}
                      </Badge>
                    ))}
                    {document.categories.length > 2 && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        +{document.categories.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Open external link button for external file links */}
              {document.documentType === 'external_file_link' && (document as any).externalFileUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open((document as any).externalFileUrl, '_blank');
                  }}
                  className="h-6 w-6 p-0 text-primary"
                  data-testid={`open-external-${document.id}`}
                  title="Open external file"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDocument(document);
                }}
                className="h-6 w-6 p-0"
                data-testid={`view-document-${document.id}`}
                title="View document"
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditDocument(document);
                }}
                className="h-6 w-6 p-0"
                data-testid={`edit-document-${document.id}`}
                title="Edit document"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAssignDocument(document);
                }}
                className="h-6 w-6 p-0"
                data-testid={`assign-document-${document.id}`}
                title="Assign Training"
              >
                <UserPlus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDocument(document);
                }}
                disabled={deleteDocumentMutation.isPending}
                className="h-6 w-6 p-0"
                data-testid={`delete-document-${document.id}`}
                title="Delete document"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Drag overlay for visual feedback
  const DragOverlayCard = ({ document }: { document: ExtendedKnowledgeDocument }) => (
    <Card className="shadow-lg opacity-90 w-80">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <div>
            <h3 className="font-medium line-clamp-1 text-[14px]">{document.title}</h3>
            {selectedDocIds.size > 1 && selectedDocIds.has(document.id) && (
              <p className="text-xs text-muted-foreground">
                Moving {selectedDocIds.size} documents
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
      <div className="container mx-auto px-3 py-3" data-testid="knowledge-base-listing">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Knowledge Hub</h1>
            <p className="text-gray-600 mt-0.5 text-[12px]">Manage training documents, folders, and team progress</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={() => setShowFolderNav(!showFolderNav)}
            data-testid="toggle-folder-nav"
          >
            {showFolderNav ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Main Layout with Folder Navigation */}
        <div className="flex gap-4">
          {/* Folder Navigation Sidebar */}
          <div className={`${showFolderNav ? 'block' : 'hidden'} md:block w-56 flex-shrink-0`}>
            <Card className="sticky top-4">
              <CardContent className="p-2">
                <FolderNavigation
                  selectedFolderId={selectedFolderId}
                  onFolderSelect={setSelectedFolderId}
                  isDragging={!!draggedDocId}
                />
              </CardContent>
            </Card>
          </div>
        
        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {/* Compact Tab Navigation */}
          <div className="mb-3">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-4">
                <button
                  onClick={() => setActiveTab("documents")}
                  className={`py-1 px-2 border-b-2 font-medium text-xs ${
                    activeTab === "documents"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <BookOpen className="w-3 h-3 inline mr-1" />
                  Documents
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab("progress")}
                    className={`py-1 px-2 border-b-2 font-medium text-xs ${
                      activeTab === "progress"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Users className="w-3 h-3 inline mr-1" />
                    Team Progress
                  </button>
                )}
              </nav>
            </div>
          </div>
          
          {/* Documents Tab */}
          {activeTab === "documents" && (
            <div className="space-y-3">
              {/* Compact Header with Create Button */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {selectedFolderId ? 'Documents in selected folder' : 'All documents'}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      type="button" 
                      size="sm" 
                      className="flex items-center gap-1 h-7"
                      data-testid="create-document-button"
                    >
                      <Plus className="w-3 h-3" />
                      <span className="hidden sm:inline">Create</span>
                      <ChevronDown className="w-3 h-3 ml-0.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCreateDocument} data-testid="create-document-option">
                      <FileText className="w-4 h-4 mr-2" />
                      Document
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCreateTrainingModule} data-testid="create-training-module-option">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Training Module
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
          
          {/* Enhanced Filters with Search and Multi-Select Categories */}
          <div className="space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-sm"
                data-testid="search-input"
              />
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-wrap gap-2">
              <Select value={documentStatusFilter} onValueChange={setDocumentStatusFilter}>
                <SelectTrigger className="h-7 w-32 text-xs" data-testid="status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Multi-select Categories */}
              <Select onValueChange={(value) => {
                if (value && !selectedCategoriesFilter.includes(value)) {
                  setSelectedCategoriesFilter([...selectedCategoriesFilter, value]);
                }
              }}>
                <SelectTrigger className="h-7 w-36 text-xs" data-testid="category-filter">
                  <SelectValue placeholder="Add Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="policies">Policies</SelectItem>
                  <SelectItem value="procedures">Procedures</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="guidelines">Guidelines</SelectItem>
                  <SelectItem value="best-practices">Best Practices</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Selected Categories as Chips */}
            {selectedCategoriesFilter.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Label className="text-xs text-muted-foreground self-center">Categories:</Label>
                {selectedCategoriesFilter.map((category, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 px-2 py-1 text-xs"
                    data-testid={`selected-category-${category}`}
                  >
                    {category}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => {
                        setSelectedCategoriesFilter(prev => prev.filter((_, i) => i !== index));
                      }}
                      data-testid={`remove-category-filter-${category}`}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Selection Toolbar */}
          {isAdmin && selectedDocIds.size > 0 && (
            <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg mb-3" data-testid="selection-toolbar">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {selectedDocIds.size} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={selectAllVisible}
                  data-testid="select-all-button"
                >
                  Select All ({filteredDocuments.length})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={clearSelection}
                  data-testid="clear-selection-button"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      data-testid="bulk-move-button"
                    >
                      <FolderInput className="h-3 w-3 mr-1" />
                      Move to Folder
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => handleBulkMove(null)}
                      data-testid="move-to-root"
                    >
                      <Folder className="h-4 w-4 mr-2" />
                      No Folder (Root)
                    </DropdownMenuItem>
                    {folders.map((folder) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onClick={() => handleBulkMove(folder.id)}
                        data-testid={`move-to-folder-${folder.id}`}
                      >
                        <Folder className="h-4 w-4 mr-2" />
                        {folder.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          {/* Compact Documents List */}
          {documentsLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                    <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <BookOpen className="w-8 h-8 text-gray-400 mb-2" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">No documents yet</h3>
                <p className="text-xs text-gray-600 text-center mb-3">
                  Get started by creating your first knowledge base document.
                </p>
                <Button size="sm" onClick={handleCreateDocument} className="h-6" data-testid="create-first-document">
                  <Plus className="w-3 h-3 mr-1" />
                  Create Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2" data-testid="documents-container">
              {filteredDocuments.map((document) => (
                <DraggableDocumentCard key={document.id} document={document} />
              ))}
            </div>
          )}
        </div>
      )}
      {/* Team Progress Tab */}
      {activeTab === "progress" && isAdmin && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-medium text-gray-900">Team Progress</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Track training assignments and completion status
            </p>
          </div>
          
          {/* Summary Stats */}
          {assignmentDetails.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <Card>
                <CardContent className="p-2">
                  <div className="text-center">
                    <p className="text-xl font-bold">{assignmentDetails.length}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-2">
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-600">
                      {assignmentDetails.filter(a => a.status === 'completed').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-2">
                  <div className="text-center">
                    <p className="text-xl font-bold text-orange-600">
                      {assignmentDetails.filter(a => a.status === 'pending').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={progressStatusFilter} onValueChange={setProgressStatusFilter}>
              <SelectTrigger className="h-7 w-32 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={progressDocumentFilter} onValueChange={setProgressDocumentFilter}>
              <SelectTrigger className="h-7 w-40 text-xs">
                <SelectValue placeholder="Document" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                {documents.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id.toString()}>
                    {doc.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {assignmentsLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-3">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                    <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : assignmentDetails.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="w-8 h-8 text-gray-400 mb-2" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">No assignments yet</h3>
                <p className="text-xs text-gray-600 text-center mb-3">
                  Start by assigning training documents to team members
                </p>
                <Button size="sm" onClick={() => setActiveTab("documents")} className="h-6">
                  View Documents
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {assignmentDetails
                .filter(assignment => {
                  if (progressStatusFilter !== "all" && assignment.status !== progressStatusFilter) return false;
                  if (progressDocumentFilter !== "all" && assignment.documentId.toString() !== progressDocumentFilter) return false;
                  return true;
                })
                .map((assignment) => (
                <Card 
                  key={assignment.id} 
                  className="hover:shadow-sm transition-all"
                  data-testid={`assignment-row-${assignment.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* User Name - Most Prominent */}
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {assignment.userName || assignment.userEmail || 'Unknown User'}
                          </h3>
                          <Badge 
                            variant={assignment.status === 'completed' ? 'default' : 'secondary'}
                            className="text-xs px-1.5 py-0.5 flex-shrink-0"
                          >
                            {assignment.status === 'completed' ? 'Completed' : 'Pending'}
                          </Badge>
                        </div>
                        
                        {/* Document Name */}
                        <p className="text-xs text-gray-600 mb-1 line-clamp-1 pl-6">
                          {assignment.documentTitle}
                        </p>
                        
                        {/* Dates */}
                        <div className="flex items-center gap-3 pl-6 text-xs">
                          {assignment.dueDate && (
                            <span className={assignment.status === 'pending' && new Date(assignment.dueDate) < new Date() ? 'text-red-600 font-medium' : 'text-gray-500'}>
                              <Calendar className="h-3 w-3 inline mr-1" />
                              Due: {new Date(assignment.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {assignment.completedAt && (
                            <span className="text-green-600">
                              ✓ Completed {new Date(assignment.completedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const document = documents.find(d => d.id === assignment.documentId);
                            if (document) {
                              handleViewDocument(document);
                            }
                          }}
                          className="h-7 w-7 p-0"
                          title="View document"
                          data-testid={`button-view-document-${assignment.id}`}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAssignment(assignment)}
                          className="h-7 w-7 p-0"
                          title="Edit assignment"
                          data-testid={`button-edit-assignment-${assignment.id}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAssignment(assignment)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          title="Delete assignment"
                          data-testid={`button-delete-assignment-${assignment.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
        </div>
      </div>

      {/* Assign Training Dialog */}
      {selectedDocument && (
        <AssignTrainingDialog
          isOpen={showAssignTraining}
          onClose={() => {
            setShowAssignTraining(false);
            setSelectedDocument(null);
          }}
          documentId={selectedDocument.id}
          documentTitle={selectedDocument.title}
        />
      )}

      {/* Edit Assignment Dialog */}
      {selectedAssignment && (
        <EditAssignmentDialog
          isOpen={showEditAssignment}
          onClose={() => {
            setShowEditAssignment(false);
            setSelectedAssignment(null);
          }}
          assignment={selectedAssignment}
          onUpdate={handleUpdateAssignment}
          isUpdating={updateAssignmentMutation.isPending}
        />
      )}
      
      {/* Drag Overlay */}
      <DragOverlay>
        {draggedDocument && <DragOverlayCard document={draggedDocument} />}
      </DragOverlay>
    </div>
    </DndContext>
  );
}