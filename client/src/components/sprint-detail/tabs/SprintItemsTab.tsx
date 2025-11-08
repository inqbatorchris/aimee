import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, Search, Filter } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { TaskDetailPanel } from '@/components/task-detail/TaskDetailPanel';

interface SprintItemsTabProps {
  sprintId: number;
  sprintName: string;
  isCreating: boolean;
}

export function SprintItemsTab({ sprintId, sprintName, isCreating }: SprintItemsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('current');
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Fetch current sprint items
  const { data: sprintItems = [], isLoading: loadingItems } = useQuery({
    queryKey: [`/api/strategy/tickets`, { sprintId }],
    enabled: !isCreating && sprintId > 0,
    queryFn: async () => {
      const response = await apiRequest(`/api/strategy/tickets?sprintId=${sprintId}`);
      return response.json();
    }
  });

  // Fetch available backlog items
  const { data: backlogItems = [], isLoading: loadingBacklog } = useQuery({
    queryKey: ['/api/strategy/backlog/available'],
    enabled: !isCreating && sprintId > 0,
    queryFn: async () => {
      const response = await apiRequest('/api/strategy/backlog/available');
      return response.json();
    }
  });
  
  const { toast } = useToast();
  
  // Add item to sprint mutation
  const addToSprintMutation = useMutation({
    mutationFn: async (backlogItemId: number) => {
      return apiRequest(`/api/strategy/backlog/${backlogItemId}/assign`, {
        method: 'POST',
        body: { sprintId }
      });
    },
    onSuccess: async () => {
      // Refetch the queries immediately to show the updated list
      await queryClient.refetchQueries({ queryKey: [`/api/strategy/tickets`, { sprintId }] });
      await queryClient.refetchQueries({ queryKey: ['/api/strategy/backlog/available'] });
      
      // Switch to current items tab to show the newly added item
      setActiveSubTab('current');
      
      toast({
        title: 'Item added to sprint',
        description: 'The backlog item has been added to this sprint.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add item to sprint.',
        variant: 'destructive'
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'done': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isCreating) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-sm">Save the sprint first to manage items</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-2 mx-3 mt-3">
          <TabsTrigger value="current">Current Items ({sprintItems.length})</TabsTrigger>
          <TabsTrigger value="backlog">Add from Tagnut ({backlogItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="flex-1 overflow-auto m-0 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-7 text-xs"
              />
            </div>
            <Button 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => {
                setSelectedTaskId(null);
                setIsCreatingTask(true);
                setTaskPanelOpen(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Create Item
            </Button>
          </div>

          {loadingItems ? (
            <div className="text-center py-8 text-muted-foreground">Loading items...</div>
          ) : sprintItems.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No items in this sprint yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add items from the backlog or create new ones
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sprintItems
                .filter((item: any) => 
                  item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.description?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((item: any) => (
                  <Card 
                    key={item.id} 
                    className="cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => {
                      setSelectedTaskId(item.id);
                      setIsCreatingTask(false);
                      setTaskPanelOpen(true);
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate hover:underline">{item.title}</h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={`${getStatusColor(item.status)} text-xs`}>
                              {item.status}
                            </Badge>
                            {item.priority && (
                              <Badge className={`${getPriorityColor(item.priority)} text-xs`}>
                                {item.priority}
                              </Badge>
                            )}
                            {item.storyPoints > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {item.storyPoints} points
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="backlog" className="flex-1 overflow-auto m-0 p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search backlog items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>

          {loadingBacklog ? (
            <div className="text-center py-8 text-muted-foreground">Loading backlog...</div>
          ) : backlogItems.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No items in backlog</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {backlogItems
                .filter((item: any) => 
                  item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.description?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((item: any) => (
                  <Card 
                    key={item.id} 
                    className="cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => {
                      setSelectedTaskId(item.id);
                      setIsCreatingTask(false);
                      setTaskPanelOpen(true);
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate hover:underline">{item.title}</h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {item.type && (
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                            )}
                            {item.priority && (
                              <Badge className={`${getPriorityColor(item.priority)} text-xs`}>
                                {item.priority}
                              </Badge>
                            )}
                            {item.department && (
                              <span className="text-xs text-muted-foreground">
                                {item.department}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToSprintMutation.mutate(item.id);
                          }}
                          disabled={addToSprintMutation.isPending}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Task Detail Panel */}
      {taskPanelOpen && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          open={taskPanelOpen}
          onClose={() => {
            setTaskPanelOpen(false);
            setSelectedTaskId(null);
            setIsCreatingTask(false);
          }}
        />
      )}
    </div>
  );
}