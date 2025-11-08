import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Search, Filter, Plus, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SprintBacklogSectionProps {
  sprintId: string;
  availableItems: any[];
  onUpdate: () => void;
}

const typeColors = {
  feature: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  bug: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  improvement: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  research: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

const priorityColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function SprintBacklogSection({ sprintId, availableItems, onUpdate }: SprintBacklogSectionProps) {
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addItemsMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      return apiRequest(`/api/strategy/backlog/assign-to-sprint`, {
        method: 'POST',
        body: {
          itemIds,
          sprintId: parseInt(sprintId),
        },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Items added to sprint',
        description: `${selectedItems.length} item(s) have been added to the sprint.`,
      });
      onUpdate();
      setSelectedItems([]);
    },
    onError: () => {
      toast({
        title: 'Error adding items',
        description: 'Failed to add items to sprint.',
        variant: 'destructive',
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(filteredItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleAddSelected = () => {
    if (selectedItems.length > 0) {
      addItemsMutation.mutate(selectedItems);
    }
  };

  // Ensure availableItems is always an array
  const safeAvailableItems = Array.isArray(availableItems) ? availableItems : [];

  const filteredItems = safeAvailableItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;
    const matchesDepartment = departmentFilter === 'all' || item.department === departmentFilter;
    
    return matchesSearch && matchesType && matchesPriority && matchesDepartment;
  });

  const uniqueTypes = [...new Set(safeAvailableItems.map(item => item.type))];
  const uniquePriorities = [...new Set(safeAvailableItems.map(item => item.priority))];
  const uniqueDepartments = [...new Set(safeAvailableItems.map(item => item.department))];

  const getStoryPointsTotal = () => {
    return selectedItems.reduce((total, itemId) => {
      const item = safeAvailableItems.find(i => i.id === itemId);
      return total + (item?.storyPoints || 0);
    }, 0);
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            Backlog Items ({safeAvailableItems.length} available)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 pt-0 sm:pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {uniquePriorities.map(priority => (
                    <SelectItem key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueDepartments.map(department => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm">
                  Select all ({filteredItems.length})
                </label>
              </div>
              
              {selectedItems.length > 0 && (
                <Badge variant="secondary">
                  {selectedItems.length} selected • {getStoryPointsTotal()} story points
                </Badge>
              )}
            </div>
            
            <Button
              onClick={handleAddSelected}
              disabled={selectedItems.length === 0 || addItemsMutation.isPending}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add {selectedItems.length > 0 ? `${selectedItems.length} ` : ''}to Sprint
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backlog Items */}
      <div className="space-y-3">
        {filteredItems.map(item => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Checkbox
                  id={`item-${item.id}`}
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={(checked) => handleSelectItem(item.id, checked)}
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium">{item.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{item.storyPoints} SP</span>
                    </div>
                  </div>
                  
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs">
                    <Badge 
                      variant="outline" 
                      className={`${typeColors[item.type as keyof typeof typeColors]}`}
                    >
                      {item.type}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={`${priorityColors[item.priority as keyof typeof priorityColors]}`}
                    >
                      {item.priority}
                    </Badge>
                    <Badge variant="outline">
                      {item.department}
                    </Badge>
                    {item.tags?.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  {item.acceptanceCriteria && (
                    <div className="text-xs text-muted-foreground">
                      <strong>Acceptance Criteria:</strong> {item.acceptanceCriteria}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredItems.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {availableItems.length === 0 
                  ? 'No tagnut items available' 
                  : 'No items match your current filters'
                }
              </p>
              <p className="text-sm text-muted-foreground">
                {availableItems.length === 0 
                  ? 'Create tagnut items first to assign them to sprints'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}