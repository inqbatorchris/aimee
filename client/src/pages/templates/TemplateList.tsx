import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, GitBranch, Loader2, Users, Folder, Clock, Layers, GripVertical, X } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ProcessFolderNavigation } from '@/components/process-folders/ProcessFolderNavigation';
import { cn } from '@/lib/utils';
import type { Team } from '@shared/schema';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category?: string;
  steps: any[];
  applicableTypes?: string[];
  estimatedMinutes?: number;
  isActive?: boolean;
  teamId?: number | null;
  folderId?: number | null;
}

export default function TemplateList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<WorkflowTemplate | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: templates, isLoading } = useQuery<WorkflowTemplate[]>({
    queryKey: ['/api/workflows/templates'],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  interface ProcessFolder {
    id: number;
    teamId?: number | null;
  }

  const { data: folders = [] } = useQuery<ProcessFolder[]>({
    queryKey: ['/api/workflows/folders', { folderType: 'templates' }],
    queryFn: async () => {
      const response = await fetch('/api/workflows/folders?folderType=templates');
      if (!response.ok) throw new Error('Failed to fetch folders');
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/workflows/templates/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: async () => {
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

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WorkflowTemplate> }) => {
      return apiRequest(`/api/workflows/templates/${id}`, {
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['/api/workflows/templates'] });
      toast({
        title: 'Success',
        description: 'Template moved successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to move template',
        variant: 'destructive',
      });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const templateId = event.active.id.toString().replace('template-', '');
    const template = templates?.find(t => t.id === templateId);
    setActiveTemplate(template || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTemplate(null);
    const { active, over } = event;
    
    if (!over) return;
    
    const templateId = active.id.toString().replace('template-', '');
    const overId = over.id.toString();
    
    let newTeamId: number | null = null;
    let newFolderId: number | null = null;
    
    if (overId === 'folder-root') {
      newFolderId = null;
      newTeamId = null;
    } else if (overId.startsWith('team-')) {
      newTeamId = parseInt(overId.replace('team-', ''));
      newFolderId = null;
    } else if (overId.startsWith('folder-')) {
      const folderId = overId.replace('folder-', '');
      newFolderId = parseInt(folderId);
      const folder = folders.find(f => f.id === newFolderId);
      newTeamId = folder?.teamId ?? null;
    }
    
    updateTemplateMutation.mutate({
      id: templateId,
      data: { teamId: newTeamId, folderId: newFolderId },
    });
  };

  const filteredTemplates = templates?.filter(template => {
    if (selectedTeamId === -1) {
      if (template.teamId !== null && template.teamId !== undefined) {
        return false;
      }
    } else if (selectedTeamId !== null && template.teamId !== selectedTeamId) {
      return false;
    }
    if (selectedFolderId !== null && template.folderId !== selectedFolderId) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.category?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getTeamName = (teamId: number | null | undefined) => {
    if (!teamId) return null;
    const team = teams.find(t => t.id === teamId);
    return team?.name;
  };

  const DraggableTemplateCard = ({ template }: { template: WorkflowTemplate }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: `template-${template.id}`,
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
      <Card 
        ref={setNodeRef}
        style={style}
        className={cn(
          "hover:shadow-sm transition-shadow group cursor-pointer overflow-hidden",
          isDragging && "opacity-50 shadow-lg"
        )}
        onClick={() => !isDragging && navigate(`/templates/workflows/${template.id}/edit`)}
        data-testid={`card-template-${template.id}`}
      >
        <CardContent className="p-3 overflow-hidden">
          {/* Title row with drag handle */}
          <div className="flex items-start gap-2 mb-2">
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="flex-1 min-w-0 font-medium text-sm leading-tight">
              {template.name}
            </h3>
          </div>
          
          {/* Description */}
          {template.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {template.description}
            </p>
          )}
          
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1 mb-2">
            <Badge variant="secondary" className="text-[11px] px-1.5 py-0 flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {template.steps?.length || 0} steps
            </Badge>
            {template.estimatedMinutes && (
              <Badge variant="outline" className="text-[11px] px-1.5 py-0 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ~{template.estimatedMinutes} min
              </Badge>
            )}
            {template.category && (
              <Badge variant="outline" className="text-[11px] px-1.5 py-0 truncate max-w-[100px]">
                {template.category}
              </Badge>
            )}
          </div>
          
          {/* Team/Folder info */}
          {(template.teamId || template.folderId) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              {template.teamId && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {getTeamName(template.teamId)}
                </span>
              )}
              {template.folderId && (
                <span className="flex items-center gap-1">
                  <Folder className="h-3 w-3" />
                  In folder
                </span>
              )}
            </div>
          )}
          
          {/* Action buttons row */}
          <div className="flex gap-2 pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/templates/workflows/${template.id}/edit`)}
              className="flex-1 h-7 text-xs px-2"
              data-testid={`button-edit-${template.id}`}
            >
              <Edit className="h-3 w-3 mr-1" />
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
              className="flex-1 h-7 text-xs px-2"
              data-testid={`button-delete-${template.id}`}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3 mr-1" />
              )}
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Workflow Templates
        </h2>
      </div>
      <ScrollArea className="flex-1 p-2">
        <ProcessFolderNavigation
          folderType="templates"
          selectedFolderId={selectedFolderId}
          onFolderSelect={setSelectedFolderId}
          selectedTeamId={selectedTeamId}
          onTeamSelect={setSelectedTeamId}
          showTeamFilter={true}
          isDragging={!!activeTemplate}
          items={templates?.map(t => ({ teamId: t.teamId, folderId: t.folderId })) || []}
          templates={templates?.map(t => ({ id: t.id, name: t.name, teamId: t.teamId, folderId: t.folderId })) || []}
          onTemplateSelect={(id) => navigate(`/templates/workflows/${id}/edit`)}
        />
      </ScrollArea>
    </div>
  );

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-[calc(100vh-64px)] flex-col md:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 border-r bg-muted/30 flex-col">
          <SidebarContent />
        </aside>

        <main className="flex-1 overflow-auto flex flex-col">
          {/* Mobile Filter Chips */}
          <div className="md:hidden border-b bg-muted/30 overflow-x-auto">
            <ScrollArea className="w-full h-auto">
              <div className="flex gap-2 p-3 whitespace-nowrap">
                <Button
                  variant={selectedTeamId === null && selectedFolderId === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedTeamId(null);
                    setSelectedFolderId(null);
                  }}
                  className="shrink-0 h-8 text-xs px-3"
                >
                  All
                </Button>
                <Button
                  variant={selectedTeamId === -1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedTeamId(-1);
                    setSelectedFolderId(null);
                  }}
                  className="shrink-0 h-8 text-xs px-3"
                >
                  No team
                </Button>
                {templates?.reduce((acc: any[], t) => {
                  if (t.teamId && !acc.find(team => team.id === t.teamId)) {
                    const team = teams.find(team => team.id === t.teamId);
                    if (team) acc.push(team);
                  }
                  return acc;
                }, []).map((team) => (
                  <Button
                    key={team.id}
                    variant={selectedTeamId === team.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedTeamId(team.id);
                      setSelectedFolderId(null);
                    }}
                    className="shrink-0 h-8 text-xs px-3"
                  >
                    {team.name}
                  </Button>
                ))}
                {selectedTeamId !== null && selectedTeamId !== -1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTeamId(null)}
                    className="shrink-0 h-8 text-xs px-2 ml-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 sm:px-6 py-6">
              <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="w-full sm:max-w-md">
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-templates"
                  />
                </div>
                <Button 
                  onClick={() => navigate('/templates/workflows/new/edit')}
                  data-testid="button-create-template"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create
                </Button>
              </div>

            {!filteredTemplates || filteredTemplates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchQuery || selectedFolderId !== null || selectedTeamId !== null 
                      ? 'No matching templates found' 
                      : 'No workflow templates yet'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchQuery || selectedFolderId !== null || selectedTeamId !== null 
                      ? 'Try adjusting your filters or search query'
                      : 'Get started by creating your first workflow template'}
                  </p>
                  {!searchQuery && selectedFolderId === null && selectedTeamId === null && (
                    <Button onClick={() => navigate('/templates/workflows/new/edit')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => (
                  <DraggableTemplateCard key={template.id} template={template} />
                ))}
              </div>
            )}
            </div>
          </div>
        </main>
      </div>

      <DragOverlay>
        {activeTemplate && (
          <Card className="w-64 shadow-lg opacity-90">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm truncate">{activeTemplate.name}</CardTitle>
            </CardHeader>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
