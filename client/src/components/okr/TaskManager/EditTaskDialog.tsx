import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const editTaskFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  taskType: z.enum(['project', 'habit', 'milestone']),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'one-time']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['todo', 'in_progress', 'completed', 'cancelled']),
  targetCompletion: z.string().optional(),
  assignedTo: z.string().optional(),
  kpiLabel: z.string().optional(),
  kpiTargetValue: z.number().optional(),
  kpiCurrentValue: z.number().optional(),
  kpiUnit: z.string().optional(),
});

type EditTaskFormData = z.infer<typeof editTaskFormSchema>;

interface Task {
  id: number;
  title: string;
  description?: string;
  taskType: 'project' | 'habit' | 'milestone';
  frequency: 'daily' | 'weekly' | 'monthly' | 'one-time';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  targetCompletion?: string;
  keyResultId: number;
  assignedTo?: number;
  assignedUser?: {
    id: number;
    fullName: string;
    email: string;
  };
  kpiLabel?: string;
  kpiTargetValue?: number;
  kpiCurrentValue?: number;
  kpiUnit?: string;
}

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  keyResultId: number;
}

export function EditTaskDialog({ open, onOpenChange, task, keyResultId }: EditTaskDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users for assignment dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: open // Only fetch when dialog is open
  });

  const form = useForm<EditTaskFormData>({
    resolver: zodResolver(editTaskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      taskType: 'project',
      frequency: 'one-time',
      priority: 'medium',
      status: 'todo',
      targetCompletion: '',
      assignedTo: 'unassigned',
      kpiLabel: '',
      kpiTargetValue: undefined,
      kpiCurrentValue: undefined,
      kpiUnit: '',
    },
  });

  // Reset form when task changes
  useEffect(() => {
    if (task && open) {
      console.log('EditTaskDialog: Resetting form with task:', task);
      console.log('EditTaskDialog: KPI data:', {
        kpiLabel: task.kpiLabel,
        kpiTargetValue: task.kpiTargetValue,
        kpiCurrentValue: task.kpiCurrentValue,
        kpiUnit: task.kpiUnit
      });
      form.reset({
        title: task.title || '',
        description: task.description || '',
        taskType: task.taskType || 'project',
        frequency: task.frequency || 'one-time',
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        targetCompletion: task.targetCompletion || '',
        assignedTo: task.assignedUser?.id ? task.assignedUser.id.toString() : (task.assignedTo ? task.assignedTo.toString() : 'unassigned'),
        kpiLabel: task.kpiLabel || '',
        kpiTargetValue: task.kpiTargetValue || undefined,
        kpiCurrentValue: task.kpiCurrentValue || undefined,
        kpiUnit: task.kpiUnit || '',
      });
    }
  }, [task, open, form]);

  const updateTaskMutation = useMutation({
    mutationFn: (data: EditTaskFormData) =>
      apiRequest(`/api/strategy/key-result-tasks/${task?.id}`, {
        method: 'PATCH',
        body: {
          ...data,
          assignedTo: data.assignedTo && data.assignedTo !== 'unassigned' ? Number(data.assignedTo) : null
        },
      }),
    onSuccess: () => {
      if (task) {
        queryClient.invalidateQueries({ queryKey: [`/api/strategy/key-results/${keyResultId}/tasks`] });
        if (task.keyResultId && task.keyResultId !== keyResultId) {
          queryClient.invalidateQueries({ queryKey: [`/api/strategy/key-results/${task.keyResultId}/tasks`] });
        }
      }
      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EditTaskFormData) => {
    updateTaskMutation.mutate(data);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Edit Task</DialogTitle>
          <p className="text-xs text-muted-foreground">{task.title}</p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Title</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-7 text-xs" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="text-xs" rows={2} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="taskType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="habit">Habit</SelectItem>
                        <SelectItem value="feature">Feature</SelectItem>
                        <SelectItem value="bug">Bug</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="one-time">One-time</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="targetCompletion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Target Completion</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" className="h-7 text-xs" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Assigned User Field */}
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Assigned To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Select user..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {Array.isArray(users) && users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* KPI Progress Fields */}
            <div className="border-t pt-3 mt-3">
              <div className="text-xs font-medium text-gray-700 mb-2">
                Progress Tracking {form.watch('frequency') !== 'one-time' ? '(Recommended for habits)' : '(Optional)'}
              </div>
              
              <FormField
                control={form.control}
                name="kpiLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Progress Label</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="h-7 text-xs" 
                        placeholder="e.g., Customers Onboarded, Issues Resolved"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name="kpiCurrentValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Current</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          type="number"
                          min="0"
                          className="h-7 text-xs"
                          placeholder="0"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="kpiTargetValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Target</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          type="number"
                          min="1"
                          className="h-7 text-xs"
                          placeholder="50"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="kpiUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Unit</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="h-7 text-xs" 
                          placeholder="issues"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={updateTaskMutation.isPending}>
                {updateTaskMutation.isPending ? 'Updating...' : 'Update Task'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}