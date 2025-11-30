import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  Filter,
  Clock,
  CheckCircle2,
  Edit,
  TrendingUp,
  User,
  Target,
  Calendar,
  ChevronRight,
  Plus,
  Bot,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: number;
  entityType: 'key_result' | 'task' | 'progress_update';
  entityId: number;
  userId: number;
  action: string;
  metadata?: any;
  notes?: string;
  createdAt: string;
  user?: {
    id: number;
    fullName: string;
    email: string;
  };
  task?: {
    id: number;
    title: string;
  };
}

interface KeyResultActivityTabProps {
  keyResultId: number;
}

export function KeyResultActivityTab({ keyResultId }: KeyResultActivityTabProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('recent');

  // Fetch activity logs for this key result
  const { data: activities = [], isLoading } = useQuery({
    queryKey: [`/api/strategy/key-results/${keyResultId}/activities`],
    queryFn: async () => {
      const response = await apiRequest(`/api/strategy/key-results/${keyResultId}/activities`);
      return response.json();
    },
    refetchOnMount: true,  // Always refetch when tab opens to get latest activities
    staleTime: 0  // Consider data immediately stale so it refetches
  });

  // Filter and sort activities
  const filteredActivities = activities
    .filter((activity: ActivityLog) => {
      if (filterType === 'all') return true;
      return activity.entityType === filterType;
    })
    .sort((a: ActivityLog, b: ActivityLog) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });

  const getActivityIcon = (activity: ActivityLog) => {
    switch (activity.action) {
      case 'created':
      case 'task_created':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'updated':
      case 'edited':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'completed':
      case 'task_completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'progress_updated':
        return <TrendingUp className="h-4 w-4 text-purple-600" />;
      case 'status_changed':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'assigned':
        return <User className="h-4 w-4 text-blue-600" />;
      case 'agent_action':
        return <Bot className="h-4 w-4 text-indigo-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityTitle = (activity: ActivityLog) => {
    const userName = activity.user?.fullName || 'System';
    
    switch (activity.action) {
      case 'created':
        return `${userName} created this key result`;
      case 'updated':
        return `${userName} updated the key result details`;
      case 'progress_updated':
        const oldVal = activity.metadata?.oldValue || 0;
        const newVal = activity.metadata?.newValue || 0;
        return `${userName} updated progress from ${oldVal} to ${newVal}`;
      case 'task_created':
        return `${userName} created task "${activity.task?.title || 'Untitled'}"`;
      case 'task_completed':
        return `${userName} completed task "${activity.task?.title || 'Untitled'}"`;
      case 'status_changed':
        return `${userName} changed status from ${activity.metadata?.oldStatus || 'unknown'} to ${activity.metadata?.newStatus || 'unknown'}`;
      case 'assigned':
        return `${userName} assigned ${activity.metadata?.assigneeName || 'someone'} to "${activity.task?.title || 'this task'}"`;
      case 'agent_action':
        const agentOldValue = activity.metadata?.oldValue || '0';
        const agentNewValue = activity.metadata?.newValue || '0';
        const updateType = activity.metadata?.updateType || 'set';
        if (updateType === 'increment') {
          return `${userName} incremented value to ${agentNewValue}`;
        }
        return `${userName} updated value from ${agentOldValue} to ${agentNewValue}`;
      default:
        return `${userName} performed ${activity.action}`;
    }
  };

  const getActivityColor = (activity: ActivityLog) => {
    switch (activity.entityType) {
      case 'key_result':
        return 'bg-purple-100 text-purple-800';
      case 'task':
        return 'bg-blue-100 text-blue-800';
      case 'progress_update':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((groups: any, activity: ActivityLog) => {
    const date = format(new Date(activity.createdAt), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {});

  const dateGroups = Object.keys(groupedActivities).sort((a, b) => 
    sortOrder === 'recent' ? b.localeCompare(a) : a.localeCompare(b)
  );

  return (
    <div className="p-2 space-y-2 w-full max-w-full overflow-hidden">
      {/* Header with filters */}
      <div className="p-2 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Activity Timeline</h3>
          <Badge variant="secondary" className="text-xs">
            {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[160px] h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="key_result">Key Result Updates</SelectItem>
              <SelectItem value="task">Task Activities</SelectItem>
              <SelectItem value="progress_update">Progress Updates</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full sm:w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Activity List */}
      <div className="flex-1 overflow-y-auto px-1 py-2">
        {isLoading ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Loading activity history...
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted mb-3">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {filterType !== 'all' 
                ? 'No activities found for the selected filter.' 
                : 'No activity recorded yet.'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Agent updates and manual changes will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {dateGroups.map((date) => (
              <div key={date}>
                <div className="sticky top-0 bg-background z-10 pb-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
                <div className="space-y-2">
                  {groupedActivities[date].map((activity: ActivityLog) => (
                    <Card key={activity.id} className="rounded-md border bg-card text-card-foreground shadow-sm p-2">
                      <div className="flex gap-2">
                        <div className="flex-shrink-0">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                            {getActivityIcon(activity)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-xs leading-tight">
                              {getActivityTitle(activity)}
                            </p>
                            <Badge className={`${getActivityColor(activity)} text-[10px] px-1.5 py-0 shrink-0`}>
                              {activity.entityType.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          {activity.notes && (
                            <p className="text-xs text-muted-foreground">
                              {activity.notes}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                            </span>
                            {activity.user && (
                              <span className="flex items-center gap-1">
                                <Avatar className="h-3.5 w-3.5">
                                  <AvatarFallback className="text-[8px]">
                                    {activity.user.fullName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                {activity.user.fullName}
                              </span>
                            )}
                          </div>

                          {/* Show workflow info for agent actions */}
                          {activity.action === 'agent_action' && activity.metadata?.workflowName && (
                            <div className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400">
                              <Bot className="h-3 w-3" />
                              <span>via {activity.metadata.workflowName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}