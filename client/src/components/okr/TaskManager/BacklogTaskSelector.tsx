import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Package,
  ArrowRight,
  CheckSquare,
  Square,
  AlertCircle
} from 'lucide-react';

interface BacklogItem {
  id: number;
  title: string;
  description?: string;
  taskType?: string;
  type?: string; // fallback for old structure
  priority?: string; // optional now
  storyPoints?: number;
  status?: string;
  lifecycleStage?: string;
  department?: string;
  assignedUser?: {
    id: number;
    fullName: string;
  };
}

interface BacklogTaskSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyResultId: number;
  keyResultTitle: string;
}

export function BacklogTaskSelector({ open, onOpenChange, keyResultId, keyResultTitle }: BacklogTaskSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // Get available backlog items for this key result
  const { data: backlogItems = [], isLoading } = useQuery({
    queryKey: ['/api/strategy/key-results', keyResultId, 'available-backlog'],
    queryFn: async () => {
      const response = await apiRequest(`/api/strategy/key-results/${keyResultId}/available-backlog`);
      return await response.json();
    },
    enabled: open
  });

  const createTasksMutation = useMutation({
    mutationFn: (backlogItemIds: number[]) =>
      Promise.all(
        backlogItemIds.map(backlogItemId =>
          apiRequest(`/api/strategy/key-results/${keyResultId}/tasks/from-backlog`, {
            method: 'POST',
            body: { backlogItemId }
          })
        )
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/key-results', keyResultId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/key-results', keyResultId, 'available-backlog'] });
      toast({
        title: 'Success',
        description: `${selectedItems.length} work item(s) assigned to key result`
      });
      setSelectedItems([]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create tasks from backlog',
        variant: 'destructive'
      });
    }
  });

  const handleItemToggle = (itemId: number) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleCreateTasks = () => {
    if (selectedItems.length === 0) {
      toast({
        title: 'No Items Selected',
        description: 'Please select at least one backlog item to create tasks',
        variant: 'destructive'
      });
      return;
    }
    createTasksMutation.mutate(selectedItems);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'feature': return '✨';
      case 'bug': return '🐛';
      case 'task': return '✅';
      case 'enhancement': return '🚀';
      case 'project': return '📋';
      case 'habit': return '🔄';
      default: return '📋';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Add Tasks from Backlog</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            For Key Result: {keyResultTitle}
          </p>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-100 rounded border"></div>
                </div>
              ))}
            </div>
          ) : Array.isArray(backlogItems) && backlogItems.length > 0 ? (
            <div className="space-y-2">
              {backlogItems.map((item: BacklogItem) => (
                <div
                  key={item.id}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    selectedItems.includes(item.id)
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => handleItemToggle(item.id)}
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleItemToggle(item.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm flex-shrink-0">{getTypeIcon(item.taskType || item.type)}</span>
                            <h4 className="text-sm font-medium truncate">{item.title}</h4>
                          </div>
                          
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {item.taskType || item.type || 'task'}
                          </Badge>
                          {item.storyPoints && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {item.storyPoints} pts
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {item.lifecycleStage || item.status || 'tagnut'}
                          </Badge>
                          {item.department && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {item.department}
                            </Badge>
                          )}
                          {item.assignedUser && (
                            <Badge variant="outline" className="text-xs px-1 py-0 max-w-[120px] truncate">
                              {item.assignedUser.fullName}
                            </Badge>
                          )}
                        </div>
                        
                        {selectedItems.includes(item.id) && (
                          <div className="flex items-center space-x-1 text-blue-600 flex-shrink-0">
                            <ArrowRight className="h-3 w-3" />
                            <span className="text-xs whitespace-nowrap">Will assign to key result</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-sm font-medium">No Available Tagnut Items</h3>
              <p className="text-xs text-muted-foreground">
                All tagnut items are either already linked or in progress.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {selectedItems.length > 0 
              ? `${selectedItems.length} item(s) selected`
              : 'Select backlog items to assign'
            }
          </div>
          
          <div className="flex space-x-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTasks}
              disabled={selectedItems.length === 0 || createTasksMutation.isPending}
              className="text-xs px-2"
            >
              {createTasksMutation.isPending ? 'Assigning...' : `Assign ${selectedItems.length || 0} Task(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}