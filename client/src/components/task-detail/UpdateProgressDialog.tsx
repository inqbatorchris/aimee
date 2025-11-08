import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TrendingUp } from 'lucide-react';

interface UpdateProgressDialogProps {
  task: any;
  open: boolean;
  onClose: () => void;
}

export function UpdateProgressDialog({ task, open, onClose }: UpdateProgressDialogProps) {
  const [currentValue, setCurrentValue] = useState(task.kpiCurrentValue || 0);
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateProgressMutation = useMutation({
    mutationFn: async () => {
      const requestBody = {
        kpiCurrentValue: Number(currentValue),
        notes
      };
      console.log('Progress update request:', {
        url: `/api/strategy/tasks/${task.id}/progress`,
        body: requestBody,
        taskId: task.id
      });
      
      return apiRequest(`/api/strategy/tasks/${task.id}/progress`, {
        method: 'POST',
        body: requestBody
      });
    },
    onSuccess: () => {
      // Force refresh all related queries immediately
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/tasks', task.id, 'activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/tasks', task.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work'] });
      
      // Force immediate refetch to show updated data
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/strategy/tasks', task.id, 'activities'] });
      }, 100);
      
      toast({
        title: 'Progress updated',
        description: 'Task progress has been recorded successfully.'
      });
      
      onClose();
      setNotes('');
    },
    onError: (error: any) => {
      console.error('Progress update error:', error);
      toast({
        title: 'Update failed',
        description: error?.message || 'Failed to update task progress.',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProgressMutation.mutate();
  };

  const getProgressPercentage = () => {
    if (!task.kpiTargetValue || task.kpiTargetValue === 0) return 0;
    return Math.min(100, Math.max(0, (currentValue / task.kpiTargetValue) * 100));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Update Progress
            </DialogTitle>
            <DialogDescription>
              Record a progress checkpoint for "{task.title}"
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {task.kpiLabel && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{task.kpiLabel}</Label>
                <div className="text-xs text-muted-foreground">
                  Target: {task.kpiTargetValue} {task.kpiUnit}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="currentValue">Current Value</Label>
              <Input
                id="currentValue"
                type="number"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="Enter current value"
                required
              />
              {task.kpiUnit && (
                <span className="text-xs text-muted-foreground">
                  Progress: {getProgressPercentage().toFixed(1)}%
                </span>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Checkpoint Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this progress update..."
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateProgressMutation.isPending}>
              {updateProgressMutation.isPending ? 'Updating...' : 'Update Progress'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}