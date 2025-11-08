import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Target, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DocumentIndicator } from '@/components/KnowledgeBase/DocumentIndicator';
import { apiRequest } from '@/lib/queryClient';
import EditObjectiveDialog from './EditObjectiveDialog';
import { DeleteObjectiveDialog } from './dialogs/DeleteObjectiveDialog';

interface Objective {
  id: number;
  title: string;
  description?: string;
  status: string;
  targetDate: string;
  ownerId?: number;
  teamId?: number;
  priority?: string;
  category?: string;
  [key: string]: any;
}

interface KeyResult {
  id: number;
  title: string;
  currentValue?: string;
  targetValue?: string;
  [key: string]: any;
}

interface ObjectiveRowWithExpansionProps {
  objective: Objective;
  onViewDetails?: () => void;
  highlightKeyResultId?: string | null;
  onViewKeyResult?: (keyResultId: number) => void;
}

export default function ObjectiveRowWithExpansion({ objective, onViewDetails, highlightKeyResultId, onViewKeyResult }: ObjectiveRowWithExpansionProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { currentUser: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user can edit objectives
  const canEdit = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'super_admin';

  // Delete objective mutation
  const deleteObjectiveMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/strategy/objectives/${objective.id}?cascade=true`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      toast({
        title: "Success",
        description: "Objective and all dependencies deleted successfully",
      });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete objective",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  // Fetch key results for this objective
  const { data: keyResults = [] } = useQuery<KeyResult[]>({
    queryKey: [`/api/strategy/objectives/${objective.id}/key-results`],
    refetchOnWindowFocus: false,
    staleTime: 0, // Force fresh data
    gcTime: 0, // Don't cache
  });
  
  console.log(`DEBUG - Key results for objective ${objective.id}:`, keyResults);

  // Auto-expand when highlightKeyResultId matches any key result in this objective
  useEffect(() => {
    if (highlightKeyResultId && keyResults.length > 0) {
      const hasMatchingKeyResult = keyResults.some(kr => kr.id.toString() === highlightKeyResultId);
      // Key results are now always expanded, so we don't need to do anything here
    }
  }, [highlightKeyResultId, keyResults]);

  // Calculate overall progress using objective-level values first, fallback to key results
  const calculateProgress = () => {
    // First check if objective has target and current values (for formula-based calculations)
    const objectiveTarget = parseFloat((objective as any).targetValue || '0');
    const objectiveCurrent = parseFloat((objective as any).currentValue || '0');
    
    console.log(`[DEBUG] ObjectiveRow ${objective.id}: current=${objectiveCurrent}, target=${objectiveTarget}, keyResults=${keyResults.length}`);
    
    if (objectiveTarget > 0 && objectiveCurrent >= 0) {
      // Use objective-level calculation (for RFS-like metrics)
      const progress = Math.min(Math.round((objectiveCurrent / objectiveTarget) * 100), 100);
      console.log(`[DEBUG] Using objective-level calculation: ${progress}%`);
      return progress;
    }
    
    // Fallback to key results average (for objectives without formula)
    console.log(`[DEBUG] Falling back to key results calculation`);
    if (keyResults.length === 0) return 0;
    
    const totalProgress = keyResults.reduce((sum: number, kr: KeyResult) => {
      const current = parseFloat(kr.currentValue || '0');
      const target = parseFloat(kr.targetValue || '0');
      const krProgress = target > 0 ? (current / target) * 100 : 0;
      console.log(`[DEBUG] KR ${kr.title}: ${current}/${target} = ${krProgress}%`);
      return sum + krProgress;
    }, 0);
    
    const avgProgress = Math.min(Math.round(totalProgress / keyResults.length), 100);
    console.log(`[DEBUG] Average progress: ${avgProgress}%`);
    return avgProgress;
  };

  const progressPercentage = calculateProgress();
  const isOverdue = new Date(objective.targetDate) < new Date() && objective.status === 'active';

  const statusColors = {
    active: 'bg-blue-100 text-blue-800',
    achieved: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-800',
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };



  return (
    <div className={`border rounded-lg p-4 bg-white shadow-sm ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'} hover:shadow-md transition-shadow`}>
      {/* Header Row: Title, Status, Priority, Actions */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div 
            className="font-medium text-sm mb-1 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={onViewDetails}
          >
            {objective.title}
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge className={`text-xs px-1 py-0 ${statusColors[objective.status as keyof typeof statusColors]}`}>
              {objective.status}
            </Badge>
            <Badge className={`text-xs px-1 py-0 ${priorityColors[objective.priority as keyof typeof priorityColors]}`}>
              {objective.priority}
            </Badge>
            {objective.category && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                {objective.category}
              </Badge>
            )}
            {isOverdue && (
              <Badge variant="destructive" className="text-xs px-1 py-0">
                Overdue
              </Badge>
            )}
            {/* Document Indicator */}
            <DocumentIndicator 
              entityType="objective" 
              entityId={objective.id} 
              entityTitle={objective.title}
              size="sm"
            />
          </div>
        </div>
        
        {/* Actions Menu */}
        <div className="flex-shrink-0">
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Edit className="h-3 w-3 mr-2" />
                  Edit Objective
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onViewDetails}>
                  <Target className="h-3 w-3 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* KPI Row */}
      {(objective as any).primaryKpi && (
        <div className="text-xs text-blue-600 font-medium mb-2">
          KPI: {(objective as any).primaryKpi}
        </div>
      )}

      {/* Progress and Due Date Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-medium">
            Progress: {progressPercentage}% {(objective as any).targetValue && (
              <span className="text-gray-600">
                {Math.round(parseFloat((objective as any).currentValue || '0'))}/{Math.round(parseFloat((objective as any).targetValue || '0'))}
              </span>
            )}
          </span>
          <Progress value={progressPercentage} className="h-2 flex-1 max-w-32" />
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Calendar className="h-3 w-3" />
          Due {formatDate(objective.targetDate)}
        </div>
      </div>

      {/* Key Results Section */}
      {keyResults.length > 0 && (
        <div className="border-t pt-3">
          <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Target className="h-3 w-3" />
            Key Results ({keyResults.length})
          </div>
          <div className="space-y-1">
            {keyResults.map((kr: KeyResult) => {
              const current = parseFloat(kr.currentValue || '0');
              const target = parseFloat(kr.targetValue || '0');
              const krProgress = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
              const isHighlighted = highlightKeyResultId === kr.id.toString();
              
              // Format values based on metric type
              let displayCurrent: string;
              let displayTarget: string;
              
              if ((kr as any).metricType === 'percentage') {
                // For percentage metrics, multiply by 100 and show as percentage
                displayCurrent = `${Math.round(current * 100)}%`;
                displayTarget = `${Math.round(target * 100)}%`;
              } else {
                // For other metrics, show as rounded numbers
                displayCurrent = Math.round(current).toString();
                displayTarget = Math.round(target).toString();
              }
              
              return (
                <div 
                  key={kr.id} 
                  className={`text-xs flex items-center justify-between py-1 px-2 rounded cursor-pointer hover:bg-gray-50 relative z-10 ${
                    isHighlighted ? 'bg-blue-100 border border-blue-300' : ''
                  }`}
                  style={{ pointerEvents: 'auto' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Key Result clicked:', {
                      krId: kr.id,
                      onViewKeyResult: !!onViewKeyResult,
                      functionType: typeof onViewKeyResult
                    });
                    if (onViewKeyResult) {
                      onViewKeyResult(kr.id);
                    }
                  }}
                >
                  <span className="text-gray-700 flex-1 truncate pr-2">{kr.title}</span>
                  <span className="text-gray-600 whitespace-nowrap">
                    {displayCurrent}/{displayTarget} ({krProgress}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}



      {/* Edit Dialog */}
      <EditObjectiveDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        objective={objective}
      />
      
      {/* Delete Dialog */}
      <DeleteObjectiveDialog
        objective={objective}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => deleteObjectiveMutation.mutate()}
        isDeleting={deleteObjectiveMutation.isPending}
      />
    </div>
  );
}