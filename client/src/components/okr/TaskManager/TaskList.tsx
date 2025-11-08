import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Plus, 
  Calendar,
  CalendarDays,
  Target,
  Zap,
  User,
  MoreHorizontal,
  Flame,
  TrendingUp,
  HelpCircle,
  Repeat,
  Edit2,
  CircleX,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HabitTracker } from './HabitTracker';
import { BacklogTaskSelector } from './BacklogTaskSelector';
import { HabitExplanationDialog } from './HabitExplanationDialog';
import { TaskDetailPanel } from '../../task-detail/TaskDetailPanel';

interface Task {
  id: number;
  title: string;
  description?: string;
  taskType: 'project' | 'habit' | 'milestone';
  frequency: 'daily' | 'weekly' | 'monthly' | 'one-time';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
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
  targetCompletion?: string;
  createdAt: string;
  // KPI Progress fields
  kpiLabel?: string;
  kpiTargetValue?: number;
  kpiCurrentValue?: number;
  kpiUnit?: string;
}

interface TaskListProps {
  keyResultId: number;
  keyResultTitle: string;
}

export function TaskList({ keyResultId, keyResultTitle }: TaskListProps) {
  const { currentUser: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [backlogDialogOpen, setBacklogDialogOpen] = useState(false);
  const [habitHelpOpen, setHabitHelpOpen] = useState(false);

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['/api/strategy/key-results', keyResultId, 'tasks'],
    queryFn: async () => {
      const response = await apiRequest(`/api/strategy/key-results/${keyResultId}/tasks`);
      return await response.json();
    }
  });

  // Ensure tasks is always an array
  const taskList = Array.isArray(tasks) ? tasks : [];

  const updateTaskMutation = useMutation({
    mutationFn: (data: { taskId: number; updates: Partial<Task> }) =>
      apiRequest(`/api/strategy/tasks/${data.taskId}`, {
        method: 'PUT',
        body: data.updates
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/key-results', keyResultId, 'tasks'] });
      toast({
        title: 'Success',
        description: 'Task updated successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task',
        variant: 'destructive'
      });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) =>
      apiRequest(`/api/strategy/tasks/${taskId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/key-results', keyResultId, 'tasks'] });
      toast({
        title: 'Success',
        description: 'Task deleted successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error', 
        description: error.message || 'Failed to delete task',
        variant: 'destructive'
      });
    }
  });

  const handleTaskStatusChange = (taskId: number, newStatus: string) => {
    updateTaskMutation.mutate({
      taskId,
      updates: { status: newStatus as 'todo' | 'in_progress' | 'completed' | 'cancelled' }
    });
  };

  const handleEditTask = (task: Task) => {
    setSelectedTaskId(task.id);
    setTaskPanelOpen(true);
  };

  const handleDeleteTask = (taskId: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const getFrequencyIcon = (frequency: string) => {
    switch (frequency) {
      case 'daily':
        return <Repeat className="h-4 w-4 text-green-600 md:h-3 md:w-3" />;
      case 'weekly':
        return <Calendar className="h-4 w-4 text-blue-600 md:h-3 md:w-3" />;
      case 'monthly':
        return <CalendarDays className="h-4 w-4 text-purple-600 md:h-3 md:w-3" />;
      case 'one-time':
      default:
        return <CheckCircle2 className="h-4 w-4 text-gray-600 md:h-3 md:w-3" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'habit': return <Zap className="h-3 w-3" />;
      case 'milestone': return <Target className="h-3 w-3" />;
      default: return <Circle className="h-3 w-3" />;
    }
  };

  const getStatusIcon = (status: string, taskType: string) => {
    if (status === 'completed') {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    if (status === 'in_progress') {
      return <Clock className="h-4 w-4 text-blue-600" />;
    }
    return <Circle className="h-4 w-4 text-gray-400" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-100 rounded border"></div>
          </div>
        ))}
      </div>
    );
  }

  // Ensure tasks is always an array to prevent filter errors  
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  
  // Unified task system: frequency determines behavior, not taskType
  const oneTimeTasks = safeTasks.filter((t: Task) => t.frequency === 'one-time');
  const recurringTasks = safeTasks.filter((t: Task) => t.frequency !== 'one-time');

  const completedTasks = safeTasks.filter((t: Task) => t.status === 'completed').length;
  const totalTasks = safeTasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Task Summary */}
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <h3 className="text-sm font-medium whitespace-nowrap">Tasks ({safeTasks.length})</h3>
          {/* Habit Help Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setHabitHelpOpen(true)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary flex-shrink-0"
            title="Learn about habit tracking"
          >
            <HelpCircle className="h-3 w-3" />
          </Button>
          {totalTasks > 0 && (
            <div className="flex items-center space-x-2 min-w-0">
              <Progress value={progressPercentage} className="w-16 md:w-20 h-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {completedTasks}/{totalTasks}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBacklogDialogOpen(true)}
            className="h-7 text-xs md:h-6 whitespace-nowrap"
          >
            <Plus className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">From Backlog</span>
            <span className="sm:hidden">Backlog</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setSelectedTaskId(null);
              setTaskPanelOpen(true);
            }}
            className="h-7 text-xs md:h-6 whitespace-nowrap"
          >
            <Plus className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Create Task</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      </div>

      {/* Tasks List */}
      {taskList.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
          <Target className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">No tasks yet</h3>
          <p className="text-xs text-gray-500 mb-3">
            Create tasks to break down this key result into actionable items
          </p>
          <Button
            size="sm"
            onClick={() => {
              setSelectedTaskId(null);
              setTaskPanelOpen(true);
            }}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Create First Task
          </Button>
        </div>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {taskList.map((task: Task) => (
            <Card key={task.id} className="p-3 hover:shadow-md transition-shadow border-l-2 border-l-primary/30 md:p-3">
              <div className="flex items-start space-x-2">
                {/* Status Checkbox */}
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={(checked) => {
                    handleTaskStatusChange(
                      task.id,
                      checked ? 'completed' : 'todo'
                    );
                  }}
                  className="flex-shrink-0 mt-0.5"
                />

                {/* Task Content - Compact */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors md:p-2"
                  onClick={() => handleEditTask(task)}
                >
                  {/* Title Row */}
                  <div className="flex items-center space-x-2 mb-1">
                    {getFrequencyIcon(task.frequency)}
                    <span className="text-sm font-medium text-gray-900 md:text-xs">
                      {task.title}
                    </span>
                    {task.frequency !== 'one-time' && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800">
                        {task.frequency}
                      </Badge>
                    )}
                    {task.backlogItem && (
                      <Badge variant="secondary" className="text-xs px-1 py-0 hidden md:inline-flex">
                        #{task.backlogItem.id}
                      </Badge>
                    )}
                  </div>

                  {/* Meta Info Row - Compact */}
                  <div className="flex items-center space-x-3 text-xs text-muted-foreground mb-2">
                    {task.assignedUser && (
                      <span className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span className="hidden sm:inline">{task.assignedUser.fullName}</span>
                        <span className="sm:hidden">{task.assignedUser.fullName.split(' ')[0]}</span>
                      </span>
                    )}

                    {task.targetCompletion && (
                      <span className="flex items-center space-x-1">
                        <span className="hidden md:inline">{new Date(task.targetCompletion).toLocaleDateString()}</span>
                        <span className="md:hidden">{new Date(task.targetCompletion).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </span>
                    )}
                  </div>

                  {/* Recurring Task Progress */}
                  {task.frequency !== 'one-time' && (
                    <HabitTracker
                      taskId={task.id}
                      taskTitle={task.title}
                      frequency={task.frequency}
                      kpiLabel={task.kpiLabel}
                      kpiTargetValue={task.kpiTargetValue}
                      kpiCurrentValue={task.kpiCurrentValue}
                      kpiUnit={task.kpiUnit}
                    />
                  )}
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 md:h-6 md:w-6 flex-shrink-0">
                      <MoreHorizontal className="h-4 w-4 md:h-3 md:w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTask(task);
                      }}
                      className="text-sm md:text-xs"
                    >
                      Edit Task
                    </DropdownMenuItem>
                    {task.frequency !== 'one-time' && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          /* TODO: Open recurring task details */
                        }}
                        className="text-sm md:text-xs"
                      >
                        View Progress
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                      }}
                      className="text-sm md:text-xs text-red-600"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <TaskDetailPanel
        open={taskPanelOpen}
        onClose={() => setTaskPanelOpen(false)}
        taskId={selectedTaskId}
        keyResultId={keyResultId}
        isCreating={!selectedTaskId}
      />

      <BacklogTaskSelector
        open={backlogDialogOpen}
        onOpenChange={setBacklogDialogOpen}
        keyResultId={keyResultId}
        keyResultTitle={keyResultTitle}
      />

      <HabitExplanationDialog
        open={habitHelpOpen}
        onOpenChange={setHabitHelpOpen}
      />
    </div>
  );
}