import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';

interface ChangeRequest {
  id: number;
  changeType: string;
  requestData: any;
  status: string;
  priority: string;
  splynxTicketId: number;
  splynxTicketStatus: string;
  estimatedCompletion: string;
  createdAt: string;
  targetUserName: string;
  targetTeamName: string;
}

interface PendingRequestsProps {
  requests: ChangeRequest[];
  loading: boolean;
  onRefresh: () => void;
}

export function PendingRequests({ requests, loading, onRefresh }: PendingRequestsProps) {
  const getStatusIcon = (status: string) => {
    if (!status) {
      return <Clock className="h-4 w-4 text-gray-500" />;
    }
    
    switch (status) {
      case 'submitted':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    if (!status) {
      return <Badge variant="outline">Unknown</Badge>;
    }
    
    switch (status) {
      case 'submitted':
        return <Badge variant="outline" className="text-blue-600 border-blue-200">Submitted</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="text-orange-600 border-orange-200">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-200">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-red-600 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    if (!priority) {
      return <Badge variant="outline">Normal</Badge>;
    }
    
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge variant="outline" className="text-red-600 border-red-200">High</Badge>;
      case 'normal':
        return <Badge variant="secondary">Normal</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-gray-500">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getChangeTypeLabel = (type: string) => {
    if (!type) {
      return 'Unknown Request';
    }
    
    switch (type) {
      case 'add_user':
        return 'Add New User';
      case 'clone_user':
        return 'Clone User Setup';
      case 'move_user':
        return 'Move User to Team';
      case 'deactivate_user':
        return 'Deactivate User';
      case 'modify_user':
        return 'Modify User Settings';
      default:
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return 'Unknown Date';
    }
    
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading requests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pending Change Requests</h3>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No pending requests</p>
              <p className="text-sm">All change requests have been processed.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(request.status)}
                      <h4 className="font-medium">{getChangeTypeLabel(request.changeType)}</h4>
                      {request.splynxTicketId && (
                        <Badge variant="outline" className="text-xs">
                          Ticket #{request.splynxTicketId}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3">
                      {request.targetUserName && (
                        <p>User: <span className="font-medium">{request.targetUserName}</span></p>
                      )}
                      {request.targetTeamName && (
                        <p>Team: <span className="font-medium">{request.targetTeamName}</span></p>
                      )}
                      <p>Submitted: {formatDate(request.createdAt)}</p>
                      {request.estimatedCompletion && (
                        <p>Est. completion: {formatDate(request.estimatedCompletion)}</p>
                      )}
                    </div>

                    {request.requestData && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                        <details>
                          <summary className="cursor-pointer">View request details</summary>
                          <pre className="mt-2 whitespace-pre-wrap">
                            {JSON.stringify(request.requestData, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 ml-4">
                    {getStatusBadge(request.status)}
                    {getPriorityBadge(request.priority)}
                    
                    {request.splynxTicketId && (
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Ticket
                      </Button>
                    )}
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