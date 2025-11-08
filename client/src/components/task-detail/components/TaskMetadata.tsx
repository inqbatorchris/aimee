import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  TrendingUp, 
  Package, 
  Calendar,
  GitBranch,
  Zap
} from 'lucide-react';

interface Task {
  id: number;
  keyResultId?: number;
  title: string;
  taskType: 'project' | 'habit' | 'milestone';
  lifecycleStage: string;
  frequency: string;
  department?: string;
  storyPoints?: number;
  labels?: string[];
  sprintId?: number;
  kpiLabel?: string;
  kpiTargetValue?: number;
  kpiCurrentValue?: number;
  kpiUnit?: string;
}

interface TaskMetadataProps {
  task: Task;
}

export function TaskMetadata({ task }: TaskMetadataProps) {
  const getLifecycleColor = (stage: string) => {
    switch (stage) {
      case 'backlog': return 'bg-gray-100 text-gray-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFrequencyIcon = (frequency: string) => {
    switch (frequency) {
      case 'daily': return <Zap className="h-3 w-3" />;
      case 'weekly': return <Calendar className="h-3 w-3" />;
      case 'monthly': return <Calendar className="h-3 w-3" />;
      default: return <Target className="h-3 w-3" />;
    }
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-4">
        {/* Basic metadata */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Type:</span>
            <div className="flex items-center gap-1 mt-1">
              {task.taskType === 'habit' && <Zap className="h-3 w-3 text-purple-600" />}
              {task.taskType === 'milestone' && <Target className="h-3 w-3 text-orange-600" />}
              {task.taskType === 'project' && <Package className="h-3 w-3 text-blue-600" />}
              <span className="capitalize">{task.taskType}</span>
            </div>
          </div>
          
          <div>
            <span className="text-muted-foreground">Lifecycle:</span>
            <div className="mt-1">
              <Badge className={getLifecycleColor(task.lifecycleStage)}>
                {task.lifecycleStage}
              </Badge>
            </div>
          </div>

          <div>
            <span className="text-muted-foreground">Frequency:</span>
            <div className="flex items-center gap-1 mt-1">
              {getFrequencyIcon(task.frequency)}
              <span className="capitalize">{task.frequency.replace('_', ' ')}</span>
            </div>
          </div>

          {task.department && (
            <div>
              <span className="text-muted-foreground">Department:</span>
              <div className="mt-1">
                <Badge variant="outline">
                  {task.department}
                </Badge>
              </div>
            </div>
          )}

          {task.storyPoints && task.storyPoints > 0 && (
            <div>
              <span className="text-muted-foreground">Story Points:</span>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" />
                <span>{task.storyPoints}</span>
              </div>
            </div>
          )}

          {task.sprintId && (
            <div>
              <span className="text-muted-foreground">Sprint:</span>
              <div className="flex items-center gap-1 mt-1">
                <GitBranch className="h-3 w-3" />
                <span>Sprint #{task.sprintId}</span>
              </div>
            </div>
          )}
        </div>

        {/* KPI Progress */}
        {task.kpiLabel && task.kpiTargetValue && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="font-medium">{task.kpiLabel}</span>
              <span className="text-muted-foreground">
                {task.kpiCurrentValue || 0} / {task.kpiTargetValue} {task.kpiUnit || ''}
              </span>
            </div>
            <Progress 
              value={Math.min(100, ((task.kpiCurrentValue || 0) / task.kpiTargetValue) * 100)} 
              className="h-2"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {Math.round(((task.kpiCurrentValue || 0) / task.kpiTargetValue) * 100)}% complete
            </div>
          </div>
        )}

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="border-t pt-4">
            <span className="text-muted-foreground text-sm">Labels:</span>
            <div className="flex flex-wrap gap-1 mt-2">
              {task.labels.map((label, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* OKR Link */}
        {task.keyResultId && (
          <div className="border-t pt-4">
            <span className="text-muted-foreground text-sm">Linked to:</span>
            <div className="flex items-center gap-1 mt-1">
              <Target className="h-3 w-3 text-primary" />
              <span className="text-sm">Key Result #{task.keyResultId}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}