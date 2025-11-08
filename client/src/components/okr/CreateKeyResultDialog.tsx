import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface CreateKeyResultDialogProps {
  objectiveId: number;
  objectiveTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateKeyResultDialog({ objectiveId, objectiveTitle, open, onOpenChange }: CreateKeyResultDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    metricType: 'number' as 'number' | 'percentage' | 'currency' | 'binary',
    targetValue: '',
    currentValue: '0',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createKeyResultMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('/api/strategy/key-results', {
        method: 'POST',
        body: {
          ...data,
          objectiveId,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/objectives/${objectiveId}/key-results`] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      toast({
        title: "Success",
        description: "Key result created successfully",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Key result creation error:', error);
      const errorMessage = error.response?.data?.details || error.message || "Failed to create key result";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      metricType: 'number',
      targetValue: '',
      currentValue: '0',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.targetValue.trim()) {
      toast({
        title: "Validation Error",
        description: "Target value is required",
        variant: "destructive",
      });
      return;
    }

    // Map metricType to the expected type enum
    const typeMapping: Record<string, string> = {
      'number': 'Numeric Target',
      'percentage': 'Percentage KPI',
      'binary': 'Milestone',
      'currency': 'Numeric Target',
    };

    createKeyResultMutation.mutate({
      title: formData.title,
      description: formData.description,
      type: typeMapping[formData.metricType] || 'Numeric Target',
      targetValue: formData.targetValue.toString(),
      currentValue: formData.currentValue.toString(),
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Key Result</DialogTitle>
          {objectiveTitle && (
            <p className="text-sm text-gray-600 mt-1">
              For objective: <span className="font-medium text-gray-900">{objectiveTitle}</span>
            </p>
          )}
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Achieve 95% customer satisfaction"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe how this key result will be measured..."
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Metric Type</label>
            <Select
              value={formData.metricType}
              onValueChange={(value: any) => setFormData({ ...formData, metricType: value })}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Target Value</label>
              <Input
                type="number"
                step="any"
                value={formData.targetValue}
                onChange={(e) => {
                  const value = e.target.value;
                  // Remove leading zeros except for decimals like "0.5"
                  const cleanValue = value === '' ? '' : parseFloat(value || '0').toString();
                  setFormData({ ...formData, targetValue: value === '' ? '' : cleanValue });
                }}
                onBlur={(e) => {
                  // Clean up on blur to ensure proper formatting
                  const value = e.target.value;
                  if (value && !isNaN(parseFloat(value))) {
                    const cleanValue = parseFloat(value).toString();
                    setFormData({ ...formData, targetValue: cleanValue });
                  }
                }}
                placeholder="100"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Starting Value</label>
              <Input
                type="number"
                step="any"
                value={formData.currentValue}
                onChange={(e) => {
                  const value = e.target.value;
                  // Remove leading zeros except for decimals like "0.5"
                  const cleanValue = value === '' ? '0' : parseFloat(value || '0').toString();
                  setFormData({ ...formData, currentValue: value === '' ? '0' : cleanValue });
                }}
                onBlur={(e) => {
                  // Clean up on blur to ensure proper formatting
                  const value = e.target.value;
                  if (value && !isNaN(parseFloat(value))) {
                    const cleanValue = parseFloat(value).toString();
                    setFormData({ ...formData, currentValue: cleanValue });
                  } else if (value === '') {
                    setFormData({ ...formData, currentValue: '0' });
                  }
                }}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createKeyResultMutation.isPending}>
              {createKeyResultMutation.isPending ? 'Creating...' : 'Create Key Result'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}