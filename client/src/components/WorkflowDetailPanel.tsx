import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Save, Play, Pause, Trash2, CheckCircle, Clock, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { AgentWorkflow } from '@shared/schema';

interface WorkflowDetailPanelProps {
  workflow: AgentWorkflow | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedWorkflow: AgentWorkflow) => void;
}

const TRIGGER_TYPES = {
  manual: { label: 'Manual', icon: Play, description: 'Trigger manually from the dashboard' },
  webhook: { label: 'Webhook', icon: Zap, description: 'Trigger when a webhook is received' },
  schedule: { label: 'Schedule', icon: Clock, description: 'Run on a schedule (cron expression)' },
} as const;

export default function WorkflowDetailPanel({ workflow, isOpen, onClose, onUpdate }: WorkflowDetailPanelProps) {
  const [formData, setFormData] = useState<any>(workflow || {});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse cron expression to populate dropdown fields
  const parseCronExpression = (schedule: string): any => {
    const parts = schedule.split(' ');
    if (parts.length !== 5) return { frequency: 'custom', schedule };
    
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    // Detect frequency
    if (hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return { frequency: 'hourly', minute: '0', hour: '0' };
    }
    
    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return { frequency: 'daily', minute, hour };
    }
    
    if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
      // Weekly - parse days
      const dayNumbers = dayOfWeek.split(',');
      const days: Record<number, boolean> = {};
      dayNumbers.forEach(d => {
        const dayNum = parseInt(d);
        if (!isNaN(dayNum)) days[dayNum] = true;
      });
      return { frequency: 'weekly', minute, hour, days };
    }
    
    if (dayOfMonth !== '*' && month === '*' && dayOfWeek === '*') {
      return { frequency: 'monthly', minute, hour, dayOfMonth };
    }
    
    // Default to custom
    return { frequency: 'custom', schedule };
  };

  useEffect(() => {
    if (workflow) {
      const updatedWorkflow = { ...workflow };
      
      // Parse schedule if it's a schedule trigger
      if (workflow.triggerType === 'schedule' && workflow.triggerConfig?.schedule) {
        const parsedConfig = parseCronExpression(workflow.triggerConfig.schedule);
        updatedWorkflow.triggerConfig = {
          ...workflow.triggerConfig,
          ...parsedConfig,
        };
      }
      
      setFormData(updatedWorkflow);
    }
  }, [workflow]);

  // Update workflow mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(`/api/agents/workflows/${workflow?.id}`, {
        method: 'PUT',
        body: data
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents/workflows'] });
      toast({
        title: 'Workflow updated',
        description: 'The workflow has been updated successfully.'
      });
      onUpdate(data);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update workflow',
        variant: 'destructive'
      });
    }
  });

  // Delete workflow mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/agents/workflows/${workflow?.id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents/workflows'] });
      toast({
        title: 'Workflow deleted',
        description: 'The workflow has been deleted successfully.',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete workflow',
        variant: 'destructive',
      });
    },
  });

  // Execute workflow mutation
  const executeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/agents/workflows/${workflow?.id}/execute`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents/runs'] });
      toast({
        title: 'Workflow executed',
        description: 'Your workflow has been triggered successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Execution failed',
        description: error.message || 'An error occurred while executing the workflow.',
        variant: 'destructive',
      });
    },
  });

  const generateCronExpression = (config: any) => {
    const { frequency, hour = '0', minute = '0', days, dayOfMonth } = config;
    
    switch (frequency) {
      case 'hourly':
        return '0 * * * *';
      
      case 'daily':
        return `${minute} ${hour} * * *`;
      
      case 'weekly': {
        const selectedDays = Object.entries(days || {})
          .filter(([_, selected]) => selected)
          .map(([dayIndex, _]) => dayIndex)
          .join(',');
        return `${minute} ${hour} * * ${selectedDays || '0'}`;
      }
      
      case 'monthly': {
        const day = dayOfMonth === 'last' ? 'L' : (dayOfMonth || '1');
        if (day === 'L') {
          return `${minute} ${hour} 28-31 * *`;
        }
        return `${minute} ${hour} ${day} * *`;
      }
      
      default:
        return `${minute} ${hour} * * *`;
    }
  };

  const handleSave = () => {
    const dataToSave = { ...formData };
    
    // Generate cron expression for schedule triggers
    if (dataToSave.triggerType === 'schedule' && dataToSave.triggerConfig) {
      const cronExpression = generateCronExpression(dataToSave.triggerConfig);
      dataToSave.triggerConfig.schedule = cronExpression;
    }
    
    // Remove read-only timestamp fields that cause type errors
    delete dataToSave.createdAt;
    delete dataToSave.updatedAt;
    delete dataToSave.lastRunAt;
    
    updateMutation.mutate(dataToSave);
  };

  const handleToggle = () => {
    const newIsEnabled = !formData.isEnabled;
    setFormData({ ...formData, isEnabled: newIsEnabled });
    
    const dataToSave = { ...formData, isEnabled: newIsEnabled };
    // Remove read-only timestamp fields
    delete dataToSave.createdAt;
    delete dataToSave.updatedAt;
    delete dataToSave.lastRunAt;
    
    updateMutation.mutate(dataToSave);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${workflow?.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  const handleRun = () => {
    executeMutation.mutate();
  };

  if (!workflow) return null;

  const triggerConfig = TRIGGER_TYPES[workflow.triggerType as keyof typeof TRIGGER_TYPES];
  const TriggerIcon = triggerConfig?.icon || Zap;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:w-[640px] w-full overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary bg-opacity-10">
              <TriggerIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-lg font-semibold">
                {formData.name}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                {triggerConfig?.label} workflow
              </p>
            </div>
            <Badge variant={formData.isEnabled ? 'default' : 'secondary'}>
              {formData.isEnabled ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3 mr-1" />
                  Inactive
                </>
              )}
            </Badge>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button 
              onClick={handleRun}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!formData.isEnabled || executeMutation.isPending}
              data-testid="button-run-workflow"
            >
              {executeMutation.isPending ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-2" />
                  Run
                </>
              )}
            </Button>
            <Button 
              onClick={handleToggle}
              size="sm"
              variant="outline"
              disabled={updateMutation.isPending}
              data-testid="button-toggle-workflow"
            >
              {formData.isEnabled ? (
                <>
                  <Pause className="h-3 w-3 mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-2" />
                  Activate
                </>
              )}
            </Button>
            <Button 
              onClick={handleSave}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={updateMutation.isPending}
              data-testid="button-save-workflow"
            >
              {updateMutation.isPending ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-2" />
                  Save
                </>
              )}
            </Button>
            <Button 
              onClick={handleDelete}
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={deleteMutation.isPending}
              data-testid="button-delete-workflow"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Delete
            </Button>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="space-y-6 pt-6">
          {/* Name */}
          <div>
            <Label className="text-sm font-medium mb-2">Name</Label>
            <Input
              value={formData.name || ''}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              data-testid="input-workflow-name"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium mb-2">Description</Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="text-xs leading-relaxed"
              rows={3}
              placeholder="Enter workflow description..."
              data-testid="textarea-workflow-description"
            />
          </div>

          {/* Trigger Type */}
          <div>
            <Label className="text-sm font-medium mb-2">Trigger Type</Label>
            <Select 
              value={formData.triggerType} 
              onValueChange={(value) => setFormData({...formData, triggerType: value})}
              disabled
            >
              <SelectTrigger data-testid="select-trigger-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="schedule">Schedule</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-600 mt-1">Trigger type cannot be changed after creation</p>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Enabled</Label>
              <p className="text-xs text-gray-600 mt-1">Toggle workflow on/off</p>
            </div>
            <Switch
              checked={formData.isEnabled || false}
              onCheckedChange={(checked) => setFormData({...formData, isEnabled: checked})}
              data-testid="switch-workflow-enabled"
            />
          </div>

              {/* Schedule Configuration */}
              {formData.triggerType === 'schedule' && (
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Schedule Configuration</Label>
                  
                  {/* Frequency Selector */}
                  <div>
                    <Label className="text-xs text-gray-600 mb-2">Frequency</Label>
                    <Select 
                      value={formData.triggerConfig?.frequency || 'daily'} 
                      onValueChange={(value) => setFormData({
                        ...formData, 
                        triggerConfig: {...formData.triggerConfig, frequency: value}
                      })}
                    >
                      <SelectTrigger data-testid="select-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-background border shadow-lg">
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="custom">Custom (Advanced)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Time Selection - Show for all except hourly and custom */}
                  {formData.triggerConfig?.frequency !== 'hourly' && formData.triggerConfig?.frequency !== 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-600 mb-2">Hour (0-23)</Label>
                        <Select
                          value={(formData.triggerConfig?.hour || '0').toString()}
                          onValueChange={(value) => setFormData({
                            ...formData,
                            triggerConfig: {...formData.triggerConfig, hour: value}
                          })}
                        >
                          <SelectTrigger data-testid="select-hour">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[9999] bg-background border shadow-lg max-h-[200px]">
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, '0')}:00
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 mb-2">Minute (0-59)</Label>
                        <Select
                          value={(formData.triggerConfig?.minute || '0').toString()}
                          onValueChange={(value) => setFormData({
                            ...formData,
                            triggerConfig: {...formData.triggerConfig, minute: value}
                          })}
                        >
                          <SelectTrigger data-testid="select-minute">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[9999] bg-background border shadow-lg max-h-[200px]">
                            {[0, 15, 30, 45].map((min) => (
                              <SelectItem key={min} value={min.toString()}>
                                :{min.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Weekly - Day Selection */}
                  {formData.triggerConfig?.frequency === 'weekly' && (
                    <div>
                      <Label className="text-xs text-gray-600 mb-2">Days of Week</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                          <div key={day} className="flex items-center space-x-2">
                            <Checkbox
                              id={`day-${index}`}
                              checked={formData.triggerConfig?.days?.[index] || false}
                              onCheckedChange={(checked) => {
                                const days = {...(formData.triggerConfig?.days || {})};
                                days[index] = checked as boolean;
                                setFormData({
                                  ...formData,
                                  triggerConfig: {...formData.triggerConfig, days}
                                });
                              }}
                              data-testid={`checkbox-day-${index}`}
                            />
                            <label
                              htmlFor={`day-${index}`}
                              className="text-sm cursor-pointer"
                            >
                              {day}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Monthly - Day of Month */}
                  {formData.triggerConfig?.frequency === 'monthly' && (
                    <div>
                      <Label className="text-xs text-gray-600 mb-2">Day of Month</Label>
                      <Select
                        value={(formData.triggerConfig?.dayOfMonth || '1').toString()}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          triggerConfig: {...formData.triggerConfig, dayOfMonth: value}
                        })}
                      >
                        <SelectTrigger data-testid="select-day-of-month">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[9999] bg-background border shadow-lg max-h-[200px]">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={day.toString()}>
                              {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each month
                            </SelectItem>
                          ))}
                          <SelectItem value="last">Last day of month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Custom Cron Expression */}
                  {formData.triggerConfig?.frequency === 'custom' && (
                    <div>
                      <Label className="text-xs text-gray-600 mb-2">Custom Cron Expression</Label>
                      <Input
                        value={formData.triggerConfig?.schedule || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          triggerConfig: {...formData.triggerConfig, schedule: e.target.value}
                        })}
                        placeholder="0 0 * * *"
                        data-testid="input-cron"
                        className="font-mono text-xs"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Examples: "0 */2 * * *" (every 2 hours), "30 9 * * 1-5" (9:30 AM weekdays)
                      </p>
                    </div>
                  )}

                  {/* Schedule Preview */}
                  {formData.triggerConfig?.frequency !== 'custom' && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border">
                      <strong>Schedule Preview:</strong>{' '}
                      {(() => {
                        const freq = formData.triggerConfig?.frequency || 'daily';
                        const hour = formData.triggerConfig?.hour || '0';
                        const minute = formData.triggerConfig?.minute || '0';
                        const days = formData.triggerConfig?.days || {};
                        const dayOfMonth = formData.triggerConfig?.dayOfMonth || '1';
                        
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

              {formData.triggerType === 'webhook' && (
                <div>
                  <Label className="text-sm font-medium mb-2">Webhook Configuration</Label>
                  <Textarea
                    value={typeof formData.triggerConfig === 'object' ? JSON.stringify(formData.triggerConfig, null, 2) : formData.triggerConfig || ''}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setFormData({...formData, triggerConfig: parsed});
                      } catch {
                        setFormData({...formData, triggerConfig: e.target.value});
                      }
                    }}
                    className="text-xs leading-relaxed font-mono"
                    rows={6}
                    placeholder="JSON configuration for webhook..."
                    data-testid="textarea-trigger-config"
                  />
                </div>
              )}

              {/* Workflow Definition */}
              <div>
                <Label className="text-sm font-medium mb-2">Workflow Definition</Label>
                <Textarea
                  value={typeof formData.workflowDefinition === 'object' ? JSON.stringify(formData.workflowDefinition, null, 2) : formData.workflowDefinition || ''}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData({...formData, workflowDefinition: parsed});
                    } catch {
                      setFormData({...formData, workflowDefinition: e.target.value});
                    }
                  }}
                  className="text-xs leading-relaxed font-mono"
                  rows={10}
                  placeholder="JSON structure defining workflow actions..."
                  data-testid="textarea-workflow-definition"
                />
              </div>

              {/* Last Run Info */}
              {formData.lastRunAt && (
                <div>
                  <Label className="text-sm font-medium mb-2">Last Run</Label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">{new Date(formData.lastRunAt).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Created/Updated Info */}
              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                  {formData.createdAt && (
                    <div>
                      <span className="font-medium">Created:</span> {new Date(formData.createdAt).toLocaleDateString()}
                    </div>
                  )}
                  {formData.updatedAt && (
                    <div>
                      <span className="font-medium">Updated:</span> {new Date(formData.updatedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
