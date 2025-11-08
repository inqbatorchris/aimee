import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Clock, 
  Target, 
  Package,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Settings,
  Briefcase,
  Ban,
  FileText,
  Activity,
  MessageSquare,
  Paperclip,
  ListTodo
} from 'lucide-react';
import { TaskDetailsTab } from './tabs/TaskDetailsTab';
import { TaskActivityTab } from './tabs/TaskActivityTab';
import { TaskCommentsTab } from './tabs/TaskCommentsTab';
import { TaskAttachmentsTab } from './tabs/TaskAttachmentsTab';


interface Task {
  id: number;
  keyResultId?: number;
  title: string;
  description: string;
  taskType: 'project' | 'habit' | 'feature' | 'bug';
  lifecycleStage: string;
  frequency: string;
  frequencyTarget: number;
  department?: string;
  storyPoints?: number;
  labels?: string[];
  votes?: number;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';

  targetCompletion?: string;
  assignedTo?: number;
  sprintId?: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  kpiLabel?: string;
  kpiTargetValue?: number;
  kpiCurrentValue?: number;
  kpiUnit?: string;
  assignedUser?: {
    id: number;
    fullName: string;
    email: string;
  };
  backlogItem?: {
    id: number;
    title: string;
    status: string;
  };
}

interface TaskDetailPanelProps {
  taskId: number | null;
  open: boolean;
  onClose: () => void;
  isCreating?: boolean;
  onViewKeyResult?: (keyResultId: number) => void;
  defaultLifecycleStage?: string;
  keyResultId?: number;
}

