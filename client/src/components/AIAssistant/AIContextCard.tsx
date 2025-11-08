import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronDown,
  ChevronUp,
  Target,
  Clock,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AIContextData {
  activeObjectives: Array<{
    id: number;
    title: string;
    progress: number;
    status: string;
    dueDate?: string;
    category?: string;
  }>;
  upcomingTasks: Array<{
    id: number;
    title: string;
    dueDate: string;
    status: string;
    priority?: string;
  }>;
  overdueTasks: Array<{
    id: number;
    title: string;
    dueDate: string;
    status: string;
    priority?: string;
  }>;
  recentActivity: Array<{
    type: string;
    title: string;
    timestamp: string;
    userId: number;
  }>;
  alerts: Array<{
    type: string;
    message: string;
    severity: string;
    count: number;
  }>;
  summary: {
    totalObjectives: number;
    activeObjectives: number;
    totalWorkItems: number;
    upcomingCount: number;
    overdueCount: number;
  };
}

interface AIContextCardProps {
  onQuickAction: (prompt: string) => void;
}

export function AIContextCard({ onQuickAction }: AIContextCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const { data: context, isLoading } = useQuery<AIContextData>({
    queryKey: ['/api/ai-chat/context'],
  });

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Loading your context...
            </CardTitle>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (!context) return null;

  const hasData = context.activeObjectives.length > 0 || 
                  context.upcomingTasks.length > 0 || 
                  context.overdueTasks.length > 0 ||
                  context.alerts.length > 0;

  if (!hasData) return null;

  return (
    <Card className="mb-4 border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20">
      <CardHeader className="pl-[10px] pr-[10px] pt-[5px] pb-[5px] text-[12px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-sm">Current Focus</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="button-toggle-context"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription className="text-left mt-[0px] mb-[0px] text-[12px]">
          Your current work snapshot
        </CardDescription>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4 pl-[10px] pr-[10px] pt-[10px] pb-[10px] text-[12px]">
          {/* Alerts */}
          {context.alerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Alerts
              </h4>
              <div className="space-y-1">
                {context.alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 text-xs p-2 rounded ${
                      alert.severity === 'warning'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-100'
                        : 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100'
                    }`}
                    data-testid={`alert-${alert.type}`}
                  >
                    {alert.severity === 'warning' ? (
                      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    )}
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Objectives */}
          {context.activeObjectives.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold flex items-center gap-1">
                <Target className="h-3 w-3" />
                Active Objectives ({context.activeObjectives.length})
              </h4>
              <div className="space-y-2">
                {context.activeObjectives.map((objective) => (
                  <div
                    key={objective.id}
                    className="p-2 rounded bg-white/60 dark:bg-black/20 space-y-1"
                    data-testid={`objective-${objective.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium line-clamp-2">
                        {objective.title}
                      </p>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {objective.progress}%
                      </Badge>
                    </div>
                    <Progress value={objective.progress} className="h-1" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Tasks */}
          {context.overdueTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <Clock className="h-3 w-3" />
                Overdue Tasks ({context.overdueTasks.length})
              </h4>
              <ScrollArea className="max-h-24">
                <div className="space-y-1">
                  {context.overdueTasks.map((task) => (
                    <div
                      key={task.id}
                      className="text-xs p-2 rounded bg-amber-100/60 dark:bg-amber-950/20 flex items-center justify-between gap-2"
                      data-testid={`overdue-task-${task.id}`}
                    >
                      <span className="line-clamp-1">{task.title}</span>
                      <span className="text-muted-foreground flex-shrink-0 text-[12px]">
                        {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Upcoming Tasks */}
          {context.upcomingTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Upcoming ({context.upcomingTasks.length})
              </h4>
              <ScrollArea className="max-h-24">
                <div className="space-y-1">
                  {context.upcomingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="text-xs p-2 rounded bg-white/60 dark:bg-black/20 flex items-center justify-between gap-2"
                      data-testid={`upcoming-task-${task.id}`}
                    >
                      <span className="line-clamp-1">{task.title}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-xs font-semibold">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => onQuickAction('Review my active objectives')}
                data-testid="button-review-objectives"
              >
                <Target className="h-3 w-3 mr-1" />
                Review OKRs
              </Button>
              {context.overdueTasks.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => onQuickAction('Show my overdue tasks')}
                  data-testid="button-show-overdue"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Overdue Tasks
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => onQuickAction('What should I focus on today?')}
                data-testid="button-focus-today"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Today's Focus
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => onQuickAction('Help me plan this week')}
                data-testid="button-plan-week"
              >
                <Clock className="h-3 w-3 mr-1" />
                Plan Week
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
