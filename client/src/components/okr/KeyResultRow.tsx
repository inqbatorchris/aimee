import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Edit, Trash2, MoreVertical, TrendingUp, Link, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentIndicator } from '@/components/KnowledgeBase/DocumentIndicator';
import { TaskList } from './TaskManager/TaskList';
import EditKeyResultDialog from './EditKeyResultDialog';
import { DeleteKeyResultDialog } from './dialogs/DeleteKeyResultDialog';

interface KeyResultRowProps {
  keyResult: KeyResult;
  objectiveId: number;
  onEdit?: () => void;
  onViewKeyResult?: (keyResultId: number) => void;
}

export default function KeyResultRow({ keyResult, objectiveId, onEdit, onViewKeyResult }: KeyResultRowProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUser: user } = useAuth();

  // Check permissions
  const canEdit = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'super_admin';

  // Delete key result mutation
  const deleteKeyResultMutation = useMutation({
    mutationFn: () => apiRequest(`/api/strategy/key-results/${keyResult.id}?cascade=true`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/objectives/${objectiveId}/key-results`] });
      toast({
        title: "Success",
        description: "Key result and all dependencies deleted successfully",
      });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete key result",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    const current = parseFloat(keyResult.currentValue || '0');
    const target = parseFloat(keyResult.targetValue || '0');
    if (target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const progressPercentage = calculateProgress();
  const current = parseFloat(keyResult.currentValue || '0');
  const target = parseFloat(keyResult.targetValue || '0');

  // Status based on progress
  const getStatus = () => {
    if (progressPercentage >= 100) return 'achieved';
    if (progressPercentage >= 75) return 'on_track';
    if (progressPercentage >= 50) return 'at_risk';
    return 'behind';
  };

  const status = getStatus();
  const statusColors = {
    achieved: 'bg-green-100 text-green-800',
    on_track: 'bg-blue-100 text-blue-800',
    at_risk: 'bg-yellow-100 text-yellow-800',
    behind: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    achieved: 'Achieved',
    on_track: 'On Track',
    at_risk: 'At Risk',
    behind: 'Behind',
  };

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
    <>
      <div className="border rounded-lg bg-white hover:shadow-sm transition-shadow">
        {/* Main Row */}
        <div className="p-4">
          <div className="flex items-center gap-4">
            {/* Expand Button */}
            <button
              onClick={() => setTasksExpanded(!tasksExpanded)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              {tasksExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )}
            </button>

            {/* Key Result Content */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Title and Badges */}
                  <div className="flex items-center gap-2 mb-2">
                    <h3 
                      className="font-medium text-sm cursor-pointer hover:text-primary hover:underline"
                      onClick={() => onViewKeyResult?.(keyResult.id)}
                    >
                      {keyResult.title}
                    </h3>
                    <Badge className={`text-xs px-2 py-0.5 ${statusColors[status]}`}>
                      {statusLabels[status]}
                    </Badge>
                    {(keyResult as any).owner && (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        {(keyResult as any).owner.fullName || `User ${(keyResult as any).ownerId}`}
                      </Badge>
                    )}
                    {/* Document Indicator */}
                    <DocumentIndicator 
                      entityType="keyResult" 
                      entityId={keyResult.id} 
                      entityTitle={keyResult.title}
                      size="sm"
                    />
                  </div>

                  {/* Description */}
                  {keyResult.description && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                      {keyResult.description}
                    </p>
                  )}

                  {/* Progress Bar and Values */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 max-w-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Progress</span>
                        <span className="text-xs font-medium">{progressPercentage}%</span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">{formatValue(keyResult.currentValue || '0', keyResult.metricType || 'number')}</span>
                      <span className="text-gray-400">/</span>
                      <span className="font-medium">{formatValue(keyResult.targetValue || '0', keyResult.metricType || 'number')}</span>
                      {keyResult.unit && <span className="text-gray-600">{keyResult.unit}</span>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-4">
                  {canEdit && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setTasksExpanded(!tasksExpanded)}
                        className="h-5 px-2 text-[10px] hidden sm:inline-flex"
                      >
                        <Plus className="h-2.5 w-2.5 mr-0.5" />
                        Tasks/actions
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewKeyResult?.(keyResult.id)}>
                            <Edit className="h-3 w-3 mr-2" />
                            Edit Key Result
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Link className="h-3 w-3 mr-2" />
                            Link Backlog Items
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Tasks Section */}
        {tasksExpanded && (
          <div className="border-t bg-gray-50 p-4">
            <TaskList 
              keyResultId={keyResult.id}
              objectiveId={objectiveId}
              keyResult={keyResult}
              viewMode="expanded"
            />
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editDialogOpen && (
        <EditKeyResultDialog
          keyResult={keyResult}
          objectiveId={objectiveId}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
      
      {/* Delete Dialog */}
      <DeleteKeyResultDialog
        keyResult={keyResult}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => deleteKeyResultMutation.mutate()}
        isDeleting={deleteKeyResultMutation.isPending}
      />
    </>
  );
}