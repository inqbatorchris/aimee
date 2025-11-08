import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Clock, ListChecks } from 'lucide-react';

interface WorkflowAssignmentProps {
  workItemId: number;
  workItemType: string;
  onAssigned?: () => void;
}

export default function WorkflowAssignment({ workItemId, workItemType, onAssigned }: WorkflowAssignmentProps) {
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ['/api/workflows/templates'],
  });

  const assignMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest(`/api/workflows/work-items/${workItemId}/assign`, {
        method: 'POST',
        body: { templateId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows/work-items', workItemId] });
      toast({
        title: 'Success',
        description: 'Workflow assigned successfully',
      });
      onAssigned?.();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to assign workflow',
        variant: 'destructive',
      });
    },
  });

  const applicableTemplates = templates.filter(t => 
    t.applicableTypes?.includes(workItemType) || !t.applicableTypes?.length
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          Assign Workflow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="template-select">Select Workflow Template</Label>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger id="template-select" data-testid="select-workflow-template">
              <SelectValue placeholder="Choose a workflow template" />
            </SelectTrigger>
            <SelectContent>
              {applicableTemplates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center gap-2">
                    <span>{template.name}</span>
                    {template.estimatedMinutes && (
                      <span className="text-xs text-gray-500">
                        ({template.estimatedMinutes}min)
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => assignMutation.mutate(selectedTemplateId)}
          disabled={!selectedTemplateId || assignMutation.isPending}
          className="w-full"
          data-testid="button-assign-workflow"
        >
          {assignMutation.isPending ? 'Assigning...' : 'Assign Workflow'}
        </Button>
      </CardContent>
    </Card>
  );
}
