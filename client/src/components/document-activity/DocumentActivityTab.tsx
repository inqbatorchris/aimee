import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  User, 
  Edit3, 
  Eye, 
  FileText, 
  Archive, 
  Globe, 
  Link2, 
  Unlink, 
  GitBranch,
  Circle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useDocumentActivity } from '@/hooks/useDocumentActivity';

interface DocumentActivityTabProps {
  documentId: number;
}

interface ActivityItem {
  id: number;
  action: string;
  userId: number;
  userName: string;
  details: any;
  createdAt: string;
}

export function DocumentActivityTab({ documentId }: DocumentActivityTabProps) {
  const { data: activities = [], isLoading } = useDocumentActivity(documentId);
  
  // Type assertion for activities data
  const typedActivities = activities as ActivityItem[];

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Circle className="h-4 w-4 text-green-500" />;
      case 'edited':
        return <Edit3 className="h-4 w-4 text-blue-500" />;
      case 'viewed':
        return <Eye className="h-4 w-4 text-gray-400" />;
      case 'published':
        return <Globe className="h-4 w-4 text-green-600" />;
      case 'archived':
        return <Archive className="h-4 w-4 text-orange-500" />;
      case 'attached':
        return <Link2 className="h-4 w-4 text-purple-500" />;
      case 'detached':
        return <Unlink className="h-4 w-4 text-red-500" />;
      case 'version_created':
        return <GitBranch className="h-4 w-4 text-indigo-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getActivityLabel = (action: string) => {
    switch (action) {
      case 'created':
        return 'Created';
      case 'edited':
        return 'Edited';
      case 'viewed':
        return 'Viewed';
      case 'published':
        return 'Published';
      case 'archived':
        return 'Archived';
      case 'attached':
        return 'Attached to Strategy';
      case 'detached':
        return 'Detached from Strategy';
      case 'version_created':
        return 'Version Created';
      default:
        return action.charAt(0).toUpperCase() + action.slice(1);
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'edited':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'viewed':
        return 'bg-gray-50 text-gray-600 border-gray-200';
      case 'published':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'archived':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'attached':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'detached':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'version_created':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getUserInitials = (userName: string) => {
    return userName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="activity-loading">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 p-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (typedActivities.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Activity Yet</h3>
          <p className="text-sm text-muted-foreground">
            Activity for this document will appear here as users interact with it.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1" data-testid="document-activity">
      {typedActivities.map((activity: ActivityItem) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
        >
          {/* Activity Icon */}
          <div className="flex-shrink-0 mt-1">
            {getActivityIcon(activity.action)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs font-medium">
                  {getUserInitials(activity.userName)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">{activity.userName}</span>
              <Badge 
                variant="outline" 
                className={`text-xs px-2 py-0 ${getActivityColor(activity.action)}`}
              >
                {getActivityLabel(activity.action)}
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground">
              {activity.details?.changeDescription && (
                <div className="mb-1">
                  <span className="font-medium">Change: </span>
                  {activity.details.changeDescription}
                </div>
              )}
              
              {activity.details?.attachmentType && (
                <div className="mb-1">
                  <span className="font-medium">Attached to: </span>
                  {activity.details.attachmentType === 'objective' && 'Objective'}
                  {activity.details.attachmentType === 'keyResult' && 'Key Result'}
                  {activity.details.attachmentType === 'task' && 'Task'}
                  {activity.details.attachmentName && ` "${activity.details.attachmentName}"`}
                </div>
              )}
            </div>
          </div>

          {/* Timestamp */}
          <div className="flex-shrink-0 text-xs text-muted-foreground">
            <div title={format(new Date(activity.createdAt), 'PPp')}>
              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}