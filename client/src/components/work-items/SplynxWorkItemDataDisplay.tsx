import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, Calendar, User, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface SplynxWorkItemDataDisplayProps {
  workItemId: number;
}

interface SplynxTicketData {
  id: number;
  subject: string;
  status: string;
  priority: string;
  customer_id: number;
  assigned_to: string;
  created_at: string;
  updated_at: string;
  description?: string;
  messages?: Array<{
    id: number;
    message: string;
    admin_name: string;
    datetime: string;
  }>;
}

interface SplynxTaskData {
  id: number;
  title: string;
  status: string;
  priority: string;
  assigned_to: string;
  created_date: string;
  due_date?: string;
  description?: string;
}

const STATUS_COLORS: Record<string, string> = {
  'new': 'bg-blue-100 text-blue-700',
  'open': 'bg-yellow-100 text-yellow-700',
  'waiting_on_customer': 'bg-orange-100 text-orange-700',
  'in_progress': 'bg-purple-100 text-purple-700',
  'resolved': 'bg-green-100 text-green-700',
  'closed': 'bg-gray-100 text-gray-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  'low': 'bg-gray-100 text-gray-700',
  'normal': 'bg-blue-100 text-blue-700',
  'high': 'bg-orange-100 text-orange-700',
  'critical': 'bg-red-100 text-red-700',
};

export function SplynxWorkItemDataDisplay({ workItemId }: SplynxWorkItemDataDisplayProps) {
  // Fetch work item to get metadata
  const { data: workItem } = useQuery<any>({
    queryKey: [`/api/work-items/${workItemId}`],
  });

  const splynxTicketId = workItem?.workflowMetadata?.splynx_ticket_id;
  const splynxTaskId = workItem?.workflowMetadata?.splynx_task_id;

  // Fetch Splynx ticket data if ticket ID exists
  const { data: ticketData, isLoading: ticketLoading } = useQuery<SplynxTicketData>({
    queryKey: [`/api/integrations/splynx/entity/ticket/${splynxTicketId}`],
    enabled: !!splynxTicketId,
  });

  // Fetch Splynx task data if task ID exists
  const { data: taskData, isLoading: taskLoading } = useQuery<SplynxTaskData>({
    queryKey: [`/api/integrations/splynx/entity/task/${splynxTaskId}`],
    enabled: !!splynxTaskId,
  });

  // Don't render anything if no Splynx linkage
  if (!splynxTicketId && !splynxTaskId) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Linked Splynx Data</h3>
        <Badge variant="outline" className="text-xs">Live Data</Badge>
      </div>

      {/* Ticket Data */}
      {splynxTicketId && (
        <Card data-testid="splynx-ticket-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Support Ticket #{splynxTicketId}</CardTitle>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {ticketLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : ticketData ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{ticketData.subject}</h4>
                  {ticketData.description && (
                    <p className="text-sm text-muted-foreground">{ticketData.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge className={STATUS_COLORS[ticketData.status] || 'bg-gray-100'}>
                      {ticketData.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Priority</p>
                    <Badge className={PRIORITY_COLORS[ticketData.priority] || 'bg-gray-100'}>
                      {ticketData.priority}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Assigned to:</span>
                    <span className="font-medium">{ticketData.assigned_to || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span>{format(new Date(ticketData.created_at), 'PPp')}</span>
                  </div>
                </div>

                {ticketData.messages && ticketData.messages.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h5 className="text-sm font-medium mb-2">Recent Messages ({ticketData.messages.length})</h5>
                    <div className="space-y-2">
                      {ticketData.messages.slice(-3).map((msg) => (
                        <div key={msg.id} className="text-sm bg-muted p-2 rounded">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{msg.admin_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(msg.datetime), 'PPp')}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Unable to load ticket data</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Task Data */}
      {splynxTaskId && (
        <Card data-testid="splynx-task-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Task #{splynxTaskId}</CardTitle>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {taskLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : taskData ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{taskData.title}</h4>
                  {taskData.description && (
                    <p className="text-sm text-muted-foreground">{taskData.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge className={STATUS_COLORS[taskData.status] || 'bg-gray-100'}>
                      {taskData.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Priority</p>
                    <Badge className={PRIORITY_COLORS[taskData.priority] || 'bg-gray-100'}>
                      {taskData.priority}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Assigned to:</span>
                    <span className="font-medium">{taskData.assigned_to || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span>{format(new Date(taskData.created_date), 'PPp')}</span>
                  </div>
                  {taskData.due_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Due:</span>
                      <span>{format(new Date(taskData.due_date), 'PPp')}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Unable to load task data</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
