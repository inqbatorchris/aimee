import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, MapPin, Calendar, Clock, CheckCircle } from 'lucide-react';
import WorkflowExecutionPanel from '@/components/field-engineering/WorkflowExecutionPanel';

interface FieldTask {
  id: string;
  organizationId: string;
  assignedUserId: string | null;
  splynxTaskId: number | null;
  taskTypeId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  scheduledDate: string | null;
  completedAt: string | null;
  location: { lat: number; lng: number; address?: string } | null;
  customerInfo: { name?: string; phone?: string; email?: string } | null;
  customFields: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  on_hold: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function TaskDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const { data: task, isLoading, isError } = useQuery<FieldTask>({
    queryKey: [`/api/field-engineering/tasks/${id}`],
    enabled: !!currentUser && !!id,
  });

  const { data: taskTypeConfigs } = useQuery({
    queryKey: ['/api/field-engineering/task-type-configurations'],
    enabled: !!currentUser,
  });

  const { data: workflowTemplate } = useQuery({
    queryKey: ['/api/field-engineering/workflow-templates', taskTypeConfigs, task?.taskTypeId],
    enabled: !!taskTypeConfigs && !!task?.taskTypeId,
    queryFn: async () => {
      if (!taskTypeConfigs || !task?.taskTypeId) return null;
      
      const config = (taskTypeConfigs as any[]).find(
        (c: any) => String(c.splynxTaskTypeId) === String(task.taskTypeId)
      );
      
      if (!config?.workflowTemplateId) return null;
      
      const response = await fetch(`/api/field-engineering/workflow-templates/${config.workflowTemplateId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) return null;
      
      return response.json();
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest(`/api/field-engineering/tasks/${id}`, {
        method: 'PUT',
        body: { status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/field-engineering/tasks'] });
      queryClient.invalidateQueries({ queryKey: [`/api/field-engineering/tasks/${id}`] });
      toast({
        title: 'Success',
        description: 'Task status updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task status',
        variant: 'destructive',
      });
    },
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load task details. Please try again.</p>
            <Button 
              className="mt-4" 
              onClick={() => setLocation('/field-engineering/tasks')}
            >
              Back to Tasks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border p-4 bg-card sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/field-engineering/tasks')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">{task.title}</h1>
            <div className="flex gap-2 flex-wrap">
              <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                {task.priority}
              </Badge>
              <Badge className={statusColors[task.status as keyof typeof statusColors]}>
                {task.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Quick Actions */}
        {task.status !== 'completed' && task.status !== 'cancelled' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {task.status === 'pending' && (
                <Button
                  onClick={() => updateStatusMutation.mutate('in_progress')}
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-start-task"
                >
                  Start Task
                </Button>
              )}
              {task.status === 'in_progress' && (
                <>
                  <Button
                    onClick={() => updateStatusMutation.mutate('completed')}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-complete-task"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate('on_hold')}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-hold-task"
                  >
                    Put On Hold
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Workflow Execution */}
        {workflowTemplate && task.status !== 'completed' && task.status !== 'cancelled' && (
          <WorkflowExecutionPanel
            taskId={task.id}
            workflowTemplate={workflowTemplate}
            onComplete={() => {
              updateStatusMutation.mutate('completed');
            }}
          />
        )}

        {/* Task Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {task.description && (
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground">{task.description}</p>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Scheduled</p>
                  <p className="text-sm text-muted-foreground">{formatDate(task.scheduledDate)}</p>
                </div>
              </div>

              {task.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {task.location.address || `${task.location.lat}, ${task.location.lng}`}
                    </p>
                  </div>
                </div>
              )}

              {task.completedAt && (
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Completed</p>
                    <p className="text-sm text-muted-foreground">{formatDate(task.completedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        {task.customerInfo && Object.keys(task.customerInfo).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {task.customerInfo.name && (
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">{task.customerInfo.name}</p>
                </div>
              )}
              {task.customerInfo.phone && (
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{task.customerInfo.phone}</p>
                </div>
              )}
              {task.customerInfo.email && (
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{task.customerInfo.email}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
