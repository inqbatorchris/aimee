import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Plus,
  Filter,
  Search,
  Users,
  Target,
  TrendingUp,
  AlertCircle,
  PlayCircle,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { TaskDetailPanel } from '@/components/task-detail/TaskDetailPanel';
import { SlidePanelContainer } from '@/components/ui/slide-panel';
import ObjectiveDetailPanel from '@/components/objective-detail/ObjectiveDetailPanel';

interface Task {
  id: number;
  keyResultId?: number;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  targetCompletion?: string;
  assignedTo?: number;
  assigneeName?: string;
  estimatedHours?: number;
  actualHours?: number;
  keyResultTitle?: string;
  objectiveTitle?: string;
  objectiveId?: number;
}

interface Objective {
  id: number;
  title: string;
}

interface KeyResult {
  id: number;
  objectiveId: number;
  title: string;
}

interface CheckInCycle {
  id: number;
  name?: string;
  startDate: string;
  endDate: string;
  status: string;
}

export default function Tasks() {
  const { toast } = useToast();
  const [location] = useLocation();
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [objectiveFilter, setObjectiveFilter] = useState<string>('all');
  const [keyResultFilter, setKeyResultFilter] = useState<string>('all');
  
  // Panel state
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Parse URL parameters for initial filters
  React.useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const keyResult = urlParams.get('keyResult');
    const objective = urlParams.get('objective');
    
    if (keyResult) {
      setKeyResultFilter(keyResult);
    }
    if (objective) {
      setObjectiveFilter(objective);
    }
  }, [location]);

  // Temporary cycle for testing
  const tempCycle: CheckInCycle = {
    id: 1,
    name: "Q1 2025 Sprint",
    startDate: "2025-01-01",
    endDate: "2025-03-31",
    status: "active"
  };

  // Fetch objectives for filtering
  const { data: objectives = [] } = useQuery<Objective[]>({
    queryKey: ['/api/strategy/objectives-bypass'],
    queryFn: async () => {
      const response = await fetch('/api/strategy/objectives-bypass', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch objectives');
      return response.json();
    }
  });

  // Fetch key results for filtering
  const { data: keyResults = [] } = useQuery<KeyResult[]>({
    queryKey: ['/api/strategy/key-results-all'],
    queryFn: async () => {
      const response = await fetch('/api/strategy/key-results-bypass', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch key results');
      return response.json();
    }
  });

  // Fetch all tasks
  const { data: allTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/strategy/tasks-all'],
    queryFn: async () => {
      const response = await fetch('/api/strategy/tasks-bypass', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    }
  });

  // Filter tasks based on filters
  const filteredTasks = allTasks.filter((task) => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    // Use the objectiveId directly from the task if available
    const matchesObjective = objectiveFilter === 'all' || 
      (task.objectiveId && task.objectiveId === parseInt(objectiveFilter));
    
    const matchesKeyResult = keyResultFilter === 'all' || 
      (task.keyResultId && task.keyResultId === parseInt(keyResultFilter));

    return matchesStatus && matchesPriority && matchesObjective && matchesKeyResult;
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'todo':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-600" />;
      case 'todo':
        return <Circle className="h-4 w-4 text-gray-400" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setObjectiveFilter('all');
    setKeyResultFilter('all');
  };

  const handleViewTask = (taskId: number) => {
    setSelectedTaskId(taskId);
    setTaskPanelOpen(true);
  };

  return (
    <SlidePanelContainer panelOpen={taskPanelOpen} panelWidth="600px">
      <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white border-b">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Key Result Tasks
</h1>
              <p className="text-sm text-gray-600 mt-1">View and manage work tasks</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New Task</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>

          {/* Cycle Info Bar */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Current Cycle: {tempCycle.name || `Cycle ${tempCycle.id}`}
                </span>
                <Badge variant="outline" className="text-xs">
                  {new Date(tempCycle.startDate).toLocaleDateString()} - {new Date(tempCycle.endDate).toLocaleDateString()}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                Manage Cycles
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={objectiveFilter} onValueChange={setObjectiveFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Objective" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Objectives</SelectItem>
                {objectives.map((obj) => (
                  <SelectItem key={obj.id} value={obj.id.toString()}>
                    {obj.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Clear
            </Button>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              Showing {filteredTasks.length} of {allTasks.length} tasks
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">
                {filteredTasks.filter(t => t.status === 'completed').length} completed
              </Badge>
              <Badge variant="outline">
                {filteredTasks.filter(t => t.status === 'in_progress').length} in progress
              </Badge>
              <Badge variant="outline">
                {filteredTasks.filter(t => t.status === 'todo').length} to do
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto">
        {tasksLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading tasks...</div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card className="m-6 p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Found</h3>
            <p className="text-sm text-gray-600 mb-4">
              {allTasks.length === 0 ? 
                "No tasks have been created yet" : 
                "No tasks match your current filters"}
            </p>
            <Button onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </Card>
        ) : (
          <div className="m-6">
            <div className="bg-white rounded-lg shadow">
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Key Result
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTasks.map((task) => {
                    const keyResult = keyResults.find(kr => kr.id === task.keyResultId);
                    const objective = objectives.find(obj => obj.id === keyResult?.objectiveId);

                    return (
                      <tr key={task.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewTask(task.id)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(task.status)}
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{task.title}</div>
                              {task.description && (
                                <div className="text-sm text-gray-500 mt-1">{task.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {keyResult ? (
                            <div className="text-sm">
                              <div className="flex items-center text-gray-900">
                                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                                {keyResult.title}
                              </div>
                              {objective && (
                                <div className="flex items-center text-gray-500 mt-1">
                                  <Target className="h-3 w-3 mr-1 text-blue-600" />
                                  {objective.title}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusColor(task.status)}>
                            {task.status || 'todo'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getPriorityColor(task.priority || 'medium')}>
                            {task.priority || 'medium'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2 text-gray-400" />
                            {task.assigneeName || 'Unassigned'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {task.dueDate ? (
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}
      </div>

        {/* Task Detail Panel */}
        {selectedTaskId && (
          <TaskDetailPanel
            taskId={selectedTaskId}
            open={taskPanelOpen}
            onClose={() => setTaskPanelOpen(false)}
          />
        )}
      </div>
    </SlidePanelContainer>
  );
}