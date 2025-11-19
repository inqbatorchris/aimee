import { useState } from 'react';
import { ChevronRight, Hash, User, Mail, Tags, Calendar, MapPin, FileText, Database, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkflowStep {
  id: string;
  type: string;
  name: string;
  config?: any;
}

interface DataInspectorPanelProps {
  steps: WorkflowStep[];
  currentStepIndex: number;
}

interface FieldInfo {
  name: string;
  type: string;
  icon: React.ElementType;
}

const COMMON_FIELDS: Record<string, FieldInfo[]> = {
  customers: [
    { name: 'id', type: 'number', icon: Hash },
    { name: 'name', type: 'string', icon: User },
    { name: 'email', type: 'string', icon: Mail },
    { name: 'phone', type: 'string', icon: User },
    { name: 'customer_labels', type: 'array', icon: Tags },
    { name: 'status', type: 'string', icon: FileText },
    { name: 'street_1', type: 'string', icon: MapPin },
    { name: 'city', type: 'string', icon: MapPin },
    { name: 'date_add', type: 'string', icon: Calendar },
  ],
  leads: [
    { name: 'id', type: 'number', icon: Hash },
    { name: 'name', type: 'string', icon: User },
    { name: 'email', type: 'string', icon: Mail },
    { name: 'phone', type: 'string', icon: User },
    { name: 'status', type: 'string', icon: FileText },
    { name: 'source', type: 'string', icon: FileText },
  ],
  workItems: [
    { name: 'id', type: 'number', icon: Hash },
    { name: 'title', type: 'string', icon: FileText },
    { name: 'description', type: 'string', icon: FileText },
    { name: 'status', type: 'string', icon: FileText },
    { name: 'assignedTo', type: 'number', icon: User },
  ],
};

export function DataInspectorPanel({ steps, currentStepIndex }: DataInspectorPanelProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  // Get all previous steps that output data
  const dataSteps = steps
    .slice(0, currentStepIndex)
    .filter(step => step.config?.resultVariable);

  const toggleExpand = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (expandedSteps.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVar(text);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const getFieldsForVariable = (varName: string, step: WorkflowStep): FieldInfo[] => {
    // Try to infer fields based on variable name or step type
    const lowerVarName = varName.toLowerCase();
    
    if (lowerVarName.includes('customer')) {
      return COMMON_FIELDS.customers;
    } else if (lowerVarName.includes('lead')) {
      return COMMON_FIELDS.leads;
    } else if (lowerVarName.includes('work') || lowerVarName.includes('item')) {
      return COMMON_FIELDS.workItems;
    }
    
    // Check step type
    if (step.type === 'splynx_query') {
      const entity = step.config?.parameters?.entity;
      if (entity === 'customers') return COMMON_FIELDS.customers;
      if (entity === 'leads') return COMMON_FIELDS.leads;
    }
    
    if (step.type === 'data_source_query') {
      const tableName = step.config?.parameters?.tableName;
      if (tableName === 'work_items') return COMMON_FIELDS.workItems;
    }
    
    // Default generic fields
    return [
      { name: 'id', type: 'number', icon: Hash },
      { name: 'name', type: 'string', icon: User },
      { name: 'value', type: 'any', icon: FileText },
    ];
  };

  if (dataSteps.length === 0) {
    return (
      <div className="border-l bg-gray-50 dark:bg-gray-900 p-4 w-80 overflow-y-auto" data-testid="panel-data-inspector-empty">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-4 w-4 text-gray-500" />
          <h3 className="font-semibold text-sm">Available Data</h3>
        </div>
        <p className="text-sm text-gray-500 text-center py-8">
          No data available from previous steps.
          <br />
          <span className="text-xs">Add a query step to see available fields here.</span>
        </p>
      </div>
    );
  }

  return (
    <div className="border-l bg-gray-50 dark:bg-gray-900 p-4 w-80 overflow-y-auto" data-testid="panel-data-inspector">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-4 w-4 text-gray-500" />
        <h3 className="font-semibold text-sm">Available Data</h3>
      </div>
      
      <div className="space-y-2">
        {dataSteps.map(step => {
          const varName = step.config.resultVariable;
          const isExpanded = expandedSteps.has(step.id);
          const fields = getFieldsForVariable(varName, step);
          
          return (
            <div 
              key={step.id} 
              className="border rounded bg-white dark:bg-gray-800 overflow-hidden"
              data-testid={`data-step-${step.id}`}
            >
              <button
                type="button"
                className="w-full flex items-center gap-2 p-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => toggleExpand(step.id)}
                data-testid={`button-toggle-${varName}`}
              >
                <ChevronRight 
                  className={`h-3 w-3 text-gray-500 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                />
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="font-mono font-semibold text-blue-600 dark:text-blue-400 truncate">
                      {varName}
                    </code>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(`{{${varName}}}`);
                      }}
                      title="Copy variable name"
                      data-testid={`button-copy-${varName}`}
                    >
                      {copiedVar === `{{${varName}}}` ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {step.name}
                  </div>
                </div>
                <span className="text-xs text-gray-500 shrink-0">array</span>
              </button>
              
              {isExpanded && (
                <div className="border-t px-3 py-2 bg-gray-50 dark:bg-gray-900">
                  <div className="text-xs font-mono text-gray-600 dark:text-gray-400 mb-2">
                    [{'{'}0{'}'}] Object
                  </div>
                  <div className="ml-3 space-y-1.5">
                    {fields.map(field => {
                      const Icon = field.icon;
                      const fullPath = `{{${varName}.0.${field.name}}}`;
                      const loopPath = `{{currentItem.${field.name}}}`;
                      
                      return (
                        <div 
                          key={field.name} 
                          className="flex items-center gap-2 text-xs group"
                          data-testid={`field-${field.name}`}
                        >
                          <Icon className="h-3 w-3 text-gray-400 shrink-0" />
                          <code className="font-mono flex-1">
                            {field.name}: <span className="text-blue-600 dark:text-blue-400">{field.type}</span>
                          </code>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => copyToClipboard(loopPath)}
                            title="Copy for loop usage"
                            data-testid={`button-copy-field-${field.name}`}
                          >
                            {copiedVar === loopPath ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>In a loop:</strong> Use <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">currentItem.fieldName</code>
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
