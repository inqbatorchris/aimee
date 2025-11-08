import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, User, Plus, X, FileText } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { DocumentAttachmentButton } from '@/components/KnowledgeBase/DocumentAttachmentButton';
import { AttachedDocumentsList } from '@/components/KnowledgeBase/AttachedDocumentsList';

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
  isOwnerOnly: z.boolean().optional(),
  // TODO: Removed fields - may need to revisit for timeline tracking
  // primaryKpi: z.string().optional(), // REMOVED in migration 001
  // calculationFormula: z.string().optional(), // REMOVED in migration 001
  // startDate: z.date().optional(), // REMOVED in migration 001
  // targetDate: z.date().optional(), // REMOVED in migration 001
});

interface Objective {
  id: number;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  targetValue?: number;
  currentValue?: number;
  kpiType?: string;
  ownerId?: number;
  isOwnerOnly?: boolean;
  // TODO: Removed fields - stubbed for backwards compatibility
  // primaryKpi?: string; // REMOVED in migration 001
  // calculationFormula?: string; // REMOVED in migration 001
  // startDate?: string; // REMOVED in migration 001
  // targetDate?: string; // REMOVED in migration 001
}

const editObjectiveFormSchema = insertObjectiveSchema.extend({
  id: z.number(),
});

type EditObjectiveFormData = z.infer<typeof editObjectiveFormSchema>;

interface EditObjectiveDialogProps {
  objective: Objective;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: string;
}

