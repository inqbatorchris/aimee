import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Clock, CheckCircle, XCircle, User, Phone, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ChangeRequest {
  id: number;
  title: string;
  description: string;
  requestType: string;
  status: string;
  priority: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface ChangeRequestsTabProps {
  clientId: number;
}

export function ChangeRequestsTab({ clientId }: ChangeRequestsTabProps) {
  const [expandedRequest, setExpandedRequest] = useState<number | null>(null);
  const [updateNotes, setUpdateNotes] = useState<{ [key: number]: string }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: changeRequests = [], isLoading } = useQuery({
    queryKey: [`/api/managed-services/clients/${clientId}/change-requests`],
    enabled: !!clientId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status, notes }: { requestId: number; status: string; notes?: string }) => {
      return apiRequest('PATCH', `/api/managed-services/change-requests/${requestId}`, { status, notes });
    },
    onSuccess: () => {
      toast({ title: 'Change request updated successfully' });
      queryClient.invalidateQueries({ queryKey: [`/api/managed-services/clients/${clientId}/change-requests`] });
      setUpdateNotes({});
    },
    onError: () => {
      toast({ 
        title: 'Update failed', 
        description: 'Failed to update change request status',
        variant: 'destructive'
      });
    }
  });

  const handleStatusUpdate = (requestId: number, status: string) => {
    const notes = updateNotes[requestId] || '';
    updateStatusMutation.mutate({ requestId, status, notes });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'new_user': return <User className="h-4 w-4" />;
      case 'hunt_group_update': return <Phone className="h-4 w-4" />;
      case 'device_issue': return <Settings className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatRequestType = (type: string) => {
    switch (type) {
      case 'new_user': return 'New User';
      case 'hunt_group_update': return 'Hunt Group Update';
      case 'device_issue': return 'Device Issue';
      case 'number_change': return 'Number Change';
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading change requests...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Change Requests</h3>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {changeRequests.filter((r: ChangeRequest) => r.status === 'pending').length} Pending
          </Badge>
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            {changeRequests.filter((r: ChangeRequest) => r.status === 'completed').length} Completed
          </Badge>
        </div>
      </div>

      {changeRequests.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No change requests found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {changeRequests.map((request: ChangeRequest) => (
            <Card key={request.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getRequestTypeIcon(request.requestType)}
                    <div>
                      <CardTitle className="text-base">{request.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={getStatusColor(request.status)}>
                          {request.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(request.priority)}>
                          {request.priority.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatRequestType(request.requestType)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedRequest(
                      expandedRequest === request.id ? null : request.id
                    )}
                  >
                    {expandedRequest === request.id ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
              </CardHeader>

              {expandedRequest === request.id && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">
                        {request.description || 'No description provided'}
                      </p>
                    </div>

                    {request.notes && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Current Notes</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {request.notes}
                        </p>
                      </div>
                    )}

                    {request.status !== 'completed' && request.status !== 'cancelled' && (
                      <div className="space-y-3 pt-3 border-t">
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Add Update Notes
                          </label>
                          <Textarea
                            value={updateNotes[request.id] || ''}
                            onChange={(e) => setUpdateNotes(prev => ({
                              ...prev,
                              [request.id]: e.target.value
                            }))}
                            placeholder="Add notes about this update..."
                            rows={3}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(request.id, 'in_progress')}
                            disabled={updateStatusMutation.isPending}
                            variant="outline"
                          >
                            Start Working
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(request.id, 'completed')}
                            disabled={updateStatusMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Mark Complete
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(request.id, 'cancelled')}
                            disabled={updateStatusMutation.isPending}
                            variant="destructive"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Created: {new Date(request.createdAt).toLocaleString()}
                      {request.updatedAt !== request.createdAt && (
                        <span className="ml-4">
                          Updated: {new Date(request.updatedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}