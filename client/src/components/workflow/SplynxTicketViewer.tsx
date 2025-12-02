import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Ticket, MessageSquare, Clock, User, AlertCircle, Loader2, Send, ExternalLink, CheckCircle, Sparkles, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useMemo, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import DOMPurify from 'dompurify';

type ViewMode = 'overview' | 'respond' | 'status' | 'resolution' | 'unified';

// Helper function to sanitize and render HTML from Splynx messages
function renderMessageHTML(html: string) {
  if (!html) return '';
  
  // Sanitize HTML to prevent XSS attacks
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'div', 'ul', 'li', 'strong', 'em', 'b', 'i', 'u', 'a'],
    ALLOWED_ATTR: ['href', 'target']
  });
  
  return sanitized;
}

interface TicketDraftResponse {
  id: number;
  workItemId: number;
  originalDraft: string;
  finalResponse?: string;
  editPercentage?: number;
  sentAt?: string;
  sentBy?: number;
  regenerationCount: number;
  generationMetadata: {
    model?: string;
    temperature?: number;
    knowledgeDocumentsUsed?: number[];
  };
  createdAt: string;
  updatedAt: string;
}

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
  const [hasNotifiedCompletion, setHasNotifiedCompletion] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  
  // Use ref pattern to prevent stale closures while avoiding infinite loops
  const onModeCompletedRef = useRef(onModeCompleted);
  useEffect(() => {
    onModeCompletedRef.current = onModeCompleted;
  }, [onModeCompleted]);

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

  // Fetch AI draft for this work item
  const { data: aiDraft, refetch: refetchDraft } = useQuery<TicketDraftResponse>({
    queryKey: [`/api/ai-drafting/drafts/work-item/${workItemId}`],
    enabled: !!workItemId,
    retry: false,
  });

  // Pre-fill response with AI draft when it loads (only once, only if not already sent)
  useEffect(() => {
    if (aiDraft && !draftLoaded && !aiDraft.sentAt) {
      setMessage(aiDraft.originalDraft);
      setDraftLoaded(true);
    }
  }, [aiDraft, draftLoaded]);

  // Derive completion state from actual ticket data
  // IMPORTANT: Never auto-complete - always require explicit user action
  const isModeCompleted = useMemo(() => {
    if (!ticketData?.entityData) return false;
    
    // All modes now require explicit user action to complete
    // This prevents the workflow step from auto-completing when first loaded
    return localActionCompleted;
  }, [ticketData, localActionCompleted]);

  // Reset local action state when ticket changes
  useEffect(() => {
    setLocalActionCompleted(false);
    setHasNotifiedCompletion(false);
  }, [ticketId]);

  // Notify parent when completion state changes (ONCE)
  // Use ref pattern to prevent infinite loop while keeping callback fresh
  useEffect(() => {
    if (isModeCompleted && !hasNotifiedCompletion) {
      setHasNotifiedCompletion(true);
      onModeCompletedRef.current?.();
    }
  }, [isModeCompleted, hasNotifiedCompletion]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, isInternal }: { message: string; isInternal: boolean }) => {
      if (!integrationId) throw new Error('No Splynx integration found');
      
      // Update AI draft record if one exists and hasn't been sent yet
      if (aiDraft && !aiDraft.sentAt) {
        await apiRequest(`/api/ai-drafting/drafts/${aiDraft.id}`, {
          method: 'PATCH',
          body: { finalResponse: message }
        });
      }
      
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
      refetchDraft();
      onMessageSent?.();
      if (mode === 'respond' || mode === 'unified') {
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
    mutationFn: async ({ statusId, statusName }: { statusId: string; statusName: string }) => {
      if (!integrationId) throw new Error('No Splynx integration found');
      return await apiRequest(`/api/integrations/splynx/entity/ticket/${ticketId}/status`, {
        method: 'PATCH',
        body: {
          integrationId,
          statusId: parseInt(statusId),
          statusName // Pass status name for bidirectional work item sync
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
    // Find the status name from our options to pass for bidirectional sync
    const statusOption = statusOptions.find(s => s.value === selectedStatus);
    const statusName = statusOption?.label || selectedStatus;
    updateStatusMutation.mutate({ statusId: selectedStatus, statusName });
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
    { value: '2', label: 'Work in progress' },
    { value: '3', label: 'Resolved' },
    { value: '4', label: 'Waiting on customer' },
    { value: '5', label: 'Waiting on agent' },
    { value: '6', label: 'Site Visit Required' },
    { value: '7', label: 'Monitoring' },
  ];

  // Get base URL from decrypted credentials and strip /api/2.0 for UI links
  const rawBaseUrl = splynxIntegration?.credentials?.baseUrl || '';
  const splynxBaseUrl = rawBaseUrl.replace(/\/api\/2\.0\/?$/, ''); // Strip /api/2.0 from end
  
  // Build correct Splynx UI URLs
  const customerUrl = ticket?.customer_id ? `${splynxBaseUrl}/admin/customers/view?id=${ticket.customer_id}` : null;
  const ticketUrl = `${splynxBaseUrl}/admin/tickets/opened--view?id=${ticketId}`;
  
  // Get current status label
  const currentStatusLabel = statusOptions.find(s => s.value === String(ticket?.status_id))?.label || `Status ${ticket?.status_id || 'Unknown'}`;
  
  // Get priority with proper fallback
  const priorityLabel = ticket?.priority ? String(ticket.priority).charAt(0).toUpperCase() + String(ticket.priority).slice(1) : 'Normal';

  // UNIFIED MODE - Message-focused layout
  if (mode === 'unified') {
    return (
      <div className="flex flex-col h-full" data-testid="splynx-ticket-viewer-unified">
        {/* Minimal Header */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="font-medium text-sm truncate">{ticket?.subject || 'Support Ticket'}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Customer link */}
            {ticket?.customer_id ? (
              <a
                href={customerUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                data-testid="link-customer-splynx"
              >
                <User className="h-3 w-3" />
                {ticket.customer_name || `Customer #${ticket.customer_id}`}
              </a>
            ) : (
              <span className="text-[10px] text-amber-600 dark:text-amber-400">No customer</span>
            )}
            <Badge className={`${priorityColors[ticket?.priority?.toLowerCase()]} text-[10px] px-1.5 py-0.5`}>
              {priorityLabel}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-6 px-2"
            >
              <a href={ticketUrl} target="_blank" rel="noopener noreferrer" data-testid="link-ticket">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>

        {/* Messages - Scrollable area */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 min-h-0">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No messages yet</p>
          ) : (
            messages.map((msg: any, idx: number) => {
              const isHidden = msg.hide_for_customer === '1' || msg.hide_for_customer === 1;
              const isCustomer = msg.author_type === 'customer';
              return (
                <div 
                  key={idx} 
                  className={`p-2.5 rounded-lg ${
                    isHidden
                      ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900' 
                      : isCustomer
                      ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900'
                      : 'bg-muted/50 border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">
                        {msg.author_type === 'admin' ? 'Agent' : msg.author_type === 'customer' ? 'Customer' : 'User'}
                      </span>
                      {isHidden && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-100 dark:bg-amber-900">Private</Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {msg.date && msg.time ? format(new Date(`${msg.date} ${msg.time}`), 'MMM d, h:mm a') : ''}
                    </span>
                  </div>
                  <div 
                    className="text-xs prose prose-xs dark:prose-invert max-w-none leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMessageHTML(msg.rawMessage || msg.message) }}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Quick Reply - Fixed bottom section */}
        <div className="border-t pt-3 space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium">Reply</label>
              {aiDraft && !aiDraft.sentAt && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI Draft
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={isInternal ? 'true' : 'false'} onValueChange={(v) => setIsInternal(v === 'true')}>
                <SelectTrigger className="w-20 h-6 text-[10px]" data-testid="select-message-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Public</SelectItem>
                  <SelectItem value="true">Private</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-36 h-6 text-[10px]" data-testid="select-ticket-status">
                  <SelectValue placeholder="Update status..." />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your response..."
              className="min-h-32 text-sm pr-20 resize-none"
              data-testid="textarea-ticket-message"
            />
            {aiDraft && !aiDraft.sentAt && message !== aiDraft.originalDraft && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMessage(aiDraft.originalDraft)}
                className="absolute top-2 right-2 h-6 px-2 text-[10px]"
                data-testid="button-restore-draft"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Restore
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSendMessage} 
              disabled={sendMessageMutation.isPending || !message.trim()}
              size="sm"
              className="flex-1 h-8"
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
            {selectedStatus && (
              <Button
                onClick={handleUpdateStatus}
                disabled={updateStatusMutation.isPending}
                size="sm"
                variant="outline"
                className="h-8 px-3"
                data-testid="button-update-status"
              >
                {updateStatusMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>

          {aiDraft && aiDraft.sentAt && aiDraft.editPercentage !== undefined && (
            <p className="text-[10px] text-muted-foreground text-center pt-1">
              Previous response edited {Number(aiDraft.editPercentage).toFixed(1)}% before sending
            </p>
          )}
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
              <a 
                href={ticketUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                data-testid="link-open-ticket-splynx"
              >
                Ticket #{ticketId}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <Badge className={priorityColors[ticket?.priority?.toLowerCase()] || 'bg-gray-100'}>
                {ticket?.priority || 'Normal'}
              </Badge>
              <Badge variant="outline">
                {currentStatusLabel}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              {ticket?.customer_id ? (
                <a
                  href={customerUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                  data-testid="link-customer-splynx"
                >
                  {ticket.customer_name || `Customer #${ticket.customer_id}`}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">No customer linked</span>
              )}
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
                  messages.map((msg: any, idx: number) => {
                    const isHidden = msg.hide_for_customer === '1' || msg.hide_for_customer === 1;
                    return (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-md ${
                          isHidden
                            ? 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800' 
                            : 'bg-background'
                        } border`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{msg.author_type === 'admin' ? 'Agent' : msg.author_type === 'customer' ? 'Customer' : 'User'}</span>
                            {isHidden && (
                              <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900 border-amber-300">Private</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {msg.date && msg.time ? format(new Date(`${msg.date} ${msg.time}`), 'PPp') : ''}
                          </span>
                        </div>
                        <div 
                          className="text-sm prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: renderMessageHTML(msg.rawMessage || msg.message) }}
                        />
                      </div>
                    );
                  })
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
                    <SelectItem value="true">Private</SelectItem>
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
