import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Webhook, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Activity, 
  Shield, 
  Copy, 
  RefreshCw,
  Key,
  Code
} from 'lucide-react';
import { format } from 'date-fns';

interface WebhookEvent {
  id: number;
  organizationId: number;
  integrationId: number;
  triggerId: number;
  triggerKey: string;
  eventId: string | null;
  payload: any;
  headers: any;
  method: string;
  userAgent: string;
  sourceIp: string;
  verified: boolean;
  processed: boolean;
  processedAt: string | null;
  errorMessage: string | null;
  workflowTriggered: boolean;
  workflowRunId: number | null;
  createdAt: string;
}

interface Integration {
  id: number;
  name: string;
  platformType: string;
}

interface Trigger {
  id: number;
  integrationId: number;
  triggerKey: string;
  name: string;
  webhookSecret: string | null;
  webhookEventCount: number;
  lastWebhookAt: string | null;
}

export default function WebhookManager() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [integrationFilter, setIntegrationFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
  const [testPayload, setTestPayload] = useState('{"type":"event","data":{"test":"value"}}');
  const [testSecret, setTestSecret] = useState('');
  const [testSignature, setTestSignature] = useState('');

  // Fetch webhook events
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery<WebhookEvent[]>({
    queryKey: ['/api/webhooks/events', currentUser?.organizationId],
    enabled: !!currentUser?.organizationId,
  });

  // Fetch integrations for filtering
  const { data: integrations = [] } = useQuery<Integration[]>({
    queryKey: ['/api/integrations'],
  });

  // Fetch triggers
  const { data: triggers = [] } = useQuery<Trigger[]>({
    queryKey: ['/api/integrations/integration-triggers'],
  });

  // Test signature mutation
  const testSignatureMutation = useMutation({
    mutationFn: async (data: { payload: string; secret: string; signature: string }) => {
      return apiRequest('/api/webhooks/test-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: (result: any) => {
      toast({
        title: result.valid ? 'Signature Valid ✓' : 'Signature Invalid ✗',
        description: result.valid 
          ? 'The signature verification passed successfully.'
          : 'The signature does not match the expected value.',
        variant: result.valid ? 'default' : 'destructive',
      });
    },
    onError: () => {
      toast({
        title: 'Test Failed',
        description: 'Failed to test webhook signature.',
        variant: 'destructive',
      });
    },
  });

  // Update secret mutation
  const updateSecretMutation = useMutation({
    mutationFn: async ({ triggerId, secret }: { triggerId: number; secret: string }) => {
      return apiRequest(`/api/webhooks/triggers/${triggerId}/secret`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Secret Updated',
        description: 'Webhook secret has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/integration-triggers'] });
    },
    onError: () => {
      toast({
        title: 'Update Failed',
        description: 'Failed to update webhook secret.',
        variant: 'destructive',
      });
    },
  });

  // Filter events
  const filteredEvents = events.filter(event => {
    if (integrationFilter !== 'all' && event.integrationId !== parseInt(integrationFilter)) {
      return false;
    }
    if (verifiedFilter === 'verified' && !event.verified) {
      return false;
    }
    if (verifiedFilter === 'unverified' && event.verified) {
      return false;
    }
    return true;
  });

  // Statistics
  const stats = {
    total: events.length,
    verified: events.filter(e => e.verified).length,
    processed: events.filter(e => e.processed).length,
    triggeredWorkflows: events.filter(e => e.workflowTriggered).length,
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard.`,
    });
  };

  const generateSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Webhook className="w-8 h-8" />
            Webhook Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor webhook events, test signatures, and manage secrets
          </p>
        </div>
        <Button
          onClick={() => refetchEvents()}
          variant="outline"
          size="sm"
          data-testid="button-refresh-events"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-events">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-verified-events">
              {stats.verified}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-processed-events">{stats.processed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Workflows Triggered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-workflow-triggers">
              {stats.triggeredWorkflows}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events" data-testid="tab-events">
            <Activity className="w-4 h-4 mr-2" />
            Events
          </TabsTrigger>
          <TabsTrigger value="test" data-testid="tab-test">
            <Code className="w-4 h-4 mr-2" />
            Test Signature
          </TabsTrigger>
          <TabsTrigger value="secrets" data-testid="tab-secrets">
            <Key className="w-4 h-4 mr-2" />
            Manage Secrets
          </TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Webhook Events</CardTitle>
                  <CardDescription>Recent webhook requests received</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={integrationFilter} onValueChange={setIntegrationFilter}>
                    <SelectTrigger className="w-[200px]" data-testid="select-integration-filter">
                      <SelectValue placeholder="Filter by integration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Integrations</SelectItem>
                      {integrations.map(int => (
                        <SelectItem key={int.id} value={int.id.toString()}>
                          {int.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-verified-filter">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="verified">Verified Only</SelectItem>
                      <SelectItem value="unverified">Unverified Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading events...</div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No webhook events found</div>
              ) : (
                <div className="space-y-2">
                  {filteredEvents.map(event => (
                    <div
                      key={event.id}
                      className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => setSelectedEvent(event)}
                      data-testid={`event-${event.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-medium">{event.triggerKey}</span>
                            {event.verified ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="w-3 h-3" />
                                Unverified
                              </Badge>
                            )}
                            {event.workflowTriggered && (
                              <Badge variant="outline" className="gap-1">
                                <Activity className="w-3 h-3" />
                                Workflow
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(event.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                            </span>
                            <span>IP: {event.sourceIp}</span>
                            {event.eventId && <span>Event ID: {event.eventId}</span>}
                          </div>
                        </div>
                        {event.errorMessage && (
                          <Badge variant="destructive">Error</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Signature Tab */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Webhook Signature</CardTitle>
              <CardDescription>
                Verify HMAC-SHA1 signature calculation (Splynx standard)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-payload">Payload (Raw JSON)</Label>
                <Textarea
                  id="test-payload"
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  placeholder='{"type":"event","data":{"test":"value"}}'
                  className="font-mono text-sm"
                  rows={6}
                  data-testid="input-test-payload"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-secret">Webhook Secret</Label>
                <Input
                  id="test-secret"
                  value={testSecret}
                  onChange={(e) => setTestSecret(e.target.value)}
                  placeholder="Enter your webhook secret"
                  type="text"
                  className="font-mono text-sm"
                  data-testid="input-test-secret"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-signature">Received Signature</Label>
                <Input
                  id="test-signature"
                  value={testSignature}
                  onChange={(e) => setTestSignature(e.target.value)}
                  placeholder="Enter the signature from X-Splynx-Signature header"
                  type="text"
                  className="font-mono text-sm"
                  data-testid="input-test-signature"
                />
              </div>
              <Button
                onClick={() => testSignatureMutation.mutate({
                  payload: testPayload,
                  secret: testSecret,
                  signature: testSignature
                })}
                disabled={!testPayload || !testSecret || !testSignature || testSignatureMutation.isPending}
                className="w-full"
                data-testid="button-test-signature"
              >
                {testSignatureMutation.isPending ? 'Testing...' : 'Test Signature'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Secrets Tab */}
        <TabsContent value="secrets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Secrets</CardTitle>
              <CardDescription>
                Configure webhook secrets for signature verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {triggers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No triggers configured</div>
              ) : (
                <div className="space-y-4">
                  {triggers.map(trigger => (
                    <TriggerSecretRow
                      key={trigger.id}
                      trigger={trigger}
                      onUpdate={(secret) => updateSecretMutation.mutate({
                        triggerId: trigger.id,
                        secret
                      })}
                      onCopy={copyToClipboard}
                      generateSecret={generateSecret}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Details Sheet */}
      <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <SheetContent className="sm:max-w-[700px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Webhook Event Details</SheetTitle>
          </SheetHeader>
          {selectedEvent && (
            <div className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Event ID</Label>
                  <div className="font-mono text-sm">{selectedEvent.id}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Trigger</Label>
                  <div className="font-mono text-sm">{selectedEvent.triggerKey}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Timestamp</Label>
                  <div className="text-sm">{format(new Date(selectedEvent.createdAt), 'MMM dd, yyyy HH:mm:ss')}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Source IP</Label>
                  <div className="text-sm">{selectedEvent.sourceIp}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Verified</Label>
                  <div>{selectedEvent.verified ? (
                    <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>
                  ) : (
                    <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Unverified</Badge>
                  )}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Processed</Label>
                  <div>{selectedEvent.processed ? (
                    <Badge variant="default">Yes</Badge>
                  ) : (
                    <Badge variant="secondary">No</Badge>
                  )}</div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Payload</Label>
                <pre className="mt-2 p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
                <Button
                  onClick={() => copyToClipboard(JSON.stringify(selectedEvent.payload, null, 2), 'Payload')}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Payload
                </Button>
              </div>

              {selectedEvent.errorMessage && (
                <div>
                  <Label className="text-destructive">Error Message</Label>
                  <div className="mt-2 p-4 bg-destructive/10 border border-destructive rounded-lg text-sm">
                    {selectedEvent.errorMessage}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Headers</Label>
                <pre className="mt-2 p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono">
                  {JSON.stringify(selectedEvent.headers, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Trigger Secret Row Component
function TriggerSecretRow({
  trigger,
  onUpdate,
  onCopy,
  generateSecret
}: {
  trigger: Trigger;
  onUpdate: (secret: string) => void;
  onCopy: (text: string, label: string) => void;
  generateSecret: () => string;
}) {
  const [secret, setSecret] = useState(trigger.webhookSecret || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdate(secret);
    setIsEditing(false);
  };

  const handleGenerate = () => {
    const newSecret = generateSecret();
    setSecret(newSecret);
    setIsEditing(true);
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{trigger.name}</div>
          <div className="text-sm text-muted-foreground font-mono">{trigger.triggerKey}</div>
        </div>
        {trigger.webhookEventCount > 0 && (
          <Badge variant="outline">
            {trigger.webhookEventCount} events
          </Badge>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Input
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Enter webhook secret"
            className="font-mono text-sm"
            data-testid={`input-secret-${trigger.id}`}
          />
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" data-testid={`button-save-secret-${trigger.id}`}>
              Save Secret
            </Button>
            <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
              Cancel
            </Button>
            <Button onClick={handleGenerate} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate New
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {trigger.webhookSecret ? (
            <>
              <Input
                value="••••••••••••••••••••••••••••••••"
                disabled
                className="font-mono text-sm flex-1"
              />
              <Button
                onClick={() => onCopy(trigger.webhookSecret!, 'Secret')}
                variant="outline"
                size="sm"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                Edit
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="w-full">
              <Key className="w-4 h-4 mr-2" />
              Set Secret
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
