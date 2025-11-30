import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  Cable, Calculator, Mail, Database as DatabaseIcon, Bot, Settings,
  CheckCircle, XCircle, AlertCircle, Plus, Workflow, RefreshCw, Info, Map, Phone,
  MessageSquareText
} from 'lucide-react';
import type { Integration } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { IntegrationCapabilities } from '@/components/IntegrationCapabilities';

// Integration configuration
const INTEGRATION_CONFIG = {
  splynx: {
    name: 'Splynx',
    description: 'ISP management and billing system',
    icon: Cable,
    setupPath: '/integrations/splynx/setup',
    color: 'bg-blue-500',
  },
  sql_database: {
    name: 'SQL Databases',
    description: 'Connect to PostgreSQL, MySQL, SQLite and more',
    icon: DatabaseIcon,
    setupPath: '/integrations/sql-database/setup',
    color: 'bg-indigo-500',
  },
  sql_direct: {
    name: 'SQL Direct',
    description: 'Direct SQL database query access',
    icon: DatabaseIcon,
    setupPath: '/integrations/sql-direct/setup',
    color: 'bg-indigo-500',
  },
  xero: {
    name: 'Xero',
    description: 'Accounting and bookkeeping software',
    icon: Calculator,
    setupPath: '/integrations/xero/setup',
    color: 'bg-green-500',
  },
  microsoft: {
    name: 'Microsoft Outlook',
    description: 'Email and calendar integration',
    icon: Mail,
    setupPath: '/integrations/microsoft/setup',
    color: 'bg-blue-600',
  },
  firebase: {
    name: 'Firebase',
    description: 'Google\'s app development platform',
    icon: DatabaseIcon,
    setupPath: '/integrations/firebase/setup',
    color: 'bg-orange-500',
  },
  openai: {
    name: 'OpenAI',
    description: 'AI models and machine learning',
    icon: Bot,
    setupPath: '/integrations/openai/setup',
    color: 'bg-purple-500',
  },
  pxc: {
    name: 'PXC - TalkTalk Wholesale',
    description: 'Order management and polling system',
    icon: Cable,
    setupPath: '/integrations/pxc/setup',
    color: 'bg-cyan-500',
  },
  google_maps: {
    name: 'Google Maps',
    description: 'Geocoding and location services',
    icon: Map,
    setupPath: '/integrations/google-maps/setup',
    color: 'bg-red-500',
  },
  airtable: {
    name: 'Airtable',
    description: 'Connect bases and tables to create workflows',
    icon: DatabaseIcon,
    setupPath: '/integrations/airtable/setup',
    color: 'bg-yellow-500',
  },
  vapi: {
    name: 'Vapi Voice AI',
    description: 'Autonomous voice AI assistant for support and sales',
    icon: Phone,
    setupPath: '/integrations/vapi/setup',
    color: 'bg-violet-500',
  },
  ai_ticket_drafting: {
    name: 'AI Ticket Drafting',
    description: 'Automatically generate draft responses for support tickets using AI and your knowledge base',
    icon: MessageSquareText,
    setupPath: '/integrations/ai-ticket-drafting/setup',
    color: 'bg-emerald-500',
  },
} as const;

type IntegrationType = keyof typeof INTEGRATION_CONFIG;

