import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, ExternalLink, Calendar, User, MessageSquare, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface SplynxTicketStepProps {
  workItemId: number;
  ticketId?: string;
  taskId?: string;
  onSave: (data: any) => void;
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

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'open', label: 'Open' },
  { value: 'waiting_on_customer', label: 'Waiting on Customer' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

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

export default function SplynxTicketStep({ workItemId, ticketId, taskId, onSave }: SplynxTicketStepProps) {
  const { toast } = useToast();
  const [response, setResponse] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');

  // Fetch ticket data
  const { data: ticketData, isLoading } = useQuery<SplynxTicketData>({
    queryKey: [`/api/integrations/splynx/entity/ticket/${ticketId}`],
    enabled: !!ticketId,
  });

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: async (data: { message?: string; status?: string }) => {
      const updates: any = {};
      
      if (data.message) {
        await apiRequest(`/api/integrations/splynx/entity/ticket/${ticketId}/message`, {
          method: 'POST',
          body: { message: data.message }
        });
      }
      
      if (data.status) {
        await apiRequest(`/api/integrations/splynx/entity/ticket/${ticketId}`, {
          method: 'PATCH',
          body: { status: data.status }
        });
        updates.status = data.status;
      }
      
      return updates;
    },
    onSuccess: async (updates) => {
      // Invalidate ticket data
      queryClient.invalidateQueries({ 
        queryKey: [`/api/integrations/splynx/entity/ticket/${ticketId}`] 
      });
      
      // Update WorkItem status to match ticket status if status was changed
      if (updates.status) {
        const statusMap: Record<string, string> = {
          'new': 'Ready',
          'open': 'In Progress',
          'in_progress': 'In Progress',
          'waiting_on_customer': 'In Progress',
          'resolved': 'Completed',
          'closed': 'Completed',
        };
        
        const workItemStatus = statusMap[updates.status] || 'In Progress';
        
        await apiRequest(`/api/work-items/${workItemId}`, {
          method: 'PATCH',
          body: { status: workItemStatus }
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
        queryClient.invalidateQueries({ queryKey: [`/api/work-items/${workItemId}`] });
      }
      
      toast({
        title: 'Ticket Updated',
        description: 'Splynx ticket has been updated successfully',
      });
      
      // Call onSave to mark step complete
      onSave({
        ticketId,
        response,
        status: updates.status || ticketData?.status,
        completedAt: new Date().toISOString(),
      });
      
      // Reset form
      setResponse('');
      setNewStatus('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update ticket',
        variant: 'destructive',
      });
    }
  });

  const handleSave = () => {
    const statusToUpdate = newStatus || undefined;
    
    if (!response && !statusToUpdate) {
      toast({
        title: 'No Changes',
        description: 'Please add a response or change the status',
        variant: 'destructive',
      });
      return;
    }
    
    updateTicketMutation.mutate({
      message: response || undefined,
      status: statusToUpdate,
    });
  };

  if (!ticketId && !taskId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No Splynx ticket or task linked to this work item
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ticketData && ticketId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          Failed to load ticket data
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="splynx-ticket-step">
      {/* Ticket Header - Compact */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                🎫 Ticket #{ticketId}
                <a 
                  href={`https://your-splynx-domain.com/admin/support/tickets/view/${ticketId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="link-view-splynx"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </CardTitle>
              {ticketData && (
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {ticketData.subject}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Status & Priority - Compact Grid */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge className={STATUS_COLORS[ticketData?.status || ''] || 'bg-gray-100'} data-testid="badge-ticket-status">
                {ticketData?.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Priority</p>
              <Badge className={PRIORITY_COLORS[ticketData?.priority || ''] || 'bg-gray-100'}>
                {ticketData?.priority}
              </Badge>
            </div>
          </div>

          {/* Metadata - Compact */}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate">{ticketData?.assigned_to || 'Unassigned'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{ticketData?.created_at && format(new Date(ticketData.created_at), 'MMM d, yyyy')}</span>
            </div>
          </div>

          {/* Recent Messages - Compact */}
          {ticketData?.messages && ticketData.messages.length > 0 && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-1 mb-2">
                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs font-medium">Recent Messages ({ticketData.messages.length})</p>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {ticketData.messages.slice(0, 3).map((msg) => (
                  <div key={msg.id} className="bg-muted/50 rounded p-2 text-xs" data-testid={`message-${msg.id}`}>
                    <p className="text-muted-foreground mb-1">
                      <strong>{msg.admin_name}</strong> · {format(new Date(msg.datetime), 'MMM d, h:mm a')}
                    </p>
                    <p className="line-clamp-2">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response & Update - Compact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Update Ticket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Response Input */}
          <div className="space-y-2">
            <Label htmlFor="response" className="text-sm">Your Response</Label>
            <Textarea
              id="response"
              placeholder="Type your response to the customer..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
              className="text-sm"
              data-testid="input-ticket-response"
            />
          </div>

          {/* Status Update */}
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm">Update Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger id="status" data-testid="select-ticket-status">
                <SelectValue placeholder={`Keep current (${ticketData?.status.replace(/_/g, ' ')})`} />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} data-testid={`option-status-${option.value}`}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={updateTicketMutation.isPending}
            className="w-full"
            data-testid="button-save-ticket"
          >
            {updateTicketMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save & Continue
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
