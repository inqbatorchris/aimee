import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target,
  ListTodo,
  Activity,
  TrendingUp,
  AlertCircle,
  Edit2,
  Trash2,
  MoreVertical,
  User,
  CheckCircle2,
  X,
  FileText
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { KeyResultDetailsTab } from './tabs/KeyResultDetailsTab';
import { KeyResultTasksTab } from './tabs/KeyResultTasksTab';
import { KeyResultActivityTab } from './tabs/KeyResultActivityTab';
import EditKeyResultDialog from '@/components/okr/EditKeyResultDialog';
import KeyResultProgressDialog from '@/components/okr/KeyResultProgressDialog';
import { DeleteKeyResultDialog } from '@/components/okr/dialogs/DeleteKeyResultDialog';
import { DocumentAttachmentButton } from '@/components/KnowledgeBase/DocumentAttachmentButton';
import { AttachedDocumentsList } from '@/components/KnowledgeBase/AttachedDocumentsList';

interface KeyResult {
  id: number;
  objectiveId: number;
  title: string;
  description?: string;
  metricType: 'number' | 'percentage' | 'currency' | 'binary';
  targetValue: string;
  currentValue: string;
  unit?: string;
  ownerId?: number;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: number;
    fullName: string;
    email: string;
  };
  objective?: {
    id: number;
    title: string;
  };
}

interface KeyResultDetailPanelProps {
  keyResultId: number | null;
  open: boolean;
  onClose: () => void;
  onEditKeyResult?: (keyResultId: number) => void;
  onViewTask?: (taskId: number) => void;
  initialTab?: string;
}

