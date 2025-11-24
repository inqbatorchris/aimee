import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ArrowRight, Database } from 'lucide-react';
import type { WorkflowTemplateStep } from './WorkflowTemplateStepBuilder';

export interface FieldMapping {
  id: string;
  sourceStepId: string;
  sourceField: string;
  targetField: string;
}

export interface DatabaseConfig {
  targetTable: string;
  recordIdSource: string;
}

export interface CompletionCallback {
  id: string;
  integrationName: string;
  action: string;
  webhookUrl?: string;
  webhookMethod?: string;
  fieldMappings: FieldMapping[];
  databaseConfig?: DatabaseConfig;
}

interface CompletionCallbackEditorProps {
  steps: WorkflowTemplateStep[];
  callbacks: CompletionCallback[];
  onChange: (callbacks: CompletionCallback[]) => void;
}

// Helper to get all available fields from a step
const getStepFields = (step: WorkflowTemplateStep): Array<{ id: string; label: string }> => {
  const fields: Array<{ id: string; label: string }> = [];
  
  switch (step.type) {
    case 'geolocation':
      fields.push(
        { id: 'latitude', label: 'Latitude' },
        { id: 'longitude', label: 'Longitude' },
        { id: 'accuracy', label: 'Accuracy' },
        { id: 'altitude', label: 'Altitude' },
        { id: 'what3words', label: 'What3Words' },
        { id: 'address', label: 'Address' }
      );
      break;
    
    case 'form':
      if (step.formFields) {
        step.formFields.forEach(field => {
          fields.push({ id: field.id, label: field.label });
        });
      }
      break;
    
    case 'notes':
      fields.push({ id: 'notes', label: 'Notes' });
      break;
    
    case 'measurement':
      fields.push(
        { id: 'value', label: 'Measurement Value' },
        { id: 'unit', label: 'Unit' }
      );
      break;
    
    case 'photo':
      // Add OCR extracted fields if configured
      const photoStep = step as any;
      if (photoStep.photoAnalysisConfig?.extractions && photoStep.photoAnalysisConfig.extractions.length > 0) {
        photoStep.photoAnalysisConfig.extractions.forEach((extraction: any) => {
          if (extraction.targetField && extraction.displayLabel) {
            fields.push({ 
              id: extraction.targetField, 
              label: `${extraction.displayLabel} (OCR)` 
            });
          }
        });
      }
      // Also include photos array
      fields.push({ id: 'photos', label: 'Photos (auto-collected)' });
      break;
  }
  
  return fields;
};

