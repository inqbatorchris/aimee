import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  Play,
  Square,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SplynxAgent {
  id: string;
  name: string;
  description: string;
  type: 'leads_counter' | 'customer_sync' | 'billing_alerts';
  isEnabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: 'success' | 'error' | 'running' | null;
  lastRunResult: any;
  nextRunAt: string | null;
  configuration: {
    keyResultId?: number;
    updateFrequency: 'hourly' | 'daily' | 'weekly';
    filterCriteria?: any;
  };
}

interface SplynxInstallation {
  id: number;
  organizationId: number;
  baseUrl: string;
  connectionStatus: 'disconnected' | 'connected' | 'error';
  isEnabled: boolean;
  agents: SplynxAgent[];
  createdAt: string;
  updatedAt: string;
}

interface AgentExecutionResult {
  success: boolean;
  agentId: string;
  result: any;
  executedAt: string;
  duration: number;
}

// Default agent templates
const AGENT_TEMPLATES: Omit<SplynxAgent, 'id' | 'lastRunAt' | 'lastRunStatus' | 'lastRunResult' | 'nextRunAt'>[] = [
  {
    name: "Leads Counter",
    description: "Automatically counts new leads from Splynx and updates a Key Result",
    type: 'leads_counter',
    isEnabled: false,
    configuration: {
      updateFrequency: 'daily',
      filterCriteria: {
        status: 'new',
        createdAfter: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
      },
    },
  },
  {
    name: "Customer Growth Tracker", 
    description: "Track new customer acquisitions and update growth metrics",
    type: 'customer_sync',
    isEnabled: false,
    configuration: {
      updateFrequency: 'weekly',
      filterCriteria: {
        status: 'active',
      },
    },
  },
];

