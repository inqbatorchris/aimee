import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  ClipboardList, 
  Plus, 
  GripVertical, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Circle,
  ArrowRight,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SprintItemsSectionProps {
  sprintId: string;
  items: any[];
  onUpdate: () => void;
}

const statusIcons = {
  todo: Circle,
  in_progress: Clock,
  review: AlertCircle,
  done: CheckCircle,
};

const statusLabels = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const statusColors = {
  todo: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

const priorityColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function SprintItemsSection({ sprintId, items, onUpdate }: SprintItemsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    type: 'feature',
    priority: 'medium',
    storyPoints: 1,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Ensure items is always an array
  const safeItems = Array.isArray(items) ? items : [];

  const addItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      return apiRequest('/api/strategy/tickets', {
        method: 'POST',
        body: {
          ...itemData,
          sprintId: parseInt(sprintId),
          status: 'todo',
        },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Item added',
        description: 'Sprint item has been added successfully.',
      });
      onUpdate();
      setNewItem({
        title: '',
        description: '',
        type: 'feature',
        priority: 'medium',
        storyPoints: 1,
      });
      setShowAddForm(false);
    },
    onError: () => {
      toast({
        title: 'Error adding item',
        description: 'Failed to add sprint item.',
        variant: 'destructive',
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: number; updates: any }) => {
      return apiRequest(`/api/strategy/tickets/${itemId}`, {
        method: 'PUT',
        body: updates,
      });
    },
    onSuccess: () => {
      onUpdate();
    },
    onError: () => {
      toast({
        title: 'Error updating item',
        description: 'Failed to update sprint item.',
        variant: 'destructive',
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return apiRequest(`/api/strategy/tickets/${itemId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Item deleted',
        description: 'Sprint item has been deleted successfully.',
      });
      onUpdate();
    },
    onError: () => {
      toast({
        title: 'Error deleting item',
        description: 'Failed to delete sprint item.',
        variant: 'destructive',
      });
    },
  });

  const handleAddItem = () => {
    if (newItem.title.trim()) {
      addItemMutation.mutate(newItem);
    }
  };

  const handleStatusChange = (itemId: number, newStatus: string) => {
    updateItemMutation.mutate({
      itemId,
      updates: { status: newStatus },
    });
  };

  const handleDeleteItem = (itemId: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteItemMutation.mutate(itemId);
    }
  };

  const groupedItems = safeItems.reduce((acc, item) => {
    if (!acc[item.status]) {
      acc[item.status] = [];
    }
    acc[item.status].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const getProgressStats = () => {
    const total = safeItems.length;
    const completed = safeItems.filter(item => item.status === 'done').length;
    const inProgress = safeItems.filter(item => item.status === 'in_progress').length;
    const review = safeItems.filter(item => item.status === 'review').length;
    
    return { total, completed, inProgress, review };
  };

  const stats = getProgressStats();

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" />
            Sprint Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 sm:pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.review}</div>
              <div className="text-sm text-muted-foreground">In Review</div>
            </div>
          </div>
          
          {stats.total > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{Math.round((stats.completed / stats.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Item */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sprint Items</CardTitle>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant={showAddForm ? "outline" : "default"}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={newItem.title}
                    onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter item title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={newItem.type}
                    onValueChange={(value) => setNewItem(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="bug">Bug Fix</SelectItem>
                      <SelectItem value="improvement">Improvement</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the item"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={newItem.priority}
                    onValueChange={(value) => setNewItem(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Story Points</label>
                  <Select
                    value={newItem.storyPoints.toString()}
                    onValueChange={(value) => setNewItem(prev => ({ ...prev, storyPoints: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 5, 8, 13].map(points => (
                        <SelectItem key={points} value={points.toString()}>{points}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleAddItem}
                  disabled={!newItem.title.trim() || addItemMutation.isPending}
                >
                  {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sprint Items by Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(statusLabels).map(([status, label]) => {
          const Icon = statusIcons[status as keyof typeof statusIcons];
          const statusItems = groupedItems[status] || [];
          
          return (
            <Card key={status}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                  <Badge variant="secondary" className="text-xs">
                    {statusItems.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {statusItems.map(item => (
                  <div key={item.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${priorityColors[item.priority as keyof typeof priorityColors]}`}
                      >
                        {item.priority}
                      </Badge>
                      <span className="text-muted-foreground">
                        {item.storyPoints}sp
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Select
                        value={item.status}
                        onValueChange={(newStatus) => handleStatusChange(item.id, newStatus)}
                      >
                        <SelectTrigger className="text-xs h-6">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([statusKey, statusLabel]) => (
                            <SelectItem key={statusKey} value={statusKey}>
                              {statusLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
                
                {statusItems.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No items</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No items in this sprint yet</p>
            <p className="text-sm text-muted-foreground">Add items or assign them from the tagnut</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}