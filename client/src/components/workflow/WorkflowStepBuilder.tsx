import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, Settings, Zap, Target, AlertCircle, Database, Calculator, Loader2, Eye, Cloud, Repeat, ClipboardList, FileText, Hash, User, Bot, GitBranch, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Integration, KeyResult, Objective } from '@shared/schema';
import DataSourceQueryBuilder from './DataSourceQueryBuilder';
import SplynxQueryBuilder from './SplynxQueryBuilder';
import { VariableFieldPicker } from './VariableFieldPicker';
import { WorkflowTemplateSelector } from './WorkflowTemplateSelector';
import { DataInspectorPanel } from './DataInspectorPanel';

interface WorkflowStep {
  id: string;
  type: 'integration_action' | 'strategy_update' | 'log_event' | 'notification' | 'data_source_query' | 'data_transformation' | 'splynx_query' | 'for_each' | 'create_work_item' | 'ai_draft_response' | 'conditional_paths';
  name: string;
  config?: any;
}

interface WorkflowStepBuilderProps {
  steps: WorkflowStep[];
  onChange: (steps: WorkflowStep[]) => void;
  integrations?: Integration[];
  keyResults?: KeyResult[];
  objectives?: Objective[];
  triggerType?: string;
  selectedTrigger?: any;
}

interface EmailTemplate {
  id: number;
  title: string;
  subject: string;
  htmlBody: string;
  variablesManifest: Record<string, string> | null;
  status: string;
  organizationId: number;
  createdAt: string;
  updatedAt: string;
}

interface EmailCampaignConfigProps {
  step: WorkflowStep;
  updateStep: (stepId: string, updates: Partial<WorkflowStep>) => void;
}

/**
 * Email Campaign Configuration Component
 * Updated to use the new self-managed template system (/api/email-templates)
 */
