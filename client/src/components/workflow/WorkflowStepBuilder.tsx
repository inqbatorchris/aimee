import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Settings, Zap, Target, AlertCircle, Database, Calculator, Cloud, Repeat, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { Integration, KeyResult, Objective } from '@shared/schema';
import DataSourceQueryBuilder from './DataSourceQueryBuilder';
import SplynxQueryBuilder from './SplynxQueryBuilder';
import { VariableFieldPicker } from './VariableFieldPicker';
import { DataInspectorPanel } from './DataInspectorPanel';

interface WorkflowStep {
  id: string;
  type: 'integration_action' | 'strategy_update' | 'log_event' | 'notification' | 'data_source_query' | 'data_transformation' | 'splynx_query' | 'for_each' | 'create_work_item';
  name: string;
  config?: any;
}

interface WorkflowStepBuilderProps {
  steps: WorkflowStep[];
  onChange: (steps: WorkflowStep[]) => void;
  integrations?: Integration[];
  keyResults?: KeyResult[];
  objectives?: Objective[];
}

const STEP_TYPES = {
  integration_action: {
    label: 'Integration Action',
    icon: Zap,
    color: 'bg-blue-500',
    description: 'Execute an action with an external service'
  },
  strategy_update: {
    label: 'Update Strategy',
    icon: Target,
    color: 'bg-green-500',
    description: 'Update a Key Result or Objective'
  },
  data_source_query: {
    label: 'Data Source Query',
    icon: Database,
    color: 'bg-cyan-500',
    description: 'Query app data tables and update KPIs'
  },
  splynx_query: {
    label: 'Splynx Query',
    icon: Cloud,
    color: 'bg-indigo-500',
    description: 'Query Splynx customers, leads, tickets, or tasks'
  },
  for_each: {
    label: 'For Each Loop',
    icon: Repeat,
    color: 'bg-violet-500',
    description: 'Iterate over a list and execute child steps'
  },
  create_work_item: {
    label: 'Create Work Item',
    icon: ClipboardList,
    color: 'bg-emerald-500',
    description: 'Create a task/work item in the platform'
  },
  data_transformation: {
    label: 'Data Transformation',
    icon: Calculator,
    color: 'bg-orange-500',
    description: 'Transform data using formulas and calculations'
  },
  log_event: {
    label: 'Log Event',
    icon: AlertCircle,
    color: 'bg-gray-500',
    description: 'Log data for debugging'
  },
  notification: {
    label: 'Send Notification',
    icon: AlertCircle,
    color: 'bg-purple-500',
    description: 'Send a notification'
  }
};

