import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  X, 
  Settings, 
  Users, 
  Target, 
  Clock, 
  Archive,
  CheckCircle,
  Circle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SprintSettingsDialogProps {
  sprint: any;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SprintSettingsDialog({ sprint, children, open = false, onOpenChange }: SprintSettingsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  const [selectedBacklogItems, setSelectedBacklogItems] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState('items');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch available backlog items (not assigned to any sprint)
  const { data: availableItems = [] } = useQuery({
    queryKey: ['/api/strategy/backlog/available'],
    enabled: isOpen,
  });

  // Fetch current sprint items
  const { data: sprintItems = [] } = useQuery({
    queryKey: ['/api/strategy/tickets', { sprintId: sprint.id }],
    enabled: isOpen,
  });

  // Fetch sprint roles
  const { data: sprintRoles = [] } = useQuery({
    queryKey: ['/api/strategy/sprints', sprint.id, 'roles'],
    enabled: isOpen,
  });

  // Add items to sprint mutation
  const addItemsToSprintMutation = useMutation({
    mutationFn: ({ sprintId, backlogItemIds }: { sprintId: number; backlogItemIds: number[] }) =>
      apiRequest(`/api/strategy/sprints/${sprintId}/items`, {
        method: 'POST',
        body: { backlogItemIds },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/backlog/available'] });
      setSelectedBacklogItems([]);
      toast({
        title: "Items added to sprint",
        description: `Successfully added ${selectedBacklogItems.length} items to the sprint.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding items",
        description: error.message || "Failed to add items to sprint",
        variant: "destructive",
      });
    },
  });

  // Remove item from sprint mutation
  const removeItemFromSprintMutation = useMutation({
    mutationFn: ({ sprintId, itemId }: { sprintId: number; itemId: number }) =>
      apiRequest(`/api/strategy/sprints/${sprintId}/items/${itemId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/backlog/available'] });
      toast({
        title: "Item removed from sprint",
        description: "The item has been moved back to the tagnut.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing item",
        description: error.message || "Failed to remove item from sprint",
        variant: "destructive",
      });
    },
  });

  const handleAddItemsToSprint = () => {
    if (selectedBacklogItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to add to the sprint.",
        variant: "destructive",
      });
      return;
    }

    addItemsToSprintMutation.mutate({
      sprintId: sprint.id,
      backlogItemIds: selectedBacklogItems,
    });
  };

  const handleRemoveItemFromSprint = (itemId: number) => {
    removeItemFromSprintMutation.mutate({
      sprintId: sprint.id,
      itemId,
    });
  };

  const toggleItemSelection = (itemId: number) => {
    setSelectedBacklogItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'high': return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Circle className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Circle className="h-4 w-4 text-green-500" />;
      default: return <Circle className="h-4 w-4 text-gray-400" />;
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Sprint Settings - {sprint.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="items">Sprint Items</TabsTrigger>
              <TabsTrigger value="backlog">Add from Tagnut</TabsTrigger>
              <TabsTrigger value="roles">Team Roles</TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="flex-1 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Current Sprint Items ({sprintItems.length})
                  </CardTitle>
                  <CardDescription>
                    Items currently assigned to this sprint
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {sprintItems.length === 0 ? (
                      <div className="text-center py-8">
                        <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No items in sprint</h3>
                        <p className="text-muted-foreground">
                          Add items from the tagnut to get started
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sprintItems.map((item: any) => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{item.title}</h4>
                                <Badge variant="outline" className={getPriorityColor(item.priority || 'medium')}>
                                  {item.priority || 'medium'}
                                </Badge>
                                <Badge variant="outline">{item.type}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {item.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary">{item.department}</Badge>
                                <Badge variant="outline">{item.status}</Badge>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItemFromSprint(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="backlog" className="flex-1 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Available Tagnut Items ({availableItems.length})
                  </CardTitle>
                  <CardDescription>
                    Select items from the tagnut to add to this sprint
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedBacklogItems.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium">
                          {selectedBacklogItems.length} items selected
                        </span>
                        <Button
                          onClick={handleAddItemsToSprint}
                          disabled={addItemsToSprintMutation.isPending}
                          size="sm"
                        >
                          {addItemsToSprintMutation.isPending ? 'Adding...' : 'Add to Sprint'}
                        </Button>
                      </div>
                    )}

                    <ScrollArea className="h-[400px]">
                      {availableItems.length === 0 ? (
                        <div className="text-center py-8">
                          <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="text-lg font-semibold mb-2">No available items</h3>
                          <p className="text-muted-foreground">
                            All tagnut items are already assigned to sprints
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {availableItems.map((item: any) => (
                            <div 
                              key={item.id} 
                              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <Checkbox
                                checked={selectedBacklogItems.includes(item.id)}
                                onCheckedChange={() => toggleItemSelection(item.id)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getPriorityIcon(item.priority)}
                                  <h4 className="font-medium">{item.title}</h4>
                                  <Badge variant="outline" className={getPriorityColor(item.priority)}>
                                    {item.priority}
                                  </Badge>
                                  <Badge variant="outline">{item.type}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {item.description}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="secondary">{item.department}</Badge>
                                  {item.storyPoints > 0 && (
                                    <Badge variant="outline">{item.storyPoints} pts</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roles" className="flex-1 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Sprint Team Roles
                  </CardTitle>
                  <CardDescription>
                    Team members assigned to this sprint
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {sprintRoles.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No team roles assigned</h3>
                        <p className="text-muted-foreground">
                          Team roles are managed in the sprint creation dialog
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sprintRoles.map((role: any) => (
                          <div 
                            key={`${role.userId}-${role.roleType}`} 
                            className="flex items-center gap-3 p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{role.user?.fullName || 'Unknown User'}</h4>
                                <Badge variant="outline">{role.roleType?.replace('_', ' ') || 'Unknown Role'}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Assigned on {new Date(role.assignedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}