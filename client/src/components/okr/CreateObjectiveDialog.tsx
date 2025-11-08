import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Plus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Define schemas locally since they aren't in shared/schema.ts
const insertObjectiveSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['Draft', 'Live', 'Archived']).default('Draft'),
  targetValue: z.number().optional(),
  currentValue: z.number().default(0),
  kpiType: z.enum(['Derived from Key Results', 'Manual Input']).default('Derived from Key Results'),
  category: z.string().optional(),
  priority: z.string().optional(),
  ownerId: z.number().optional(),
  teamId: z.number().optional(),
  isOwnerOnly: z.boolean().optional(),
  // TODO: Removed startDate/targetDate - may need to revisit for timeline tracking
  // startDate: z.date().optional(), // REMOVED in migration 001
  // targetDate: z.date().optional(), // REMOVED in migration 001
});

const insertKeyResultSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  metricType: z.enum(['number', 'percentage', 'currency', 'binary']),
  targetValue: z.string(),
  currentValue: z.string().optional(),
  unit: z.string().optional(),
  measurementFrequency: z.string().optional(),
  objectiveId: z.number(),
  createdBy: z.number().optional(),
});

const createObjectiveFormSchema = insertObjectiveSchema.extend({
  keyResults: z.array(insertKeyResultSchema.omit({ objectiveId: true, createdBy: true })).optional(),
});

type CreateObjectiveFormData = z.infer<typeof createObjectiveFormSchema>;

interface CreateObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateObjectiveDialog({ open, onOpenChange }: CreateObjectiveDialogProps) {
  const [keyResults, setKeyResults] = useState<Array<Partial<z.infer<typeof insertKeyResultSchema>>>>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users for owner selection
  const { data: users = [] } = useQuery({
    queryKey: ['/api/core/users'],
    enabled: open,
  });

  // Fetch teams for team selection
  const { data: teams = [] } = useQuery({
    queryKey: ['/api/teams'],
    enabled: open,
  });

  const form = useForm<CreateObjectiveFormData>({
    resolver: zodResolver(createObjectiveFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'Draft',
      targetValue: undefined,
      currentValue: 0,
      kpiType: 'Derived from Key Results',
      category: 'strategic',
      priority: 'high',
      ownerId: undefined,
      teamId: undefined,
      isOwnerOnly: false,
    },
  });

  // Create objective mutation
  const createObjectiveMutation = useMutation({
    mutationFn: async (data: CreateObjectiveFormData) => {
      const objective = await apiRequest('/api/strategy/objectives', {
        method: 'POST',
        body: {
          title: data.title,
          description: data.description,
          status: data.status,
          targetValue: data.targetValue,
          currentValue: data.currentValue,
          kpiType: data.kpiType,
          category: data.category,
          priority: data.priority,
          ownerId: data.ownerId,
          teamId: data.teamId,
          isOwnerOnly: data.isOwnerOnly,
        },
      });

      // Create key results if any
      if (keyResults.length > 0) {
        for (const kr of keyResults) {
          await apiRequest('/api/strategy/key-results', {
            method: 'POST',
            body: {
              ...kr,
              objectiveId: (objective as any).id,
            },
          });
        }
      }

      return objective;
    },
    onSuccess: () => {
      // Invalidate both regular and bypass endpoints to ensure table refreshes
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives-bypass'] });
      toast({
        title: "Objective Created",
        description: "Your objective has been created successfully.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create objective.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    form.reset();
    setKeyResults([]);
    onOpenChange(false);
  };

  const addKeyResult = () => {
    setKeyResults([...keyResults, {
      title: '',
      description: '',
      metricType: 'number',
      targetValue: '100',
      currentValue: '0',
      unit: '',
      measurementFrequency: 'weekly',
    }]);
  };

  const removeKeyResult = (index: number) => {
    setKeyResults(keyResults.filter((_, i) => i !== index));
  };

  const updateKeyResult = (index: number, field: string, value: any) => {
    const updated = [...keyResults];
    updated[index] = { ...updated[index], [field]: value };
    setKeyResults(updated);
  };

  const onSubmit = (data: CreateObjectiveFormData) => {
    createObjectiveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Objective</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="objective" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="objective">Objective Details</TabsTrigger>
                <TabsTrigger value="keyresults">Key Results ({keyResults.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="objective" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Objective Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Increase customer satisfaction..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Detailed description of what this objective aims to achieve..."
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* TODO: Primary KPI field removed in migration 001 - functionality moved to kpiType
                  <FormField
                    control={form.control}
                    name="primaryKpi"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Primary KPI</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Customer Satisfaction Score, Revenue Growth Rate, Support Response Time..."
                            value={field.value || ''}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  */}

                  <FormField
                    control={form.control}
                    name="targetValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Value (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="100"
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value ? parseFloat(value) : undefined);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* TODO: Calculation Formula field removed in migration 001 - functionality moved to kpiType
                  <FormField
                    control={form.control}
                    name="calculationFormula"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Calculation Formula (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., kr1 * kr2 / 100"
                            value={field.value || ''}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  */}

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="strategic">Strategic</SelectItem>
                            <SelectItem value="operational">Operational</SelectItem>
                            <SelectItem value="tactical">Tactical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  

                  {/* TODO: Date fields removed in migration 001 - may need to revisit for timeline tracking
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value + 'T00:00:00') : new Date())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value + 'T00:00:00') : new Date())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  */}

                  <FormField
                    control={form.control}
                    name="ownerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner (Optional)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an owner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(users as any[]).map((user: any) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.fullName || user.email}
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
                    name="teamId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team/Department (Optional)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a team" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(teams as any[]).map((team: any) => (
                              <SelectItem key={team.id} value={team.id.toString()}>
                                {team.name}
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
                    name="isOwnerOnly"
                    render={({ field }) => (
                      <FormItem className="col-span-2 flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Owner Only
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Only visible to super admin users when checked
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="keyresults" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Key Results</h3>
                  <Button type="button" variant="outline" onClick={addKeyResult}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Key Result
                  </Button>
                </div>

                {keyResults.map((kr, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Key Result {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeKeyResult(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="text-sm font-medium">Title</label>
                        <Input
                          placeholder="Achieve 95% customer satisfaction"
                          value={kr.title || ''}
                          onChange={(e) => updateKeyResult(index, 'title', e.target.value)}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          placeholder="Measure customer satisfaction through surveys..."
                          value={kr.description || ''}
                          onChange={(e) => updateKeyResult(index, 'description', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Metric Type</label>
                        <Select
                          value={kr.metricType || 'number'}
                          onValueChange={(value) => updateKeyResult(index, 'metricType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="currency">Currency</SelectItem>
                            <SelectItem value="binary">Yes/No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Target Value</label>
                        <Input
                          type="number"
                          placeholder="100"
                          value={kr.targetValue || ''}
                          onChange={(e) => updateKeyResult(index, 'targetValue', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Unit (Optional)</label>
                        <Input
                          placeholder="customers, points, etc."
                          value={kr.unit || ''}
                          onChange={(e) => updateKeyResult(index, 'unit', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Update Frequency</label>
                        <Select
                          value={kr.measurementFrequency || 'weekly'}
                          onValueChange={(value) => updateKeyResult(index, 'measurementFrequency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}

                {keyResults.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No key results added yet.</p>
                    <p className="text-sm">Key results are measurable outcomes that track your objective's progress.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createObjectiveMutation.isPending}>
                {createObjectiveMutation.isPending ? "Creating..." : "Create Objective"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}