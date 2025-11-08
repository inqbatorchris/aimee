import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Plus, Edit, Calendar, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import KeyResultCard from './KeyResultCard';
import KeyResultRow from './KeyResultRow';
import EditObjectiveDialog from './EditObjectiveDialog';
// import CreateKeyResultDialog from './CreateKeyResultDialog';

interface ObjectiveDetailsViewProps {
  objective: Objective;
  onBack: () => void;
  onViewKeyResult?: (keyResultId: number) => void;
}

export default function ObjectiveDetailsView({ objective, onBack, onViewKeyResult }: ObjectiveDetailsViewProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogInitialTab, setEditDialogInitialTab] = useState("details");
  const [createKeyResultDialogOpen, setCreateKeyResultDialogOpen] = useState(false);
  const { currentUser: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check permissions
  const canEdit = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'super_admin';

  // Fetch key results for this objective
  const { data: keyResults = [], isLoading: keyResultsLoading } = useQuery<KeyResult[]>({
    queryKey: [`/api/strategy/objectives/${objective.id}/key-results`],
    refetchOnWindowFocus: false,
  });

  // Calculate overall progress
  const calculateProgress = () => {
    if (keyResults.length === 0) return 0;
    
    const totalProgress = keyResults.reduce((sum: number, kr: KeyResult) => {
      const current = parseFloat(kr.currentValue || '0');
      const target = parseFloat(kr.targetValue || '0');
      return sum + (target > 0 ? (current / target) * 100 : 0);
    }, 0);
    
    return Math.min(Math.round(totalProgress / keyResults.length), 100);
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
    <div className="space-y-2 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="h-6 sm:h-8 px-1.5 sm:px-3 text-[10px] sm:text-sm" onClick={onBack}>
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-2" />
          <span className="hidden sm:inline">Back to Objectives</span>
          <span className="sm:hidden">Back</span>
        </Button>
      </div>

      {/* Objective Overview Card - Compressed */}
      <Card className={`${isOverdue ? 'border-red-300 bg-red-50' : ''} p-2 sm:p-3`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-4 flex-1">
            {/* Title and Status */}
            <div className="flex-1">
              <h2 className="text-sm sm:text-lg font-medium sm:font-semibold">{objective.title}</h2>
            </div>
            
            {/* Status Badge */}
            <Badge className={`${statusColors[objective.status as keyof typeof statusColors]} text-[9px] sm:text-xs px-1 sm:px-2 py-0 sm:py-0.5`}>
              {objective.status.charAt(0).toUpperCase() + objective.status.slice(1)}
            </Badge>
            
            {/* Category Badge - Desktop only */}
            {objective.category && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 hidden sm:inline-flex">
                {objective.category.charAt(0).toUpperCase() + objective.category.slice(1)}
              </Badge>
            )}
            
            {/* Progress Display */}
            <div className="text-center">
              <div className="text-[10px] sm:text-xs text-gray-600">
                {(objective as any).currentValue || '0'} RFS
              </div>
              <div className="text-sm sm:text-lg font-bold">{progressPercentage}%</div>
            </div>
            
            {/* Target Date */}
            <div className="text-center hidden sm:block">
              <div className="text-xs text-gray-600">Target</div>
              <div className="text-sm font-medium">{formatDate(objective.targetDate)}</div>
            </div>
            
            {/* Edit Button */}
            {canEdit && (
              <Button variant="outline" size="sm" className="h-6 sm:h-7 px-2 sm:px-3 text-[10px] sm:text-xs" onClick={() => {
                setEditDialogInitialTab("details");
                setEditDialogOpen(true);
              }}>
                <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Key Results Section - Compact on mobile */}
      <div>
        <div className="mb-1.5 sm:mb-4">
          <h2 className="text-sm sm:text-lg font-medium sm:font-semibold">Key Results ({keyResults.length})</h2>
        </div>

        {keyResultsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        ) : keyResults.length > 0 ? (
          <div className="space-y-2">
            {keyResults.map((keyResult) => (
              <KeyResultRow
                key={keyResult.id}
                keyResult={keyResult}
                objectiveId={objective.id}
                onViewKeyResult={onViewKeyResult}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Key Results Yet</h3>
              <p className="text-gray-600 mb-4">
                Add key results to track progress towards this objective.
              </p>
              {canEdit && (
                // TODO: Replace with panel-based key result creation
                // For now, commented out to prevent modal conflicts
                /*<Button onClick={() => {
                  setEditDialogInitialTab("keyresults");
                  setEditDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Key Result
                </Button>*/
                null
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <EditObjectiveDialog
        objective={objective}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        initialTab={editDialogInitialTab}
      />
      
      {/* Temporarily disabled for core UI to work
      <CreateKeyResultDialog
        objectiveId={objective.id}
        open={createKeyResultDialogOpen}
        onOpenChange={setCreateKeyResultDialogOpen}
      />
      */}
    </div>
  );
}