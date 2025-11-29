import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, ExternalLink, Users, Folder } from 'lucide-react';
import WorkflowTemplateStepBuilder from '@/components/workflow/WorkflowTemplateStepBuilder';
import CompletionCallbackEditor, { type CompletionCallback } from '@/components/workflow/CompletionCallbackEditor';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Team } from '@shared/schema';

interface ProcessFolder {
  id: number;
  name: string;
  slug: string;
  folderType: string;
  parentId?: number | null;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: any[];
  completionCallbacks?: CompletionCallback[];
  applicableTypes?: string[];
  estimatedMinutes?: number;
  teamId?: number | null;
  folderId?: number | null;
}

interface WorkItem {
  id: number;
  title: string;
  status: string;
  assignedTo?: number;
  assignedToUser?: { fullName: string; email: string };
  dueDate?: string;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: 'Planning', label: 'Planning', color: 'bg-gray-100 text-gray-700' },
  { value: 'Ready', label: 'Ready', color: 'bg-blue-100 text-blue-700' },
  { value: 'In Progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'Stuck', label: 'Stuck', color: 'bg-red-100 text-red-700' },
  { value: 'Completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
  { value: 'Archived', label: 'Archived', color: 'bg-gray-100 text-gray-500' },
];

export default function TemplateEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<any[]>([]);
  const [completionCallbacks, setCompletionCallbacks] = useState<CompletionCallback[]>([]);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [folderId, setFolderId] = useState<number | null>(null);

  // Fetch template details (if editing existing)
  const { data: template, isLoading } = useQuery<WorkflowTemplate>({
    queryKey: [`/api/workflows/templates/${id}`],
    enabled: !!id && id !== 'new',
  });

  // Fetch teams
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  // Fetch process folders for templates
  const { data: folders = [] } = useQuery<ProcessFolder[]>({
    queryKey: ['/api/workflows/folders', { folderType: 'templates' }],
    queryFn: async () => {
      const response = await fetch('/api/workflows/folders?folderType=templates');
      if (!response.ok) throw new Error('Failed to fetch folders');
      return response.json();
    },
  });

  // Fetch recent work items using this template (only for existing templates)
  const { data: workItems = [] } = useQuery<WorkItem[]>({
    queryKey: ['/api/work-items', { workItemType: id, pageSize: '5' }],
    enabled: !!id && id !== 'new',
  });

  const recentWorkItems = workItems;

  // Normalize legacy step types to current schema
  const normalizeLegacyStepTypes = (steps: any[]) => {
    return steps.map(step => {
      // Map legacy "inspection" type to "checklist"
      if (step.type === 'inspection') {
        return { ...step, type: 'checklist' };
      }
      // Map legacy "data_output" if it exists (not in current schema)
      if (step.type === 'data_output') {
        return { ...step, type: 'form' };
      }
      return step;
    });
  };

  // Load template data when fetched
  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setSteps(normalizeLegacyStepTypes(template.steps || []));
      setCompletionCallbacks(template.completionCallbacks || []);
      setTeamId(template.teamId || null);
      setFolderId(template.folderId || null);
    }
  }, [template]);

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(`/api/workflows/templates`, {
        method: 'POST',
        body: data,
      });
      return res.json();
    },
    onSuccess: async (data: any) => {
      // Force refetch instead of just invalidating to bypass staleTime: Infinity
      await queryClient.refetchQueries({ queryKey: ['/api/workflows/templates'] });
      toast({
        title: 'Success',
        description: 'Template created successfully',
      });
      if (data?.id) {
        setLocation(`/templates/workflows/${data.id}/edit`);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create template',
        variant: 'destructive',
      });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(`/api/workflows/templates/${id}`, {
        method: 'PUT',
        body: data,
      });
      return res.json();
    },
    onSuccess: async () => {
      // Force refetch instead of just invalidating to bypass staleTime: Infinity
      await queryClient.refetchQueries({ queryKey: ['/api/workflows/templates'] });
      await queryClient.refetchQueries({ queryKey: [`/api/workflows/templates/${id}`] });
      toast({
        title: 'Success',
        description: 'Template updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update template',
        variant: 'destructive',
      });
    },
  });

  const cleanStepsForSave = (steps: any[]) => {
    // Normalize legacy types and remove UI-only fields
    return steps.map(step => {
      let cleanedStep = { ...step };

      // 1. Normalize legacy step types
      if (cleanedStep.type === 'inspection') {
        cleanedStep.type = 'checklist';
      }
      if (cleanedStep.type === 'data_output') {
        cleanedStep.type = 'form';
      }

      // 2. Remove UI-only fields from OCR extractions
      if (cleanedStep.config?.photoAnalysisConfig?.extractions) {
        cleanedStep = {
          ...cleanedStep,
          config: {
            ...cleanedStep.config,
            photoAnalysisConfig: {
              ...cleanedStep.config.photoAnalysisConfig,
              extractions: cleanedStep.config.photoAnalysisConfig.extractions.map((ext: any) => {
                // Remove UI-only fields (id, displayLabel) and keep only schema fields
                const { id: _, displayLabel: __, ...schemaFields } = ext;
                return schemaFields;
              }),
            },
          },
        };
      }

      return cleanedStep;
    });
  };

  const handleSave = () => {
    const cleanedSteps = cleanStepsForSave(steps);

    if (id === 'new') {
      const slugId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const templateData = {
        id: slugId,
        name,
        description,
        steps: cleanedSteps,
        completionCallbacks,
        teamId,
        folderId,
      };
      
      console.log('[TemplateEdit] Saving new template:', JSON.stringify(templateData, null, 2));
      createMutation.mutate(templateData);
    } else {
      const updateData = {
        name,
        description,
        steps: cleanedSteps,
        completionCallbacks,
        teamId,
        folderId,
      };
      
      console.log('[TemplateEdit] Updating template:', JSON.stringify(updateData, null, 2));
      updateMutation.mutate(updateData);
    }
  };

  const handleCancel = () => {
    setLocation('/templates/workflows');
  };

  const getStatusColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return statusOption?.color || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading template...</div>
      </div>
    );
  }

  if (id !== 'new' && !template) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Template not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  {id === 'new' ? 'Create Workflow Template' : 'Edit Workflow Template'}
                </h1>
                <p className="text-muted-foreground">
                  Configure step-by-step template for work items
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!name || createMutation.isPending || updateMutation.isPending}
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-2" />
                {id === 'new' ? 'Create Template' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Template Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter template name"
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this template is for"
                    rows={3}
                    data-testid="input-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1.5 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Team
                    </Label>
                    <Select
                      value={teamId?.toString() || "none"}
                      onValueChange={(v) => setTeamId(v === "none" ? null : parseInt(v))}
                    >
                      <SelectTrigger data-testid="select-team">
                        <SelectValue placeholder="No team assigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No team assigned</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5 mb-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      Folder
                    </Label>
                    <Select
                      value={folderId?.toString() || "none"}
                      onValueChange={(v) => setFolderId(v === "none" ? null : parseInt(v))}
                    >
                      <SelectTrigger data-testid="select-folder">
                        <SelectValue placeholder="No folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No folder</SelectItem>
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id.toString()}>
                            {folder.parentId ? `└ ${folder.name}` : folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Workflow Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Workflow Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <WorkflowTemplateStepBuilder
                  steps={steps}
                  onChange={setSteps}
                />
              </CardContent>
            </Card>

            {/* Completion Callbacks */}
            <Card>
              <CardHeader>
                <CardTitle>Data Integration</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure how workflow data is saved back to your database
                </p>
              </CardHeader>
              <CardContent>
                <CompletionCallbackEditor
                  steps={steps}
                  callbacks={completionCallbacks}
                  onChange={setCompletionCallbacks}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Template Info & Recent Work Items */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Template Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Steps:</span>
                  <span className="font-medium">{steps.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Template ID:</span>
                  <span className="font-mono text-xs">
                    {id === 'new' ? 'auto-generated' : id}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Work Items - only show for existing templates */}
            {id !== 'new' && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Work Items</CardTitle>
                  {recentWorkItems.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Showing {recentWorkItems.length} recent work {recentWorkItems.length === 1 ? 'item' : 'items'}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {recentWorkItems.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No work items using this template yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentWorkItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col space-y-1 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium line-clamp-1 flex-1">
                              {item.title}
                            </span>
                            <Badge className={`${getStatusColor(item.status)} text-xs shrink-0`}>
                              {item.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {item.assignedToUser && (
                              <span className="truncate">
                                {item.assignedToUser.fullName}
                              </span>
                            )}
                            {item.dueDate && (
                              <span className="shrink-0">
                                • Due {format(new Date(item.dueDate), 'MMM dd')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {recentWorkItems.length > 0 && (
                        <div className="flex justify-end pt-2">
                          <Link href={`/strategy/work-items?workItemType=${id}`}>
                            <Button variant="link" className="h-auto p-0 text-sm" data-testid="link-show-more">
                              Show more <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
