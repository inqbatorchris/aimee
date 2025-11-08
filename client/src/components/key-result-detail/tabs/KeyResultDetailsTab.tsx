import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface KeyResult {
  id: number;
  objectiveId: number;
  title: string;
  description?: string;
  metricType: 'number' | 'percentage' | 'currency' | 'binary';
  targetValue: string;
  currentValue: string;
  unit?: string;
  ownerId?: number;
  status?: string;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: number;
    fullName: string;
    email: string;
  };
  objective?: {
    id: number;
    title: string;
  };
}

interface KeyResultDetailsTabProps {
  keyResult: KeyResult;
  canEdit: boolean;
  onEdit: () => void;
}

export function KeyResultDetailsTab({ keyResult, canEdit, onEdit }: KeyResultDetailsTabProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    currentValue: '0',
    targetValue: '0',
    ownerId: 0,
    status: 'Not Started',
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Reset form when keyResult changes
  useEffect(() => {
    setFormData({
      title: keyResult.title || '',
      description: keyResult.description || '',
      currentValue: keyResult.currentValue || '0',
      targetValue: keyResult.targetValue || '0',
      ownerId: keyResult.ownerId || 0,
      status: keyResult.status || 'Not Started',
    });
  }, [keyResult]);
  
  // Fetch users for owner assignment
  const { data: users = [] } = useQuery<Array<{ id: number; fullName: string; email: string }>>({
    queryKey: ['/api/core/users'],
  });
  
  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest(`/api/strategy/key-results/${keyResult.id}`, {
        method: 'PUT',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/key-results-bypass/${keyResult.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      toast({
        title: "Success",
        description: "Key result updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update key result",
        variant: "destructive",
      });
    },
  });
  
  const handleSave = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }
    
    updateMutation.mutate({
      title: formData.title,
      description: formData.description,
      targetValue: formData.targetValue.toString(),
      currentValue: formData.currentValue.toString(),
      ownerId: formData.ownerId || null,
      status: formData.status,
    });
  };
  
  const calculateProgress = () => {
    const current = parseFloat(formData.currentValue || '0');
    const target = parseFloat(formData.targetValue || '0');
    if (target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const progressPercentage = calculateProgress();

  return (
    <div className="p-4 space-y-6">
      {/* Basic Information Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Basic Information</h3>
        
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="title" className="text-xs font-medium">Title</Label>
            <Input
              id="title"
              className="h-8 text-sm"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter key result title"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description" className="text-xs font-medium">Description</Label>
            <Textarea
              id="description"
              className="text-sm min-h-[60px]"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe this key result (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="owner" className="text-xs font-medium">Owner</Label>
              <Select
                value={formData.ownerId?.toString() || ''}
                onValueChange={value => setFormData({ ...formData, ownerId: parseInt(value) })}
              >
                <SelectTrigger id="owner" className="h-8 text-sm">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Unassigned</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs font-medium">Status</Label>
              <Select
                value={formData.status}
                onValueChange={value => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status" className="h-8 text-sm">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="On Track">On Track</SelectItem>
                  <SelectItem value="At Risk">At Risk</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Progress</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="currentValue" className="text-xs font-medium">Current Value</Label>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  const current = parseFloat(formData.currentValue || '0') - 1;
                  setFormData({ ...formData, currentValue: current.toString() });
                }}
              >
                -
              </Button>
              <Input
                id="currentValue"
                className="h-8 text-sm"
                type="number"
                value={formData.currentValue}
                onChange={e => setFormData({ ...formData, currentValue: e.target.value })}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  const current = parseFloat(formData.currentValue || '0') + 1;
                  setFormData({ ...formData, currentValue: current.toString() });
                }}
              >
                +
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="targetValue" className="text-xs font-medium">Target Value</Label>
            <Input
              id="targetValue"
              className="h-8 text-sm"
              type="number"
              value={formData.targetValue}
              onChange={e => setFormData({ ...formData, targetValue: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4">
        <Button 
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="w-full"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}