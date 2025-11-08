import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Edit2, Save, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';

interface KeyResultProgressProps {
  keyResult: KeyResult;
  compact?: boolean;
}

export default function KeyResultProgress({ keyResult, compact = true }: KeyResultProgressProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(keyResult.currentValue);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUser: user } = useAuth();

  const canEdit = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'super_admin';

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (currentValue: number) => {
      return apiRequest(`/api/strategy/key-results/${keyResult.id}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ currentValue }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/objectives/${keyResult.objectiveId}/key-results`] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      toast({
        title: "Progress Updated",
        description: "Key result progress has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update progress.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const value = parseFloat(editValue);
    if (isNaN(value) || value < 0) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid positive number.",
        variant: "destructive",
      });
      return;
    }
    updateProgressMutation.mutate(value);
  };

  const handleCancel = () => {
    setEditValue(keyResult.currentValue);
    setIsEditing(false);
  };

  const calculateProgress = () => {
    const current = parseFloat(keyResult.currentValue);
    const target = parseFloat(keyResult.targetValue);
    
    if (target === 0) return 0;
    
    const percentage = (current / target) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  };

  const formatValue = (value: string) => {
    const num = parseFloat(value);
    if (keyResult.metricType === 'percentage') {
      return `${num}%`;
    }
    if (keyResult.metricType === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(num);
    }
    return `${num}${keyResult.unit ? ` ${keyResult.unit}` : ''}`;
  };

  const progressPercentage = calculateProgress();
  const current = parseFloat(keyResult.currentValue);
  const target = parseFloat(keyResult.targetValue);

  if (compact) {
    return (
      <div className="space-y-0.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-medium truncate flex-1 leading-tight">{keyResult.title}</span>
          <span className="text-gray-600 ml-2">
            {formatValue(keyResult.currentValue)} / {formatValue(keyResult.targetValue)}
          </span>
        </div>
        <Progress value={progressPercentage} className="h-1" />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-medium">{keyResult.title}</h4>
          {keyResult.description && (
            <p className="text-sm text-gray-600 mt-1">{keyResult.description}</p>
          )}
        </div>
        {canEdit && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="ml-2"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Progress Display */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-gray-600">{Math.round(progressPercentage)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Value Input/Display */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Current:</span>
        </div>
        
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-20 h-8 text-sm"
              step={keyResult.metricType === 'percentage' ? '0.1' : '1'}
              min="0"
            />
            <span className="text-sm text-gray-600">/ {formatValue(keyResult.targetValue)}</span>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateProgressMutation.isPending}
              className="h-8 px-2"
            >
              <Save className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 px-2"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span className="text-sm">
            <span className="font-semibold">{formatValue(keyResult.currentValue)}</span>
            <span className="text-gray-600"> / {formatValue(keyResult.targetValue)}</span>
          </span>
        )}
      </div>

      {/* Status indicators */}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Metric: {keyResult.metricType}</span>
        <span>Updated: {keyResult.measurementFrequency}</span>
      </div>
    </div>
  );
}