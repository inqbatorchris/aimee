import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, GitBranch, Loader2 } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: any[];
  applicableTypes?: string[];
  estimatedMinutes?: number;
  isActive?: boolean;
}

export default function TemplateList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery<WorkflowTemplate[]>({
    queryKey: ['/api/workflows/templates'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/workflows/templates/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: async () => {
      // Force refetch instead of just invalidating to bypass staleTime: Infinity
      await queryClient.refetchQueries({ queryKey: ['/api/workflows/templates'] });
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete template',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Workflow Templates</h1>
          <p className="text-muted-foreground">
            Create and manage workflow templates for work items, field tasks, and processes
          </p>
        </div>
        <Button 
          onClick={() => navigate('/templates/workflows/new/edit')}
          data-testid="button-create-template"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {!templates || templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No workflow templates yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get started by creating your first workflow template
            </p>
            <Button onClick={() => navigate('/templates/workflows/new/edit')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-2">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {template.steps?.length || 0} steps
                    </Badge>
                    {template.estimatedMinutes && (
                      <Badge variant="outline">
                        ~{template.estimatedMinutes} min
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/templates/workflows/${template.id}/edit`)}
                      className="flex-1"
                      data-testid={`button-edit-${template.id}`}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this template?')) {
                          deleteMutation.mutate(template.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="flex-1"
                      data-testid={`button-delete-${template.id}`}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
