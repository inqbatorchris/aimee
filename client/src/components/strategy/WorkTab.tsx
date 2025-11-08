import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Archive,
  ArrowRight,
  Calendar,
  Clock,
  Edit,
  Eye,
  Filter,
  MoreVertical,
  Package,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  User
} from 'lucide-react';

import { EditWorkItemDialog } from './EditWorkItemDialog';
import { TaskDetailPanel } from '../task-detail/TaskDetailPanel';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WorkItem {
  id: number;
  title: string;
  description: string;
  taskType: string;
  lifecycleStage: string;
  frequency: string;
  frequencyTarget: number;
  department?: string;
  estimatedHours?: number;
  labels?: string[];
  votes?: number;
  status: string;
  assignedTo?: number;
  sprintId?: number;
  keyResultId?: number;
  createdAt: string;
  updatedAt: string;
  kpiLabel?: string;
  kpiTargetValue?: number;
  kpiCurrentValue?: number;
  kpiUnit?: string;
  assignedUser?: {
    id: number;
    fullName: string;
  };
}

interface WorkItemStats {
  tagnut: number;
  ready: number;
  active: number;
  completed: number;
}

interface WorkTabProps {
  onViewKeyResult?: (keyResultId: number) => void;
}

export function WorkTab({ onViewKeyResult }: WorkTabProps) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [selectedLifecycleStage, setSelectedLifecycleStage] = useState('tagnut');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [assignedUserFilter, setAssignedUserFilter] = useState<string>('all');
  const [objectiveFilter, setObjectiveFilter] = useState<string>('all');

  const [editingItem, setEditingItem] = useState<WorkItem | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Task detail handlers
  const handleTaskClick = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsCreatingNew(false);
    setTaskDetailOpen(true);
  };

  const handleCreateClick = () => {
    setSelectedTaskId(null);
    setIsCreatingNew(true);
    setTaskDetailOpen(true);
  };

  const handleTaskDetailClose = () => {
    setTaskDetailOpen(false);
    setSelectedTaskId(null);
    setIsCreatingNew(false);
  };

  // Fetch users for assignment filter
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users/assignable'],
    queryFn: async () => {
      const response = await apiRequest('/api/users/assignable');
      return await response.json();
    },
  });

  // Fetch objectives for filtering
  const { data: objectives = [] } = useQuery({
    queryKey: ['/api/strategy/objectives'],
    queryFn: async () => {
      const response = await apiRequest('/api/strategy/objectives');
      return await response.json();
    },
  });

  // Fetch work items
  const { data: workItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/strategy/work', selectedLifecycleStage, departmentFilter, assignedUserFilter, objectiveFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('lifecycleStage', selectedLifecycleStage);
      if (departmentFilter && departmentFilter !== 'all') params.append('department', departmentFilter);
      if (assignedUserFilter && assignedUserFilter !== 'all') params.append('assignedTo', assignedUserFilter);
      if (objectiveFilter && objectiveFilter !== 'all') params.append('objectiveId', objectiveFilter);
      
      const response = await apiRequest(`/api/strategy/work?${params}`);
      return await response.json();
    }
  });

  // Fetch work item stats
  const { data: stats = { tagnut: 0, ready: 0, active: 0, completed: 0 } } = useQuery({
    queryKey: ['/api/strategy/work/stats'],
    queryFn: async () => {
      const response = await apiRequest('/api/strategy/work/stats');
      return await response.json();
    }
  });

  // Transition work item
  const transitionMutation = useMutation({
    mutationFn: async ({ id, newStage, options }: { 
      id: number; 
      newStage: string; 
      options?: { keyResultId?: number; sprintId?: number } 
    }) => {
      return apiRequest(`/api/strategy/work/${id}/transition`, {
        method: 'PATCH',
        body: { newStage, ...options }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work/stats'] });
      toast({
        title: 'Work item updated',
        description: 'The work item has been transitioned successfully.'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to transition work item.',
        variant: 'destructive'
      });
    }
  });

  // Delete work item
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/strategy/tasks/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work/stats'] });
      toast({
        title: 'Work item deleted',
        description: 'The work item has been deleted successfully.'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete work item.',
        variant: 'destructive'
      });
    }
  });

  const handleDeleteItem = (id: number) => {
    if (confirm('Are you sure you want to delete this work item?')) {
      deleteMutation.mutate(id);
    }
  };



  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'habit': return <Clock className="h-3 w-3" />;
      case 'project': return <Target className="h-3 w-3" />;
      default: return <Package className="h-3 w-3" />;
    }
  };

  const canManage = currentUser?.role && ['admin', 'manager'].includes(currentUser.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">Work Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage all work items through their lifecycle
          </p>
        </div>
        {canManage && (
          <Button onClick={() => handleCreateClick()} className="h-6 sm:h-7 px-2 sm:px-3 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Create Work Item</span>
            <span className="sm:hidden">Create</span>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-colors ${selectedLifecycleStage === 'tagnut' ? 'border-primary' : ''}`}
          onClick={() => setSelectedLifecycleStage('tagnut')}
        >
          <CardHeader className="p-2">
            <CardTitle className="text-xs">Tagnut</CardTitle>
            <CardDescription className="text-lg font-bold">{stats.tagnut}</CardDescription>
          </CardHeader>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors ${selectedLifecycleStage === 'ready' ? 'border-primary' : ''}`}
          onClick={() => setSelectedLifecycleStage('ready')}
        >
          <CardHeader className="p-2">
            <CardTitle className="text-xs">Ready</CardTitle>
            <CardDescription className="text-lg font-bold">{stats.ready}</CardDescription>
          </CardHeader>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors ${selectedLifecycleStage === 'active' ? 'border-primary' : ''}`}
          onClick={() => setSelectedLifecycleStage('active')}
        >
          <CardHeader className="p-2">
            <CardTitle className="text-xs">Active</CardTitle>
            <CardDescription className="text-lg font-bold">{stats.active}</CardDescription>
          </CardHeader>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors ${selectedLifecycleStage === 'completed' ? 'border-primary' : ''}`}
          onClick={() => setSelectedLifecycleStage('completed')}
        >
          <CardHeader className="p-2">
            <CardTitle className="text-xs">Completed</CardTitle>
            <CardDescription className="text-lg font-bold">{stats.completed}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select value={objectiveFilter} onValueChange={setObjectiveFilter}>
          <SelectTrigger className="w-[150px] h-7 text-xs">
            <SelectValue placeholder="All Objectives" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Objectives</SelectItem>
            {objectives.map((objective: any) => (
              <SelectItem key={objective.id} value={objective.id.toString()}>
                {objective.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[150px] h-7 text-xs">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="Engineering">Engineering</SelectItem>
            <SelectItem value="Marketing">Marketing</SelectItem>
            <SelectItem value="Sales">Sales</SelectItem>
            <SelectItem value="Support">Support</SelectItem>
            <SelectItem value="Operations">Operations</SelectItem>
          </SelectContent>
        </Select>

        <Select value={assignedUserFilter} onValueChange={setAssignedUserFilter}>
          <SelectTrigger className="w-[150px] h-7 text-xs">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {users.map((user: any) => (
              <SelectItem key={user.id} value={user.id.toString()}>
                {user.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Work Items Table */}
      <div className="border rounded-lg overflow-hidden">
        {/* Desktop Header */}
        <div className="hidden md:block bg-muted/50 border-b px-3 py-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-4">Task</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Assigned</div>
            <div className="col-span-2">Progress</div>
            <div className="col-span-1">Hours</div>
            <div className="col-span-1">Actions</div>
          </div>
        </div>
        
        <div className="divide-y">
          {itemsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading work items...</div>
          ) : workItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No work items in {selectedLifecycleStage} stage
            </div>
          ) : (
            workItems.map((item: WorkItem) => {
              const progressPercent = item.kpiTargetValue 
                ? Math.min(100, ((item.kpiCurrentValue || 0) / item.kpiTargetValue) * 100)
                : 0;
                
              return (
                <div key={item.id} className="px-3 py-2 hover:bg-muted/30 transition-colors">
                  {/* Desktop Layout */}
                  <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                    {/* Task Name and Description */}
                    <div className="col-span-4">
                      <div 
                        className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleTaskClick(item.id)}
                      >
                        {item.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.description || 'No description'}
                      </div>
                    </div>
                    
                    {/* Type */}
                    <div className="col-span-2">
                      <Badge variant="outline" className="text-xs gap-1">
                        {getTypeIcon(item.taskType)}
                        {item.taskType}
                      </Badge>
                    </div>
                    
                    {/* Assigned User */}
                    <div className="col-span-2 text-xs">
                      {item.assignedUser ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {item.assignedUser.fullName}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </div>
                    
                    {/* Progress */}
                    <div className="col-span-2">
                      {item.kpiLabel && item.kpiTargetValue ? (
                        <div className="space-y-1">
                          <div className="text-xs font-medium">
                            {Math.round(progressPercent)}%
                          </div>
                          <Progress value={progressPercent} className="h-1.5" />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                    
                    {/* Hours */}
                    <div className="col-span-1 text-xs">
                      {item.estimatedHours ? `${item.estimatedHours}h` : '-'}
                    </div>
                    
                    {/* Actions */}
                    <div className="col-span-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleTaskClick(item.id)}
                            className="flex items-center gap-2 text-xs"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </DropdownMenuItem>
                          
                          {canManage && (
                            <>
                              <DropdownMenuItem
                                onClick={() => setEditingItem(item)}
                                className="flex items-center gap-2 text-xs"
                              >
                                <Edit className="h-3 w-3" />
                                Edit
                              </DropdownMenuItem>
                              
                              {selectedLifecycleStage === 'tagnut' && (
                                <DropdownMenuItem
                                  onClick={() => transitionMutation.mutate({ 
                                    id: item.id, 
                                    newStage: 'ready' 
                                  })}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <ArrowRight className="h-3 w-3" />
                                  Move to Ready
                                </DropdownMenuItem>
                              )}
                              
                              {selectedLifecycleStage === 'ready' && (
                                <DropdownMenuItem
                                  onClick={() => transitionMutation.mutate({ 
                                    id: item.id, 
                                    newStage: 'active' 
                                  })}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <ArrowRight className="h-3 w-3" />
                                  Start Work
                                </DropdownMenuItem>
                              )}
                              
                              {selectedLifecycleStage === 'active' && (
                                <DropdownMenuItem
                                  onClick={() => transitionMutation.mutate({ 
                                    id: item.id, 
                                    newStage: 'completed' 
                                  })}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <ArrowRight className="h-3 w-3" />
                                  Complete
                                </DropdownMenuItem>
                              )}
                              
                              {selectedLifecycleStage === 'completed' && (
                                <DropdownMenuItem
                                  onClick={() => transitionMutation.mutate({ 
                                    id: item.id, 
                                    newStage: 'archived' 
                                  })}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <Archive className="h-3 w-3" />
                                  Archive
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuItem
                                onClick={() => handleDeleteItem(item.id)}
                                className="flex items-center gap-2 text-xs text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Mobile Layout */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div 
                          className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleTaskClick(item.id)}
                        >
                          {item.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.assignedUser ? item.assignedUser.fullName : 'Unassigned'} • {item.estimatedHours ? `${item.estimatedHours}h` : 'No estimate'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getTypeIcon(item.taskType)}
                          {item.taskType}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleTaskClick(item.id)}
                              className="flex items-center gap-2 text-xs"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </DropdownMenuItem>
                            
                            {canManage && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => setEditingItem(item)}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <Edit className="h-3 w-3" />
                                  Edit
                                </DropdownMenuItem>
                                
                                {selectedLifecycleStage === 'tagnut' && (
                                  <DropdownMenuItem
                                    onClick={() => transitionMutation.mutate({ 
                                      id: item.id, 
                                      newStage: 'ready' 
                                    })}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <ArrowRight className="h-3 w-3" />
                                    Move to Ready
                                  </DropdownMenuItem>
                                )}
                                
                                {selectedLifecycleStage === 'ready' && (
                                  <DropdownMenuItem
                                    onClick={() => transitionMutation.mutate({ 
                                      id: item.id, 
                                      newStage: 'active' 
                                    })}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <ArrowRight className="h-3 w-3" />
                                    Start Work
                                  </DropdownMenuItem>
                                )}
                                
                                {selectedLifecycleStage === 'active' && (
                                  <DropdownMenuItem
                                    onClick={() => transitionMutation.mutate({ 
                                      id: item.id, 
                                      newStage: 'completed' 
                                    })}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <ArrowRight className="h-3 w-3" />
                                    Complete
                                  </DropdownMenuItem>
                                )}
                                
                                {selectedLifecycleStage === 'completed' && (
                                  <DropdownMenuItem
                                    onClick={() => transitionMutation.mutate({ 
                                      id: item.id, 
                                      newStage: 'archived' 
                                    })}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <Archive className="h-3 w-3" />
                                    Archive
                                  </DropdownMenuItem>
                                )}
                                
                                <DropdownMenuItem
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="flex items-center gap-2 text-xs text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    {item.kpiLabel && item.kpiTargetValue && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">{item.kpiLabel}</span>
                          <span className="font-medium">{Math.round(progressPercent)}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-1.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Dialogs */}
      
      {editingItem && (
        <EditWorkItemDialog 
          workItem={editingItem}
          open={!!editingItem} 
          onOpenChange={(open) => !open && setEditingItem(null)}
        />
      )}

      {/* Task Detail Panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        open={taskDetailOpen}
        onClose={handleTaskDetailClose}
        isCreating={isCreatingNew}
        defaultLifecycleStage={selectedLifecycleStage}
        onViewKeyResult={onViewKeyResult}
      />
    </div>
  );
}