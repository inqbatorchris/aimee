import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Clock, CheckSquare, Type, Upload, ThumbsUp, Link2, MessageSquare } from 'lucide-react';

interface WorkflowProgressPanelProps {
  workItemId: number;
}

const STEP_ICONS: Record<string, any> = {
  checkbox: CheckSquare,
  text_input: Type,
  file_upload: Upload,
  approval: ThumbsUp,
  kb_link: Link2,
  comment: MessageSquare,
};

export default function WorkflowProgressPanel({ workItemId }: WorkflowProgressPanelProps) {
  const { toast } = useToast();
  const [stepInputs, setStepInputs] = useState<Record<string, any>>({});

  const { data: workflow, isLoading } = useQuery<any>({
    queryKey: ['/api/workflows/work-items', workItemId, 'workflow'],
  });

  useEffect(() => {
    if (workflow?.execution?.executionData) {
      setStepInputs(workflow.execution.executionData);
    }
  }, [workflow]);

  const updateStepMutation = useMutation({
    mutationFn: async ({ stepId, data }: { stepId: string; data: any }) => {
      return apiRequest(`/api/workflows/work-items/${workItemId}/workflow/steps/${stepId}`, {
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows/work-items', workItemId] });
      toast({
        title: 'Progress saved',
        description: 'Workflow step updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update workflow step',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return <div>Loading workflow...</div>;
  }

  if (!workflow || !workflow.template) {
    return null;
  }

  const steps = workflow.template.steps || [];
  const executionData = workflow.execution?.executionData || {};
  const completedSteps = Object.values(executionData).filter((v: any) => v?.completed).length;
  const progressPercent = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  const handleStepUpdate = (stepId: string, updates: any) => {
    const newData = { ...stepInputs[stepId], ...updates };
    setStepInputs({ ...stepInputs, [stepId]: newData });
  };

  const handleStepComplete = (stepId: string) => {
    const stepData = { ...stepInputs[stepId], completed: true, completedAt: new Date().toISOString() };
    updateStepMutation.mutate({ stepId, data: stepData });
  };

  const renderStepInput = (step: any) => {
    const stepData = stepInputs[step.id] || {};
    const Icon = STEP_ICONS[step.type] || CheckSquare;

    return (
      <Card key={step.id} className={stepData.completed ? 'opacity-60' : ''}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Icon className="h-5 w-5 mt-1 text-gray-600" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-medium">{step.label}</h4>
                  {step.description && (
                    <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                  )}
                </div>
                {stepData.completed && (
                  <CheckCircle className="h-5 w-5 text-green-600" data-testid={`step-completed-${step.id}`} />
                )}
              </div>

              {!stepData.completed && (
                <>
                  {step.type === 'checkbox' && (
                    <div className="flex items-center space-x-2 mt-2">
                      <Checkbox
                        id={`checkbox-${step.id}`}
                        checked={stepData.value || false}
                        onCheckedChange={(checked) => handleStepUpdate(step.id, { value: checked })}
                        data-testid={`checkbox-${step.id}`}
                      />
                      <Label htmlFor={`checkbox-${step.id}`}>Mark as complete</Label>
                    </div>
                  )}

                  {step.type === 'text_input' && (
                    <div className="mt-2">
                      {step.config?.multiline ? (
                        <Textarea
                          value={stepData.value || ''}
                          onChange={(e) => handleStepUpdate(step.id, { value: e.target.value })}
                          placeholder="Enter text..."
                          rows={4}
                          data-testid={`input-${step.id}`}
                        />
                      ) : (
                        <Input
                          value={stepData.value || ''}
                          onChange={(e) => handleStepUpdate(step.id, { value: e.target.value })}
                          placeholder="Enter text..."
                          data-testid={`input-${step.id}`}
                        />
                      )}
                    </div>
                  )}

                  {step.type === 'file_upload' && (
                    <div className="mt-2">
                      <Input
                        type="file"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            handleStepUpdate(step.id, { 
                              value: files[0].name,
                              fileName: files[0].name 
                            });
                          }
                        }}
                        multiple={step.config?.multipleFiles}
                        data-testid={`file-${step.id}`}
                      />
                      {stepData.fileName && (
                        <p className="text-sm text-gray-600 mt-1">Selected: {stepData.fileName}</p>
                      )}
                    </div>
                  )}

                  {step.type === 'approval' && (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        onClick={() => handleStepUpdate(step.id, { value: 'approved', approved: true })}
                        data-testid={`approve-${step.id}`}
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  )}

                  {step.type === 'kb_link' && (
                    <div className="mt-2">
                      <Input
                        value={stepData.value || ''}
                        onChange={(e) => handleStepUpdate(step.id, { value: e.target.value })}
                        placeholder="Enter knowledge base URL..."
                        data-testid={`input-${step.id}`}
                      />
                    </div>
                  )}

                  {step.type === 'comment' && (
                    <div className="mt-2">
                      <Textarea
                        value={stepData.value || ''}
                        onChange={(e) => handleStepUpdate(step.id, { value: e.target.value })}
                        placeholder="Add your comments..."
                        rows={3}
                        data-testid={`input-${step.id}`}
                      />
                    </div>
                  )}

                  <Button
                    onClick={() => handleStepComplete(step.id)}
                    disabled={step.required && !stepData.value}
                    className="mt-3"
                    size="sm"
                    data-testid={`complete-${step.id}`}
                  >
                    Complete Step
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{workflow.template.name}</span>
            <span className="text-sm font-normal text-gray-500">
              {completedSteps} / {steps.length} steps
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="w-full" />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {steps.map((step: any) => renderStepInput(step))}
      </div>
    </div>
  );
}
