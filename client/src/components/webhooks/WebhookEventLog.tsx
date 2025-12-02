import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, Clock, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface WebhookEventLogProps {
  open: boolean;
  onClose: () => void;
  organizationId: number;
  workflowId?: number;
}

export function WebhookEventLog({ open, onClose, organizationId, workflowId }: WebhookEventLogProps) {
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);
  
  console.log('[WebhookEventLog] Props:', { open, organizationId, workflowId });
  
  const { data: events = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/webhooks/events', organizationId],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      console.log('[WebhookEventLog] Fetching events for org:', organizationId);
      const response = await fetch(`/api/webhooks/events/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        console.error('[WebhookEventLog] Error:', response.status);
        throw new Error('Failed to fetch webhook events');
      }
      const data = await response.json();
      console.log('[WebhookEventLog] Got events:', data.length);
      return data;
    },
    enabled: open && !!organizationId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  
  console.log('[WebhookEventLog] State:', { open, organizationId, isLoading, eventsCount: events.length });

  // Filter events by workflow if workflowId is provided
  const filteredEvents = workflowId 
    ? events.filter((e: any) => e.workflowRunId && e.workflowId === workflowId)
    : events;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Webhook Event Log</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              data-testid="button-refresh-events"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No webhook events received yet
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-2">
              {filteredEvents.map((event: any) => (
                <div
                  key={event.id}
                  className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                  data-testid={`event-${event.id}`}
                >
                  {/* Event Header */}
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedEventId(
                      expandedEventId === event.id ? null : event.id
                    )}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {/* Status Icon */}
                      <div className="mt-1">
                        {event.processed ? (
                          event.workflowTriggered ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-gray-400" />
                          )
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      
                      {/* Event Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">
                            {event.triggerKey}
                          </span>
                          {event.verified && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                              Verified
                            </Badge>
                          )}
                          {event.workflowTriggered && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                              Workflow Triggered
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>Event ID: {event.eventId || 'N/A'}</div>
                          <div>Source: {event.sourceIp}</div>
                          <div>
                            {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expand Icon */}
                    <div className="ml-2">
                      {expandedEventId === event.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {expandedEventId === event.id && (
                    <div className="mt-3 pt-3 border-t space-y-3">
                      {/* Headers */}
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                          Headers
                        </div>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(event.headers, null, 2)}
                        </pre>
                      </div>
                      
                      {/* Payload */}
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                          Payload
                        </div>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-64 overflow-y-auto">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </div>
                      
                      {/* Error Message (if any) */}
                      {event.errorMessage && (
                        <div>
                          <div className="text-xs font-semibold text-red-600 uppercase mb-1">
                            Error
                          </div>
                          <div className="text-xs bg-red-50 text-red-900 p-2 rounded">
                            {event.errorMessage}
                          </div>
                        </div>
                      )}
                      
                      {/* Workflow Run Link */}
                      {event.workflowRunId && (
                        <div className="pt-2 border-t">
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-blue-600"
                            onClick={() => {
                              // Navigate to workflow run details
                              window.location.href = `/agents?runId=${event.workflowRunId}`;
                            }}
                          >
                            View Workflow Run →
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
