import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, Settings, Zap, Target, AlertCircle, Database, Calculator, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { Integration, KeyResult, Objective } from '@shared/schema';
import DataSourceQueryBuilder from './DataSourceQueryBuilder';

interface WorkflowStep {
  id: string;
  type: 'integration_action' | 'strategy_update' | 'log_event' | 'notification' | 'data_source_query' | 'data_transformation';
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

interface EmailTemplate {
  id: number;
  title: string;
  subject?: string;
  description?: string;
  code?: string;
}

interface EmailCampaignConfigProps {
  step: WorkflowStep;
  updateStep: (stepId: string, updates: Partial<WorkflowStep>) => void;
}

function EmailCampaignConfig({ step, updateStep }: EmailCampaignConfigProps) {
  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/splynx/templates'],
    retry: 1,
  });

  return (
    <div className="space-y-3">
      <div>
        <Label>Email Template</Label>
        <Select
          value={step.config.parameters?.templateId?.toString()}
          onValueChange={(value) => updateStep(step.id, {
            config: {
              ...step.config,
              parameters: { ...step.config.parameters, templateId: parseInt(value) }
            }
          })}
        >
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? "Loading templates..." : "Select email template"} />
          </SelectTrigger>
          <SelectContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-sm text-muted-foreground px-2 py-2">
                No templates found. Create one in Splynx Setup.
              </div>
            ) : (
              templates.map(template => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  {template.title}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          Select the email template to send. Templates are managed in Splynx Setup.
        </p>
      </div>

      <div>
        <Label>Customer IDs (optional)</Label>
        <Textarea
          placeholder="Leave empty to use results from previous data query step, or enter comma-separated customer IDs"
          rows={2}
          value={step.config.parameters?.customerIds || ''}
          onChange={(e) => updateStep(step.id, {
            config: {
              ...step.config,
              parameters: { ...step.config.parameters, customerIds: e.target.value }
            }
          })}
        />
        <p className="text-xs text-gray-500 mt-1">
          If left empty, will use customer IDs from a previous data query step result.
        </p>
      </div>

      <div>
        <Label>Custom Variables (optional, JSON)</Label>
        <Textarea
          placeholder='{"month": "January", "offer": "50% off"}'
          rows={3}
          value={step.config.parameters?.customVariables || ''}
          onChange={(e) => updateStep(step.id, {
            config: {
              ...step.config,
              parameters: { ...step.config.parameters, customVariables: e.target.value }
            }
          })}
        />
        <p className="text-xs text-gray-500 mt-1">
          Additional variables to use in the email template. Must be valid JSON.
        </p>
      </div>
    </div>
  );
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
    label: 'Splynx Query (Legacy)',
    icon: Database,
    color: 'bg-cyan-500',
    description: 'Legacy Splynx data query'
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

  const renderStepConfig = (step: WorkflowStep) => {
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
                    <SelectItem value="send_email_campaign">Send Email Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {step.config.action === 'send_email_campaign' && (
              <EmailCampaignConfig step={step} updateStep={updateStep} />
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

            {targetType === 'key_result' && (
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

            {targetType === 'objective' && (
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

                  {renderStepConfig(step)}
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