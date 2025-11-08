import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Edit, Trash2, MoreVertical, TrendingUp, Link, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentIndicator } from '@/components/KnowledgeBase/DocumentIndicator';
import { TaskList } from './TaskManager/TaskList';
import EditKeyResultDialog from './EditKeyResultDialog';
import { DeleteKeyResultDialog } from './dialogs/DeleteKeyResultDialog';
// import KeyResultProgressDialog from './KeyResultProgressDialog';

interface KeyResultCardProps {
  keyResult: any;  // KeyResult type from backend
  objectiveId: number;
  onEdit?: () => void;
  onViewKeyResult?: (keyResultId: number) => void;
}

export default function KeyResultCard({ keyResult, objectiveId, onEdit, onViewKeyResult }: KeyResultCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUser: user } = useAuth();

  // Check permissions
  const canEdit = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'super_admin';

  // Delete key result mutation
  const deleteKeyResultMutation = useMutation({
    mutationFn: () => apiRequest(`/api/strategy/key-results/${keyResult.id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/objectives/${objectiveId}/key-results`] });
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/objectives/${objectiveId}`] });
      toast({
        title: "Success",
        description: "Key result deleted successfully",
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

  const handleConfirmDelete = (keyResultId: number) => {
    deleteKeyResultMutation.mutate();
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
      <Card className="hover:shadow-md transition-shadow p-1 sm:p-0">
        <CardHeader className="pb-1 sm:pb-2 p-1.5 sm:p-3">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xs sm:text-sm font-medium leading-tight mb-0.5 sm:mb-1 truncate">
                {keyResult.title}
              </CardTitle>
              <div className="flex items-center gap-0.5 sm:gap-2 mb-1 sm:mb-2">
                <Badge className={`text-[9px] sm:text-xs px-1 sm:px-2 py-0 sm:py-0.5 h-3.5 sm:h-auto ${statusColors[status]}`}>
                  {statusLabels[status]}
                </Badge>
                {keyResult.metricType && (
                  <Badge variant="outline" className="text-[9px] sm:text-xs px-0.5 sm:px-1 py-0 h-3.5 sm:h-auto">
                    <span className="hidden sm:inline">{keyResult.metricType}</span>
                    <span className="sm:hidden">{keyResult.metricType.slice(0, 3)}</span>
                  </Badge>
                )}
                {(keyResult as any).ownerId && (
                  <Badge variant="secondary" className="text-[9px] sm:text-xs px-0.5 sm:px-1 py-0 h-3.5 sm:h-auto hidden sm:flex">
                    Owner: {(keyResult as any).ownerName || `User ${(keyResult as any).ownerId}`}
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
            </div>
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-5 w-5 sm:h-6 sm:w-6 p-0">
                    <MoreVertical className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setProgressDialogOpen(true)}>
                    <TrendingUp className="h-3 w-3 mr-2" />
                    Update Progress
                  </DropdownMenuItem>
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
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-1 sm:space-y-3 p-1.5 sm:p-3 pt-0">
          {/* Hide description on mobile */}
          {keyResult.description && (
            <p className="text-xs text-gray-600 line-clamp-2 hidden sm:block">
              {keyResult.description}
            </p>
          )}
          
          {/* Progress Section - Ultra compact on mobile */}
          <div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                <span className="text-[10px] sm:text-xs font-medium">Progress</span>
                <span className="text-[10px] sm:text-xs text-gray-600">{progressPercentage}%</span>
              </div>
              {/* Inline values on mobile */}
              <div className="flex items-center gap-1 sm:hidden text-[10px]">
                <span className="text-gray-600">{current}</span>
                <span className="text-gray-400">/</span>
                <span className="font-medium">{target}</span>
                <span className="text-gray-600">{keyResult.unit}</span>
              </div>
            </div>
            <Progress value={progressPercentage} className="h-1 sm:h-2" />
          </div>
          
          {/* Current vs Target - Show on desktop only */}
          <div className="hidden sm:block space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Current:</span>
              <span className="font-medium">
                {formatValue(keyResult.currentValue || '0', keyResult.metricType || 'number')}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Target:</span>
              <span className="font-medium">
                {formatValue(keyResult.targetValue || '0', keyResult.metricType || 'number')}
              </span>
            </div>
          </div>
          
          {/* Quick Actions - Ultra compact on mobile */}
          {canEdit && (
            <div className="flex gap-0.5 sm:gap-2 pt-0.5 sm:pt-1">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-5 sm:h-6 text-[9px] sm:text-xs flex-1 px-1 sm:px-2"
                onClick={() => setProgressDialogOpen(true)}
              >
                <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">Update</span>
                <span className="sm:hidden">Up</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-5 sm:h-6 text-[9px] sm:text-xs flex-1 px-1 sm:px-2"
                onClick={() => setTasksExpanded(!tasksExpanded)}
              >
                {tasksExpanded ? (
                  <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                ) : (
                  <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                )}
                Tasks
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks Section - Expanded */}
      {tasksExpanded && (
        <Card className="mt-2 border-t-0 border-t-dashed">
          <CardContent className="p-3">
            <TaskList
              keyResultId={keyResult.id}
              keyResultTitle={keyResult.title}
            />
          </CardContent>
        </Card>
      )}

      {/* Dialogs - disabled in favor of panel system
      <EditKeyResultDialog
        keyResult={keyResult}
        objectiveId={objectiveId}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
      
      <KeyResultProgressDialog
        keyResult={keyResult}
        objectiveId={objectiveId}
        open={progressDialogOpen}
        onOpenChange={setProgressDialogOpen}
      />
      */}

      {/* Delete Key Result Dialog */}
      <DeleteKeyResultDialog
        keyResult={keyResult}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteKeyResultMutation.isPending}
      />
    </>
  );
}