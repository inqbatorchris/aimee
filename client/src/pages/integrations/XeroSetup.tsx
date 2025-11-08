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
import { CheckCircle2, AlertCircle, ExternalLink, Clock, XCircle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';

export default function XeroSetup() {
  const [, setLocation] = useLocation();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState('');

  const { data: status } = useQuery<any>({
    queryKey: ['/api/finance/xero/status'],
  });

  const { data: syncHistory } = useQuery<any[]>({
    queryKey: ['/api/finance/xero/sync-history'],
    enabled: !!status?.connected,
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
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
            <div>
              <h2 className="text-2xl font-bold">Xero Connected Successfully</h2>
              <p className="text-muted-foreground">
                Connected to: {status.tenantName || 'Xero Organization'}
              </p>
            </div>
          </div>

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
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Last synced: {new Date(status.lastSync.lastSyncAt).toLocaleString()}
                <br />
                Transactions synced: {status.lastSync.recordsSynced || 0}
              </p>
            </div>
          )}
        </Card>

        {syncHistory && syncHistory.length > 0 && (
          <Card className="p-6 mt-6">
            <h3 className="text-xl font-semibold mb-4">Sync History</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Records Synced</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncHistory.map((sync: any, index: number) => (
                    <TableRow key={sync.id || index}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(sync.lastSyncAt || sync.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {sync.status === 'completed' || sync.status === 'success' ? (
                          <Badge className="bg-green-500">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Success
                          </Badge>
                        ) : sync.status === 'in_progress' || sync.status === 'pending' ? (
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            {sync.status === 'in_progress' ? 'In Progress' : 'Pending'}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="text-green-600">{sync.recordsSynced || 0} synced</div>
                          {sync.recordsFailed > 0 && (
                            <div className="text-red-600">{sync.recordsFailed} failed</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {sync.errors && (
                          <div className="text-xs text-red-600 max-w-xs truncate" title={JSON.stringify(sync.errors)}>
                            {typeof sync.errors === 'string' ? sync.errors : JSON.stringify(sync.errors)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {sync.syncType || 'transactions'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
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
