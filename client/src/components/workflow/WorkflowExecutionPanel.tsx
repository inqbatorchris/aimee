import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { SplynxTicketViewer } from './SplynxTicketViewer';
import { 
  Camera, 
  CheckCircle, 
  Circle, 
  FileText, 
  PenTool, 
  PlayCircle,
  Loader2,
  MapPin,
  Navigation,
  Ticket
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  type: 'inspection' | 'photo' | 'signature' | 'form' | 'geolocation' | 'notes' | 'checklist' | 'splynx_ticket';
  order: number;
  required: boolean;
  config?: {
    fields?: Array<{
      name: string;
      type: string;
      label: string;
      required: boolean;
      options?: string[];
    }>;
    minPhotos?: number;
    maxPhotos?: number;
    checklistItems?: Array<{
      id: string;
      name: string;
      checked?: boolean;
    }>;
    mode?: string;
    fetchMessages?: boolean;
    showStatus?: boolean;
  };
}

interface WorkflowTemplate {
  id: string;
  name: string;
  steps: WorkflowStep[];
}

interface WorkflowExecutionPanelProps {
  workItemId: number;
  workflowTemplate: WorkflowTemplate;
  onComplete?: () => void;
}

interface StepData {
  stepId: string;
  completed: boolean;
  data?: any;
  photos?: string[];
  signature?: string;
  notes?: string;
}

