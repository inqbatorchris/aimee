import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

const taskTypeConfigFormSchema = z.object({
  splynxTaskTypeId: z.number().int().positive(),
  splynxTaskTypeName: z.string().min(1, 'Task type name is required'),
  workflowTemplateId: z.string().uuid().optional().nullable(),
  defaultPriority: z.enum(['low', 'normal', 'high', 'urgent']),
  requiresVehicleCheck: z.boolean(),
  allowOfflineCompletion: z.boolean(),
  estimatedDurationMinutes: z.number().int().positive().optional().nullable(),
  customFields: z.record(z.unknown()).optional(),
});

type TaskTypeConfigForm = z.infer<typeof taskTypeConfigFormSchema>;

interface TaskTypeConfig {
  id: string;
  organizationId: string;
  splynxTaskTypeId: number;
  splynxTaskTypeName: string;
  workflowTemplateId: string | null;
  defaultPriority: string;
  requiresVehicleCheck: boolean;
  allowOfflineCompletion: boolean;
  estimatedDurationMinutes: number | null;
  customFields: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
}

export default function TaskTypeConfig() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<TaskTypeConfig | null>(null);

  const { data: configs, isLoading: configsLoading, isError: configsError } = useQuery<TaskTypeConfig[]>({
    queryKey: ['/api/field-engineering/task-type-configurations'],
    enabled: !!currentUser,
  });

  const { data: templates, isLoading: templatesLoading, isError: templatesError } = useQuery<WorkflowTemplate[]>({
    queryKey: ['/api/field-engineering/workflow-templates'],
    enabled: !!currentUser,
  });

  const createMutation = useMutation({
    mutationFn: async (data: TaskTypeConfigForm) => {
      return await apiRequest('/api/field-engineering/task-type-configurations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/field-engineering/task-type-configurations'] });
      setIsCreateOpen(false);
      toast({
        title: 'Success',
        description: 'Task type configuration created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create task type configuration',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TaskTypeConfigForm> }) => {
      return await apiRequest(`/api/field-engineering/task-type-configurations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/field-engineering/task-type-configurations'] });
      setEditingConfig(null);
      toast({
        title: 'Success',
        description: 'Task type configuration updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task type configuration',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/field-engineering/task-type-configurations/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/field-engineering/task-type-configurations'] });
      toast({
        title: 'Success',
        description: 'Task type configuration deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete task type configuration',
        variant: 'destructive',
      });
    },
  });

  const form = useForm<TaskTypeConfigForm>({
    resolver: zodResolver(taskTypeConfigFormSchema),
    defaultValues: {
      splynxTaskTypeId: 0,
      splynxTaskTypeName: '',
      workflowTemplateId: null,
      defaultPriority: 'normal',
      requiresVehicleCheck: false,
      allowOfflineCompletion: true,
      estimatedDurationMinutes: null,
      customFields: {},
    },
  });

  const onSubmit = (data: TaskTypeConfigForm) => {
    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (config: TaskTypeConfig) => {
    setEditingConfig(config);
    form.reset({
      splynxTaskTypeId: config.splynxTaskTypeId,
      splynxTaskTypeName: config.splynxTaskTypeName,
      workflowTemplateId: config.workflowTemplateId,
      defaultPriority: config.defaultPriority as TaskTypeConfigForm['defaultPriority'],
      requiresVehicleCheck: config.requiresVehicleCheck,
      allowOfflineCompletion: config.allowOfflineCompletion,
      estimatedDurationMinutes: config.estimatedDurationMinutes,
      customFields: config.customFields || {},
    });
    setIsCreateOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this configuration?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      setEditingConfig(null);
      form.reset();
    }
  };

  if (configsLoading || templatesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (configsError || templatesError) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive">
              {configsError ? 'Failed to load task type configurations.' : 'Failed to load workflow templates.'} 
              {' '}Please try refreshing the page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Type Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Map Splynx task types to workflow templates and configure default settings
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-config">
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? 'Edit Task Type Configuration' : 'Create Task Type Configuration'}
              </DialogTitle>
              <DialogDescription>
                Configure how Splynx task types map to workflows and default settings
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="splynxTaskTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Splynx Task Type ID</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-splynx-task-type-id"
                        />
                      </FormControl>
                      <FormDescription>The numeric ID from Splynx</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="splynxTaskTypeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Type Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-task-type-name" />
                      </FormControl>
                      <FormDescription>Display name for this task type</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workflowTemplateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workflow Template (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-workflow-template">
                            <SelectValue placeholder="Select a workflow template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {templates?.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Associate a workflow template with this task type
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultPriority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-default-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedDurationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Duration (Minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          data-testid="input-estimated-duration"
                        />
                      </FormControl>
                      <FormDescription>Expected time to complete this task type</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requiresVehicleCheck"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Requires Vehicle Check</FormLabel>
                        <FormDescription>
                          Technician must perform vehicle check before starting
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-requires-vehicle-check"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowOfflineCompletion"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Allow Offline Completion</FormLabel>
                        <FormDescription>
                          Task can be completed without internet connection
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-allow-offline"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogClose(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-config">
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingConfig ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Task Types</CardTitle>
          <CardDescription>
            {configs?.length || 0} task type configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!configs || configs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No task type configurations yet</p>
              <p className="text-sm mt-2">Click "Add Configuration" to create one</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Splynx ID</TableHead>
                  <TableHead>Task Type Name</TableHead>
                  <TableHead>Workflow Template</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id} data-testid={`row-config-${config.id}`}>
                    <TableCell className="font-mono">{config.splynxTaskTypeId}</TableCell>
                    <TableCell className="font-medium">{config.splynxTaskTypeName}</TableCell>
                    <TableCell>
                      {config.workflowTemplateId
                        ? templates?.find((t) => t.id === config.workflowTemplateId)?.name || 'Unknown'
                        : 'None'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        config.defaultPriority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        config.defaultPriority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                        config.defaultPriority === 'normal' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {config.defaultPriority}
                      </span>
                    </TableCell>
                    <TableCell>
                      {config.estimatedDurationMinutes ? `${config.estimatedDurationMinutes} min` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(config)}
                          data-testid={`button-edit-${config.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(config.id)}
                          data-testid={`button-delete-${config.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