export default function CompletionCallbackEditor({ 
  steps, 
  callbacks, 
  onChange 
}: CompletionCallbackEditorProps) {
  const [editingCallback, setEditingCallback] = useState<CompletionCallback | null>(null);

  const handleAddCallback = () => {
    const newCallback: CompletionCallback = {
      id: `callback-${Date.now()}`,
      integrationName: 'fiber-network',
      action: 'create-node',
      webhookUrl: '/api/fiber-network/nodes/from-workflow',
      webhookMethod: 'POST',
      fieldMappings: [],
    };
    
    onChange([...callbacks, newCallback]);
    setEditingCallback(newCallback);
  };

  const handleUpdateCallback = (callbackId: string, updates: Partial<CompletionCallback>) => {
    const updated = callbacks.map(cb => {
      if (cb.id !== callbackId) return cb;
      
      // If action is being changed, replace the entire callback to prevent stale data
      if (updates.action && updates.action !== cb.action) {
        return updates as CompletionCallback;
      }
      
      // Otherwise, merge updates
      return { ...cb, ...updates };
    });
    onChange(updated);
    
    if (editingCallback?.id === callbackId) {
      // If action changed, replace editing callback completely
      if (updates.action && updates.action !== editingCallback.action) {
        setEditingCallback(updates as CompletionCallback);
      } else {
        setEditingCallback({ ...editingCallback, ...updates });
      }
    }
  };

  const handleDeleteCallback = (callbackId: string) => {
    onChange(callbacks.filter(cb => cb.id !== callbackId));
    if (editingCallback?.id === callbackId) {
      setEditingCallback(null);
    }
  };

  const handleAddMapping = (callbackId: string) => {
    const callback = callbacks.find(cb => cb.id === callbackId);
    if (!callback) return;

    const newMapping: FieldMapping = {
      id: `mapping-${Date.now()}`,
      sourceStepId: steps[0]?.id || '',
      sourceField: '',
      targetField: '',
    };

    handleUpdateCallback(callbackId, {
      fieldMappings: [...(callback.fieldMappings || []), newMapping],
    });
  };

  const handleUpdateMapping = (
    callbackId: string, 
    mappingId: string, 
    updates: Partial<FieldMapping>
  ) => {
    const callback = callbacks.find(cb => cb.id === callbackId);
    if (!callback) return;

    const updatedMappings = (callback.fieldMappings || []).map(m =>
      m.id === mappingId ? { ...m, ...updates } : m
    );

    handleUpdateCallback(callbackId, { fieldMappings: updatedMappings });
  };

  const handleDeleteMapping = (callbackId: string, mappingId: string) => {
    const callback = callbacks.find(cb => cb.id === callbackId);
    if (!callback) return;

    handleUpdateCallback(callbackId, {
      fieldMappings: (callback.fieldMappings || []).filter(m => m.id !== mappingId),
    });
  };

  const currentCallback = editingCallback || (callbacks.length > 0 ? callbacks[0] : null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Completion Callbacks</h3>
          <p className="text-sm text-muted-foreground">
            Configure actions to run when this workflow is completed
          </p>
        </div>
        <Button
          onClick={handleAddCallback}
          size="sm"
          variant="outline"
          data-testid="button-add-callback"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Callback
        </Button>
      </div>

      {callbacks.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <Database className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">No callbacks configured</p>
                <p className="text-sm text-muted-foreground">
                  Add a callback to automatically save workflow data back to a source record
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Callback List */}
          <div className="space-y-2">
            {callbacks.map(callback => (
              <Card 
                key={callback.id}
                className={editingCallback?.id === callback.id ? 'border-primary' : ''}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {callback.action === 'create-node' ? 'Create Fiber Network Chamber' : callback.action}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {(callback.fieldMappings || []).length} field{(callback.fieldMappings || []).length === 1 ? '' : 's'} mapped
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCallback(callback)}
                        data-testid={`button-edit-callback-${callback.id}`}
                      >
                        {editingCallback?.id === callback.id ? 'Editing' : 'Edit'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCallback(callback.id)}
                        data-testid={`button-delete-callback-${callback.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Callback Editor */}
          {currentCallback && (
            <Card>
              <CardHeader>
                <CardTitle>Configure Callback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Integration Settings */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Integration</Label>
                      <Select
                        value={currentCallback.integrationName}
                        onValueChange={(value) => 
                          handleUpdateCallback(currentCallback.id, { integrationName: value })
                        }
                      >
                        <SelectTrigger data-testid="select-integration-name">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fiber-network">Fiber Network</SelectItem>
                          <SelectItem value="custom">Custom Webhook</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Action</Label>
                      <Select
                        value={currentCallback.action}
                        onValueChange={(value) => {
                          const callback = callbacks.find(cb => cb.id === currentCallback.id);
                          if (!callback) return;

                          // Completely reconstruct the callback to prevent stale data
                          const baseCallback = {
                            id: callback.id,
                            integrationName: callback.integrationName,
                            action: value,
                            fieldMappings: callback.fieldMappings || [],
                          };

                          if (value === 'database_integration') {
                            // Database integration: add databaseConfig, no webhookUrl
                            handleUpdateCallback(currentCallback.id, {
                              ...baseCallback,
                              databaseConfig: {
                                targetTable: 'work_item_source', // Dynamic resolution
                                recordIdSource: 'work_item_source',
                              },
                            });
                          } else {
                            // Webhook action: add webhookUrl/method, no databaseConfig
                            handleUpdateCallback(currentCallback.id, {
                              ...baseCallback,
                              webhookUrl: callback.webhookUrl || '/api/fiber-network/nodes/from-workflow',
                              webhookMethod: callback.webhookMethod || 'POST',
                            });
                          }
                        }}
                      >
                        <SelectTrigger data-testid="select-action">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="create-node">Create Node</SelectItem>
                          <SelectItem value="update-node">Update Node</SelectItem>
                          <SelectItem value="database_integration">Database Integration (OCR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {currentCallback.action === 'database_integration' && currentCallback.databaseConfig && (
                    <div className="space-y-4 p-4 bg-muted/50 border rounded-md">
                      <div className="space-y-2">
                        <Label>Target Table</Label>
                        <Select
                          value={currentCallback.databaseConfig.targetTable}
                          onValueChange={(value) => 
                            handleUpdateCallback(currentCallback.id, {
                              databaseConfig: {
                                ...currentCallback.databaseConfig!,
                                targetTable: value,
                              },
                            })
                          }
                        >
                          <SelectTrigger data-testid="select-target-table">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="work_item_source">Source Record (Dynamic)</SelectItem>
                            <SelectItem value="address_records">Address Records (Explicit)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          "Source Record" dynamically resolves to the table linked to the work item
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Record ID Source</Label>
                        <Select
                          value={currentCallback.databaseConfig.recordIdSource}
                          onValueChange={(value) => 
                            handleUpdateCallback(currentCallback.id, {
                              databaseConfig: {
                                ...currentCallback.databaseConfig!,
                                recordIdSource: value,
                              },
                            })
                          }
                        >
                          <SelectTrigger data-testid="select-record-id-source">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="work_item_source">Work Item Source</SelectItem>
                            <SelectItem value="workflow_metadata.addressId">Workflow Metadata - addressId</SelectItem>
                            <SelectItem value="workflow_metadata.customerId">Workflow Metadata - customerId</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          How to find the target record to update
                        </p>
                      </div>
                    </div>
                  )}

                  {currentCallback.action !== 'database_integration' && (
                    <div className="space-y-2">
                      <Label>Webhook URL</Label>
                      <Input
                        value={currentCallback.webhookUrl || ''}
                        onChange={(e) => 
                          handleUpdateCallback(currentCallback.id, { webhookUrl: e.target.value })
                        }
                        placeholder="/api/fiber-network/nodes/from-workflow"
                        data-testid="input-webhook-url"
                      />
                    </div>
                  )}
                </div>

                {/* Field Mappings */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Field Mappings</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddMapping(currentCallback.id)}
                      data-testid="button-add-mapping"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Mapping
                    </Button>
                  </div>

                  {(currentCallback.fieldMappings || []).length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-6 border rounded-md">
                      No field mappings yet. Click "Add Mapping" to map workflow fields to target fields.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(currentCallback.fieldMappings || []).map(mapping => {
                        const selectedStep = steps.find(s => s.id === mapping.sourceStepId);
                        const availableFields = selectedStep ? getStepFields(selectedStep) : [];

                        return (
                          <div 
                            key={mapping.id}
                            className="p-3 border rounded-md bg-muted/30 space-y-3"
                          >
                            <div className="flex items-center gap-2">
                              {/* Source Step */}
                              <div className="flex-1 space-y-2">
                                <Label className="text-xs">From Step</Label>
                                <Select
                                  value={mapping.sourceStepId}
                                  onValueChange={(value) => 
                                    handleUpdateMapping(currentCallback.id, mapping.id, { 
                                      sourceStepId: value,
                                      sourceField: '' // Reset field when step changes
                                    })
                                  }
                                >
                                  <SelectTrigger data-testid={`select-source-step-${mapping.id}`}>
                                    <SelectValue placeholder="Select step" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {steps.map(step => (
                                      <SelectItem key={step.id} value={step.id}>
                                        {step.title || step.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Source Field */}
                              <div className="flex-1 space-y-2">
                                <Label className="text-xs">Field</Label>
                                <Select
                                  value={mapping.sourceField}
                                  onValueChange={(value) => 
                                    handleUpdateMapping(currentCallback.id, mapping.id, { sourceField: value })
                                  }
                                  disabled={!mapping.sourceStepId}
                                >
                                  <SelectTrigger data-testid={`select-source-field-${mapping.id}`}>
                                    <SelectValue placeholder="Select field" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableFields.map(field => (
                                      <SelectItem key={field.id} value={field.id}>
                                        {field.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-6" />

                              {/* Target Field */}
                              <div className="flex-1 space-y-2">
                                <Label className="text-xs">To Database Field</Label>
                                <Input
                                  value={mapping.targetField}
                                  onChange={(e) => 
                                    handleUpdateMapping(currentCallback.id, mapping.id, { 
                                      targetField: e.target.value 
                                    })
                                  }
                                  placeholder="e.g., chamberName, latitude"
                                  data-testid={`input-target-field-${mapping.id}`}
                                />
                              </div>

                              {/* Delete Button */}
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="flex-shrink-0 mt-6"
                                onClick={() => handleDeleteMapping(currentCallback.id, mapping.id)}
                                data-testid={`button-delete-mapping-${mapping.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick Reference */}
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md">
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
                      💡 Quick Reference - Common Field Mappings for Chamber Records:
                    </p>
                    <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="font-mono">latitude → latitude</span>
                        <span className="font-mono">longitude → longitude</span>
                        <span className="font-mono">chamber-name → chamberName</span>
                        <span className="font-mono">network → network</span>
                        <span className="font-mono">chamber-type → chamberType</span>
                        <span className="font-mono">what3words → what3words</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
