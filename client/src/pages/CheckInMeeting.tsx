import { useState, useEffect } from 'react';
import { Link, useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar,
  TrendingUp,
  CheckCircle,
  MessageSquare,
  Target,
  Save,
  X,
  AlertCircle,
  ChevronRight,
  Plus,
  Users,
  Bot,
  Clock,
  CheckSquare
} from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

interface TaskItem {
  id: number;
  title: string;
  assignee: string;
  assigneeType: 'user' | 'agent';
  source: 'habit' | 'keyresult' | 'manual' | 'backlog';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  dueDate: string;
}

interface ObjectiveData {
  id: number;
  title: string;
  owner: string;
  ownerAvatar: string;
  progress: number;
  cycleStage: string;
  checkInFrequency: string;
}

interface KeyResultData {
  id: number;
  title: string;
  current: number;
  target: number;
  unit: string;
}

interface KeyResultUpdate {
  id: number;
  title: string;
  currentValue: number;
  newValue: number;
  targetValue: number;
  unit: string;
  confidence: number;
  notes: string;
}

export default function CheckInMeeting() {
  const [, params] = useRoute('/strategy/checkin/:objectiveId/meeting');
  const [, setLocation] = useLocation();
  const objectiveId = params?.objectiveId ? parseInt(params.objectiveId) : null;
  
  const [meetingNotes, setMeetingNotes] = useState('');
  const [highlights, setHighlights] = useState('');
  const [blockers, setBlockers] = useState('');
  const [nextPriorities, setNextPriorities] = useState('');
  const [keyResultUpdates, setKeyResultUpdates] = useState<KeyResultUpdate[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTask, setNewTask] = useState({ title: '', assignee: '', assigneeType: 'user' as const });
  const [savedSections, setSavedSections] = useState<Record<string, boolean>>({});

  // Mock data - in real implementation would fetch from API
  const objective: ObjectiveData = {
    id: objectiveId || 1,
    title: 'Enhance Platform AI Capabilities',
    owner: 'Sarah Chen',
    ownerAvatar: 'SC',
    progress: 65,
    cycleStage: 'Active',
    checkInFrequency: 'Weekly'
  };

  const objectiveKeyResults: KeyResultData[] = [
    { id: 1, title: 'Integrate 3 new AI models', current: 2, target: 3, unit: 'models' },
    { id: 2, title: 'Achieve 95% automation accuracy', current: 87, target: 95, unit: '%' },
    { id: 3, title: 'Reduce processing time to <2s', current: 3.5, target: 2, unit: 'seconds' }
  ];

  useEffect(() => {
    // Initialize key result updates from objective data
    setKeyResultUpdates(objectiveKeyResults.map(kr => ({
      id: kr.id,
      title: kr.title,
      currentValue: kr.current,
      newValue: kr.current,
      targetValue: kr.target,
      unit: kr.unit,
      confidence: 70,
      notes: ''
    })));

    // Initialize mock tasks
    setTasks([
      {
        id: 1,
        title: 'Review model performance metrics',
        assignee: 'John Smith',
        assigneeType: 'user',
        source: 'habit',
        status: 'completed',
        dueDate: new Date().toISOString()
      },
      {
        id: 2,
        title: 'Train new language model',
        assignee: 'AI Agent #1',
        assigneeType: 'agent',
        source: 'keyresult',
        status: 'in-progress',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        title: 'Optimize API response times',
        assignee: 'Emma Wilson',
        assigneeType: 'user',
        source: 'manual',
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]);
  }, []);

  const handleKeyResultUpdate = (id: number, field: string, value: any) => {
    setKeyResultUpdates(prev => prev.map(kr => 
      kr.id === id ? { ...kr, [field]: value } : kr
    ));
  };

  const handleTaskStatusUpdate = (taskId: number, status: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: status as any } : task
    ));
  };

  const handleAddTask = () => {
    if (newTask.title && newTask.assignee) {
      setTasks(prev => [...prev, {
        id: Date.now(),
        title: newTask.title,
        assignee: newTask.assignee,
        assigneeType: newTask.assigneeType,
        source: 'manual',
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }]);
      setNewTask({ title: '', assignee: '', assigneeType: 'user' });
    }
  };

  const handleSaveCheckIn = () => {
    // Mock save - in real implementation would save to database
    queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
    setLocation('/strategy/checkin');
  };

  const handleSaveProgress = () => {
    setSavedSections({ ...savedSections, progress: true });
    console.log('Saving key result updates:', keyResultUpdates);
  };

  const handleSaveTasks = () => {
    setSavedSections({ ...savedSections, tasks: true });
    console.log('Saving task updates:', tasks);
  };

  const handleSaveNotes = () => {
    setSavedSections({ ...savedSections, notes: true });
    console.log('Saving notes:', { highlights, blockers, nextPriorities, meetingNotes });
  };

  if (!objectiveId) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No objective selected. Please start from the Check-in Dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Check-in Meeting</h1>
          <p className="text-sm text-gray-600 mt-1">
            {objective.checkInFrequency} check-in for {objective.title}
          </p>
        </div>
        <Link href="/strategy/checkin">
          <Button variant="outline" size="sm">
            <X className="h-4 w-4 mr-1" />
            Exit Meeting
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Overview Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-turquoise-100 text-turquoise-700">
                  {objective.ownerAvatar}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{objective.title}</h3>
                <p className="text-sm text-gray-600">Owner: {objective.owner}</p>
              </div>
              <Badge className="ml-auto">
                {objective.cycleStage} cycle
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-turquoise-600">{objective.progress}%</p>
                <p className="text-xs text-gray-600">Current Progress</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{objectiveKeyResults.length}</p>
                <p className="text-xs text-gray-600">Key Results</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{tasks.length}</p>
                <p className="text-xs text-gray-600">Tasks This Cycle</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            This is your {objective.checkInFrequency} check-in for the current cycle. 
            Review all sections below and update as needed.
          </AlertDescription>
        </Alert>

        {/* Progress Updates Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress Updates
              </span>
              {savedSections.progress && (
                <Badge variant="outline" className="text-green-600">Saved</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {keyResultUpdates.map((kr) => (
              <Card key={kr.id}>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>{kr.title}</Label>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600">{kr.currentValue}</span>
                          <ChevronRight className="h-3 w-3" />
                          <span className="font-medium text-turquoise-600">{kr.newValue}</span>
                          <span className="text-gray-600">/ {kr.targetValue} {kr.unit}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Slider
                          value={[kr.newValue]}
                          onValueChange={(value) => handleKeyResultUpdate(kr.id, 'newValue', value[0])}
                          max={kr.targetValue}
                          step={1}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={kr.newValue}
                          onChange={(e) => handleKeyResultUpdate(kr.id, 'newValue', parseFloat(e.target.value))}
                          className="w-20"
                        />
                        <span className="text-sm text-gray-600">{kr.unit}</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Confidence Level</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Slider
                          value={[kr.confidence]}
                          onValueChange={(value) => handleKeyResultUpdate(kr.id, 'confidence', value[0])}
                          max={100}
                          step={10}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium">{kr.confidence}%</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Add context about this update..."
                        value={kr.notes}
                        onChange={(e) => handleKeyResultUpdate(kr.id, 'notes', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Update Button */}
            <div className="flex justify-end">
              <Button onClick={handleSaveProgress} className="bg-turquoise-600 hover:bg-turquoise-700">
                <Save className="h-4 w-4 mr-2" />
                Update Progress
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Task Review Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Task Review
              </span>
              {savedSections.tasks && (
                <Badge variant="outline" className="text-green-600">Saved</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="current">
              <TabsList>
                <TabsTrigger value="current">Current Cycle Tasks</TabsTrigger>
                <TabsTrigger value="add">Add New Task</TabsTrigger>
              </TabsList>
              
              <TabsContent value="current" className="space-y-4">
                {tasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={task.status === 'completed'}
                              onCheckedChange={(checked) => 
                                handleTaskStatusUpdate(task.id, checked ? 'completed' : 'pending')
                              }
                            />
                            <p className={`text-sm font-medium ${
                              task.status === 'completed' ? 'line-through text-gray-500' : ''
                            }`}>
                              {task.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 mt-2 ml-6">
                            <div className="flex items-center gap-1">
                              {task.assigneeType === 'user' ? 
                                <Users className="h-3 w-3 text-gray-400" /> : 
                                <Bot className="h-3 w-3 text-gray-400" />
                              }
                              <span className="text-xs text-gray-600">{task.assignee}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {task.source}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-600">
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Select
                          value={task.status}
                          onValueChange={(value) => handleTaskStatusUpdate(task.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Save Tasks Button */}
                <div className="flex justify-end">
                  <Button onClick={handleSaveTasks} className="bg-turquoise-600 hover:bg-turquoise-700">
                    <Save className="h-4 w-4 mr-2" />
                    Save Task Updates
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="add" className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label>Task Title</Label>
                    <Input
                      placeholder="Enter task description..."
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Assign To</Label>
                      <Input
                        placeholder="Name or agent ID..."
                        value={newTask.assignee}
                        onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={newTask.assigneeType}
                        onValueChange={(value: 'user' | 'agent') => 
                          setNewTask({ ...newTask, assigneeType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="agent">AI Agent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button onClick={handleAddTask} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task to Current Cycle
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Notes & Insights Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Notes & Insights
              </span>
              {savedSections.notes && (
                <Badge variant="outline" className="text-green-600">Saved</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Highlights & Wins</Label>
              <Textarea
                placeholder="What went well this cycle?"
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                rows={3}
              />
            </div>
            
            <div>
              <Label>Blockers & Challenges</Label>
              <Textarea
                placeholder="What obstacles did you encounter?"
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                rows={3}
              />
            </div>
            
            <div>
              <Label>Next Cycle Priorities</Label>
              <Textarea
                placeholder="What should be the focus for next cycle?"
                value={nextPriorities}
                onChange={(e) => setNextPriorities(e.target.value)}
                rows={3}
              />
            </div>
            
            <div>
              <Label>Additional Meeting Notes</Label>
              <Textarea
                placeholder="Any other important notes or action items..."
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                rows={3}
              />
            </div>
            
            {/* Save Notes Button */}
            <div className="flex justify-end">
              <Button onClick={handleSaveNotes} className="bg-turquoise-600 hover:bg-turquoise-700">
                <Save className="h-4 w-4 mr-2" />
                Save Notes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Final Actions */}
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Review all sections above and save your updates. Once complete, click "Complete Check-in" to finalize.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between">
          <Link href="/strategy/checkin">
            <Button variant="outline">
              Cancel Check-in
            </Button>
          </Link>
          <Button 
            onClick={handleSaveCheckIn}
            className="bg-turquoise-600 hover:bg-turquoise-700"
            size="lg"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Complete Check-in
          </Button>
        </div>
      </div>
    </div>
  );
}