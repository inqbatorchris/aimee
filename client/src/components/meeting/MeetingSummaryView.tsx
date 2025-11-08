import React from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Target,
  ArrowRight,
  Calendar,
  User,
  MoveRight,
  RefreshCw,
  Edit2,
  Save,
  X,
  ChevronRight,
  Check,
  MoreVertical,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

// Format date in organization timezone
function formatInOrgTz(dateISO: string | Date, fmt: Intl.DateTimeFormatOptions = {}): string {
  try {
    const date = typeof dateISO === 'string' ? new Date(dateISO) : dateISO;
    if (!date || isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/London',
      ...fmt
    };
    
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  } catch (error) {
    console.error('Error formatting date:', error, dateISO);
    return String(dateISO);
  }
}

interface MeetingSummaryViewProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: any;
  workItems?: any[];
  teamMembers?: any[];
}

export function MeetingSummaryView({
  isOpen,
  onClose,
  meeting,
  workItems = [],
  teamMembers = []
}: MeetingSummaryViewProps) {
  
  // State for collapsible sections
  const [showNotes, setShowNotes] = React.useState(false);
  const [showTimeline, setShowTimeline] = React.useState(false);
  const [showAllWorkItems, setShowAllWorkItems] = React.useState(false);
  const [showKeyResults, setShowKeyResults] = React.useState(true);
  const [showComments, setShowComments] = React.useState(true);
  const [showMoveDialog, setShowMoveDialog] = React.useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = React.useState(false);
  const [selectedTargetMeeting, setSelectedTargetMeeting] = React.useState<number | null>(null);
  const [isEditingNotes, setIsEditingNotes] = React.useState(false);
  const [editedNotes, setEditedNotes] = React.useState('');
  const [selectedWorkItem, setSelectedWorkItem] = React.useState<any>(null);
  const [showWorkItemDetail, setShowWorkItemDetail] = React.useState(false);
  const { toast } = useToast();
  
  // Extract meeting data (stored in agenda field in database)
  const metadata = meeting?.agenda || meeting?.metadata || {};
  const agendaItems = metadata?.agendaItems || [];
  const attendees = meeting?.attendees || [];
  
  // For completed meetings, use the stored work items from metadata
  const reviewedWorkItems = metadata?.reviewedWorkItems || workItems || [];
  
  // Get attendance records
  const getAttendanceStatus = (memberId: number) => {
    const record = attendees.find((a: any) => a.teamMemberId === memberId);
    return record?.status || 'unknown';
  };
  
  // Group attendance
  const presentMembers = teamMembers.filter(m => getAttendanceStatus(m.userId) === 'present');
  const absentMembers = teamMembers.filter(m => getAttendanceStatus(m.userId) === 'absent');
  
  // Group agenda items by status change
  const statusChanges = agendaItems.filter((item: any) => 
    item.originalStatus && item.status !== item.originalStatus
  );
  
  const followUps = agendaItems.filter((item: any) => item.followUpCreated);
  
  // Calculate meeting duration from metadata or fields
  const startTime = metadata?.startedAt || meeting?.actualStartTime;
  const endTime = metadata?.completedAt || meeting?.actualEndTime;
  const duration = metadata?.duration || 
    (endTime && startTime 
      ? Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000 / 60)
      : null);
  
  // Extract team feedback and activities
  const teamFeedback = metadata?.feedback || {};
  const activities = metadata?.activities || [];
  
  // Calculate overall rating from feedback
  const avgRating = teamFeedback.clarity ? 
    Math.round((teamFeedback.clarity + teamFeedback.skills + teamFeedback.environment) / 3) : 0;
  const ratingLabel = avgRating >= 4 ? 'Great' : avgRating >= 3 ? 'Good' : avgRating >= 2 ? 'Fair' : 'Poor';
  
  // Get incomplete items from this meeting
  const incompleteItems = reviewedWorkItems.filter((item: any) => 
    !['Completed', 'Archived'].includes(item.status)
  );
  
  // Fetch Key Result snapshots for this meeting
  const { data: keyResultSnapshots = [] } = useQuery<any[]>({
    queryKey: [`/api/strategy/meetings/${meeting?.id}/snapshots`],
    enabled: !!meeting?.id && isOpen
  });
  
  // Fetch Key Result comments for this meeting
  const { data: keyResultCommentsData = [] } = useQuery<any[]>({
    queryKey: [`/api/strategy/meetings/${meeting?.id}/key-result-comments`],
    enabled: !!meeting?.id && isOpen
  });
  
  // Fetch future meetings for the team
  const { data: futureMeetings = [] } = useQuery({
    queryKey: [`/api/strategy/check-in-meetings?teamId=${meeting?.teamId}`],
    enabled: !!meeting?.teamId && showMoveDialog
  });
  
  // Mutation for moving items
  const moveItemsMutation = useMutation({
    mutationFn: async (targetMeetingId: number) => {
      const response = await apiRequest(`/api/strategy/meetings/${meeting.id}/carry-forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { targetMeetingId }
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Items Moved',
        description: `${data.movedCount} items successfully moved to the selected meeting`,
        variant: 'default'
      });
      // Invalidate both the origin and target meetings
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/check-in-meetings'] });
      if (meeting?.teamId) {
        queryClient.invalidateQueries({ queryKey: [`/api/strategy/check-in-meetings?teamId=${meeting.teamId}`] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-items', 'targetMeetingId'] });
      setShowMoveDialog(false);
      setSelectedTargetMeeting(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to move items',
        variant: 'destructive'
      });
    }
  });
  
  const handleMoveItems = () => {
    if (selectedTargetMeeting) {
      moveItemsMutation.mutate(selectedTargetMeeting);
    }
  };
  
  // Mutation for saving notes
  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/strategy/check-in-meetings/${meeting.id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: { notes: editedNotes }
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Notes Updated',
        description: 'Meeting notes have been saved successfully',
        variant: 'default'
      });
      // Update the meeting notes properly
      if (meeting) {
        meeting.notes = editedNotes;
      }
      setIsEditingNotes(false);
      // Invalidate meeting queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/check-in-meetings'] });
      if (meeting?.teamId) {
        queryClient.invalidateQueries({ queryKey: [`/api/strategy/check-in-meetings?teamId=${meeting.teamId}`] });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save notes',
        variant: 'destructive'
      });
    }
  });
  
  const handleSaveNotes = () => {
    saveNotesMutation.mutate();
  };

  const statusChangeMutation = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: number; status: string }) => {
      await apiRequest(`/api/work-items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/meetings'] });
      toast({
        title: 'Success',
        description: 'Work item status updated',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update work item status',
        variant: 'destructive',
      });
    },
  });

  const handleStatusChange = (itemId: number, status: string) => {
    statusChangeMutation.mutate({ itemId, status });
  };
  
  // Filter out completed meetings and the current meeting
  const availableMeetings = (futureMeetings as any[]).filter((m: any) => 
    m.id !== meeting?.id && m.status === 'Planning'
  ) || [];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="p-0 flex h-dvh sm:h-screen w-full sm:w-[640px]">
          {/* Mobile scrolling fix: min-h-0 on flex container */}
          <div className="flex flex-col min-h-0 w-full">
            {/* Ultra-compact Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium truncate max-w-[120px]">
                  {meeting?.teamName || 'Check-in'}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground text-xs">
                  {formatInOrgTz(meeting?.scheduledDate, { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs">Done</span>
                </div>
              </div>
              {incompleteItems.length > 0 && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => setShowMoveDialog(true)}
                >
                  <ArrowRight className="h-4 w-4" />
                  <span className="ml-1 text-xs">{incompleteItems.length}</span>
                </Button>
              )}
            </div>

            {/* Single scrollable container for mobile */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-3 py-2 space-y-2">
                
                {/* Ultra-compact attendance row */}
                {(presentMembers.length > 0 || absentMembers.length > 0) && (
                  <div className="flex items-center gap-2 text-xs">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        {presentMembers.slice(0, 5).map(member => (
                          <div 
                            key={member.userId} 
                            className="w-5 h-5 rounded-full bg-green-100 border border-background flex items-center justify-center" 
                            title={member.fullName}
                          >
                            <span className="text-[9px] font-medium text-green-700">
                              {member.fullName?.charAt(0)}
                            </span>
                          </div>
                        ))}
                        {presentMembers.length > 5 && (
                          <div className="w-5 h-5 rounded-full bg-green-100 border border-background flex items-center justify-center">
                            <span className="text-[9px] font-medium text-green-700">+{presentMembers.length - 5}</span>
                          </div>
                        )}
                      </div>
                      {absentMembers.length > 0 && (
                        <span className="text-muted-foreground">• {absentMembers.length} absent</span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Compact Feedback Badge */}
                {teamFeedback && Object.keys(teamFeedback).length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setShowFeedbackDialog(true)}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full mr-1",
                        avgRating >= 4 ? "bg-green-500" : 
                        avgRating >= 3 ? "bg-yellow-500" : "bg-red-500"
                      )} />
                      {ratingLabel}
                    </Button>
                  </div>
                )}

                {/* Key Results Reviewed Section */}
                {keyResultSnapshots.length > 0 && (
                  <div className="border rounded-md">
                    <button
                      onClick={() => setShowKeyResults(!showKeyResults)}
                      className="flex items-center justify-between w-full px-2 py-1.5 text-sm hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-1">
                        <ChevronRight className={cn(
                          "h-3 w-3 transition-transform",
                          showKeyResults && "rotate-90"
                        )} />
                        <Target className="h-3 w-3" />
                        <span className="text-xs font-medium">Key Results</span>
                        <span className="text-xs text-muted-foreground">({keyResultSnapshots.length})</span>
                      </div>
                    </button>
                    {showKeyResults && (
                      <div className="px-2 py-1.5 border-t space-y-1.5 max-h-[300px] overflow-y-auto">
                        {keyResultSnapshots.map((snapshot: any) => {
                          const commentsForKR = keyResultCommentsData.find((krc: any) => 
                            krc.keyResultId === snapshot.keyResultId
                          );
                          const commentCount = commentsForKR?.comments?.length || 0;
                          
                          return (
                            <div key={snapshot.id} className="bg-muted/30 rounded p-2">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{snapshot.keyResultTitle}</p>
                                  {snapshot.objectiveTitle && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {snapshot.objectiveTitle}
                                    </p>
                                  )}
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[10px] h-5 px-1.5 shrink-0",
                                    snapshot.status === 'On Track' && "bg-green-50 text-green-700 border-green-200",
                                    snapshot.status === 'At Risk' && "bg-yellow-50 text-yellow-700 border-yellow-200",
                                    snapshot.status === 'Off Track' && "bg-red-50 text-red-700 border-red-200",
                                    snapshot.status === 'Completed' && "bg-blue-50 text-blue-700 border-blue-200"
                                  )}
                                >
                                  {snapshot.status}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm font-medium">
                                    {parseFloat(snapshot.currentValue).toLocaleString()}
                                  </span>
                                  <span className="text-xs text-muted-foreground">/</span>
                                  <span className="text-xs text-muted-foreground">
                                    {parseFloat(snapshot.targetValue).toLocaleString()}
                                  </span>
                                  {snapshot.delta !== null && (
                                    <span className={cn(
                                      "text-xs font-medium ml-1",
                                      snapshot.delta > 0 ? "text-green-600" : 
                                      snapshot.delta < 0 ? "text-red-600" : "text-muted-foreground"
                                    )}>
                                      {snapshot.delta > 0 ? '↑' : snapshot.delta < 0 ? '↓' : ''}
                                      {Math.abs(snapshot.delta).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                                
                                {commentCount > 0 && (
                                  <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                    <MessageSquare className="h-3 w-3" />
                                    <span>{commentCount}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Key Result Comments Section */}
                {keyResultCommentsData.length > 0 && (
                  <div className="border rounded-md">
                    <button
                      onClick={() => setShowComments(!showComments)}
                      className="flex items-center justify-between w-full px-2 py-1.5 text-sm hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-1">
                        <ChevronRight className={cn(
                          "h-3 w-3 transition-transform",
                          showComments && "rotate-90"
                        )} />
                        <MessageSquare className="h-3 w-3" />
                        <span className="text-xs font-medium">Comments</span>
                        <span className="text-xs text-muted-foreground">
                          ({keyResultCommentsData.reduce((sum: number, kr: any) => sum + kr.comments.length, 0)})
                        </span>
                      </div>
                    </button>
                    {showComments && (
                      <div className="px-2 py-1.5 border-t space-y-2 max-h-[300px] overflow-y-auto">
                        {keyResultCommentsData.map((krComments: any) => (
                          <div key={krComments.keyResultId} className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              {krComments.keyResultTitle}
                            </p>
                            {krComments.comments.map((comment: any) => (
                              <div key={comment.id} className="bg-muted/30 rounded p-1.5 ml-2">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-[8px] font-medium">
                                      {comment.userName?.charAt(0) || 'U'}
                                    </span>
                                  </div>
                                  <span className="text-xs font-medium">{comment.userName}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(comment.createdAt), 'h:mm a')}
                                  </span>
                                </div>
                                <p className="text-xs pl-5 text-muted-foreground">
                                  {comment.comment}
                                </p>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Work Items - Ultra-compact rows */}
                {reviewedWorkItems.length > 0 && (
                  <div className="divide-y">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs font-medium">Work Items ({reviewedWorkItems.length})</span>
                      {reviewedWorkItems.length > 5 && (
                        <button
                          onClick={() => setShowAllWorkItems(!showAllWorkItems)}
                          className="text-xs text-primary hover:underline"
                        >
                          {showAllWorkItems ? 'Show less' : 'Show all'}
                        </button>
                      )}
                    </div>
                    {reviewedWorkItems.slice(0, showAllWorkItems ? undefined : 5).map((item: any) => {
                      const statusChanged = activities.find((a: any) => 
                        a.type === 'status' && a.itemId === item.id
                      );
                      return (
                        <div key={item.id} className="grid grid-cols-[8px_1fr_auto] items-start gap-2 py-1.5 group hover:bg-muted/50 rounded cursor-pointer"
                             onClick={() => setSelectedWorkItem(item)}>
                          {/* Status dot */}
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-1.5",
                            item.status === 'Completed' && "bg-green-500",
                            item.status === 'In Progress' && "bg-blue-500",
                            item.status === 'Stuck' && "bg-yellow-500",
                            item.status === 'Ready' && "bg-gray-400"
                          )} />
                          
                          {/* Title and description */}
                          <div className="min-w-0">
                            <p className="text-sm truncate">{item.title}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </p>
                            )}
                            {statusChanged && (
                              <p className="text-xs text-primary mt-0.5">
                                → {statusChanged.newValue}
                              </p>
                            )}
                          </div>
                          
                          {/* Clickable status badge */}
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "cursor-pointer text-[10px] h-6 px-2 hover:opacity-80 transition-opacity",
                              item.status === 'Completed' && "bg-green-50 text-green-700 border-green-200",
                              item.status === 'In Progress' && "bg-blue-50 text-blue-700 border-blue-200",
                              item.status === 'Stuck' && "bg-yellow-50 text-yellow-700 border-yellow-200",
                              (!item.status || item.status === 'Ready' || item.status === 'Planning') && "bg-gray-50 text-gray-700 border-gray-200"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Cycle through statuses
                              const statuses = ['Ready', 'In Progress', 'Stuck', 'Completed'];
                              const currentIndex = statuses.indexOf(item.status || 'Ready');
                              const nextIndex = (currentIndex + 1) % statuses.length;
                              handleStatusChange(item.id, statuses[nextIndex]);
                            }}
                          >
                            {item.status || 'Ready'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Collapsible Timeline Section */}
                {activities.length > 0 && (
                  <div className="border rounded-md">
                    <button
                      onClick={() => setShowTimeline(!showTimeline)}
                      className="flex items-center justify-between w-full px-2 py-1.5 text-sm hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-1">
                        <ChevronRight className={cn(
                          "h-3 w-3 transition-transform",
                          showTimeline && "rotate-90"
                        )} />
                        <MessageSquare className="h-3 w-3" />
                        <span className="text-xs">Timeline</span>
                        <span className="text-xs text-muted-foreground">({activities.length})</span>
                      </div>
                    </button>
                    {showTimeline && (
                      <div className="px-2 py-1.5 border-t space-y-1 max-h-[200px] overflow-y-auto">
                        {activities.map((activity: any, idx: number) => {
                          if (activity.type === 'comment') {
                            return (
                              <div key={`activity-${idx}`} className="bg-muted/30 rounded p-1.5">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-[8px] font-medium">
                                      {activity.user?.charAt(0) || activity.userName?.charAt(0) || 'U'}
                                    </span>
                                  </div>
                                  <span className="text-xs font-medium">
                                    {activity.user || activity.userName || 'Unknown'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {activity.timestamp && format(new Date(activity.timestamp), 'h:mm a')}
                                  </span>
                                </div>
                                <p className="text-xs pl-5 text-muted-foreground">
                                  {activity.comment}
                                </p>
                              </div>
                            );
                          } else if (activity.type === 'status') {
                            return (
                              <div key={`activity-${idx}`} className="bg-blue-50 dark:bg-blue-900/20 rounded p-1.5">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <RefreshCw className="h-2.5 w-2.5 text-blue-600" />
                                  </div>
                                  <span className="text-xs font-medium">
                                    {activity.userName || 'System'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {activity.timestamp && format(new Date(activity.timestamp), 'h:mm a')}
                                  </span>
                                </div>
                                <p className="text-xs pl-5 text-muted-foreground">
                                  Status changed: {activity.oldValue} → {activity.newValue}
                                </p>
                              </div>
                            );
                          } else if (activity.type === 'feedback') {
                            return (
                              <div key={`activity-${idx}`} className="bg-green-50 dark:bg-green-900/20 rounded p-1.5">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <CheckCircle2 className="h-2.5 w-2.5 text-green-600" />
                                  </div>
                                  <span className="text-xs font-medium">
                                    {activity.userName || 'Team Member'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {activity.timestamp && format(new Date(activity.timestamp), 'h:mm a')}
                                  </span>
                                </div>
                                <p className="text-xs pl-5 text-muted-foreground">
                                  Submitted feedback: {activity.rating || 'N/A'} rating
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })}
                        {activities.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            No activity recorded
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsible Notes Section */}
                <div className="border rounded-md">
                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    className="flex items-center justify-between w-full px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-1">
                      <ChevronRight className={cn(
                        "h-3 w-3 transition-transform",
                        showNotes && "rotate-90"
                      )} />
                      <FileText className="h-3 w-3" />
                      <span className="text-xs">Notes</span>
                    </div>
                    {showNotes && !isEditingNotes && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingNotes(true);
                          setEditedNotes(meeting?.notes || '');
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </button>
                  {showNotes && (
                    <div className="px-2 py-1.5 border-t">
                      {isEditingNotes ? (
                        <div className="space-y-1.5">
                          <Textarea
                            value={editedNotes}
                            onChange={(e) => setEditedNotes(e.target.value)}
                            className="min-h-[60px] text-xs"
                            placeholder="Add meeting notes..."
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => handleSaveNotes()}
                              disabled={saveNotesMutation.isPending}
                            >
                              {saveNotesMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs"
                              onClick={() => {
                                setIsEditingNotes(false);
                                setEditedNotes('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {meeting?.richNotes?.content ? (
                            <div 
                              className="prose prose-xs max-w-none"
                              dangerouslySetInnerHTML={{ __html: meeting.richNotes.content }}
                            />
                          ) : (
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                              {meeting?.notes || 'No notes added yet.'}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Changes - Compact display */}
                {statusChanges.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium">Status Changes</span>
                    <div className="pl-2 space-y-0.5">
                      {statusChanges.slice(0, 3).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1 text-xs">
                          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                          <span className="flex-1 truncate">{item.title}</span>
                          <span className="text-muted-foreground">{item.originalStatus}</span>
                          <ArrowRight className="h-2.5 w-2.5" />
                          <span className="text-primary">{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-ups - Compact display */}
                {followUps.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium">Follow-ups</span>
                    <div className="pl-2 space-y-0.5">
                      {followUps.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1 text-xs">
                          <Target className="h-2.5 w-2.5 text-blue-500" />
                          <span className="flex-1 truncate">{item.title}</span>
                          {item.assignee && (
                            <span className="text-muted-foreground">
                              {item.assignee}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    
    {/* Move Items Dialog */}
    <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Move Incomplete Items
            </div>
          </DialogTitle>
          <DialogDescription>
            Select a future meeting to move {incompleteItems.length} incomplete items
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Show items to be moved */}
          <div>
            <p className="text-sm font-medium mb-2">Items to Move:</p>
            <div className="bg-muted/30 rounded-lg p-3 max-h-[200px] overflow-y-auto">
              <div className="space-y-1">
                {incompleteItems.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <span className="text-xs">
                      {item.status === 'Stuck' ? '⚠️' : 
                       item.status === 'In Progress' ? '🔄' : 
                       item.status === 'Ready' ? '✅' : '○'}
                    </span>
                    <span className="flex-1 truncate">{item.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Meeting Selection */}
          <div>
            <p className="text-sm font-medium mb-2">Move to Meeting:</p>
            <Select 
              value={selectedTargetMeeting?.toString() || ''} 
              onValueChange={(value) => setSelectedTargetMeeting(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a future meeting" />
              </SelectTrigger>
              <SelectContent>
                {availableMeetings.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No future meetings scheduled
                  </SelectItem>
                ) : (
                  availableMeetings.map((m: any) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {formatInOrgTz(m.scheduledDate, { 
                        month: 'short', 
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })} - {m.type} Check-in
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleMoveItems}
            disabled={!selectedTargetMeeting || moveItemsMutation.isPending}
          >
            {moveItemsMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              <>
                <MoveRight className="h-4 w-4 mr-2" />
                Move Items
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    {/* Feedback Details Dialog */}
    {teamFeedback && Object.keys(teamFeedback).length > 0 && (
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Team Feedback Details</DialogTitle>
            <DialogDescription>
              Meeting feedback from {formatInOrgTz(meeting?.scheduledDate, { month: 'short', day: 'numeric' })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Overall Rating */}
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Overall Rating</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-bold">{avgRating}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span 
                      key={star} 
                      className={star <= avgRating ? "text-yellow-500" : "text-gray-300"}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <Badge 
                variant={avgRating >= 4 ? "default" : avgRating >= 3 ? "secondary" : "destructive"}
                className="mt-2"
              >
                {ratingLabel}
              </Badge>
            </div>
            
            {/* Individual Scores */}
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Clarity of Goals</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{teamFeedback.clarity || 0}/5</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span 
                          key={star} 
                          className={`text-xs ${star <= (teamFeedback.clarity || 0) ? "text-yellow-500" : "text-gray-300"}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${((teamFeedback.clarity || 0) / 5) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Skills & Growth</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{teamFeedback.skills || 0}/5</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span 
                          key={star} 
                          className={`text-xs ${star <= (teamFeedback.skills || 0) ? "text-yellow-500" : "text-gray-300"}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${((teamFeedback.skills || 0) / 5) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Environment</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{teamFeedback.environment || 0}/5</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span 
                          key={star} 
                          className={`text-xs ${star <= (teamFeedback.environment || 0) ? "text-yellow-500" : "text-gray-300"}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${((teamFeedback.environment || 0) / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Additional Notes */}
            {teamFeedback.notes && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Additional Notes</p>
                <p className="text-sm">{teamFeedback.notes}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}

    {/* Work Item Detail Sheet */}
    {selectedWorkItem && (
      <Sheet open={!!selectedWorkItem} onOpenChange={(open) => !open && setSelectedWorkItem(null)}>
        <SheetContent className="p-0 flex h-dvh sm:h-screen w-full sm:w-[500px]">
          <div className="flex flex-col min-h-0 w-full">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  selectedWorkItem.status === 'Completed' && "bg-green-500",
                  selectedWorkItem.status === 'In Progress' && "bg-blue-500",
                  selectedWorkItem.status === 'Stuck' && "bg-yellow-500",
                  selectedWorkItem.status === 'Ready' && "bg-gray-400"
                )} />
                <h3 className="text-sm font-semibold truncate">{selectedWorkItem.title}</h3>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-xs">Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedWorkItem.description || 'No description provided'}
                  </p>
                </div>
                
                <div>
                  <Label className="text-xs">Status</Label>
                  <div className="mt-1">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "cursor-pointer text-sm px-3 py-1 hover:opacity-80 transition-opacity",
                        selectedWorkItem.status === 'Completed' && "bg-green-50 text-green-700 border-green-200",
                        selectedWorkItem.status === 'In Progress' && "bg-blue-50 text-blue-700 border-blue-200",
                        selectedWorkItem.status === 'Stuck' && "bg-yellow-50 text-yellow-700 border-yellow-200",
                        (!selectedWorkItem.status || selectedWorkItem.status === 'Ready' || selectedWorkItem.status === 'Planning') && "bg-gray-50 text-gray-700 border-gray-200"
                      )}
                      onClick={() => {
                        // Cycle through statuses
                        const statuses = ['Ready', 'In Progress', 'Stuck', 'Completed'];
                        const currentIndex = statuses.indexOf(selectedWorkItem.status || 'Ready');
                        const nextIndex = (currentIndex + 1) % statuses.length;
                        const newStatus = statuses[nextIndex];
                        handleStatusChange(selectedWorkItem.id, newStatus);
                        setSelectedWorkItem({ ...selectedWorkItem, status: newStatus });
                      }}
                    >
                      {selectedWorkItem.status || 'Ready'}
                    </Badge>
                  </div>
                </div>

                {selectedWorkItem.assignee && (
                  <div>
                    <Label className="text-xs">Assignee</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedWorkItem.assignee}</p>
                  </div>
                )}

                {selectedWorkItem.dueDate && (
                  <div>
                    <Label className="text-xs">Due Date</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(selectedWorkItem.dueDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
                
                <div>
                  <Label className="text-xs">Quick Actions</Label>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusChange(selectedWorkItem.id, 'Completed')}
                      disabled={selectedWorkItem.status === 'Completed'}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Complete
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusChange(selectedWorkItem.id, 'Stuck')}
                      disabled={selectedWorkItem.status === 'Stuck'}
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Mark Stuck
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )}
    </>
  );
}