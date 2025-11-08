import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createWorkItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  taskType: z.enum(['project', 'habit']),
  department: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  storyPoints: z.number().min(0).max(100).optional(),
  labels: z.string().optional(),
  frequency: z.enum(['one-time', 'daily', 'weekly', 'monthly']).optional(),
  frequencyTarget: z.number().min(1).optional()
});

type CreateWorkItemData = z.infer<typeof createWorkItemSchema>;

interface CreateWorkItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkItemDialog({ open, onOpenChange }: CreateWorkItemDialogProps) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const form = useForm<CreateWorkItemData>({
    resolver: zodResolver(createWorkItemSchema),
    defaultValues: {
      title: '',
      description: '',
      taskType: 'project',
      priority: 'medium',
      storyPoints: 0,
      labels: '',
      frequency: 'one-time',
      frequencyTarget: 1
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateWorkItemData) => {
      const payload = {
        ...data,
        lifecycleStage: 'tagnut',
        status: 'todo',
        labels: data.labels ? data.labels.split(',').map(l => l.trim()).filter(Boolean) : [],
        frequency: data.taskType === 'habit' ? data.frequency : 'one-time',
        frequencyTarget: data.taskType === 'habit' ? data.frequencyTarget : 1,
        createdBy: currentUser?.id
      };
      
      return apiRequest('/api/strategy/tasks', {
        method: 'POST',
        body: payload
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work/stats'] });
      toast({
        title: 'Work item created',
        description: 'The work item has been added to the tagnut.'
      });
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create work item.',
        variant: 'destructive'
      });
    }
  });

  const taskType = form.watch('taskType');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Work Item</DialogTitle>
          <DialogDescription>
            Add a new work item to the tagnut
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter work item title" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the work item in detail" 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="taskType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="habit">Habit</SelectItem>
                        <SelectItem value="feature">Feature</SelectItem>
                        <SelectItem value="bug">Bug</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              </div>

            {taskType === 'habit' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="frequencyTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        Times per {form.watch('frequency') || 'period'}
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Support">Support</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storyPoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Story Points</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        max="100"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Estimated effort (0-100)
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="labels"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Labels</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter labels separated by commas (e.g., feature, bug-fix)" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Add labels to categorize this work item
                  </FormDescription>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Work Item'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}