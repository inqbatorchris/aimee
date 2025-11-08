import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp,
  TrendingDown,
  Award,
  Calendar,
  Target,
  Activity,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface TaskProgressTabProps {
  task: {
    id: number;
    isRecurring: boolean;
    frequency?: string;
    completedCount: number;
    missedCount: number;
    currentStreak: number;
    longestStreak: number;
    lastCompletedDate?: string;
    totalOccurrences?: number;
    endDate?: string;
    createdAt: string;
    activityLog?: any[];
  };
}

export function TaskProgressTab({ task }: TaskProgressTabProps) {
  // Calculate metrics
  const totalAttempts = task.completedCount + task.missedCount;
  const completionRate = totalAttempts > 0 
    ? Math.round((task.completedCount / totalAttempts) * 100) 
    : 0;
  
  // Progress towards total occurrences (if bounded)
  const progressPercentage = task.totalOccurrences 
    ? Math.round((task.completedCount / task.totalOccurrences) * 100)
    : completionRate;

  // Recent activity from activity log
  const recentActivity = task.activityLog?.slice(-10).reverse() || [];

  return (
    <div className="p-4 space-y-6">
      {/* Overall Progress */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">Overall Progress</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Completion Rate</span>
              <span className="font-medium">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>
          
          {task.totalOccurrences && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progress to Goal</span>
                <span className="font-medium">{task.completedCount} / {task.totalOccurrences}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}
        </div>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{task.completedCount}</p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Missed</p>
              <p className="text-2xl font-bold">{task.missedCount}</p>
            </div>
            <XCircle className="h-4 w-4 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Streaks */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">Streaks</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Current Streak</span>
            </div>
            <p className="text-xl font-bold">{task.currentStreak} days</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-600" />
              <span className="text-xs text-muted-foreground">Best Streak</span>
            </div>
            <p className="text-xl font-bold">{task.longestStreak} days</p>
          </div>
        </div>
        
        {task.currentStreak > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              {task.currentStreak >= task.longestStreak ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">
                    Personal Best!
                  </span>
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground">
                    {task.longestStreak - task.currentStreak} days to beat your record
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Last Completed */}
      {task.lastCompletedDate && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Last Completed</span>
            </div>
            <span className="text-sm font-medium">
              {format(new Date(task.lastCompletedDate), 'PPP')}
            </span>
          </div>
        </Card>
      )}

      {/* Activity History */}
      {recentActivity.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {recentActivity.map((activity: any, index: number) => (
              <div key={index} className="flex items-center justify-between py-1.5 text-xs">
                <div className="flex items-center gap-2">
                  {activity.completed ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span className={activity.completed ? 'text-green-700' : 'text-red-700'}>
                    {activity.completed ? 'Completed' : 'Missed'}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {format(new Date(activity.date), 'MMM d, yyyy')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Frequency Info */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Frequency</span>
          </div>
          <Badge variant="outline">
            {task.frequency || 'One-time'}
          </Badge>
        </div>
        
        {task.endDate && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">End Date</span>
              <span className="text-sm font-medium">
                {format(new Date(task.endDate), 'PPP')}
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}