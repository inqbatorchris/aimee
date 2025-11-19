import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Play, Settings, Bot, Copy, Clock, Zap } from 'lucide-react';
import WorkflowStepBuilder from '@/components/workflow/WorkflowStepBuilder';
import { WebhookEventLog } from '@/components/webhooks/WebhookEventLog';
import type { Integration, AgentWorkflow, KeyResult, Objective, User } from '@shared/schema';

interface WorkflowStep {
  id: string;
  type: 'integration_action' | 'strategy_update' | 'log_event' | 'notification' | 'data_source_query' | 'data_transformation' | 'splynx_query' | 'for_each' | 'create_work_item';
  name: string;
  config?: any;
}

const TRIGGER_TYPES = [
  { value: 'manual', label: 'Manual', description: 'Trigger manually from the dashboard' },
  { value: 'webhook', label: 'Webhook', description: 'Trigger via webhook URL' },
  { value: 'schedule', label: 'Schedule', description: 'Run automatically on a schedule' },
];

const FREQUENCIES = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function AgentWorkflowEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignedUserId, setAssignedUserId] = useState<number>(0);
  const [triggerType, setTriggerType] = useState('manual');
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState('daily');
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [selectedTriggerId, setSelectedTriggerId] = useState<number | null>(null);
  const [showEventLog, setShowEventLog] = useState(false);
  const [webhookEndpoint, setWebhookEndpoint] = useState('');

  // Fetch workflow details
  const { data: workflow, isLoading } = useQuery<AgentWorkflow>({
    queryKey: [`/api/agents/workflows/${id}`],
    enabled: !!id,
  });

  // Fetch agent users
  const { data: agentUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/agents/agent-users'],
  });

  // Fetch integrations for the workflow builder
  const { data: integrations = [] } = useQuery<Integration[]>({
    queryKey: ['/api/integrations'],
  });

  // Fetch key results for the workflow builder
  const { data: keyResults = [] } = useQuery<KeyResult[]>({
    queryKey: ['/api/strategy/key-results'],
  });

  // Fetch objectives for the workflow builder
  const { data: objectives = [] } = useQuery<Objective[]>({
    queryKey: ['/api/strategy/objectives'],
  });

  // Fetch available triggers when webhook is selected
  const { data: availableTriggers = [] } = useQuery<any[]>({
    queryKey: ['/api/integrations/integration-triggers'],
    enabled: triggerType === 'webhook',
    staleTime: 0, // Always refetch to ensure fresh data
  });

  // Load workflow data when fetched
  useEffect(() => {
    if (workflow) {
      setName(workflow.name);
      setDescription(workflow.description || '');
      setAssignedUserId(workflow.assignedUserId || 0);
      setTriggerType(workflow.triggerType);
      setEnabled(workflow.isEnabled);
      
      const triggerConfig = (workflow.triggerConfig as any) || {};
      setFrequency(triggerConfig.frequency || 'daily');
      if (triggerConfig.triggerId) {
        setSelectedTriggerId(triggerConfig.triggerId);
      }
      
      // Parse workflow definition
      const definition = workflow.workflowDefinition || [];
      setWorkflowSteps(Array.isArray(definition) ? definition : []);
    }
  }, [workflow]);

  // Generate webhook endpoint URL
  useEffect(() => {
    if (workflow && selectedTriggerId && availableTriggers.length > 0) {
      const trigger = availableTriggers.find((t: any) => t.id === selectedTriggerId);
      if (trigger) {
        const baseUrl = window.location.origin;
        const endpoint = `${baseUrl}/api/webhooks/${trigger.integrationType}/${workflow.organizationId}/${trigger.triggerKey}`;
        setWebhookEndpoint(endpoint);
      }
    }
  }, [workflow, selectedTriggerId, availableTriggers]);

  // Update workflow mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/agents/workflows/${id}`, {
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents/workflows'] });
      queryClient.invalidateQueries({ queryKey: [`/api/agents/workflows/${id}`] });
      toast({
        title: 'Success',
        description: 'Workflow updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update workflow',
        variant: 'destructive',
      });
    },
  });

  // Run workflow mutation
  const runMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/agents/workflows/${id}/execute`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Workflow execution started',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to run workflow',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    const triggerConfig: any = {};

    if (triggerType === 'schedule') {
      triggerConfig.frequency = frequency;
    } else if (triggerType === 'webhook' && selectedTriggerId) {
      triggerConfig.triggerId = selectedTriggerId;
    }

    updateMutation.mutate({
      name,
      description,
      assignedUserId,
      triggerType,
      triggerConfig,
      workflowDefinition: workflowSteps,
      isEnabled: enabled,
    });
  };

  const handleCancel = () => {
    setLocation('/agents');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading workflow...</div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Workflow not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Edit Agent Workflow</h1>
                <p className="text-muted-foreground">Configure your automated workflow</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => runMutation.mutate()}
                disabled={runMutation.isPending || !enabled}
                data-testid="button-run"
              >
                <Play className="h-4 w-4 mr-2" />
                Run Now
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Workflow Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Workflow Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter workflow name"
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this workflow does"
                    rows={3}
                    data-testid="input-description"
                  />
                </div>
                <div>
                  <Label htmlFor="agent-user">Agent User</Label>
                  <Select
                    value={assignedUserId > 0 ? assignedUserId.toString() : ''}
                    onValueChange={(value) => setAssignedUserId(parseInt(value))}
                  >
                    <SelectTrigger id="agent-user" data-testid="select-agent-user">
                      <SelectValue placeholder="Select an agent user" />
                    </SelectTrigger>
                    <SelectContent>
                      {agentUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          <div className="flex items-center">
                            <Bot className="mr-2 h-4 w-4" />
                            {user.fullName || user.username}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    This agent user will be shown in activity logs as the performer of this workflow's actions
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Workflow Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Workflow Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <WorkflowStepBuilder
                  steps={workflowSteps}
                  onChange={setWorkflowSteps}
                  integrations={integrations}
                  keyResults={keyResults}
                  objectives={objectives}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Trigger Configuration */}
          <div className="space-y-6">
            {/* Trigger Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Trigger Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="enabled">Enabled</Label>
                  <Switch
                    id="enabled"
                    checked={enabled}
                    onCheckedChange={setEnabled}
                    data-testid="switch-enabled"
                  />
                </div>

                <div>
                  <Label htmlFor="trigger-type">Trigger Type</Label>
                  <Select value={triggerType} onValueChange={setTriggerType}>
                    <SelectTrigger id="trigger-type" data-testid="select-trigger-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map((trigger) => (
                        <SelectItem key={trigger.value} value={trigger.value}>
                          <div>
                            <div className="font-medium">{trigger.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {trigger.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {triggerType === 'schedule' && (
                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger id="frequency" data-testid="select-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCIES.map((freq) => (
                          <SelectItem key={freq.value} value={freq.value}>
                            {freq.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      Schedule Preview: Every {frequency.toLowerCase()}
                    </p>
                  </div>
                )}

                {triggerType === 'webhook' && (
                  <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <Label className="font-semibold">Webhook Configuration</Label>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Webhook Trigger</Label>
                      <Select
                        value={selectedTriggerId?.toString() || ''}
                        onValueChange={(value) => setSelectedTriggerId(parseInt(value))}
                      >
                        <SelectTrigger data-testid="select-webhook-trigger">
                          <SelectValue placeholder="Select a trigger event" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTriggers.map((trigger: any) => (
                            <SelectItem key={trigger.id} value={trigger.id.toString()}>
                              <div className="flex flex-col">
                                <span className="font-medium">{trigger.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {trigger.integrationName} • {trigger.triggerKey}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        This defines what type of data this workflow expects to receive. When external systems send webhooks to your endpoint, this selection tells aimee.works how to process and route the incoming data.
                      </p>
                    </div>                    
                    {webhookEndpoint && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Webhook Endpoint</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={webhookEndpoint}
                            readOnly
                            className="font-mono text-xs bg-white dark:bg-gray-800"
                            data-testid="input-webhook-endpoint"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(webhookEndpoint);
                              toast({
                                title: 'Copied!',
                                description: 'Webhook endpoint URL copied to clipboard',
                              });
                            }}
                            data-testid="button-copy-webhook"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Send POST requests to this endpoint to trigger the workflow
                        </p>
                      </div>
                    )}
                    
                    <div className="pt-3 border-t border-gray-200">
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-blue-600"
                        onClick={() => setShowEventLog(true)}
                        data-testid="link-view-events"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        View Recent Webhook Events
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workflow Definition (JSON View) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="definition">Workflow Definition (JSON)</Label>
                <Textarea
                  id="definition"
                  value={JSON.stringify(workflowSteps, null, 2)}
                  readOnly
                  className="font-mono text-xs"
                  rows={10}
                  data-testid="textarea-definition"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Webhook Event Log Dialog */}
      {showEventLog && workflow && (
        <WebhookEventLog
          open={showEventLog}
          onClose={() => setShowEventLog(false)}
          organizationId={workflow.organizationId}
          workflowId={workflow.id}
        />
      )}
    </div>
  );
}
