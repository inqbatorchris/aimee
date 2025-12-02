import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation, useSearch } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Workflow, Plus, Play, Pause, Edit, Trash2, Settings, Save, 
  GitBranch, Zap, Clock, Calendar, CheckCircle, XCircle,
  AlertCircle, History, Bot, ArrowRight, RefreshCw,
  Filter, Search, ChevronRight, Folder, Users, GripVertical, X
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { DndContext, DragOverlay, useDraggable, useSensors, useSensor, PointerSensor, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { AgentWorkflow, Integration, KeyResult, Team } from '@shared/schema';
import WorkflowStepBuilder from '@/components/workflow/WorkflowStepBuilder';
import { ProcessFolderNavigation } from '@/components/process-folders/ProcessFolderNavigation';

interface ProcessFolder {
  id: number;
  name: string;
  slug: string;
  folderType: string;
  parentId?: number | null;
  teamId?: number | null;
}

// Define WorkflowRun type locally until added to schema
interface WorkflowRun {
  id: number;
  workflowId: number;
  workflowName: string;
  status: 'running' | 'completed' | 'failed';
  triggerSource: string;
  startedAt: Date;
  completedAt?: Date;
  executionDuration?: number;
  stepsCompleted?: number;
  totalSteps?: number;
  executionLog?: any[];
  errorMessage?: string;
  resultData?: any;
}

// Agent User type
interface AgentUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
}

// Workflow creation schema
const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  triggerType: z.enum(['manual', 'schedule', 'webhook']),
  assignedUserId: z.number().int().positive({ message: 'Please select or create an agent user' }),
  triggerConfig: z.object({
    // Schedule-specific fields
    schedule: z.string().optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'hourly', 'custom']).optional(),
    hour: z.string().optional(),
    minute: z.string().optional(),
    days: z.record(z.string(), z.boolean()).optional(),
    dayOfMonth: z.string().optional(),
    
    // Webhook-specific fields
    triggerId: z.number().optional(),
    triggerKey: z.string().optional(),
  }).optional(),
  workflowDefinition: z.array(z.object({
    id: z.string(),
    type: z.enum(['integration_action', 'strategy_update', 'log_event', 'notification', 'data_source_query']),
    name: z.string(),
    config: z.any().optional(),
  })).default([]),
});

type CreateWorkflowForm = z.infer<typeof createWorkflowSchema>;

const TRIGGER_TYPES = {
  manual: { label: 'Manual', icon: Play, description: 'Trigger manually from the dashboard' },
  webhook: { label: 'Webhook', icon: Zap, description: 'Trigger when a webhook is received' },
  schedule: { label: 'Schedule', icon: Clock, description: 'Run on a schedule (cron expression)' },
} as const;

// Debug trigger types
console.log('TRIGGER_TYPES available:', Object.keys(TRIGGER_TYPES));

const ACTION_TYPES = {
  log_event: { label: 'Log Event', description: 'Log the webhook data to database' },
  notification: { label: 'Send Notification', description: 'Send a notification about the event' },
} as const;

