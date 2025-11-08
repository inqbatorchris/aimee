import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface SprintAnalyticsTabProps {
  sprintId: number;
  isCreating: boolean;
}

export function SprintAnalyticsTab({ sprintId, isCreating }: SprintAnalyticsTabProps) {
  // Fetch sprint items for analytics
  const { data: sprintItems = [], isLoading } = useQuery({
    queryKey: [`/api/strategy/tickets`, { sprintId }],
    enabled: !isCreating && sprintId > 0,
    queryFn: async () => {
      const response = await apiRequest(`/api/strategy/tickets?sprintId=${sprintId}`);
      return response.json();
    }
  });

  if (isCreating) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-sm">Save the sprint first to view analytics</p>
      </div>
    );
  }

  // Calculate analytics
  const totalItems = sprintItems.length;
  const completedItems = sprintItems.filter((item: any) => item.status === 'done').length;
  const inProgressItems = sprintItems.filter((item: any) => item.status === 'in_progress').length;
  const reviewItems = sprintItems.filter((item: any) => item.status === 'review').length;
  const todoItems = sprintItems.filter((item: any) => item.status === 'todo').length;
  
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const totalStoryPoints = sprintItems.reduce((sum: number, item: any) => sum + (item.storyPoints || 0), 0);
  const completedStoryPoints = sprintItems
    .filter((item: any) => item.status === 'done')
    .reduce((sum: number, item: any) => sum + (item.storyPoints || 0), 0);

  // Group by priority
  const priorityBreakdown = {
    urgent: sprintItems.filter((item: any) => item.priority === 'urgent').length,
    high: sprintItems.filter((item: any) => item.priority === 'high').length,
    medium: sprintItems.filter((item: any) => item.priority === 'medium').length,
    low: sprintItems.filter((item: any) => item.priority === 'low').length,
  };

  // Group by type
  const typeBreakdown = sprintItems.reduce((acc: any, item: any) => {
    const type = item.type || 'task';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-3 sm:p-4 space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
                <p className="text-lg font-bold">{completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Story Points</p>
                <p className="text-lg font-bold">{completedStoryPoints}/{totalStoryPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Status Distribution</CardTitle>
          <CardDescription className="text-xs">
            Current status of all sprint items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full" />
                To Do
              </span>
              <span className="font-medium">{todoItems}</span>
            </div>
            <Progress value={totalItems > 0 ? (todoItems / totalItems) * 100 : 0} className="h-1.5" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                In Progress
              </span>
              <span className="font-medium">{inProgressItems}</span>
            </div>
            <Progress value={totalItems > 0 ? (inProgressItems / totalItems) * 100 : 0} className="h-1.5" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                Review
              </span>
              <span className="font-medium">{reviewItems}</span>
            </div>
            <Progress value={totalItems > 0 ? (reviewItems / totalItems) * 100 : 0} className="h-1.5" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Done
              </span>
              <span className="font-medium">{completedItems}</span>
            </div>
            <Progress value={completionRate} className="h-1.5" />
          </div>
        </CardContent>
      </Card>

      {/* Priority Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Priority Distribution</CardTitle>
          <CardDescription className="text-xs">
            Items grouped by priority level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(priorityBreakdown).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between p-2 rounded bg-muted/50">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    priority === 'urgent' ? 'text-red-600' :
                    priority === 'high' ? 'text-orange-600' :
                    priority === 'medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}
                >
                  {priority}
                </Badge>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Type Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Item Types</CardTitle>
          <CardDescription className="text-xs">
            Distribution by item type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(typeBreakdown).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-xs capitalize">{type}</span>
                <Badge variant="secondary" className="text-xs">
                  {count as number}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">Loading analytics...</p>
        </div>
      )}
    </div>
  );
}