import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface WorkflowTemplateSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export function WorkflowTemplateSelector({ 
  value, 
  onChange, 
  label = 'Workflow Template',
  placeholder = 'Select a template'
}: WorkflowTemplateSelectorProps) {
  const { data: templates, isLoading } = useQuery<any[]>({
    queryKey: ['/api/workflow-templates'],
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading templates...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid="select-workflow-template">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {!templates || templates.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">No templates available</div>
          ) : (
            templates.map((template: any) => (
              <SelectItem key={template.id} value={template.id} data-testid={`option-template-${template.id}`}>
                {template.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
