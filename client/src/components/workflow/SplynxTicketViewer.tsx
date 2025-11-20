import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Ticket, MessageSquare, Clock, User, AlertCircle, Loader2, Send, ExternalLink, CheckCircle } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

type ViewMode = 'overview' | 'respond' | 'status' | 'resolution' | 'unified';

interface SplynxTicketViewerProps {
  workItemId: number;
  ticketId: string;
  organizationId?: number;
  mode?: ViewMode;
  onMessageSent?: () => void;
  onStatusChanged?: () => void;
  onModeCompleted?: () => void;
}

export function SplynxTicketViewer({
  workItemId,
  ticketId,
  organizationId,
  mode = 'overview',
  onMessageSent,
  onStatusChanged,
  onModeCompleted
}: SplynxTicketViewerProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [localActionCompleted, setLocalActionCompleted] = useState(false);

  const { data: integrations, isLoading: isLoadingIntegrations } = useQuery<any[]>({
    queryKey: ['/api/integrations'],
    enabled: !!organizationId,
  });

  const splynxIntegration = integrations?.find((int: any) => int.platformType === 'splynx');
  const integrationId = splynxIntegration?.id;

  const { data: ticketData, isLoading, error, refetch } = useQuery<any>({
    queryKey: [`/api/integrations/splynx/entity/ticket/${ticketId}`, integrationId],
    enabled: !!integrationId,
    refetchInterval: 30000,
    queryFn: async () => {
      if (!integrationId) throw new Error('No Splynx integration found');
      const response = await apiRequest(
        `/api/integrations/splynx/entity/ticket/${ticketId}?integrationId=${integrationId}`,
        { method: 'GET' }
      );
      return await response.json(); // Parse JSON from Response object
    },
  });

  // Derive completion state from actual ticket data
  const isModeCompleted = useMemo(() => {
    if (!ticketData?.entityData) return false;
    
    // Overview and resolution modes don't require action
    if (mode === 'overview' || mode === 'resolution') return true;
    
    // Unified mode: Always allow completion (user decides when done)
    if (mode === 'unified') return true;
    
    // Respond mode: Check if there are any non-customer messages
    if (mode === 'respond') {
      const hasAgentMessages = ticketData.messages?.some((msg: any) => msg.type !== 'customer');
      return localActionCompleted || hasAgentMessages;
    }
    
    // Status mode: Require explicit status change in this session
    if (mode === 'status') {
      return localActionCompleted;
    }
    
    return false;
  }, [ticketData, mode, localActionCompleted]);

  // Reset local action state when ticket changes
  useEffect(() => {
    setLocalActionCompleted(false);
  }, [ticketId]);

  // Notify parent when completion state changes
  useEffect(() => {
    if (isModeCompleted) {
      onModeCompleted?.();
    }
  }, [isModeCompleted, onModeCompleted]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, isInternal }: { message: string; isInternal: boolean }) => {
      if (!integrationId) throw new Error('No Splynx integration found');
      return await apiRequest(`/api/integrations/splynx/entity/ticket/${ticketId}/message`, {
        method: 'POST',
        body: {
          integrationId,
          message,
          isInternal
        }
      });
    },
    onSuccess: () => {
      setMessage('');
      refetch();
      onMessageSent?.();
      if (mode === 'respond') {
        setLocalActionCompleted(true);
      }
      toast({
        title: 'Message sent',
        description: 'Your message has been posted to the ticket.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error sending message',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ statusId }: { statusId: string }) => {
      if (!integrationId) throw new Error('No Splynx integration found');
      return await apiRequest(`/api/integrations/splynx/entity/ticket/${ticketId}/status`, {
        method: 'PATCH',
        body: {
          integrationId,
          statusId: parseInt(statusId)
        }
      });
    },
    onSuccess: () => {
      refetch();
      onStatusChanged?.();
      if (mode === 'status') {
        setLocalActionCompleted(true);
      }
      toast({
        title: 'Status updated',
        description: 'Ticket status has been changed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating status',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    },
  });

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate({ message: message.trim(), isInternal });
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;
    updateStatusMutation.mutate({ statusId: selectedStatus });
  };

  if (isLoadingIntegrations || isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading ticket data...</span>
        </CardContent>
      </Card>
    );
  }

  if (!integrationId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>No Splynx integration found for this organization</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load ticket data: {error instanceof Error ? error.message : 'Unknown error'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ticket = ticketData?.entityData;
  const messages = ticketData?.messages || [];

  const priorityColors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const statusOptions = [
    { value: '1', label: 'New' },
    { value: '2', label: 'Work in Progress' },
    { value: '3', label: 'Waiting on Customer' },
    { value: '4', label: 'Resolved' },
    { value: '5', label: 'Closed' },
  ];

  // Get base URL from decrypted credentials and strip /api/2.0 for UI links
  const rawBaseUrl = splynxIntegration?.credentials?.baseUrl || '';
  const splynxBaseUrl = rawBaseUrl.replace(/\/api\/2\.0\/?$/, ''); // Strip /api/2.0 from end
  
  // Build correct Splynx UI URLs
  const customerUrl = ticket?.customer_id ? `${splynxBaseUrl}/admin/customers/view/${ticket.customer_id}` : null;
  const ticketUrl = `${splynxBaseUrl}/admin/tickets/opened--view?id=${ticketId}`;
  
  // Get current status label
  const currentStatusLabel = statusOptions.find(s => s.value === String(ticket?.status_id))?.label || `Status ${ticket?.status_id || 'Unknown'}`;
  
  // Get priority with proper fallback
  const priorityLabel = ticket?.priority ? String(ticket.priority).charAt(0).toUpperCase() + String(ticket.priority).slice(1) : 'Normal';

  // UNIFIED MODE - All-in-one ticket processing view
  if (mode === 'unified') {
    return (
      <div className="space-y-3" data-testid="splynx-ticket-viewer-unified">
        {/* Compact Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{ticket?.subject || 'Support Ticket'}</h3>
            <p className="text-xs text-muted-foreground">Ticket #{ticketId}</p>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge className={`${priorityColors[ticket?.priority?.toLowerCase()]} text-xs px-2 py-0`}>
              Priority: {priorityLabel}
            </Badge>
            <Badge variant="outline" className="text-xs px-2 py-0">
              {currentStatusLabel}
            </Badge>
          </div>
        </div>

        {/* Quick Links Row */}
        <div className="flex gap-2">
          {customerUrl && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-1 h-8 text-xs"
            >
              <a href={customerUrl} target="_blank" rel="noopener noreferrer" data-testid="link-customer">
                <User className="h-3 w-3 mr-1" />
                Customer #{ticket?.customer_id}
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            asChild
            className="flex-1 h-8 text-xs"
          >
            <a href={ticketUrl} target="_blank" rel="noopener noreferrer" data-testid="link-ticket">
              <Ticket className="h-3 w-3 mr-1" />
              Open in Splynx
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </div>

        <Separator />

        {/* Messages - Compact scrollable view */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            <MessageSquare className="h-3 w-3" />
            Messages ({messages.length})
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2 bg-muted/20">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No messages yet</p>
            ) : (
              messages.map((msg: any, idx: number) => (
                <div 
                  key={idx} 
                  className={`p-2 rounded text-xs ${
                    msg.type === 'internal' 
                      ? 'bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-900' 
                      : 'bg-background border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-xs">{msg.author || 'User'}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {msg.created_at ? format(new Date(msg.created_at), 'MMM d, h:mm a') : ''}
                    </span>
                  </div>
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.message || msg.text}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Reply */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">Quick Reply</label>
            <Select value={isInternal ? 'true' : 'false'} onValueChange={(v) => setIsInternal(v === 'true')}>
              <SelectTrigger className="w-24 h-7 text-xs" data-testid="select-message-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Public</SelectItem>
                <SelectItem value="true">Internal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your response..."
            className="min-h-20 text-sm"
            data-testid="textarea-ticket-message"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={sendMessageMutation.isPending || !message.trim()}
            size="sm"
            className="w-full h-9"
            data-testid="button-send-message"
          >
            {sendMessageMutation.isPending ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-3 w-3 mr-2" />
                Send Reply
              </>
            )}
          </Button>
        </div>

        {/* Status Update */}
        <div className="space-y-2">
          <label className="text-xs font-medium">Update Status</label>
          <div className="flex gap-2">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="flex-1 h-9 text-sm" data-testid="select-ticket-status">
                <SelectValue placeholder="Change status..." />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateStatusMutation.isPending || !selectedStatus}
              size="sm"
              className="h-9 px-3"
              data-testid="button-update-status"
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ORIGINAL MODE VIEWS (overview, respond, status, resolution)
  return (
    <div className="space-y-4" data-testid="splynx-ticket-viewer">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                {ticket?.subject || 'Support Ticket'}
              </CardTitle>
              <CardDescription>Ticket #{ticketId}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge className={priorityColors[ticket?.priority?.toLowerCase()] || 'bg-gray-100'}>
                {ticket?.priority || 'Normal'}
              </Badge>
              <Badge variant="outline">
                Status: {ticket?.status_id || 'Unknown'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Customer ID: {ticket?.customer_id || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Created: {ticket?.created_at ? format(new Date(ticket.created_at), 'PPp') : 'N/A'}</span>
            </div>
          </div>

          <Separator />

          {/* Message History - Show in all modes */}
          {(mode === 'overview' || mode === 'respond') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4" />
                Messages ({messages.length})
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto border rounded-md p-3 bg-muted/20">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
                ) : (
                  messages.map((msg: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-md ${
                        msg.type === 'internal' 
                          ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' 
                          : 'bg-background'
                      } border`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{msg.author || 'User'}</span>
                        <div className="flex items-center gap-2">
                          {msg.type === 'internal' && (
                            <Badge variant="outline" className="text-xs">Internal</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {msg.created_at ? format(new Date(msg.created_at), 'PPp') : ''}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message || msg.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Message Input - Show only in respond mode */}
          {mode === 'respond' && (
            <div className="space-y-2 border rounded-md p-4 bg-primary/5">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Add Response</label>
                <Select value={isInternal ? 'true' : 'false'} onValueChange={(v) => setIsInternal(v === 'true')}>
                  <SelectTrigger className="w-32 h-8" data-testid="select-message-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Public</SelectItem>
                    <SelectItem value="true">Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                className="min-h-32"
                data-testid="textarea-ticket-message"
                autoFocus
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={sendMessageMutation.isPending || !message.trim()}
                size="sm"
                className="w-full"
                data-testid="button-send-message"
              >
                {sendMessageMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Status Selector - Show only in status mode */}
          {mode === 'status' && (
            <div className="space-y-3 border rounded-md p-4 bg-primary/5">
              <label className="text-sm font-medium">Update Ticket Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger data-testid="select-ticket-status">
                  <SelectValue placeholder="Select new status..." />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleUpdateStatus}
                disabled={updateStatusMutation.isPending || !selectedStatus}
                size="sm"
                className="w-full"
                data-testid="button-update-status"
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Status'
                )}
              </Button>
            </div>
          )}

          {/* Resolution Summary - Show only in resolution mode */}
          {mode === 'resolution' && (
            <div className="space-y-3 border rounded-md p-4 bg-green-50 dark:bg-green-950">
              <h3 className="text-sm font-medium text-green-900 dark:text-green-100">Ready to close this ticket</h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Review the ticket details and messages above. When you complete this step, the ticket will be marked as resolved.
              </p>
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <User className="h-4 w-4" />
                <span>Assigned to: {ticket?.assign_to || 'Unassigned'}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