export default function AgentBuilder() {
  const [selectedTab, setSelectedTab] = useState<'workflows' | 'runs'>('workflows');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<AgentWorkflow | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTriggerType, setFilterTriggerType] = useState<string>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);
  const [createAgentUserDialogOpen, setCreateAgentUserDialogOpen] = useState(false);
  const [newAgentUserName, setNewAgentUserName] = useState('');
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<number | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<AgentWorkflow | null>(null);
  const { toast} = useToast();
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);
  const searchString = useSearch();

  // Handle runId query parameter from URL (e.g., from webhook event log)
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const runIdParam = params.get('runId');
    if (runIdParam) {
      const runId = parseInt(runIdParam, 10);
      if (!isNaN(runId)) {
        // Switch to runs tab and expand the specified run
        setSelectedTab('runs');
        setExpandedRunId(runId);
      }
    }
  }, [searchString]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch workflows
  const { data: workflows, isLoading: workflowsLoading } = useQuery<AgentWorkflow[]>({
    queryKey: ['/api/agents/workflows'],
  });

  // Fetch workflow runs with auto-refresh for running workflows
  const { data: runs, isLoading: runsLoading } = useQuery<WorkflowRun[]>({
    queryKey: ['/api/agents/runs'],
    enabled: selectedTab === 'runs',
    refetchInterval: (data) => {
      // Poll every 2 seconds if any workflow is running
      const hasRunningWorkflows = Array.isArray(data) && data.some(run => run.status === 'running');
      return hasRunningWorkflows ? 2000 : false;
    },
  });

  // Memoized filtered runs based on team selection
  const filteredRuns = useMemo(() => {
    if (!runs || selectedTeamId === null) return runs;
    
    // Create a lookup map of workflowId to teamId for efficient filtering
    const workflowTeamMap = new Map<number, number | null | undefined>();
    workflows?.forEach(w => {
      workflowTeamMap.set(w.id, w.assignedTeamId);
    });

    // Filter runs based on selected team
    return runs.filter((run) => {
      const teamId = workflowTeamMap.get(run.workflowId);
      if (teamId === undefined) return true; // Show if workflow not found
      
      if (selectedTeamId === -1) {
        // "No team" filter
        return teamId === null || teamId === undefined;
      } else {
        // Specific team filter
        return teamId === selectedTeamId;
      }
    });
  }, [runs, workflows, selectedTeamId]);

  // Fetch available integrations
  const { data: integrations } = useQuery<Integration[]>({
    queryKey: ['/api/integrations'],
  });

  // Fetch key results for strategy updates
  const { data: keyResults } = useQuery<KeyResult[]>({
    queryKey: ['/api/strategy/key-results'],
  });

  // Fetch teams for filtering
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  // Fetch process folders for agents
  const { data: folders = [] } = useQuery<ProcessFolder[]>({
    queryKey: ['/api/workflows/folders', { folderType: 'agents' }],
    queryFn: async () => {
      const response = await fetch('/api/workflows/folders?folderType=agents');
      if (!response.ok) throw new Error('Failed to fetch folders');
      return response.json();
    },
  });

  // Fetch agent users
  const { data: agentUsers, isLoading: agentUsersLoading } = useQuery<AgentUser[]>({
    queryKey: ['/api/agents/agent-users'],
    enabled: createDialogOpen,
  });

  // Fetch all available webhook triggers from agents API
  const { data: webhookTriggers, isLoading: triggersLoading, error: triggersError } = useQuery<any[]>({
    queryKey: ['/api/agents/triggers'],
    enabled: createDialogOpen,
    select: (data) => {
      // All triggers from this endpoint are webhook triggers
      const webhooks = data || [];
      console.log('Webhook triggers loaded:', webhooks.length, 'triggers');
      return webhooks;
    },
  });
  
  // Log triggers error if any
  if (triggersError) {
    console.error('Error loading webhook triggers:', triggersError);
  }

  // Form for creating/editing workflows
  const form = useForm<CreateWorkflowForm>({
    resolver: zodResolver(createWorkflowSchema),
    defaultValues: {
      name: '',
      description: '',
      triggerType: 'manual',
      assignedUserId: 0,
      triggerConfig: {
        schedule: '',
        frequency: 'daily',
        hour: '0',
        minute: '0',
        days: {},
        dayOfMonth: '1',
        triggerId: undefined,
        triggerKey: '',
      },
      workflowDefinition: [],
    },
  });

  // Create agent user mutation
  const createAgentUserMutation = useMutation({
    mutationFn: async (name: string) => {
      const username = name.toLowerCase().replace(/\s+/g, '_');
      const email = `${username}@agent.local`;
      
      return apiRequest('/api/agents/agent-users', {
        method: 'POST',
        body: {
          username,
          fullName: name,
          email,
        },
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Agent user created',
        description: 'The agent user has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agents/agent-users'] });
      setCreateAgentUserDialogOpen(false);
      setNewAgentUserName('');
      
      // Auto-select the newly created agent user
      form.setValue('assignedUserId', data.id);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create agent user',
        description: error?.message || 'An error occurred while creating the agent user.',
        variant: 'destructive',
      });
    },
  });

  // Create workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: async (data: CreateWorkflowForm) => {
      return apiRequest('/api/agents/workflows', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Workflow created',
        description: 'Your workflow has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agents/workflows'] });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create workflow',
        description: error?.message || 'An error occurred while creating the workflow.',
        variant: 'destructive',
      });
    },
  });

  // Update workflow mutation
  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<AgentWorkflow>) => {
      return apiRequest(`/api/agents/workflows/${id}`, {
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Workflow updated',
        description: 'Your workflow has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agents/workflows'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update workflow',
        description: error?.message || 'An error occurred while updating the workflow.',
        variant: 'destructive',
      });
    },
  });

  // Delete workflow mutation
  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/agents/workflows/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Workflow deleted',
        description: 'Your workflow has been deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agents/workflows'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete workflow',
        description: error?.message || 'An error occurred while deleting the workflow.',
        variant: 'destructive',
      });
    },
  });

  // Execute workflow mutation
  const executeWorkflowMutation = useMutation({
    mutationFn: async (workflowId: number) => {
      return apiRequest(`/api/agents/workflows/${workflowId}/execute`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Workflow executed',
        description: 'Your workflow has been triggered successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agents/runs'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Execution failed',
        description: error?.message || 'An error occurred while executing the workflow.',
        variant: 'destructive',
      });
    },
  });

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const workflowId = parseInt(event.active.id.toString().replace('workflow-', ''));
    const workflow = workflows?.find(w => w.id === workflowId);
    setActiveWorkflow(workflow || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveWorkflow(null);
    const { active, over } = event;
    
    if (!over) return;
    
    const workflowId = parseInt(active.id.toString().replace('workflow-', ''));
    const overId = over.id.toString();
    
    let newTeamId: number | null = null;
    let newFolderId: number | null = null;
    
    if (overId === 'folder-root') {
      newFolderId = null;
      newTeamId = null;
    } else if (overId.startsWith('team-')) {
      newTeamId = parseInt(overId.replace('team-', ''));
      newFolderId = null;
    } else if (overId.startsWith('folder-')) {
      const folderId = overId.replace('folder-', '');
      newFolderId = parseInt(folderId);
      const folder = folders.find(f => f.id === newFolderId);
      newTeamId = folder?.teamId ?? null;
    }
    
    updateWorkflowMutation.mutate({
      id: workflowId,
      assignedTeamId: newTeamId,
      folderId: newFolderId,
    });
  };

  // Convert user-friendly schedule settings to cron expression
  const generateCronExpression = (triggerConfig: any) => {
    if (triggerConfig.frequency === 'custom') {
      return triggerConfig.schedule || '0 0 * * *';
    }

    const minute = triggerConfig.minute || '0';
    const hour = triggerConfig.hour || '0';

    switch (triggerConfig.frequency) {
      case 'hourly':
        return `${minute} * * * *`;
      
      case 'daily':
        return `${minute} ${hour} * * *`;
      
      case 'weekly': {
        const days = triggerConfig.days || {};
        const selectedDays = Object.entries(days)
          .filter(([_, selected]) => selected)
          .map(([dayIndex, _]) => dayIndex)
          .join(',');
        return `${minute} ${hour} * * ${selectedDays || '0'}`;
      }
      
      case 'monthly': {
        const dayOfMonth = triggerConfig.dayOfMonth === 'last' ? 'L' : (triggerConfig.dayOfMonth || '1');
        if (dayOfMonth === 'L') {
          // For last day of month, we'll use a different approach
          return `${minute} ${hour} 28-31 * *`;
        }
        return `${minute} ${hour} ${dayOfMonth} * *`;
      }
      
      default:
        return `${minute} ${hour} * * *`; // Default to daily
    }
  };

  const handleCreateWorkflow = (data: CreateWorkflowForm) => {
    // Generate cron expression for schedule triggers
    if (data.triggerType === 'schedule' && data.triggerConfig) {
      const cronExpression = generateCronExpression(data.triggerConfig);
      data.triggerConfig.schedule = cronExpression;
    }
    
    createWorkflowMutation.mutate(data);
  };
  
  const handleFormError = (errors: any) => {
    const errorMessages = Object.entries(errors)
      .map(([field, error]: [string, any]) => `${field}: ${error.message}`)
      .join(', ');
    
    toast({
      title: "Form validation failed",
      description: errorMessages || "Please check the form for errors",
      variant: "destructive",
    });
  };

  const handleToggleWorkflow = (workflow: AgentWorkflow) => {
    updateWorkflowMutation.mutate({
      id: workflow.id,
      isEnabled: !workflow.isEnabled,
    });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Agent Workflows
        </h2>
      </div>
      <ScrollArea className="flex-1 p-2">
        <ProcessFolderNavigation
          folderType="agents"
          selectedFolderId={selectedFolderId}
          onFolderSelect={setSelectedFolderId}
          selectedTeamId={selectedTeamId}
          onTeamSelect={setSelectedTeamId}
          showTeamFilter={true}
          isDragging={activeWorkflow !== null}
          items={workflows?.map(w => ({ teamId: w.assignedTeamId, folderId: (w as any).folderId })) || []}
        />
      </ScrollArea>
    </div>
  );

  const DraggableWorkflowCard = ({ workflow }: { workflow: AgentWorkflow }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: `workflow-${workflow.id}`,
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const triggerConfig = TRIGGER_TYPES[workflow.triggerType as keyof typeof TRIGGER_TYPES];
    const TriggerIcon = triggerConfig?.icon || Zap;
    const team = teams.find(t => t.id === workflow.assignedTeamId);

    return (
      <Card 
        ref={setNodeRef}
        style={style}
        className={cn(
          "hover:shadow-sm transition-shadow group cursor-pointer overflow-hidden",
          isDragging && "opacity-50 shadow-lg"
        )}
        onClick={() => !isDragging && navigate(`/agents/workflows/${workflow.id}/edit`)}
        data-testid={`card-workflow-${workflow.id}`}
      >
        <CardContent className="p-3 overflow-hidden">
          {/* Title row with drag handle and switch */}
          <div className="flex items-start gap-2 mb-2">
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="flex-1 min-w-0 font-medium text-sm leading-tight">
              {workflow.name}
            </h3>
            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={workflow.isEnabled}
                onCheckedChange={() => handleToggleWorkflow(workflow)}
                data-testid={`switch-workflow-${workflow.id}`}
              />
            </div>
          </div>
          
          {/* Description */}
          {workflow.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {workflow.description}
            </p>
          )}
          
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1 mb-2">
            <Badge variant="outline" className="text-[11px] px-1.5 py-0 flex items-center gap-1">
              <TriggerIcon className="h-3 w-3" />
              {triggerConfig?.label}
            </Badge>
            <Badge variant={workflow.isEnabled ? "default" : "secondary"} className="text-[11px] px-1.5 py-0">
              {workflow.isEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          
          {/* Team/Folder info */}
          {(workflow.assignedTeamId || (workflow as any).folderId) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              {team && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {team.name}
                </span>
              )}
            </div>
          )}

          {/* Last run */}
          {workflow.lastRunAt && (
            <div className="text-xs text-muted-foreground mb-2">
              Last run: {new Date(workflow.lastRunAt).toLocaleDateString()}
            </div>
          )}
          
          {/* Action buttons row */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                executeWorkflowMutation.mutate(workflow.id);
              }}
              disabled={!workflow.isEnabled || workflow.triggerType !== 'manual'}
              className="h-7 text-xs px-2"
              data-testid={`button-run-${workflow.id}`}
            >
              <Play className="h-3 w-3 mr-1" />
              Run
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteWorkflowId(workflow.id);
              }}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              data-testid={`button-delete-${workflow.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <div className="flex h-[calc(100vh-64px)] flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r bg-muted/30 flex-col">
        <SidebarContent />
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        {/* Mobile Filter Chips */}
        <div className="md:hidden border-b bg-muted/30 overflow-x-auto">
          <ScrollArea className="w-full h-auto">
            <div className="flex gap-2 p-3 whitespace-nowrap">
              <Button
                variant={selectedTeamId === null && selectedFolderId === null ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedTeamId(null);
                  setSelectedFolderId(null);
                }}
                className="shrink-0 h-8 text-xs px-3"
              >
                All
              </Button>
              <Button
                variant={selectedTeamId === -1 ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedTeamId(-1);
                  setSelectedFolderId(null);
                }}
                className="shrink-0 h-8 text-xs px-3"
              >
                No team
              </Button>
              {workflows?.reduce((acc: any[], w) => {
                if (w.assignedTeamId && !acc.find(team => team.id === w.assignedTeamId)) {
                  const team = teams.find(team => team.id === w.assignedTeamId);
                  if (team) acc.push(team);
                }
                return acc;
              }, []).map((team) => (
                <Button
                  key={team.id}
                  variant={selectedTeamId === team.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedTeamId(team.id);
                    setSelectedFolderId(null);
                  }}
                  className="shrink-0 h-8 text-xs px-3"
                >
                  {team.name}
                </Button>
              ))}
              {selectedTeamId !== null && selectedTeamId !== -1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTeamId(null)}
                  className="shrink-0 h-8 text-xs px-2 ml-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 sm:px-6 py-6">
            {/* Tabs */}
            <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'workflows' | 'runs')}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <TabsList>
                  <TabsTrigger value="workflows" data-testid="tab-workflows">
                    <Workflow className="mr-2 h-4 w-4" />
                    Workflows ({workflows?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="runs" data-testid="tab-runs">
                    <History className="mr-2 h-4 w-4" />
                    Run History
                  </TabsTrigger>
                </TabsList>
                <Link href="/integrations">
                  <Button variant="outline" size="sm" data-testid="button-integrations">
                    <Settings className="h-4 w-4 mr-2" />
                    Integrations
                  </Button>
                </Link>
              </div>

              {/* Workflows Tab */}
              <TabsContent value="workflows">
                <div className="mb-4">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-workflow">
                  <Plus className="mr-2 h-4 w-4" />
                  New Workflow
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Workflow</DialogTitle>
                  <DialogDescription>
                    Build an automation workflow with triggers and actions
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateWorkflow, handleFormError)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="My Workflow" data-testid="input-workflow-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="What does this workflow do?"
                              data-testid="input-workflow-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="assignedUserId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agent User</FormLabel>
                          <div className="flex gap-2">
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value > 0 ? field.value.toString() : ''}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-agent-user" className="flex-1">
                                  <SelectValue placeholder={agentUsersLoading ? "Loading..." : "Select or create an agent user"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="z-[9999] bg-background border shadow-lg">
                                {agentUsers && agentUsers.length > 0 ? (
                                  agentUsers.map((user) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                      <div className="flex items-center">
                                        <Bot className="mr-2 h-4 w-4" />
                                        {user.fullName || user.username}
                                      </div>
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="none" disabled>
                                    No agent users found
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <Dialog open={createAgentUserDialogOpen} onOpenChange={setCreateAgentUserDialogOpen}>
                              <DialogTrigger asChild>
                                <Button type="button" variant="outline" size="icon" data-testid="button-create-agent-user">
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Create Agent User</DialogTitle>
                                  <DialogDescription>
                                    Create a new agent user to represent this workflow in activity logs
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="agent-name">Agent Name</Label>
                                    <Input
                                      id="agent-name"
                                      placeholder="e.g., Splynx Data Agent"
                                      value={newAgentUserName}
                                      onChange={(e) => setNewAgentUserName(e.target.value)}
                                      data-testid="input-agent-name"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => setCreateAgentUserDialogOpen(false)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={() => createAgentUserMutation.mutate(newAgentUserName)}
                                      disabled={!newAgentUserName || createAgentUserMutation.isPending}
                                      data-testid="button-confirm-create-agent"
                                    >
                                      {createAgentUserMutation.isPending ? 'Creating...' : 'Create'}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                          <FormDescription>
                            This agent user will be shown in activity logs as the performer of this workflow's actions
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="triggerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trigger Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-trigger-type">
                                <SelectValue placeholder="Select a trigger" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="z-[9999] bg-background border shadow-lg">
                              {Object.entries(TRIGGER_TYPES).map(([value, config]) => {
                                console.log('Rendering trigger type:', value, config.label);
                                return (
                                  <SelectItem key={value} value={value} className="cursor-pointer hover:bg-accent">
                                    <div className="flex items-center">
                                      <config.icon className="mr-2 h-4 w-4" />
                                      {config.label}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {TRIGGER_TYPES[form.watch('triggerType') as keyof typeof TRIGGER_TYPES]?.description}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch('triggerType') === 'schedule' && (
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Schedule Configuration</h4>
                        </div>
                        
                        {/* Frequency Selection */}
                        <FormField
                          control={form.control}
                          name="triggerConfig.frequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Run Frequency</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || 'daily'}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-frequency">
                                    <SelectValue placeholder="Select frequency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="z-[9999] bg-background border shadow-lg">
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="hourly">Every Hour</SelectItem>
                                  <SelectItem value="custom">Custom (Advanced)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Time Selection */}
                        {(form.watch('triggerConfig.frequency') === 'daily' || 
                          form.watch('triggerConfig.frequency') === 'weekly' || 
                          form.watch('triggerConfig.frequency') === 'monthly') && (
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="triggerConfig.hour"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Hour</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || '0'}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-hour">
                                        <SelectValue placeholder="Hour" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="z-[9999] bg-background border shadow-lg max-h-[200px]">
                                      {Array.from({ length: 24 }, (_, i) => (
                                        <SelectItem key={i} value={i.toString()}>
                                          {i.toString().padStart(2, '0')}:00
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="triggerConfig.minute"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Minute</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || '0'}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-minute">
                                        <SelectValue placeholder="Minute" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="z-[9999] bg-background border shadow-lg max-h-[200px]">
                                      {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                                        <SelectItem key={minute} value={minute.toString()}>
                                          :{minute.toString().padStart(2, '0')}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        {/* Weekly Day Selection */}
                        {form.watch('triggerConfig.frequency') === 'weekly' && (
                          <FormItem>
                            <FormLabel>Days of Week</FormLabel>
                            <div className="grid grid-cols-7 gap-2 mt-2">
                              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                                <div key={day} className="flex flex-col items-center space-y-1">
                                  <label htmlFor={`day-${index}`} className="text-xs font-medium">
                                    {day}
                                  </label>
                                  <FormField
                                    control={form.control}
                                    name={`triggerConfig.days.${index}`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <input
                                            type="checkbox"
                                            id={`day-${index}`}
                                            className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                                            checked={field.value || false}
                                            onChange={field.onChange}
                                            data-testid={`checkbox-day-${index}`}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              ))}
                            </div>
                            <FormDescription>
                              Select which days of the week to run the workflow
                            </FormDescription>
                          </FormItem>
                        )}

                        {/* Monthly Day Selection */}
                        {form.watch('triggerConfig.frequency') === 'monthly' && (
                          <FormField
                            control={form.control}
                            name="triggerConfig.dayOfMonth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Day of Month</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || '1'}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-day-of-month">
                                      <SelectValue placeholder="Select day" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="z-[9999] bg-background border shadow-lg max-h-[200px]">
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                      <SelectItem key={day} value={day.toString()}>
                                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each month
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="last">Last day of month</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {/* Custom Cron Expression (Advanced) */}
                        {form.watch('triggerConfig.frequency') === 'custom' && (
                          <FormField
                            control={form.control}
                            name="triggerConfig.schedule"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Custom Cron Expression</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="0 0 * * *" data-testid="input-cron" />
                                </FormControl>
                                <FormDescription>
                                  Enter a custom cron expression. Use this for advanced scheduling patterns.
                                  <br />
                                  Examples: "0 */2 * * *" (every 2 hours), "30 9 * * 1-5" (9:30 AM weekdays)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {/* Generated Schedule Preview */}
                        {form.watch('triggerConfig.frequency') !== 'custom' && (
                          <div className="text-sm text-muted-foreground bg-background p-3 rounded border">
                            <strong>Schedule Preview:</strong>{' '}
                            {(() => {
                              const freq = form.watch('triggerConfig.frequency') || 'daily';
                              const hour = form.watch('triggerConfig.hour') || '0';
                              const minute = form.watch('triggerConfig.minute') || '0';
                              const days = form.watch('triggerConfig.days') || {};
                              const dayOfMonth = form.watch('triggerConfig.dayOfMonth') || '1';
                              
                              const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                              
                              if (freq === 'hourly') return 'Every hour';
                              if (freq === 'daily') return `Daily at ${timeStr}`;
                              if (freq === 'weekly') {
                                const selectedDays = Object.entries(days)
                                  .filter(([_, selected]) => selected)
                                  .map(([dayIndex, _]) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(dayIndex)])
                                  .join(', ');
                                return selectedDays ? `Weekly on ${selectedDays} at ${timeStr}` : `Weekly at ${timeStr} (no days selected)`;
                              }
                              if (freq === 'monthly') {
                                const dayText = dayOfMonth === 'last' ? 'last day' : `${dayOfMonth}${dayOfMonth === '1' ? 'st' : dayOfMonth === '2' ? 'nd' : dayOfMonth === '3' ? 'rd' : 'th'}`;
                                return `Monthly on the ${dayText} at ${timeStr}`;
                              }
                              return 'Custom schedule';
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {form.watch('triggerType') === 'webhook' && (
                      <FormField
                        control={form.control}
                        name="triggerConfig.triggerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Webhook Trigger</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                const trigger = webhookTriggers?.find((t: any) => t.id === Number(value));
                                field.onChange(Number(value));
                                form.setValue('triggerConfig.triggerKey', trigger?.trigger_key || '');
                              }}
                              value={field.value?.toString()}
                              disabled={triggersLoading}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-webhook-trigger">
                                  <SelectValue placeholder={
                                    triggersLoading 
                                      ? "Loading webhook triggers..." 
                                      : webhookTriggers?.length === 0 
                                      ? "No webhook triggers available" 
                                      : "Select a webhook trigger"
                                  } />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="z-[9999] bg-background border shadow-lg">
                                {triggersLoading ? (
                                  <SelectItem value="loading" disabled>
                                    Loading triggers...
                                  </SelectItem>
                                ) : webhookTriggers?.length === 0 ? (
                                  <SelectItem value="none" disabled>
                                    No webhook triggers found
                                  </SelectItem>
                                ) : (
                                  webhookTriggers?.map((trigger: any) => (
                                    <SelectItem key={trigger.id} value={trigger.id.toString()} className="cursor-pointer hover:bg-accent">
                                      <div className="flex flex-col">
                                        <span>{trigger.name}</span>
                                        {trigger.description && (
                                          <span className="text-xs text-muted-foreground">
                                            {trigger.description.substring(0, 60)}
                                            {trigger.description.length > 60 ? '...' : ''}
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {webhookTriggers && webhookTriggers.length > 0 
                                ? `Choose from ${webhookTriggers.length} available webhook events`
                                : 'Select the webhook event that will trigger this workflow'}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Workflow Steps Definition */}
                    <FormField
                      control={form.control}
                      name="workflowDefinition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Workflow Steps</FormLabel>
                          <FormDescription>
                            Define the actions this workflow will perform
                          </FormDescription>
                          <FormControl>
                            <WorkflowStepBuilder
                              steps={field.value}
                              onChange={field.onChange}
                              integrations={integrations}
                              keyResults={keyResults}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createWorkflowMutation.isPending}>
                        <Save className="mr-2 h-4 w-4" />
                        Create Workflow
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filtering Controls */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 flex-wrap items-center">
            <div className="w-full sm:max-w-md">
              <Input
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-workflows"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[130px]" data-testid="select-filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTriggerType} onValueChange={setFilterTriggerType}>
              <SelectTrigger className="w-full sm:w-[130px]" data-testid="select-filter-trigger">
                <SelectValue placeholder="Trigger" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Triggers</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="schedule">Schedule</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {workflowsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading workflows...</p>
              </div>
            </div>
          ) : workflows?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Workflow className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Workflows Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first automation workflow to get started
                </p>
                <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-get-started">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows
                ?.filter((workflow) => {
                  const matchesStatus = filterStatus === 'all' || 
                    (filterStatus === 'enabled' && workflow.isEnabled) ||
                    (filterStatus === 'disabled' && !workflow.isEnabled);
                  
                  const matchesTrigger = filterTriggerType === 'all' || 
                    workflow.triggerType === filterTriggerType;
                  
                  let matchesTeam = true;
                  if (selectedTeamId === -1) {
                    matchesTeam = workflow.assignedTeamId === null || workflow.assignedTeamId === undefined;
                  } else if (selectedTeamId !== null) {
                    matchesTeam = workflow.assignedTeamId === selectedTeamId;
                  }
                  
                  const matchesFolder = selectedFolderId === null || 
                    (workflow as any).folderId === selectedFolderId;
                  
                  const matchesSearch = !searchQuery || 
                    workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());
                  
                  return matchesStatus && matchesTrigger && matchesTeam && matchesFolder && matchesSearch;
                })
                .map((workflow) => (
                  <DraggableWorkflowCard key={workflow.id} workflow={workflow} />
                ))}
            </div>
          )}
        </TabsContent>

        {/* Run History Tab */}
        <TabsContent value="runs">
          {runsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading run history...</p>
              </div>
            </div>
          ) : runs?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Workflow Runs</h3>
                <p className="text-muted-foreground text-center">
                  Your workflow execution history will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Workflow Execution History</CardTitle>
                <CardDescription>
                  View the status and details of recent workflow runs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredRuns?.map((run) => (
                    <div key={run.id} className="border rounded-lg overflow-hidden">
                      <div 
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          {run.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5 sm:mt-0" />
                          ) : run.status === 'failed' ? (
                            <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5 sm:mt-0" />
                          ) : (
                            <RefreshCw className="h-5 w-5 text-blue-500 animate-spin shrink-0 mt-0.5 sm:mt-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{run.workflowName}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {new Date(run.startedAt).toLocaleString()} • {run.triggerSource}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-8 sm:ml-0">
                          {run.executionDuration && (
                            <Badge variant="outline" className="shrink-0">
                              {run.executionDuration}ms
                            </Badge>
                          )}
                          {run.totalSteps && (
                            <Badge variant="outline" className="shrink-0">
                              {run.stepsCompleted}/{run.totalSteps} steps
                            </Badge>
                          )}
                          <Badge variant={
                            run.status === 'completed' ? 'default' : 
                            run.status === 'failed' ? 'destructive' : 
                            'secondary'
                          } className="shrink-0">
                            {run.status}
                          </Badge>
                          <ChevronRight className={`h-4 w-4 transition-transform shrink-0 ${expandedRunId === run.id ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                      
                      {expandedRunId === run.id && (
                        <div className="border-t bg-muted/30 p-4">
                          <div className="space-y-4">
                            {/* Error Message */}
                            {run.errorMessage && (
                              <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                                <p className="text-sm font-medium text-destructive mb-1">Error</p>
                                <p className="text-sm text-destructive/80">{run.errorMessage}</p>
                              </div>
                            )}
                            
                            {/* Execution Log */}
                            {run.executionLog && run.executionLog.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">Execution Log</p>
                                <div className="bg-black/5 dark:bg-black/20 rounded-lg p-3 space-y-2 max-h-96 overflow-y-auto">
                                  {run.executionLog.map((log: any, idx: number) => (
                                    <div key={idx} className="text-xs font-mono">
                                      <div className="flex items-start gap-2">
                                        <Badge variant={log.success ? 'default' : 'destructive'} className="shrink-0">
                                          Step {log.step}
                                        </Badge>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold">{log.name}</span>
                                            <span className="text-muted-foreground">({log.type})</span>
                                            <span className="text-muted-foreground">• {log.duration}ms</span>
                                          </div>
                                          {log.error && (
                                            <div className="text-destructive mt-1">❌ {log.error}</div>
                                          )}
                                          {log.output && (
                                            <div className="mt-1 text-muted-foreground">
                                              <details>
                                                <summary className="cursor-pointer">View output</summary>
                                                <pre className="mt-1 p-2 bg-black/10 dark:bg-black/30 rounded">
                                                  {JSON.stringify(log.output, null, 2)}
                                                </pre>
                                              </details>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Result Data */}
                            {run.resultData && Object.keys(run.resultData).length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">Result Data</p>
                                <pre className="bg-black/5 dark:bg-black/20 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                                  {JSON.stringify(run.resultData, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteWorkflowId !== null} onOpenChange={(open) => !open && setDeleteWorkflowId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Workflow</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this workflow? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteWorkflowId(null)}
                data-testid="button-cancel-delete"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteWorkflowId !== null) {
                    deleteWorkflowMutation.mutate(deleteWorkflowId);
                    setDeleteWorkflowId(null);
                  }
                }}
                data-testid="button-confirm-delete"
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
      
      <DragOverlay>
        {activeWorkflow && (
          <Card className="w-64 shadow-lg opacity-90">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm truncate">{activeWorkflow.name}</CardTitle>
            </CardHeader>
          </Card>
        )}
      </DragOverlay>
    </div>
    </DndContext>
  );
}