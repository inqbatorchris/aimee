import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckSquare, Type, Upload, ThumbsUp, Link2, MessageSquare, GripVertical, Trash2, Plus, Camera, FileText, List, PenTool, Ruler, X, MapPin, Ticket, Check, Clock, AlertCircle, Loader2, Database, RefreshCw, CheckCircle } from 'lucide-react';

export interface ChecklistItem {
  id: string;
  name: string;
  checked: boolean;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'date';
  required: boolean;
  options?: string[];
}

export interface PhotoConfig {
  minPhotos: number;
  maxPhotos: number;
  required: boolean;
}

export interface DataOutputConfig {
  entityType?: string;
  syncPhotos?: boolean;
  syncNotes?: boolean;
  syncGeolocation?: boolean;
  targetField?: string;
}

export interface WorkflowTemplateStep {
  id: string;
  type: 'checklist' | 'form' | 'photo' | 'geolocation' | 'signature' | 'measurement' | 'notes' | 'checkbox' | 'text_input' | 'file_upload' | 'approval' | 'kb_link' | 'comment' | 'data_output' | 'splynx_ticket';
  title?: string;
  label?: string;
  description?: string;
  required: boolean;
  order: number;
  config?: any;
  checklistItems?: ChecklistItem[];
  formFields?: FormField[];
  photoConfig?: PhotoConfig;
  dataOutputConfig?: DataOutputConfig;
}

interface WorkflowTemplateStepBuilderProps {
  steps: WorkflowTemplateStep[];
  onChange: (steps: WorkflowTemplateStep[]) => void;
}

const STEP_TYPES = [
  // Field App Types (Primary)
  { value: 'checklist', label: 'Checklist', icon: List, description: 'Multiple checkable items', category: 'field' },
  { value: 'photo', label: 'Photo Capture', icon: Camera, description: 'Take photos with camera', category: 'field' },
  { value: 'geolocation', label: 'Geolocation', icon: MapPin, description: 'Capture GPS coordinates', category: 'field' },
  { value: 'form', label: 'Form', icon: FileText, description: 'Multiple form fields', category: 'field' },
  { value: 'notes', label: 'Notes', icon: MessageSquare, description: 'Free-text notes', category: 'field' },
  { value: 'signature', label: 'Signature', icon: PenTool, description: 'Capture signature', category: 'field' },
  { value: 'measurement', label: 'Measurement', icon: Ruler, description: 'Numeric measurement', category: 'field' },
  
  // Data Integration (NEW)
  { value: 'splynx_ticket', label: 'Splynx Ticket', icon: Ticket, description: 'Manage support ticket - view, respond, update status', category: 'integration' },
  { value: 'data_output', label: 'Save to Source', icon: Upload, description: 'Save workflow data back to originating record', category: 'integration' },
  
  // Legacy Web Types
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare, description: 'Simple yes/no or done/not done', category: 'legacy' },
  { value: 'text_input', label: 'Text Input', icon: Type, description: 'Capture text information', category: 'legacy' },
  { value: 'file_upload', label: 'File Upload', icon: Upload, description: 'Upload files or attachments', category: 'legacy' },
  { value: 'approval', label: 'Approval', icon: ThumbsUp, description: 'Requires approval from anyone', category: 'legacy' },
  { value: 'kb_link', label: 'KB Link', icon: Link2, description: 'Link to knowledge base document', category: 'legacy' },
  { value: 'comment', label: 'Comment', icon: MessageSquare, description: 'Discussion or notes section', category: 'legacy' },
] as const;

