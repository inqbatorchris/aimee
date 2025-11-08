import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity,
  Calendar,
  Clock,
  User,
  TrendingUp,
  Target,
  Edit2,
  CheckCircle2,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: number;
  type: 'created' | 'updated' | 'status_changed' | 'progress_updated' | 'comment' | 'key_result_added' | 'key_result_completed';
  description: string;
  userId: number;
  userName?: string;
  timestamp: string;
  metadata?: {
    oldValue?: string;
    newValue?: string;
    field?: string;
    keyResultName?: string;
    progress?: number;
  };
}

interface ObjectiveActivityTabProps {
  objectiveId: number;
}

export function ObjectiveActivityTab({ objectiveId }: ObjectiveActivityTabProps) {
  // Fetch activity for this objective
  const { data: activities = [], isLoading } = useQuery({
    queryKey: [`/api/strategy/objectives/${objectiveId}/activity`],
    queryFn: async () => {
      const response = await apiRequest(`/api/strategy/objectives/${objectiveId}/activity`);
      return response.json();
    },
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <Target className="h-4 w-4 text-green-600" />;
      case 'updated':
      case 'status_changed':
        return <Edit2 className="h-4 w-4 text-blue-600" />;
      case 'progress_updated':
        return <TrendingUp className="h-4 w-4 text-purple-600" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
      case 'key_result_added':
        return <Target className="h-4 w-4 text-blue-600" />;
      case 'key_result_completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'created':
      case 'key_result_completed':
        return 'text-green-600';
      case 'updated':
      case 'status_changed':
      case 'key_result_added':
        return 'text-blue-600';
      case 'progress_updated':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatActivityDescription = (activity: ActivityItem) => {
    const { type, description, metadata } = activity;
    
    switch (type) {
      case 'status_changed':
        return (
          <span>
            changed status from{' '}
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              {metadata?.oldValue}
            </Badge>{' '}
            to{' '}
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              {metadata?.newValue}
            </Badge>
          </span>
        );
      case 'progress_updated':
        return (
          <span>
            updated progress to{' '}
            <span className="font-semibold">{metadata?.progress}%</span>
          </span>
        );
      case 'key_result_added':
        return (
          <span>
            added key result:{' '}
            <span className="font-medium">{metadata?.keyResultName}</span>
          </span>
        );
      case 'key_result_completed':
        return (
          <span>
            completed key result:{' '}
            <span className="font-medium text-green-600">{metadata?.keyResultName}</span>
          </span>
        );
      default:
        return <span>{description}</span>;
    }
  };

  // Mock data for demonstration if no activities
  const mockActivities: ActivityItem[] = [
    {
      id: 1,
      type: 'created',
      description: 'created this objective',
      userId: 1,
      userName: 'John Doe',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      type: 'key_result_added',
      description: 'added a key result',
      userId: 2,
      userName: 'Jane Smith',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        keyResultName: 'Increase user engagement by 25%'
      }
    },
    {
      id: 3,
      type: 'status_changed',
      description: 'changed status',
      userId: 1,
      userName: 'John Doe',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        oldValue: 'not_started',
        newValue: 'in_progress'
      }
    },
    {
      id: 4,
      type: 'progress_updated',
      description: 'updated progress',
      userId: 3,
      userName: 'Mike Johnson',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        progress: 35
      }
    },
    {
      id: 5,
      type: 'comment',
      description: 'Great progress on this objective! Keep up the good work.',
      userId: 2,
      userName: 'Jane Smith',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    }
  ];

  const displayActivities = activities.length > 0 ? activities : mockActivities;

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-sm text-gray-500">Loading activity...</p>
      </div>
    );
  }

  return (
    <div className="p-4 w-full max-w-full overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1">
        <Activity className="h-4 w-4" />
        Recent Activity
      </h3>

      {displayActivities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">No activity recorded yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Activities will appear here as changes are made
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayActivities.map((activity) => (
            <Card key={activity.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium text-gray-900">
                            {activity.userName || 'System'}
                          </span>{' '}
                          <span className={getActivityColor(activity.type)}>
                            {formatActivityDescription(activity)}
                          </span>
                        </p>
                        {activity.type === 'comment' && (
                          <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                            "{activity.description}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}