export default function WorkflowStepBuilder({ 
  steps = [], 
  onChange, 
  integrations = [], 
  keyResults = [],
  objectives = []
}: WorkflowStepBuilderProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [splynxProjects, setSplynxProjects] = useState<Array<{ id: number; title: string }>>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [cachedIntegrationId, setCachedIntegrationId] = useState<number | null>(null);

  // Auto-fix any strategy_update steps missing the required 'type' field
  useEffect(() => {
    const needsFixing = steps.some(
      step => step.type === 'strategy_update' && !step.config?.type
    );
    
    if (needsFixing) {
      const fixed = steps.map(step => {
        if (step.type === 'strategy_update' && !step.config?.type) {
          return {
            ...step,
            config: { ...step.config, type: 'key_result' }
          };
        }
        return step;
      });
      onChange(fixed);
    }
  }, [steps, onChange]);

  // Fetch Splynx projects when needed
  useEffect(() => {
    const taskCreationStep = steps.find(
      step => step.type === 'integration_action' && 
      step.config?.action === 'create_splynx_task'
    );

    // Normalize undefined to null for comparison
    const normalizedIntegrationId = taskCreationStep?.config?.integrationId ?? null;

    // Reset projects when integration changes (comparing normalized values)
    if (normalizedIntegrationId !== cachedIntegrationId) {
      // Only update state if there's an actual change to avoid redundant renders
      if (splynxProjects.length > 0 || projectsError !== null || cachedIntegrationId !== normalizedIntegrationId) {
        setSplynxProjects([]);
        setProjectsError(null);
        setCachedIntegrationId(normalizedIntegrationId);
      }
      
      // If no integration, just clear and return
      if (!normalizedIntegrationId) {
        return;
      }
    }

    // Fetch projects for the current integration
    if (normalizedIntegrationId && splynxProjects.length === 0 && !loadingProjects && !projectsError) {
      setLoadingProjects(true);
      
      const token = localStorage.getItem('authToken'); // Fixed: Use correct token key
      console.log('Fetching Splynx projects with integrationId:', normalizedIntegrationId);
      console.log('Token available:', !!token);
      
      fetch(`/api/integrations/splynx/projects?integrationId=${normalizedIntegrationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(async res => {
          console.log('Splynx projects response status:', res.status);
          if (!res.ok) {
            if (res.status === 401) {
              throw new Error('Authentication expired. Please log out and log back in.');
            }
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch projects');
          }
          return res.json();
        })
        .then(data => {
          console.log('Splynx projects received:', data);
          if (data.projects && Array.isArray(data.projects)) {
            setSplynxProjects(data.projects);
          } else {
            setProjectsError('Invalid response from server');
          }
        })
        .catch(err => {
          console.error('Failed to fetch Splynx projects:', err);
          setProjectsError(err.message || 'Failed to load projects. Check Splynx integration configuration.');
        })
        .finally(() => setLoadingProjects(false));
    }
  }, [steps, cachedIntegrationId, splynxProjects.length, loadingProjects, projectsError]);

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      type: 'integration_action',
      name: 'New Step',
      config: {}
    };
    onChange([...steps, newStep]);
    setExpandedStep(newStep.id);
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    onChange(steps.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const removeStep = (stepId: string) => {
    onChange(steps.filter(step => step.id !== stepId));
    if (expandedStep === stepId) {
      setExpandedStep(null);
    }
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex >= 0 && swapIndex < steps.length) {
      [newSteps[index], newSteps[swapIndex]] = [newSteps[swapIndex], newSteps[index]];
      onChange(newSteps);
    }
  };

  const renderStepConfig = (step: WorkflowStep, stepIndex: number) => {
    switch (step.type) {
      case 'integration_action':
        return (
          <div className="space-y-4">
            <div>
              <Label>Integration</Label>
              <Select
                value={step.config.integrationId?.toString()}
                onValueChange={(value) => updateStep(step.id, {
                  config: { ...step.config, integrationId: parseInt(value) }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select integration" />
                </SelectTrigger>
                <SelectContent>
                  {integrations.map(integration => (
                    <SelectItem key={integration.id} value={integration.id.toString()}>
                      {integration.name} ({integration.platformType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {step.config.integrationId && integrations.find(i => i.id === step.config.integrationId)?.platformType === 'splynx' && (
              <div>
                <Label>Action</Label>
                <Select
                  value={step.config.action}
                  onValueChange={(value) => updateStep(step.id, {
                    config: { ...step.config, action: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count_leads">Count Leads</SelectItem>
                    <SelectItem value="count_customers">Count Customers</SelectItem>
                    <SelectItem value="get_revenue">Get Revenue</SelectItem>
                    <SelectItem value="get_tickets">Get Support Tickets</SelectItem>
                    <SelectItem value="create_splynx_task">Create Splynx Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(step.config.action === 'count_leads' || step.config.action === 'count_customers') && (
              <div className="space-y-3">
                <div>
                  <Label>Date Range</Label>
                  <Select
                    value={step.config.parameters?.dateRange || 'last_hour'}
                    onValueChange={(value) => updateStep(step.id, {
                      config: { 
                        ...step.config, 
                        parameters: { ...step.config.parameters, dateRange: value }
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last_hour">Last Hour</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                      <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status Filter (optional)</Label>
                  <Input
                    placeholder="e.g., lead, new, pending"
                    value={step.config.parameters?.statusFilter || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        parameters: { ...step.config.parameters, statusFilter: e.target.value }
                      }
                    })}
                  />
                </div>
              </div>
            )}

            {step.config.action === 'create_splynx_task' && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">💡 Variable Helper</p>
                  <p className="text-blue-800 dark:text-blue-200 text-xs">
                    When inside a for_each loop, use <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{`{{currentItem.fieldName}}`}</code> to access item properties.
                    <br />Example: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{`{{currentItem.id}}`}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{`{{currentItem.name}}`}</code>
                  </p>
                </div>

                <div>
                  <Label>Task Name</Label>
                  <Input
                    placeholder="e.g., Follow up: {{currentItem.name}}"
                    value={step.config.parameters?.taskName || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        parameters: { ...step.config.parameters, taskName: e.target.value }
                      }
                    })}
                  />
                </div>

                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea
                    placeholder="e.g., Customer ID: {{currentItem.id}}"
                    value={step.config.parameters?.description || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        parameters: { ...step.config.parameters, description: e.target.value }
                      }
                    })}
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label>Project/Task Type</Label>
                  {projectsError ? (
                    <div className="space-y-2">
                      <div className="text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded">
                        {projectsError}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setProjectsError(null);
                          setSplynxProjects([]);
                        }}
                      >
                        Retry Loading Projects
                      </Button>
                    </div>
                  ) : loadingProjects ? (
                    <div className="text-sm text-muted-foreground p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                      Loading projects from Splynx...
                    </div>
                  ) : splynxProjects.length > 0 ? (
                    <Select
                      value={step.config.parameters?.projectId?.toString() || ''}
                      onValueChange={(value) => updateStep(step.id, {
                        config: {
                          ...step.config,
                          parameters: { ...step.config.parameters, projectId: parseInt(value) }
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project/task type" />
                      </SelectTrigger>
                      <SelectContent>
                        {splynxProjects.map(project => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-amber-600 dark:text-amber-400 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded">
                      No projects configured. Add task types in Splynx first.
                    </div>
                  )}
                </div>

                <div>
                  <Label>Customer ID</Label>
                  <Input
                    placeholder="{{currentItem.id}}"
                    value={step.config.parameters?.customerId || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        parameters: { ...step.config.parameters, customerId: e.target.value }
                      }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Link this task to a Splynx customer
                  </p>
                </div>

                <div>
                  <Label>Address (Optional)</Label>
                  <Input
                    placeholder="e.g., {{currentItem.address}}"
                    value={step.config.parameters?.address || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        parameters: { ...step.config.parameters, address: e.target.value }
                      }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Task location/address
                  </p>
                </div>

                <div>
                  <Label>Assignee ID (Optional)</Label>
                  <Input
                    placeholder="e.g., 3"
                    type="number"
                    value={step.config.parameters?.assignee || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        parameters: { ...step.config.parameters, assignee: e.target.value ? parseInt(e.target.value) : undefined }
                      }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Splynx user ID to assign this task to
                  </p>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select
                    value={step.config.parameters?.priority || 'priority_medium'}
                    onValueChange={(value) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        parameters: { ...step.config.parameters, priority: value }
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="priority_low">Low</SelectItem>
                      <SelectItem value="priority_medium">Medium</SelectItem>
                      <SelectItem value="priority_high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Scheduled Start Date</Label>
                  <Input
                    placeholder="e.g., +7 days or YYYY-MM-DD HH:mm"
                    value={step.config.parameters?.scheduledFrom || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        parameters: { ...step.config.parameters, scheduledFrom: e.target.value }
                      }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use +N days for relative dates (defaults to 9 AM)
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`is-scheduled-${step.id}`}
                    checked={step.config.parameters?.isScheduled ?? true}
                    onChange={(e) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        parameters: { ...step.config.parameters, isScheduled: e.target.checked }
                      }
                    })}
                    className="rounded"
                  />
                  <Label htmlFor={`is-scheduled-${step.id}`}>Mark as Scheduled</Label>
                </div>

                <div>
                  <Label>Duration (Optional)</Label>
                  <Input
                    placeholder="e.g., 0h 30m"
                    value={step.config.parameters?.duration || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        parameters: { ...step.config.parameters, duration: e.target.value }
                      }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Task duration in format: 0h 30m
                  </p>
                </div>

                <div>
                  <Label>Due Date (Optional)</Label>
                  <Input
                    placeholder="e.g., +14 days or YYYY-MM-DD"
                    value={step.config.parameters?.dueDate || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        parameters: { ...step.config.parameters, dueDate: e.target.value }
                      }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    End date for task completion
                  </p>
                </div>

                <div>
                  <Label>Workflow Status ID</Label>
                  <Input
                    placeholder="e.g., 24"
                    type="number"
                    value={step.config.parameters?.workflowStatusId || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        parameters: { ...step.config.parameters, workflowStatusId: e.target.value ? parseInt(e.target.value) : undefined }
                      }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The workflow status for this task (check your Splynx project settings)
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label>Store Result As</Label>
              <Input
                placeholder="e.g., leadCount"
                value={step.config.resultVariable || ''}
                onChange={(e) => updateStep(step.id, {
                  config: { ...step.config, resultVariable: e.target.value }
                })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use this variable in the next steps as {`{${step.config.resultVariable || 'resultName'}}`}
              </p>
            </div>
          </div>
        );

      case 'strategy_update':
        const targetType = step.config?.type || 'key_result';
        const useDynamicTarget = step.config?.useDynamicTarget || false;
        
        return (
          <div className="space-y-4">
            <div>
              <Label>Target Type</Label>
              <Select
                value={targetType}
                onValueChange={(value) => updateStep(step.id, {
                  config: { ...step.config, type: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="key_result">Key Result</SelectItem>
                  <SelectItem value="objective">Objective</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`dynamic-target-${step.id}`}
                checked={useDynamicTarget}
                onChange={(e) => updateStep(step.id, {
                  config: { 
                    ...step.config, 
                    useDynamicTarget: e.target.checked,
                    targetId: e.target.checked ? undefined : step.config.targetId,
                    targetIdVariable: e.target.checked ? step.config.targetIdVariable : undefined,
                  }
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor={`dynamic-target-${step.id}`} className="text-sm font-medium">
                Use dynamic target from variable
              </label>
            </div>

            {!useDynamicTarget && targetType === 'key_result' && (
              <div>
                <Label>Key Result</Label>
                <Select
                  value={step.config.targetId?.toString()}
                  onValueChange={(value) => updateStep(step.id, {
                    config: { ...step.config, targetId: parseInt(value) }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Key Result to update" />
                  </SelectTrigger>
                  <SelectContent>
                    {keyResults.map(kr => (
                      <SelectItem key={kr.id} value={kr.id.toString()}>
                        {kr.title} (Current: {kr.currentValue}/{kr.targetValue})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!useDynamicTarget && targetType === 'objective' && (
              <div>
                <Label>Objective</Label>
                <Select
                  value={step.config.targetId?.toString()}
                  onValueChange={(value) => updateStep(step.id, {
                    config: { ...step.config, targetId: parseInt(value) }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Objective to update" />
                  </SelectTrigger>
                  <SelectContent>
                    {objectives.map(obj => (
                      <SelectItem key={obj.id} value={obj.id.toString()}>
                        {obj.title} ({obj.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {useDynamicTarget && (
              <div>
                <Label>Target ID Variable</Label>
                <Input
                  placeholder="Enter variable name (e.g., keyResultId)"
                  value={step.config.targetIdVariable || ''}
                  onChange={(e) => updateStep(step.id, {
                    config: { ...step.config, targetIdVariable: e.target.value }
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Variable will be resolved from trigger data (e.g., webhook payload) or previous steps
                </p>
              </div>
            )}

            <div>
              <Label>Update Type</Label>
              <Select
                value={step.config.updateType || 'set_value'}
                onValueChange={(value) => updateStep(step.id, {
                  config: { ...step.config, updateType: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set_value">Set Value</SelectItem>
                  <SelectItem value="increment">Increment By</SelectItem>
                  <SelectItem value="percentage">Set Progress %</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Value</Label>
              <Input
                placeholder="Enter value or use {variable} from previous step"
                value={step.config.value || ''}
                onChange={(e) => updateStep(step.id, {
                  config: { ...step.config, value: e.target.value }
                })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use variables from previous steps, e.g., {`{leadCount}`}
              </p>
            </div>
          </div>
        );

      case 'data_source_query':
        return (
          <DataSourceQueryBuilder
            value={step.config || {
              sourceTable: '',
              queryConfig: {
                filters: [],
                aggregation: 'count',
                limit: 1000,
              },
              resultVariable: '',
            }}
            onChange={(config) => updateStep(step.id, { config })}
            keyResults={keyResults}
          />
        );

      case 'splynx_query':
        return (
          <SplynxQueryBuilder
            value={step.config || {
              entity: 'customers',
              mode: 'count',
              filters: [],
              resultVariable: '',
            }}
            onChange={(config) => updateStep(step.id, { config })}
            keyResults={keyResults}
          />
        );

      case 'data_transformation':
        return (
          <div className="space-y-4">
            <div>
              <Label>Formula</Label>
              <Input
                placeholder="e.g., {revenue} / {customers}"
                value={step.config.formula || ''}
                onChange={(e) => updateStep(step.id, {
                  config: { ...step.config, formula: e.target.value }
                })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use arithmetic operators (+, -, *, /) and variables from previous steps
              </p>
            </div>
            
            <div>
              <Label>Store Result As</Label>
              <Input
                placeholder="e.g., arpu"
                value={step.config.resultVariable || ''}
                onChange={(e) => updateStep(step.id, {
                  config: { ...step.config, resultVariable: e.target.value }
                })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use this variable in the next steps as {`{${step.config.resultVariable || 'resultName'}}`}
              </p>
            </div>
          </div>
        );

      case 'for_each':
        const childSteps = step.config.childSteps || [];
        return (
          <div className="space-y-4">
            <div>
              <Label>Source Variable</Label>
              <Input
                placeholder="e.g., customers"
                value={step.config.sourceVariable || ''}
                onChange={(e) => updateStep(step.id, {
                  config: { ...step.config, sourceVariable: e.target.value }
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variable from previous step containing the array to iterate over
              </p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ℹ️ Child steps will have access to <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">currentItem</code> variable
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Example: Use <code>{`{{currentItem.name}}`}</code> to access properties
              </p>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <Label>Loop Body Steps</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newChildStep: WorkflowStep = {
                      id: `child-step-${Date.now()}`,
                      type: 'create_work_item',
                      name: 'New Child Step',
                      config: {}
                    };
                    updateStep(step.id, {
                      config: {
                        ...step.config,
                        childSteps: [...childSteps, newChildStep]
                      }
                    });
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Child Step
                </Button>
              </div>

              {childSteps.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center p-4 border border-dashed rounded">
                  No child steps. Click "Add Child Step" to configure loop body.
                </div>
              ) : (
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    {childSteps.map((childStep: WorkflowStep, childIndex: number) => {
                    const childStepType = STEP_TYPES[childStep.type];
                    const updateChildStep = (updates: Partial<WorkflowStep>) => {
                      const updated = [...childSteps];
                      updated[childIndex] = { ...childStep, ...updates };
                      updateStep(step.id, {
                        config: { ...step.config, childSteps: updated }
                      });
                    };
                    
                    return (
                      <div key={childStep.id} className="border rounded bg-gray-50 dark:bg-gray-900">
                        <div className="p-3 border-b">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${childStepType.color} text-white`}>
                              <childStepType.icon className="h-3 w-3" />
                            </div>
                            <Input
                              placeholder="Step name"
                              value={childStep.name}
                              onChange={(e) => updateChildStep({ name: e.target.value })}
                              className="flex-1"
                            />
                            <Select
                              value={childStep.type}
                              onValueChange={(value: any) => updateChildStep({ type: value, config: {} })}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="create_work_item">Create Work Item</SelectItem>
                                <SelectItem value="integration_action">Integration Action</SelectItem>
                                <SelectItem value="log_event">Log Event</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const updated = childSteps.filter((_: any, i: number) => i !== childIndex);
                                updateStep(step.id, {
                                  config: { ...step.config, childSteps: updated }
                                });
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="p-3">
                          {childStep.type === 'create_work_item' && (
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs">Title</Label>
                                <Input
                                  placeholder="e.g., Follow up with {{currentItem.name}}"
                                  value={childStep.config?.title || ''}
                                  onChange={(e) => updateChildStep({
                                    config: { ...childStep.config, title: e.target.value }
                                  })}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Description</Label>
                                <Textarea
                                  placeholder="e.g., Customer ID: {{currentItem.id}}"
                                  value={childStep.config?.description || ''}
                                  onChange={(e) => updateChildStep({
                                    config: { ...childStep.config, description: e.target.value }
                                  })}
                                  rows={2}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Status</Label>
                                <Select
                                  value={childStep.config?.status || 'Planning'}
                                  onValueChange={(value) => updateChildStep({
                                    config: { ...childStep.config, status: value }
                                  })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Planning">Planning</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Blocked">Blocked</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                          
                          {childStep.type === 'log_event' && (
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs">Log Message</Label>
                                <Textarea
                                  placeholder="Use {{currentItem.field}} to access item properties"
                                  value={childStep.config?.message || ''}
                                  onChange={(e) => updateChildStep({
                                    config: { ...childStep.config, message: e.target.value }
                                  })}
                                  rows={2}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Log Level</Label>
                                <Select
                                  value={childStep.config?.level || 'info'}
                                  onValueChange={(value) => updateChildStep({
                                    config: { ...childStep.config, level: value }
                                  })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="debug">Debug</SelectItem>
                                    <SelectItem value="info">Info</SelectItem>
                                    <SelectItem value="warning">Warning</SelectItem>
                                    <SelectItem value="error">Error</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          {childStep.type === 'integration_action' && (
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs">Integration</Label>
                                <Select
                                  value={childStep.config?.integrationId?.toString() || ''}
                                  onValueChange={(value) => updateChildStep({
                                    config: { ...childStep.config, integrationId: parseInt(value) }
                                  })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select integration" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {integrations
                                      .filter(i => i.platformType === 'splynx')
                                      .map(integration => (
                                        <SelectItem key={integration.id} value={integration.id.toString()}>
                                          {integration.name} ({integration.platformType})
                                        </SelectItem>
                                      ))
                                    }
                                  </SelectContent>
                                </Select>
                              </div>

                              {childStep.config?.integrationId && (
                                <div>
                                  <Label className="text-xs">Action</Label>
                                  <Select
                                    value={childStep.config.action}
                                    onValueChange={(value) => updateChildStep({
                                      config: { ...childStep.config, action: value }
                                    })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select action" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="create_splynx_task">Create Splynx Task</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {childStep.config?.action === 'create_splynx_task' && (
                                <div className="space-y-2">
                                  <div className="p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-xs">
                                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-0.5">💡 Variable Helper</p>
                                    <p className="text-blue-800 dark:text-blue-200">
                                      Use <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{`{{currentItem.fieldName}}`}</code> to access loop data.
                                      <br />Example: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{`{{currentItem.id}}`}</code>
                                    </p>
                                  </div>

                                  <div>
                                    <Label className="text-xs">Task Name</Label>
                                    <VariableFieldPicker
                                      value={childStep.config.parameters?.taskName || ''}
                                      onChange={(value) => updateChildStep({
                                        config: {
                                          ...childStep.config,
                                          parameters: { ...childStep.config.parameters, taskName: value }
                                        }
                                      })}
                                      placeholder="e.g., Follow up: {{currentItem.name}}"
                                    />
                                  </div>

                                  <div>
                                    <Label className="text-xs">Description (Optional)</Label>
                                    <Textarea
                                      placeholder="e.g., Customer ID: {{currentItem.id}}"
                                      value={childStep.config.parameters?.description || ''}
                                      onChange={(e) => updateChildStep({
                                        config: {
                                          ...childStep.config,
                                          parameters: { ...childStep.config.parameters, description: e.target.value }
                                        }
                                      })}
                                      rows={2}
                                      className="text-sm"
                                    />
                                  </div>

                                  <div>
                                    <Label className="text-xs">Project/Task Type</Label>
                                    {projectsError ? (
                                      <div className="text-xs text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded">
                                        {projectsError}
                                      </div>
                                    ) : loadingProjects ? (
                                      <div className="text-xs text-muted-foreground p-2 bg-gray-50 dark:bg-gray-900 border rounded">
                                        Loading...
                                      </div>
                                    ) : splynxProjects.length > 0 ? (
                                      <Select
                                        value={childStep.config.parameters?.projectId?.toString() || ''}
                                        onValueChange={(value) => updateChildStep({
                                          config: {
                                            ...childStep.config,
                                            parameters: { ...childStep.config.parameters, projectId: parseInt(value) }
                                          }
                                        })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select project" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {splynxProjects.map(project => (
                                            <SelectItem key={project.id} value={project.id.toString()}>
                                              {project.title}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <div className="text-xs text-amber-600 dark:text-amber-400 p-2 bg-amber-50 dark:bg-amber-950 border rounded">
                                        No projects configured
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <Label className="text-xs">Customer ID</Label>
                                    <VariableFieldPicker
                                      value={childStep.config.parameters?.customerId || ''}
                                      onChange={(value) => updateChildStep({
                                        config: {
                                          ...childStep.config,
                                          parameters: { ...childStep.config.parameters, customerId: value }
                                        }
                                      })}
                                      placeholder="{{currentItem.id}}"
                                    />
                                  </div>

                                  <div>
                                    <Label className="text-xs">Workflow Status ID</Label>
                                    <Input
                                      placeholder="e.g., 24"
                                      type="number"
                                      value={childStep.config.parameters?.workflowStatusId || ''}
                                      onChange={(e) => updateChildStep({
                                        config: {
                                          ...childStep.config,
                                          parameters: { ...childStep.config.parameters, workflowStatusId: e.target.value ? parseInt(e.target.value) : undefined }
                                        }
                                      })}
                                      className="text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Required - check your Splynx project settings
                                    </p>
                                  </div>

                                  <div>
                                    <Label className="text-xs">Priority</Label>
                                    <Select
                                      value={childStep.config.parameters?.priority || 'priority_medium'}
                                      onValueChange={(value) => updateChildStep({
                                        config: {
                                          ...childStep.config,
                                          parameters: { ...childStep.config.parameters, priority: value }
                                        }
                                      })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="priority_low">Low</SelectItem>
                                        <SelectItem value="priority_medium">Medium</SelectItem>
                                        <SelectItem value="priority_high">High</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label className="text-xs">Scheduled Start Date (Optional)</Label>
                                    <Input
                                      placeholder="e.g., +7 days or YYYY-MM-DD HH:mm"
                                      value={childStep.config.parameters?.scheduledFrom || ''}
                                      onChange={(e) => updateChildStep({
                                        config: {
                                          ...childStep.config,
                                          parameters: { ...childStep.config.parameters, scheduledFrom: e.target.value }
                                        }
                                      })}
                                      className="text-sm"
                                    />
                                  </div>

                                  <div>
                                    <Label className="text-xs">Assignee ID (Optional)</Label>
                                    <Input
                                      placeholder="e.g., 3"
                                      type="number"
                                      value={childStep.config.parameters?.assignee || ''}
                                      onChange={(e) => updateChildStep({
                                        config: {
                                          ...childStep.config,
                                          parameters: { ...childStep.config.parameters, assignee: e.target.value ? parseInt(e.target.value) : undefined }
                                        }
                                      })}
                                      className="text-sm"
                                    />
                                  </div>

                                  <div>
                                    <Label className="text-xs">Duration (Optional)</Label>
                                    <Input
                                      placeholder="e.g., 0h 30m"
                                      value={childStep.config.parameters?.duration || ''}
                                      onChange={(e) => updateChildStep({
                                        config: {
                                          ...childStep.config,
                                          parameters: { ...childStep.config.parameters, duration: e.target.value }
                                        }
                                      })}
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                  <DataInspectorPanel steps={steps} currentStepIndex={stepIndex} />
                </div>
              )}
            </div>
          </div>
        );

      case 'create_work_item':
        return (
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                placeholder="e.g., Follow up with {{currentItem.name}}"
                value={step.config.title || ''}
                onChange={(e) => updateStep(step.id, {
                  config: { ...step.config, title: e.target.value }
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use <code>{`{{variable}}`}</code> for dynamic values
              </p>
            </div>
            
            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="e.g., Customer ID: {{currentItem.id}}"
                value={step.config.description || ''}
                onChange={(e) => updateStep(step.id, {
                  config: { ...step.config, description: e.target.value }
                })}
                rows={3}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={step.config.status || 'Planning'}
                onValueChange={(value) => updateStep(step.id, {
                  config: { ...step.config, status: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planning">Planning</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Due Date (Optional)</Label>
              <Input
                placeholder="e.g., +7 days or YYYY-MM-DD"
                value={step.config.dueDate || ''}
                onChange={(e) => updateStep(step.id, {
                  config: { ...step.config, dueDate: e.target.value }
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use +N days for relative dates, or specific date format
              </p>
            </div>

            <div>
              <Label>External Reference (Optional)</Label>
              <Input
                placeholder="e.g., splynx_customer_{{currentItem.id}}"
                value={step.config.externalReference || ''}
                onChange={(e) => updateStep(step.id, {
                  config: { ...step.config, externalReference: e.target.value }
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Link to external system record
              </p>
            </div>
          </div>
        );

      case 'log_event':
        return (
          <div className="space-y-4">
            <div>
              <Label>Log Message</Label>
              <Textarea
                placeholder="Enter log message. Use {variables} from previous steps"
                value={step.config.message || ''}
                onChange={(e) => updateStep(step.id, {
                  config: { ...step.config, message: e.target.value }
                })}
                rows={3}
              />
            </div>
            <div>
              <Label>Log Level</Label>
              <Select
                value={step.config.level || 'info'}
                onValueChange={(value) => updateStep(step.id, {
                  config: { ...step.config, level: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {steps.length === 0 && (
        <Card className="p-8 text-center border-dashed">
          <p className="text-gray-500 mb-4">No workflow steps defined</p>
          <Button onClick={addStep} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add First Step
          </Button>
        </Card>
      )}

      {steps.map((step, index) => {
        const stepType = STEP_TYPES[step.type];
        const isExpanded = expandedStep === step.id;

        return (
          <Card key={step.id} className="overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setExpandedStep(isExpanded ? null : step.id)}
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-5 w-5 text-gray-400" />
                
                <div className={`p-2 rounded ${stepType.color} text-white`}>
                  <stepType.icon className="h-4 w-4" />
                </div>

                <div className="flex-1">
                  <div className="font-medium">Step {index + 1}: {step.name}</div>
                  <div className="text-sm text-gray-500">{stepType.label}</div>
                </div>

                <div className="flex items-center gap-2">
                  {index > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveStep(index, 'up');
                      }}
                    >
                      ↑
                    </Button>
                  )}
                  {index < steps.length - 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveStep(index, 'down');
                      }}
                    >
                      ↓
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStep(step.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t p-4 bg-gray-50 dark:bg-gray-900">
                <div className="space-y-4">
                  <div>
                    <Label>Step Name</Label>
                    <Input
                      value={step.name}
                      onChange={(e) => updateStep(step.id, { name: e.target.value })}
                      placeholder="Enter step name"
                    />
                  </div>

                  <div>
                    <Label>Step Type</Label>
                    <Select
                      value={step.type}
                      onValueChange={(value: any) => updateStep(step.id, { 
                        type: value, 
                        config: value === 'strategy_update' 
                          ? { type: 'key_result', updateType: 'set_value' }
                          : {}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STEP_TYPES).map(([key, type]) => (
                          <SelectItem key={key} value={key}>
                            <div>
                              <div>{type.label}</div>
                              <div className="text-xs text-gray-500">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {renderStepConfig(step, index)}
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {steps.length > 0 && (
        <Button onClick={addStep} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-1" />
          Add Step
        </Button>
      )}
    </div>
  );
}