export default function EditObjectiveDialog({ objective, open, onOpenChange, initialTab = "details" }: EditObjectiveDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUser: user } = useAuth();
  
  // Key results state management
  const [keyResults, setKeyResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(initialTab);

  // Fetch users for owner selection
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: open,
  });

  // Fetch existing key results for this objective
  const { data: existingKeyResults = [] } = useQuery({
    queryKey: [`/api/strategy/objectives/${objective?.id}/key-results`],
    enabled: open && !!objective?.id,
  });

  // Query for attached documents
  const { data: attachedDocuments = [], refetch: refetchAttachedDocuments } = useQuery<any[]>({
    queryKey: [`/api/knowledge-base/attachments/objective/${objective?.id}`],
    enabled: open && !!objective?.id
  });

  // Load existing key results when dialog opens
  useEffect(() => {
    if (existingKeyResults && Array.isArray(existingKeyResults) && existingKeyResults.length > 0) {
      setKeyResults((existingKeyResults as any[]).map((kr: any) => ({
        title: kr.title,
        description: kr.description,
        metricType: kr.metricType,
        targetValue: kr.targetValue,
        unit: kr.unit,
        measurementFrequency: kr.measurementFrequency,
        currentValue: kr.currentValue,
      })));
    } else {
      setKeyResults([]);
    }
  }, [existingKeyResults]);

  const form = useForm<EditObjectiveFormData>({
    resolver: zodResolver(editObjectiveFormSchema),
    defaultValues: {
      id: 0,
      title: '',
      description: '',
      status: 'Draft',
      targetValue: undefined,
      currentValue: 0,
      kpiType: 'Derived from Key Results',
      category: 'strategic',
      priority: 'medium',
      ownerId: user?.id || 0,
      isOwnerOnly: false,
    },
  });

  // Update form when objective changes - only reset when objective or open changes
  useEffect(() => {
    if (objective && open) {
      form.reset({
        id: objective.id,
        title: objective.title,
        description: objective.description || '',
        status: (objective.status as 'Draft' | 'Live' | 'Archived') || 'Draft',
        targetValue: objective.targetValue || undefined,
        currentValue: objective.currentValue || 0,
        kpiType: (objective.kpiType as 'Derived from Key Results' | 'Manual Input') || 'Derived from Key Results',
        category: objective.category || 'strategic',
        priority: objective.priority || 'medium',
        ownerId: objective.ownerId || user?.id || 0,
        isOwnerOnly: objective.isOwnerOnly || false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objective, open]); // Do NOT include user?.id - causes infinite loops when auth loads

  // Reset active tab when dialog opens or initialTab changes - fix infinite loop
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [initialTab, open]);

  // Update objective mutation
  const updateObjectiveMutation = useMutation({
    mutationFn: async (data: EditObjectiveFormData) => {
      // Update the objective
      const updatedObjective = await apiRequest(`/api/strategy/objectives/${objective.id}`, {
        method: 'PUT',
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
          isOwnerOnly: data.isOwnerOnly,
        },
      });

      // Delete existing key results
      for (const existingKr of (existingKeyResults as any[] || [])) {
        await apiRequest(`/api/strategy/key-results/${existingKr.id}`, {
          method: 'DELETE',
        });
      }

      // Create new key results
      if (keyResults.length > 0) {
        for (const kr of keyResults) {
          await apiRequest('/api/strategy/key-results', {
            method: 'POST',
            body: {
              ...kr,
              objectiveId: objective.id,
            },
          });
        }
      }

      return updatedObjective;
    },
    onSuccess: () => {
      // Invalidate both endpoints to ensure table refreshes immediately
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives-bypass'] });
      toast({
        title: "Objective Updated",
        description: "Your objective has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update objective.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditObjectiveFormData) => {
    updateObjectiveMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    setKeyResults([]);
    onOpenChange(false);
  };

  // Key results management functions
  const addKeyResult = () => {
    setKeyResults([...keyResults, {
      title: '',
      description: '',
      metricType: 'number',
      targetValue: '',
      unit: '',
      measurementFrequency: 'weekly',
      currentValue: 0,
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Edit Objective</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Objective Details</TabsTrigger>
                <TabsTrigger value="keyresults">Key Results ({keyResults.length})</TabsTrigger>
                <TabsTrigger value="documents">Documents ({attachedDocuments.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="space-y-4">
                  {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Title *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Enter objective title"
                      className="h-8 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe this objective in detail..."
                      className="min-h-[80px] text-sm resize-none"
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
                <FormItem>
                  <FormLabel className="text-sm font-medium">Primary KPI *</FormLabel>
                  <FormControl>
                    <Input 
                      value={field.value || ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      placeholder="e.g., Customer satisfaction score, Revenue growth, etc."
                      className="h-8 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            */}

            <div className="grid grid-cols-2 gap-4">
              {/* Target Value */}
              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Target Value (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="100"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || undefined)}
                        className="h-8 text-sm"
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
                    <FormLabel className="text-sm font-medium">Calculation Formula (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., kr1 * kr2 / 100"
                        value={field.value || ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        className="h-8 text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              */}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="strategic">Strategic</SelectItem>
                        <SelectItem value="operational">Operational</SelectItem>
                        <SelectItem value="financial">Financial</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="learning">Learning & Growth</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="achieved">Achieved</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Owner */}
              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Owner</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select owner">
                            <div className="flex items-center">
                              <User className="h-3 w-3 mr-2" />
                              {field.value && (users as any[]).find((u: any) => u.id === field.value)?.fullName || 'Select owner'}
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(users as any[]).map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            <div className="flex items-center">
                              <User className="h-3 w-3 mr-2" />
                              {user.fullName}
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

            {/* TODO: Date fields removed in migration 001 - may need to revisit for timeline tracking
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Start Date</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                        <Input
                          type="date"
                          className="h-8 text-sm pl-8"
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </div>
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
                    <FormLabel className="text-sm font-medium">Target Date</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                        <Input
                          type="date"
                          className="h-8 text-sm pl-8"
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            */}

            {/* Owner Only Checkbox */}
            <FormField
              control={form.control}
              name="isOwnerOnly"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium">Knowledge Base Documents</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Attach relevant documents to provide context and resources for this objective.
                      </p>
                    </div>
                    {objective?.id && (
                      <DocumentAttachmentButton
                        entityType="objective"
                        entityId={objective.id}
                        entityTitle={objective?.title}
                        buttonVariant="outline"
                        buttonSize="sm"
                        showLabel={true}
                        attachedDocuments={attachedDocuments}
                        onDocumentsAttached={refetchAttachedDocuments}
                      />
                    )}
                  </div>
                  
                  {objective?.id && (
                    attachedDocuments.length > 0 ? (
                      <AttachedDocumentsList
                        entityType="objective"
                        entityId={objective.id}
                        attachedDocuments={attachedDocuments}
                        onDocumentDetached={refetchAttachedDocuments}
                        showActions={true}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-sm">No documents attached yet.</p>
                        <p className="text-xs mt-1">
                          Attach knowledge base documents to provide context and resources.
                        </p>
                      </div>
                    )
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleClose}
                className="h-8 px-3 text-sm"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                size="sm"
                className="h-8 px-3 text-sm"
                disabled={updateObjectiveMutation.isPending}
              >
                {updateObjectiveMutation.isPending ? 'Updating...' : 'Update Objective'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}