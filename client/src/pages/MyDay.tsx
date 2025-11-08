import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Target, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Plus,
  Mic,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Users,
  MapPin,
  ListTodo
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeyResultDetailPanel } from '@/components/key-result-detail/KeyResultDetailPanel';

interface KeyResultProgress {
  id: number;
  title: string;
  currentValue: string;
  targetValue: string;
  status: string;
  objectiveId: number;
  objectiveTitle: string;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: string;
  keyResultTaskId: number | null;
  workflowTemplateId: string | null;
  workItemType: string | null;
  keyResultTask?: {
    id: number;
    title: string;
    keyResultId: number;
  } | null;
}

interface Meeting {
  id: number;
  title: string;
  scheduledDate: string;
  status: string;
  teamId: number;
  teamName: string;
}

interface BacklogItem {
  id: number;
  title: string;
  status: string;
  assignedTo: number | null;
  assignedUserName: string | null;
}

interface MyDayData {
  priorityOutcomes: KeyResultProgress[];
  todayTasks: Task[];
  weekMeetings: Meeting[];
  backlogItems: BacklogItem[];
}

export default function MyDay() {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [quickTaskInput, setQuickTaskInput] = useState('');
  const [selectedMeetingForAdd, setSelectedMeetingForAdd] = useState<number | null>(null);
  const [selectedBacklogItems, setSelectedBacklogItems] = useState<number[]>([]);
  const [selectedKeyResultId, setSelectedKeyResultId] = useState<number | null>(null);
  const [keyResultPanelOpen, setKeyResultPanelOpen] = useState(false);
  const { toast } = useToast();

  const { data: myDayData, isLoading } = useQuery<MyDayData>({
    queryKey: ['/api/strategy/my-day'],
  });

  const addToMeetingMutation = useMutation({
    mutationFn: async (data: { meetingId: number; workItemIds: number[] }) => {
      // Update each work item to target the meeting
      for (const workItemId of data.workItemIds) {
        await apiRequest(`/api/work-items/${workItemId}`, {
          method: 'PATCH',
          body: {
            targetMeetingId: data.meetingId
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/my-day'] });
      setSelectedBacklogItems([]);
      setSelectedMeetingForAdd(null);
      toast({
        title: "Items added to meeting",
        description: "Work items have been added to the check-in meeting",
      });
    },
  });

  const quickAddMutation = useMutation({
    mutationFn: async (title: string) => {
      return apiRequest('/api/work-items', {
        method: 'POST',
        body: {
          title,
          status: 'Planning',
          dueDate: new Date().toISOString().split('T')[0],
          assignedTo: currentUser?.id,
        }
      }) as unknown as Promise<{ id: number; title: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/my-day'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      setQuickTaskInput('');
      toast({
        title: "Task added to your work items",
        description: `"${data.title}" has been created and assigned to you. View it in Work Items.`,
        action: (
          <Button variant="outline" size="sm" onClick={() => setLocation(`/strategy/work-items?panel=workItem&mode=view&id=${data.id}`)}>
            View
          </Button>
        ),
      });
    },
  });

  const handleQuickAdd = () => {
    if (quickTaskInput.trim()) {
      quickAddMutation.mutate(quickTaskInput.trim());
    }
  };

  const handleAddItemsToMeeting = () => {
    if (selectedMeetingForAdd && selectedBacklogItems.length > 0) {
      addToMeetingMutation.mutate({
        meetingId: selectedMeetingForAdd,
        workItemIds: selectedBacklogItems
      });
    }
  };

  const getProgressPercentage = (kr: KeyResultProgress) => {
    const current = parseFloat(kr.currentValue || '0');
    const target = parseFloat(kr.targetValue || '1');
    return target > 0 ? Math.min((current / target) * 100, 100) : 0;
  };

  const getTrendIcon = (kr: KeyResultProgress) => {
    if (kr.status === 'At Risk' || kr.status === 'Stuck') {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    } else if (kr.status === 'On Track') {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'At Risk': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'Stuck': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'On Track': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'In Progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Planning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getMeetingStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'In Progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Planned': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatMeetingDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const priorityOutcomes = myDayData?.priorityOutcomes || [];
  const todayTasks = myDayData?.todayTasks || [];
  const weekMeetings = myDayData?.weekMeetings || [];
  const backlogItems = myDayData?.backlogItems || [];

  const overdueTasks = todayTasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date() && t.status !== 'Completed';
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="sm:text-3xl font-bold text-[18px] mt-[0px] mb-[0px]" data-testid="heading-my-day">My Day</h1>
          <p className="text-muted-foreground sm:text-base mt-[0px] mb-[0px] text-[12px]" data-testid="text-current-date">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>


        {/* Priority Outcomes */}
        {priorityOutcomes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="sm:text-xl font-semibold text-[14px]" data-testid="heading-priority-outcomes">Priority Outcomes</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation('/strategy/objectives')}
                data-testid="button-view-all-outcomes"
              >
                View all <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <div className="space-y-2">
              {priorityOutcomes.map((kr) => (
                <Card key={kr.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => {
                  setSelectedKeyResultId(kr.id);
                  setKeyResultPanelOpen(true);
                }} data-testid={`card-outcome-${kr.id}`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-xs sm:text-sm truncate" data-testid={`text-outcome-title-${kr.id}`}>{kr.title}</h3>
                          <p className="sm:text-xs text-muted-foreground truncate text-[12px]" data-testid={`text-outcome-objective-${kr.id}`}>
                            {kr.objectiveTitle}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {getTrendIcon(kr)}
                          <Badge className={`${getStatusColor(kr.status)} text-[10px] sm:text-xs px-1.5 py-0`} data-testid={`badge-outcome-status-${kr.id}`}>
                            {kr.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] sm:text-xs">
                          <span className="text-muted-foreground text-[12px]">Progress</span>
                          <span className="font-medium" data-testid={`text-outcome-progress-${kr.id}`}>
                            {kr.currentValue} / {kr.targetValue}
                          </span>
                        </div>
                        <Progress value={getProgressPercentage(kr)} className="h-1.5" data-testid={`progress-outcome-${kr.id}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Check-ins This Week */}
        {weekMeetings.length > 0 && (
          <div className="space-y-3">
            <h2 className="sm:text-xl font-semibold text-[14px]" data-testid="heading-checkins-week">Check-ins This Week</h2>
            <div className="space-y-2">
              {weekMeetings.map((meeting) => (
                <Card key={meeting.id} className="hover:bg-accent/50 transition-colors" data-testid={`card-meeting-${meeting.id}`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <h3 className="font-medium text-xs sm:text-sm truncate" data-testid={`text-meeting-title-${meeting.id}`}>
                            {meeting.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                          <span data-testid={`text-meeting-team-${meeting.id}`} className="text-[12px]">{meeting.teamName}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span data-testid={`text-meeting-date-${meeting.id}`} className="text-[12px]">{formatMeetingDate(meeting.scheduledDate)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedMeetingForAdd(meeting.id)}
                              data-testid={`button-quick-add-${meeting.id}`}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Add Items</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent data-testid={`dialog-add-items-${meeting.id}`}>
                            <DialogHeader>
                              <DialogTitle>Add Items to Meeting</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm text-muted-foreground">
                                Select work items from your backlog to add to this meeting
                              </p>
                              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {backlogItems.map((item) => (
                                  <label
                                    key={item.id}
                                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                                    data-testid={`checkbox-backlog-item-${item.id}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedBacklogItems.includes(item.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedBacklogItems([...selectedBacklogItems, item.id]);
                                        } else {
                                          setSelectedBacklogItems(selectedBacklogItems.filter(id => id !== item.id));
                                        }
                                      }}
                                      className="rounded"
                                    />
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">{item.title}</p>
                                      {item.assignedUserName && (
                                        <p className="text-xs text-muted-foreground">{item.assignedUserName}</p>
                                      )}
                                    </div>
                                    <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                                  </label>
                                ))}
                              </div>
                              <Button
                                onClick={handleAddItemsToMeeting}
                                disabled={selectedBacklogItems.length === 0 || addToMeetingMutation.isPending}
                                className="w-full"
                                data-testid="button-confirm-add-items"
                              >
                                {addToMeetingMutation.isPending ? 'Adding...' : `Add ${selectedBacklogItems.length} Items`}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setLocation(`/strategy/meeting/${meeting.id}/feedback`)}
                          data-testid={`button-open-meeting-${meeting.id}`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Today's Tasks */}
        {todayTasks.length > 0 && (
          <div className="space-y-3">
            <h2 className="sm:text-xl font-semibold text-[14px]" data-testid="heading-today-tasks">Today's Tasks</h2>
            <div className="space-y-2">
              {todayTasks.map((task) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
                
                return (
                  <Card key={task.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setLocation(`/strategy/work-items?panel=workItem&mode=view&id=${task.id}`)} data-testid={`card-task-${task.id}`}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <h3 className="font-medium text-xs sm:text-sm" data-testid={`text-task-title-${task.id}`}>{task.title}</h3>
                          {task.description && (
                            <p className="sm:text-xs text-muted-foreground line-clamp-1 text-[12px]" data-testid={`text-task-description-${task.id}`}>
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                            {task.dueDate && (
                              <>
                                <Clock className="h-3 w-3" />
                                <span className="text-destructive font-medium text-[12px]" data-testid={`text-task-due-${task.id}`}>
                                  {formatDate(task.dueDate)}
                                </span>
                              </>
                            )}
                            {task.workflowTemplateId && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <ListTodo className="h-3 w-3" />
                                  <span>Workflow</span>
                                </div>
                              </>
                            )}
                            {task.keyResultTask && (
                              <>
                                <span>•</span>
                                <span className="text-primary text-[12px]" data-testid={`text-task-kr-${task.id}`}>
                                  → {task.keyResultTask.title}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(task.status)} text-[10px] sm:text-xs px-1.5 py-0`} data-testid={`badge-task-status-${task.id}`}>
                          {task.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {todayTasks.length === 0 && priorityOutcomes.length === 0 && weekMeetings.length === 0 && (
          <Card data-testid="card-empty-state">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
              <p className="text-muted-foreground">
                You have no tasks or meetings scheduled. Start your day by adding a new task below.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Add Panel - Sticky Bottom */}
        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t p-3 sm:p-4 -mx-3 sm:-mx-6 -mb-3 sm:-mb-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Quick add task..."
                  value={quickTaskInput}
                  onChange={(e) => setQuickTaskInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                  className="h-10 sm:h-11"
                  data-testid="input-quick-add"
                />
              </div>
              <Button 
                onClick={handleQuickAdd}
                disabled={!quickTaskInput.trim() || quickAddMutation.isPending}
                size="icon"
                className="h-10 w-10 sm:h-11 sm:w-11"
                data-testid="button-quick-add-submit"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Key Result Detail Panel */}
      {selectedKeyResultId && (
        <KeyResultDetailPanel
          keyResultId={selectedKeyResultId}
          open={keyResultPanelOpen}
          onClose={() => {
            setKeyResultPanelOpen(false);
            setSelectedKeyResultId(null);
          }}
          onEditKeyResult={() => {}}
          onViewTask={(taskId) => {
            setLocation(`/strategy/work-items?panel=workItem&mode=view&id=${taskId}`);
          }}
        />
      )}
    </div>
  );
}
