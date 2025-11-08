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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ListTodo,
  Activity,
  TrendingUp,
  Edit2,
  Trash2,
  MoreVertical,
  User,
  Users,
  Repeat,
  Calendar,
  CheckCircle2,
  Target,
  Save,
  X,
  Info,
  FileText,
  ChevronRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { TaskProgressTab } from '@/components/task-detail/tabs/TaskProgressTab';
import { TaskActivityTab } from '@/components/task-detail/tabs/TaskActivityTab';
import { DeleteTaskDialog } from './dialogs/DeleteTaskDialog';
import { DocumentAttachmentButton } from '@/components/KnowledgeBase/DocumentAttachmentButton';
import { AttachedDocumentsList } from '@/components/KnowledgeBase/AttachedDocumentsList';
import WorkItemPanel from '@/components/work-items/WorkItemPanel';

interface KeyResultTask {
  id: number;
  keyResultId: number;
  title: string;
  description?: string;
  status: string;
  isRecurring: boolean;
  frequency?: string;
  frequencyParams?: any;
  endDate?: string;
  totalOccurrences?: number;
  teamId?: number;
  assignedTo?: number;
  ownerId?: number;
  nextDueDate?: string;
  targetCompletion?: string;
  generationStatus?: string;
  completedCount: number;
  missedCount: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string;
  activityLog?: any[];
  createdAt: string;
  updatedAt: string;
  team?: {
    id: number;
    name: string;
  };
  assignedUser?: {
    id: number;
    fullName: string;
    email: string;
  };
}

interface KeyResultTaskDetailPanelProps {
  task: KeyResultTask | null;
  open: boolean;
  onClose: () => void;
  keyResultId: number;
}

