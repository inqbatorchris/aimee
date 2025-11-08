import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Users, Plus, FileText, Filter, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DocumentEditorPanel } from "@/components/document-editor/DocumentEditorPanel";
import { EnhancedDocumentCard } from "@/components/document-editor/EnhancedDocumentCard";
import { AssignTrainingDialog } from "@/components/training/AssignTrainingDialog";
import { EditAssignmentDialog } from "@/components/training/EditAssignmentDialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface EnhancedDocument {
  id: number;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  visibility?: 'public' | 'internal' | 'private';
  labels: string[];
  estimatedReadingTime: number;
  createdAt: string;
  updatedAt: string;
  authorId: number;
  authorName: string;
}

interface TrainingProgress {
  userId: number;
  userName: string;
  userEmail: string;
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  overdueAssignments: number;
}

interface AssignmentDetail {
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

export default function Training() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"documents" | "progress">("documents");
  
  // Enhanced document editor panel state
  const [documentPanelOpen, setDocumentPanelOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [documentPanelMode, setDocumentPanelMode] = useState<'edit' | 'preview'>('edit');
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  
  // Assignment dialog state
  const [showAssignTraining, setShowAssignTraining] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<EnhancedDocument | null>(null);
  
  // Edit assignment dialog state
  const [showEditAssignment, setShowEditAssignment] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentDetail | null>(null);
  
  // Filter states
  const [documentStatusFilter, setDocumentStatusFilter] = useState<string>("all");
  const [documentVisibilityFilter, setDocumentVisibilityFilter] = useState<string>("all");
  const [progressStatusFilter, setProgressStatusFilter] = useState<string>("all");
  const [progressDocumentFilter, setProgressDocumentFilter] = useState<string>("all");

  // Fetch knowledge base documents with filters
  const { data: enhancedDocuments = [], isLoading: enhancedLoading } = useQuery<EnhancedDocument[]>({
    queryKey: ["/api/knowledge-base/documents", { 
      status: documentStatusFilter, 
      visibility: documentVisibilityFilter 
    }],
    enabled: activeTab === "documents"
  });
  
  // Filter documents locally
  const filteredDocuments = enhancedDocuments.filter(doc => {
    if (documentStatusFilter !== "all" && doc.status !== documentStatusFilter) return false;
    if (documentVisibilityFilter !== "all" && doc.visibility !== documentVisibilityFilter) return false;
    return true;
  });

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin" || currentUser?.role === "manager";

  // Fetch training progress (admin only)
  const { data: progressData = [], isLoading: progressLoading } = useQuery<TrainingProgress[]>({
    queryKey: ["/api/knowledge-base/team-progress"],
    enabled: activeTab === "progress" && isAdmin
  });

  // Fetch detailed assignments (admin only)
  const { data: assignmentDetails = [], isLoading: assignmentsLoading } = useQuery<AssignmentDetail[]>({
    queryKey: ["/api/knowledge-base/assignments"],
    enabled: activeTab === "progress" && isAdmin
  });

  const handleCreateDocument = () => {
    setSelectedDocumentId(null);
    setIsCreatingDocument(true);
    setDocumentPanelMode('edit');
    setDocumentPanelOpen(true);
  };

  const handleEditDocument = (document: EnhancedDocument) => {
    setSelectedDocumentId(document.id);
    setIsCreatingDocument(false);
    setDocumentPanelMode(document.status === 'draft' ? 'edit' : 'preview');
    setDocumentPanelOpen(true);
  };

  const handleAssignDocument = (document: EnhancedDocument) => {
    setSelectedDocument(document);
    setShowAssignTraining(true);
  };

  // Delete document mutation with optimistic updates
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await apiRequest(`/api/enhanced-knowledge/documents/${documentId}`, {
        method: 'DELETE'
      });
      
      // Parse the JSON response
      const data = await response.json();
      
      // The backend returns { success: true, deletedId: id } on success
      // If there's an error property, it failed
      if (data.error) {
        throw new Error(data.message || data.error || 'Failed to delete document');
      }
      
      return { documentId, data };
    },
    onMutate: async (documentId: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/knowledge-base/documents'] });

      // Snapshot the previous value
      const previousDocuments = queryClient.getQueryData<EnhancedDocument[]>(['/api/knowledge-base/documents']);

      // Optimistically update to the new value
      queryClient.setQueryData<EnhancedDocument[]>(['/api/knowledge-base/documents'], (old) => {
        return old ? old.filter(doc => doc.id !== documentId) : [];
      });

      // Return a context object with the snapshotted value
      return { previousDocuments };
    },
    onSuccess: () => {
      toast({
        title: 'Document deleted successfully'
      });
      
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ 
        queryKey: ['/api/knowledge-base/documents'],
        exact: true
      });
    },
    onError: (error: any, documentId: number, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
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
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/documents'] });
    }
  });

  const handleDeleteDocument = (document: EnhancedDocument) => {
    if (!confirm(`Are you sure you want to delete "${document.title}"?`)) {
      return;
    }

    deleteDocumentMutation.mutate(document.id);
  };

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignment: AssignmentDetail) => {
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

  const handleDeleteAssignment = (assignment: AssignmentDetail) => {
    if (!confirm(`Are you sure you want to delete this assignment for ${assignment.userName}?`)) {
      return;
    }
    deleteAssignmentMutation.mutate(assignment);
  };

  const handleEditAssignment = (assignment: AssignmentDetail) => {
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

  return (
    <div className="container mx-auto px-3 py-3">
      <div className="mb-3">
        <h1 className="text-lg font-semibold text-gray-900">Knowledge Base</h1>
        <p className="text-sm text-gray-600 mt-0.5">Manage training documents and team progress</p>
      </div>

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
              <h2 className="text-sm font-medium text-gray-900">Documents</h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Manage and organize knowledge base documents
              </p>
            </div>
            {isAdmin && (
              <Button type="button" size="sm" onClick={handleCreateDocument} className="flex items-center gap-1 h-7">
                <Plus className="w-3 h-3" />
                <span className="hidden sm:inline">Create Document</span>
                <span className="sm:hidden">Create</span>
              </Button>
            )}
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={documentStatusFilter} onValueChange={setDocumentStatusFilter}>
              <SelectTrigger className="h-7 w-32 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={documentVisibilityFilter} onValueChange={setDocumentVisibilityFilter}>
              <SelectTrigger className="h-7 w-32 text-xs">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Visibility</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Compact Documents List */}
          {enhancedLoading ? (
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
                {isAdmin && (
                  <Button size="sm" onClick={handleCreateDocument} className="h-6">
                    <Plus className="w-3 h-3 mr-1" />
                    Create Document
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredDocuments.map((document) => (
                <EnhancedDocumentCard
                  key={document.id}
                  document={document}
                  onClick={() => handleEditDocument(document)}
                  onEdit={() => handleEditDocument(document)}
                  onDelete={() => handleDeleteDocument(document)}
                  onAssign={() => handleAssignDocument(document)}
                  isAdmin={isAdmin}
                />
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
              Monitor training completion across your team
            </p>
          </div>
          
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
                {enhancedDocuments.map((doc) => (
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
                  <CardContent className="p-2">
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
                <h3 className="text-sm font-medium text-gray-900 mb-1">No training assignments</h3>
                <p className="text-xs text-gray-600 text-center">
                  No team members have been assigned training yet.
                </p>
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
                <Card key={assignment.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-2">
                        <h3 className="text-xs font-medium line-clamp-1">
                          {assignment.documentTitle}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">
                            {assignment.userName}
                          </p>
                          <Badge 
                            variant={assignment.status === 'completed' ? 'default' : 'secondary'}
                            className="text-xs px-1 py-0"
                          >
                            {assignment.status === 'completed' ? 'Completed' : 'Pending'}
                          </Badge>
                          {assignment.priority && assignment.priority !== 'medium' && (
                            <Badge 
                              variant={assignment.priority === 'high' ? 'destructive' : 'outline'}
                              className="text-xs px-1 py-0"
                            >
                              {assignment.priority}
                            </Badge>
                          )}
                        </div>
                        {assignment.completedAt && (
                          <p className="text-xs text-green-600 mt-0.5">
                            Completed {new Date(assignment.completedAt).toLocaleDateString()}
                          </p>
                        )}
                        {assignment.dueDate && assignment.status === 'pending' && (
                          <p className="text-xs text-orange-600 mt-0.5">
                            Due {new Date(assignment.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const document = enhancedDocuments.find(d => d.id === assignment.documentId);
                            if (document) {
                              handleEditDocument(document);
                            }
                          }}
                          className="h-6 w-6 p-0"
                          title="View document"
                          data-testid={`button-view-document-${assignment.id}`}
                        >
                          <FileText className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAssignment(assignment)}
                          className="h-6 w-6 p-0"
                          title="Edit assignment"
                          data-testid={`button-edit-assignment-${assignment.id}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAssignment(assignment)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
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

      {/* Document Editor Panel */}
      <DocumentEditorPanel
        open={documentPanelOpen}
        onClose={() => setDocumentPanelOpen(false)}
        documentId={selectedDocumentId}
        isCreating={isCreatingDocument}
      />

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
    </div>
  );
}