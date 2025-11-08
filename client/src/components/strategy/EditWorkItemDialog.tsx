import { useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const editWorkItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  taskType: z.enum(['project', 'habit']),
  department: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  storyPoints: z.number().min(0).max(100).optional(),
  labels: z.string().optional(),
  frequency: z.enum(['one-time', 'daily', 'weekly', 'monthly']).optional(),
  frequencyTarget: z.number().min(1).optional(),
  status: z.enum(['todo', 'in_progress', 'completed'])
});

type EditWorkItemData = z.infer<typeof editWorkItemSchema>;

interface EditWorkItemDialogProps {
  workItem: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditWorkItemDialog({ workItem, open, onOpenChange }: EditWorkItemDialogProps) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('/api/users');
      return await response.json();
    }
  });

  const form = useForm<EditWorkItemData>({
    resolver: zodResolver(editWorkItemSchema),
    defaultValues: {
      title: '',
      description: '',
      taskType: 'project',
      priority: 'medium',
      storyPoints: 0,
      labels: '',
      frequency: 'one-time',
      frequencyTarget: 1,
      status: 'todo'
    }
  });

  // Update form when workItem changes
  useEffect(() => {
    if (workItem) {
      form.reset({
        title: workItem.title || '',
        description: workItem.description || '',
        taskType: workItem.taskType || 'project',
        department: workItem.department || '',
        priority: workItem.priority || 'medium',
        storyPoints: workItem.storyPoints || 0,
        labels: Array.isArray(workItem.labels) ? workItem.labels.join(', ') : '',
        frequency: workItem.frequency || 'one-time',
        frequencyTarget: workItem.frequencyTarget || 1,
        status: workItem.status || 'todo'
      });
    }
  }, [workItem, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: EditWorkItemData) => {
      const payload = {
        ...data,
        labels: data.labels ? data.labels.split(',').map(l => l.trim()).filter(Boolean) : [],
        frequency: data.taskType === 'habit' ? data.frequency : 'one-time',
        frequencyTarget: data.taskType === 'habit' ? data.frequencyTarget : 1,
      };
      
      return apiRequest(`/api/strategy/tasks/${workItem.id}`, {
        method: 'PATCH',
        body: payload
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/tasks'] });
      toast({
        title: 'Work item updated',
        description: 'The work item has been updated successfully.'
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update work item.',
        variant: 'destructive'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/strategy/tasks/${workItem.id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work/stats'] });
      toast({
        title: 'Work item deleted',
        description: 'The work item has been deleted successfully.'
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete work item.',
        variant: 'destructive'
      });
    }
  });

  const taskType = form.watch('taskType');
  const canManage = currentUser?.role && ['admin', 'manager'].includes(currentUser.role);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Work Item</DialogTitle>
          <DialogDescription>
            Update the work item details
          </DialogDescription>
        </DialogHeader>

        {/* Display work item information */}
        {workItem && (
          <div className="mb-4 p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium">Lifecycle Stage:</span>
                <Badge className="ml-2" variant="outline">{workItem.lifecycleStage}</Badge>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <Badge className="ml-2" variant="outline">{workItem.status}</Badge>
              </div>
              {workItem.assignedUser && (
                <div>
                  <span className="font-medium">Assigned to:</span>
                  <span className="ml-2">{workItem.assignedUser.fullName}</span>
                </div>
              )}
              {workItem.keyResultId && (
                <div>
                  <span className="font-medium">Key Result ID:</span>
                  <span className="ml-2">#{workItem.keyResultId}</span>
                </div>
              )}
            </div>
            
            {/* KPI Progress Display */}
            {workItem.kpiLabel && workItem.kpiTargetValue && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">{workItem.kpiLabel}</span>
                  <span>
                    {workItem.kpiCurrentValue || 0} / {workItem.kpiTargetValue} {workItem.kpiUnit || ''}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, ((workItem.kpiCurrentValue || 0) / workItem.kpiTargetValue) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
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
                    <Select onValueChange={field.onChange} value={field.value}>
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

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {taskType === 'habit' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
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

            <div className="flex justify-between pt-4">
              {canManage && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this work item?')) {
                      deleteMutation.mutate();
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              )}
              
              <div className="flex space-x-2">
                <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Updating...' : 'Update Work Item'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}