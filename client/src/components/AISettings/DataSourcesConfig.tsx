import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Database, CreditCard, Wifi, MessageSquare, Clock, Save, AlertTriangle } from 'lucide-react';

interface DataSourceConfig {
  customerInfo: boolean;
  financialData: boolean;
  serviceData: boolean;
  ticketHistory: boolean;
  serviceHealth: boolean;
  historicalTicketLimit: number;
  includeInternalNotes: boolean;
  includeBillingDetails: boolean;
}

export default function DataSourcesConfig() {
  const [config, setConfig] = useState<DataSourceConfig>({
    customerInfo: true,
    financialData: true,
    serviceData: true,
    ticketHistory: true,
    serviceHealth: true,
    historicalTicketLimit: 5,
    includeInternalNotes: false,
    includeBillingDetails: true
  });

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDataSourceConfig();
  }, []);

  const loadDataSourceConfig = async () => {
    try {
      const response = await fetch('/api/ai/data-sources');
      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to load data source config:', error);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/ai/data-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Data source configuration saved successfully',
        });
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save configuration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (key: keyof DataSourceConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const getDataImpact = () => {
    const activeCount = Object.values(config).filter(v => typeof v === 'boolean' && v).length;
    if (activeCount >= 5) return 'High';
    if (activeCount >= 3) return 'Medium';
    return 'Low';
  };

  const getPrivacyLevel = () => {
    const sensitiveData = config.financialData || config.includeBillingDetails;
    if (sensitiveData) return 'Contains PII';
    return 'Basic Info Only';
  };

  return (
    <div className="space-y-6">
      {/* Data Sources Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sources Configuration</CardTitle>
          <CardDescription>
            Control what customer and system data is included in AI context for response generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Impact Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="font-medium">Data Richness</div>
                <div className="text-sm text-gray-600">{getDataImpact()}</div>
              </div>
              <Database className="w-6 h-6 text-blue-600" />
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div>
                <div className="font-medium">Privacy Level</div>
                <div className="text-sm text-gray-600">{getPrivacyLevel()}</div>
              </div>
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <div className="font-medium">Response Quality</div>
                <div className="text-sm text-gray-600">Enhanced</div>
              </div>
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Customer Information
          </CardTitle>
          <CardDescription>
            Basic customer profile and account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="customer-info">Include Customer Profile</Label>
              <p className="text-sm text-gray-600">
                Name, email, phone, address, account status, join date
              </p>
            </div>
            <Switch
              id="customer-info"
              checked={config.customerInfo}
              onCheckedChange={(checked) => updateConfig('customerInfo', checked)}
            />
          </div>

          {config.customerInfo && (
            <div className="ml-4 p-3 bg-gray-50 rounded text-sm">
              <strong>Included data:</strong> Customer name, email, phone number, service address, account status, join date
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Financial Information
          </CardTitle>
          <CardDescription>
            Billing, payment history, and account balance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="financial-data">Include Financial Data</Label>
              <p className="text-sm text-gray-600">
                Account balance, recent invoices, payment history
              </p>
            </div>
            <Switch
              id="financial-data"
              checked={config.financialData}
              onCheckedChange={(checked) => updateConfig('financialData', checked)}
            />
          </div>

          {config.financialData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="billing-details">Include Detailed Billing</Label>
                  <p className="text-sm text-gray-600">
                    Specific invoice amounts, payment methods, transaction IDs
                  </p>
                </div>
                <Switch
                  id="billing-details"
                  checked={config.includeBillingDetails}
                  onCheckedChange={(checked) => updateConfig('includeBillingDetails', checked)}
                />
              </div>

              <div className="ml-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <strong>Privacy Notice:</strong> Financial data includes sensitive PII. Ensure compliance with data protection regulations.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Service Information
          </CardTitle>
          <CardDescription>
            Active services, plans, and technical details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="service-data">Include Service Details</Label>
              <p className="text-sm text-gray-600">
                Active services, plan details, installation dates
              </p>
            </div>
            <Switch
              id="service-data"
              checked={config.serviceData}
              onCheckedChange={(checked) => updateConfig('serviceData', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="service-health">Include Service Health</Label>
              <p className="text-sm text-gray-600">
                Real-time connection status, diagnostics, performance metrics
              </p>
            </div>
            <Switch
              id="service-health"
              checked={config.serviceHealth}
              onCheckedChange={(checked) => updateConfig('serviceHealth', checked)}
            />
          </div>

          {(config.serviceData || config.serviceHealth) && (
            <div className="ml-4 p-3 bg-gray-50 rounded text-sm">
              <strong>Included data:</strong> Service plans, connection status, speed tests, equipment details, diagnostic results
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Ticket History
          </CardTitle>
          <CardDescription>
            Previous support interactions and resolutions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="ticket-history">Include Previous Tickets</Label>
              <p className="text-sm text-gray-600">
                Historical support tickets for context and patterns
              </p>
            </div>
            <Switch
              id="ticket-history"
              checked={config.ticketHistory}
              onCheckedChange={(checked) => updateConfig('ticketHistory', checked)}
            />
          </div>

          {config.ticketHistory && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Number of Historical Tickets: {config.historicalTicketLimit}</Label>
                <Slider
                  value={[config.historicalTicketLimit]}
                  onValueChange={(value) => updateConfig('historicalTicketLimit', value[0])}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1 ticket</span>
                  <span>10 tickets</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="internal-notes">Include Internal Notes</Label>
                  <p className="text-sm text-gray-600">
                    Staff-only comments and technical notes
                  </p>
                </div>
                <Switch
                  id="internal-notes"
                  checked={config.includeInternalNotes}
                  onCheckedChange={(checked) => updateConfig('includeInternalNotes', checked)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Privacy & Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Data Privacy & Performance Impact</CardTitle>
          <CardDescription>
            Understand the implications of your data source selections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Privacy Considerations</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={config.financialData ? "destructive" : "secondary"}>
                    Financial PII
                  </Badge>
                  <span className="text-sm">
                    {config.financialData ? 'Included' : 'Excluded'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.includeInternalNotes ? "outline" : "secondary"}>
                    Internal Notes
                  </Badge>
                  <span className="text-sm">
                    {config.includeInternalNotes ? 'Included' : 'Excluded'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Performance Impact</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Context Size</span>
                  <span>{getDataImpact()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>API Cost</span>
                  <span>{getDataImpact() === 'High' ? '$0.08-0.12' : '$0.04-0.08'} per response</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Response Time</span>
                  <span>{getDataImpact() === 'High' ? '3-5s' : '2-3s'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={saveConfig} disabled={isSaving} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}