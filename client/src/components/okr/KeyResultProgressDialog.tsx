import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface KeyResult {
  id: number;
  title: string;
  currentValue?: string;
  targetValue?: string;
  metricType?: string;
  unit?: string;
}

interface KeyResultProgressDialogProps {
  keyResult: KeyResult;
  objectiveId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KeyResultProgressDialog({ keyResult, objectiveId, open, onOpenChange }: KeyResultProgressDialogProps) {
  const [currentValue, setCurrentValue] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (keyResult && open) {
      setCurrentValue(keyResult.currentValue || '0');
      setNotes('');
    }
  }, [keyResult, open]);

  const updateProgressMutation = useMutation({
    mutationFn: (data: { currentValue: string; notes?: string }) =>
      apiRequest(`/api/strategy/key-results/${keyResult.id}`, {
        method: 'PUT',
        body: {
          currentValue: data.currentValue,
          // Note: In a full implementation, you'd want to track progress updates with timestamps
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/objectives/${objectiveId}/key-results`] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/key-results/${keyResult.id}/activities`] });
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/key-results-bypass/${keyResult.id}`] });
      toast({
        title: "Success",
        description: "Progress updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update progress",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const numValue = parseFloat(currentValue);
    if (isNaN(numValue) || numValue < 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }

    updateProgressMutation.mutate({
      currentValue: currentValue,
      notes: notes.trim() || undefined,
    });
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    const current = parseFloat(currentValue || '0');
    const target = parseFloat(keyResult.targetValue || '0');
    if (target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const progressPercentage = calculateProgress();

  const formatValue = (value: string, type: string) => {
    const num = parseFloat(value || '0');
    switch (type) {
      case 'percentage':
        return `${num}%`;
      case 'currency':
        return `$${num.toLocaleString()}`;
      case 'binary':
        return num > 0 ? 'Yes' : 'No';
      default:
        return num.toLocaleString();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Update Progress</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">{keyResult.title}</h4>
            <p className="text-xs text-gray-600 mb-4">
              Target: {formatValue(keyResult.targetValue || '0', keyResult.metricType || 'number')}
              {keyResult.unit && ` ${keyResult.unit}`}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Value</label>
              <Input
                type="number"
                step="any"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="Enter current value"
                required
              />
            </div>

            {/* Progress Visualization */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-gray-600">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>0</span>
                <span>
                  {formatValue(keyResult.targetValue || '0', keyResult.metricType || 'number')}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add context about this progress update..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProgressMutation.isPending}>
                {updateProgressMutation.isPending ? 'Updating...' : 'Update Progress'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}