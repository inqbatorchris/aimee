import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Plus, ChevronRight, CheckCircle, Circle, Clock, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function StrategyManagement() {
  const queryClient = useQueryClient();
  const [selectedObjective, setSelectedObjective] = useState<any>(null);
  const [showCreateObjective, setShowCreateObjective] = useState(false);
  const [showCreateKeyResult, setShowCreateKeyResult] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedKeyResult, setSelectedKeyResult] = useState<any>(null);

  // Fetch objectives
  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ['/api/strategy/objectives'],
    queryFn: async () => {
      const response = await fetch('/api/strategy/objectives', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch objectives');
      return response.json();
    },
  });

  // Fetch key results for selected objective
  const { data: keyResults = [] } = useQuery({
    queryKey: ['/api/strategy/objectives', selectedObjective?.id, 'key-results'],
    queryFn: async () => {
      if (!selectedObjective?.id) return [];
      const response = await fetch(`/api/strategy/objectives/${selectedObjective.id}/key-results`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch key results');
      return response.json();
    },
    enabled: !!selectedObjective?.id,
  });

  // Fetch tasks for selected key result
  const { data: tasks = [] } = useQuery({
    queryKey: ['/api/strategy/key-results', selectedKeyResult?.id, 'tasks'],
    queryFn: async () => {
      if (!selectedKeyResult?.id) return [];
      const response = await fetch(`/api/strategy/key-results/${selectedKeyResult.id}/tasks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    enabled: !!selectedKeyResult?.id,
  });

  // Create objective mutation
  const createObjectiveMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/strategy/objectives', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      setShowCreateObjective(false);
    },
  });

  // Create key result mutation
  const createKeyResultMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/strategy/key-results', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives', selectedObjective?.id, 'key-results'] });
      setShowCreateKeyResult(false);
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/strategy/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/key-results', selectedKeyResult?.id, 'tasks'] });
      setShowCreateTask(false);
    },
  });

  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest(`/api/strategy/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/key-results', selectedKeyResult?.id, 'tasks'] });
    },
  });

  // Update key result progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({ id, currentValue, notes }: { id: number; currentValue: string; notes?: string }) => {
      return apiRequest(`/api/strategy/key-results/${id}/progress`, {
        method: 'POST',
        body: JSON.stringify({ currentValue, notes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives', selectedObjective?.id, 'key-results'] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
      case 'completed':
        return 'bg-green-500';
      case 'at_risk':
      case 'in_progress':
        return 'bg-yellow-500';
      case 'behind':
      case 'not_started':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getProgressPercentage = (current: string, target: string) => {
    const currentNum = parseFloat(current) || 0;
    const targetNum = parseFloat(target) || 1;
    return Math.min(100, Math.round((currentNum / targetNum) * 100));
  };

  useEffect(() => {
    // Auto-select first objective if available
    if (objectives.length > 0 && !selectedObjective) {
      setSelectedObjective(objectives[0]);
    }
  }, [objectives, selectedObjective]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading strategy data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Strategy Management</h1>
        <p className="text-muted-foreground">Track implementation progress with OKRs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Objectives List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Objectives</CardTitle>
              <Dialog open={showCreateObjective} onOpenChange={setShowCreateObjective}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Objective</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      createObjectiveMutation.mutate({
                        title: formData.get('title'),
                        description: formData.get('description'),
                        status: formData.get('status'),
                        startDate: formData.get('startDate'),
                        endDate: formData.get('endDate'),
                      });
                    }}
                    className="space-y-4 mt-4"
                  >
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" name="title" required />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue="not_started">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="on_track">On Track</SelectItem>
                          <SelectItem value="at_risk">At Risk</SelectItem>
                          <SelectItem value="behind">Behind</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input id="startDate" name="startDate" type="date" />
                      </div>
                      <div>
                        <Label htmlFor="endDate">End Date</Label>
                        <Input id="endDate" name="endDate" type="date" />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">Create Objective</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-2">
              {objectives.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No objectives yet. Create your first objective to start tracking progress.
                </p>
              ) : (
                objectives.map((objective: any) => (
                  <button
                    key={objective.id}
                    onClick={() => setSelectedObjective(objective)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedObjective?.id === objective.id
                        ? 'bg-primary/10 border border-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{objective.title}</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(objective.status)}>
                        {objective.status?.replace('_', ' ')}
                      </Badge>
                      {objective.endDate && (
                        <span className="text-xs text-muted-foreground">
                          Due {new Date(objective.endDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Key Results and Tasks */}
        <div className="lg:col-span-2">
          {selectedObjective ? (
            <Tabs defaultValue="key-results">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="key-results">Key Results</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
              </TabsList>

              <TabsContent value="key-results" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{selectedObjective.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedObjective.description}
                      </p>
                    </div>
                    <Dialog open={showCreateKeyResult} onOpenChange={setShowCreateKeyResult}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Key Result
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Key Result</DialogTitle>
                        </DialogHeader>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            createKeyResultMutation.mutate({
                              objectiveId: selectedObjective.id,
                              title: formData.get('title'),
                              description: formData.get('description'),
                              targetValue: formData.get('targetValue'),
                              currentValue: formData.get('currentValue') || '0',
                              unit: formData.get('unit'),
                              status: formData.get('status'),
                            });
                          }}
                          className="space-y-4 mt-4"
                        >
                          <div>
                            <Label htmlFor="kr-title">Title</Label>
                            <Input id="kr-title" name="title" required />
                          </div>
                          <div>
                            <Label htmlFor="kr-description">Description</Label>
                            <Textarea id="kr-description" name="description" />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="targetValue">Target</Label>
                              <Input id="targetValue" name="targetValue" required />
                            </div>
                            <div>
                              <Label htmlFor="currentValue">Current</Label>
                              <Input id="currentValue" name="currentValue" defaultValue="0" />
                            </div>
                            <div>
                              <Label htmlFor="unit">Unit</Label>
                              <Input id="unit" name="unit" placeholder="%" />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="kr-status">Status</Label>
                            <Select name="status" defaultValue="not_started">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_started">Not Started</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="on_track">On Track</SelectItem>
                                <SelectItem value="at_risk">At Risk</SelectItem>
                                <SelectItem value="behind">Behind</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button type="submit" className="w-full">Create Key Result</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {keyResults.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No key results yet. Add key results to measure objective progress.
                      </p>
                    ) : (
                      keyResults.map((kr: any) => (
                        <div
                          key={kr.id}
                          className="p-4 border rounded-lg space-y-3 cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedKeyResult(kr)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-primary" />
                              <span className="font-medium">{kr.title}</span>
                            </div>
                            <Badge variant="outline" className={getStatusColor(kr.status)}>
                              {kr.status?.replace('_', ' ')}
                            </Badge>
                          </div>
                          {kr.description && (
                            <p className="text-sm text-muted-foreground">{kr.description}</p>
                          )}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{kr.currentValue} / {kr.targetValue} {kr.unit}</span>
                              <span>{getProgressPercentage(kr.currentValue, kr.targetValue)}%</span>
                            </div>
                            <Progress 
                              value={getProgressPercentage(kr.currentValue, kr.targetValue)} 
                              className="h-2"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Update progress"
                              onClick={(e) => e.stopPropagation()}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.stopPropagation();
                                  const input = e.currentTarget;
                                  updateProgressMutation.mutate({
                                    id: kr.id,
                                    currentValue: input.value,
                                  });
                                  input.value = '';
                                }
                              }}
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                if (input?.value) {
                                  updateProgressMutation.mutate({
                                    id: kr.id,
                                    currentValue: input.value,
                                  });
                                  input.value = '';
                                }
                              }}
                            >
                              Update
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Tasks</CardTitle>
                      {selectedKeyResult && (
                        <p className="text-sm text-muted-foreground mt-1">
                          For: {selectedKeyResult.title}
                        </p>
                      )}
                    </div>
                    {selectedKeyResult && (
                      <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Task
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create Task</DialogTitle>
                          </DialogHeader>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              createTaskMutation.mutate({
                                keyResultId: selectedKeyResult.id,
                                title: formData.get('title'),
                                description: formData.get('description'),
                                status: formData.get('status'),
                                priority: formData.get('priority'),
                                dueDate: formData.get('dueDate'),
                              });
                            }}
                            className="space-y-4 mt-4"
                          >
                            <div>
                              <Label htmlFor="task-title">Title</Label>
                              <Input id="task-title" name="title" required />
                            </div>
                            <div>
                              <Label htmlFor="task-description">Description</Label>
                              <Textarea id="task-description" name="description" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="task-status">Status</Label>
                                <Select name="status" defaultValue="not_started">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not_started">Not Started</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="blocked">Blocked</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="priority">Priority</Label>
                                <Select name="priority" defaultValue="medium">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="dueDate">Due Date</Label>
                              <Input id="dueDate" name="dueDate" type="date" />
                            </div>
                            <Button type="submit" className="w-full">Create Task</Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!selectedKeyResult ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Select a key result to view its tasks
                      </p>
                    ) : tasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No tasks yet. Add tasks to track detailed work items.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {tasks.map((task: any) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <button
                              onClick={() => {
                                const newStatus = task.status === 'completed' ? 'not_started' : 'completed';
                                updateTaskMutation.mutate({ id: task.id, status: newStatus });
                              }}
                              className="flex-shrink-0"
                            >
                              {task.status === 'completed' ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={task.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                                  {task.title}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {task.priority}
                                </Badge>
                              </div>
                              {task.description && (
                                <p className="text-sm text-muted-foreground">{task.description}</p>
                              )}
                              {task.dueDate && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Clock className="h-3 w-3" />
                                  <span className="text-xs text-muted-foreground">
                                    Due {new Date(task.dueDate).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <Badge variant="outline" className={getStatusColor(task.status)}>
                              {task.status?.replace('_', ' ')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Select an objective to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}