export default function Integrations() {
  const [selectedTab, setSelectedTab] = useState<'active' | 'available'>('active');
  const [capabilitiesOpen, setCapabilitiesOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const { toast } = useToast();
  
  // Fetch integrations
  const { data: integrations, isLoading, error } = useQuery<Integration[]>({
    queryKey: ['/api/integrations'],
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (platformType: string) => {
      const response = await apiRequest(`/api/integrations/${platformType}/test`, {
        method: 'POST',
      });
      return response;
    },
    onSuccess: (data, platformType) => {
      toast({
        title: 'Connection test successful',
        description: 'The integration is working correctly.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Connection test failed',
        description: error?.message || 'Unable to connect to the service.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading integrations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="mt-4 text-destructive">Failed to load integrations</p>
          </div>
        </div>
      </div>
    );
  }

  const activeIntegrations = integrations?.filter(i => i.connectionStatus === 'active' || i.connectionStatus === 'connected') || [];
  const availableIntegrations = Object.keys(INTEGRATION_CONFIG).filter(
    platform => !integrations?.some(i => i.platformType === platform && (i.connectionStatus === 'active' || i.connectionStatus === 'connected'))
  ) as IntegrationType[];

  return (
    <div className="container mx-auto py-4 px-4 pb-24 md:pb-4 max-w-6xl">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Integrations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Connect external platforms to create automated agents with intelligent workflows
            </p>
          </div>
          <Link href="/agents">
            <Button data-testid="button-agent-builder" size="sm" className="w-full sm:w-auto">
              <Workflow className="mr-2 h-4 w-4" />
              Agent Builder
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'active' | 'available')}>
        <TabsList className="mb-4">
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({activeIntegrations.length})
          </TabsTrigger>
          <TabsTrigger value="available" data-testid="tab-available">
            Available ({availableIntegrations.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Integrations */}
        <TabsContent value="active">
          {activeIntegrations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <XCircle className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-base font-medium mb-2">No Active Integrations</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  You haven't connected any integrations yet. Get started by setting up your first integration.
                </p>
                <Button
                  onClick={() => setSelectedTab('available')}
                  data-testid="button-browse-available"
                  size="sm"
                >
                  Browse Available Integrations
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeIntegrations.map((integration) => {
                const config = INTEGRATION_CONFIG[integration.platformType as IntegrationType];
                const Icon = config?.icon || Settings;
                
                return (
                  <Card key={integration.id} className="relative">
                    <CardHeader className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className={`p-1.5 rounded-lg ${config?.color || 'bg-gray-500'} bg-opacity-10`}>
                          <Icon className={`h-5 w-5 ${config?.color?.replace('bg-', 'text-')}`} />
                        </div>
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <CardDescription className="text-xs">{config?.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-1 text-xs">
                        {integration.lastTestedAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Last tested:</span>
                            <span>{new Date(integration.lastTestedAt).toLocaleString()}</span>
                          </div>
                        )}
                        {integration.connectionStatus && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant={integration.connectionStatus === 'active' || integration.connectionStatus === 'connected' ? 'default' : 'destructive'}>
                              {integration.connectionStatus}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          size="sm"
                          onClick={() => {
                            setSelectedIntegration(integration);
                            setCapabilitiesOpen(true);
                          }}
                          data-testid={`button-capabilities-${integration.platformType}`}
                        >
                          <Info className="mr-2 h-3 w-3" />
                          View Capabilities
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          size="sm"
                          onClick={() => testConnectionMutation.mutate(integration.platformType)}
                          disabled={testConnectionMutation.isPending}
                          data-testid={`button-test-${integration.platformType}`}
                        >
                          <RefreshCw className={`mr-2 h-3 w-3 ${testConnectionMutation.isPending ? 'animate-spin' : ''}`} />
                          Test Connection
                        </Button>
                        <Link href={config?.setupPath || '#'}>
                          <Button variant="outline" size="sm" className="w-full" data-testid={`button-manage-${integration.platformType}`}>
                            <Settings className="mr-2 h-3 w-3" />
                            Manage
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Available Integrations */}
        <TabsContent value="available">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableIntegrations.map((platform) => {
              const config = INTEGRATION_CONFIG[platform];
              const Icon = config.icon;
              
              return (
                <Card key={platform} className="relative">
                  <CardHeader className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className={`p-1.5 rounded-lg ${config.color} bg-opacity-10`}>
                        <Icon className={`h-5 w-5 ${config.color.replace('bg-', 'text-')}`} />
                      </div>
                    </div>
                    <CardTitle className="text-base">{config.name}</CardTitle>
                    <CardDescription className="text-xs">{config.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Link href={config.setupPath}>
                      <Button className="w-full" size="sm" data-testid={`button-setup-${platform}`}>
                        <Plus className="mr-2 h-3 w-3" />
                        Set Up
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
            
            {availableIntegrations.length === 0 && (
              <div className="col-span-full">
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                    <h3 className="text-base font-medium mb-2">All Integrations Active</h3>
                    <p className="text-sm text-muted-foreground text-center">
                      You've connected all available integrations. Great job!
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Integration Capabilities Viewer */}
      {selectedIntegration && (
        <IntegrationCapabilities
          integrationId={selectedIntegration.id}
          integrationName={selectedIntegration.name}
          platformType={selectedIntegration.platformType}
          open={capabilitiesOpen}
          onOpenChange={setCapabilitiesOpen}
        />
      )}
    </div>
  );
}