export function KeyResultDetailPanel({
  keyResultId,
  open,
  onClose,
  onEditKeyResult,
  onViewTask,
  initialTab = 'details'
}: KeyResultDetailPanelProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isTaskPanelCurrentlyOpen, setIsTaskPanelCurrentlyOpen] = useState(false);
  const [wasOpenBeforeTaskPanel, setWasOpenBeforeTaskPanel] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset tab when panel opens with new key result
  useEffect(() => {
    if (open && keyResultId) {
      setActiveTab(initialTab);
    }
  }, [open, keyResultId, initialTab]);
  
  // Handle task panel state changes
  useEffect(() => {
    if (isTaskPanelCurrentlyOpen && open) {
      // Task panel is opening, close this panel and remember it was open
      setWasOpenBeforeTaskPanel(true);
      onClose();
    } else if (!isTaskPanelCurrentlyOpen && wasOpenBeforeTaskPanel) {
      // Task panel closed, reopen this panel if it was open before
      setWasOpenBeforeTaskPanel(false);
      // The parent component should handle reopening
    }
  }, [isTaskPanelCurrentlyOpen]);

  // Fetch key result details using bypass endpoint
  const { data: keyResult, isLoading, error } = useQuery<KeyResult>({
    queryKey: [`/api/strategy/key-results-bypass/${keyResultId}`],
    enabled: open && !!keyResultId,
    queryFn: async () => {
      const response = await fetch(`/api/strategy/key-results-bypass/${keyResultId}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch key result');
      return response.json();
    }
  });

  // Fetch tasks for this key result using bypass endpoint
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: [`/api/strategy/tasks/by-key-result/${keyResultId}`],
    enabled: open && !!keyResultId,
  });

  // Query for attached documents
  const { data: attachedDocuments = [], refetch: refetchAttachedDocuments } = useQuery<any[]>({
    queryKey: [`/api/knowledge-base/attachments/keyResult/${keyResultId}`],
    enabled: open && !!keyResultId
  });

  // Delete key result mutation
  const deleteKeyResultMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/strategy/key-results/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/key-results'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      toast({
        title: "Success",
        description: "Key result deleted successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete key result",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = (id: number) => {
    deleteKeyResultMutation.mutate(id);
    setDeleteDialogOpen(false);
  };

  const canEdit = currentUser?.role === 'admin' || 
                  currentUser?.role === 'manager' || 
                  currentUser?.role === 'super_admin';

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!keyResult) return 0;
    const current = parseFloat(keyResult.currentValue || '0');
    const target = parseFloat(keyResult.targetValue || '0');
    if (target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const progressPercentage = calculateProgress();

  // Status based on progress
  const getStatus = () => {
    if (progressPercentage >= 100) return 'achieved';
    if (progressPercentage >= 75) return 'on_track';
    if (progressPercentage >= 50) return 'at_risk';
    return 'behind';
  };

  const status = getStatus();
  const statusColors: Record<string, string> = {
    achieved: 'bg-green-100 text-green-800',
    on_track: 'bg-blue-100 text-blue-800',
    at_risk: 'bg-yellow-100 text-yellow-800',
    behind: 'bg-red-100 text-red-800',
  };

  const statusLabels: Record<string, string> = {
    achieved: 'Achieved',
    on_track: 'On Track',
    at_risk: 'At Risk',
    behind: 'Behind',
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'achieved': return <CheckCircle2 className="h-3 w-3" />;
      case 'on_track': return <TrendingUp className="h-3 w-3" />;
      case 'at_risk': return <AlertCircle className="h-3 w-3" />;
      default: return <Target className="h-3 w-3" />;
    }
  };

  return (
    <>
      <SlidePanel
        open={open}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3 w-full">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
              <Target className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold flex items-center gap-2">
                {isLoading ? 'Loading...' : (error ? 'Error' : keyResult?.title || 'Key Result')}
                {keyResult && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {progressPercentage}% Complete
                  </span>
                )}
              </div>
              {/* Three-dots menu positioned in header */}
              {canEdit && keyResult && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="absolute top-4 right-14 h-8 w-8 p-0 z-10">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Key Result
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setProgressDialogOpen(true)}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Update Progress
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Key Result
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        }
        description={
          keyResult && (
            <div className="text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-4">
                      <Badge className={`${statusColors[status] || statusColors.behind} h-5 px-2 text-xs flex items-center gap-1`}>
                        {getStatusIcon(status)}
                        {statusLabels[status] || 'Behind'}
                      </Badge>
                      {keyResult?.owner && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{keyResult.owner.fullName}</span>
                        </div>
                      )}
                      {keyResult?.objective && (
                        <div className="text-muted-foreground truncate">
                          Objective: {keyResult.objective.title}
                        </div>
                      )}
                    </div>
            </div>
          )
        }
        className={`${isTaskPanelCurrentlyOpen ? 'pointer-events-none' : ''}`}
      >
          
          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-0">
        <div className="flex flex-col h-full">
          {/* Progress Bar */}
          {keyResult && (
            <div className="px-4 pb-3">
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}

          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="flex flex-col h-full mt-6"
          >
            {/* Desktop tabs */}
            <TabsList className="hidden sm:grid w-full grid-cols-4 mx-6 h-auto p-1">
              <TabsTrigger value="details" className="flex items-center gap-2 py-2">
                <TrendingUp className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-2 py-2">
                <ListTodo className="h-4 w-4" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2 py-2">
                <Activity className="h-4 w-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2 py-2">
                <FileText className="h-4 w-4" />
                Documents ({attachedDocuments.length})
              </TabsTrigger>
            </TabsList>

            {/* Mobile dropdown */}
            <div className="sm:hidden px-4 pb-3">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="details">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Details
                    </div>
                  </SelectItem>
                  <SelectItem value="tasks">
                    <div className="flex items-center">
                      <ListTodo className="h-4 w-4 mr-2" />
                      Tasks
                    </div>
                  </SelectItem>
                  <SelectItem value="activity">
                    <div className="flex items-center">
                      <Activity className="h-4 w-4 mr-2" />
                      Activity
                    </div>
                  </SelectItem>
                  <SelectItem value="documents">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Documents ({attachedDocuments.length})
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">Loading key result details...</div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <div className="text-destructive">Failed to load key result</div>
                </div>
              ) : keyResult ? (
                <>
                  <TabsContent value="details" className="h-full m-0 overflow-y-auto">
                    <div className="w-full max-w-full" style={{ width: '100%', maxWidth: '100%' }}>
                      <KeyResultDetailsTab
                        keyResult={keyResult}
                        canEdit={canEdit}
                        onEdit={() => setEditDialogOpen(true)}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="tasks" className="h-full m-0 overflow-y-auto">
                    <div className="w-full max-w-full" style={{ width: '100%', maxWidth: '100%' }}>
                      <KeyResultTasksTab
                        keyResultId={keyResult.id}
                        keyResult={keyResult}
                        onViewTask={(taskId) => {
                          // Close the key result panel first
                          onClose();
                          // Then open the task panel
                          onViewTask?.(taskId);
                        }}
                        onTaskPanelStateChange={setIsTaskPanelCurrentlyOpen}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="h-full m-0 overflow-y-auto">
                    <div className="w-full max-w-full" style={{ width: '100%', maxWidth: '100%' }}>
                      <KeyResultActivityTab
                        keyResultId={keyResult.id}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="h-full m-0 overflow-y-auto">
                    <div className="w-full max-w-full p-4 space-y-4" style={{ width: '100%', maxWidth: '100%' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-[12px]">Knowledge Base Documents</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Attach relevant documents to provide context and resources for this key result.
                          </p>
                        </div>
                        {keyResult?.id && (
                          <DocumentAttachmentButton
                            entityType="keyResult"
                            entityId={keyResult.id}
                            entityTitle={keyResult?.title}
                            buttonVariant="outline"
                            buttonSize="sm"
                            showLabel={true}
                            attachedDocuments={attachedDocuments}
                            onDocumentsAttached={refetchAttachedDocuments}
                          />
                        )}
                      </div>
                      
                      {keyResult?.id && (
                        attachedDocuments.length > 0 ? (
                          <AttachedDocumentsList
                            entityType="keyResult"
                            entityId={keyResult.id}
                            attachedDocuments={attachedDocuments}
                            onDocumentDetached={refetchAttachedDocuments}
                            showActions={true}
                            compact={true}
                          />
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                            <p className="text-sm">No documents attached yet.</p>
                            <p className="text-xs mt-1">
                              Attach knowledge base documents to provide context and resources.
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </TabsContent>
                </>
              ) : null}
            </div>
          </Tabs>
          </div>
          </div>
      </SlidePanel>
      {/* Edit Key Result Dialog */}
      {keyResult && (
        <EditKeyResultDialog
          keyResult={keyResult}
          objectiveId={keyResult.objectiveId}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
      {/* Progress Update Dialog */}
      {keyResult && (
        <KeyResultProgressDialog
          keyResult={keyResult}
          open={progressDialogOpen}
          onOpenChange={setProgressDialogOpen}
        />
      )}
      {/* Delete Key Result Dialog */}
      {keyResult && (
        <DeleteKeyResultDialog
          keyResult={keyResult}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          isDeleting={deleteKeyResultMutation.isPending}
        />
      )}
    </>
  );
}