export default function WorkflowExecutionPanel({ 
  workItemId, 
  workflowTemplate,
  onComplete 
}: WorkflowExecutionPanelProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepsData, setStepsData] = useState<Record<string, StepData>>({});
  const [executionId, setExecutionId] = useState<number | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const sortedSteps = [...workflowTemplate.steps].sort((a, b) => a.order - b.order);
  const currentStep = sortedSteps[currentStepIndex];

  const { data: existingExecution } = useQuery({
    queryKey: [`/api/work-items/${workItemId}/executions`],
    enabled: !!workItemId && !isHydrated,
  });

  // Hydrate from existing execution
  useEffect(() => {
    if (existingExecution && Array.isArray(existingExecution) && !isHydrated) {
      const inProgressExecution = existingExecution.find(
        (exec: any) => exec.workflowTemplateId === workflowTemplate.id && exec.status === 'in_progress'
      );
      
      if (inProgressExecution) {
        setExecutionId(inProgressExecution.id);
        
        if (inProgressExecution.executionData) {
          setStepsData(inProgressExecution.executionData);
        }
        
        if (inProgressExecution.currentStepId) {
          const stepIndex = sortedSteps.findIndex(s => s.id === inProgressExecution.currentStepId);
          if (stepIndex >= 0) {
            setCurrentStepIndex(stepIndex);
          }
        }
        
        setIsHydrated(true);
      } else {
        setIsHydrated(true);
      }
    }
  }, [existingExecution, workflowTemplate.id, sortedSteps, isHydrated]);

  const createExecutionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/work-items/${workItemId}/executions/start`, {
        method: 'POST',
        body: {},
      });
      return response as { id: number };
    },
    onSuccess: (data) => {
      setExecutionId(data.id);
      toast({
        title: 'Workflow Started',
        description: `Started ${workflowTemplate.name}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start workflow',
        variant: 'destructive',
      });
    },
  });

  const updateExecutionMutation = useMutation({
    mutationFn: async ({ currentStepId, executionData }: { currentStepId?: string | null, executionData: any }) => {
      return await apiRequest(`/api/work-items/${workItemId}/executions/${executionId}`, {
        method: 'PUT',
        body: {
          currentStepId: currentStepId !== undefined ? currentStepId : currentStep?.id || null,
          executionData,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      queryClient.invalidateQueries({ queryKey: [`/api/work-items/${workItemId}`] });
    },
  });

  const completeExecutionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/work-items/${workItemId}/executions/${executionId}/complete`, {
        method: 'POST',
        body: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      queryClient.invalidateQueries({ queryKey: [`/api/work-items/${workItemId}`] });
      toast({
        title: 'Workflow Completed',
        description: 'All steps have been completed successfully',
      });
      onComplete?.();
    },
  });

  const handleStartWorkflow = () => {
    createExecutionMutation.mutate();
  };

  const handleCompleteStep = (stepData: any) => {
    const newStepsData = {
      ...stepsData,
      [currentStep.id]: {
        stepId: currentStep.id,
        completed: true,
        data: stepData,
      },
    };
    setStepsData(newStepsData);

    const isLastStep = currentStepIndex >= sortedSteps.length - 1;
    const nextStepId = isLastStep ? null : sortedSteps[currentStepIndex + 1].id;

    if (!isLastStep) {
      setCurrentStepIndex(currentStepIndex + 1);
      updateExecutionMutation.mutate({
        currentStepId: nextStepId,
        executionData: newStepsData,
      });
    } else {
      updateExecutionMutation.mutate({
        currentStepId: null,
        executionData: newStepsData,
      });
      completeExecutionMutation.mutate();
    }
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'inspection':
        return <CheckCircle className="h-5 w-5" />;
      case 'photo':
        return <Camera className="h-5 w-5" />;
      case 'signature':
        return <PenTool className="h-5 w-5" />;
      case 'form':
        return <FileText className="h-5 w-5" />;
      case 'splynx_ticket':
        return <Ticket className="h-5 w-5" />;
      default:
        return <Circle className="h-5 w-5" />;
    }
  };

  if (!executionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            {workflowTemplate.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This workflow has {sortedSteps.length} steps to complete
            </p>
            <div className="space-y-2">
              {sortedSteps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <span>{step.name}</span>
                  {step.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                </div>
              ))}
            </div>
            <Button 
              onClick={handleStartWorkflow} 
              className="w-full"
              disabled={createExecutionMutation.isPending}
              data-testid="button-start-workflow"
            >
              {createExecutionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Workflow
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStepIcon(currentStep.type)}
            Step {currentStepIndex + 1} of {sortedSteps.length}
          </CardTitle>
          <Badge variant="secondary">
            {Object.values(stepsData).filter(s => s.completed).length} / {sortedSteps.length} Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-1" data-testid="text-current-step-name">{currentStep.name}</h3>
            {currentStep.description && (
              <p className="text-sm text-muted-foreground">{currentStep.description}</p>
            )}
          </div>

          <StepInput
            step={currentStep}
            workItemId={workItemId}
            onComplete={handleCompleteStep}
            isPending={updateExecutionMutation.isPending || completeExecutionMutation.isPending}
            organizationId={user?.organizationId}
          />

          {/* Progress indicator */}
          <div className="pt-4 border-t">
            <div className="flex gap-1">
              {sortedSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex-1 h-2 rounded ${
                    stepsData[step.id]?.completed
                      ? 'bg-primary'
                      : index === currentStepIndex
                      ? 'bg-primary/50'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StepInputProps {
  step: WorkflowStep;
  workItemId: number;
  onComplete: (data: any) => void;
  isPending: boolean;
  organizationId?: number;
}

function StepInput({ step, workItemId, onComplete, isPending, organizationId }: StepInputProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState('');
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});

  const { data: workItem } = useQuery({
    queryKey: [`/api/work-items/${workItemId}`],
    enabled: step.type === 'splynx_ticket',
  });

  const handleSubmit = () => {
    if (step.type === 'inspection') {
      onComplete({ 
        checked: true, 
        checklist: checklistState,
        notes 
      });
    } else if (step.type === 'form') {
      onComplete({ formData, notes });
    } else if (step.type === 'photo') {
      onComplete({ photos: [], notes });
    } else if (step.type === 'signature') {
      onComplete({ signature: '', notes });
    } else if (step.type === 'splynx_ticket') {
      onComplete({ viewed: true, notes: 'Ticket viewed and interacted with' });
    }
  };

  if (step.type === 'splynx_ticket' && workItem) {
    const ticketId = workItem.workflowMetadata?.splynx_ticket_id;
    
    if (!ticketId) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">No Splynx ticket linked to this work item.</p>
          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={isPending}
            data-testid="button-complete-step"
          >
            Complete Step
          </Button>
        </div>
      );
    }

    if (!organizationId) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Loading user information...</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <SplynxTicketViewer
          workItemId={workItemId}
          ticketId={ticketId}
          organizationId={organizationId}
          onMessageSent={() => {}}
          onStatusChanged={() => {}}
        />
        <Button 
          onClick={handleSubmit} 
          className="w-full"
          disabled={isPending}
          data-testid="button-complete-step"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Mark as Viewed'
          )}
        </Button>
      </div>
    );
  }

  if (step.type === 'inspection') {
    const hasChecklistItems = step.config?.checklistItems && step.config.checklistItems.length > 0;
    
    return (
      <div className="space-y-4">
        {hasChecklistItems ? (
          <>
            <div className="space-y-3">
              {step.config.checklistItems.map((item: any) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={item.id}
                    checked={checklistState[item.id] || false}
                    onCheckedChange={(checked) => 
                      setChecklistState({ ...checklistState, [item.id]: checked as boolean })
                    }
                    data-testid={`checkbox-${item.id}`}
                  />
                  <Label htmlFor={item.id} className="text-sm font-normal">
                    {item.name}
                  </Label>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="inspection-check" 
              data-testid="checkbox-inspection"
            />
            <Label htmlFor="inspection-check" className="text-sm font-normal">
              I have completed this inspection
            </Label>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes or observations..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            data-testid="input-step-notes"
          />
        </div>
        <Button 
          onClick={handleSubmit} 
          className="w-full"
          disabled={isPending}
          data-testid="button-complete-step"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Complete Step'
          )}
        </Button>
      </div>
    );
  }

  if (step.type === 'form' && step.config?.fields) {
    return (
      <div className="space-y-4">
        {step.config.fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.type === 'text' && (
              <Input
                id={field.name}
                value={formData[field.name] || ''}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                required={field.required}
                data-testid={`input-${field.name}`}
              />
            )}
            {field.type === 'textarea' && (
              <Textarea
                id={field.name}
                value={formData[field.name] || ''}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                required={field.required}
                data-testid={`input-${field.name}`}
              />
            )}
            {field.type === 'select' && field.options && (
              <select
                id={field.name}
                value={formData[field.name] || ''}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                required={field.required}
                className="w-full border rounded-md p-2"
                data-testid={`select-${field.name}`}
              >
                <option value="">Select an option</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            data-testid="input-step-notes"
          />
        </div>
        <Button 
          onClick={handleSubmit} 
          className="w-full"
          disabled={isPending}
          data-testid="button-complete-step"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Complete Step'
          )}
        </Button>
      </div>
    );
  }

  if (step.type === 'photo') {
    return (
      <div className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Photo capture coming soon</p>
          <p className="text-xs text-muted-foreground mt-1">
            {step.config?.minPhotos && `Minimum ${step.config.minPhotos} photo(s) required`}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            data-testid="input-step-notes"
          />
        </div>
        <Button 
          onClick={handleSubmit} 
          className="w-full"
          disabled={isPending}
          data-testid="button-complete-step"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Complete Step'
          )}
        </Button>
      </div>
    );
  }

  if (step.type === 'signature') {
    return (
      <div className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <PenTool className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Signature capture coming soon</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            data-testid="input-step-notes"
          />
        </div>
        <Button 
          onClick={handleSubmit} 
          className="w-full"
          disabled={isPending}
          data-testid="button-complete-step"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Complete Step'
          )}
        </Button>
      </div>
    );
  }

  if (step.type === 'geolocation') {
    const [geolocation, setGeolocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [capturing, setCapturing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const captureLocation = () => {
      setCapturing(true);
      setError(null);
      
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser');
        setCapturing(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setGeolocation(loc);
          setCapturing(false);
        },
        (err) => {
          setError(`Error: ${err.message}`);
          setCapturing(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    const handleSubmitGeo = () => {
      if (!geolocation && step.required) {
        return; // Button is disabled anyway if required and no location
      }
      onComplete({ geolocation, notes });
    };

    return (
      <div className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-6">
          {!geolocation ? (
            <div className="text-center space-y-4">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Capture GPS Coordinates</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click below to record your current location
                </p>
              </div>
              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}
              <Button
                onClick={captureLocation}
                disabled={capturing}
                variant="outline"
                className="w-full"
                data-testid="button-capture-location"
              >
                {capturing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Capturing Location...
                  </>
                ) : (
                  <>
                    <Navigation className="h-4 w-4 mr-2" />
                    Capture My Location
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Location Captured</span>
              </div>
              <div className="bg-muted rounded-lg p-3 text-left space-y-1">
                <div className="text-xs text-muted-foreground">Latitude</div>
                <div className="font-mono text-sm">{geolocation.latitude.toFixed(6)}</div>
                <div className="text-xs text-muted-foreground mt-2">Longitude</div>
                <div className="font-mono text-sm">{geolocation.longitude.toFixed(6)}</div>
              </div>
              <Button
                onClick={captureLocation}
                variant="ghost"
                size="sm"
                data-testid="button-recapture-location"
              >
                Recapture Location
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            data-testid="input-step-notes"
          />
        </div>
        <Button 
          onClick={handleSubmitGeo} 
          className="w-full"
          disabled={isPending || (step.required && !geolocation)}
          data-testid="button-complete-step"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Complete Step'
          )}
        </Button>
      </div>
    );
  }

  return null;
}
