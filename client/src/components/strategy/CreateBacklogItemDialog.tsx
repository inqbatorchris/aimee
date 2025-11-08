import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const createTagnutItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().default(''), // Make description optional with default
  type: z.enum(['feature', 'bug', 'task', 'epic', 'story']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  department: z.string().optional(),
  assignedTo: z.coerce.number().optional(),
  storyPoints: z.coerce.number().optional(),
  acceptanceCriteria: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type CreateTagnutItemFormData = z.infer<typeof createTagnutItemSchema>;

interface CreateTagnutItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: any;
}

const itemTypes = [
  { value: 'feature', label: 'Feature' },
  { value: 'bug', label: 'Bug' },
  { value: 'task', label: 'Task' },
  { value: 'epic', label: 'Epic' },
  { value: 'story', label: 'Story' },
];

const priorities = [
  { value: 'low', label: 'Low', color: 'bg-green-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
];

const departments = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Support',
  'Operations',
  'HR',
];

export default function CreateTagnutItemDialog({ open, onOpenChange, editItem }: CreateTagnutItemDialogProps) {
  const [tagInput, setTagInput] = useState('');
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: open,
  });

  const form = useForm<CreateTagnutItemFormData>({
    resolver: zodResolver(createTagnutItemSchema),
    defaultValues: {
      title: editItem?.title || '',
      description: editItem?.description || '',
      type: editItem?.type || 'task',
      priority: editItem?.priority || 'medium',
      department: editItem?.department || '',
      assignedTo: editItem?.assignedTo || undefined,
      storyPoints: editItem?.storyPoints || undefined,
      acceptanceCriteria: editItem?.acceptanceCriteria || '',
      tags: editItem?.tags || [],
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTagnutItemFormData) =>
      apiRequest('/api/strategy/backlog', {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/backlog'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/backlog/available'] });
      toast({
        title: 'Success',
        description: 'Tagnut item created successfully',
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create tagnut item',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateTagnutItemFormData) =>
      apiRequest(`/api/strategy/backlog/${editItem.id}`, {
        method: 'PUT',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/backlog'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/backlog/available'] });
      toast({
        title: 'Success',
        description: 'Tagnut item updated successfully',
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update tagnut item',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CreateTagnutItemFormData) => {
    if (editItem) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addTag = () => {
    if (tagInput.trim()) {
      const currentTags = form.getValues('tags') || [];
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue('tags', [...currentTags, tagInput.trim()]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editItem ? 'Edit Backlog Item' : 'Add to Backlog'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="What needs to be done?" {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
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
                        {itemTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorities.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${priority.color}`} />
                              {priority.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editItem ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}