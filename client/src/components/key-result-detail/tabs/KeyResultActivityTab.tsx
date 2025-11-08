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
        const oldValue = activity.metadata?.oldValue || 0;
        const newValue = activity.metadata?.newValue || 0;
        return `${userName} updated progress from ${oldValue} to ${newValue}`;
      case 'task_created':
        return `${userName} created task "${activity.task?.title || 'Untitled'}"`;
      case 'task_completed':
        return `${userName} completed task "${activity.task?.title || 'Untitled'}"`;
      case 'status_changed':
        return `${userName} changed status from ${activity.metadata?.oldStatus || 'unknown'} to ${activity.metadata?.newStatus || 'unknown'}`;
      case 'assigned':
        return `${userName} assigned ${activity.metadata?.assigneeName || 'someone'} to "${activity.task?.title || 'this task'}"`;
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
    <div className="p-4 space-y-4 w-full max-w-full overflow-hidden">
      {/* Header with filters */}
      <div className="p-4 sm:p-6 border-b space-y-4 pt-[4px] pb-[4px] pl-[4px] pr-[4px]">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-[14px]">Activity Timeline</h3>
          <Badge variant="secondary" className="text-xs">
            {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[160px] h-9">
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
            <SelectTrigger className="w-full sm:w-[140px] h-9">
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pl-[10px] pr-[10px] pt-[4px] pb-[4px] mt-[0px] mb-[0px]">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading activity history...
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {filterType !== 'all' 
                ? 'No activities found for the selected filter.' 
                : 'No activity recorded yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {dateGroups.map((date) => (
              <div key={date}>
                <div className="sticky top-0 bg-background z-10 pt-[0px] pb-[0px] text-[12px]">
                  <p className="text-xs font-medium text-muted-foreground">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
                <div className="space-y-3">
                  {groupedActivities[date].map((activity: ActivityLog) => (
                    <Card key={activity.id} className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 pl-[4px] pr-[4px] pt-[4px] pb-[4px]">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            {getActivityIcon(activity)}
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium mt-[0px] mb-[0px] text-[12px]">
                                {getActivityTitle(activity)}
                              </p>
                              {activity.notes && (
                                <p className="text-xs text-muted-foreground mt-[0px] mb-[0px]">
                                  {activity.notes}
                                </p>
                              )}
                            </div>
                            <Badge className={`${getActivityColor(activity)} text-xs px-2 py-0`}>
                              {activity.entityType.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            {activity.user && (
                              <div className="flex items-center gap-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarFallback className="text-xs">
                                    {activity.user.fullName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{activity.user.fullName}</span>
                              </div>
                            )}
                          </div>

                          {/* Additional metadata */}
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <div className="mt-2 p-2 bg-muted rounded-md">
                              <pre className="text-xs overflow-x-auto">
                                {JSON.stringify(activity.metadata, null, 2)}
                              </pre>
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