export function TaskDetailPanel({ taskId, open, onClose, isCreating = false, onViewKeyResult, defaultLifecycleStage = 'backlog', keyResultId }: TaskDetailPanelProps) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('details');

  // Query for attached documents count
  const { data: attachedDocuments = [] } = useQuery<any[]>({
    queryKey: [`/api/knowledge-base/attachments/task/${taskId}`],
    enabled: open && !!taskId && !isCreating
  });

  // Reset tab when panel opens
  useEffect(() => {
    if (open) {
      setActiveTab('details');
    }
  }, [open]);

  // Fetch task details (only when editing, not creating)
  const { data: task, isLoading } = useQuery({
    queryKey: ['/api/strategy/key-result-tasks', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const response = await apiRequest(`/api/strategy/key-result-tasks/${taskId}`);
      return await response.json();
    },
    enabled: !!taskId && open && !isCreating,
  });

  // For creation mode, create a new task template
  const newTaskTemplate: Task = {
    id: 0,
    title: '',
    description: '',
    taskType: 'project',
    lifecycleStage: keyResultId ? 'active' : defaultLifecycleStage, // If creating for a key result, default to active
    frequency: 'one-time',
    frequencyTarget: 1,
    status: 'todo',
    createdBy: currentUser?.id || 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kpiCurrentValue: 0,
    keyResultId: keyResultId, // Pass the keyResultId if provided
  };

  // Use either the fetched task or the new template
  const currentTask = isCreating ? newTaskTemplate : task;

  // Quick status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest(`/api/strategy/key-result-tasks/${taskId}`, {
        method: 'PATCH',
        body: { status: newStatus }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/key-result-tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work'] });
      if (task?.keyResultId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/strategy/key-results/${task.keyResultId}/tasks`] 
        });
      }
      toast({
        title: 'Status updated',
        description: 'Task status has been updated successfully.'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update task status.',
        variant: 'destructive'
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'cancelled': return <Ban className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'habit': return <Clock className="h-4 w-4 text-purple-600" />;
      case 'feature': return <Package className="h-4 w-4 text-green-600" />;
      case 'bug': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Briefcase className="h-4 w-4 text-blue-600" />;
    }
  };



  const canEdit = currentUser?.role ? ['admin', 'manager', 'super_admin'].includes(currentUser.role) : false;

  // Don't render if we're editing but have no taskId
  if (!isCreating && !taskId) return null;

  // Custom modal implementation without Radix UI to eliminate X buttons
  if (!open) return null;

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      width="600px"
      title={
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-primary" />
          <span className="font-semibold">
            {isCreating ? 'Create New Work Item' : (isLoading ? 'Loading...' : currentTask?.title || 'Task')}
          </span>
        </div>
      }
      description={
        !isCreating && currentTask && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs h-5 px-2 flex items-center gap-1">
              {getStatusIcon(currentTask.status)}
              {currentTask.status}
            </Badge>
            {currentTask.assignedUser && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{currentTask.assignedUser.fullName}</span>
              </div>
            )}
            {currentTask.targetCompletion && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{new Date(currentTask.targetCompletion).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )
      }
    >
      <div className="flex flex-col h-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-2">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-muted-foreground">Loading task details...</p>
            </div>
          </div>
        ) : currentTask ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            {/* Desktop tabs */}
            <TabsList className={`hidden sm:grid w-full mx-4 w-auto mr-8 h-10 ${isCreating ? 'grid-cols-1' : 'grid-cols-4'}`}>
              <TabsTrigger value="details" className="text-sm">
                <FileText className="h-4 w-4 mr-1" />
                {isCreating ? 'Create Work Item' : 'Details'}
              </TabsTrigger>
              {!isCreating && (
                <>
                  <TabsTrigger value="activity" className="text-sm">
                    <Activity className="h-4 w-4 mr-1" />
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="text-sm">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Comments
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="text-sm">
                    <Paperclip className="h-4 w-4 mr-1" />
                    Documents ({attachedDocuments.length})
                  </TabsTrigger>
                </>
              )}
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
                      <FileText className="h-4 w-4 mr-2" />
                      {isCreating ? 'Create Work Item' : 'Details'}
                    </div>
                  </SelectItem>
                  {!isCreating && (
                    <>
                      <SelectItem value="activity">
                        <div className="flex items-center">
                          <Activity className="h-4 w-4 mr-2" />
                          Activity
                        </div>
                      </SelectItem>
                      <SelectItem value="comments">
                        <div className="flex items-center">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Comments
                        </div>
                      </SelectItem>
                      <SelectItem value="attachments">
                        <div className="flex items-center">
                          <Paperclip className="h-4 w-4 mr-2" />
                          Documents ({attachedDocuments.length})
                        </div>
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent 
                value="details" 
                className={cn(
                  "h-full m-0 overflow-y-auto",
                  isMobile && "mobile-tabs-content"
                )}
              >
                <div className="w-full">
                  <TaskDetailsTab 
                    task={currentTask} 
                    canEdit={canEdit} 
                    isCreating={isCreating}
                    onClose={onClose}
                    onViewKeyResult={onViewKeyResult}
                  />
                </div>
              </TabsContent>
              
              {!isCreating && (
                <>
                  <TabsContent 
                    value="activity" 
                    className={cn(
                      "h-full m-0 overflow-y-auto",
                      isMobile && "mobile-tabs-content"
                    )}
                  >
                    <div className="w-full">
                      <TaskActivityTab taskId={currentTask.id} />
                    </div>
                  </TabsContent>
                  
                  <TabsContent 
                    value="comments" 
                    className={cn(
                      "h-full m-0 overflow-y-auto",
                      isMobile && "mobile-tabs-content"
                    )}
                  >
                    <div className="w-full">
                      <TaskCommentsTab taskId={currentTask.id} canComment={!!currentUser} />
                    </div>
                  </TabsContent>
                  
                  <TabsContent 
                    value="attachments" 
                    className={cn(
                      "h-full m-0 overflow-y-auto",
                      isMobile && "mobile-tabs-content"
                    )}
                  >
                    <div className="w-full">
                      <TaskAttachmentsTab taskId={currentTask.id} taskTitle={currentTask.title} />
                    </div>
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-2">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Task not found</p>
            </div>
          </div>
        )}
      </div>
    </SlidePanel>
  );
}