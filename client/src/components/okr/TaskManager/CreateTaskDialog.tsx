import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
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
import { useQuery } from '@tanstack/react-query';

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'one-time']),
  frequencyTarget: z.number().min(1).max(10).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  targetCompletion: z.string().optional(),
  assignedTo: z.string().optional(),
  kpiLabel: z.string().optional(),
  kpiTargetValue: z.number().optional(),
  kpiUnit: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyResultId: number;
  keyResultTitle: string;
}

export function CreateTaskDialog({ open, onOpenChange, keyResultId, keyResultTitle }: CreateTaskDialogProps) {
  const { toast } = useToast();
  const { currentUser: user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch users for assignment dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: open // Only fetch when dialog is open
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      frequency: 'one-time',
      frequencyTarget: 1,
      priority: 'medium',
      targetCompletion: '',
      assignedTo: 'unassigned',
      kpiLabel: '',
      kpiTargetValue: undefined,
      kpiUnit: '',
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: TaskFormData) =>
      apiRequest(`/api/strategy/key-results/${keyResultId}/tasks`, {
        method: 'POST',
        body: {
          ...data,
          assignedTo: data.assignedTo && data.assignedTo !== 'unassigned' ? Number(data.assignedTo) : null
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/key-results', keyResultId, 'tasks'] });
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create task',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: TaskFormData) => {
    createTaskMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Create New Task</DialogTitle>
          <p className="text-xs text-muted-foreground">For: {keyResultTitle}</p>
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
                    <Input {...field} className="h-7 text-xs" placeholder="Task title..." />
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
                    <Textarea {...field} className="text-xs" placeholder="Optional description..." rows={2} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />



            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              {form.watch('frequency') !== 'one-time' && (
                <FormField
                  control={form.control}
                  name="frequencyTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Target per {form.watch('frequency')?.slice(0, -2) || 'period'}</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          type="number"
                          min="1"
                          max="10"
                          className="h-7 text-xs"
                          placeholder="1"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="targetCompletion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Target Date</FormLabel>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="kpiTargetValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Target Value</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          type="number"
                          min="1"
                          className="h-7 text-xs"
                          placeholder="e.g., 50"
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
                          placeholder="e.g., customers, issues, %"
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
              <Button type="submit" size="sm" disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}