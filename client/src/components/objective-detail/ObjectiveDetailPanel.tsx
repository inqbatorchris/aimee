import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target,
  TrendingUp,
  ListTodo,
  Activity,
  Edit2,
  Trash2,
  MoreVertical,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ObjectiveDetailsTab } from './tabs/ObjectiveDetailsTab';
import { ObjectiveKeyResultsTab } from './tabs/ObjectiveKeyResultsTab';
import { ObjectiveActivityTab } from './tabs/ObjectiveActivityTab';
import EditObjectiveDialog from '@/components/okr/EditObjectiveDialog';
import { DeleteObjectiveDialog } from '@/components/okr/dialogs/DeleteObjectiveDialog';

interface Objective {
  id: number;
  organizationId: number;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  status: string;
  startDate?: string;
  targetDate?: string;
  ownerId?: number;
  ownerName?: string;
  progress?: number;
  primaryKpi?: string;
  targetValue?: number;
  currentValue?: number;
  owner?: {
    id: number;
    fullName: string;
    email: string;
  };
  keyResults?: any[];
}

interface ObjectiveDetailPanelProps {
  objectiveId: number | null;
  open: boolean;
  onClose: () => void;
  onEditObjective?: (objectiveId: number) => void;
  onViewKeyResult?: (keyResultId: number) => void;
  onViewTask?: (taskId: number) => void;
}

