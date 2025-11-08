import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, User, Database, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';

interface AIDataPreviewProps {
  className?: string;
}

interface DataPreview {
  customerProfile?: any;
  serviceData?: any;
  billingDetails?: any;
  serviceHealth?: any;
  ticketHistory?: any;
  knowledgeBase?: any;
  internalNotes?: any;
  financialData?: any;
}

interface DataSourceConfig {
  includeCustomerProfile: boolean;
  includeServiceData: boolean;
  includeBillingDetails: boolean;
  includeServiceHealth: boolean;
  includeTicketHistory: boolean;
  includeKnowledgeBase: boolean;
  includeInternalNotes: boolean;
  includeFinancialData: boolean;
  historicalTicketLimit: number;
}

export default function AIDataPreview({ className }: AIDataPreviewProps) {
  const [customerId, setCustomerId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [dataPreview, setDataPreview] = useState<DataPreview>({});
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<DataSourceConfig>({
    includeCustomerProfile: true,
    includeServiceData: true,
    includeBillingDetails: true,
    includeServiceHealth: true,
    includeTicketHistory: true,
    includeKnowledgeBase: true,
    includeInternalNotes: false,
    includeFinancialData: true,
    historicalTicketLimit: 5
  });
  const { toast } = useToast();

  // Load current AI configuration and update in real-time
  const { data: currentConfig, isLoading: configLoading } = useQuery({
    queryKey: ['/api/ai/data-sources'],
    queryFn: async () => {
      const response = await authService.authenticatedFetch('/api/ai/data-sources');
      if (!response.ok) throw new Error('Failed to fetch AI configuration');
      return response.json();
    },
    refetchInterval: 2000, // Refresh every 2 seconds to pick up changes from Data tab
  });

  // Update local config when current config loads or changes
  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
    }
  }, [currentConfig]);

  const generateDataPreview = async () => {
    if (!customerId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a customer ID',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setSelectedCustomerId(customerId);
    const preview: DataPreview = {};

    try {
      // Test each data source individually
      const dataSources = [
        {
          key: 'customerProfile',
          enabled: config.includeCustomerProfile,
          endpoint: `/api/customers/${customerId}`,
          description: 'Customer Profile Data'
        },
        {
          key: 'serviceData',
          enabled: config.includeServiceData,
          endpoint: `/api/service-health/${customerId}`,
          description: 'Service Connection Data',
          transform: (data: any) => data.connection
        },
        {
          key: 'billingDetails',
          enabled: config.includeBillingDetails,
          endpoint: `/api/service-health/${customerId}`,
          description: 'Billing Information',
          transform: (data: any) => data.billing
        },
        {
          key: 'serviceHealth',
          enabled: config.includeServiceHealth,
          endpoint: `/api/service-health/${customerId}`,
          description: 'Overall Service Health',
          transform: (data: any) => ({
            overall: data.overall?.status || 'unknown',
            connection: data.connection?.status || 'unknown',
            billing: data.billing?.status || 'unknown',
            usage: data.usage?.status || 'unknown',
            usagePercentage: data.usage?.percentage || 0,
            lastUpdate: new Date().toISOString()
          })
        },
        {
          key: 'ticketHistory',
          enabled: config.includeTicketHistory,
          endpoint: `/api/customers/${customerId}/tickets?limit=${config.historicalTicketLimit}`,
          description: 'Recent Ticket History'
        },
        {
          key: 'knowledgeBase',
          enabled: config.includeKnowledgeBase,
          endpoint: `/api/ai/kb-documents?limit=5&active=true`,
          description: 'Knowledge Base Articles'
        },
        {
          key: 'financialData',
          enabled: config.includeFinancialData,
          endpoint: `/api/service-health/${customerId}`,
          description: 'Financial Data',
          transform: (data: any) => ({
            balance: data.billing?.balance || 0,
            status: data.billing?.status || 'unknown',
            nextDue: data.billing?.nextDue || 'Unknown'
          })
        }
      ];

      // Fetch data for each enabled source
      for (const source of dataSources) {
        if (source.enabled) {
          try {
            const response = await authService.authenticatedFetch(source.endpoint);
            if (response.ok) {
              let data = await response.json();
              if (source.transform) {
                data = source.transform(data);
              }
              preview[source.key as keyof DataPreview] = data;
            } else {
              preview[source.key as keyof DataPreview] = {
                error: `API Error: ${response.status} - ${response.statusText}`,
                endpoint: source.endpoint,
                available: false
              };
            }
          } catch (error) {
            preview[source.key as keyof DataPreview] = {
              error: `Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              endpoint: source.endpoint,
              available: false
            };
          }
        } else {
          preview[source.key as keyof DataPreview] = {
            disabled: true,
            reason: 'Switch is disabled in AI configuration'
          };
        }
      }

      // Handle internal notes (special case)
      if (config.includeInternalNotes) {
        preview.internalNotes = {
          note: 'Internal notes would be included in ticket history if available',
          implementation: 'Filtered from ticket messages where isInternal = true'
        };
      } else {
        preview.internalNotes = {
          disabled: true,
          reason: 'Internal notes switch is disabled'
        };
      }

      setDataPreview(preview);
      
      toast({
        title: 'Success',
        description: `Generated data preview for customer ${customerId}`,
      });

    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDataSourceStatus = (data: any) => {
    if (!data) return { status: 'unknown', icon: AlertCircle, color: 'text-gray-500' };
    if (data.disabled) return { status: 'disabled', icon: XCircle, color: 'text-gray-500' };
    if (data.error) return { status: 'error', icon: XCircle, color: 'text-red-500' };
    if (data.available === false) return { status: 'unavailable', icon: AlertCircle, color: 'text-yellow-500' };
    return { status: 'available', icon: CheckCircle, color: 'text-green-500' };
  };

  const renderDataPreview = (title: string, data: any, description: string) => {
    const status = getDataSourceStatus(data);
    const StatusIcon = status.icon;

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${status.color}`} />
            {title}
            <Badge variant={status.status === 'available' ? 'default' : 'secondary'} className="ml-auto">
              {status.status}
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-md p-3 max-h-64 overflow-y-auto">
            <pre className="text-xs text-gray-800 whitespace-pre-wrap">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="w-5 h-5" />
            AI Data Preview & Testing
          </CardTitle>
          <CardDescription>
            Select a customer ID to preview the exact data that will be sent to the AI for each configuration switch.
            This helps you understand what information is available and verify your data source settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customerId">Customer ID</Label>
            <div className="flex gap-2">
              <Input
                id="customerId"
                placeholder="Enter customer ID (e.g., 3280, 1118)"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && generateDataPreview()}
              />
              <Button 
                onClick={generateDataPreview} 
                disabled={isLoading || !customerId.trim()}
                className="flex items-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isLoading ? 'Loading...' : 'Generate Preview'}
              </Button>
              {selectedCustomerId && (
                <Button 
                  onClick={generateDataPreview} 
                  disabled={isLoading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              )}
            </div>
          </div>

          {/* Configuration Notice */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
            <div className="font-medium text-blue-800 mb-1">Current Configuration</div>
            <div className="text-blue-700">
              Preview reflects your saved settings from the Data tab. Changes to switches automatically update here.
            </div>
          </div>

          {/* Configuration Summary */}
          {!configLoading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Switch checked={config.includeCustomerProfile} disabled />
                <span>Customer Profile</span>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={config.includeServiceData} disabled />
                <span>Service Data</span>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={config.includeBillingDetails} disabled />
                <span>Billing Details</span>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={config.includeServiceHealth} disabled />
                <span>Service Health</span>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={config.includeTicketHistory} disabled />
                <span>Ticket History</span>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={config.includeKnowledgeBase} disabled />
                <span>Knowledge Base</span>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={config.includeInternalNotes} disabled />
                <span>Internal Notes</span>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={config.includeFinancialData} disabled />
                <span>Financial Data</span>
              </div>
            </div>
          )}

          {/* Data Preview Results */}
          {selectedCustomerId && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h3 className="font-medium text-sm mb-3">
                  Data Preview for Customer {selectedCustomerId}
                </h3>
                
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="customer">Customer & Service</TabsTrigger>
                    <TabsTrigger value="system">System & KB</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    {renderDataPreview(
                      'Customer Profile', 
                      dataPreview.customerProfile,
                      'Name, email, phone, address, account status from customer database'
                    )}
                    {renderDataPreview(
                      'Service Health Overview', 
                      dataPreview.serviceHealth,
                      'Overall service status, connection health, billing health, usage metrics'
                    )}
                  </TabsContent>
                  
                  <TabsContent value="customer" className="space-y-4">
                    {renderDataPreview(
                      'Service Data', 
                      dataPreview.serviceData,
                      'Connection status, IP address, last seen, service details from Splynx API'
                    )}
                    {renderDataPreview(
                      'Billing Details', 
                      dataPreview.billingDetails,
                      'Account balance, payment status, next due date from billing system'
                    )}
                    {renderDataPreview(
                      'Financial Data', 
                      dataPreview.financialData,
                      'Comprehensive financial information including balance and payment history'
                    )}
                    {renderDataPreview(
                      'Ticket History', 
                      dataPreview.ticketHistory,
                      `Recent ${config.historicalTicketLimit} tickets and conversation history`
                    )}
                  </TabsContent>
                  
                  <TabsContent value="system" className="space-y-4">
                    {renderDataPreview(
                      'Knowledge Base', 
                      dataPreview.knowledgeBase,
                      'Available KB articles and documentation for context'
                    )}
                    {renderDataPreview(
                      'Internal Notes', 
                      dataPreview.internalNotes,
                      'Internal staff notes and private comments (if enabled)'
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}