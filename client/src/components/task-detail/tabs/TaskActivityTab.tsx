import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Clock, 
  CheckCircle2, 
  Circle, 
  UserPlus, 
  Edit2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface TaskActivityTabProps {
  taskId: number;
}

interface ActivityLog {
  id: number;
  actionType: string;
  description: string;
  metadata?: any;
  createdAt: string;
  userId: number;
}

export function TaskActivityTab({ taskId }: TaskActivityTabProps) {
  const { data: activities = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: [`/api/strategy/key-result-tasks/${taskId}/activity`],
    enabled: !!taskId
  });

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'creation':
        return <Circle className="h-4 w-4 text-green-500" />;
      case 'status_change':
        return <ArrowRight className="h-4 w-4 text-blue-500" />;
      case 'completion':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'assignment':
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      case 'agent_action':
      case 'update':
        return <Edit2 className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'creation':
        return 'Created';
      case 'status_change':
        return 'Status';
      case 'completion':
        return 'Completed';
      case 'assignment':
        return 'Assigned';
      case 'agent_action':
      case 'update':
        return 'Updated';
      default:
        return actionType;
    }
  };

  const getActionDetails = (activity: ActivityLog) => {
    const metadata = activity.metadata || {};
    
    if (activity.actionType === 'status_change') {
      // Direct status change
      if (metadata.status) {
        return `Changed to ${metadata.status}`;
      }
      // Auto-synced from work item
      if (metadata.newTaskStatus && metadata.workItemId) {
        return `Changed to ${metadata.newTaskStatus} (from work item #${metadata.workItemId})`;
      }
    }
    
    if (activity.actionType === 'assignment') {
      if (metadata.assignedTo) return 'User assigned';
      if (metadata.teamId) return 'Team assigned';
    }
    
    if (activity.actionType === 'creation') {
      if (metadata.isRecurring) {
        return `${metadata.frequency || 'Recurring'} task`;
      }
      return 'One-time task';
    }
    
    if (activity.actionType === 'update' || activity.actionType === 'agent_action') {
      // Auto-synced target completion from work item
      if (metadata.workItemId && (metadata.oldTargetCompletion !== undefined || metadata.newTargetCompletion !== undefined)) {
        const oldDate = metadata.oldTargetCompletion ? new Date(metadata.oldTargetCompletion).toLocaleDateString() : 'None';
        const newDate = metadata.newTargetCompletion ? new Date(metadata.newTargetCompletion).toLocaleDateString() : 'None';
        return `Due date: ${oldDate} → ${newDate} (from work item #${metadata.workItemId})`;
      }
      
      const updates = metadata.updates || metadata;
      const changes = [];
      if (updates.title) changes.push('title');
      if (updates.description !== undefined) changes.push('description');
      if (updates.status) changes.push(`status → ${updates.status}`);
      if (updates.assignedTo) changes.push('assignee');
      if (updates.teamId) changes.push('team');
      if (updates.targetCompletion) changes.push('due date');
      
      if (changes.length > 0) {
        return changes.join(', ');
      }
    }
    
    return activity.description.replace(/^(Created|Updated|Completed) task: /, '');
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Date/Time</TableHead>
            <TableHead className="w-[100px]">Action</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity) => (
            <TableRow key={activity.id}>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getActionIcon(activity.actionType)}
                  <span className="text-sm font-medium">
                    {getActionLabel(activity.actionType)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {getActionDetails(activity)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}