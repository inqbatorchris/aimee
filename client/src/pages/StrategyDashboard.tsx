import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// Removed Sheet import - using side panel approach instead
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Target, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Plus,
  ChevronRight,
  ChevronDown,
  Calendar,
  Users,
  BarChart3,
  Shield,
  FileText,
  Activity,
  Briefcase,
  Link,
  Eye,
  ListTodo,
  CheckSquare,
  Repeat,
  Bot,
  Hash,
  Building2,

} from "lucide-react";

export default function StrategyDashboard() {
  const [location, setLocation] = useLocation();
  const [selectedStrategy, setSelectedStrategy] = useState("current");
  const [expandedObjectives, setExpandedObjectives] = useState<Set<number>>(new Set());
  const [expandedKeyResults, setExpandedKeyResults] = useState<Set<string>>(new Set());
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemType, setSelectedItemType] = useState<'objective' | 'keyResult' | 'work' | null>(null);

  const [detailPanelTab, setDetailPanelTab] = useState('overview');
  const [checkInSubTab, setCheckInSubTab] = useState('schedule');
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('all');
  const [showCreateHabitModal, setShowCreateHabitModal] = useState(false);
  const [selectedKeyResultForHabit, setSelectedKeyResultForHabit] = useState<any>(null);

  // Form state for habit creation
  const [habitForm, setHabitForm] = useState({
    title: '',
    description: '',
    frequency: '',
    assignedTo: '',
  });

  const { toast } = useToast();

  // Create habit mutation
  const createHabitMutation = useMutation({
    mutationFn: async (habitData: any) => {
      return apiRequest('/api/strategy/tasks', {
        method: 'POST',
        body: habitData,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Habit created successfully",
      });
      setShowCreateHabitModal(false);
      setSelectedKeyResultForHabit(null);
      setHabitForm({ title: '', description: '', frequency: '', assignedTo: '' });
      // Refresh the work items
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create habit",
        variant: "destructive",
      });
    },
  });

  // Handle habit creation
  const handleCreateHabit = () => {
    if (!habitForm.title || !habitForm.frequency) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const habitData = {
      keyResultId: selectedKeyResultForHabit?.id,
      title: habitForm.title,
      description: habitForm.description,
      taskType: 'habit',
      frequency: habitForm.frequency,
      assignedTo: habitForm.assignedTo ? parseInt(habitForm.assignedTo) : null,
      status: 'todo',
    };

    createHabitMutation.mutate(habitData);
  };

  // Mock data for UI demonstration
  const strategyOverview = {
    name: "Growth Strategy 2025",
    status: "active",
    timeframe: "Jan 2025 - Dec 2025",
    progress: 68,
    health: "on-track",
    objectivesCount: 4,
    keyResultsCount: 12,
    initiativesCount: 8
  };

  const objectives = [
    {
      id: 1,
      title: "Increase Digital Revenue",
      progress: 75,
      status: "on-track",
      owner: "Sarah Chen",
      keyResultsCount: 3,
      confidence: 0.85,
      dueDate: "Q2 2025",
      keyResults: [
        {
          id: "kr1-1",
          title: "Achieve $10M in online sales",
          progress: 80,
          status: "on-track",
          owner: "Sarah Chen",
          metric: "$8M / $10M",
          tasks: [
            { id: "t1-1-1", title: "Launch new e-commerce platform", status: "completed", assignee: "Dev Team", type: "task" },
            { id: "t1-1-2", title: "Implement payment gateway", status: "in-progress", assignee: "Tech Lead", type: "task" },
            { id: "t1-1-3", title: "Create marketing campaign", status: "pending", assignee: "Marketing", type: "task" },
            { 
              id: "h1-1-1", 
              title: "Weekly Sales Review", 
              status: "in-progress", 
              assignee: "Sales Team", 
              type: "habit",
              frequency: "Weekly",
              department: "Sales",
              tags: ["revenue", "tracking"],
              kbDocs: ["Sales Process Guide"],
              lastUpdated: "2 days ago"
            },
            { 
              id: "a1-1-1", 
              title: "Auto-generate Sales Report", 
              status: "active", 
              assignee: "AI Agent", 
              type: "agent",
              trigger: "Every Monday 9am",
              action: "Generate and email sales report",
              department: "Sales",
              tags: ["automation", "reporting"],
              lastRun: "Yesterday"
            }
          ]
        },
        {
          id: "kr1-2",
          title: "Increase conversion rate to 5%",
          progress: 60,
          status: "at-risk",
          owner: "Marketing Team",
          metric: "3% / 5%",
          tasks: [
            { id: "t1-2-1", title: "A/B test landing pages", status: "in-progress", assignee: "UX Team", type: "task" },
            { id: "t1-2-2", title: "Optimize checkout flow", status: "pending", assignee: "Dev Team", type: "task" }
          ]
        },
        {
          id: "kr1-3",
          title: "Launch mobile app",
          progress: 85,
          status: "on-track",
          owner: "Product Team",
          metric: "Beta released",
          tasks: [
            { id: "t1-3-1", title: "Complete iOS development", status: "completed", assignee: "Mobile Team", type: "task" },
            { id: "t1-3-2", title: "Complete Android development", status: "completed", assignee: "Mobile Team", type: "task" },
            { id: "t1-3-3", title: "Submit to app stores", status: "in-progress", assignee: "Product Manager", type: "task" }
          ]
        }
      ]
    },
    {
      id: 2,
      title: "Improve Customer Satisfaction",
      progress: 62,
      status: "at-risk",
      owner: "Mike Johnson",
      keyResultsCount: 3,
      confidence: 0.65,
      dueDate: "Q3 2025",
      keyResults: [
        {
          id: "kr2-1",
          title: "Achieve NPS score of 70",
          progress: 55,
          status: "at-risk",
          owner: "Customer Success",
          metric: "52 / 70",
          tasks: [
            { id: "t2-1-1", title: "Implement feedback system", status: "completed", assignee: "CS Team", type: "task" },
            { id: "t2-1-2", title: "Weekly customer calls", status: "in-progress", assignee: "Account Managers", type: "habit", frequency: "Weekly", department: "Customer Success", tags: ["feedback", "nps"] }
          ]
        },
        {
          id: "kr2-2",
          title: "Reduce response time to <2 hours",
          progress: 70,
          status: "on-track",
          owner: "Support Team",
          metric: "3h avg / 2h target",
          tasks: [
            { id: "t2-2-1", title: "Hire additional support staff", status: "in-progress", assignee: "HR Team", type: "task" },
            { id: "t2-2-2", title: "Implement chatbot", status: "pending", assignee: "AI Team", type: "agent", trigger: "Customer query", action: "Auto-respond to FAQs", department: "Support", tags: ["automation", "support"] }
          ]
        },
        {
          id: "kr2-3",
          title: "Customer retention rate 95%",
          progress: 60,
          status: "at-risk",
          owner: "Success Team",
          metric: "91% / 95%",
          tasks: [
            { id: "t2-3-1", title: "Launch loyalty program", status: "pending", assignee: "Marketing", type: "task" }
          ]
        }
      ]
    },
    {
      id: 3,
      title: "Expand Market Presence",
      progress: 80,
      status: "on-track",
      owner: "Emily Davis",
      keyResultsCount: 4,
      confidence: 0.90,
      dueDate: "Q4 2025",
      keyResults: [
        {
          id: "kr3-1",
          title: "Enter 3 new markets",
          progress: 85,
          status: "on-track",
          owner: "Expansion Team",
          metric: "2 / 3 markets",
          tasks: [
            { id: "t3-1-1", title: "Market research Europe", status: "completed", assignee: "Research Team", type: "task" },
            { id: "t3-1-2", title: "Setup local partnerships", status: "in-progress", assignee: "BD Team", type: "task" }
          ]
        },
        {
          id: "kr3-2",
          title: "Increase brand awareness to 40%",
          progress: 75,
          status: "on-track",
          owner: "Marketing",
          metric: "30% / 40%",
          tasks: [
            { id: "t3-2-1", title: "Launch PR campaign", status: "in-progress", assignee: "PR Agency", type: "task" }
          ]
        }
      ]
    },
    {
      id: 4,
      title: "Build Operational Excellence",
      progress: 45,
      status: "off-track",
      owner: "David Kim",
      keyResultsCount: 2,
      confidence: 0.55,
      dueDate: "Q2 2025",
      keyResults: [
        {
          id: "kr4-1",
          title: "Reduce operational costs by 20%",
          progress: 40,
          status: "off-track",
          owner: "Operations",
          metric: "8% / 20%",
          tasks: [
            { id: "t4-1-1", title: "Automate workflows", status: "in-progress", assignee: "Process Team", type: "task" }
          ]
        },
        {
          id: "kr4-2",
          title: "Achieve 99.9% uptime",
          progress: 50,
          status: "at-risk",
          owner: "DevOps",
          metric: "98.5% / 99.9%",
          tasks: [
            { id: "t4-2-1", title: "Implement redundancy", status: "pending", assignee: "Infrastructure", type: "task" }
          ]
        }
      ]
    }
  ];

  const upcomingCheckIns = [
    { type: "Weekly", date: "Tomorrow", items: 3 },
    { type: "Monthly", date: "Jan 28", items: 8 },
    { type: "Quarterly", date: "Mar 31", items: 12 }
  ];

  const recentDecisions = [
    { title: "Pivot to cloud-first approach", date: "2 days ago", impact: "high" },
    { title: "Increase marketing budget by 20%", date: "1 week ago", impact: "medium" },
    { title: "Delay product launch to Q2", date: "2 weeks ago", impact: "high" }
  ];

  const toggleObjective = (objectiveId: number) => {
    const newExpanded = new Set(expandedObjectives);
    if (newExpanded.has(objectiveId)) {
      newExpanded.delete(objectiveId);
      // Also collapse all key results under this objective
      const newExpandedKR = new Set(expandedKeyResults);
      objectives.find(o => o.id === objectiveId)?.keyResults?.forEach(kr => {
        newExpandedKR.delete(kr.id);
      });
      setExpandedKeyResults(newExpandedKR);
    } else {
      newExpanded.add(objectiveId);
    }
    setExpandedObjectives(newExpanded);
  };

  const toggleKeyResult = (keyResultId: string) => {
    const newExpanded = new Set(expandedKeyResults);
    if (newExpanded.has(keyResultId)) {
      newExpanded.delete(keyResultId);
    } else {
      newExpanded.add(keyResultId);
    }
    setExpandedKeyResults(newExpanded);
  };

  const openDetailPanel = (item: any, type: 'objective' | 'keyResult' | 'work') => {
    setSelectedItem(item);
    setSelectedItemType(type);
    setDetailPanelOpen(true);
    setDetailPanelTab('overview'); // Reset to overview tab when opening
  };

  const getWorkItemIcon = (type: string) => {
    switch (type) {
      case "habit":
        return <Repeat className="h-3 w-3 text-blue-500" />;
      case "agent":
        return <Bot className="h-3 w-3 text-purple-500" />;
      default:
        return <CheckSquare className="h-3 w-3 text-gray-500" />;
    }
  };

  const getWorkItemBadge = (type: string) => {
    switch (type) {
      case "habit":
        return <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">Habit</Badge>;
      case "agent":
        return <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">Agent</Badge>;
      default:
        return <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700">Task</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-track": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "at-risk": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "off-track": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "completed": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "in-progress": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "pending": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const handleCreateHabitFromKeyResult = (keyResult: any) => {
    setSelectedKeyResultForHabit(keyResult);
    setShowCreateHabitModal(true);
  };

  const createHabit = async (habitData: any) => {
    try {
      // API call to create habit would go here
      console.log('Creating habit:', habitData);
      setShowCreateHabitModal(false);
      setSelectedKeyResultForHabit(null);
      // Refresh data or update state
    } catch (error) {
      console.error('Error creating habit:', error);
    }
  };

  const shouldShowItem = (item: any, type: string) => {
    if (taskTypeFilter === 'all') return true;
    return taskTypeFilter === type;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "on-track": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "at-risk": return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "off-track": return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "completed": return <CheckSquare className="h-4 w-4 text-blue-600" />;
      case "in-progress": return <Clock className="h-4 w-4 text-purple-600" />;
      case "pending": return <ListTodo className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide h-screen">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4 lg:space-y-6 pb-20 lg:pb-6">
      {/* Compact Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground">Objectives</h1>
          <p className="text-sm text-muted-foreground">View and manage all objectives and key results</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2 text-xs lg:text-sm"
            onClick={() => setLocation('/strategy/mission')}
          >
            <Eye className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="hidden sm:inline">Mission & Vision</span>
            <span className="sm:hidden">Mission</span>
          </Button>
          <Button 
            size="sm"
            className="flex items-center gap-2 text-xs lg:text-sm"
            onClick={() => setLocation('/strategy/objective-builder')}
          >
            <Plus className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="hidden sm:inline">New Objective</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Compact Strategy Status Bar */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="py-3 px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left Section */}
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold truncate">{strategyOverview.name}</h2>
                <p className="text-xs text-muted-foreground">{strategyOverview.timeframe}</p>
              </div>
            </div>
            
            {/* Stats Section */}
            <div className="flex items-center justify-between sm:justify-end gap-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <span className="text-lg sm:text-xl font-bold text-primary">{strategyOverview.objectivesCount}</span>
                  <span className="text-xs text-muted-foreground ml-1">Objectives</span>
                </div>
                <div className="text-center border-l pl-4">
                  <span className="text-lg sm:text-xl font-bold text-primary">{strategyOverview.keyResultsCount}</span>
                  <span className="text-xs text-muted-foreground ml-1">Key Results</span>
                </div>
              </div>
              
              {/* Progress Section */}
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-sm font-bold">{strategyOverview.progress}%</div>
                  <Progress value={strategyOverview.progress} className="h-1.5 w-16 sm:w-20" />
                </div>
                <Badge className={`${getStatusColor(strategyOverview.health)} text-xs`}>
                  {strategyOverview.health.replace("-", " ").toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Objectives & Key Results */}
          <Card>
            <CardHeader className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-lg sm:text-xl">Objectives & Key Results</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage your strategic objectives and track key results</CardDescription>
                </div>
                <Button 
                  onClick={() => setLocation('/strategy/objective-builder')}
                  className="flex items-center gap-2 w-full sm:w-auto"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  New Objective
                </Button>
              </div>
              
              {/* Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium whitespace-nowrap">Filter by:</Label>
                  <Select value={taskTypeFilter} onValueChange={setTaskTypeFilter}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="objective">Objectives</SelectItem>
                      <SelectItem value="keyResult">Key Results</SelectItem>
                      <SelectItem value="habit">Habits</SelectItem>
                      <SelectItem value="task">Tasks</SelectItem>
                      <SelectItem value="agent">AI Agents</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-xs h-8"
                  onClick={() => setShowCreateHabitModal(true)}
                >
                  <Repeat className="h-3 w-3" />
                  New Habit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {objectives.map((objective) => (
                    <React.Fragment key={`obj-${objective.id}`}>
                      {/* Objective Row */}
                      {shouldShowItem(objective, 'objective') && (
                      <TableRow className="hover:bg-muted/50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-6 w-6"
                            onClick={() => toggleObjective(objective.id)}
                          >
                            {expandedObjectives.has(objective.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">Objective</Badge>
                            <button 
                              onClick={() => openDetailPanel(objective, 'objective')}
                              className="font-medium hover:text-primary hover:underline text-left"
                            >
                              {objective.title}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>{objective.owner}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={objective.progress} className="w-20 h-2" />
                            <span className="text-sm">{objective.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(objective.status)}>
                            {objective.status.replace("-", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{objective.dueDate}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setLocation('/strategy/objective-builder')}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                      )}

                      {/* Key Results */}
                      {expandedObjectives.has(objective.id) && objective.keyResults?.map((kr) => (
                        <React.Fragment key={`kr-${kr.id}`}>
                          {shouldShowItem(kr, 'keyResult') && (
                          <TableRow className="bg-muted/50 hover:bg-muted/70">
                            <TableCell className="pl-8">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-0 h-6 w-6"
                                onClick={() => toggleKeyResult(kr.id)}
                              >
                                {expandedKeyResults.has(kr.id) ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 pl-4">
                                <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">Key Result</Badge>
                                <button 
                                  onClick={() => openDetailPanel(kr, 'keyResult')}
                                  className="text-sm hover:text-primary hover:underline text-left"
                                >
                                  {kr.title}
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{kr.owner}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={kr.progress} className="w-16 h-1.5" />
                                <span className="text-xs">{kr.progress}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${getStatusColor(kr.status)}`}>
                                {kr.status.replace("-", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{kr.metric}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-7 text-xs">
                                  Update
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 text-xs"
                                  onClick={() => handleCreateHabitFromKeyResult(kr)}
                                >
                                  <Repeat className="h-3 w-3 mr-1" />
                                  Habit
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          )}

                          {/* Tasks */}
                          {expandedKeyResults.has(kr.id) && kr.tasks?.map((task) => (
                            shouldShowItem(task, task.type) && (
                            <TableRow key={task.id} className="bg-muted/30 hover:bg-muted/50">
                              <TableCell></TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 pl-12">
                                  {getWorkItemIcon(task.type)}
                                  {getWorkItemBadge(task.type)}
                                  <button 
                                    onClick={() => openDetailPanel(task, 'work')}
                                    className="text-xs text-muted-foreground hover:text-primary hover:underline text-left"
                                  >
                                    {task.title}
                                  </button>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{task.assignee}</TableCell>
                              <TableCell></TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-xs ${getStatusColor(task.status)}`}>
                                  {task.status.replace("-", " ")}
                                </Badge>
                              </TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" className="h-6 text-xs">
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                            )
                          ))}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                  {objectives.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No objectives yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Start by creating your first strategic objective
                        </p>
                        <Button onClick={() => setLocation('/strategy/objective-builder')}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Objective
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Panel - Side panel that pushes content */}
      <div className={`${detailPanelOpen ? 'fixed lg:relative inset-y-0 lg:inset-y-auto right-0 lg:right-auto w-full sm:w-[450px] lg:w-[40%] lg:max-w-[600px] z-40 lg:z-auto h-screen lg:h-full' : 'w-0'} transition-all duration-300 overflow-hidden bg-white border-l border-gray-200 shadow-lg flex-shrink-0`}>
        {detailPanelOpen && (
          <div className="h-full flex flex-col">
            {/* Header - Fixed */}
            <div className="flex items-start justify-between p-4 lg:p-6 border-b bg-white shrink-0">
              <div className="flex-1">
                <h2 className="text-base font-semibold text-gray-900">
                  {selectedItemType === 'objective' && 'Edit Objective'}
                  {selectedItemType === 'keyResult' && 'Edit Key Result'}
                  {selectedItemType === 'work' && 'Edit Work Item'}
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  Make changes to the {selectedItemType} here. Click save when you're done.
                </p>
              </div>

            </div>

            {/* Tabs for Objectives */}
            {selectedItemType === 'objective' && (
              <div className="px-4 lg:px-6 border-b overflow-x-auto scrollbar-hide">
                <div className="flex space-x-4 min-w-fit">
                  {['overview', 'keyResults', 'habits', 'tasks', 'checkins'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDetailPanelTab(tab)}
                      className={`py-2 text-xs font-medium border-b-2 whitespace-nowrap px-1 ${
                        detailPanelTab === tab
                          ? 'border-turquoise-600 text-turquoise-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab === 'overview' && 'Overview'}
                      {tab === 'keyResults' && 'Key Results'}
                      {tab === 'habits' && 'Habits'}
                      {tab === 'tasks' && 'Tasks'}
                      {tab === 'checkins' && 'Check-ins'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 lg:p-6 min-h-0">
            {selectedItem && (
              <div className="space-y-4">
                {/* Objective Tabbed Content */}
                {selectedItemType === 'objective' && (
                  <>
                    {/* Overview Tab */}
                    {detailPanelTab === 'overview' && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor="title" className="text-xs font-medium">Objective Title</Label>
                          <Input id="title" defaultValue={selectedItem.title} className="text-sm h-9" />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="description" className="text-xs font-medium">Description</Label>
                          <Textarea 
                            id="description" 
                            placeholder="Describe what success looks like and why this objective matters..."
                            className="min-h-[80px] text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="owner" className="text-xs font-medium">Owner</Label>
                            <Input id="owner" defaultValue={selectedItem.owner} className="text-sm h-9" />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="timeframe" className="text-xs font-medium">Timeframe</Label>
                            <Select defaultValue={selectedItem.dueDate || "Q2 2025"}>
                              <SelectTrigger id="timeframe">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Q1 2025">Q1 2025</SelectItem>
                                <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                                <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                                <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Category</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {['Revenue Growth', 'Customer Success', 'Operational Excellence', 'Innovation'].map((category) => (
                              <label key={category} className="flex items-center space-x-2">
                                <input type="radio" name="category" value={category} className="h-3 w-3" />
                                <span className="text-xs">{category}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="progress" className="text-xs font-medium">Progress: {selectedItem.progress}%</Label>
                          <Progress value={selectedItem.progress} className="h-2" />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="status" className="text-xs font-medium">Status</Label>
                          <Select defaultValue={selectedItem.status}>
                            <SelectTrigger id="status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="on-track">On Track</SelectItem>
                              <SelectItem value="at-risk">At Risk</SelectItem>
                              <SelectItem value="off-track">Off Track</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Key Results Tab */}
                    {detailPanelTab === 'keyResults' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-600">Add measurable outcomes for this objective</p>
                          <Button size="sm" className="h-7 text-xs">
                            <Plus className="h-3 w-3 mr-1" />
                            Add Key Result
                          </Button>
                        </div>

                        {/* Key Results List */}
                        <div className="space-y-3">
                          {selectedItem.keyResults?.map((kr: any, index: number) => (
                            <div key={kr.id} className="border rounded-lg p-3 space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="flex-1 space-y-2">
                                  <Input 
                                    defaultValue={kr.title} 
                                    className="text-sm h-8 font-medium"
                                    placeholder="Key result title..."
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input 
                                      defaultValue={kr.metric} 
                                      className="text-xs h-7"
                                      placeholder="Current / Target"
                                    />
                                    <Select defaultValue={kr.status}>
                                      <SelectTrigger className="h-7 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="on-track">On Track</SelectItem>
                                        <SelectItem value="at-risk">At Risk</SelectItem>
                                        <SelectItem value="off-track">Off Track</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Progress value={kr.progress} className="h-1.5" />
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Habits & Routines Tab */}
                    {detailPanelTab === 'habits' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-600">Set recurring activities to achieve this objective</p>
                          <Button size="sm" className="h-7 text-xs">
                            <Plus className="h-3 w-3 mr-1" />
                            Add Habit
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <div className="border rounded-lg p-3">
                            <div className="space-y-2">
                              <Input 
                                placeholder="Habit title..."
                                className="text-sm h-8 font-medium"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Select>
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Frequency" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select>
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Assign to" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="me">Me</SelectItem>
                                    <SelectItem value="ai">AI Agent</SelectItem>
                                    <SelectItem value="team">Team Member</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Textarea 
                                placeholder="Description or process..."
                                className="min-h-[60px] text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tasks & Projects Tab */}
                    {detailPanelTab === 'tasks' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-600">Add one-off tasks and projects</p>
                          <Button size="sm" className="h-7 text-xs">
                            <Plus className="h-3 w-3 mr-1" />
                            Add Task
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <div className="border rounded-lg p-3">
                            <div className="space-y-2">
                              <Input 
                                placeholder="Task title..."
                                className="text-sm h-8 font-medium"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Input 
                                  type="date"
                                  className="h-7 text-xs"
                                  placeholder="Due date"
                                />
                                <Select>
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Priority" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Select>
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="Assign to..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="me">Me</SelectItem>
                                  <SelectItem value="ai">AI Agent</SelectItem>
                                  <SelectItem value="team">Team Member</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Check-ins Tab */}
                    {detailPanelTab === 'checkins' && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left Column - Upcoming Check-ins */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Upcoming Check-ins
                            </h3>
                          </div>
                          <div className="space-y-2">
                            {[
                              { title: 'Weekly Review', date: 'Tomorrow', items: 3 },
                              { title: 'Monthly Review', date: 'Jan 28', items: 8 },
                              { title: 'Quarterly Review', date: 'Mar 31', items: 12 }
                            ].map((checkin, idx) => (
                              <div 
                                key={idx} 
                                className="border rounded p-2 hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => setShowCheckInForm(true)}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-xs font-medium">{checkin.title}</p>
                                    <p className="text-xs text-gray-500">{checkin.date}</p>
                                  </div>
                                  <Badge variant="secondary" className="text-xs">
                                    {checkin.items} items
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="mt-3 text-xs h-6 p-0"
                            onClick={() => setShowCheckInForm(true)}
                          >
                            Start Check-in
                          </Button>
                        </div>

                        {/* Right Column - Recent Decisions */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Recent Decisions
                            </h3>
                          </div>
                          <div className="space-y-2">
                            {[
                              { title: 'Pivot to cloud-first approach', date: '2 days ago', impact: 'high' },
                              { title: 'Increase marketing budget by 20%', date: '1 week ago', impact: 'medium' },
                              { title: 'Delay product launch to Q2', date: '2 weeks ago', impact: 'high' }
                            ].map((decision, idx) => (
                              <div key={idx} className="border-l-2 border-gray-200 pl-2 py-1">
                                <p className="text-xs font-medium">{decision.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-500">{decision.date}</span>
                                  <Badge 
                                    variant={decision.impact === 'high' ? 'destructive' : 'secondary'}
                                    className="text-xs h-3 px-1"
                                  >
                                    {decision.impact} impact
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Non-Objective Content (Key Results and Work Items) */}
                {selectedItemType !== 'objective' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="title" className="text-xs font-medium">Title</Label>
                      <Input id="title" defaultValue={selectedItem.title} className="text-sm h-9" />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="description" className="text-xs font-medium">Description</Label>
                      <Textarea 
                        id="description" 
                        placeholder="Add a description..."
                        className="min-h-[80px] text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="owner" className="text-xs font-medium">Owner</Label>
                        <Input id="owner" defaultValue={selectedItem.owner || selectedItem.assignee} className="text-sm h-9" />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="status" className="text-xs font-medium">Status</Label>
                        <Select defaultValue={selectedItem.status}>
                          <SelectTrigger id="status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="on-track">On Track</SelectItem>
                            <SelectItem value="at-risk">At Risk</SelectItem>
                            <SelectItem value="off-track">Off Track</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {selectedItem.progress !== undefined && (
                      <div className="space-y-1">
                        <Label htmlFor="progress" className="text-xs font-medium">Progress: {selectedItem.progress}%</Label>
                        <Progress value={selectedItem.progress} className="h-2" />
                      </div>
                    )}

                    {selectedItem.metric && (
                      <div className="space-y-1">
                        <Label htmlFor="metric" className="text-xs font-medium">Metric</Label>
                        <Input id="metric" defaultValue={selectedItem.metric} className="text-sm h-9" />
                      </div>
                    )}
                  </div>
                )}

              {/* Work Item Specific Fields */}
              {selectedItemType === 'work' && selectedItem.type === 'habit' && (
                <div className="space-y-3 border-t pt-3">
                  <h3 className="text-xs font-semibold flex items-center gap-2">
                    <Repeat className="h-3 w-3" />
                    Habit Configuration
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="frequency" className="text-xs font-medium">Frequency</Label>
                      <Select defaultValue={selectedItem.frequency || "Weekly"}>
                        <SelectTrigger id="frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Daily">Daily</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="department" className="text-xs font-medium">Department</Label>
                      <Input id="department" defaultValue={selectedItem.department} placeholder="e.g., Sales" className="text-sm h-9" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="kbDocs" className="text-xs font-medium">Knowledge Base Documents</Label>
                    <Textarea 
                      id="kbDocs" 
                      placeholder="Link KB documents to ensure process is followed..."
                      defaultValue={selectedItem.kbDocs?.join(', ')}
                      className="min-h-[60px] text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="tags" className="text-xs font-medium">Tags</Label>
                    <Input 
                      id="tags" 
                      placeholder="Enter tags separated by commas"
                      defaultValue={selectedItem.tags?.join(', ')}
                      className="text-sm h-9"
                    />
                  </div>
                </div>
              )}

              {selectedItemType === 'work' && selectedItem.type === 'agent' && (
                <div className="space-y-3 border-t pt-3">
                  <h3 className="text-xs font-semibold flex items-center gap-2">
                    <Bot className="h-3 w-3" />
                    Agent Configuration
                  </h3>
                  
                  <div className="space-y-1">
                    <Label htmlFor="trigger" className="text-xs font-medium">Trigger</Label>
                    <Input id="trigger" defaultValue={selectedItem.trigger} placeholder="e.g., Every Monday 9am" className="text-sm h-9" />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="action" className="text-xs font-medium">Action</Label>
                    <Textarea 
                      id="action" 
                      defaultValue={selectedItem.action}
                      placeholder="Describe what the agent should do..."
                      className="min-h-[60px] text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="department" className="text-xs font-medium">Department</Label>
                      <Input id="department" defaultValue={selectedItem.department} placeholder="e.g., Support" className="text-sm h-9" />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="lastRun" className="text-xs font-medium">Last Run</Label>
                      <Input id="lastRun" defaultValue={selectedItem.lastRun} disabled className="text-sm h-9" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="tags" className="text-xs font-medium">Tags</Label>
                    <Input 
                      id="tags" 
                      placeholder="Enter tags separated by commas"
                      defaultValue={selectedItem.tags?.join(', ')}
                      className="text-sm h-9"
                    />
                  </div>
                </div>
              )}

              {/* Key Result Specific - Add Work Items */}
              {selectedItemType === 'keyResult' && (
                <div className="space-y-3 border-t pt-3">
                  <h3 className="text-xs font-semibold">Work Items</h3>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="flex items-center gap-1 text-xs h-8">
                      <ListTodo className="h-3 w-3" />
                      Add Task
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-1 text-xs h-8">
                      <Repeat className="h-3 w-3" />
                      Add Habit
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-1 text-xs h-8">
                      <Bot className="h-3 w-3" />
                      Add Agent
                    </Button>
                  </div>
                </div>
              )}

              {/* Activity Log */}
              {(selectedItem.lastUpdated || selectedItem.lastRun) && (
                <div className="space-y-3 border-t pt-3">
                  <h3 className="text-xs font-semibold">Activity Log</h3>
                  <div className="space-y-2 text-xs text-gray-600">
                    {selectedItem.lastUpdated && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Last updated: {selectedItem.lastUpdated}
                      </div>
                    )}
                    {selectedItem.lastRun && (
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3" />
                        Last run: {selectedItem.lastRun}
                      </div>
                    )}
                  </div>
                </div>
              )}

              </div>
            )}
            </div>

            {/* Actions - Fixed at bottom */}
            <div className="border-t bg-white p-4 lg:px-6 shrink-0">
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDetailPanelOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => {
                  // Save logic here
                  setDetailPanelOpen(false);
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Check-in Form Panel - Side panel that slides in from right */}
      <div className={`${showCheckInForm ? 'fixed inset-y-0 right-0 w-full sm:w-[450px] lg:w-[600px] z-50 h-screen' : 'w-0'} transition-all duration-300 overflow-hidden bg-white border-l border-gray-200 shadow-xl`}>
        {showCheckInForm && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between p-4 lg:p-6 border-b bg-turquoise-50 shrink-0">
              <div className="flex-1">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-turquoise-600" />
                  Weekly Check-in
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  {selectedItem?.title || 'Increase Digital Revenue'}
                </p>
              </div>

            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 lg:p-6 min-h-0">
              <div className="space-y-6">
                {/* Progress Update Section */}
                <div>
                  <h3 className="text-xs font-semibold mb-3">Progress Update</h3>
                  <div className="space-y-3">
                    {(selectedItem?.keyResults || [
                      { title: 'Achieve 30% digital revenue', metric: '25/30%', progress: 83 },
                      { title: 'Launch 3 new digital products', metric: '2/3', progress: 67 }
                    ]).map((kr: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium">{kr.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {kr.metric}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Current:</Label>
                          <Input 
                            type="number" 
                            defaultValue={kr.progress} 
                            className="h-7 w-20 text-xs"
                          />
                          <span className="text-xs text-gray-500">/ 100</span>
                          <Progress value={kr.progress} className="flex-1 h-1.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tasks Completed */}
                <div>
                  <h3 className="text-xs font-semibold mb-3">Tasks Completed This Period</h3>
                  <div className="space-y-2">
                    {[
                      { title: 'Weekly sales review', completed: true },
                      { title: 'Update CRM data', completed: true },
                      { title: 'Team meeting', completed: true },
                      { title: 'Customer outreach', completed: false },
                      { title: 'Market analysis', completed: false },
                    ].map((task, idx) => (
                      <label key={idx} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          className="h-3 w-3" 
                          defaultChecked={task.completed}
                        />
                        <span className={`text-xs ${task.completed ? 'line-through text-gray-400' : ''}`}>
                          {task.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Questions */}
                <div>
                  <h3 className="text-xs font-semibold mb-3">Check-in Questions</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">What progress was made this week?</Label>
                      <Textarea 
                        className="min-h-[60px] text-xs mt-1"
                        placeholder="Describe key accomplishments..."
                      />
                    </div>
                    <div>
                      <Label className="text-xs">What blockers are preventing progress?</Label>
                      <Textarea 
                        className="min-h-[60px] text-xs mt-1"
                        placeholder="List any challenges or obstacles..."
                      />
                    </div>
                    <div>
                      <Label className="text-xs">What support do you need?</Label>
                      <Textarea 
                        className="min-h-[60px] text-xs mt-1"
                        placeholder="Resources, help, or decisions needed..."
                      />
                    </div>
                  </div>
                </div>

                {/* Next Steps */}
                <div>
                  <h3 className="text-xs font-semibold mb-3">Tasks for Next Period</h3>
                  <div className="space-y-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <Repeat className="h-3 w-3 text-blue-600" />
                        <span className="text-xs font-medium">Auto-generated from habits:</span>
                      </div>
                      <ul className="mt-1 ml-5 space-y-1">
                        <li className="text-xs text-gray-600">• Weekly sales review</li>
                        <li className="text-xs text-gray-600">• Team sync meeting</li>
                      </ul>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs w-full">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Manual Task
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between items-center p-4 lg:p-6 border-t bg-gray-50 shrink-0">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowCheckInForm(false)}
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                >
                  Save Draft
                </Button>
                <Button 
                  size="sm"
                  className="bg-turquoise-600 hover:bg-turquoise-700"
                  onClick={() => {
                    setShowCheckInForm(false);
                    // In real app, would save check-in data
                  }}
                >
                  Complete Check-in
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Habit Modal */}
      {showCreateHabitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Create New Habit</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setShowCreateHabitModal(false);
                    setSelectedKeyResultForHabit(null);
                  }}
                >
                  ×
                </Button>
              </div>
              
              {selectedKeyResultForHabit && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Creating habit for: <strong>{selectedKeyResultForHabit.title}</strong>
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Habit Name</Label>
                  <Input 
                    placeholder="e.g., Daily customer check-ins"
                    className="mt-1"
                    value={habitForm.title}
                    onChange={(e) => setHabitForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Frequency</Label>
                  <Select value={habitForm.frequency} onValueChange={(value) => setHabitForm(prev => ({ ...prev, frequency: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="biannually">Bi-annually</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Assignee</Label>
                  <Select value={habitForm.assignedTo} onValueChange={(value) => setHabitForm(prev => ({ ...prev, assignedTo: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Myself</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="ai">AI Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <Textarea 
                    placeholder="Describe what this habit involves..."
                    className="mt-1"
                    rows={3}
                    value={habitForm.description}
                    onChange={(e) => setHabitForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setShowCreateHabitModal(false);
                    setSelectedKeyResultForHabit(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleCreateHabit}
                  disabled={createHabitMutation.isPending}
                >
                  {createHabitMutation.isPending ? 'Creating...' : 'Create Habit'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
);
}