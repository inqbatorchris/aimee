import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ArrowRight, Database, Clock, CheckCircle2 } from 'lucide-react';
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

interface TableColumn {
  id: string;
  name: string;
  label: string;
}

interface TableInfo {
  id: string;
  name: string;
  description: string;
  isDynamic: boolean;
  columns: TableColumn[];
}

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
      const photoStep = step as any;
      const photoConfig = photoStep.config?.photoAnalysisConfig || photoStep.photoAnalysisConfig;
      
      if (photoConfig?.extractions && photoConfig.extractions.length > 0) {
        photoConfig.extractions.forEach((extraction: any) => {
          if (extraction.targetField) {
            const label = extraction.displayLabel || extraction.extractionPrompt || extraction.targetField;
            fields.push({ 
              id: extraction.targetField, 
              label: `${label} (OCR)` 
            });
          }
        });
      }
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
  const [availableColumns, setAvailableColumns] = useState<TableColumn[]>([]);

  const { data: tablesData } = useQuery<{ tables: TableInfo[] }>({
    queryKey: ['/api/fields/tables'],
  });

  const tables = tablesData?.tables || [];

  useEffect(() => {
    if (editingCallback?.databaseConfig?.targetTable && tables.length > 0) {
      const selectedTableId = editingCallback.databaseConfig.targetTable;
      const targetTable = tables.find(t => t.id === selectedTableId);
      
      // For dynamic "work_item_source", use address_records columns as they're the most common
      if (selectedTableId === 'work_item_source' || targetTable?.isDynamic) {
        const addressTable = tables.find(t => t.id === 'address_records');
        if (addressTable) {
          console.log('[CompletionCallbackEditor] Using address_records columns for dynamic source:', addressTable.columns);
          setAvailableColumns(addressTable.columns);
        }
      } else if (targetTable && targetTable.columns.length > 0) {
        console.log('[CompletionCallbackEditor] Using columns from:', selectedTableId, targetTable.columns);
        setAvailableColumns(targetTable.columns);
      }
    }
  }, [editingCallback?.databaseConfig?.targetTable, tables]);

  // Also update columns when tables data first loads
  useEffect(() => {
    if (tables.length > 0 && availableColumns.length === 0) {
      // Default to address_records columns
      const addressTable = tables.find(t => t.id === 'address_records');
      if (addressTable) {
        console.log('[CompletionCallbackEditor] Initial load - setting columns from address_records');
        setAvailableColumns(addressTable.columns);
      }
    }
  }, [tables, availableColumns.length]);

  const handleAddCallback = () => {
    const newCallback: CompletionCallback = {
      id: `callback-${Date.now()}`,
      integrationName: 'database',
      action: 'database_integration',
      fieldMappings: [],
      databaseConfig: {
        targetTable: 'work_item_source',
        recordIdSource: 'work_item_source',
      },
    };
    
    onChange([...callbacks, newCallback]);
    setEditingCallback(newCallback);
  };

  const handleUpdateCallback = (callbackId: string, updates: Partial<CompletionCallback>) => {
    const updated = callbacks.map(cb => {
      if (cb.id !== callbackId) return cb;
      if (updates.action && updates.action !== cb.action) {
        return updates as CompletionCallback;
      }
      return { ...cb, ...updates };
    });
    onChange(updated);
    
    if (editingCallback?.id === callbackId) {
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

    const photoStep = steps.find(s => s.type === 'photo');
    
    const newMapping: FieldMapping = {
      id: `mapping-${Date.now()}`,
      sourceStepId: photoStep?.id || steps[0]?.id || '',
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

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'database_integration': return 'Write to Database';
      case 'create-node': return 'Create Fiber Network Node';
      case 'update-node': return 'Update Fiber Network Node';
      default: return action;
    }
  };

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
                        {getActionLabel(callback.action)}
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

          {currentCallback && currentCallback.action === 'database_integration' && (
            <div className="space-y-4">
              {/* Panel A: Where to Write Data */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Where to Write Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Target Table</Label>
                    <Select
                      value={currentCallback.databaseConfig?.targetTable || 'work_item_source'}
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
                        {tables.map(table => (
                          <SelectItem key={table.id} value={table.id}>
                            {table.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {currentCallback.databaseConfig?.targetTable === 'work_item_source' && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        "Dynamic" means: If this work item is linked to an address, data writes to that address. 
                        If linked to a customer, writes to that customer.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Panel B: Field Mappings */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Field Mappings
                    </CardTitle>
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
                </CardHeader>
                <CardContent>
                  {(currentCallback.fieldMappings || []).length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-6 border rounded-md border-dashed">
                      No field mappings yet. Click "Add Mapping" to map OCR fields to database columns.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Header Row */}
                      <div className="grid grid-cols-[1fr_1fr_24px_1fr_40px] gap-2 px-3 text-xs font-medium text-muted-foreground">
                        <span>From Step</span>
                        <span>OCR Field</span>
                        <span></span>
                        <span>Database Column</span>
                        <span></span>
                      </div>
                      
                      {(currentCallback.fieldMappings || []).map(mapping => {
                        const selectedStep = steps.find(s => s.id === mapping.sourceStepId);
                        const availableFields = selectedStep ? getStepFields(selectedStep) : [];

                        return (
                          <div 
                            key={mapping.id}
                            className="grid grid-cols-[1fr_1fr_24px_1fr_40px] gap-2 items-center p-3 border rounded-md bg-muted/30"
                          >
                            {/* Source Step */}
                            <Select
                              value={mapping.sourceStepId}
                              onValueChange={(value) => 
                                handleUpdateMapping(currentCallback.id, mapping.id, { 
                                  sourceStepId: value,
                                  sourceField: ''
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

                            {/* Source Field */}
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
                                {availableFields.length === 0 ? (
                                  <SelectItem value="_none" disabled>
                                    No fields available
                                  </SelectItem>
                                ) : (
                                  availableFields.map(field => (
                                    <SelectItem key={field.id} value={field.id}>
                                      {field.label}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>

                            {/* Arrow */}
                            <ArrowRight className="h-4 w-4 text-muted-foreground justify-self-center" />

                            {/* Target Field - Now a Dropdown */}
                            <Select
                              value={mapping.targetField}
                              onValueChange={(value) => 
                                handleUpdateMapping(currentCallback.id, mapping.id, { targetField: value })
                              }
                            >
                              <SelectTrigger data-testid={`select-target-field-${mapping.id}`}>
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableColumns.length === 0 ? (
                                  <SelectItem value="_none" disabled>
                                    No columns available
                                  </SelectItem>
                                ) : (
                                  availableColumns.map(col => (
                                    <SelectItem key={col.id} value={col.id}>
                                      {col.label}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>

                            {/* Delete Button */}
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteMapping(currentCallback.id, mapping.id)}
                              data-testid={`button-delete-mapping-${mapping.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Panel C: Timing Info */}
              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        Automatic OCR Processing
                      </p>
                      <p className="text-xs text-green-800 dark:text-green-200">
                        The system automatically waits for OCR data extraction to complete before writing to the database.
                        This ensures all photo data is processed before the callback runs.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Non-database callbacks (legacy webhook support) */}
          {currentCallback && currentCallback.action !== 'database_integration' && (
            <Card>
              <CardHeader>
                <CardTitle>Configure Callback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                        const baseCallback = {
                          id: callback.id,
                          integrationName: callback.integrationName,
                          action: value,
                          fieldMappings: callback.fieldMappings || [],
                        };

                        if (value === 'database_integration') {
                          handleUpdateCallback(currentCallback.id, {
                            ...baseCallback,
                            databaseConfig: {
                              targetTable: 'work_item_source',
                              recordIdSource: 'work_item_source',
                            },
                          });
                        } else {
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
                        <SelectItem value="database_integration">Write to Database (OCR)</SelectItem>
                      </SelectContent>
                    </Select>
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
