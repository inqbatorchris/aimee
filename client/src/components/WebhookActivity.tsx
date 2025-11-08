import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight,
  Activity,
  Webhook,
  Code,
  Zap
} from 'lucide-react';

interface WebhookActivityProps {
  integrationId: number;
  organizationId?: number;
}

interface WebhookEvent {
  id: number;
  triggerKey: string;
  eventId?: string;
  payload: any;
  headers: any;
  verified: boolean;
  processed: boolean;
  processedAt?: string;
  errorMessage?: string;
  workflowTriggered: boolean;
  workflowRunId?: number;
  createdAt: string;
}

export function WebhookActivity({ integrationId, organizationId = 1 }: WebhookActivityProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  // Fetch webhook events for this integration
  const { data: webhookEvents, isLoading, refetch } = useQuery<WebhookEvent[]>({
    queryKey: [`/api/webhooks/events/${organizationId}`, { integrationId }],
    enabled: !!integrationId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const toggleEventExpansion = (eventId: number) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const getStatusIcon = (event: WebhookEvent) => {
    if (event.errorMessage) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (event.processed && event.workflowTriggered) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (event.processed) {
      return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusText = (event: WebhookEvent) => {
    if (event.errorMessage) {
      return "Failed";
    }
    if (event.processed && event.workflowTriggered) {
      return "Completed";
    }
    if (event.processed) {
      return "Processed";
    }
    return "Pending";
  };

  const getStatusVariant = (event: WebhookEvent): "default" | "secondary" | "destructive" | "outline" => {
    if (event.errorMessage) {
      return "destructive";
    }
    if (event.processed && event.workflowTriggered) {
      return "default";
    }
    if (event.processed) {
      return "secondary";
    }
    return "outline";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading webhook activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Webhook Activity</h3>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          data-testid="button-refresh-webhook-activity"
        >
          Refresh
        </Button>
      </div>

      {webhookEvents && webhookEvents.length > 0 ? (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {webhookEvents.map((event) => (
              <Card key={event.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(event)}
                      <div>
                        <CardTitle className="text-sm font-medium">
                          {event.triggerKey}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(event.createdAt).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(event)} className="text-xs">
                        {getStatusText(event)}
                      </Badge>
                      {event.verified && (
                        <Badge variant="outline" className="text-xs">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {/* Event ID if available */}
                    {event.eventId && (
                      <div className="text-xs text-muted-foreground">
                        Event ID: <span className="font-mono">{event.eventId}</span>
                      </div>
                    )}

                    {/* Processing info */}
                    {event.processedAt && (
                      <div className="text-xs text-muted-foreground">
                        Processed: {new Date(event.processedAt).toLocaleString()}
                      </div>
                    )}

                    {/* Workflow info */}
                    {event.workflowTriggered && event.workflowRunId && (
                      <div className="flex items-center gap-2 text-xs">
                        <Zap className="h-3 w-3 text-green-500" />
                        <span className="text-muted-foreground">
                          Triggered workflow run #{event.workflowRunId}
                        </span>
                      </div>
                    )}

                    {/* Error message */}
                    {event.errorMessage && (
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-3 w-3 text-red-600 mt-0.5" />
                          <div className="text-xs text-red-800 dark:text-red-200">
                            <span className="font-medium">Error:</span> {event.errorMessage}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expandable payload section */}
                    <Collapsible>
                      <CollapsibleTrigger
                        onClick={() => toggleEventExpansion(event.id)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                        data-testid={`button-expand-event-${event.id}`}
                      >
                        {expandedEvents.has(event.id) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <Code className="h-3 w-3" />
                        <span>View payload & headers</span>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="mt-2">
                        <div className="space-y-3">
                          {/* Payload */}
                          <div>
                            <div className="text-xs font-medium mb-1">Payload</div>
                            <div className="p-2 bg-muted rounded text-xs font-mono max-h-32 overflow-auto">
                              <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                            </div>
                          </div>
                          
                          {/* Headers */}
                          <div>
                            <div className="text-xs font-medium mb-1">Headers</div>
                            <div className="p-2 bg-muted rounded text-xs font-mono max-h-24 overflow-auto">
                              <pre>{JSON.stringify(event.headers, null, 2)}</pre>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-8">
          <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No webhook events received yet.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Configure your webhooks in Splynx to start receiving events.
          </p>
        </div>
      )}
    </div>
  );
}