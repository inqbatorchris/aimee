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
import { ArrowLeft, Save, Play, Settings, Bot } from 'lucide-react';
import WorkflowStepBuilder from '@/components/workflow/WorkflowStepBuilder';
import type { Integration, AgentWorkflow, KeyResult, Objective, User } from '@shared/schema';

interface WorkflowStep {
  id: string;
  type: 'integration_action' | 'strategy_update' | 'log_event' | 'notification';
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
      
      // Parse workflow definition
      const definition = workflow.workflowDefinition || [];
      setWorkflowSteps(Array.isArray(definition) ? definition : []);
    }
  }, [workflow]);

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
                  <div>
                    <Label>Webhook URL</Label>
                    <div className="mt-1 p-2 bg-muted rounded text-xs font-mono break-all">
                      {window.location.origin}/api/webhooks/workflow/{id}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      POST to this URL to trigger the workflow
                    </p>
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
    </div>
  );
}
