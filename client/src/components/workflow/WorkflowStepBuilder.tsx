import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, Settings, Zap, Target, AlertCircle, Database, Calculator, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
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
  type: string;
}

interface EmailCampaignConfigProps {
  step: WorkflowStep;
  updateStep: (stepId: string, updates: Partial<WorkflowStep>) => void;
}

function EmailCampaignConfig({ step, updateStep }: EmailCampaignConfigProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedPreviewCustomerId, setSelectedPreviewCustomerId] = useState<string>('');
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/splynx/templates'],
    retry: 1,
  });

  // Get customer IDs from the config
  const customerIdsStr = step.config.parameters?.customerIds || '';
  const customerIds = customerIdsStr.trim() 
    ? customerIdsStr.split(',').map((id: string) => id.trim()).filter(Boolean)
    : [];

  // Parse custom variables
  const customVariablesStr = step.config.parameters?.customVariables || '';
  let parsedCustomVariables: Record<string, any> = {};
  let jsonError = '';
  
  if (customVariablesStr.trim()) {
    try {
      parsedCustomVariables = JSON.parse(customVariablesStr);
      jsonError = '';
    } catch (e) {
      jsonError = 'Invalid JSON format';
    }
  }

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async (params: { templateId: number; customerId: number; customVariables: any }) => {
      const response = await apiRequest('/api/splynx/templates/preview', {
        method: 'POST',
        body: params,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Create blob URL for iframe
      const blob = new Blob([data.renderedHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
      
      // Show success message with variable summary
      if (data.variableSummary?.customVariablesReplaced?.length > 0) {
        toast({
          title: 'Preview loaded',
          description: `Replaced ${data.variableSummary.customVariablesReplaced.length} custom variable(s)`,
        });
      }
      
      // Warn about unresolved variables
      if (data.variableSummary?.unresolvedCustomVariables?.length > 0) {
        toast({
          title: 'Warning: Unresolved variables',
          description: `${data.variableSummary.unresolvedCustomVariables.join(', ')} not found in template`,
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Preview failed',
        description: error.message || 'Failed to generate preview',
        variant: 'destructive',
      });
    },
  });

  // Handle preview button click
  const handlePreview = () => {
    const templateId = step.config.parameters?.templateId;
    
    if (!templateId) {
      toast({
        title: 'Select a template',
        description: 'Please select an email template first',
        variant: 'destructive',
      });
      return;
    }
    
    if (customerIds.length === 0) {
      toast({
        title: 'Add customer IDs',
        description: 'Please add at least one customer ID to preview with',
        variant: 'destructive',
      });
      return;
    }
    
    if (jsonError) {
      toast({
        title: 'Fix JSON error',
        description: jsonError,
        variant: 'destructive',
      });
      return;
    }
    
    // Set first customer as default
    setSelectedPreviewCustomerId(customerIds[0]);
    setIsPreviewOpen(true);
    
    // Fetch preview with first customer
    previewMutation.mutate({
      templateId: parseInt(templateId),
      customerId: parseInt(customerIds[0]),
      customVariables: parsedCustomVariables,
    });
  };

  // Handle customer change in preview
  const handleCustomerChange = (customerId: string) => {
    setSelectedPreviewCustomerId(customerId);
    
    const templateId = step.config.parameters?.templateId;
    if (templateId) {
      previewMutation.mutate({
        templateId: parseInt(templateId),
        customerId: parseInt(customerId),
        customVariables: parsedCustomVariables,
      });
    }
  };

  // Clean up blob URL when preview closes
  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  return (
    <>
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
            placeholder='{"custom.month": "January", "custom.offer": "50% off"}'
            rows={3}
            value={step.config.parameters?.customVariables || ''}
            onChange={(e) => updateStep(step.id, {
              config: {
                ...step.config,
                parameters: { ...step.config.parameters, customVariables: e.target.value }
              }
            })}
            className={jsonError ? 'border-destructive' : ''}
          />
          {jsonError ? (
            <p className="text-xs text-destructive mt-1">{jsonError}</p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              Use <code className="text-xs bg-muted px-1 rounded">[[ custom.name ]]</code> in your template, then define values here. Example: <code className="text-xs bg-muted px-1 rounded">{'{"custom.name": "value"}'}</code>
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePreview}
          disabled={!step.config.parameters?.templateId || customerIds.length === 0 || !!jsonError}
          className="w-full"
          data-testid="button-preview-email"
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview Email
        </Button>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Email Template Preview</DialogTitle>
            <DialogDescription>
              See how your email will look with merged variables
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 grid grid-cols-4 gap-4 overflow-hidden">
            {/* Left Panel - Settings */}
            <div className="col-span-1 space-y-4 overflow-y-auto">
              <div>
                <Label className="text-xs font-semibold">Preview Customer</Label>
                <Select 
                  value={selectedPreviewCustomerId} 
                  onValueChange={handleCustomerChange}
                  disabled={previewMutation.isPending}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {customerIds.map((id: string) => (
                      <SelectItem key={id} value={id}>
                        Customer {id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {previewMutation.data?.resolvedCustomerEmail && (
                    <>Email: {previewMutation.data.resolvedCustomerEmail}</>
                  )}
                </p>
              </div>

              {Object.keys(parsedCustomVariables).length > 0 && (
                <div>
                  <Label className="text-xs font-semibold">Custom Variables</Label>
                  <div className="mt-1 space-y-1">
                    {Object.entries(parsedCustomVariables).map(([key, value]) => (
                      <div key={key} className="text-xs bg-muted p-2 rounded">
                        <div className="font-mono text-primary">[[ {key} ]]</div>
                        <div className="text-muted-foreground mt-0.5">→ {String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewMutation.data?.variableSummary && (
                <div>
                  <Label className="text-xs font-semibold">Variable Status</Label>
                  <div className="mt-1 space-y-2">
                    {previewMutation.data.variableSummary.customVariablesReplaced.length > 0 && (
                      <div>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          ✓ {previewMutation.data.variableSummary.customVariablesReplaced.length} Replaced
                        </Badge>
                      </div>
                    )}
                    {previewMutation.data.variableSummary.unresolvedCustomVariables.length > 0 && (
                      <div>
                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                          ⚠ {previewMutation.data.variableSummary.unresolvedCustomVariables.length} Not Found
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - Preview */}
            <div className="col-span-3 flex flex-col overflow-hidden border rounded-lg">
              {previewMutation.isPending ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Generating preview...</p>
                  </div>
                </div>
              ) : previewBlobUrl ? (
                <iframe
                  src={previewBlobUrl}
                  sandbox="allow-same-origin"
                  className="w-full h-full"
                  title="Email Preview"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Select a customer to preview</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
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