export function KeyResultTaskDetailPanel({
  task,
  open,
  onClose,
  keyResultId
}: KeyResultTaskDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [workItemPanelState, setWorkItemPanelState] = useState<{ mode: 'view' | 'edit' | null; id?: number }>({ mode: null });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Not Started',
    teamId: 'none',
    assignedTo: 'none',
    targetCompletion: '',
    isRecurring: false,
    frequency: 'weekly',
    frequencyDays: [] as number[],
    dayOfMonth: 1,
    duration: 'ongoing',
    endDate: '',
    totalOccurrences: ''
  });
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch teams for assignment (filtered by current organization)
  const { data: teams = [] } = useQuery({
    queryKey: [`/api/core/teams?orgId=${currentUser?.organizationId || 3}`],
    queryFn: async () => {
      const response = await apiRequest(`/api/core/teams?orgId=${currentUser?.organizationId || 3}`);
      return response.json();
    }
  });

  // Fetch users for assignment from organization
  const { data: users = [] } = useQuery({
    queryKey: [`/api/core/users?orgId=${currentUser?.organizationId || 3}`],
    queryFn: async () => {
      const response = await apiRequest(`/api/core/users?orgId=${currentUser?.organizationId || 3}`);
      return response.json();
    }
  });

  // Initialize form when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'Not Started',
        teamId: task.teamId?.toString() || 'none',
        assignedTo: task.assignedTo?.toString() || 'none',
        targetCompletion: task.targetCompletion ? 
          format(new Date(task.targetCompletion), 'yyyy-MM-dd') : '',
        isRecurring: task.isRecurring || false,
        frequency: task.frequency || 'weekly',
        frequencyDays: task.frequencyParams?.dayOfWeek || [],
        dayOfMonth: task.frequencyParams?.dayOfMonth || 1,
        duration: task.totalOccurrences ? 'occurrences' : task.endDate ? 'until_date' : 'ongoing',
        endDate: task.endDate ? format(new Date(task.endDate), 'yyyy-MM-dd') : '',
        totalOccurrences: task.totalOccurrences?.toString() || ''
      });
    }
  }, [task]);

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/strategy/key-result-tasks/${task?.id}`, {
        method: 'PATCH',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/key-results/${keyResultId}/tasks`] });
      // Also invalidate activity logs for this task
      queryClient.invalidateQueries({ queryKey: [`/api/key-result-tasks/${task?.id}/activity`] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => 
      apiRequest(`/api/strategy/key-result-tasks/${taskId}?cascade=true`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/key-results/${keyResultId}/tasks`] });
      toast({
        title: "Success",
        description: "Task and all dependencies deleted successfully",
      });
      setShowDeleteDialog(false);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
      setShowDeleteDialog(false);
    },
  });

  // Update task status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => 
      apiRequest(`/api/strategy/key-result-tasks/${task?.id}`, { 
        method: 'PATCH',
        body: { status }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/key-results/${keyResultId}/tasks`] });
      // Also invalidate activity logs for this task
      queryClient.invalidateQueries({ queryKey: [`/api/key-result-tasks/${task?.id}/activity`] });
      toast({
        title: "Success",
        description: "Task status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  // Calculate progress for task
  const getProgress = () => {
    if (!task) return 0;
    
    if (!task.isRecurring) {
      return task.status === 'Completed' ? 100 : 
             task.status === 'In Progress' ? 50 : 0;
    }

    // For recurring tasks
    if (task.totalOccurrences) {
      return Math.round((task.completedCount / task.totalOccurrences) * 100);
    }
    
    // For ongoing recurring tasks, show completion rate
    const totalAttempts = task.completedCount + task.missedCount;
    return totalAttempts > 0 ? Math.round((task.completedCount / totalAttempts) * 100) : 0;
  };

  const handleSave = () => {
    const updates: any = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      teamId: formData.teamId && formData.teamId !== 'none' ? parseInt(formData.teamId) : undefined,
      assignedTo: formData.assignedTo && formData.assignedTo !== 'none' ? parseInt(formData.assignedTo) : undefined,
    };

    if (formData.targetCompletion && !task?.isRecurring) {
      updates.targetCompletion = new Date(formData.targetCompletion).toISOString();
    }

    updateTaskMutation.mutate(updates);
  };

  const handleDelete = () => {
    if (!task) return;
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = (taskId: number) => {
    deleteTaskMutation.mutate(taskId);
  };

  const handleStatusChange = (newStatus: string) => {
    if (!task) return;
    updateStatusMutation.mutate(newStatus);
  };

  const openWorkItemPanel = (workItemId: number) => {
    setWorkItemPanelState({ mode: 'view', id: workItemId });
  };

  const closeWorkItemPanel = () => {
    setWorkItemPanelState({ mode: null });
  };

  const canEdit = currentUser?.role === 'admin' || 
                  currentUser?.role === 'manager' || 
                  currentUser?.role === 'super_admin';

  // Query for attached documents
  const { data: attachedDocuments = [], refetch: refetchAttachedDocuments } = useQuery<any[]>({
    queryKey: [`/api/knowledge-base/attachments/task/${task?.id}`],
    enabled: open && !!task?.id
  });

  // Query for linked work items
  const { data: taskWorkItems = [] } = useQuery<any[]>({
    queryKey: [`/api/work-items?keyResultTaskId=${task?.id}`],
    enabled: open && !!task?.id,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true // Refetch when opening panel
  });

  const progressPercentage = getProgress();
  const selectedWorkItem = taskWorkItems.find(item => item.id === workItemPanelState.id);

  if (!task) return null;

  return (
    <>
      <SlidePanel
        open={open}
      onClose={onClose}
      title={
        <div className="flex items-start justify-between gap-2 pr-8 w-full">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary flex-shrink-0" />
              <h2 className="truncate text-[14px] font-medium">{task.title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {task.isRecurring && (
              <Badge variant="outline" className="text-xs">
                <Repeat className="h-3 w-3 mr-1" />
                {task.frequency}
              </Badge>
            )}
            <Badge variant={task.status === 'Completed' ? 'default' : 
                          task.status === 'In Progress' ? 'secondary' : 'outline'}>
              {task.status || 'Not Started'}
            </Badge>
          </div>
        </div>
      }
      description={
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="font-medium">{progressPercentage}%</span>
            <span>Complete</span>
          </div>
          {task.assignedUser && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{task.assignedUser.fullName}</span>
            </div>
          )}
          {task.team && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{task.team.name}</span>
            </div>
          )}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => handleStatusChange('In Progress')}
                  disabled={task.status === 'In Progress'}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Mark In Progress
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleStatusChange('Completed')}
                  disabled={task.status === 'Completed'}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Complete
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      }
    >
      <div className="flex flex-col h-full">
        {/* Progress Bar */}
        <div className="px-4 pb-3">
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="flex flex-col h-full"
        >
          {/* Desktop tabs */}
          <TabsList className={`hidden sm:grid w-full mx-4 w-auto mr-8 h-10 ${
            task.isRecurring ? 'grid-cols-5' : 'grid-cols-4'
          }`}>
            <TabsTrigger value="details" className="text-sm">
              <Target className="h-4 w-4 mr-1" />
              Details
            </TabsTrigger>
            {task.isRecurring && (
              <TabsTrigger value="progress" className="text-sm">
                <TrendingUp className="h-4 w-4 mr-1" />
                Progress
              </TabsTrigger>
            )}
            <TabsTrigger value="activity" className="text-sm">
              <Activity className="h-4 w-4 mr-1" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="workitems" className="text-sm">
              <ListTodo className="h-4 w-4 mr-1" />
              Work Items
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-sm">
              <FileText className="h-4 w-4 mr-1" />
              Documents
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
                    <Target className="h-4 w-4 mr-2" />
                    Details
                  </div>
                </SelectItem>
                {task.isRecurring && (
                  <SelectItem value="progress">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Progress
                    </div>
                  </SelectItem>
                )}
                <SelectItem value="activity">
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 mr-2" />
                    Activity
                  </div>
                </SelectItem>
                <SelectItem value="workitems">
                  <div className="flex items-center">
                    <ListTodo className="h-4 w-4 mr-2" />
                    Work Items
                  </div>
                </SelectItem>
                <SelectItem value="documents">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Documents
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="details" className="h-full overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Always-editable form */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {formData.isRecurring ? (
                      <>
                        <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">Recurring task</span>
                      </>
                    ) : (
                      <>
                        <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">One-time task</span>
                      </>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="title" className="text-xs">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="h-8 text-sm"
                      disabled={!canEdit}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-xs">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="text-sm"
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status" className="text-xs">Status</Label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Not Started">Not Started</SelectItem>
                          <SelectItem value="On Track">On Track</SelectItem>
                          <SelectItem value="Stuck">Stuck</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {!task.isRecurring && (
                      <div>
                        <Label htmlFor="targetCompletion" className="text-xs">Due Date</Label>
                        <Input
                          id="targetCompletion"
                          type="date"
                          value={formData.targetCompletion}
                          onChange={(e) => setFormData({ ...formData, targetCompletion: e.target.value })}
                          className="h-8 text-sm"
                          disabled={!canEdit}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="team" className="text-xs">Team</Label>
                      <Select 
                        value={formData.teamId || 'none'} 
                        onValueChange={(value) => setFormData({ ...formData, teamId: value === 'none' ? '' : value })}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No team</SelectItem>
                          {(teams as any[]).map((team: any) => (
                            <SelectItem key={team.id} value={team.id.toString()}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="assignee" className="text-xs">Assignee</Label>
                      <Select 
                        value={formData.assignedTo || 'none'} 
                        onValueChange={(value) => setFormData({ ...formData, assignedTo: value === 'none' ? '' : value })}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {(users as any[]).map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {task.isRecurring && (
                    <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="text-xs font-medium">Recurring Task Information</h4>
                        <div className="flex items-center gap-1">
                          <Info className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Read-only</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground">Frequency:</span>
                          <Badge variant="outline" className="ml-2">
                            {task.frequency}
                          </Badge>
                        </div>
                        {task.nextDueDate && (
                          <div>
                            <span className="text-muted-foreground">Next Due:</span>
                            <span className="ml-2 font-medium">
                              {format(new Date(task.nextDueDate), 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}
                        {task.endDate && (
                          <div>
                            <span className="text-muted-foreground">End Date:</span>
                            <span className="ml-2 font-medium">
                              {format(new Date(task.endDate), 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}
                        {task.totalOccurrences && (
                          <div>
                            <span className="text-muted-foreground">Total Occurrences:</span>
                            <span className="ml-2 font-medium">{task.totalOccurrences}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {canEdit && (
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={updateTaskMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save Changes
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            {task.isRecurring && (
              <TabsContent value="progress" className="h-full overflow-y-auto">
                <TaskProgressTab task={task} />
              </TabsContent>
            )}
            
            <TabsContent value="activity" className="h-full overflow-y-auto">
              <TaskActivityTab taskId={task.id} />
            </TabsContent>
            
            <TabsContent value="workitems" className="h-full overflow-y-auto">
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="font-medium text-[12px]">Linked Work Items</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {task.isRecurring 
                      ? `Generated work items from this recurring task (${taskWorkItems.length} total)`
                      : 'The work item generated from this one-off task'
                    }
                  </p>
                </div>
                
                {taskWorkItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No work items found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {taskWorkItems.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        data-testid={`workitem-row-${item.id}`}
                        onClick={() => openWorkItemPanel(item.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm truncate">
                              {item.title}
                            </h4>
                            <Badge 
                              variant={
                                item.status === 'Completed' ? 'default' :
                                item.status === 'In Progress' ? 'secondary' :
                                item.status === 'Stuck' ? 'destructive' :
                                'outline'
                              }
                              className="text-xs"
                            >
                              {item.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {item.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(item.dueDate), 'MMM d, yyyy')}
                              </span>
                            )}
                            {item.assignee && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.assignee.fullName}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="documents" className="h-full overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-[12px]">Knowledge Base Documents</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Attach relevant documents to provide context and resources for this task.
                    </p>
                  </div>
                  <DocumentAttachmentButton
                    entityType="task"
                    entityId={task.id}
                    entityTitle={task.title}
                    buttonVariant="outline"
                    buttonSize="sm"
                    showLabel={true}
                    attachedDocuments={attachedDocuments}
                    onDocumentsAttached={refetchAttachedDocuments}
                  />
                </div>
                
                <AttachedDocumentsList
                  entityType="task"
                  entityId={task.id}
                  attachedDocuments={attachedDocuments}
                  onDocumentDetached={refetchAttachedDocuments}
                  showActions={true}
                  compact={true}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </SlidePanel>
      
      {workItemPanelState.mode && (
        <WorkItemPanel
          isOpen={true}
          mode={workItemPanelState.mode}
          workItemId={workItemPanelState.id}
          onClose={closeWorkItemPanel}
          workItem={selectedWorkItem}
          onOpenKeyResult={(keyResultId: number) => {
            closeWorkItemPanel();
          }}
        />
      )}
      
      <DeleteTaskDialog
        task={task}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteTaskMutation.isPending}
      />
    </>
  );
}