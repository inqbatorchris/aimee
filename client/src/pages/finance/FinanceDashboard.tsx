import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, TrendingDown, Activity, RefreshCw, Settings, Download } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function FinanceDashboard() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/finance/dashboard/metrics', selectedPeriod],
    enabled: true,
  });

  const { data: xeroStatus } = useQuery({
    queryKey: ['/api/finance/xero/status'],
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest('/api/finance/sync/run', { method: 'POST' }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/dashboard/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/xero/status'] });
      toast({
        title: 'Sync completed',
        description: `Synced ${data?.recordsSynced || 0} transactions from Xero`,
      });
    },
    onError: (error: any) => {
      const needsReconnect = error.message?.includes('reconnect') || 
                            error.message?.includes('refresh token') ||
                            error.message?.includes('connection lost');
      
      toast({
        title: 'Sync failed',
        description: error.message || 'Failed to sync transactions from Xero',
        variant: 'destructive',
        action: needsReconnect ? (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => window.location.href = '/integrations/xero/setup'}
          >
            Reconnect
          </Button>
        ) : undefined,
      });
      
      // Refresh Xero status to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/finance/xero/status'] });
    },
  });

  const isConnected = xeroStatus?.connected;

  if (!isConnected) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="p-8 text-center">
          <Settings className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Connect Xero to Get Started</h2>
          <p className="text-muted-foreground mb-6">
            Connect your Xero account to access financial insights, transaction categorization, and profit center analysis.
          </p>
          <Button
            onClick={() => window.location.href = '/integrations/xero'}
            data-testid="button-connect-xero"
          >
            Connect Xero Account
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time financial insights and transaction management
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            data-testid="button-sync"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync Xero
          </Button>
          <Button variant="outline" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6" data-testid="card-cash-position">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Cash Position</span>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {metricsLoading ? '...' : `£${(metrics?.cash_position?.value || 0).toLocaleString()}`}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics?.cash_position?.percentageChange > 0 ? '+' : ''}
            {metrics?.cash_position?.percentageChange || 0}% from last period
          </p>
        </Card>

        <Card className="p-6" data-testid="card-monthly-revenue">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Monthly Revenue</span>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {metricsLoading ? '...' : `£${(metrics?.monthly_revenue?.value || 0).toLocaleString()}`}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Current month
          </p>
        </Card>

        <Card className="p-6" data-testid="card-ar-aging">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Outstanding AR</span>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {metricsLoading ? '...' : `£${(metrics?.ar_aging?.value || 0).toLocaleString()}`}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Accounts receivable
          </p>
        </Card>

        <Card className="p-6" data-testid="card-margin">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Profit Margin</span>
            <TrendingDown className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {metricsLoading ? '...' : `${(metrics?.margin?.value || 0)}%`}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Current period
          </p>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
          <TabsTrigger value="profit-centers" data-testid="tab-profit-centers">Profit Centers</TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <p className="text-muted-foreground">
              Transaction categorization interface coming soon. Use the Xero sync button above to import transactions.
            </p>
            <Button className="mt-4" onClick={() => window.location.href = '/finance/transactions'}>
              View All Transactions
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="profit-centers" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Profit Center Performance</h3>
            <p className="text-muted-foreground">
              Configure profit centers to track revenue and expenses by geographic zone, service type, or customer segment.
            </p>
            <Button className="mt-4" onClick={() => window.location.href = '/finance/profit-centers'}>
              Manage Profit Centers
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Financial Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Button variant="outline" className="justify-start" data-testid="button-pl-report">
                Profit & Loss
              </Button>
              <Button variant="outline" className="justify-start" data-testid="button-balance-sheet">
                Balance Sheet
              </Button>
              <Button variant="outline" className="justify-start" data-testid="button-cash-flow">
                Cash Flow
              </Button>
              <Button variant="outline" className="justify-start" data-testid="button-ar-report">
                AR Aging
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {xeroStatus?.lastSync && (
        <Card className="p-4 bg-muted">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Last synced: {new Date(xeroStatus.lastSync.lastSyncAt).toLocaleString()}
            </span>
            <span className="text-muted-foreground">
              {xeroStatus.lastSync.recordsSynced || 0} transactions synced
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
