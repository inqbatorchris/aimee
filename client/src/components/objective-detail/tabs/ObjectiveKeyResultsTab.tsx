import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plus,
  TrendingUp,
  ChevronRight,
  Target,
  ListTodo,
  Edit2,
  Trash2,
  User,
  Calendar,
  AlertCircle
} from 'lucide-react';
import CreateKeyResultDialog from '@/components/okr/CreateKeyResultDialog';
import KeyResultProgressDialog from '@/components/okr/KeyResultProgressDialog';
import { DeleteKeyResultDialog } from '@/components/okr/dialogs/DeleteKeyResultDialog';

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
  owner?: {
    id: number;
    fullName: string;
    email: string;
  };
  tasks?: any[];
  createdAt: string;
  updatedAt: string;
}

interface ObjectiveKeyResultsTabProps {
  objectiveId: number;
  objectiveTitle: string;
  keyResults: KeyResult[];
  onViewKeyResult?: (keyResultId: number) => void;
  onViewTask?: (taskId: number) => void;
}

export function ObjectiveKeyResultsTab({
  objectiveId,
  objectiveTitle,
  keyResults,
  onViewKeyResult,
  onViewTask
}: ObjectiveKeyResultsTabProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedKeyResultForProgress, setSelectedKeyResultForProgress] = useState<KeyResult | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedKeyResultForDelete, setSelectedKeyResultForDelete] = useState<KeyResult | null>(null);

  const canEdit = currentUser?.role === 'admin' || 
                  currentUser?.role === 'manager' || 
                  currentUser?.role === 'super_admin';

  // Delete key result mutation
  const deleteKeyResultMutation = useMutation({
    mutationFn: (keyResultId: number) =>
      apiRequest(`/api/strategy/key-results/${keyResultId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/objectives/${objectiveId}/key-results`] });
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/objectives/${objectiveId}`] });
      toast({
        title: "Success",
        description: "Key result deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete key result",
        variant: "destructive",
      });
    },
  });

  const handleDeleteKeyResult = (keyResult: KeyResult) => {
    setSelectedKeyResultForDelete(keyResult);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = (keyResultId: number) => {
    deleteKeyResultMutation.mutate(keyResultId);
    setDeleteDialogOpen(false);
    setSelectedKeyResultForDelete(null);
  };

  const calculateProgress = (keyResult: KeyResult) => {
    const current = parseFloat(keyResult.currentValue || '0');
    const target = parseFloat(keyResult.targetValue || '0');
    if (target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getStatus = (progress: number) => {
    if (progress >= 100) return 'achieved';
    if (progress >= 75) return 'on_track';
    if (progress >= 50) return 'at_risk';
    return 'behind';
  };

  const statusColors: Record<string, string> = {
    achieved: 'bg-green-100 text-green-800',
    on_track: 'bg-blue-100 text-blue-800',
    at_risk: 'bg-yellow-100 text-yellow-800',
    behind: 'bg-red-100 text-red-800',
  };

  const statusLabels: Record<string, string> = {
    achieved: 'Achieved',
    on_track: 'On Track',
    at_risk: 'At Risk',
    behind: 'Behind',
  };

  const formatValue = (value: string, metricType: string, unit?: string) => {
    if (metricType === 'currency') {
      return `$${parseFloat(value).toLocaleString()}`;
    }
    if (metricType === 'percentage') {
      return `${value}%`;
    }
    if (unit) {
      return `${value} ${unit}`;
    }
    return value;
  };

  return (
    <div className="p-4 space-y-3 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1">
          <TrendingUp className="h-4 w-4" />
          Key Results ({keyResults.length})
        </h3>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="h-7 px-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>

      {/* Key Results List */}
      {keyResults.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-3">No key results defined yet</p>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add First Key Result
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keyResults.map((keyResult) => {
            const progress = calculateProgress(keyResult);
            const status = getStatus(progress);
            
            return (
              <Card
                key={keyResult.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onViewKeyResult?.(keyResult.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {keyResult.title}
                        </h4>
                        <Badge className={`${statusColors[status]} text-[10px] px-1 py-0`}>
                          {statusLabels[status]}
                        </Badge>
                      </div>
                      {keyResult.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {keyResult.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Progress</span>
                      <span className="text-xs font-medium text-gray-900">
                        {formatValue(keyResult.currentValue, keyResult.metricType, keyResult.unit)} / {formatValue(keyResult.targetValue, keyResult.metricType, keyResult.unit)}
                      </span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                    <div className="text-xs text-gray-500 mt-1 text-right">{progress}%</div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {keyResult.owner && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <User className="h-3 w-3" />
                          <span>{keyResult.owner.fullName}</span>
                        </div>
                      )}
                      {keyResult.tasks && keyResult.tasks.length > 0 && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <ListTodo className="h-3 w-3" />
                          <span>{keyResult.tasks.length} tasks</span>
                        </div>
                      )}
                    </div>
                    
                    {canEdit && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedKeyResultForProgress(keyResult);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteKeyResult(keyResult);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <CreateKeyResultDialog
        objectiveId={objectiveId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Progress Update Dialog */}
      {selectedKeyResultForProgress && (
        <KeyResultProgressDialog
          keyResult={selectedKeyResultForProgress}
          open={!!selectedKeyResultForProgress}
          onOpenChange={(open) => !open && setSelectedKeyResultForProgress(null)}
        />
      )}

      {/* Delete Key Result Dialog */}
      {selectedKeyResultForDelete && (
        <DeleteKeyResultDialog
          keyResult={selectedKeyResultForDelete}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          isDeleting={deleteKeyResultMutation.isPending}
        />
      )}
    </div>
  );
}