function EmailCampaignConfig({ step, updateStep }: EmailCampaignConfigProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/email-templates'],
    retry: 1,
  });

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
    mutationFn: async (params: { templateId: number; customVariables: any }) => {
      const response = await apiRequest(`/api/email-templates/${params.templateId}/preview`, {
        method: 'POST',
        body: { variables: params.customVariables },
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Create blob URL for iframe
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
      
      // Show success message
      toast({
        title: 'Preview loaded',
        description: data.subject ? `Subject: ${data.subject}` : 'Template preview ready',
      });
      
      // Warn about unresolved variables
      if (data.unresolvedVariables?.length > 0) {
        toast({
          title: 'Warning: Unresolved variables',
          description: `${data.unresolvedVariables.join(', ')} not found`,
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
    
    if (jsonError) {
      toast({
        title: 'Fix JSON error',
        description: jsonError,
        variant: 'destructive',
      });
      return;
    }
    
    setIsPreviewOpen(true);
    
    // Fetch preview with custom variables
    previewMutation.mutate({
      templateId: parseInt(templateId),
      customVariables: parsedCustomVariables,
    });
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
            placeholder='{"custom_month": "January", "custom_offer": "50% off"}'
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
              Use <code className="text-xs bg-muted px-1 rounded">[[ custom_name ]]</code> in your template, then define values here. Example: <code className="text-xs bg-muted px-1 rounded">{'{"custom_name": "value"}'}</code>
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePreview}
          disabled={!step.config.parameters?.templateId || !!jsonError}
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
              Preview with custom variables applied
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 grid grid-cols-4 gap-4 overflow-hidden">
            {/* Left Panel - Variable Info */}
            <div className="col-span-1 space-y-4 overflow-y-auto">
              {Object.keys(parsedCustomVariables).length > 0 ? (
                <div>
                  <Label className="text-xs font-semibold">Custom Variables</Label>
                  <div className="mt-1 space-y-1">
                    {Object.entries(parsedCustomVariables).map(([key, value]) => (
                      <div key={key} className="text-xs bg-muted p-2 rounded">
                        <div className="font-mono text-primary">{'{{' + key + '}}'}</div>
                        <div className="text-muted-foreground mt-0.5">→ {String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="text-xs font-semibold">Variables</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    No custom variables provided. Standard variables (customer.name, company.name, etc.) will show as placeholders.
                  </p>
                </div>
              )}

              {previewMutation.data?.unresolvedVariables && previewMutation.data.unresolvedVariables.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold">Unresolved Variables</Label>
                  <div className="mt-1 space-y-1">
                    {previewMutation.data.unresolvedVariables.map((varName: string) => (
                      <div key={varName} className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 p-2 rounded">
                        <div className="font-mono">{varName}</div>
                        <div className="text-xs mt-0.5">Not replaced</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    These variables will be replaced with actual customer data when the email is sent.
                  </p>
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
                  <p className="text-sm text-muted-foreground">Click Preview Email to see your template</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface SplynxTicketTypeSelectorProps {
  integrationId: number;
  value: string;
  onChange: (value: string) => void;
}

function SplynxTicketTypeSelector({ integrationId, value, onChange }: SplynxTicketTypeSelectorProps) {
  const { data, isLoading } = useQuery<{ ticketTypes: Array<{ id: number; title: string }> }>({
    queryKey: ['/api/integrations/splynx', integrationId, 'ticket-types'],
    queryFn: async () => {
      const response = await apiRequest(`/api/integrations/splynx/${integrationId}/ticket-types`);
      return response.json();
    },
    enabled: !!integrationId,
  });

  const ticketTypes = data?.ticketTypes || [];

  return (
    <Select value={value || 'all'} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "Loading types..." : "All types"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Types</SelectItem>
        {isLoading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          ticketTypes.map((type) => (
            <SelectItem key={type.id} value={type.id.toString()}>
              {type.title}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

interface SplynxTicketStatusSelectorProps {
  integrationId: number;
  value: string;
  onChange: (value: string) => void;
}

function SplynxTicketStatusSelector({ integrationId, value, onChange }: SplynxTicketStatusSelectorProps) {
  const { data, isLoading } = useQuery<{ ticketStatuses: Array<{ id: number; name: string }> }>({
    queryKey: ['/api/integrations/splynx', integrationId, 'ticket-statuses'],
    queryFn: async () => {
      const response = await apiRequest(`/api/integrations/splynx/${integrationId}/ticket-statuses`);
      return response.json();
    },
    enabled: !!integrationId,
  });

  const ticketStatuses = data?.ticketStatuses || [];

  return (
    <Select value={value || 'all'} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "Loading statuses..." : "All statuses"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        {isLoading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          ticketStatuses.map((status) => (
            <SelectItem key={status.id} value={status.id.toString()}>
              {status.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

interface TestActionButtonProps {
  integrationId: number;
  action: string;
  parameters: any;
}

function TestActionButton({ integrationId, action, parameters }: TestActionButtonProps) {
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<number | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/integrations/splynx/${integrationId}/test-action`, {
        method: 'POST',
        body: { action, parameters },
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      setTestResult(data.result);
      setDebugInfo(data.debugInfo);
      toast({
        title: 'Test Complete',
        description: `Query returned: ${data.result} items`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Test Failed',
        description: error.message || 'Failed to test query',
        variant: 'destructive',
      });
    },
  });

  if (!integrationId) {
    return null;
  }

  return (
    <div className="pt-2 border-t mt-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => testMutation.mutate()}
        disabled={testMutation.isPending}
        className="w-full"
        data-testid="button-test-action"
      >
        {testMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Testing...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4 mr-2" />
            Test Query
          </>
        )}
      </Button>
      {testResult !== null && (
        <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded text-sm">
          <span className="font-medium text-green-900 dark:text-green-100">Result: </span>
          <span className="text-green-800 dark:text-green-200">{testResult} items</span>
          {debugInfo && (
            <button 
              onClick={() => setShowDebug(!showDebug)} 
              className="ml-2 text-xs text-blue-600 dark:text-blue-400 underline"
            >
              {showDebug ? 'Hide' : 'Show'} API Details
            </button>
          )}
        </div>
      )}
      {showDebug && debugInfo && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs font-mono overflow-auto max-h-48">
          <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
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
  ai_draft_response: {
    label: 'AI Draft Response',
    icon: Bot,
    color: 'bg-fuchsia-500',
    description: 'Generate AI-powered draft response for support tickets'
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
  },
  conditional_paths: {
    label: 'Conditional Paths',
    icon: GitBranch,
    color: 'bg-amber-500',
    description: 'Route workflow based on field conditions'
  }
};

interface NestedConditionalEditorProps {
  pathStep: any;
  pathIndex: number;
  stepIndex: number;
  updatePathStep: (pathIndex: number, stepIndex: number, updates: any) => void;
  getAvailableFields: () => any[];
  triggerType: string;
  expandedPathSteps: Set<string>;
  togglePathStepExpanded: (stepId: string) => void;
  kbDocuments: Array<{ id: number; title: string; summary?: string; documentType?: string }>;
}

function NestedConditionalEditor({
  pathStep,
  pathIndex,
  stepIndex,
  updatePathStep,
  getAvailableFields,
  triggerType,
  expandedPathSteps,
  togglePathStepExpanded,
  kbDocuments
}: NestedConditionalEditorProps) {
  const getLatestConfig = () => {
    const config = pathStep.config || {};
    return {
      ...config,
      conditions: Array.isArray(config.conditions) ? config.conditions : [],
      defaultPath: config.defaultPath || { steps: [] }
    };
  };
  
  const latestConfig = getLatestConfig();
  const nestedConditions = latestConfig.conditions;
  const nestedDefaultPath = latestConfig.defaultPath;
  
  const deepCloneStep = (s: any) => ({
    ...s,
    config: s.config ? { ...s.config } : {}
  });
  
  const deepClonePath = (path: any) => ({
    ...path,
    conditions: path.conditions ? path.conditions.map((c: any) => ({ ...c })) : [],
    pathSteps: path.pathSteps ? path.pathSteps.map(deepCloneStep) : []
  });
  
  const buildFullConfig = (conditionsUpdate?: any[], defaultPathUpdate?: any) => {
    const config = getLatestConfig();
    return {
      ...config,
      conditions: conditionsUpdate !== undefined ? conditionsUpdate : config.conditions.map(deepClonePath),
      defaultPath: defaultPathUpdate !== undefined ? defaultPathUpdate : {
        ...config.defaultPath,
        steps: (config.defaultPath.steps || []).map(deepCloneStep)
      }
    };
  };
  
  const addNestedConditionPath = () => {
    const newPath = {
      id: `nested-path-${Date.now()}`,
      conditions: [{ field: '', operator: 'equals', value: '' }],
      pathSteps: []
    };
    const config = getLatestConfig();
    const clonedConditions = config.conditions.map(deepClonePath);
    updatePathStep(pathIndex, stepIndex, {
      config: buildFullConfig([...clonedConditions, newPath])
    });
  };
  
  const removeNestedConditionPath = (nestedPathIndex: number) => {
    const config = getLatestConfig();
    const clonedConditions = config.conditions.map(deepClonePath);
    updatePathStep(pathIndex, stepIndex, {
      config: buildFullConfig(clonedConditions.filter((_: any, i: number) => i !== nestedPathIndex))
    });
  };
  
  const updateNestedCondition = (nestedPathIndex: number, condIndex: number, updates: any) => {
    const config = getLatestConfig();
    const clonedConditions = config.conditions.map(deepClonePath);
    if (!clonedConditions[nestedPathIndex]) return;
    
    const pathConditions = clonedConditions[nestedPathIndex].conditions;
    if (pathConditions[condIndex]) {
      pathConditions[condIndex] = { ...pathConditions[condIndex], ...updates };
    }
    updatePathStep(pathIndex, stepIndex, {
      config: buildFullConfig(clonedConditions)
    });
  };
  
  const addNestedConditionToPath = (nestedPathIndex: number) => {
    const config = getLatestConfig();
    const clonedConditions = config.conditions.map(deepClonePath);
    if (!clonedConditions[nestedPathIndex]) return;
    
    clonedConditions[nestedPathIndex].conditions.push({ field: '', operator: 'equals', value: '' });
    updatePathStep(pathIndex, stepIndex, {
      config: buildFullConfig(clonedConditions)
    });
  };
  
  const removeNestedConditionFromPath = (nestedPathIndex: number, condIndex: number) => {
    const config = getLatestConfig();
    const clonedConditions = config.conditions.map(deepClonePath);
    if (!clonedConditions[nestedPathIndex]) return;
    
    clonedConditions[nestedPathIndex].conditions = clonedConditions[nestedPathIndex].conditions.filter(
      (_: any, i: number) => i !== condIndex
    );
    updatePathStep(pathIndex, stepIndex, {
      config: buildFullConfig(clonedConditions)
    });
  };
  
  const addNestedPathStep = (nestedPathIndex: number) => {
    const newStep = {
      id: `nested-step-${Date.now()}`,
      type: 'create_work_item',
      name: 'New Step',
      config: {}
    };
    const config = getLatestConfig();
    const clonedConditions = config.conditions.map(deepClonePath);
    if (!clonedConditions[nestedPathIndex]) return;
    
    clonedConditions[nestedPathIndex].pathSteps.push(newStep);
    updatePathStep(pathIndex, stepIndex, {
      config: buildFullConfig(clonedConditions)
    });
  };
  
  const updateNestedPathStep = (nestedPathIndex: number, nestedStepIndex: number, updates: any) => {
    const config = getLatestConfig();
    const clonedConditions = config.conditions.map(deepClonePath);
    if (!clonedConditions[nestedPathIndex]) return;
    
    const pathSteps = clonedConditions[nestedPathIndex].pathSteps;
    if (pathSteps[nestedStepIndex]) {
      const existingStep = pathSteps[nestedStepIndex];
      
      if (updates.type && updates.type !== existingStep.type) {
        pathSteps[nestedStepIndex] = {
          ...existingStep,
          type: updates.type,
          name: updates.name !== undefined ? updates.name : existingStep.name,
          config: updates.config || {}
        };
      } else {
        const existingConfig = existingStep.config || {};
        const updatesConfig = updates.config || {};
        
        pathSteps[nestedStepIndex] = {
          ...existingStep,
          ...updates,
          config: {
            ...existingConfig,
            ...updatesConfig
          }
        };
      }
    }
    updatePathStep(pathIndex, stepIndex, {
      config: buildFullConfig(clonedConditions)
    });
  };
  
  const removeNestedPathStep = (nestedPathIndex: number, nestedStepIndex: number) => {
    const config = getLatestConfig();
    const clonedConditions = config.conditions.map(deepClonePath);
    if (!clonedConditions[nestedPathIndex]) return;
    
    clonedConditions[nestedPathIndex].pathSteps = clonedConditions[nestedPathIndex].pathSteps.filter(
      (_: any, i: number) => i !== nestedStepIndex
    );
    updatePathStep(pathIndex, stepIndex, {
      config: buildFullConfig(clonedConditions)
    });
  };
  
  const addNestedDefaultPathStep = () => {
    const newStep = {
      id: `nested-default-step-${Date.now()}`,
      type: 'create_work_item',
      name: 'New Step',
      config: {}
    };
    const config = getLatestConfig();
    const clonedDefaultPath = {
      ...config.defaultPath,
      steps: [...(config.defaultPath.steps || []).map(deepCloneStep), newStep]
    };
    updatePathStep(pathIndex, stepIndex, {
      config: buildFullConfig(undefined, clonedDefaultPath)
    });
  };
  
  const updateNestedDefaultPathStep = (nestedStepIndex: number, updates: any) => {
    const config = getLatestConfig();
    const clonedSteps = (config.defaultPath.steps || []).map(deepCloneStep);
    
    if (clonedSteps[nestedStepIndex]) {
      const existingStep = clonedSteps[nestedStepIndex];
      
      if (updates.type && updates.type !== existingStep.type) {
        clonedSteps[nestedStepIndex] = {
          ...existingStep,
          type: updates.type,
          name: updates.name !== undefined ? updates.name : existingStep.name,
          config: updates.config || {}
        };
      } else {
        const existingConfig = existingStep.config || {};
        const updatesConfig = updates.config || {};
        
        clonedSteps[nestedStepIndex] = {
          ...existingStep,
          ...updates,
          config: {
            ...existingConfig,
            ...updatesConfig
          }
        };
      }
    }
    
    const clonedDefaultPath = { ...config.defaultPath, steps: clonedSteps };
    updatePathStep(pathIndex, stepIndex, {
      config: buildFullConfig(undefined, clonedDefaultPath)
    });
  };
  
  const removeNestedDefaultPathStep = (nestedStepIndex: number) => {
    const config = getLatestConfig();
    const clonedSteps = (config.defaultPath.steps || []).map(deepCloneStep);
    const clonedDefaultPath = {
      ...config.defaultPath,
      steps: clonedSteps.filter((_: any, i: number) => i !== nestedStepIndex)
    };
    updatePathStep(pathIndex, stepIndex, {
      config: buildFullConfig(undefined, clonedDefaultPath)
    });
  };
  
  const getNestedPathConditions = (path: any) => {
    if (path.conditions && Array.isArray(path.conditions)) {
      return path.conditions;
    }
    if (path.field) {
      return [{ field: path.field, operator: path.operator, value: path.value }];
    }
    return [];
  };
  
  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded text-sm">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <GitBranch className="h-4 w-4" />
          <span>Nested Conditional: Define sub-paths based on conditions</span>
        </div>
      </div>
      
      {nestedConditions.map((nestedPath: any, nestedPathIndex: number) => {
        const pathConditions = getNestedPathConditions(nestedPath);
        
        return (
          <Card key={nestedPath.id || nestedPathIndex} className="p-3 border-l-4 border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  Nested Path {nestedPathIndex + 1}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeNestedConditionPath(nestedPathIndex)}
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
              
              <div className="space-y-2 bg-white dark:bg-gray-900 p-2 rounded border">
                <Label className="text-xs text-muted-foreground">Conditions (all must match):</Label>
                {pathConditions.map((cond: any, condIndex: number) => (
                  <div key={condIndex} className="flex items-center gap-2">
                    {condIndex > 0 && (
                      <Badge variant="secondary" className="h-5 text-xs">AND</Badge>
                    )}
                    <Input
                      placeholder="Field (e.g., lastOutput.serviceStatus)"
                      value={cond.field || ''}
                      onChange={(e) => updateNestedCondition(nestedPathIndex, condIndex, { field: e.target.value })}
                      className="flex-1 h-8 text-xs"
                    />
                    <Select
                      value={cond.operator || 'equals'}
                      onValueChange={(value) => updateNestedCondition(nestedPathIndex, condIndex, { operator: value })}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="not_equals">Not Equals</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="in_list">In List</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Value"
                      value={cond.value || ''}
                      onChange={(e) => updateNestedCondition(nestedPathIndex, condIndex, { value: e.target.value })}
                      className="w-28 h-8 text-xs"
                    />
                    {pathConditions.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeNestedConditionFromPath(nestedPathIndex, condIndex)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addNestedConditionToPath(nestedPathIndex)}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Condition
                </Button>
              </div>
              
              <div className="pl-3 border-l-2 border-purple-200 dark:border-purple-800">
                <Label className="text-xs text-muted-foreground mb-1 block">Steps:</Label>
                {(nestedPath.pathSteps || []).map((nestedStep: any, nestedStepIndex: number) => {
                  const nestedStepType = STEP_TYPES[nestedStep.type as keyof typeof STEP_TYPES];
                  const stableNestedStepId = `nested-${pathIndex}-${stepIndex}-${nestedPathIndex}-${nestedStep.id || nestedStepIndex}`;
                  const isNestedStepExpanded = expandedPathSteps.has(stableNestedStepId);
                  
                  return (
                    <div key={stableNestedStepId} className="mb-1 bg-white dark:bg-gray-900 rounded border">
                      <div 
                        className="flex items-center gap-2 p-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => togglePathStepExpanded(stableNestedStepId)}
                      >
                        <div className={`p-1 rounded ${nestedStepType?.color || 'bg-gray-500'} text-white`}>
                          {nestedStepType?.icon && <nestedStepType.icon className="h-2.5 w-2.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{nestedStep.name || 'Unnamed'}</div>
                        </div>
                        <Settings className={`h-3 w-3 text-muted-foreground ${isNestedStepExpanded ? 'rotate-90' : ''}`} />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNestedPathStep(nestedPathIndex, nestedStepIndex);
                          }}
                          className="h-5 w-5 p-0"
                        >
                          <Trash2 className="h-2.5 w-2.5 text-destructive" />
                        </Button>
                      </div>
                      
                      {isNestedStepExpanded && (
                        <div className="p-2 border-t space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Name</Label>
                              <Input
                                value={nestedStep.name}
                                onChange={(e) => updateNestedPathStep(nestedPathIndex, nestedStepIndex, { name: e.target.value })}
                                className="h-7 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Type</Label>
                              <Select
                                value={nestedStep.type}
                                onValueChange={(value) => updateNestedPathStep(nestedPathIndex, nestedStepIndex, { type: value, config: {} })}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="create_work_item">Create Work Item</SelectItem>
                                  <SelectItem value="ai_draft_response">AI Draft Response</SelectItem>
                                  <SelectItem value="splynx_query">Splynx Query</SelectItem>
                                  <SelectItem value="splynx_ticket_message">Send Ticket Message</SelectItem>
                                  <SelectItem value="log_event">Log Event</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {nestedStep.type === 'create_work_item' && (
                            <div className="space-y-2 pt-1 border-t">
                              <div>
                                <Label className="text-xs">Title</Label>
                                <Input
                                  value={nestedStep.config?.title || ''}
                                  onChange={(e) => updateNestedPathStep(nestedPathIndex, nestedStepIndex, {
                                    config: { ...nestedStep.config, title: e.target.value }
                                  })}
                                  placeholder="{{trigger.subject}}"
                                  className="h-7 text-xs"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Status</Label>
                                <Select
                                  value={nestedStep.config?.status || 'Planning'}
                                  onValueChange={(value) => updateNestedPathStep(nestedPathIndex, nestedStepIndex, {
                                    config: { ...nestedStep.config, status: value }
                                  })}
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Planning">Planning</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                          
                          {nestedStep.type === 'log_event' && (
                            <div className="pt-1 border-t">
                              <Label className="text-xs">Message</Label>
                              <Input
                                value={nestedStep.config?.message || ''}
                                onChange={(e) => updateNestedPathStep(nestedPathIndex, nestedStepIndex, {
                                  config: { ...nestedStep.config, message: e.target.value }
                                })}
                                placeholder="Log message"
                                className="h-7 text-xs"
                              />
                            </div>
                          )}
                          
                          {nestedStep.type === 'splynx_ticket_message' && (
                            <div className="space-y-2 pt-1 border-t">
                              <div>
                                <Label className="text-xs">Ticket ID</Label>
                                <Input
                                  value={nestedStep.config?.ticketId || ''}
                                  onChange={(e) => updateNestedPathStep(nestedPathIndex, nestedStepIndex, {
                                    config: { ...nestedStep.config, ticketId: e.target.value }
                                  })}
                                  placeholder="{{trigger.id}} or leave empty to auto-detect"
                                  className="h-7 text-xs"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Message</Label>
                                <textarea
                                  value={nestedStep.config?.message || ''}
                                  onChange={(e) => updateNestedPathStep(nestedPathIndex, nestedStepIndex, {
                                    config: { ...nestedStep.config, message: e.target.value }
                                  })}
                                  placeholder="Message content (supports {{variables}})"
                                  className="w-full h-20 text-xs border rounded-md p-2 resize-none"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`hidden-${nestedPathIndex}-${nestedStepIndex}`}
                                  checked={nestedStep.config?.isHidden !== false}
                                  onChange={(e) => updateNestedPathStep(nestedPathIndex, nestedStepIndex, {
                                    config: { ...nestedStep.config, isHidden: e.target.checked }
                                  })}
                                  className="h-3 w-3"
                                />
                                <Label htmlFor={`hidden-${nestedPathIndex}-${nestedStepIndex}`} className="text-xs">
                                  Private message (hidden from customer)
                                </Label>
                              </div>
                            </div>
                          )}
                          
                          {nestedStep.type === 'ai_draft_response' && (
                            <div className="space-y-2 pt-1 border-t">
                              <div>
                                <Label className="text-xs">AI Instructions (KB Documents)</Label>
                                <div className="text-xs text-muted-foreground mb-1">
                                  Select documents containing instructions for AI response generation
                                </div>
                                {kbDocuments.length > 0 ? (
                                  <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-1">
                                    {kbDocuments
                                      .filter(doc => doc.documentType === 'internal_kb')
                                      .map((doc) => {
                                        const selectedDocs = nestedStep.config?.instructionDocIds || [];
                                        const isSelected = selectedDocs.includes(doc.id);
                                        return (
                                          <div key={doc.id} className="flex items-center gap-2">
                                            <input
                                              type="checkbox"
                                              id={`nested-doc-${nestedPathIndex}-${nestedStepIndex}-${doc.id}`}
                                              checked={isSelected}
                                              onChange={(e) => {
                                                const current = nestedStep.config?.instructionDocIds || [];
                                                const updated = e.target.checked
                                                  ? [...current, doc.id]
                                                  : current.filter((id: number) => id !== doc.id);
                                                updateNestedPathStep(nestedPathIndex, nestedStepIndex, {
                                                  config: { ...nestedStep.config, instructionDocIds: updated }
                                                });
                                              }}
                                              className="h-3 w-3"
                                            />
                                            <Label htmlFor={`nested-doc-${nestedPathIndex}-${nestedStepIndex}-${doc.id}`} className="text-xs cursor-pointer truncate">
                                              {doc.title}
                                            </Label>
                                          </div>
                                        );
                                      })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">No KB documents available</p>
                                )}
                                {(nestedStep.config?.instructionDocIds?.length || 0) > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {nestedStep.config?.instructionDocIds?.length} document(s) selected
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addNestedPathStep(nestedPathIndex)}
                  className="h-6 text-xs mt-1"
                >
                  <Plus className="h-2.5 w-2.5 mr-1" />
                  Add Step
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
      
      <Button
        variant="outline"
        onClick={addNestedConditionPath}
        className="w-full border-dashed text-sm h-8"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Nested Path
      </Button>
      
      <Card className="p-3 border-l-4 border-l-gray-400 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="space-y-2">
          <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300 text-xs">
            Nested Default Path
          </Badge>
          
          <div className="pl-3 border-l-2 border-gray-200 dark:border-gray-700">
            <Label className="text-xs text-muted-foreground mb-1 block">Steps when no nested conditions match:</Label>
            {(nestedDefaultPath.steps || []).map((nestedStep: any, nestedStepIndex: number) => {
              const nestedStepType = STEP_TYPES[nestedStep.type as keyof typeof STEP_TYPES];
              const stableNestedStepId = `nested-default-${pathIndex}-${stepIndex}-${nestedStep.id || nestedStepIndex}`;
              const isNestedStepExpanded = expandedPathSteps.has(stableNestedStepId);
              
              return (
                <div key={stableNestedStepId} className="mb-1 bg-white dark:bg-gray-800 rounded border">
                  <div 
                    className="flex items-center gap-2 p-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => togglePathStepExpanded(stableNestedStepId)}
                  >
                    <div className={`p-1 rounded ${nestedStepType?.color || 'bg-gray-500'} text-white`}>
                      {nestedStepType?.icon && <nestedStepType.icon className="h-2.5 w-2.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{nestedStep.name || 'Unnamed'}</div>
                    </div>
                    <Settings className={`h-3 w-3 text-muted-foreground ${isNestedStepExpanded ? 'rotate-90' : ''}`} />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNestedDefaultPathStep(nestedStepIndex);
                      }}
                      className="h-5 w-5 p-0"
                    >
                      <Trash2 className="h-2.5 w-2.5 text-destructive" />
                    </Button>
                  </div>
                  
                  {isNestedStepExpanded && (
                    <div className="p-2 border-t space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Name</Label>
                          <Input
                            value={nestedStep.name}
                            onChange={(e) => updateNestedDefaultPathStep(nestedStepIndex, { name: e.target.value })}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={nestedStep.type}
                            onValueChange={(value) => updateNestedDefaultPathStep(nestedStepIndex, { type: value, config: {} })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="create_work_item">Create Work Item</SelectItem>
                              <SelectItem value="ai_draft_response">AI Draft Response</SelectItem>
                              <SelectItem value="splynx_query">Splynx Query</SelectItem>
                              <SelectItem value="splynx_ticket_message">Send Ticket Message</SelectItem>
                              <SelectItem value="log_event">Log Event</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {nestedStep.type === 'splynx_ticket_message' && (
                        <div className="space-y-2 pt-1 border-t">
                          <div>
                            <Label className="text-xs">Ticket ID</Label>
                            <Input
                              value={nestedStep.config?.ticketId || ''}
                              onChange={(e) => updateNestedDefaultPathStep(nestedStepIndex, {
                                config: { ...nestedStep.config, ticketId: e.target.value }
                              })}
                              placeholder="{{trigger.id}} or leave empty to auto-detect"
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Message</Label>
                            <textarea
                              value={nestedStep.config?.message || ''}
                              onChange={(e) => updateNestedDefaultPathStep(nestedStepIndex, {
                                config: { ...nestedStep.config, message: e.target.value }
                              })}
                              placeholder="Message content (supports {{variables}})"
                              className="w-full h-20 text-xs border rounded-md p-2 resize-none"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`hidden-default-${nestedStepIndex}`}
                              checked={nestedStep.config?.isHidden !== false}
                              onChange={(e) => updateNestedDefaultPathStep(nestedStepIndex, {
                                config: { ...nestedStep.config, isHidden: e.target.checked }
                              })}
                              className="h-3 w-3"
                            />
                            <Label htmlFor={`hidden-default-${nestedStepIndex}`} className="text-xs">
                              Private message (hidden from customer)
                            </Label>
                          </div>
                        </div>
                      )}
                      
                      {nestedStep.type === 'create_work_item' && (
                        <div className="space-y-2 pt-1 border-t">
                          <div>
                            <Label className="text-xs">Title</Label>
                            <Input
                              value={nestedStep.config?.title || ''}
                              onChange={(e) => updateNestedDefaultPathStep(nestedStepIndex, {
                                config: { ...nestedStep.config, title: e.target.value }
                              })}
                              placeholder="{{trigger.subject}}"
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Status</Label>
                            <Select
                              value={nestedStep.config?.status || 'Planning'}
                              onValueChange={(value) => updateNestedDefaultPathStep(nestedStepIndex, {
                                config: { ...nestedStep.config, status: value }
                              })}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Planning">Planning</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                      
                      {nestedStep.type === 'log_event' && (
                        <div className="pt-1 border-t">
                          <Label className="text-xs">Message</Label>
                          <Input
                            value={nestedStep.config?.message || ''}
                            onChange={(e) => updateNestedDefaultPathStep(nestedStepIndex, {
                              config: { ...nestedStep.config, message: e.target.value }
                            })}
                            placeholder="Log message"
                            className="h-7 text-xs"
                          />
                        </div>
                      )}
                      
                      {nestedStep.type === 'ai_draft_response' && (
                        <div className="space-y-2 pt-1 border-t">
                          <div>
                            <Label className="text-xs">AI Instructions (KB Documents)</Label>
                            <div className="text-xs text-muted-foreground mb-1">
                              Select documents containing instructions for AI response generation
                            </div>
                            {kbDocuments.length > 0 ? (
                              <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-1">
                                {kbDocuments
                                  .filter(doc => doc.documentType === 'internal_kb')
                                  .map((doc) => {
                                    const selectedDocs = nestedStep.config?.instructionDocIds || [];
                                    const isSelected = selectedDocs.includes(doc.id);
                                    return (
                                      <div key={doc.id} className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          id={`nested-default-doc-${nestedStepIndex}-${doc.id}`}
                                          checked={isSelected}
                                          onChange={(e) => {
                                            const current = nestedStep.config?.instructionDocIds || [];
                                            const updated = e.target.checked
                                              ? [...current, doc.id]
                                              : current.filter((id: number) => id !== doc.id);
                                            updateNestedDefaultPathStep(nestedStepIndex, {
                                              config: { ...nestedStep.config, instructionDocIds: updated }
                                            });
                                          }}
                                          className="h-3 w-3"
                                        />
                                        <Label htmlFor={`nested-default-doc-${nestedStepIndex}-${doc.id}`} className="text-xs cursor-pointer truncate">
                                          {doc.title}
                                        </Label>
                                      </div>
                                    );
                                  })}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No KB documents available</p>
                            )}
                            {(nestedStep.config?.instructionDocIds?.length || 0) > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {nestedStep.config?.instructionDocIds?.length} document(s) selected
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <Button
              size="sm"
              variant="outline"
              onClick={addNestedDefaultPathStep}
              className="h-6 text-xs mt-1"
            >
              <Plus className="h-2.5 w-2.5 mr-1" />
              Add Step
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function WorkflowStepBuilder({ 
  steps = [], 
  onChange, 
  integrations = [], 
  keyResults = [],
  objectives = [],
  triggerType = 'manual',
  selectedTrigger
}: WorkflowStepBuilderProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [expandedPathSteps, setExpandedPathSteps] = useState<Set<string>>(new Set());
  const [splynxProjects, setSplynxProjects] = useState<Array<{ id: number; title: string }>>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // Fetch teams for Create Work Item step
  const { data: teams = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ['/api/teams'],
  });

  // Fetch users for Create Work Item step
  const { data: users = [] } = useQuery<Array<{ id: number; fullName: string; email: string }>>({
    queryKey: ['/api/users'],
  });

  // Fetch knowledge base documents for AI Draft Response step
  const { data: kbDocuments = [] } = useQuery<Array<{ id: number; title: string; summary?: string; documentType?: string }>>({
    queryKey: ['/api/knowledge-base/documents'],
  });

  const togglePathStepExpanded = (stepId: string) => {
    setExpandedPathSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  // Generate available fields based on trigger type
  const getAvailableFields = () => {
    if (triggerType === 'webhook' && selectedTrigger?.availableFields) {
      // Use trigger-specific fields from the webhook definition
      return selectedTrigger.availableFields.map((field: string) => ({
        name: field,
        type: 'string',
        icon: FileText,
        description: `From webhook: ${field}`
      }));
    }
    
    // Default fields for non-webhook triggers
    return [
      { name: 'id', type: 'number', icon: Hash, description: 'Item ID' },
      { name: 'name', type: 'string', icon: User, description: 'Item name' },
      { name: 'status', type: 'string', icon: FileText, description: 'Status' },
    ];
  };
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
    // Helper function to find create_splynx_task action in steps or child steps
    const findTaskCreationIntegrationId = (stepsArray: WorkflowStep[]): number | null => {
      for (const step of stepsArray) {
        // Check top-level integration_action steps
        if (step.type === 'integration_action' && step.config?.action === 'create_splynx_task') {
          return step.config?.integrationId ?? null;
        }
        
        // Check child steps inside for_each loops
        if (step.type === 'for_each' && step.config?.childSteps) {
          for (const childStep of step.config.childSteps) {
            if (childStep.type === 'integration_action' && childStep.config?.action === 'create_splynx_task') {
              return childStep.config?.integrationId ?? null;
            }
          }
        }
      }
      return null;
    };

    // Normalize undefined to null for comparison
    const normalizedIntegrationId = findTaskCreationIntegrationId(steps);

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
                    <SelectItem value="count_tickets">Count Support Tickets</SelectItem>
                    <SelectItem value="get_revenue">Get Revenue</SelectItem>
                    <SelectItem value="get_tickets">Get Support Tickets</SelectItem>
                    <SelectItem value="send_email_campaign">Send Email Campaign</SelectItem>
                    <SelectItem value="create_splynx_task">Create Splynx Task</SelectItem>
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

            {step.config.action === 'count_tickets' && (
              <div className="space-y-3">
                <div>
                  <Label>Date Range</Label>
                  <Select
                    value={step.config.parameters?.dateRange || 'last_7_days'}
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
                  <Label>Ticket Type (optional)</Label>
                  <SplynxTicketTypeSelector
                    integrationId={step.config.integrationId}
                    value={step.config.parameters?.ticketType || 'all'}
                    onChange={(value) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        parameters: { ...step.config.parameters, ticketType: value === 'all' ? undefined : value }
                      }
                    })}
                  />
                </div>

                <div>
                  <Label>Group ID (optional)</Label>
                  <Input
                    placeholder="e.g., 1, 2, 3"
                    value={step.config.parameters?.groupId || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        parameters: { ...step.config.parameters, groupId: e.target.value || undefined }
                      }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the ticket group ID from Splynx
                  </p>
                </div>

                <div>
                  <Label>Status Filter (optional)</Label>
                  <SplynxTicketStatusSelector
                    integrationId={step.config.integrationId}
                    value={step.config.parameters?.statusFilter || 'all'}
                    onChange={(value) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        parameters: { ...step.config.parameters, statusFilter: value === 'all' ? undefined : value }
                      }
                    })}
                  />
                </div>

                <TestActionButton
                  integrationId={step.config.integrationId}
                  action={step.config.action}
                  parameters={step.config.parameters}
                />
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
              <VariableFieldPicker
                value={step.config.title || ''}
                onChange={(value) => updateStep(step.id, {
                  config: { ...step.config, title: value }
                })}
                placeholder={triggerType === 'webhook' && selectedTrigger 
                  ? `e.g., Ticket: {{trigger.subject}}`
                  : "e.g., Follow up with {{currentItem.name}}"
                }
                availableFields={getAvailableFields()}
                variablePrefix={triggerType === 'webhook' ? 'trigger' : 'currentItem'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {triggerType === 'webhook' && selectedTrigger 
                  ? `Click to insert fields from the ${selectedTrigger.name} webhook`
                  : 'Click to insert variables from previous steps'
                }
              </p>
            </div>
            
            <div>
              <Label>Description (Optional)</Label>
              <VariableFieldPicker
                value={step.config.description || ''}
                onChange={(value) => updateStep(step.id, {
                  config: { ...step.config, description: value }
                })}
                placeholder={triggerType === 'webhook' && selectedTrigger
                  ? `e.g., Priority: {{trigger.priority}}, Status: {{trigger.status}}`
                  : "e.g., Customer ID: {{currentItem.id}}"
                }
                multiline
                availableFields={getAvailableFields()}
                variablePrefix={triggerType === 'webhook' ? 'trigger' : 'currentItem'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {triggerType === 'webhook' && selectedTrigger 
                  ? `Click to insert fields from the ${selectedTrigger.name} webhook`
                  : 'Click to insert variables from previous steps'
                }
              </p>
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
              <WorkflowTemplateSelector
                value={step.config.templateId || ''}
                onChange={(value) => updateStep(step.id, {
                  config: { ...step.config, templateId: value }
                })}
                label="Workflow Template (Optional)"
                placeholder="Select a template to attach"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Attach a workflow template to the created work item
              </p>
            </div>

            <div>
              <Label>Splynx Ticket ID (Optional)</Label>
              <VariableFieldPicker
                value={step.config.splynxTicketId || ''}
                onChange={(value) => updateStep(step.id, {
                  config: { ...step.config, splynxTicketId: value }
                })}
                placeholder="e.g., {{trigger.ticket_id}}"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Link to Splynx ticket (for status syncing). Click to insert variables from previous steps.
              </p>
            </div>

            <div>
              <Label>Splynx Task ID (Optional)</Label>
              <VariableFieldPicker
                value={step.config.splynxTaskId || ''}
                onChange={(value) => updateStep(step.id, {
                  config: { ...step.config, splynxTaskId: value }
                })}
                placeholder="e.g., {{trigger.task_id}}"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Link to Splynx task (for status syncing). Click to insert variables from previous steps.
              </p>
            </div>

            <div>
              <Label>External Reference (Optional)</Label>
              <VariableFieldPicker
                value={step.config.externalReference || ''}
                onChange={(value) => updateStep(step.id, {
                  config: { ...step.config, externalReference: value }
                })}
                placeholder="e.g., splynx_customer_{{currentItem.id}}"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Link to external system record. Click to insert variables from previous steps.
              </p>
            </div>
          </div>
        );

      case 'ai_draft_response':
        const contextSources = step.config.contextSources || ['customer_info', 'ticket_history', 'account_balance', 'connection_status'];
        const CONTEXT_SOURCE_OPTIONS = [
          { id: 'customer_info', label: 'Customer Information', description: 'Name, status, plan, contact details from Splynx' },
          { id: 'ticket_history', label: 'Ticket History', description: 'Last 4 support tickets for context' },
          { id: 'account_balance', label: 'Account Balance', description: 'Balance status, payment history' },
          { id: 'connection_status', label: 'Connection Status', description: 'Service status, speed, IP address' },
        ];
        
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex items-start gap-3">
                <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">AI Configuration</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    This step will use the AI model, system prompts, and knowledge base documents configured in your AI Ticket Drafting settings.
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Configure AI settings at: Integration Hub → AI Ticket Drafting
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label>Work Item ID (Optional)</Label>
              <VariableFieldPicker
                value={step.config.workItemId || ''}
                onChange={(value) => updateStep(step.id, {
                  config: { ...step.config, workItemId: value }
                })}
                placeholder="e.g., {{step2Output.workItemId}}"
                availableFields={getAvailableFields()}
                variablePrefix="stepOutput"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to automatically use the most recent work item created in a previous step. Or specify explicitly using {'{{stepNOutput.workItemId}}'}.
              </p>
            </div>

            <div>
              <Label>Customer ID from Splynx (Optional)</Label>
              <VariableFieldPicker
                value={step.config.splynxCustomerId || ''}
                onChange={(value) => updateStep(step.id, {
                  config: { ...step.config, splynxCustomerId: value }
                })}
                placeholder="e.g., {{trigger.customer_id}}"
                availableFields={getAvailableFields()}
                variablePrefix="trigger"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Splynx customer ID for context enrichment. Use {'{{trigger.customer_id}}'} from webhook.
              </p>
            </div>

            <div className="space-y-3">
              <Label>Context Sources (Splynx)</Label>
              <p className="text-xs text-muted-foreground">
                Select which customer data from Splynx to include when generating AI responses.
              </p>
              <div className="space-y-2">
                {CONTEXT_SOURCE_OPTIONS.map((source) => {
                  const isChecked = contextSources.includes(source.id);
                  return (
                    <div
                      key={source.id}
                      className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-3 hover:bg-accent cursor-pointer border"
                      onClick={() => {
                        const currentSources = step.config.contextSources || ['customer_info', 'ticket_history', 'account_balance', 'connection_status'];
                        if (currentSources.includes(source.id)) {
                          updateStep(step.id, {
                            config: { ...step.config, contextSources: currentSources.filter((s: string) => s !== source.id) }
                          });
                        } else {
                          updateStep(step.id, {
                            config: { ...step.config, contextSources: [...currentSources, source.id] }
                          });
                        }
                      }}
                      data-testid={`checkbox-context-${source.id}`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const currentSources = step.config.contextSources || ['customer_info', 'ticket_history', 'account_balance', 'connection_status'];
                          if (checked) {
                            if (!currentSources.includes(source.id)) {
                              updateStep(step.id, {
                                config: { ...step.config, contextSources: [...currentSources, source.id] }
                              });
                            }
                          } else {
                            updateStep(step.id, {
                              config: { ...step.config, contextSources: currentSources.filter((s: string) => s !== source.id) }
                            });
                          }
                        }}
                      />
                      <div className="flex-1 space-y-1 leading-none">
                        <span className="text-sm font-medium cursor-pointer">
                          {source.label}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {source.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {contextSources.length} context source{contextSources.length !== 1 ? 's' : ''} enabled
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

      case 'conditional_paths':
        const conditions = step.config.conditions || [];
        const defaultPath = step.config.defaultPath || { steps: [] };
        
        const addConditionPath = () => {
          const newConditionPath = {
            id: `path-${Date.now()}`,
            conditions: [{ field: '', operator: 'equals', value: '' }],
            pathSteps: []
          };
          updateStep(step.id, {
            config: {
              ...step.config,
              conditions: [...conditions, newConditionPath]
            }
          });
        };
        
        const updateConditionPath = (pathIndex: number, updates: any) => {
          const updated = [...conditions];
          updated[pathIndex] = { ...updated[pathIndex], ...updates };
          updateStep(step.id, {
            config: { ...step.config, conditions: updated }
          });
        };
        
        const removeConditionPath = (pathIndex: number) => {
          const updated = conditions.filter((_: any, i: number) => i !== pathIndex);
          updateStep(step.id, {
            config: { ...step.config, conditions: updated }
          });
        };
        
        const addConditionToPath = (pathIndex: number) => {
          const updated = [...conditions];
          const currentPath = updated[pathIndex];
          const pathConditions = currentPath.conditions && Array.isArray(currentPath.conditions)
            ? currentPath.conditions
            : currentPath.field
              ? [{ field: currentPath.field, operator: currentPath.operator, value: currentPath.value }]
              : [];
          const { field: _f, operator: _o, value: _v, ...pathWithoutLegacy } = currentPath;
          updated[pathIndex] = {
            ...pathWithoutLegacy,
            conditions: [...pathConditions, { field: '', operator: 'equals', value: '' }]
          };
          updateStep(step.id, {
            config: { ...step.config, conditions: updated }
          });
        };
        
        const updateConditionInPath = (pathIndex: number, condIndex: number, updates: any) => {
          const updated = [...conditions];
          const currentPath = updated[pathIndex];
          const pathConditions = currentPath.conditions && Array.isArray(currentPath.conditions)
            ? [...currentPath.conditions]
            : currentPath.field
              ? [{ field: currentPath.field, operator: currentPath.operator, value: currentPath.value }]
              : [];
          pathConditions[condIndex] = { ...pathConditions[condIndex], ...updates };
          const { field: _f, operator: _o, value: _v, ...pathWithoutLegacy } = currentPath;
          updated[pathIndex] = { ...pathWithoutLegacy, conditions: pathConditions };
          updateStep(step.id, {
            config: { ...step.config, conditions: updated }
          });
        };
        
        const removeConditionFromPath = (pathIndex: number, condIndex: number) => {
          const updated = [...conditions];
          const currentPath = updated[pathIndex];
          const pathConditions = currentPath.conditions && Array.isArray(currentPath.conditions)
            ? currentPath.conditions
            : currentPath.field
              ? [{ field: currentPath.field, operator: currentPath.operator, value: currentPath.value }]
              : [];
          const { field: _f, operator: _o, value: _v, ...pathWithoutLegacy } = currentPath;
          updated[pathIndex] = {
            ...pathWithoutLegacy,
            conditions: pathConditions.filter((_: any, i: number) => i !== condIndex)
          };
          updateStep(step.id, {
            config: { ...step.config, conditions: updated }
          });
        };
        
        const addPathStep = (pathIndex: number) => {
          const newStep = {
            id: `step-${Date.now()}`,
            type: 'create_work_item',
            name: 'New Step',
            config: {}
          };
          const updated = [...conditions];
          updated[pathIndex] = {
            ...updated[pathIndex],
            pathSteps: [...(updated[pathIndex].pathSteps || []), newStep]
          };
          updateStep(step.id, {
            config: { ...step.config, conditions: updated }
          });
        };
        
        const updatePathStep = (pathIndex: number, stepIndex: number, updates: any) => {
          const updated = [...conditions];
          const pathSteps = [...(updated[pathIndex].pathSteps || [])];
          pathSteps[stepIndex] = { ...pathSteps[stepIndex], ...updates };
          updated[pathIndex] = { ...updated[pathIndex], pathSteps };
          updateStep(step.id, {
            config: { ...step.config, conditions: updated }
          });
        };
        
        const removePathStep = (pathIndex: number, stepIndex: number) => {
          const updated = [...conditions];
          updated[pathIndex] = {
            ...updated[pathIndex],
            pathSteps: updated[pathIndex].pathSteps.filter((_: any, i: number) => i !== stepIndex)
          };
          updateStep(step.id, {
            config: { ...step.config, conditions: updated }
          });
        };
        
        const addDefaultPathStep = () => {
          const newStep = {
            id: `step-${Date.now()}`,
            type: 'create_work_item',
            name: 'New Step',
            config: {}
          };
          updateStep(step.id, {
            config: {
              ...step.config,
              defaultPath: {
                ...defaultPath,
                steps: [...(defaultPath.steps || []), newStep]
              }
            }
          });
        };
        
        const updateDefaultPathStep = (stepIndex: number, updates: any) => {
          const steps = [...(defaultPath.steps || [])];
          steps[stepIndex] = { ...steps[stepIndex], ...updates };
          updateStep(step.id, {
            config: {
              ...step.config,
              defaultPath: { ...defaultPath, steps }
            }
          });
        };
        
        const removeDefaultPathStep = (stepIndex: number) => {
          updateStep(step.id, {
            config: {
              ...step.config,
              defaultPath: {
                ...defaultPath,
                steps: defaultPath.steps.filter((_: any, i: number) => i !== stepIndex)
              }
            }
          });
        };
        
        const getPathConditions = (path: any) => {
          if (path.conditions && Array.isArray(path.conditions)) {
            return path.conditions;
          }
          if (path.field) {
            return [{ field: path.field, operator: path.operator, value: path.value }];
          }
          return [];
        };

        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define conditions to route the workflow. Each path can have multiple conditions (all must match - AND logic).
            </p>
            
            {conditions.map((conditionPath: any, pathIndex: number) => {
              const pathConditions = getPathConditions(conditionPath);
              
              return (
                <Card key={conditionPath.id || pathIndex} className="p-4 border-l-4 border-l-amber-500">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          Path {pathIndex + 1}
                        </Badge>
                        {pathConditions.length > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            {pathConditions.length} conditions (AND)
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeConditionPath(pathIndex)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2 bg-gray-50 dark:bg-gray-900 rounded p-3">
                      <Label className="text-xs text-muted-foreground">Conditions (all must match):</Label>
                      {pathConditions.map((cond: any, condIndex: number) => (
                        <div key={condIndex} className="flex items-center gap-2">
                          {condIndex > 0 && (
                            <Badge variant="secondary" className="text-xs shrink-0">AND</Badge>
                          )}
                          <div className="grid grid-cols-3 gap-2 flex-1">
                            <Input
                              placeholder="e.g., trigger.category"
                              value={cond.field || ''}
                              onChange={(e) => updateConditionInPath(pathIndex, condIndex, { field: e.target.value })}
                            />
                            <Select
                              value={cond.operator || 'equals'}
                              onValueChange={(value) => updateConditionInPath(pathIndex, condIndex, { operator: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="not_equals">Not Equals</SelectItem>
                                <SelectItem value="in">In List (comma-separated)</SelectItem>
                                <SelectItem value="not_in">Not In List</SelectItem>
                                <SelectItem value="contains">Contains</SelectItem>
                                <SelectItem value="not_contains">Not Contains</SelectItem>
                                <SelectItem value="starts_with">Starts With</SelectItem>
                                <SelectItem value="ends_with">Ends With</SelectItem>
                                <SelectItem value="greater_than">Greater Than</SelectItem>
                                <SelectItem value="less_than">Less Than</SelectItem>
                                <SelectItem value="is_empty">Is Empty</SelectItem>
                                <SelectItem value="is_not_empty">Is Not Empty</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex gap-1">
                              <Input
                                placeholder="e.g., support"
                                value={cond.value || ''}
                                onChange={(e) => updateConditionInPath(pathIndex, condIndex, { value: e.target.value })}
                                className="flex-1"
                              />
                              {pathConditions.length > 1 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeConditionFromPath(pathIndex, condIndex)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addConditionToPath(pathIndex)}
                        className="mt-2"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Condition (AND)
                      </Button>
                    </div>
                    
                    <div className="mt-3 pl-4 border-l-2 border-amber-200 dark:border-amber-800">
                      <Label className="text-xs text-muted-foreground mb-2 block">Steps to execute when all conditions match:</Label>
                      
                      {(conditionPath.pathSteps || []).map((pathStep: any, stepIndex: number) => {
                        const pathStepType = STEP_TYPES[pathStep.type as keyof typeof STEP_TYPES];
                        const stableStepId = pathStep.id || `path-${pathIndex}-step-${stepIndex}`;
                        const isPathStepExpanded = expandedPathSteps.has(stableStepId);
                        
                        return (
                          <div key={stableStepId} className="mb-2 bg-gray-50 dark:bg-gray-900 rounded border">
                            <div 
                              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                              onClick={() => togglePathStepExpanded(stableStepId)}
                            >
                              <div className={`p-1.5 rounded ${pathStepType?.color || 'bg-gray-500'} text-white`}>
                                {pathStepType?.icon && <pathStepType.icon className="h-3 w-3" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{pathStep.name || 'Unnamed Step'}</div>
                                <div className="text-xs text-muted-foreground">{pathStepType?.label || pathStep.type}</div>
                              </div>
                              <Settings className={`h-4 w-4 text-muted-foreground transition-transform ${isPathStepExpanded ? 'rotate-90' : ''}`} />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removePathStep(pathIndex, stepIndex);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            
                            {isPathStepExpanded && (
                              <div className="p-3 border-t space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Step Name</Label>
                                    <Input
                                      placeholder="Step name"
                                      value={pathStep.name}
                                      onChange={(e) => updatePathStep(pathIndex, stepIndex, { name: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Step Type</Label>
                                    <Select
                                      value={pathStep.type}
                                      onValueChange={(value) => updatePathStep(pathIndex, stepIndex, { type: value, config: {} })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="create_work_item">Create Work Item</SelectItem>
                                        <SelectItem value="integration_action">Integration Action</SelectItem>
                                        <SelectItem value="splynx_query">Splynx Query</SelectItem>
                                        <SelectItem value="splynx_ticket_message">Send Ticket Message</SelectItem>
                                        <SelectItem value="ai_draft_response">AI Draft Response</SelectItem>
                                        <SelectItem value="conditional_paths">Nested Conditional</SelectItem>
                                        <SelectItem value="log_event">Log Event</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                
                                {pathStep.type === 'create_work_item' && (
                                  <div className="space-y-3 pt-2 border-t">
                                    <div>
                                      <Label className="text-xs">Title</Label>
                                      <VariableFieldPicker
                                        value={pathStep.config?.title || ''}
                                        onChange={(value) => updatePathStep(pathIndex, stepIndex, {
                                          config: { ...pathStep.config, title: value }
                                        })}
                                        placeholder="e.g., Support Ticket: {{trigger.subject}}"
                                        availableFields={getAvailableFields()}
                                        variablePrefix={triggerType === 'webhook' ? 'trigger' : 'currentItem'}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Description</Label>
                                      <VariableFieldPicker
                                        value={pathStep.config?.description || ''}
                                        onChange={(value) => updatePathStep(pathIndex, stepIndex, {
                                          config: { ...pathStep.config, description: value }
                                        })}
                                        placeholder="e.g., Customer: {{trigger.customer_id}}"
                                        multiline
                                        availableFields={getAvailableFields()}
                                        variablePrefix={triggerType === 'webhook' ? 'trigger' : 'currentItem'}
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <Label className="text-xs">Status</Label>
                                        <Select
                                          value={pathStep.config?.status || 'Planning'}
                                          onValueChange={(value) => updatePathStep(pathIndex, stepIndex, {
                                            config: { ...pathStep.config, status: value }
                                          })}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Planning">Planning</SelectItem>
                                            <SelectItem value="Ready">Ready</SelectItem>
                                            <SelectItem value="In Progress">In Progress</SelectItem>
                                            <SelectItem value="Stuck">Stuck</SelectItem>
                                            <SelectItem value="Completed">Completed</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label className="text-xs">Due Date</Label>
                                        <Input
                                          placeholder="+7 days or YYYY-MM-DD"
                                          value={pathStep.config?.dueDate || ''}
                                          onChange={(e) => updatePathStep(pathIndex, stepIndex, {
                                            config: { ...pathStep.config, dueDate: e.target.value }
                                          })}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <WorkflowTemplateSelector
                                        value={pathStep.config?.templateId || ''}
                                        onChange={(value) => updatePathStep(pathIndex, stepIndex, {
                                          config: { ...pathStep.config, templateId: value }
                                        })}
                                        label="Workflow Template"
                                        placeholder="Select a template"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <Label className="text-xs">Splynx Ticket ID</Label>
                                        <VariableFieldPicker
                                          value={pathStep.config?.splynxTicketId || ''}
                                          onChange={(value) => updatePathStep(pathIndex, stepIndex, {
                                            config: { ...pathStep.config, splynxTicketId: value }
                                          })}
                                          placeholder="{{trigger.id}}"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Splynx Customer ID</Label>
                                        <VariableFieldPicker
                                          value={pathStep.config?.splynxCustomerId || ''}
                                          onChange={(value) => updatePathStep(pathIndex, stepIndex, {
                                            config: { ...pathStep.config, splynxCustomerId: value }
                                          })}
                                          placeholder="{{trigger.customer_id}}"
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <Label className="text-xs">Assign to Team</Label>
                                        <Select
                                          value={pathStep.config?.teamId?.toString() || 'none'}
                                          onValueChange={(value) => updatePathStep(pathIndex, stepIndex, {
                                            config: { ...pathStep.config, teamId: value !== 'none' ? parseInt(value) : undefined }
                                          })}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select team (optional)" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">No team</SelectItem>
                                            {teams.map((team) => (
                                              <SelectItem key={team.id} value={team.id.toString()}>
                                                {team.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label className="text-xs">Assign to User</Label>
                                        <Select
                                          value={pathStep.config?.assigneeId?.toString() || 'none'}
                                          onValueChange={(value) => updatePathStep(pathIndex, stepIndex, {
                                            config: { ...pathStep.config, assigneeId: value !== 'none' ? parseInt(value) : undefined }
                                          })}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select user (optional)" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">No user</SelectItem>
                                            {users.map((user) => (
                                              <SelectItem key={user.id} value={user.id.toString()}>
                                                {user.fullName || user.email}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {pathStep.type === 'ai_draft_response' && (
                                  <div className="space-y-3 pt-2 border-t">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-sm">
                                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                        <Bot className="h-4 w-4" />
                                        <span>Uses AI settings from Integration Hub → AI Ticket Drafting</span>
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-xs">System Prompt Override (optional)</Label>
                                      <Textarea
                                        value={pathStep.config?.systemPrompt || ''}
                                        onChange={(e) => updatePathStep(pathIndex, stepIndex, {
                                          config: { ...pathStep.config, systemPrompt: e.target.value }
                                        })}
                                        placeholder="Custom prompt for this path (leave blank to use default)"
                                        rows={3}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">AI Instructions Documents</Label>
                                      <p className="text-xs text-muted-foreground mb-2">Select KB documents to use as AI instructions</p>
                                      {kbDocuments.length > 0 ? (
                                        <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
                                          {kbDocuments
                                            .filter(doc => doc.documentType === 'ai_prompt' || doc.documentType === 'system_prompt')
                                            .length > 0 ? (
                                            kbDocuments
                                              .filter(doc => doc.documentType === 'ai_prompt' || doc.documentType === 'system_prompt')
                                              .map(doc => {
                                                const selectedDocs = pathStep.config?.instructionDocIds || [];
                                                const isSelected = selectedDocs.includes(doc.id);
                                                return (
                                                  <div
                                                    key={doc.id}
                                                    className="flex items-start gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                                                    onClick={() => {
                                                      const current = pathStep.config?.instructionDocIds || [];
                                                      const updated = isSelected
                                                        ? current.filter((id: number) => id !== doc.id)
                                                        : [...current, doc.id];
                                                      updatePathStep(pathIndex, stepIndex, {
                                                        config: { ...pathStep.config, instructionDocIds: updated }
                                                      });
                                                    }}
                                                  >
                                                    <Checkbox checked={isSelected} className="mt-0.5" />
                                                    <div className="flex-1 min-w-0">
                                                      <span className="text-xs font-medium">{doc.title}</span>
                                                      {doc.summary && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1">{doc.summary}</p>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })
                                          ) : (
                                            <p className="text-xs text-muted-foreground p-2">No AI instruction documents found. Create one with type "AI Prompt" or "System Prompt".</p>
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-muted-foreground p-2 border rounded">Loading documents...</p>
                                      )}
                                      {(pathStep.config?.instructionDocIds?.length || 0) > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {pathStep.config?.instructionDocIds?.length} document(s) selected
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={pathStep.config?.useKnowledgeBase !== false}
                                        onCheckedChange={(checked) => updatePathStep(pathIndex, stepIndex, {
                                          config: { ...pathStep.config, useKnowledgeBase: checked }
                                        })}
                                      />
                                      <Label className="text-xs">Use Knowledge Base (reference docs)</Label>
                                    </div>
                                  </div>
                                )}
                                
                                {pathStep.type === 'splynx_query' && (
                                  <div className="space-y-3 pt-2 border-t">
                                    <div>
                                      <Label className="text-xs">Action</Label>
                                      <Select
                                        value={pathStep.config?.action || 'getCustomerServices'}
                                        onValueChange={(value) => updatePathStep(pathIndex, stepIndex, {
                                          config: { ...pathStep.config, action: value }
                                        })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="getCustomerServices">Get Customer Services</SelectItem>
                                          <SelectItem value="getCustomerBalance">Get Customer Balance</SelectItem>
                                          <SelectItem value="getCustomerById">Get Customer Details</SelectItem>
                                          <SelectItem value="getCustomerTickets">Get Customer Tickets</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label className="text-xs">Customer ID</Label>
                                      <VariableFieldPicker
                                        value={pathStep.config?.customerId || ''}
                                        onChange={(value) => updatePathStep(pathIndex, stepIndex, {
                                          config: { ...pathStep.config, customerId: value }
                                        })}
                                        placeholder="{{trigger.customer_id}}"
                                      />
                                    </div>
                                  </div>
                                )}
                                
                                {pathStep.type === 'splynx_ticket_message' && (
                                  <div className="space-y-3 pt-2 border-t">
                                    <div>
                                      <Label className="text-xs">Ticket ID</Label>
                                      <VariableFieldPicker
                                        value={pathStep.config?.ticketId || ''}
                                        onChange={(value) => updatePathStep(pathIndex, stepIndex, {
                                          config: { ...pathStep.config, ticketId: value }
                                        })}
                                        placeholder="{{trigger.id}} or leave empty to auto-detect"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Message</Label>
                                      <Textarea
                                        value={pathStep.config?.message || ''}
                                        onChange={(e) => updatePathStep(pathIndex, stepIndex, {
                                          config: { ...pathStep.config, message: e.target.value }
                                        })}
                                        placeholder="Message content (supports {{variables}})"
                                        rows={4}
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={pathStep.config?.isHidden !== false}
                                        onCheckedChange={(checked) => updatePathStep(pathIndex, stepIndex, {
                                          config: { ...pathStep.config, isHidden: checked }
                                        })}
                                      />
                                      <Label className="text-xs">Private message (hidden from customer)</Label>
                                    </div>
                                  </div>
                                )}
                                
                                {pathStep.type === 'log_event' && (
                                  <div className="space-y-3 pt-2 border-t">
                                    <div>
                                      <Label className="text-xs">Message</Label>
                                      <Textarea
                                        value={pathStep.config?.message || ''}
                                        onChange={(e) => updatePathStep(pathIndex, stepIndex, {
                                          config: { ...pathStep.config, message: e.target.value }
                                        })}
                                        placeholder="Log message with {{variables}}"
                                        rows={2}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Level</Label>
                                      <Select
                                        value={pathStep.config?.level || 'info'}
                                        onValueChange={(value) => updatePathStep(pathIndex, stepIndex, {
                                          config: { ...pathStep.config, level: value }
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
                                
                                {pathStep.type === 'conditional_paths' && (
                                  <NestedConditionalEditor
                                    pathStep={pathStep}
                                    pathIndex={pathIndex}
                                    stepIndex={stepIndex}
                                    updatePathStep={updatePathStep}
                                    getAvailableFields={getAvailableFields}
                                    triggerType={triggerType}
                                    expandedPathSteps={expandedPathSteps}
                                    togglePathStepExpanded={togglePathStepExpanded}
                                    kbDocuments={kbDocuments}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addPathStep(pathIndex)}
                        className="mt-1"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Step
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
            
            <Button
              variant="outline"
              onClick={addConditionPath}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Condition Path
            </Button>
            
            <Card className="p-4 border-l-4 border-l-gray-400">
              <div className="space-y-3">
                <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  Default Path (when no conditions match)
                </Badge>
                
                <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  <Label className="text-xs text-muted-foreground mb-2 block">Steps to execute:</Label>
                  
                  {(defaultPath.steps || []).map((pathStep: any, stepIndex: number) => {
                    const pathStepType = STEP_TYPES[pathStep.type as keyof typeof STEP_TYPES];
                    const stableStepId = `default-${pathStep.id || stepIndex}`;
                    const isPathStepExpanded = expandedPathSteps.has(stableStepId);
                    
                    return (
                      <div key={stableStepId} className="mb-2 bg-gray-50 dark:bg-gray-900 rounded border">
                        <div 
                          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={() => togglePathStepExpanded(stableStepId)}
                        >
                          <div className={`p-1.5 rounded ${pathStepType?.color || 'bg-gray-500'} text-white`}>
                            {pathStepType?.icon && <pathStepType.icon className="h-3 w-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{pathStep.name || 'Unnamed Step'}</div>
                            <div className="text-xs text-muted-foreground">{pathStepType?.label || pathStep.type}</div>
                          </div>
                          <Settings className={`h-4 w-4 text-muted-foreground transition-transform ${isPathStepExpanded ? 'rotate-90' : ''}`} />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeDefaultPathStep(stepIndex);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        
                        {isPathStepExpanded && (
                          <div className="p-3 border-t space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Step Name</Label>
                                <Input
                                  placeholder="Step name"
                                  value={pathStep.name}
                                  onChange={(e) => updateDefaultPathStep(stepIndex, { name: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Step Type</Label>
                                <Select
                                  value={pathStep.type}
                                  onValueChange={(value) => updateDefaultPathStep(stepIndex, { type: value, config: {} })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="create_work_item">Create Work Item</SelectItem>
                                    <SelectItem value="integration_action">Integration Action</SelectItem>
                                    <SelectItem value="splynx_query">Splynx Query</SelectItem>
                                    <SelectItem value="splynx_ticket_message">Send Ticket Message</SelectItem>
                                    <SelectItem value="ai_draft_response">AI Draft Response</SelectItem>
                                    <SelectItem value="log_event">Log Event</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            {pathStep.type === 'create_work_item' && (
                              <div className="space-y-3 pt-2 border-t">
                                <div>
                                  <Label className="text-xs">Title</Label>
                                  <VariableFieldPicker
                                    value={pathStep.config?.title || ''}
                                    onChange={(value) => updateDefaultPathStep(stepIndex, {
                                      config: { ...pathStep.config, title: value }
                                    })}
                                    placeholder="e.g., Support Ticket: {{trigger.subject}}"
                                    availableFields={getAvailableFields()}
                                    variablePrefix={triggerType === 'webhook' ? 'trigger' : 'currentItem'}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Description</Label>
                                  <VariableFieldPicker
                                    value={pathStep.config?.description || ''}
                                    onChange={(value) => updateDefaultPathStep(stepIndex, {
                                      config: { ...pathStep.config, description: value }
                                    })}
                                    placeholder="e.g., Customer: {{trigger.customer_id}}"
                                    multiline
                                    availableFields={getAvailableFields()}
                                    variablePrefix={triggerType === 'webhook' ? 'trigger' : 'currentItem'}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Status</Label>
                                    <Select
                                      value={pathStep.config?.status || 'Planning'}
                                      onValueChange={(value) => updateDefaultPathStep(stepIndex, {
                                        config: { ...pathStep.config, status: value }
                                      })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Planning">Planning</SelectItem>
                                        <SelectItem value="Ready">Ready</SelectItem>
                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                        <SelectItem value="Stuck">Stuck</SelectItem>
                                        <SelectItem value="Completed">Completed</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Due Date</Label>
                                    <Input
                                      placeholder="+7 days or YYYY-MM-DD"
                                      value={pathStep.config?.dueDate || ''}
                                      onChange={(e) => updateDefaultPathStep(stepIndex, {
                                        config: { ...pathStep.config, dueDate: e.target.value }
                                      })}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <WorkflowTemplateSelector
                                    value={pathStep.config?.templateId || ''}
                                    onChange={(value) => updateDefaultPathStep(stepIndex, {
                                      config: { ...pathStep.config, templateId: value }
                                    })}
                                    label="Workflow Template"
                                    placeholder="Select a template"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Splynx Ticket ID</Label>
                                    <VariableFieldPicker
                                      value={pathStep.config?.splynxTicketId || ''}
                                      onChange={(value) => updateDefaultPathStep(stepIndex, {
                                        config: { ...pathStep.config, splynxTicketId: value }
                                      })}
                                      placeholder="{{trigger.id}}"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Splynx Customer ID</Label>
                                    <VariableFieldPicker
                                      value={pathStep.config?.splynxCustomerId || ''}
                                      onChange={(value) => updateDefaultPathStep(stepIndex, {
                                        config: { ...pathStep.config, splynxCustomerId: value }
                                      })}
                                      placeholder="{{trigger.customer_id}}"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Assign to Team</Label>
                                    <Select
                                      value={pathStep.config?.teamId?.toString() || 'none'}
                                      onValueChange={(value) => updateDefaultPathStep(stepIndex, {
                                        config: { ...pathStep.config, teamId: value !== 'none' ? parseInt(value) : undefined }
                                      })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select team (optional)" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">No team</SelectItem>
                                        {teams.map((team) => (
                                          <SelectItem key={team.id} value={team.id.toString()}>
                                            {team.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Assign to User</Label>
                                    <Select
                                      value={pathStep.config?.assigneeId?.toString() || 'none'}
                                      onValueChange={(value) => updateDefaultPathStep(stepIndex, {
                                        config: { ...pathStep.config, assigneeId: value !== 'none' ? parseInt(value) : undefined }
                                      })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select user (optional)" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">No user</SelectItem>
                                        {users.map((user) => (
                                          <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.fullName || user.email}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {pathStep.type === 'ai_draft_response' && (
                              <div className="space-y-3 pt-2 border-t">
                                <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-sm">
                                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                    <Bot className="h-4 w-4" />
                                    <span>Uses AI settings from Integration Hub → AI Ticket Drafting</span>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs">System Prompt Override (optional)</Label>
                                  <Textarea
                                    value={pathStep.config?.systemPrompt || ''}
                                    onChange={(e) => updateDefaultPathStep(stepIndex, {
                                      config: { ...pathStep.config, systemPrompt: e.target.value }
                                    })}
                                    placeholder="Custom prompt for this path (leave blank to use default)"
                                    rows={3}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">AI Instructions Documents</Label>
                                  <p className="text-xs text-muted-foreground mb-2">Select KB documents to use as AI instructions</p>
                                  {kbDocuments.length > 0 ? (
                                    <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
                                      {kbDocuments
                                        .filter(doc => doc.documentType === 'ai_prompt' || doc.documentType === 'system_prompt')
                                        .length > 0 ? (
                                        kbDocuments
                                          .filter(doc => doc.documentType === 'ai_prompt' || doc.documentType === 'system_prompt')
                                          .map(doc => {
                                            const selectedDocs = pathStep.config?.instructionDocIds || [];
                                            const isSelected = selectedDocs.includes(doc.id);
                                            return (
                                              <div
                                                key={doc.id}
                                                className="flex items-start gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                                                onClick={() => {
                                                  const current = pathStep.config?.instructionDocIds || [];
                                                  const updated = isSelected
                                                    ? current.filter((id: number) => id !== doc.id)
                                                    : [...current, doc.id];
                                                  updateDefaultPathStep(stepIndex, {
                                                    config: { ...pathStep.config, instructionDocIds: updated }
                                                  });
                                                }}
                                              >
                                                <Checkbox checked={isSelected} className="mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                  <span className="text-xs font-medium">{doc.title}</span>
                                                  {doc.summary && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1">{doc.summary}</p>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })
                                      ) : (
                                        <p className="text-xs text-muted-foreground p-2">No AI instruction documents found. Create one with type "AI Prompt" or "System Prompt".</p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground p-2 border rounded">Loading documents...</p>
                                  )}
                                  {(pathStep.config?.instructionDocIds?.length || 0) > 0 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {pathStep.config?.instructionDocIds?.length} document(s) selected
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={pathStep.config?.useKnowledgeBase !== false}
                                    onCheckedChange={(checked) => updateDefaultPathStep(stepIndex, {
                                      config: { ...pathStep.config, useKnowledgeBase: checked }
                                    })}
                                  />
                                  <Label className="text-xs">Use Knowledge Base (reference docs)</Label>
                                </div>
                              </div>
                            )}
                            
                            {pathStep.type === 'splynx_query' && (
                              <div className="space-y-3 pt-2 border-t">
                                <div>
                                  <Label className="text-xs">Action</Label>
                                  <Select
                                    value={pathStep.config?.action || 'getCustomerServices'}
                                    onValueChange={(value) => updateDefaultPathStep(stepIndex, {
                                      config: { ...pathStep.config, action: value }
                                    })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="getCustomerServices">Get Customer Services</SelectItem>
                                      <SelectItem value="getCustomerBalance">Get Customer Balance</SelectItem>
                                      <SelectItem value="getCustomerById">Get Customer Details</SelectItem>
                                      <SelectItem value="getCustomerTickets">Get Customer Tickets</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Customer ID</Label>
                                  <VariableFieldPicker
                                    value={pathStep.config?.customerId || ''}
                                    onChange={(value) => updateDefaultPathStep(stepIndex, {
                                      config: { ...pathStep.config, customerId: value }
                                    })}
                                    placeholder="{{trigger.customer_id}}"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {pathStep.type === 'splynx_ticket_message' && (
                              <div className="space-y-3 pt-2 border-t">
                                <div>
                                  <Label className="text-xs">Ticket ID</Label>
                                  <VariableFieldPicker
                                    value={pathStep.config?.ticketId || ''}
                                    onChange={(value) => updateDefaultPathStep(stepIndex, {
                                      config: { ...pathStep.config, ticketId: value }
                                    })}
                                    placeholder="{{trigger.id}} or leave empty to auto-detect"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Message</Label>
                                  <Textarea
                                    value={pathStep.config?.message || ''}
                                    onChange={(e) => updateDefaultPathStep(stepIndex, {
                                      config: { ...pathStep.config, message: e.target.value }
                                    })}
                                    placeholder="Message content (supports {{variables}})"
                                    rows={4}
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={pathStep.config?.isHidden !== false}
                                    onCheckedChange={(checked) => updateDefaultPathStep(stepIndex, {
                                      config: { ...pathStep.config, isHidden: checked }
                                    })}
                                  />
                                  <Label className="text-xs">Private message (hidden from customer)</Label>
                                </div>
                              </div>
                            )}
                            
                            {pathStep.type === 'log_event' && (
                              <div className="space-y-3 pt-2 border-t">
                                <div>
                                  <Label className="text-xs">Message</Label>
                                  <Textarea
                                    value={pathStep.config?.message || ''}
                                    onChange={(e) => updateDefaultPathStep(stepIndex, {
                                      config: { ...pathStep.config, message: e.target.value }
                                    })}
                                    placeholder="Log message with {{variables}}"
                                    rows={2}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Level</Label>
                                  <Select
                                    value={pathStep.config?.level || 'info'}
                                    onValueChange={(value) => updateDefaultPathStep(stepIndex, {
                                      config: { ...pathStep.config, level: value }
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
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addDefaultPathStep}
                    className="mt-1"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Step
                  </Button>
                </div>
              </div>
            </Card>
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