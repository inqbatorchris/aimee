import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { WebhookActivity } from './WebhookActivity';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Zap, GitBranch, ArrowRight, Info, Play, Code, Book, ExternalLink, Copy, CheckCircle, Webhook, TrendingUp, DollarSign, Database, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface IntegrationCapabilitiesProps {
  integrationId: number;
  integrationName: string;
  platformType: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntegrationCapabilities({
  integrationId,
  integrationName,
  platformType,
  open,
  onOpenChange,
}: IntegrationCapabilitiesProps) {
  const [selectedTab, setSelectedTab] = useState<'triggers' | 'actions' | 'activity'>('triggers');
  const [copiedUrls, setCopiedUrls] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Copy webhook URL to clipboard
  const copyWebhookUrl = async (triggerKey: string, webhookUrl: string) => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedUrls(prev => new Set([...Array.from(prev), triggerKey]));
      
      toast({
        title: "Webhook URL copied!",
        description: "The webhook URL has been copied to your clipboard.",
      });

      // Clear the copied state after 2 seconds
      setTimeout(() => {
        setCopiedUrls(prev => {
          const next = new Set(prev);
          next.delete(triggerKey);
          return next;
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy webhook URL to clipboard.",
        variant: "destructive",
      });
    }
  };

  // Generate webhook URLs for a trigger
  const generateWebhookUrls = (triggerKey: string) => {
    const baseUrl = window.location.origin;
    // For now, using organization ID 3 (from current user context)
    const orgId = 3;
    
    return {
      legacy: `${baseUrl}/api/webhooks/splynx/${orgId}/${triggerKey}`,
      unified: `${baseUrl}/api/webhooks`
    };
  };

  // Generate unified webhook payload example
  const generateUnifiedPayload = (triggerKey: string) => {
    const orgId = 3;
    return {
      organization_id: orgId,
      trigger_key: triggerKey,
      integration_type: "splynx",
      event_data: {
        id: "example-event-123",
        event_type: triggerKey,
        timestamp: "2025-01-01T12:00:00Z",
        // ... actual event data from Splynx
      }
    };
  };

  // Fetch triggers for this integration
  const { data: triggers, isLoading: triggersLoading } = useQuery<any[]>({
    queryKey: [`/api/agents/triggers/${integrationId}`],
    enabled: open && !!integrationId,
  });

  // Fetch actions for this integration
  const { data: actions, isLoading: actionsLoading } = useQuery<any[]>({
    queryKey: [`/api/agents/actions/${integrationId}`],
    enabled: open && !!integrationId,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Integration Capabilities</SheetTitle>
          <SheetDescription>
            {integrationName} ({platformType})
          </SheetDescription>
          {platformType === 'splynx' && (
            <>
              <a
                href="https://splynx.docs.apiary.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mt-3"
                data-testid="link-api-documentation"
              >
                <Book className="h-4 w-4" />
                View Splynx API Documentation
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                onClick={() => copyWebhookUrl('unified', `${window.location.origin}/api/webhooks`)}
                className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-800 mt-2"
                data-testid="button-copy-unified-endpoint"
              >
                <Webhook className="h-4 w-4" />
                Copy Unified Webhook Endpoint
                {copiedUrls.has('unified') ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </>
          )}
        </SheetHeader>

        <div className="mt-6">
          <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'triggers' | 'actions' | 'activity')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="triggers" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Triggers
                {triggers && <Badge variant="secondary" className="ml-2">{triggers.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Actions
                {actions && <Badge variant="secondary" className="ml-2">{actions.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-250px)] mt-4">
              <TabsContent value="triggers" className="space-y-4">
                {triggersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-sm text-muted-foreground">Loading triggers...</p>
                    </div>
                  </div>
                ) : triggers && triggers.length > 0 ? (
                  triggers.map((trigger) => (
                    <Card key={trigger.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/10">
                              <Zap className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{trigger.name}</CardTitle>
                              <Badge variant="outline" className="mt-1">{trigger.triggerKey}</Badge>
                            </div>
                          </div>
                          {trigger.category && (
                            <Badge variant="secondary">{trigger.category}</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{trigger.description}</CardDescription>
                        
                        {/* Webhook URL Section for Splynx triggers */}
                        {platformType === 'splynx' && (
                          <div className="mt-4 space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Webhook className="h-4 w-4 text-blue-600" />
                              <span>Webhook Endpoints</span>
                            </div>
                            
                            {/* Unified Endpoint (Recommended) */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">RECOMMENDED</Badge>
                                <span className="text-sm font-medium">Unified Endpoint</span>
                              </div>
                              <div className="p-3 bg-muted rounded-lg border">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-muted-foreground mb-1">POST</div>
                                    <div className="font-mono text-xs break-all">
                                      {generateWebhookUrls(trigger.triggerKey).unified}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyWebhookUrl(`unified-${trigger.triggerKey}`, generateWebhookUrls(trigger.triggerKey).unified)}
                                    className="shrink-0 h-8 w-8 p-0"
                                    data-testid={`button-copy-unified-webhook-${trigger.triggerKey}`}
                                  >
                                    {copiedUrls.has(`unified-${trigger.triggerKey}`) ? (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                                
                                {/* Payload Example */}
                                <div className="mt-3 p-2 bg-background border rounded text-xs">
                                  <div className="text-muted-foreground mb-2">Payload Format:</div>
                                  <pre className="font-mono overflow-x-auto">
{JSON.stringify(generateUnifiedPayload(trigger.triggerKey), null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>

                            {/* Legacy Endpoint */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">LEGACY</Badge>
                                <span className="text-sm font-medium">Organization-Scoped Endpoint</span>
                              </div>
                              <div className="p-3 bg-muted rounded-lg border">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-muted-foreground mb-1">POST</div>
                                    <div className="font-mono text-xs break-all">
                                      {generateWebhookUrls(trigger.triggerKey).legacy}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyWebhookUrl(`legacy-${trigger.triggerKey}`, generateWebhookUrls(trigger.triggerKey).legacy)}
                                    className="shrink-0 h-8 w-8 p-0"
                                    data-testid={`button-copy-legacy-webhook-${trigger.triggerKey}`}
                                  >
                                    {copiedUrls.has(`legacy-${trigger.triggerKey}`) ? (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Webhook Configuration Status */}
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  trigger.isConfigured ? 'bg-green-500' : 'bg-orange-500'
                                }`} />
                                <span className="text-muted-foreground">
                                  {trigger.isConfigured ? 'Configured' : 'Not configured in Splynx'}
                                </span>
                              </div>
                              {trigger.webhookEventCount !== undefined && (
                                <span className="text-muted-foreground">
                                  {trigger.webhookEventCount} events received
                                </span>
                              )}
                            </div>
                            
                            {/* Last webhook received info */}
                            {trigger.lastWebhookAt && (
                              <div className="text-xs text-muted-foreground">
                                Last webhook: {new Date(trigger.lastWebhookAt).toLocaleString()}
                              </div>
                            )}
                            
                            {/* Security note */}
                            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                              <div className="flex items-start gap-2">
                                <Info className="h-3 w-3 text-yellow-600 mt-0.5" />
                                <div className="text-xs text-yellow-800 dark:text-yellow-200">
                                  <span className="font-medium">Security:</span> Configure webhook signatures in Splynx for secure delivery
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Legacy webhook path display for other platforms */}
                        {platformType !== 'splynx' && trigger.webhookPath && (
                          <div className="mt-3 p-2 bg-muted rounded-md">
                            <div className="flex items-center gap-2 text-xs">
                              <Code className="h-3 w-3" />
                              <span className="font-mono">{trigger.webhookPath}</span>
                            </div>
                          </div>
                        )}
                        
                        {trigger.payloadSchema && (
                          <div className="mt-3">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Info className="h-3 w-3" />
                              <span>Payload schema available</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No triggers configured for this integration yet.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                {actionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-sm text-muted-foreground">Loading actions...</p>
                    </div>
                  </div>
                ) : actions && actions.length > 0 ? (
                  actions.map((action) => (
                  <Card key={action.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-blue-500/10">
                            <Play className="h-4 w-4 text-blue-500" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{action.name}</CardTitle>
                            <Badge variant="outline" className="mt-1">{action.actionKey}</Badge>
                          </div>
                        </div>
                        {action.category && (
                          <Badge variant="secondary">{action.category}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{action.description}</CardDescription>
                      {action.endpoint && (
                        <div className="mt-3 p-2 bg-muted rounded-md">
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="font-mono">
                              {action.httpMethod}
                            </Badge>
                            <span className="font-mono text-muted-foreground">{action.endpoint}</span>
                          </div>
                        </div>
                      )}
                      {action.requiredFields && action.requiredFields.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium mb-1">Required Fields:</p>
                          <div className="flex flex-wrap gap-1">
                            {action.requiredFields.map((field: string) => (
                              <Badge key={field} variant="default" className="text-xs">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {action.optionalFields && action.optionalFields.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium mb-1">Optional Fields:</p>
                          <div className="flex flex-wrap gap-1">
                            {action.optionalFields.map((field: string) => (
                              <Badge key={field} variant="outline" className="text-xs">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {action.docsUrl && (
                        <div className="mt-2">
                          <a
                            href={action.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                            data-testid={`link-action-docs-${action.actionKey}`}
                          >
                            <Info className="h-3 w-3" />
                            <span>API Documentation</span>
                            <ExternalLink className="h-2 w-2" />
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Play className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No actions configured for this integration yet.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                {platformType === 'xero' ? (
                  <XeroActivity integrationId={integrationId} platformType={platformType} />
                ) : (
                  <WebhookActivity 
                    integrationId={integrationId}
                    organizationId={1}
                  />
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function XeroActivity({ integrationId, platformType }: { integrationId: number; platformType: string }) {
  const { data: activity, isLoading, error } = useQuery<any>({
    queryKey: ['/api/finance/xero/activity'],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Info className="h-12 w-12 text-destructive mx-auto mb-3" />
        <p className="text-sm font-medium text-destructive mb-2">Failed to load activity</p>
        <p className="text-xs text-muted-foreground">
          {error instanceof Error ? error.message : 'An error occurred while fetching Xero activity data'}
        </p>
      </div>
    );
  }

  if (!activity?.connected) {
    return (
      <div className="text-center py-8">
        <Database className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Xero is not connected. Connect your Xero account to view activity.
        </p>
      </div>
    );
  }

  const stats = activity.statistics || {};

  return (
    <div className="space-y-4">
      {/* Connection Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant={activity.connectionStatus === 'connected' ? 'default' : 'destructive'}>
              {activity.connectionStatus}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tenant:</span>
            <span className="font-medium">{activity.tenantName || 'N/A'}</span>
          </div>
          {activity.lastTestedAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Tested:</span>
              <span>{new Date(activity.lastTestedAt).toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{stats.totalTransactions || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Categorized</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">{stats.categorized || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Uncategorized</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold">{stats.uncategorized || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Categorization Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-2xl font-bold">{stats.categorizationRate || 0}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sync History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Recent Sync History
          </CardTitle>
          <CardDescription className="text-xs">
            Last 10 sync operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activity.syncHistory && activity.syncHistory.length > 0 ? (
            <div className="space-y-2">
              {activity.syncHistory.map((sync: any) => (
                <div key={sync.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {sync.syncType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {sync.recordsSynced || 0} records
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={sync.status === 'completed' ? 'default' : sync.status === 'failed' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {sync.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {sync.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No sync history available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Full Sync Info */}
      {stats.lastFullSync && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Last Full Sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span>{new Date(stats.lastFullSync).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Transactions Processed:</span>
              <span className="font-medium">{stats.lastSyncTransactionCount || 0}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}