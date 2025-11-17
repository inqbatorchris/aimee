import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, AlertCircle, ExternalLink, Clock, XCircle, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export default function XeroSetup() {
  const [, setLocation] = useLocation();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState('');
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: status } = useQuery<any>({
    queryKey: ['/api/finance/xero/status'],
  });

  const { data: syncHistory } = useQuery<any[]>({
    queryKey: ['/api/finance/xero/sync-history'],
    enabled: !!status?.connected,
    refetchInterval: 5000, // Auto-refresh every 5 seconds to show real-time status
  });

  const syncNowMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/finance/sync/run', {
        method: 'POST',
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      // Build description based on transaction sync results
      let description = `Synced ${data.synced} transactions successfully${data.failed > 0 ? `, ${data.failed} failed` : ''}`;
      
      // Add chart of accounts info if available
      if (data.chartOfAccounts) {
        description += `. Chart of Accounts: ${data.chartOfAccounts.synced} accounts synced`;
      }
      
      // Show warning if COA sync failed or partial success
      const variant = data.warnings && data.warnings.length > 0 ? 'default' : undefined;
      
      toast({
        title: data.partialSuccess ? 'Sync Completed with Warnings' : 'Sync Complete',
        description: description,
        variant: variant,
      });
      
      // Show separate warning toast if COA sync failed
      if (data.warnings && data.warnings.length > 0) {
        setTimeout(() => {
          toast({
            title: 'Warning',
            description: data.warnings[0].message,
            variant: 'destructive',
          });
        }, 1000);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/finance/xero/sync-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/xero/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/xero/chart-of-accounts'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Sync Failed',
        description: err.message || 'Failed to sync transactions from Xero',
        variant: 'destructive',
      });
    },
  });

  const oauthMutation = useMutation({
    mutationFn: async () => {
      const redirectUri = `${window.location.origin}/integrations/xero/callback`;
      const response = await apiRequest('/api/finance/xero/oauth/start', {
        method: 'POST',
        body: { clientId, clientSecret, redirectUri },
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.authUrl) {
        localStorage.setItem('xero_client_id', clientId);
        localStorage.setItem('xero_client_secret', clientSecret);
        window.location.href = data.authUrl;
      }
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to start OAuth flow');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/finance/xero/disconnect', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      localStorage.removeItem('xero_client_id');
      localStorage.removeItem('xero_client_secret');
      localStorage.removeItem('xero_access_token');
      localStorage.removeItem('xero_refresh_token');
      localStorage.removeItem('xero_tenant_id');
      queryClient.invalidateQueries({ queryKey: ['/api/finance/xero/status'] });
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to disconnect');
    },
  });

  const handleConnect = () => {
    if (!clientId || !clientSecret) {
      setError('Please provide both Client ID and Client Secret');
      return;
    }
    setError('');
    oauthMutation.mutate();
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect from Xero? You will need to reconnect to sync transactions.')) {
      disconnectMutation.mutate();
    }
  };

  if (status?.connected) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
              <div>
                <h2 className="text-2xl font-bold">Xero Connected Successfully</h2>
                <p className="text-muted-foreground">
                  Connected to: {status.tenantName || 'Xero Organization'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => syncNowMutation.mutate()}
                disabled={syncNowMutation.isPending}
                data-testid="button-sync-now"
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncNowMutation.isPending ? 'animate-spin' : ''}`} />
                {syncNowMutation.isPending ? 'Syncing...' : 'Sync Now'}
              </Button>
            </div>
          </div>

          <Tabs defaultValue="connection" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="connection">Connection Status</TabsTrigger>
              <TabsTrigger value="logs">Sync Logs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="connection" className="space-y-4 mt-4">
              <div className="flex gap-3">
                <Button onClick={() => setLocation('/finance')} data-testid="button-view-dashboard">
                  View Financial Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/finance/xero/status'] });
                  }}
                  data-testid="button-refresh-status"
                >
                  Refresh Connection Status
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                  data-testid="button-disconnect"
                >
                  {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </div>

              {status.lastSync && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Last synced: {new Date(status.lastSync.lastSyncAt).toLocaleString()}
                    <br />
                    Transactions synced: {status.lastSync.recordsSynced || 0}
                    {status.lastSync.recordsFailed > 0 && (
                      <>
                        <br />
                        <span className="text-red-600">Failed: {status.lastSync.recordsFailed}</span>
                      </>
                    )}
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="logs" className="mt-4">
              {syncHistory && syncHistory.length > 0 ? (
                <div className="space-y-2">
                  {syncHistory.map((sync: any, index: number) => {
                    const durationDisplay = sync.durationMs 
                      ? `${(sync.durationMs / 1000).toFixed(1)}s`
                      : 'N/A';
                    
                    return (
                      <Card key={sync.id || index} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex-shrink-0">
                              {sync.status === 'completed' ? (
                                <Badge className="bg-green-500">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Completed
                                </Badge>
                              ) : sync.status === 'partial' ? (
                                <Badge variant="secondary" className="bg-yellow-500">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Partial
                                </Badge>
                              ) : sync.status === 'in_progress' ? (
                                <Badge variant="secondary">
                                  <Clock className="w-3 h-3 mr-1 animate-spin" />
                                  In Progress
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Failed
                                </Badge>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                {new Date(sync.startedAt).toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {sync.recordsSynced || 0} synced
                                {sync.recordsFailed > 0 && ` • ${sync.recordsFailed} failed`}
                                {sync.durationMs && ` • ${durationDisplay}`}
                              </div>
                            </div>
                            {(sync.errors && sync.errors.length > 0 || sync.status === 'failed') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedLog(expandedLog === sync.id ? null : sync.id)}
                                data-testid={`button-toggle-log-${sync.id}`}
                              >
                                {expandedLog === sync.id ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        {expandedLog === sync.id && sync.errors && (
                          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-xs">
                            <div className="font-semibold text-destructive mb-2">Error Details:</div>
                            <pre className="whitespace-pre-wrap overflow-x-auto">
                              {typeof sync.errors === 'string' 
                                ? sync.errors 
                                : JSON.stringify(sync.errors, null, 2)}
                            </pre>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No sync history yet</p>
                  <p className="text-sm mt-1">Click "Sync Now" to start your first sync</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Connect Xero</h1>
        <p className="text-muted-foreground">
          Connect your Xero account to enable financial management features
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Step 1: Get Your Xero API Credentials</h3>
            
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You'll need to create an OAuth 2.0 app in Xero to get your credentials.{' '}
                <a
                  href="https://developer.xero.com/app/manage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline inline-flex items-center gap-1"
                >
                  Open Xero Developer Portal
                  <ExternalLink className="w-3 h-3" />
                </a>
              </AlertDescription>
            </Alert>

            <ol className="list-decimal list-inside space-y-2 text-sm mb-6">
              <li>Go to the Xero Developer Portal</li>
              <li>Create a new OAuth 2.0 app</li>
              <li>Set the redirect URI to: <code className="bg-muted px-2 py-1 rounded">{window.location.origin}/integrations/xero/callback</code></li>
              <li>Copy your Client ID and Client Secret</li>
            </ol>

            <h3 className="text-lg font-semibold mb-4">Step 2: Enter Your Credentials</h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Your Xero Client ID"
                  data-testid="input-client-id"
                />
              </div>

              <div>
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Your Xero Client Secret"
                  data-testid="input-client-secret"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleConnect}
                disabled={oauthMutation.isPending}
                className="w-full"
                data-testid="button-connect-xero"
              >
                {oauthMutation.isPending ? 'Connecting...' : 'Connect to Xero'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">What You'll Get</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Real-time transaction sync</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>AI-powered categorization</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Cash flow visibility</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Profit center tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Financial insights</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Secure Connection</h3>
            <p className="text-sm text-muted-foreground">
              Your credentials are encrypted and stored securely. We use OAuth 2.0 for authentication.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
