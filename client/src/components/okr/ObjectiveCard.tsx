import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Target, TrendingUp, Users, MoreVertical, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  team?: any;
  owner?: any;
  [key: string]: any;
}

interface KeyResult {
  id: number;
  title: string;
  currentValue?: string;
  targetValue?: string;
  [key: string]: any;
}

interface ObjectiveCardProps {
  objective: Objective;
  onViewDetails?: () => void;
}

export default function ObjectiveCard({ objective, onViewDetails }: ObjectiveCardProps) {
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

  // Recalculate objective mutation
  const recalculateObjectiveMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/strategy/objectives/${objective.id}/calculate`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/objectives/${objective.id}/key-results`] });
      toast({
        title: "Success",
        description: "Objective progress recalculated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to recalculate objective",
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
    cacheTime: 0, // Don't cache
  });

  // Calculate progress using both objective-level values and key result averages
  const calculateProgress = () => {
    // First check if objective has target and current values (for formula-based calculations)
    const objectiveTarget = parseFloat((objective as any).targetValue || '0');
    const objectiveCurrent = parseFloat((objective as any).currentValue || '0');
    
    console.log(`[DEBUG] Objective ${objective.id}: current=${objectiveCurrent}, target=${objectiveTarget}`);
    
    if (objectiveTarget > 0 && objectiveCurrent >= 0) {
      // Use objective-level calculation (for RFS-like metrics)
      const progress = Math.min(Math.round((objectiveCurrent / objectiveTarget) * 100), 100);
      console.log(`[DEBUG] Using objective-level calculation: ${progress}%`);
      return progress;
    }
    
    // Fallback to key results average (for objectives without formula)
    console.log(`[DEBUG] Falling back to key results average calculation`);
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
  
  // Get objective current and target values for display
  const objectiveTarget = parseFloat((objective as any).targetValue || '0');
  const objectiveCurrent = parseFloat((objective as any).currentValue || '0');
  const hasObjectiveValues = objectiveTarget > 0;
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
    <Card className={`${isOverdue ? 'border-red-300 bg-red-50' : ''}`}>
      <CardHeader className="pb-0 p-3 sm:p-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-sm sm:text-xs mb-1 sm:mb-0.5 leading-tight font-medium">{objective.title}</CardTitle>
            {(objective as any).primaryKpi && (
              <p className="text-xs text-blue-600 font-medium mb-1">
                KPI: {(objective as any).primaryKpi}
              </p>
            )}
            <div className="flex flex-wrap gap-1 sm:gap-0.5 mb-1 sm:mb-0.5">
              <Badge className={`text-sm sm:text-xs px-1 py-0.5 sm:px-0.5 sm:py-0 ${statusColors[objective.status as keyof typeof statusColors]}`}>
                {objective.status}
              </Badge>
              <Badge className={`text-sm sm:text-xs px-1 py-0.5 sm:px-0.5 sm:py-0 ${priorityColors[objective.priority as keyof typeof priorityColors]}`}>
                {objective.priority}
              </Badge>
              {objective.category && (
                <Badge variant="outline" className="text-sm sm:text-xs px-1 py-0.5 sm:px-0.5 sm:py-0">
                  {objective.category}
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
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-5 sm:w-5 p-0">
                  <MoreVertical className="h-4 w-4 sm:h-3 sm:w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Edit className="h-3 w-3 mr-2" />
                  Edit Objective
                </DropdownMenuItem>
                {(objective as any).calculationFormula && (
                  <DropdownMenuItem 
                    onClick={() => recalculateObjectiveMutation.mutate()}
                    disabled={recalculateObjectiveMutation.isPending}
                  >
                    <RefreshCw className={`h-3 w-3 mr-2 ${recalculateObjectiveMutation.isPending ? 'animate-spin' : ''}`} />
                    Recalculate
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <p className="text-sm sm:text-xs text-gray-600 line-clamp-2 leading-tight">
          {objective.description}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-2 sm:space-y-1 p-3 sm:p-2 pt-0">
        {/* Progress */}
        <div>
          <div className="flex justify-between items-center mb-1 sm:mb-0.5">
            <span className="text-sm sm:text-xs font-medium">Progress</span>
            <div className="text-sm sm:text-xs text-gray-600">
              {hasObjectiveValues ? (
                <span>{objectiveCurrent.toLocaleString()}/{objectiveTarget.toLocaleString()} {(objective as any).primaryKpi || 'units'} ({progressPercentage}%)</span>
              ) : (
                <span>{progressPercentage}%</span>
              )}
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2 sm:h-1" />
        </div>

        {/* Key Results */}
        {keyResults.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-1 sm:mb-0.5">
              <h4 className="text-sm sm:text-xs font-medium">Key Results ({keyResults.length})</h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-auto px-1 text-xs text-blue-600 hover:text-blue-700"
                onClick={() => onViewDetails && onViewDetails()}
              >
                View All →
              </Button>
            </div>
            <div className="space-y-1 sm:space-y-0.5">
              {keyResults.slice(0, 2).map((keyResult: KeyResult) => (
                <div key={keyResult.id} className="text-sm sm:text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{keyResult.title}</span>
                    <span>{keyResult.currentValue}/{keyResult.targetValue}</span>
                  </div>
                </div>
              ))}
              {keyResults.length > 2 && (
                <p className="text-sm sm:text-xs text-gray-500">+{keyResults.length - 2} more</p>
              )}
            </div>
          </div>
        )}

        {/* Stats - Combined into single compact row */}
        <div className="flex justify-between items-center text-sm sm:text-xs text-gray-600">
          <div className="flex items-center gap-2 sm:gap-1">
            <span className="flex items-center gap-1 sm:gap-0.5">
              <Target className="h-3 w-3 sm:h-2.5 sm:w-2.5" />
              {keyResults.length} KRs
            </span>
            <span className="flex items-center gap-1 sm:gap-0.5">
              <Calendar className="h-3 w-3 sm:h-2.5 sm:w-2.5" />
              Due {formatDate(objective.targetDate)}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-0.5">
            {isOverdue && (
              <Badge variant="destructive" className="text-sm sm:text-xs px-1 py-0.5 sm:px-0.5 sm:py-0 mr-1 sm:mr-0.5">
                Overdue
              </Badge>
            )}
            <TrendingUp className="h-3 w-3 sm:h-2.5 sm:w-2.5" />
            <span>{progressPercentage}%</span>
          </div>
        </div>
      </CardContent>

      <EditObjectiveDialog
        objective={objective}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
      
      <DeleteObjectiveDialog
        objective={objective}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => deleteObjectiveMutation.mutate()}
        isDeleting={deleteObjectiveMutation.isPending}
      />
    </Card>
  );
}