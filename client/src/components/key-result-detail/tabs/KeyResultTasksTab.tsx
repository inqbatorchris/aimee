import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  ChevronRight,
  Repeat,
  Calendar,
  User,
  Trash2,
  Clock,
} from 'lucide-react';
import { KeyResultTaskDetailPanel } from '../KeyResultTaskDetailPanel';
import { DeleteTaskDialog } from '../dialogs/DeleteTaskDialog';
import { format } from 'date-fns';

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
  nextDueDate?: string;
  generationStatus?: string;
  completedCount: number;
  missedCount: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string;
  targetCompletion?: string;
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

interface KeyResultTasksTabProps {
  keyResultId: number;
  keyResult?: any;
  onViewTask?: (taskId: number) => void;
  onTaskPanelStateChange?: (isOpen: boolean) => void;
}

export function KeyResultTasksTab({ keyResultId, keyResult, onViewTask, onTaskPanelStateChange }: KeyResultTasksTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<KeyResultTask | null>(null);
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<KeyResultTask | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state for new task
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    taskType: 'once',
    frequency: 'weekly',
    frequencyDays: [] as number[],
    dayOfMonth: 1,
    duration: 'ongoing',
    endDate: '',
    totalOccurrences: '',
    teamId: '',
    assignedTo: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // Fetch tasks for this key result
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: [`/api/strategy/key-results/${keyResultId}/tasks`],
    queryFn: async () => {
      const response = await apiRequest(`/api/strategy/key-results/${keyResultId}/tasks`);
      return response.json();
    }
  });

  // Fetch teams for assignment (filtered by current organization)
  const { data: teams = [] } = useQuery({
    queryKey: [`/api/core/teams?orgId=${currentUser?.organizationId || 3}`],
    queryFn: async () => {
      const response = await apiRequest(`/api/core/teams?orgId=${currentUser?.organizationId || 3}`);
      return response.json();
    }
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: [`/api/core/users?orgId=${currentUser?.organizationId || 3}`],
    queryFn: async () => {
      const response = await apiRequest(`/api/core/users?orgId=${currentUser?.organizationId || 3}`);
      return response.json();
    }
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/strategy/key-results/${keyResultId}/tasks`, {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/key-results/${keyResultId}/tasks`] });
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
      setShowCreateForm(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create task',
        variant: 'destructive',
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest(`/api/strategy/key-result-tasks/${taskId}?cascade=true`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/key-results/${keyResultId}/tasks`] });
      toast({
        title: 'Success',
        description: 'Task and all dependencies deleted successfully',
      });
      setShowDeleteDialog(false);
      setTaskToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete task',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      taskType: 'once',
      frequency: 'weekly',
      frequencyDays: [],
      dayOfMonth: 1,
      duration: 'ongoing',
      endDate: '',
      totalOccurrences: '',
      teamId: keyResult?.teamId?.toString() || '',
      assignedTo: keyResult?.assignedTo?.toString() || keyResult?.ownerId?.toString() || '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const handleCreateTask = () => {
    const taskData: any = {
      title: formData.title,
      description: formData.description,
      isRecurring: formData.taskType === 'recurring',
      status: 'Not Started',
      teamId: formData.teamId ? parseInt(formData.teamId) : undefined,
      assignedTo: formData.assignedTo === 'none' || !formData.assignedTo ? undefined : parseInt(formData.assignedTo),
    };

    if (formData.taskType === 'recurring') {
      taskData.frequency = formData.frequency;
      taskData.nextDueDate = formData.startDate;
      
      // Set frequency params based on type
      if (formData.frequency === 'weekly' && formData.frequencyDays.length > 0) {
        taskData.frequencyParams = { dayOfWeek: formData.frequencyDays };
      } else if (formData.frequency === 'monthly') {
        taskData.frequencyParams = { dayOfMonth: formData.dayOfMonth };
      }

      // Set duration
      if (formData.duration === 'until_date' && formData.endDate) {
        taskData.endDate = formData.endDate;
      } else if (formData.duration === 'occurrences' && formData.totalOccurrences) {
        taskData.totalOccurrences = parseInt(formData.totalOccurrences);
      }
    } else {
      taskData.targetCompletion = formData.startDate;
    }

    createTaskMutation.mutate(taskData);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task: KeyResultTask) => {
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' && task.status !== 'Completed') ||
                          (statusFilter === 'paused' && task.generationStatus === 'paused') ||
                          (statusFilter === 'completed' && task.status === 'Completed');
    return matchesStatus;
  });

  // Calculate progress display for task
  const getTaskProgress = (task: KeyResultTask) => {
    if (!task.isRecurring) {
      return task.status === 'Completed' ? '100%' : 
             task.status === 'On Track' ? '50%' :
             task.status === 'Stuck' ? '25%' :
             '-';
    }

    if (task.totalOccurrences || task.endDate) {
      // Bounded recurring task
      const total = task.totalOccurrences || 
                   Math.ceil((new Date(task.endDate!).getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 7));
      const percentage = Math.round((task.completedCount / total) * 100);
      return `${percentage}%`;
    }

    // Ongoing recurring task - show completion rate
    const totalAttempts = task.completedCount + task.missedCount;
    const completionRate = totalAttempts > 0 ? Math.round((task.completedCount / totalAttempts) * 100) : 0;
    return `${completionRate}%`;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'On Track':
        return 'secondary';
      case 'Stuck':
        return 'destructive';
      case 'Not Started':
      default:
        return 'outline';
    }
  };

  const canEdit = currentUser?.role === 'admin' || 
                  currentUser?.role === 'manager' || 
                  currentUser?.role === 'super_admin';

  return (
    <div className="space-y-4">
      {/* Compact Header - Match Objectives Page Styling */}
      <div className="flex items-center justify-between ml-[20px] mr-[20px] text-left pl-[0px] pr-[0px] mt-[5px] mb-[5px]">
        <div className="flex gap-1">
          <Button
            variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
            className="h-6 px-2 py-0 text-[11px] font-normal"
            onClick={() => setStatusFilter('all')}
          >
            All Tasks
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'secondary' : 'ghost'}
            className="h-6 px-2 py-0 text-[11px] font-normal"
            onClick={() => setStatusFilter('active')}
          >
            Active
          </Button>
          <Button
            variant={statusFilter === 'paused' ? 'secondary' : 'ghost'}
            className="h-6 px-2 py-0 text-[11px] font-normal"
            onClick={() => setStatusFilter('paused')}
          >
            Paused
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'secondary' : 'ghost'}
            className="h-6 px-2 py-0 text-[11px] font-normal"
            onClick={() => setStatusFilter('completed')}
          >
            Completed
          </Button>
        </div>
        
        {canEdit && (
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="h-6 px-2 py-0 text-[11px] flex items-center gap-1"
            size="sm"
          >
            <Plus className="h-3 w-3" />
            Add Task
          </Button>
        )}
      </div>
      {/* Create Task Form (Collapsed version) */}
      {showCreateForm && (
        <Card className="p-4 space-y-4 border-primary/20">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-xs">Task Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter task title"
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-xs">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter task description"
                rows={2}
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Task Type</Label>
              <RadioGroup 
                value={formData.taskType} 
                onValueChange={(value) => setFormData({ ...formData, taskType: value })}
                className="flex gap-4 mt-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="once" id="once" />
                  <Label htmlFor="once" className="font-normal text-sm cursor-pointer">One-time task</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recurring" id="recurring" />
                  <Label htmlFor="recurring" className="font-normal text-sm cursor-pointer">Recurring task</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.taskType === 'recurring' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Frequency</Label>
                    <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Duration</Label>
                    <Select value={formData.duration} onValueChange={(value) => setFormData({ ...formData, duration: value })}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="until_date">Until Date</SelectItem>
                        <SelectItem value="occurrences">X Occurrences</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.frequency === 'weekly' && (
                  <div>
                    <Label className="text-xs">Days of Week</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <div key={index} className="flex items-center">
                          <Checkbox
                            checked={formData.frequencyDays.includes(index)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({ ...formData, frequencyDays: [...formData.frequencyDays, index] });
                              } else {
                                setFormData({ ...formData, frequencyDays: formData.frequencyDays.filter(d => d !== index) });
                              }
                            }}
                            className="h-4 w-4"
                          />
                          <Label className="text-xs font-normal ml-1">{day}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formData.frequency === 'monthly' && (
                  <div>
                    <Label className="text-xs">Day of Month</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.dayOfMonth}
                      onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) || 1 })}
                      className="h-8 text-sm"
                    />
                  </div>
                )}

                {formData.duration === 'until_date' && (
                  <div>
                    <Label className="text-xs">End Date</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="h-8 text-sm"
                    />
                  </div>
                )}

                {formData.duration === 'occurrences' && (
                  <div>
                    <Label className="text-xs">Total Occurrences</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.totalOccurrences}
                      onChange={(e) => setFormData({ ...formData, totalOccurrences: e.target.value })}
                      placeholder="Number of times to repeat"
                      className="h-8 text-sm"
                    />
                  </div>
                )}

                {/* Schedule Preview */}
                <div className="p-3 bg-muted/50 rounded-md">
                  <Label className="text-xs font-medium">Schedule Preview</Label>
                  <div className="text-xs text-muted-foreground mt-1">
                    This task will run {formData.frequency}
                    {formData.frequency === 'weekly' && formData.frequencyDays.length > 0 && 
                      ` on ${formData.frequencyDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}`}
                    {formData.frequency === 'monthly' && ` on day ${formData.dayOfMonth}`}
                    {formData.duration === 'until_date' && formData.endDate && 
                      ` until ${format(new Date(formData.endDate), 'MMM d, yyyy')}`}
                    {formData.duration === 'occurrences' && formData.totalOccurrences && 
                      ` for ${formData.totalOccurrences} occurrences`}
                    {formData.duration === 'ongoing' && ' indefinitely'}
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Team</Label>
                <Select 
                  value={formData.teamId} 
                  onValueChange={(value) => setFormData({ ...formData, teamId: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team: any) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Assignee</Label>
                <Select 
                  value={formData.assignedTo} 
                  onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.taskType === 'once' && (
              <div>
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="h-8 text-sm"
                />
              </div>
            )}

            {formData.taskType === 'recurring' && (
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="h-8 text-sm"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleCreateTask}
                disabled={!formData.title || !formData.teamId || createTaskMutation.isPending}
              >
                Create Task
              </Button>
            </div>
          </div>
        </Card>
      )}
      {/* Compact Task List */}
      <div className="border rounded-lg overflow-hidden ml-[20px] mr-[20px] mt-[7px] mb-[7px]">
        {isLoading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {statusFilter !== 'all' 
                ? 'No tasks found matching your filter.' 
                : 'No tasks have been created for this key result yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredTasks.map((task: KeyResultTask) => {
              const isExpanded = expandedTaskId === task.id;
              const progress = getTaskProgress(task);
              const isRecurring = task.isRecurring;

              return (
                <div key={task.id} className="hover:bg-accent/5 transition-colors">
                  {/* Main Task Row */}
                  <div 
                    className="px-4 py-2 cursor-pointer"
                    onClick={() => {
                      setSelectedTask(task);
                      setTaskPanelOpen(true);
                      onTaskPanelStateChange?.(true);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <ChevronRight 
                        className={`h-3 w-3 text-muted-foreground transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`} 
                      />
                      
                      <div className="flex-1 flex items-center gap-3">
                        <span className="text-sm font-medium">{task.title}</span>
                        
                        {task.isRecurring ? (
                          <Badge variant="outline" className="text-xs py-0 px-1 h-5">
                            <Repeat className="h-3 w-3 mr-1" />
                            {task.frequency}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs py-0 px-1 h-5">
                            <Clock className="h-3 w-3 mr-1" />
                            One-time
                          </Badge>
                        )}
                        
                        <Badge variant={getStatusVariant(task.status)} className="text-xs py-0 px-1 h-5">
                          {task.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {task.targetCompletion && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.targetCompletion), 'MMM d')}
                          </div>
                        )}
                        
                        {task.assignedUser && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assignedUser.fullName.split(' ')[0]}
                          </div>
                        )}
                        
                        <span className="font-medium text-foreground">
                          {progress}
                        </span>

                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTaskToDelete(task);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && task.description && (
                    <div className="px-4 pb-2 pl-10 border-t">
                      <p className="text-xs text-muted-foreground mt-2">{task.description}</p>
                      
                      {task.isRecurring && (
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Completed: <span className="font-medium">{task.completedCount}</span></span>
                          <span>Missed: <span className="font-medium">{task.missedCount}</span></span>
                          <span>Current Streak: <span className="font-medium">{task.currentStreak}</span></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Task Detail Panel */}
      <KeyResultTaskDetailPanel
        task={selectedTask}
        open={taskPanelOpen}
        onClose={() => {
          setTaskPanelOpen(false);
          setSelectedTask(null);
          onTaskPanelStateChange?.(false);
        }}
        keyResultId={keyResultId}
      />
      
      {/* Delete Task Dialog */}
      <DeleteTaskDialog
        task={taskToDelete}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={(taskId) => deleteTaskMutation.mutate(taskId)}
        isDeleting={deleteTaskMutation.isPending}
      />
    </div>
  );
}