function SortableStepItem({ step, onEdit, onDelete }: { step: WorkflowTemplateStep; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const StepIcon = STEP_TYPES.find(t => t.value === step.type)?.icon || CheckSquare;
  const displayLabel = step.title || step.label || 'Untitled Step';

  return (
    <div ref={setNodeRef} style={style} data-testid={`step-item-${step.id}`}>
      <Card className="mb-2">
        <CardContent className="p-3 flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-move" data-testid={`step-drag-handle-${step.id}`}>
            <GripVertical className="h-5 w-5 text-gray-400" />
          </div>
          <StepIcon className="h-5 w-5 text-gray-600" />
          <div className="flex-1">
            <div className="font-medium">{displayLabel}</div>
            {step.description && <div className="text-sm text-gray-500">{step.description}</div>}
            {step.type === 'checklist' && step.checklistItems && step.checklistItems.length > 0 && (
              <div className="text-xs text-blue-600 mt-1">
                {step.checklistItems.length} checklist {step.checklistItems.length === 1 ? 'item' : 'items'}
              </div>
            )}
            {step.type === 'form' && step.formFields && step.formFields.length > 0 && (
              <div className="text-xs text-blue-600 mt-1">
                {step.formFields.length} form {step.formFields.length === 1 ? 'field' : 'fields'}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500">{step.required ? 'Required' : 'Optional'}</div>
          <Button variant="ghost" size="sm" onClick={onEdit} data-testid={`step-edit-${step.id}`}>Edit</Button>
          <Button variant="ghost" size="sm" onClick={onDelete} data-testid={`step-delete-${step.id}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WorkflowTemplateStepBuilder({ steps, onChange }: WorkflowTemplateStepBuilderProps) {
  const [editingStep, setEditingStep] = useState<WorkflowTemplateStep | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);
  
  console.log('[WorkflowTemplateStepBuilder] Render - steps count:', steps.length);
  console.log('[WorkflowTemplateStepBuilder] First step:', steps[0]);
  console.log('[WorkflowTemplateStepBuilder] editingStep:', editingStep);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex(s => s.id === active.id);
      const newIndex = steps.findIndex(s => s.id === over.id);
      const reordered = arrayMove(steps, oldIndex, newIndex).map((step, index) => ({ ...step, order: index }));
      onChange(reordered);
    }
  };

  const handleAddStep = (type: WorkflowTemplateStep['type']) => {
    const typeInfo = STEP_TYPES.find(t => t.value === type);
    const newStep: WorkflowTemplateStep = {
      id: `step-${Date.now()}`,
      type,
      title: `New ${typeInfo?.label} Step`,
      label: `New ${typeInfo?.label} Step`,
      description: '',
      required: true,
      order: steps.length,
      config: {},
    };

    // Initialize type-specific fields
    if (type === 'checklist') {
      newStep.checklistItems = [];
    } else if (type === 'photo') {
      newStep.photoConfig = {
        minPhotos: 1,
        maxPhotos: 10,
        required: false,
      };
    } else if (type === 'form') {
      newStep.formFields = [];
    } else if (type === 'data_output') {
      newStep.dataOutputConfig = {
        entityType: 'fiber_network_node',
        syncPhotos: true,
        syncNotes: true,
        syncGeolocation: true,
        targetField: 'photos',
      };
    }

    setEditingStep(newStep);
    setShowAddStep(false);
  };

  const handleSaveStep = (step: WorkflowTemplateStep) => {
    const existing = steps.find(s => s.id === step.id);
    if (existing) {
      onChange(steps.map(s => s.id === step.id ? step : s));
    } else {
      onChange([...steps, step]);
    }
    setEditingStep(null);
  };

  const handleDeleteStep = (id: string) => {
    onChange(steps.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })));
  };

  // Group step types by category
  const fieldAppTypes = STEP_TYPES.filter(t => t.category === 'field');
  const integrationTypes = STEP_TYPES.filter(t => t.category === 'integration');
  const legacyTypes = STEP_TYPES.filter(t => t.category === 'legacy');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Workflow Steps</h3>
        <Button onClick={() => setShowAddStep(!showAddStep)} data-testid="button-add-step">
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      </div>

      {showAddStep && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <h4 className="font-medium mb-3">Field App Step Types</h4>
              <div className="grid grid-cols-2 gap-2">
                {fieldAppTypes.map(stepType => {
                  const Icon = stepType.icon;
                  return (
                    <Button
                      key={stepType.value}
                      variant="outline"
                      className="h-auto py-3 justify-start"
                      onClick={() => handleAddStep(stepType.value as WorkflowTemplateStep['type'])}
                      data-testid={`button-add-${stepType.value}`}
                    >
                      <Icon className="h-5 w-5 mr-2 shrink-0" />
                      <div className="text-left">
                        <div className="font-medium">{stepType.label}</div>
                        <div className="text-xs text-gray-500">{stepType.description}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            {integrationTypes.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Integration Step Types</h4>
                <div className="grid grid-cols-2 gap-2">
                  {integrationTypes.map(stepType => {
                    const Icon = stepType.icon;
                    return (
                      <Button
                        key={stepType.value}
                        variant="outline"
                        className="h-auto py-3 justify-start"
                        onClick={() => handleAddStep(stepType.value as WorkflowTemplateStep['type'])}
                        data-testid={`button-add-${stepType.value}`}
                      >
                        <Icon className="h-5 w-5 mr-2 shrink-0" />
                        <div className="text-left">
                          <div className="font-medium">{stepType.label}</div>
                          <div className="text-xs text-gray-500">{stepType.description}</div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground">Legacy Step Types</h4>
              <div className="grid grid-cols-2 gap-2">
                {legacyTypes.map(stepType => {
                  const Icon = stepType.icon;
                  return (
                    <Button
                      key={stepType.value}
                      variant="outline"
                      className="h-auto py-2 justify-start text-sm"
                      onClick={() => handleAddStep(stepType.value as WorkflowTemplateStep['type'])}
                      data-testid={`button-add-${stepType.value}`}
                    >
                      <Icon className="h-4 w-4 mr-2 shrink-0" />
                      <div className="text-left">
                        <div className="font-medium text-xs">{stepType.label}</div>
                        <div className="text-xs text-gray-500">{stepType.description}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {steps.length === 0 ? (
        <div className="text-center py-8 text-gray-500" data-testid="empty-steps-message">
          <p>This workflow template has {steps.length} steps.</p>
          <p className="text-sm mt-2">Click "Add Step" to create your first workflow step.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {steps.map(step => (
              <SortableStepItem
                key={step.id}
                step={step}
                onEdit={() => {
                  console.log('[WorkflowTemplateStepBuilder] onEdit clicked for step:', step);
                  setEditingStep(step);
                }}
                onDelete={() => handleDeleteStep(step.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <Sheet open={!!editingStep} onOpenChange={(open) => !open && setEditingStep(null)}>
        <SheetContent className="sm:w-[640px] overflow-y-auto">
          {editingStep && (
            <StepEditor
              step={editingStep}
              onSave={handleSaveStep}
              onCancel={() => setEditingStep(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StepEditor({ step, onSave, onCancel }: { step: WorkflowTemplateStep; onSave: (step: WorkflowTemplateStep) => void; onCancel: () => void }) {
  // Normalize step data on mount - handle legacy data structures
  const normalizeStep = (s: any): WorkflowTemplateStep => {
    const normalized = { ...s };
    
    // Map legacy type names to new types
    const typeMapping: Record<string, string> = {
      'inspection': 'checklist',
    };
    if (normalized.type && typeMapping[normalized.type]) {
      normalized.type = typeMapping[normalized.type];
    }
    
    // Move checklistItems from config to root level if needed
    if (normalized.config?.checklistItems && !normalized.checklistItems) {
      normalized.checklistItems = normalized.config.checklistItems;
    }
    
    // Move formFields from config to root level if needed
    if (normalized.config?.formFields && !normalized.formFields) {
      normalized.formFields = normalized.config.formFields;
    }
    
    // Ensure photoConfig exists for photo type steps
    if (normalized.type === 'photo' && !normalized.photoConfig) {
      normalized.photoConfig = normalized.config?.photoConfig || {
        minPhotos: 1,
        maxPhotos: 10,
        required: false,
      };
    }
    
    console.log('[StepEditor] Normalized step:', normalized);
    return normalized;
  };
  
  const [editedStep, setEditedStep] = useState(() => normalizeStep(step));

  const handleAddChecklistItem = () => {
    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      name: '',
      checked: false,
    };
    setEditedStep({
      ...editedStep,
      checklistItems: [...(editedStep.checklistItems || []), newItem],
    });
  };

  const handleUpdateChecklistItem = (index: number, updates: Partial<ChecklistItem>) => {
    const items = [...(editedStep.checklistItems || [])];
    items[index] = { ...items[index], ...updates };
    setEditedStep({ ...editedStep, checklistItems: items });
  };

  const handleDeleteChecklistItem = (index: number) => {
    const items = (editedStep.checklistItems || []).filter((_, i) => i !== index);
    setEditedStep({ ...editedStep, checklistItems: items });
  };

  const handleAddFormField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
    };
    setEditedStep({
      ...editedStep,
      formFields: [...(editedStep.formFields || []), newField],
    });
  };

  const handleUpdateFormField = (index: number, updates: Partial<FormField>) => {
    const fields = [...(editedStep.formFields || [])];
    fields[index] = { ...fields[index], ...updates };
    setEditedStep({ ...editedStep, formFields: fields });
  };

  const handleDeleteFormField = (index: number) => {
    const fields = (editedStep.formFields || []).filter((_, i) => i !== index);
    setEditedStep({ ...editedStep, formFields: fields });
  };

  const labelOrTitle = editedStep.title || editedStep.label || '';
  const stepTypeName = STEP_TYPES.find(t => t.value === editedStep.type)?.label || 'Step';

  return (
    <>
      <SheetHeader>
        <SheetTitle>Edit {stepTypeName}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="step-label">Step Title/Label</Label>
          <Input
            id="step-label"
            value={labelOrTitle}
            onChange={e => setEditedStep({ 
              ...editedStep, 
              title: e.target.value,
              label: e.target.value 
            })}
            placeholder="Enter step title"
            data-testid="input-step-label"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="step-description">Description (optional)</Label>
          <Textarea
            id="step-description"
            value={editedStep.description || ''}
            onChange={e => setEditedStep({ ...editedStep, description: e.target.value })}
            placeholder="Add a description to help users understand this step"
            data-testid="input-step-description"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="step-required"
            checked={editedStep.required}
            onCheckedChange={checked => setEditedStep({ ...editedStep, required: checked })}
            data-testid="switch-step-required"
          />
          <Label htmlFor="step-required">Required Step</Label>
        </div>

        {/* Checklist Items Editor */}
        {editedStep.type === 'checklist' && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Checklist Items</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddChecklistItem}
                data-testid="button-add-checklist-item"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            
            {(!editedStep.checklistItems || editedStep.checklistItems.length === 0) ? (
              <div className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                No checklist items yet. Click "Add Item" to create one.
              </div>
            ) : (
              <div className="space-y-2">
                {editedStep.checklistItems.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-2 p-2 border rounded-md bg-muted/30">
                    <div className="flex-1">
                      <Input
                        value={item.name}
                        onChange={e => handleUpdateChecklistItem(index, { name: e.target.value })}
                        placeholder={`Checklist item ${index + 1}`}
                        data-testid={`input-checklist-item-${index}`}
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteChecklistItem(index)}
                      data-testid={`button-delete-checklist-item-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Photo Configuration */}
        {editedStep.type === 'photo' && (
          <>
            <div className="space-y-3 border-t pt-4">
              <Label className="text-base">Photo Settings</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="min-photos">Minimum Photos</Label>
                  <Input
                    id="min-photos"
                    type="number"
                    min="0"
                    value={editedStep.photoConfig?.minPhotos || 1}
                    onChange={e => {
                      const defaultPhotoConfig = { minPhotos: 1, maxPhotos: 10, required: false };
                      setEditedStep({
                        ...editedStep,
                        photoConfig: {
                          ...(editedStep.photoConfig || defaultPhotoConfig),
                          minPhotos: parseInt(e.target.value) || 0,
                        }
                      });
                    }}
                    data-testid="input-min-photos"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-photos">Maximum Photos</Label>
                  <Input
                    id="max-photos"
                    type="number"
                    min="1"
                    value={editedStep.photoConfig?.maxPhotos || 10}
                    onChange={e => {
                      const defaultPhotoConfig = { minPhotos: 1, maxPhotos: 10, required: false };
                      setEditedStep({
                        ...editedStep,
                        photoConfig: {
                          ...(editedStep.photoConfig || defaultPhotoConfig),
                          maxPhotos: parseInt(e.target.value) || 1,
                        }
                      });
                    }}
                    data-testid="input-max-photos"
                  />
                </div>
              </div>
            </div>

            {/* Photo Analysis/OCR Configuration */}
            <PhotoAnalysisConfig 
              config={editedStep.config || {}}
              onChange={(config) => setEditedStep({ 
                ...editedStep, 
                config,
                // Ensure photoConfig is preserved when updating config
                photoConfig: editedStep.photoConfig || { minPhotos: 1, maxPhotos: 10, required: false }
              })}
            />
          </>
        )}

        {/* Form Fields Editor */}
        {editedStep.type === 'form' && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Form Fields</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddFormField}
                data-testid="button-add-form-field"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Field
              </Button>
            </div>
            
            {(!editedStep.formFields || editedStep.formFields.length === 0) ? (
              <div className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                No form fields yet. Click "Add Field" to create one.
              </div>
            ) : (
              <div className="space-y-3">
                {editedStep.formFields.map((field, index) => (
                  <div key={field.id} className="p-3 border rounded-md bg-muted/30 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={field.label}
                          onChange={e => handleUpdateFormField(index, { label: e.target.value })}
                          placeholder="Field label"
                          data-testid={`input-form-field-label-${index}`}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                            value={field.type}
                            onChange={e => handleUpdateFormField(index, { type: e.target.value as FormField['type'] })}
                            data-testid={`select-form-field-type-${index}`}
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="textarea">Text Area</option>
                            <option value="date">Date</option>
                            <option value="select">Select</option>
                          </select>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={field.required}
                              onCheckedChange={checked => handleUpdateFormField(index, { required: checked })}
                              data-testid={`switch-form-field-required-${index}`}
                            />
                            <Label className="text-xs">Required</Label>
                          </div>
                        </div>
                        {field.type === 'select' && (
                          <div className="space-y-2">
                            <Label htmlFor={`field-options-${index}`} className="text-xs">
                              Dropdown Options (comma or semicolon separated)
                            </Label>
                            <Input
                              id={`field-options-${index}`}
                              value={field.options?.join(', ') || ''}
                              onChange={e => {
                                const optionsText = e.target.value;
                                const optionsArray = optionsText
                                  .split(/[,;]/)
                                  .map(opt => opt.trim())
                                  .filter(opt => opt.length > 0);
                                handleUpdateFormField(index, { options: optionsArray.length > 0 ? optionsArray : undefined });
                              }}
                              onKeyDown={e => {
                                // Allow comma and semicolon explicitly
                                if (e.key === ',' || e.key === ';') {
                                  e.stopPropagation();
                                }
                              }}
                              placeholder="e.g., CCNet; FibreLtd; S&MFibre"
                              data-testid={`input-form-field-options-${index}`}
                            />
                            {field.options && field.options.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {field.options.length} option{field.options.length === 1 ? '' : 's'}: {field.options.join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteFormField(index)}
                        data-testid={`button-delete-form-field-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Legacy step type configs */}
        {editedStep.type === 'text_input' && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="text-multiline"
                checked={editedStep.config?.multiline || false}
                onCheckedChange={checked => setEditedStep({ 
                  ...editedStep, 
                  config: { ...editedStep.config, multiline: checked } 
                })}
                data-testid="switch-text-multiline"
              />
              <Label htmlFor="text-multiline">Multiline Text</Label>
            </div>
          </div>
        )}

        {editedStep.type === 'file_upload' && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="allow-multiple"
                checked={editedStep.config?.multipleFiles || false}
                onCheckedChange={checked => setEditedStep({ 
                  ...editedStep, 
                  config: { ...editedStep.config, multipleFiles: checked } 
                })}
                data-testid="switch-multiple-files"
              />
              <Label htmlFor="allow-multiple">Allow Multiple Files</Label>
            </div>
          </div>
        )}

        {/* Data Output Configuration (NEW) */}
        {editedStep.type === 'data_output' && (
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base">Data Sync Configuration</Label>
            <p className="text-sm text-muted-foreground">
              Configure what data should be saved back to the originating record when this workflow completes.
            </p>
            
            <div className="space-y-3 mt-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="sync-photos"
                  checked={editedStep.dataOutputConfig?.syncPhotos ?? true}
                  onCheckedChange={checked => setEditedStep({
                    ...editedStep,
                    dataOutputConfig: {
                      ...editedStep.dataOutputConfig!,
                      syncPhotos: checked,
                    }
                  })}
                  data-testid="switch-sync-photos"
                />
                <Label htmlFor="sync-photos">Sync Photos</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="sync-notes"
                  checked={editedStep.dataOutputConfig?.syncNotes ?? true}
                  onCheckedChange={checked => setEditedStep({
                    ...editedStep,
                    dataOutputConfig: {
                      ...editedStep.dataOutputConfig!,
                      syncNotes: checked,
                    }
                  })}
                  data-testid="switch-sync-notes"
                />
                <Label htmlFor="sync-notes">Sync Notes</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="sync-geolocation"
                  checked={editedStep.dataOutputConfig?.syncGeolocation ?? true}
                  onCheckedChange={checked => setEditedStep({
                    ...editedStep,
                    dataOutputConfig: {
                      ...editedStep.dataOutputConfig!,
                      syncGeolocation: checked,
                    }
                  })}
                  data-testid="switch-sync-geolocation"
                />
                <Label htmlFor="sync-geolocation">Sync Geolocation</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-field">Target Field</Label>
                <select
                  id="target-field"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={editedStep.dataOutputConfig?.targetField || 'photos'}
                  onChange={e => setEditedStep({
                    ...editedStep,
                    dataOutputConfig: {
                      ...editedStep.dataOutputConfig!,
                      targetField: e.target.value,
                    }
                  })}
                  data-testid="select-target-field"
                >
                  <option value="photos">Photos</option>
                  <option value="fiberDetails.inspections">Inspections</option>
                  <option value="fiberDetails.splices">Splices</option>
                  <option value="notes">Notes</option>
                </select>
              </div>
            </div>
          </div>
        )}

      </div>

      <SheetFooter>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel-step">Cancel</Button>
        <Button onClick={() => onSave(editedStep)} data-testid="button-save-step">Save Step</Button>
      </SheetFooter>
    </>
  );
}

interface PhotoAnalysisConfigProps {
  config: any;
  onChange: (config: any) => void;
}

function PhotoAnalysisConfig({ config, onChange }: PhotoAnalysisConfigProps) {
  // Defensive initialization: ensure config exists
  const safeConfig = config || {};
  const photoAnalysisConfig = safeConfig.photoAnalysisConfig || null;
  const [enabled, setEnabled] = useState(!!photoAnalysisConfig?.enabled);
  const [extractions, setExtractions] = useState(photoAnalysisConfig?.extractions || []);
  const { toast } = useToast();
  
  // Track field creation status for each extraction
  const [fieldStatuses, setFieldStatuses] = useState<Map<string, {
    status: 'active' | 'pending' | 'error' | 'creating';
    columnName?: string;
    createdAt?: string;
    errorMessage?: string;
  }>>(new Map());

  // Update state when config changes (e.g., when loading existing template)
  useEffect(() => {
    const newPhotoAnalysisConfig = safeConfig.photoAnalysisConfig || null;
    setEnabled(!!newPhotoAnalysisConfig?.enabled);
    setExtractions(newPhotoAnalysisConfig?.extractions || []);
  }, [config]); // Watch entire config object

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (checked && !photoAnalysisConfig) {
      onChange({
        ...safeConfig,
        photoAnalysisConfig: {
          enabled: true,
          agentWorkflowId: null,
          extractions: [],
        },
      });
    } else if (!checked) {
      const { photoAnalysisConfig: _, ...rest } = safeConfig;
      onChange(rest);
    }
  };

  const handleAddExtraction = () => {
    const newExtraction = {
      id: `extraction-${Date.now()}`,
      displayLabel: '',
      extractionPrompt: '',
      targetTable: 'addresses',
      targetField: '',
      autoCreateField: true,
    };
    const updated = [...extractions, newExtraction];
    setExtractions(updated);
    onChange({
      ...safeConfig,
      photoAnalysisConfig: {
        ...photoAnalysisConfig,
        extractions: updated,
      },
    });
  };

  const handleUpdateExtraction = (index: number, updates: any) => {
    const updated = [...extractions];
    updated[index] = { ...updated[index], ...updates };
    setExtractions(updated);
    onChange({
      ...safeConfig,
      photoAnalysisConfig: {
        ...photoAnalysisConfig,
        extractions: updated,
      },
    });
  };

  const handleDeleteExtraction = (index: number) => {
    const updated = extractions.filter((_: any, i: number) => i !== index);
    setExtractions(updated);
    onChange({
      ...safeConfig,
      photoAnalysisConfig: {
        ...photoAnalysisConfig,
        extractions: updated,
      },
    });
  };

  // Get status badge component for field status
  const getStatusBadge = (status: string) => {
    const badges = {
      active: { icon: Check, color: 'bg-green-500', label: 'Active' },
      pending: { icon: Clock, color: 'bg-yellow-500', label: 'Pending' },
      error: { icon: AlertCircle, color: 'bg-red-500', label: 'Error' },
      creating: { icon: Loader2, color: 'bg-gray-500', label: 'Creating...' }
    };
    const badge = badges[status as keyof typeof badges];
    const Icon = badge.icon;
    
    return (
      <Badge className={`${badge.color} text-white text-xs`}>
        <Icon className={`h-3 w-3 mr-1 ${status === 'creating' ? 'animate-spin' : ''}`} />
        {badge.label}
      </Badge>
    );
  };

  // Create field immediately when user clicks "Create Field Now"
  const createFieldNow = async (extraction: any, index: number) => {
    if (!extraction.targetField || !extraction.displayLabel) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in Field Label and Field Name before creating the field.',
        variant: 'destructive',
      });
      return;
    }

    setFieldStatuses(prev => new Map(prev).set(extraction.id, { status: 'creating' }));
    
    try {
      const response = await fetch('/api/fields/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tableName: extraction.targetTable || 'address_records',
          fieldName: extraction.targetField,
          displayLabel: extraction.displayLabel,
          extractionPrompt: extraction.extractionPrompt,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Field creation failed');
      }
      
      const data = await response.json();
      setFieldStatuses(prev => new Map(prev).set(extraction.id, {
        status: 'active',
        columnName: data.field.fieldName,
        createdAt: data.field.createdAt,
      }));
      
      toast({
        title: 'Field Created',
        description: `"${extraction.displayLabel}" is now ready for use`,
      });
    } catch (error) {
      setFieldStatuses(prev => new Map(prev).set(extraction.id, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }));
      
      toast({
        title: 'Field Creation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Verify all fields exist
  const verifyAllFields = async () => {
    for (const extraction of extractions) {
      if (!extraction.targetField) continue;
      
      try {
        const response = await fetch('/api/fields/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            tableName: extraction.targetTable || 'address_records',
            fieldName: extraction.targetField,
          }),
        });
        
        const data = await response.json();
        setFieldStatuses(prev => new Map(prev).set(extraction.id, {
          status: data.exists ? 'active' : 'pending',
        }));
      } catch (error) {
        console.error('Error verifying field:', error);
      }
    }
    
    toast({
      title: 'Fields Verified',
      description: 'Field status updated for all extractions',
    });
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Photo Text Extraction (OCR)</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Automatically extract text from photos using AI
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          data-testid="switch-enable-ocr"
        />
      </div>

      {enabled && (
        <div className="space-y-3 pl-4 border-l-2 border-blue-200">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Fields to Extract</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddExtraction}
              data-testid="button-add-extraction"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
          </div>

          {extractions.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4 border rounded-md bg-muted/20">
              No extraction fields configured. Click "Add Field" to extract text from photos.
            </div>
          ) : (
            <div className="space-y-3">
              {extractions.map((extraction: any, index: number) => {
                const fieldStatus = fieldStatuses.get(extraction.id) || { status: 'pending' };
                
                return (
                  <div key={extraction.id} className="p-3 border rounded-md bg-muted/30 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Field {index + 1}</Label>
                        {getStatusBadge(fieldStatus.status)}
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteExtraction(index)}
                        data-testid={`button-delete-extraction-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                  <div className="space-y-2">
                    <div>
                      <Label htmlFor={`extraction-label-${index}`} className="text-xs">Field Label</Label>
                      <Input
                        id={`extraction-label-${index}`}
                        value={extraction.displayLabel || ''}
                        onChange={e => handleUpdateExtraction(index, { displayLabel: e.target.value })}
                        placeholder="e.g., Serial Number"
                        data-testid={`input-extraction-label-${index}`}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`extraction-prompt-${index}`} className="text-xs">What to extract</Label>
                      <Textarea
                        id={`extraction-prompt-${index}`}
                        value={extraction.extractionPrompt || ''}
                        onChange={e => handleUpdateExtraction(index, { extractionPrompt: e.target.value })}
                        placeholder="e.g., Find and extract the serial number from the device label"
                        rows={2}
                        data-testid={`input-extraction-prompt-${index}`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor={`extraction-table-${index}`} className="text-xs">Save to Table</Label>
                        <select
                          id={`extraction-table-${index}`}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          value={extraction.targetTable || 'addresses'}
                          onChange={e => handleUpdateExtraction(index, { targetTable: e.target.value })}
                          data-testid={`select-extraction-table-${index}`}
                        >
                          <option value="addresses">Addresses (supported)</option>
                        </select>
                        <p className="text-xs text-muted-foreground">
                          Only Addresses table is currently supported
                        </p>
                      </div>

                      <div>
                        <Label htmlFor={`extraction-field-${index}`} className="text-xs">Field Name</Label>
                        <Input
                          id={`extraction-field-${index}`}
                          value={extraction.targetField || ''}
                          onChange={e => handleUpdateExtraction(index, { targetField: e.target.value })}
                          placeholder="e.g., serial_number"
                          data-testid={`input-extraction-field-${index}`}
                        />
                      </div>
                    </div>

                    {/* Field Status Information */}
                    {fieldStatus.status === 'active' && (
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md p-2 text-xs space-y-1">
                        <div className="flex items-center gap-1 text-green-700 dark:text-green-300">
                          <Database className="h-3 w-3" />
                          <span className="font-medium">Database Column:</span>
                          <code className="font-mono">{fieldStatus.columnName || extraction.targetField}</code>
                        </div>
                        {fieldStatus.createdAt && (
                          <div className="text-green-600 dark:text-green-400">
                            Created: {new Date(fieldStatus.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}

                    {fieldStatus.status === 'pending' && (
                      <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => createFieldNow(extraction, index)}
                          className="w-full"
                          data-testid={`button-create-field-${index}`}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Create Field Now
                        </Button>
                      </div>
                    )}

                    {fieldStatus.status === 'error' && (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-2 text-xs">
                        <div className="text-red-700 dark:text-red-300 font-medium mb-1">
                          Field Creation Failed
                        </div>
                        <div className="text-red-600 dark:text-red-400 mb-2">
                          {fieldStatus.errorMessage}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => createFieldNow(extraction, index)}
                          className="w-full"
                          data-testid={`button-retry-create-field-${index}`}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Retry
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          )}
          
          {/* Verify All Fields Button */}
          {extractions.length > 0 && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={verifyAllFields}
              data-testid="button-verify-all-fields"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Verify All Fields
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
