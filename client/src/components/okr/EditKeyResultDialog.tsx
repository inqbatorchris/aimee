import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

interface EditKeyResultDialogProps {
  keyResult: KeyResult;
  objectiveId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditKeyResultDialog({ keyResult, objectiveId, open, onOpenChange }: EditKeyResultDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    metricType: 'number' as 'number' | 'percentage' | 'currency' | 'binary',
    targetValue: '',
    currentValue: '',
    unit: '',
    ownerId: 0,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUser: user } = useAuth();

  // Fetch users for owner selection
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users/assignable'],
    enabled: open,
  });

  useEffect(() => {
    if (keyResult && open) {
      setFormData({
        title: keyResult.title || '',
        description: keyResult.description || '',
        metricType: keyResult.metricType || 'number',
        targetValue: keyResult.targetValue || '',
        currentValue: keyResult.currentValue || '',
        unit: keyResult.unit || '',
        ownerId: (keyResult as any).ownerId || user?.id || 0,
      });
    }
  }, [keyResult, open, user?.id]);

  const updateKeyResultMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest(`/api/strategy/key-results/${keyResult.id}`, {
        method: 'PUT',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/objectives/${objectiveId}/key-results`] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/key-results/${keyResult?.id}/activities`] });
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/key-results-bypass/${keyResult?.id}`] });
      toast({
        title: "Success",
        description: "Key result updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update key result",
        variant: "destructive",
      });
    },
  });

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

    updateKeyResultMutation.mutate({
      ...formData,
      targetValue: formData.targetValue.toString(),
      currentValue: formData.currentValue.toString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Key Result</DialogTitle>
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

          <div className="grid grid-cols-2 gap-4">
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

            <div>
              <label className="text-sm font-medium">Unit (Optional)</label>
              <Input
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="customers, points, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Target Value</label>
              <Input
                type="number"
                step="any"
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                placeholder="100"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Current Value</label>
              <Input
                type="number"
                step="any"
                value={formData.currentValue}
                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Assigned Owner</label>
            <Select
              value={formData.ownerId.toString()}
              onValueChange={(value) => setFormData({ ...formData, ownerId: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select owner..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.fullName || user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateKeyResultMutation.isPending}>
              {updateKeyResultMutation.isPending ? 'Updating...' : 'Update Key Result'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}