export default function ObjectiveDetailPanel({
  objectiveId,
  open,
  onClose,
  onEditObjective,
  onViewKeyResult,
  onViewTask
}: ObjectiveDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset tab when panel opens with new objective
  useEffect(() => {
    if (open && objectiveId) {
      setActiveTab('details');
    }
  }, [open, objectiveId]);

  // Fetch objective details using bypass endpoint
  const { data: objective, isLoading, error } = useQuery<Objective>({
    queryKey: [`/api/strategy/objectives-bypass/${objectiveId}`],
    enabled: open && !!objectiveId,
  });

  // Fetch key results for this objective using bypass endpoint
  const { data: keyResults = [] } = useQuery<any[]>({
    queryKey: [`/api/strategy/key-results/by-objective/${objectiveId}`],
    enabled: open && !!objectiveId,
  });

  // Delete objective mutation
  const deleteObjectiveMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/strategy/objectives/${objectiveId}?cascade=true`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      toast({
        title: "Success",
        description: "Objective and all dependencies deleted successfully",
      });
      setDeleteDialogOpen(false);
      onClose();
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
      apiRequest(`/api/strategy/objectives/${objectiveId}/calculate`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/objectives/${objectiveId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/objectives/${objectiveId}/key-results`] });
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

  if (!open) return null;

  const canEdit = currentUser?.role === 'admin' || 
                  currentUser?.role === 'manager' || 
                  currentUser?.role === 'super_admin';

  // Calculate progress
  const calculateProgress = () => {
    if (!objective) return 0;
    
    // First check if objective has its own progress value
    if (objective.progress !== undefined && objective.progress !== null) {
      return objective.progress;
    }
    
    // Otherwise calculate from key results
    if (keyResults && keyResults.length > 0) {
      const totalProgress = keyResults.reduce((acc: number, kr: any) => {
        const current = parseFloat(kr.currentValue || '0');
        const target = parseFloat(kr.targetValue || '0');
        if (target === 0) return acc;
        return acc + Math.min((current / target) * 100, 100);
      }, 0);
      return Math.round(totalProgress / keyResults.length);
    }
    
    return 0;
  };

  const progressPercentage = calculateProgress();

  // Status based on progress
  const getStatus = () => {
    if (!objective) return 'not_started';
    if (objective.status) return objective.status;
    
    if (progressPercentage >= 100) return 'completed';
    if (progressPercentage >= 75) return 'on_track';
    if (progressPercentage >= 50) return 'at_risk';
    if (progressPercentage > 0) return 'in_progress';
    return 'not_started';
  };

  const status = getStatus();
  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    on_track: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    at_risk: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    behind: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    not_started: 'bg-muted text-muted-foreground',
  };

  const statusLabels: Record<string, string> = {
    completed: 'Completed',
    on_track: 'On Track',
    at_risk: 'At Risk',
    in_progress: 'In Progress',
    behind: 'Behind',
    not_started: 'Not Started',
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-3 w-3" />;
      case 'on_track': return <TrendingUp className="h-3 w-3" />;
      case 'at_risk': return <AlertCircle className="h-3 w-3" />;
      case 'in_progress': return <Clock className="h-3 w-3" />;
      default: return <Target className="h-3 w-3" />;
    }
  };

  return (
    <>
      <SlidePanel
        open={open}
        onClose={onClose}
        width="600px"
        title={
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <span className="font-semibold">
              {isLoading ? 'Loading...' : (error ? 'Error' : objective?.title || 'Objective')}
            </span>
          </div>
        }
        description={
          objective && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
              <div className="flex items-center gap-2">
                <Badge className={`${statusColors[status] || statusColors.not_started} h-5 px-1.5 text-[10px] sm:text-xs flex items-center gap-0.5`}>
                  {getStatusIcon(status)}
                  {statusLabels[status] || 'Unknown'}
                </Badge>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {progressPercentage}% Complete
                </span>
              </div>
              {objective?.owner && (
                <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{objective.owner.fullName}</span>
                </div>
              )}
              {canEdit && objective && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Objective
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => recalculateObjectiveMutation.mutate()}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Recalculate Progress
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Objective
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )
        }
      >
        <div className="flex flex-col h-full">
          {/* Progress Bar */}
          {objective && (
            <div className="px-4 pb-3">
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}

          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="flex flex-col h-full"
          >
            {/* Desktop tabs */}
            <TabsList className="hidden sm:grid w-full grid-cols-3 mx-4 w-auto mr-8 h-10">
              <TabsTrigger value="details" className="text-sm">
                <Target className="h-4 w-4 mr-1" />
                Details
              </TabsTrigger>
              <TabsTrigger value="keyresults" className="text-sm">
                <TrendingUp className="h-4 w-4 mr-1" />
                Key Results
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-sm">
                <Activity className="h-4 w-4 mr-1" />
                Activity
              </TabsTrigger>
            </TabsList>

            {/* Mobile dropdown */}
            <div className="sm:hidden px-4 pb-3">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="details">
                    <div className="flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Details
                    </div>
                  </SelectItem>
                  <SelectItem value="keyresults">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Key Results
                    </div>
                  </SelectItem>
                  <SelectItem value="activity">
                    <div className="flex items-center">
                      <Activity className="h-4 w-4 mr-2" />
                      Activity
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">Loading objective details...</div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <div className="text-destructive">Failed to load objective</div>
                </div>
              ) : objective ? (
                <>
                  <TabsContent value="details" className="h-full m-0 overflow-y-auto">
                    <div className="w-full max-w-full" style={{ width: '100%', maxWidth: '100%' }}>
                      <ObjectiveDetailsTab
                        objective={objective}
                        canEdit={canEdit}
                        onEdit={() => setEditDialogOpen(true)}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="keyresults" className="h-full m-0 overflow-y-auto">
                    <div className="w-full max-w-full" style={{ width: '100%', maxWidth: '100%' }}>
                      <ObjectiveKeyResultsTab
                        objectiveId={objective.id}
                        objectiveTitle={objective.title}
                        keyResults={keyResults}
                        onViewKeyResult={onViewKeyResult}
                        onViewTask={onViewTask}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="h-full m-0 overflow-y-auto">
                    <div className="w-full max-w-full" style={{ width: '100%', maxWidth: '100%' }}>
                      <ObjectiveActivityTab
                        objectiveId={objective.id}
                      />
                    </div>
                  </TabsContent>
                </>
              ) : null}
            </div>
          </Tabs>
        </div>
      </SlidePanel>

      {/* Edit Objective Dialog */}
      {objective && (
        <EditObjectiveDialog
          objective={objective}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
      
      {/* Delete Objective Dialog */}
      {objective && (
        <DeleteObjectiveDialog
          objective={objective}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={() => deleteObjectiveMutation.mutate()}
          isDeleting={deleteObjectiveMutation.isPending}
        />
      )}
    </>
  );
}