export default function SplynxAgents() {
  const [selectedAgent, setSelectedAgent] = useState<SplynxAgent | null>(null);
  const [executingAgent, setExecutingAgent] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to get installation and agents
  const { data: installation, isLoading } = useQuery<SplynxInstallation>({
    queryKey: ['/api/splynx/installation'],
  });

  // Get available key results for agent configuration
  const { data: keyResults = [] } = useQuery<any[]>({
    queryKey: ['/api/strategy/key-results'],
    enabled: !!installation?.isEnabled,
  });

  // Mutation for updating agents
  const updateAgentsMutation = useMutation({
    mutationFn: async (agents: SplynxAgent[]) => {
      return apiRequest('/api/splynx/agents', {
        method: 'PATCH',
        body: { agents },
      });
    },
    onSuccess: () => {
      toast({
        title: "Agents updated",
        description: "Agent configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/splynx/installation'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update agents.",
        variant: "destructive",
      });
    },
  });

  // Mutation for executing an agent
  const executeAgentMutation = useMutation({
    mutationFn: async (agentId: string): Promise<AgentExecutionResult> => {
      const response = await apiRequest(`/api/splynx/agents/${agentId}/execute`, {
        method: 'POST',
      });
      return response as unknown as AgentExecutionResult;
    },
    onSuccess: (result) => {
      setExecutingAgent(null);
      if (result.success) {
        toast({
          title: "Agent executed successfully",
          description: `Agent ${result.agentId} completed successfully.`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/splynx/installation'] });
      } else {
        toast({
          title: "Agent execution failed",
          description: `Agent ${result.agentId} encountered an error.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setExecutingAgent(null);
      toast({
        title: "Execution failed",
        description: error.message || "Failed to execute agent.",
        variant: "destructive",
      });
    },
  });

  const handleToggleAgent = (agentId: string, enabled: boolean) => {
    if (!installation) return;

    const updatedAgents = installation.agents.map(agent => 
      agent.id === agentId ? { ...agent, isEnabled: enabled } : agent
    );

    updateAgentsMutation.mutate(updatedAgents);
  };

  const handleCreateAgent = (template: typeof AGENT_TEMPLATES[0]) => {
    if (!installation) return;

    const newAgent: SplynxAgent = {
      ...template,
      id: Date.now().toString(),
      lastRunAt: null,
      lastRunStatus: null,
      lastRunResult: null,
      nextRunAt: null,
    };

    const updatedAgents = [...installation.agents, newAgent];
    updateAgentsMutation.mutate(updatedAgents);
  };

  const handleExecuteAgent = (agentId: string) => {
    setExecutingAgent(agentId);
    executeAgentMutation.mutate(agentId);
  };

  const getStatusIcon = (status: SplynxAgent['lastRunStatus']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: SplynxAgent['lastRunStatus']) => {
    const variants = {
      success: 'default' as const,
      error: 'destructive' as const,
      running: 'outline' as const,
      null: 'secondary' as const,
    };

    const labels = {
      success: 'Success',
      error: 'Error',
      running: 'Running',
      null: 'Not Run',
    };

    return (
      <Badge variant={variants[status || 'null']}>
        {labels[status || 'null']}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!installation || !installation.isEnabled) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl" data-testid="splynx-agents">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Splynx integration is not set up or enabled. Please{' '}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => window.location.href = '/integrations/splynx/setup'}
              data-testid="link-setup"
            >
              configure your Splynx connection
            </Button>{' '}
            first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (installation.connectionStatus !== 'connected') {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Splynx connection is not active. Please check your connection settings and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl" data-testid="splynx-agents">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Splynx Agents</h1>
          <Badge variant="default" className="text-xs">
            {installation.agents.length} configured
          </Badge>
        </div>
        <p className="text-gray-600">
          Manage automated agents that sync data between Splynx and your Key Results.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Active Agents */}
        {installation.agents.length > 0 && (
          <div className="grid gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Agents</h2>
            
            {installation.agents.map((agent) => (
              <Card key={agent.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bot className="h-5 w-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{agent.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(agent.lastRunStatus)}
                      <Switch
                        checked={agent.isEnabled}
                        onCheckedChange={(enabled) => handleToggleAgent(agent.id, enabled)}
                        disabled={updateAgentsMutation.isPending}
                        data-testid={`switch-agent-${agent.id}`}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(agent.lastRunStatus)}
                        {agent.lastRunAt ? (
                          <span>Last run: {new Date(agent.lastRunAt).toLocaleString()}</span>
                        ) : (
                          <span>Never run</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Runs {agent.configuration.updateFrequency}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExecuteAgent(agent.id)}
                        disabled={executingAgent === agent.id || agent.lastRunStatus === 'running'}
                        className="flex items-center gap-1"
                        data-testid={`button-run-${agent.id}`}
                      >
                        {executingAgent === agent.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        Run Now
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedAgent(agent)}
                        data-testid={`button-configure-${agent.id}`}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Show execution results if available */}
                  {agent.lastRunResult && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <div className="text-xs text-muted-foreground">Last execution result:</div>
                      <div className="mt-1 text-sm font-mono">
                        {typeof agent.lastRunResult === 'object' 
                          ? JSON.stringify(agent.lastRunResult, null, 2)
                          : String(agent.lastRunResult)
                        }
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Available Agent Templates */}
        <div className="grid gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Available Agents</h2>
          <p className="text-sm text-muted-foreground -mt-3">
            Add new agents to automate data synchronization between Splynx and your objectives.
          </p>
          
          {AGENT_TEMPLATES.map((template, index) => (
            <Card key={index} className="border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bot className="h-5 w-5 text-gray-400" />
                    <div>
                      <CardTitle className="text-lg text-gray-700">{template.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleCreateAgent(template)}
                    disabled={updateAgentsMutation.isPending}
                    className="flex items-center gap-1"
                    data-testid={`button-create-${template.type}`}
                  >
                    {updateAgentsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Bot className="h-4 w-4" />
                        Create Agent
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>How Agents Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 mt-0.5 text-blue-600" />
              <div>
                <p className="font-medium">Automated Updates</p>
                <p className="text-muted-foreground">
                  Agents run on schedule to automatically update your Key Results with fresh data from Splynx.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 mt-0.5 text-green-600" />
              <div>
                <p className="font-medium">Data Synchronization</p>
                <p className="text-muted-foreground">
                  Keep your business metrics in sync without manual data entry or exports.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}