import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Link, useLocation } from 'wouter';
import { 
  Calendar,
  Clock,
  Play,
  Pause,
  CheckCircle,
  Target,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  Users,
  RefreshCw,
  Bot,
  User,
  ListTodo,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, differenceInDays, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { queryClient } from '@/lib/queryClient';

interface Cycle {
  id: number;
  name: string;
  stage: 'planning' | 'active' | 'review' | 'complete';
  startDate: string;
  endDate: string;
  objectives: number;
  tasksTotal: number;
  tasksCompleted: number;
  checkInsScheduled: number;
  checkInsCompleted: number;
  owners: string[];
}

interface CycleTask {
  id: number;
  title: string;
  source: 'habit' | 'manual' | 'keyresult' | 'backlog';
  assignee: string;
  assigneeType: 'user' | 'agent';
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  dueDate: string;
  objectiveId?: number;
  objectiveTitle?: string;
  habitId?: number;
  habitFrequency?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
}

export default function CycleDetailView() {
  const [, setLocation] = useLocation();
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
  const [expandedObjective, setExpandedObjective] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  
  // Generate mock cycles
  const cycles: Cycle[] = [
    {
      id: 1,
      name: 'Q1 Week 3 (Current)',
      stage: 'active',
      startDate: startOfWeek(new Date()).toISOString(),
      endDate: endOfWeek(new Date()).toISOString(),
      objectives: 4,
      tasksTotal: 12,
      tasksCompleted: 5,
      checkInsScheduled: 4,
      checkInsCompleted: 2,
      owners: ['Sarah Chen', 'Mike Johnson', 'Emily Davis']
    },
    {
      id: 2,
      name: 'Q1 Week 4',
      stage: 'planning',
      startDate: startOfWeek(addDays(new Date(), 7)).toISOString(),
      endDate: endOfWeek(addDays(new Date(), 7)).toISOString(),
      objectives: 4,
      tasksTotal: 0,
      tasksCompleted: 0,
      checkInsScheduled: 4,
      checkInsCompleted: 0,
      owners: ['Sarah Chen', 'Mike Johnson', 'Emily Davis']
    },
    {
      id: 3,
      name: 'Q1 Week 2',
      stage: 'review',
      startDate: startOfWeek(addDays(new Date(), -7)).toISOString(),
      endDate: endOfWeek(addDays(new Date(), -7)).toISOString(),
      objectives: 4,
      tasksTotal: 15,
      tasksCompleted: 13,
      checkInsScheduled: 4,
      checkInsCompleted: 4,
      owners: ['Sarah Chen', 'Mike Johnson', 'Emily Davis']
    },
    {
      id: 4,
      name: 'Q1 Week 1',
      stage: 'complete',
      startDate: startOfWeek(addDays(new Date(), -14)).toISOString(),
      endDate: endOfWeek(addDays(new Date(), -14)).toISOString(),
      objectives: 4,
      tasksTotal: 10,
      tasksCompleted: 10,
      checkInsScheduled: 4,
      checkInsCompleted: 4,
      owners: ['Sarah Chen', 'Mike Johnson']
    }
  ];

  // Generate mock tasks for the selected cycle
  const [cycleTasks, setCycleTasks] = useState<CycleTask[]>([]);
  
  useEffect(() => {
    if (selectedCycle) {
      setCycleTasks([
        {
          id: 1,
          title: 'Weekly metrics dashboard update',
          source: 'habit',
          assignee: 'Tom Wilson',
          assigneeType: 'user',
          status: 'completed',
          dueDate: addDays(new Date(selectedCycle.startDate), 1).toISOString(),
          objectiveId: 1,
          objectiveTitle: 'Improve Customer Satisfaction',
          habitId: 1,
          habitFrequency: 'weekly'
        },
        {
          id: 2,
          title: 'Analyze customer feedback survey results',
          source: 'keyresult',
          assignee: 'Data Analysis Agent',
          assigneeType: 'agent',
          status: 'in-progress',
          dueDate: addDays(new Date(selectedCycle.startDate), 3).toISOString(),
          objectiveId: 1,
          objectiveTitle: 'Improve Customer Satisfaction'
        },
        {
          id: 3,
          title: 'Update team on sprint progress',
          source: 'manual',
          assignee: 'Sarah Chen',
          assigneeType: 'user',
          status: 'pending',
          dueDate: addDays(new Date(selectedCycle.startDate), 4).toISOString(),
          objectiveId: 2,
          objectiveTitle: 'Increase Development Velocity'
        },
        {
          id: 4,
          title: 'Review and prioritize product backlog',
          source: 'backlog',
          assignee: 'Mike Johnson',
          assigneeType: 'user',
          status: 'pending',
          dueDate: addDays(new Date(selectedCycle.startDate), 2).toISOString(),
          objectiveId: 2,
          objectiveTitle: 'Increase Development Velocity'
        },
        {
          id: 5,
          title: 'Conduct team retrospective meeting',
          source: 'habit',
          assignee: 'Emily Davis',
          assigneeType: 'user',
          status: 'completed',
          dueDate: addDays(new Date(selectedCycle.startDate), 5).toISOString(),
          objectiveId: 3,
          objectiveTitle: 'Enhance Team Collaboration',
          habitId: 2,
          habitFrequency: 'bi-weekly'
        },
        {
          id: 6,
          title: 'Generate monthly performance report',
          source: 'habit',
          assignee: 'Reporting Agent',
          assigneeType: 'agent',
          status: 'pending',
          dueDate: endOfWeek(new Date()).toISOString(),
          objectiveId: 1,
          objectiveTitle: 'Improve Customer Satisfaction',
          habitId: 3,
          habitFrequency: 'monthly'
        }
      ]);
    }
  }, [selectedCycle]);

  // Automatically select the active cycle on mount
  useEffect(() => {
    const activeCycle = cycles.find(c => c.stage === 'active');
    if (activeCycle) {
      setSelectedCycle(activeCycle);
    }
  }, []);

  const handleTransitionCycle = (cycleId: number, newStage: string) => {
    // Mock transition - in real implementation would update database
    setSelectedCycle(prev => prev ? { ...prev, stage: newStage as any } : null);
    queryClient.invalidateQueries({ queryKey: ['/api/strategy/cycles'] });
  };

  const handleTaskStatusUpdate = (taskId: number, newStatus: string) => {
    setCycleTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: newStatus as any } : task
    ));
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'planning': return 'bg-blue-100 text-blue-700';
      case 'active': return 'bg-green-100 text-green-700';
      case 'review': return 'bg-yellow-100 text-yellow-700';
      case 'complete': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'habit': return <RefreshCw className="h-3 w-3" />;
      case 'keyresult': return <Target className="h-3 w-3" />;
      case 'backlog': return <ListTodo className="h-3 w-3" />;
      default: return <User className="h-3 w-3" />;
    }
  };

  const filteredTasks = cycleTasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterSource !== 'all' && task.source !== filterSource) return false;
    return true;
  });

  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const key = task.objectiveTitle || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, CycleTask[]>);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cycle Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage cycle stages, tasks, and check-ins</p>
        </div>
        <div className="flex gap-2">
          <Link href="/strategy">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Strategy
            </Button>
          </Link>
        </div>
      </div>

      {/* Cycle Timeline */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Cycle Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cycles.map((cycle) => (
              <div
                key={cycle.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedCycle?.id === cycle.id ? 'border-turquoise-500 bg-turquoise-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedCycle(cycle)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={getStageColor(cycle.stage)}>
                      {cycle.stage}
                    </Badge>
                    <div>
                      {/* TODO: cycle.name removed in migration 006 - using dates as identifier */}
                      <p className="font-medium text-sm">Cycle {format(new Date(cycle.startDate), 'MMM dd')} - {format(new Date(cycle.endDate), 'MMM dd')}</p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(cycle.startDate), 'MMM dd')} - {format(new Date(cycle.endDate), 'MMM dd')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium">{cycle.objectives}</p>
                      <p className="text-xs text-gray-600">Objectives</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        {cycle.tasksCompleted}/{cycle.tasksTotal}
                      </p>
                      <p className="text-xs text-gray-600">Tasks</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        {cycle.checkInsCompleted}/{cycle.checkInsScheduled}
                      </p>
                      <p className="text-xs text-gray-600">Check-ins</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Cycle Details */}
      {selectedCycle && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cycle Overview */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{selectedCycle.name}</CardTitle>
                  <div className="flex gap-2">
                    {selectedCycle.stage === 'planning' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleTransitionCycle(selectedCycle.id, 'active')}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start Cycle
                      </Button>
                    )}
                    {selectedCycle.stage === 'active' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleTransitionCycle(selectedCycle.id, 'review')}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Begin Review
                      </Button>
                    )}
                    {selectedCycle.stage === 'review' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleTransitionCycle(selectedCycle.id, 'complete')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete Cycle
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="tasks">
                  <TabsList>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="habits">Habits</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="tasks" className="space-y-4">
                    {/* Task Filters */}
                    <div className="flex gap-2">
                      <select
                        className="text-sm border rounded-md px-3 py-1"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="blocked">Blocked</option>
                      </select>
                      <select
                        className="text-sm border rounded-md px-3 py-1"
                        value={filterSource}
                        onChange={(e) => setFilterSource(e.target.value)}
                      >
                        <option value="all">All Sources</option>
                        <option value="habit">Habits</option>
                        <option value="keyresult">Key Results</option>
                        <option value="manual">Manual</option>
                        <option value="backlog">Backlog</option>
                      </select>
                    </div>

                    {/* Grouped Tasks */}
                    {Object.entries(groupedTasks).map(([objective, tasks]) => (
                      <div key={objective} className="border rounded-lg">
                        <div
                          className="p-3 bg-gray-50 flex items-center justify-between cursor-pointer"
                          onClick={() => setExpandedObjective(
                            expandedObjective === tasks[0].objectiveId ? null : tasks[0].objectiveId || null
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-sm">{objective}</span>
                            <Badge variant="outline" className="text-xs">
                              {tasks.length} tasks
                            </Badge>
                          </div>
                          {expandedObjective === tasks[0].objectiveId ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          }
                        </div>
                        
                        {expandedObjective === tasks[0].objectiveId && (
                          <div className="p-3 space-y-2">
                            {tasks.map((task) => (
                              <div key={task.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={task.status === 'completed'}
                                    onCheckedChange={(checked) => 
                                      handleTaskStatusUpdate(task.id, checked ? 'completed' : 'pending')
                                    }
                                  />
                                  <span className={`text-sm ${
                                    task.status === 'completed' ? 'line-through text-gray-500' : ''
                                  }`}>
                                    {task.title}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {getSourceIcon(task.source)}
                                    {task.source}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1">
                                    {task.assigneeType === 'user' ? 
                                      <User className="h-3 w-3 text-gray-400" /> : 
                                      <Bot className="h-3 w-3 text-gray-400" />
                                    }
                                    <span className="text-xs text-gray-600">{task.assignee}</span>
                                  </div>
                                  <Badge variant={
                                    task.status === 'completed' ? 'default' :
                                    task.status === 'in-progress' ? 'secondary' :
                                    task.status === 'blocked' ? 'destructive' :
                                    'outline'
                                  } className="text-xs">
                                    {task.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="habits" className="space-y-4">
                    <Alert>
                      <RefreshCw className="h-4 w-4" />
                      <AlertDescription>
                        Habits automatically generate tasks into cycles based on their frequency.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">Weekly metrics update</span>
                          </div>
                          <Badge variant="outline">Every Monday</Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Assigned to: Tom Wilson • Next: {format(addDays(new Date(), 7), 'MMM dd')}
                        </p>
                      </div>
                      
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">Team retrospective</span>
                          </div>
                          <Badge variant="outline">Bi-weekly</Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Assigned to: Emily Davis • Next: {format(addDays(new Date(), 14), 'MMM dd')}
                        </p>
                      </div>
                      
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">Performance report</span>
                          </div>
                          <Badge variant="outline">Monthly</Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Assigned to: Reporting Agent • Next: {format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), 'MMM dd')}
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="timeline" className="space-y-4">
                    <div className="space-y-3">
                      {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
                        const date = addDays(new Date(selectedCycle.startDate), dayOffset);
                        const dayTasks = cycleTasks.filter(task => 
                          format(new Date(task.dueDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        );
                        
                        return (
                          <div key={dayOffset} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-sm">
                                  {format(date, 'EEEE, MMM dd')}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {dayTasks.length} tasks
                              </Badge>
                            </div>
                            {dayTasks.length > 0 && (
                              <div className="space-y-1 ml-6">
                                {dayTasks.map((task) => (
                                  <div key={task.id} className="flex items-center gap-2 text-xs">
                                    <span className={`${
                                      task.status === 'completed' ? 'text-green-600' : 'text-gray-600'
                                    }`}>
                                      • {task.title}
                                    </span>
                                    <span className="text-gray-400">({task.assignee})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Cycle Stats */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cycle Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Task Completion</span>
                    <span className="font-medium">
                      {Math.round((selectedCycle.tasksCompleted / selectedCycle.tasksTotal) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={(selectedCycle.tasksCompleted / selectedCycle.tasksTotal) * 100}
                    className="h-2"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Check-ins Done</span>
                    <span className="font-medium">
                      {selectedCycle.checkInsCompleted}/{selectedCycle.checkInsScheduled}
                    </span>
                  </div>
                  <Progress 
                    value={(selectedCycle.checkInsCompleted / selectedCycle.checkInsScheduled) * 100}
                    className="h-2"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Time Progress</span>
                    <span className="font-medium">
                      {Math.min(100, Math.round(
                        (differenceInDays(new Date(), new Date(selectedCycle.startDate)) / 
                         differenceInDays(new Date(selectedCycle.endDate), new Date(selectedCycle.startDate))) * 100
                      ))}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, 
                      (differenceInDays(new Date(), new Date(selectedCycle.startDate)) / 
                       differenceInDays(new Date(selectedCycle.endDate), new Date(selectedCycle.startDate))) * 100
                    )}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cycle Owners</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedCycle.owners.map((owner) => (
                    <div key={owner} className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-turquoise-100 text-turquoise-700">
                          {owner.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{owner}</p>
                        <p className="text-xs text-gray-600">2 objectives</p>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Activity className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setLocation('/strategy/checkin')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Start Check-in
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <ListTodo className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Configure Habits
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}