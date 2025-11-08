import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, Check, ChevronDown, ChevronUp, Info, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface RecurringTask {
  id: number;
  title: string;
  keyResultId: number;
  keyResultTitle: string;
  frequency: string;
  nextDueDate: string;
  completedCount: number;
  totalOccurrences?: number;
  generationStatus: string;
  canGenerate: boolean;
  warningMessage?: string;
}

interface GenerationResult {
  created: number;
  skipped: number;
  errors: string[];
  items: Array<{
    taskId: number;
    workItemId?: number;
    status: 'created' | 'skipped';
    reason?: string;
  }>;
}

interface ManualGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualGenerateDialog({ open, onOpenChange }: ManualGenerateDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [generationResults, setGenerationResults] = useState<GenerationResult | null>(null);

  // Fetch recurring tasks
  const { data: tasks = [], isLoading } = useQuery<RecurringTask[]>({
    queryKey: ['/api/work-items/recurring-tasks'],
    enabled: open
  });

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async (taskIds: number[]) => {
      console.log('[ManualGenerate] Calling API with taskIds:', taskIds);
      const response = await apiRequest('/api/work-items/generate-manual', {
        method: 'POST',
        body: { taskIds }
      });
      const data = await response.json();
      console.log('[ManualGenerate] API response:', data);
      return data as GenerationResult;
    },
    onSuccess: (data: GenerationResult) => {
      console.log('[ManualGenerate] Success with data:', data);
      setGenerationResults(data);
      setShowResults(true);
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-items/recurring-tasks'] });
      
      toast({
        title: 'Generation Complete',
        description: `Created ${data.created} work items, skipped ${data.skipped}`,
      });
    },
    onError: (error: any) => {
      console.error('[ManualGenerate] Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate work items',
        variant: 'destructive',
      });
    },
  });

  const handleToggleTask = (taskId: number) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const canGenerateTasks = tasks.filter(t => t.canGenerate).map(t => t.id);
    setSelectedTasks(new Set(canGenerateTasks));
  };

  const handleClearSelection = () => {
    setSelectedTasks(new Set());
  };

  const handleGenerate = () => {
    if (selectedTasks.size === 0) {
      toast({
        title: 'No tasks selected',
        description: 'Please select at least one task to generate work items',
        variant: 'destructive',
      });
      return;
    }
    generateMutation.mutate(Array.from(selectedTasks));
  };

  const handleClose = () => {
    setShowResults(false);
    setGenerationResults(null);
    setSelectedTasks(new Set());
    onOpenChange(false);
  };

  const getFrequencyBadge = (frequency: string) => {
    const colors: Record<string, string> = {
      daily: 'bg-blue-100 text-blue-800',
      weekly: 'bg-green-100 text-green-800',
      monthly: 'bg-purple-100 text-purple-800',
      quarterly: 'bg-orange-100 text-orange-800'
    };
    return colors[frequency] || 'bg-gray-100 text-gray-800';
  };

  const formatNextDue = (dateString: string) => {
    const date = new Date(dateString);
    const daysAway = formatDistanceToNow(date, { addSuffix: true });
    return `${format(date, 'MMM d, yyyy')} (${daysAway})`;
  };

  // Results view
  if (showResults && generationResults) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Generation Results</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{generationResults.created}</div>
                <div className="text-sm text-green-600">Created</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700">{generationResults.skipped}</div>
                <div className="text-sm text-yellow-600">Skipped</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">{generationResults.errors?.length || 0}</div>
                <div className="text-sm text-red-600">Errors</div>
              </div>
            </div>

            <ScrollArea className="h-64 border rounded-lg p-4">
              <div className="space-y-2">
                {generationResults.items?.map((item) => {
                  const task = tasks.find(t => t.id === item.taskId);
                  return (
                    <div key={item.taskId} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                      {item.status === 'created' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-yellow-600" />
                      )}
                      <span className="flex-1">{task?.title || `Task ${item.taskId}`}</span>
                      {item.status === 'created' && (
                        <span className="text-xs text-gray-500">Work Item #{item.workItemId}</span>
                      )}
                      {item.status === 'skipped' && item.reason && (
                        <span className="text-xs text-gray-500">{item.reason}</span>
                      )}
                    </div>
                  );
                })}
                {generationResults.errors?.map((error, idx) => (
                  <div key={`error-${idx}`} className="flex items-center gap-2 p-2 bg-red-50 rounded text-sm text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end">
              <Button onClick={handleClose} data-testid="button-close-results">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Selection view
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl h-[85vh] sm:h-auto sm:max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-base">Generate Work Items from Recurring Tasks</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select recurring tasks to generate work items for
          </p>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 px-6">
          {/* Select all / Clear */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg shrink-0 mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={tasks.filter(t => t.canGenerate).length === 0}
                data-testid="button-select-all"
              >
                <span className="hidden sm:inline">Select All ({tasks.filter(t => t.canGenerate).length} tasks)</span>
                <span className="sm:hidden">Select All</span>
              </Button>
              {selectedTasks.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  data-testid="button-clear-selection"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {selectedTasks.size} selected
            </div>
          </div>

          {/* Task list - flex-1 makes it take available space */}
          <ScrollArea className="flex-1 min-h-0 -mx-2 px-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-gray-500">Loading recurring tasks...</div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Info className="h-12 w-12 text-gray-400 mb-3" />
                <div className="text-sm font-medium text-gray-700">No recurring tasks found</div>
                <div className="text-xs text-gray-500 mt-1">
                  Create a recurring task from a Key Result to get started
                </div>
              </div>
            ) : (
              <div className="space-y-2 pr-2 pb-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`border rounded-lg p-3 ${
                      task.canGenerate ? 'hover:bg-gray-50' : 'bg-gray-50 opacity-75'
                    }`}
                    data-testid={`task-card-${task.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div onClick={(e) => e.stopPropagation()} className="mt-0.5">
                        <Checkbox
                          checked={selectedTasks.has(task.id)}
                          disabled={!task.canGenerate}
                          onCheckedChange={() => handleToggleTask(task.id)}
                          data-testid={`checkbox-task-${task.id}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <Badge className={`text-xs ${getFrequencyBadge(task.frequency)}`}>
                            {task.frequency}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          Key Result: {task.keyResultTitle}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span className="hidden sm:inline">Next: {task.nextDueDate ? formatNextDue(task.nextDueDate) : 'Not set'}</span>
                            <span className="sm:hidden">{task.nextDueDate ? format(new Date(task.nextDueDate), 'MMM d') : 'Not set'}</span>
                          </div>
                          <div>
                            ✓ {task.completedCount}/{task.totalOccurrences || '∞'}
                          </div>
                        </div>
                        {task.warningMessage && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                            <AlertCircle className="h-3 w-3" />
                            <span>{task.warningMessage}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Action buttons - always visible at bottom */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-6 py-4 border-t shrink-0 bg-white">
          <div className="text-sm text-gray-600 text-center sm:text-left">
            {selectedTasks.size > 0 && `${selectedTasks.size} task${selectedTasks.size > 1 ? 's' : ''} selected`}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              data-testid="button-cancel"
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={selectedTasks.size === 0 || generateMutation.isPending}
              data-testid="button-generate"
              className="flex-1 sm:flex-none"
            >
              {generateMutation.isPending ? 'Generating...' : (
                <>
                  <span className="hidden sm:inline">Generate Items ({selectedTasks.size})</span>
                  <span className="sm:hidden">Generate ({selectedTasks.size})</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
