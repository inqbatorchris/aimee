import { useState, useMemo, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  User,
  Plus,
  Settings,
  LayoutGrid,
  List,
  GanttChart,
  CalendarDays,
  Layers,
  CheckSquare,
  CheckCircle2,
  Clock,
  Umbrella,
  ExternalLink,
  Save,
  Loader2,
  MapPin,
  Building2,
  Users,
  Paperclip,
  Link2,
  FolderOpen,
  X,
  Trash2
} from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  differenceInDays,
  parseISO
} from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  type: 'splynx_task' | 'work_item' | 'holiday' | 'public_holiday' | 'block' | 'booking';
  color?: string;
  userId?: number;
  userName?: string;
  splynxAdminId?: number;
  status?: string;
  source?: string;
  metadata?: any;
}

interface ApiCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  type: 'splynx_task' | 'work_item' | 'holiday' | 'public_holiday' | 'block' | 'booking';
  color: string;
  userId?: number;
  userName?: string;
  splynxAdminId?: number;
  status?: string;
  source: string;
  metadata?: any;
}

interface CalendarCombinedResponse {
  success: boolean;
  events: ApiCalendarEvent[];
  metadata: {
    range: { startDate: string; endDate: string };
    lastSync: string;
    counts: {
      splynxTasks: number;
      workItems: number;
      holidays: number;
      publicHolidays: number;
      blocks: number;
    };
    totalEvents: number;
    errors?: string[];
    splynxLastSync?: string;
    splynxError?: string;
  };
}

interface CalendarFiltersResponse {
  success: boolean;
  filters: {
    localTeams: Array<{ id: number; name: string; source: string }>;
    splynxTeams: Array<{ id: number; splynxTeamId: number; name: string; color: string; memberIds: number[]; source: string; lastSynced: string }>;
    localUsers: Array<{ id: number; name: string; email: string; isActive: boolean; source: string; splynxAdminId?: number }>;
    splynxAdmins: Array<{ id: number; splynxAdminId: number; name: string; email: string; isActive: boolean; source: string; lastSynced: string }>;
    teamMemberships: Array<{ teamId: number; userId: number; role: string }>;
    dataSources: string[];
  };
}

type ViewMode = 'month' | 'week' | 'day' | 'roadmap';

const eventTypeColors: Record<string, string> = {
  splynx_task: 'bg-blue-500 text-white',
  work_item: 'bg-purple-500 text-white',
  holiday: 'bg-green-500 text-white',
  public_holiday: 'bg-emerald-500 text-white',
  block: 'bg-orange-500 text-white',
  booking: 'bg-cyan-500 text-white',
};

const eventTypeBgColors: Record<string, string> = {
  splynx_task: 'bg-blue-100 text-blue-800 border-blue-200',
  work_item: 'bg-purple-100 text-purple-800 border-purple-200',
  holiday: 'bg-green-100 text-green-800 border-green-200',
  public_holiday: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  block: 'bg-orange-100 text-orange-800 border-orange-200',
  booking: 'bg-cyan-100 text-cyan-800 border-cyan-200',
};

const statusColors: Record<string, string> = {
  Planning: 'bg-gray-100 text-gray-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  Done: 'bg-green-100 text-green-800',
  Blocked: 'bg-red-100 text-red-800',
};

// Helper to load calendar settings from localStorage
const loadCalendarSettings = () => {
  try {
    const saved = localStorage.getItem('calendarSettings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load calendar settings:', e);
  }
  return null;
};

export default function CalendarPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Load persisted settings on mount
  const savedSettings = useMemo(() => loadCalendarSettings(), []);
  
  const [currentDate, setCurrentDate] = useState(() => {
    if (savedSettings?.currentDate) {
      const saved = new Date(savedSettings.currentDate);
      return isNaN(saved.getTime()) ? new Date() : saved;
    }
    return new Date();
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => savedSettings?.viewMode || 'month');
  const [selectedUserId, setSelectedUserId] = useState<string>(() => savedSettings?.selectedUserId || 'all');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(() => savedSettings?.selectedTeamId || 'all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => savedSettings?.selectedProjectId || 'all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showHolidayDialog, setShowHolidayDialog] = useState(false);
  const [createMenuDay, setCreateMenuDay] = useState<Date | null>(null);
  const [createMenuPosition, setCreateMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [isEditingBlock, setIsEditingBlock] = useState(false);
  const [blockEditForm, setBlockEditForm] = useState<{
    id: string;
    title: string;
    description: string;
    blockType: 'meeting' | 'focus' | 'project' | 'travel' | 'break' | 'other';
    startDatetime: string;
    endDatetime: string;
  } | null>(null);
  
  // Drag-and-drop state
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [resizingEvent, setResizingEvent] = useState<CalendarEvent | null>(null);
  const [resizeEdge, setResizeEdge] = useState<'start' | 'end' | null>(null);
  
  const [hiddenEventTypes, setHiddenEventTypes] = useState<Set<string>>(() => {
    const saved = savedSettings?.hiddenEventTypes;
    return saved ? new Set(saved) : new Set();
  });
  const [showWeekends, setShowWeekends] = useState(() => savedSettings?.showWeekends !== false);
  
  // Persist calendar settings to localStorage
  useEffect(() => {
    const settings = {
      viewMode,
      selectedUserId,
      selectedTeamId,
      selectedProjectId,
      hiddenEventTypes: Array.from(hiddenEventTypes),
      showWeekends,
      currentDate: currentDate.toISOString(),
    };
    localStorage.setItem('calendarSettings', JSON.stringify(settings));
  }, [viewMode, selectedUserId, selectedTeamId, selectedProjectId, hiddenEventTypes, showWeekends, currentDate]);
  
  const toggleEventTypeVisibility = (type: string) => {
    setHiddenEventTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };
  
  const [blockForm, setBlockForm] = useState({
    title: '',
    description: '',
    blockType: 'other' as 'meeting' | 'focus' | 'project' | 'travel' | 'break' | 'other',
    startDatetime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endDatetime: format(addDays(new Date(), 0), "yyyy-MM-dd'T'17:00"),
    isAllDay: false,
    syncToSplynx: false,
    splynxProjectId: null as number | null,
    splynxTeamId: null as number | null,
  });
  
  const [holidayForm, setHolidayForm] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    holidayType: 'annual' as 'annual' | 'sick' | 'unpaid' | 'training' | 'compassionate' | 'parental' | 'other',
    notes: '',
    isHalfDayStart: false,
    isHalfDayEnd: false,
  });
  
  const [splynxTaskEdit, setSplynxTaskEdit] = useState<{
    title: string;
    description: string;
    location: string;
    scheduled_date: string;
    scheduled_time: string;
    scheduled_end_time: string;
    assigned_to: number;
    team_id: number;
    project_id: number;
    workflow_status_id: number;
  } | null>(null);

  const createBlockMutation = useMutation({
    mutationFn: async (data: typeof blockForm) => {
      return apiRequest('/api/calendar/blocks', {
        method: 'POST',
        body: {
          ...data,
          blocksAvailability: true,
        },
      });
    },
    onSuccess: (response: any) => {
      toast({ 
        title: response.splynxSynced 
          ? 'Calendar block created and synced to Splynx' 
          : 'Calendar block created successfully' 
      });
      setShowBlockDialog(false);
      setBlockForm({
        title: '',
        description: '',
        blockType: 'other',
        startDatetime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endDatetime: format(new Date(), "yyyy-MM-dd'T'17:00"),
        isAllDay: false,
        syncToSplynx: false,
        splynxProjectId: null,
        splynxTeamId: null,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/combined'] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create block', description: error.message, variant: 'destructive' });
    },
  });

  const updateBlockMutation = useMutation({
    mutationFn: async (data: { id: string; updates: { title?: string; description?: string; blockType?: string; startDatetime?: string; endDatetime?: string } }) => {
      return apiRequest(`/api/calendar/blocks/${data.id}`, {
        method: 'PATCH',
        body: data.updates,
      });
    },
    onSuccess: () => {
      toast({ title: 'Calendar block updated successfully' });
      setIsEditingBlock(false);
      setBlockEditForm(null);
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/combined'] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update block', description: error.message, variant: 'destructive' });
    },
  });

  const createHolidayMutation = useMutation({
    mutationFn: async (data: typeof holidayForm) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      let daysCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (data.isHalfDayStart) daysCount -= 0.5;
      if (data.isHalfDayEnd) daysCount -= 0.5;
      
      return apiRequest('/api/calendar/holidays/requests', {
        method: 'POST',
        body: {
          ...data,
          daysCount,
        },
      });
    },
    onSuccess: () => {
      toast({ title: 'Holiday request submitted successfully' });
      setShowHolidayDialog(false);
      setHolidayForm({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        holidayType: 'annual',
        notes: '',
        isHalfDayStart: false,
        isHalfDayEnd: false,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/combined'] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to submit request', description: error.message, variant: 'destructive' });
    },
  });

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleCloseEventDetail = () => {
    setSelectedEvent(null);
    setSplynxTaskEdit(null);
    setIsEditingBlock(false);
    setBlockEditForm(null);
  };

  const handleDayClick = (day: Date, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
      setCreateMenuDay(day);
      setCreateMenuPosition({ x: event.clientX, y: event.clientY });
    } else {
      setCurrentDate(day);
      setViewMode('day');
    }
  };

  const handleCreateBlockForDay = (day: Date) => {
    setBlockForm(prev => ({
      ...prev,
      startDatetime: format(day, "yyyy-MM-dd'T'09:00"),
      endDatetime: format(day, "yyyy-MM-dd'T'17:00"),
    }));
    setCreateMenuDay(null);
    setCreateMenuPosition(null);
    setShowBlockDialog(true);
  };

  const handleCreateHolidayForDay = (day: Date) => {
    setHolidayForm(prev => ({
      ...prev,
      startDate: format(day, 'yyyy-MM-dd'),
      endDate: format(day, 'yyyy-MM-dd'),
    }));
    setCreateMenuDay(null);
    setCreateMenuPosition(null);
    setShowHolidayDialog(true);
  };

  const handleViewDayDetails = (day: Date) => {
    setCreateMenuDay(null);
    setCreateMenuPosition(null);
    setCurrentDate(day);
    setViewMode('day');
  };

  const handleSlotClick = (day: Date, hour: number, event: React.MouseEvent) => {
    event.stopPropagation();
    // Set the time for the block form based on the clicked slot
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endHour = Math.min(hour + 1, 21);
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;
    
    setBlockForm(prev => ({
      ...prev,
      startDatetime: `${format(day, 'yyyy-MM-dd')}T${startTime}`,
      endDatetime: `${format(day, 'yyyy-MM-dd')}T${endTime}`,
    }));
    
    setCreateMenuDay(day);
    setCreateMenuPosition({ x: event.clientX, y: event.clientY });
  };

  const handleNavigateToEvent = (event: CalendarEvent) => {
    if (event.metadata?.workItemId) {
      // Navigate to work item detail view with workflow tab if there's a workflow template
      const hasWorkflow = event.metadata?.workflowTemplateId || event.type === 'holiday';
      const tab = hasWorkflow ? 'workflow' : 'details';
      navigate(`/strategy/work-items?panel=workItem&mode=view&id=${event.metadata.workItemId}&tab=${tab}`);
    }
  };

  // Drag-and-drop handlers
  const handleDragStart = (event: CalendarEvent) => {
    // Only allow dragging for editable event types
    const draggableTypes = ['splynx_task', 'block', 'booking', 'work_item'];
    if (!draggableTypes.includes(event.type)) return;
    setDraggedEvent(event);
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
  };

  const moveEventMutation = useMutation({
    mutationFn: async ({ event, newDate, newHour }: { event: CalendarEvent; newDate: Date; newHour?: number }) => {
      const eventType = event.type;
      
      // Create new start - if newHour provided, use it; otherwise preserve original time
      const createNewStart = () => {
        const newStart = new Date(newDate.getTime()); // Clone to avoid mutating original
        if (newHour !== undefined) {
          newStart.setHours(newHour, 0, 0, 0);
        } else {
          newStart.setHours(event.start.getHours(), event.start.getMinutes(), event.start.getSeconds(), 0);
        }
        return newStart;
      };
      
      if (eventType === 'splynx_task') {
        const taskId = event.id.replace('splynx-task-', '');
        const newStart = createNewStart();
        const newScheduledFrom = format(newStart, 'yyyy-MM-dd HH:mm:ss');
        
        return apiRequest(`/api/calendar/splynx/tasks/${taskId}`, {
          method: 'PUT',
          body: { scheduled_from: newScheduledFrom },
        });
      } else if (eventType === 'block') {
        const blockId = event.id.replace('block-', '');
        const duration = event.end.getTime() - event.start.getTime();
        const newStart = createNewStart();
        const newEnd = new Date(newStart.getTime() + duration);
        
        return apiRequest(`/api/calendar/blocks/${blockId}`, {
          method: 'PATCH',
          body: {
            startDatetime: format(newStart, "yyyy-MM-dd'T'HH:mm"),
            endDatetime: format(newEnd, "yyyy-MM-dd'T'HH:mm"),
          },
        });
      } else if (eventType === 'work_item' && event.metadata?.workItemId) {
        return apiRequest(`/api/work-items/${event.metadata.workItemId}`, {
          method: 'PATCH',
          body: { dueDate: format(newDate, 'yyyy-MM-dd') },
        });
      } else if (eventType === 'booking' && event.metadata?.bookingId) {
        const duration = event.end.getTime() - event.start.getTime();
        const newStart = createNewStart();
        const newEnd = new Date(newStart.getTime() + duration);
        
        // Use local datetime format to avoid timezone conversion issues
        return apiRequest(`/api/bookings/appointments/${event.metadata.bookingId}`, {
          method: 'PATCH',
          body: {
            scheduledStart: format(newStart, "yyyy-MM-dd'T'HH:mm:ss"),
            scheduledEnd: format(newEnd, "yyyy-MM-dd'T'HH:mm:ss"),
          },
        });
      }
      
      throw new Error('Cannot move this event type');
    },
    onSuccess: (_, { event }) => {
      toast({ title: `${event.title} moved successfully` });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/combined'] });
      setDraggedEvent(null);
    },
    onError: (error: any) => {
      toast({ title: 'Failed to move event', description: error.message, variant: 'destructive' });
      setDraggedEvent(null);
    },
  });

  const handleEventDrop = (newDate: Date) => {
    if (!draggedEvent) return;
    moveEventMutation.mutate({ event: draggedEvent, newDate });
  };

  const handleEventDropWithHour = (newDate: Date, hour: number) => {
    if (!draggedEvent) return;
    moveEventMutation.mutate({ event: draggedEvent, newDate, newHour: hour });
  };

  // Resize event mutation
  const resizeEventMutation = useMutation({
    mutationFn: async ({ event, newStart, newEnd }: { event: CalendarEvent; newStart?: Date; newEnd?: Date }) => {
      const eventType = event.type;
      const finalStart = newStart || event.start;
      const finalEnd = newEnd || event.end;
      
      // Validate minimum duration (15 minutes)
      const minDuration = 15 * 60 * 1000;
      if (finalEnd.getTime() - finalStart.getTime() < minDuration) {
        throw new Error('Event must be at least 15 minutes long');
      }
      
      if (eventType === 'splynx_task') {
        const taskId = event.id.replace('splynx-task-', '');
        
        // Splynx uses formatted_duration ("Xh Ym" format), NOT scheduled_to
        const durationMs = finalEnd.getTime() - finalStart.getTime();
        const totalMinutes = Math.round(durationMs / 60000);
        const durationHours = Math.floor(totalMinutes / 60);
        const durationMins = totalMinutes % 60;
        const formattedDuration = durationMins > 0 
          ? `${durationHours}h ${durationMins}m`
          : `${durationHours}h`;
        
        const body: Record<string, string> = {
          scheduled_from: format(finalStart, 'yyyy-MM-dd HH:mm:ss'),
          formatted_duration: formattedDuration,
        };
        
        console.log('[CALENDAR RESIZE] Updating Splynx task:', { taskId, ...body });
        
        return apiRequest(`/api/calendar/splynx/tasks/${taskId}`, {
          method: 'PUT',
          body,
        });
      } else if (eventType === 'block') {
        const blockId = event.id.replace('block-', '');
        return apiRequest(`/api/calendar/blocks/${blockId}`, {
          method: 'PATCH',
          body: {
            startDatetime: format(finalStart, "yyyy-MM-dd'T'HH:mm"),
            endDatetime: format(finalEnd, "yyyy-MM-dd'T'HH:mm"),
          },
        });
      } else if (eventType === 'booking' && event.metadata?.bookingId) {
        return apiRequest(`/api/bookings/appointments/${event.metadata.bookingId}`, {
          method: 'PATCH',
          body: {
            scheduledStart: format(finalStart, "yyyy-MM-dd'T'HH:mm:ss"),
            scheduledEnd: format(finalEnd, "yyyy-MM-dd'T'HH:mm:ss"),
          },
        });
      }
      
      throw new Error('Cannot resize this event type');
    },
    onSuccess: (_, { event }) => {
      toast({ title: `${event.title} duration updated` });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/combined'] });
      setResizingEvent(null);
      setResizeEdge(null);
    },
    onError: (error: any) => {
      toast({ title: 'Failed to resize event', description: error.message, variant: 'destructive' });
      setResizingEvent(null);
      setResizeEdge(null);
    },
  });

  const handleResizeStart = (event: CalendarEvent, edge: 'start' | 'end') => {
    const resizableTypes = ['splynx_task', 'block', 'booking'];
    if (!resizableTypes.includes(event.type)) return;
    setResizingEvent(event);
    setResizeEdge(edge);
  };

  const handleResizeEnd = () => {
    setResizingEvent(null);
    setResizeEdge(null);
  };

  const handleResizeDrop = (newTime: Date) => {
    if (!resizingEvent || !resizeEdge) return;
    
    if (resizeEdge === 'start') {
      resizeEventMutation.mutate({ event: resizingEvent, newStart: newTime });
    } else {
      resizeEventMutation.mutate({ event: resizingEvent, newEnd: newTime });
    }
  };

  const handleResizeDropWithHour = (newDate: Date, hour: number) => {
    if (!resizingEvent || !resizeEdge) return;
    
    const newTime = new Date(newDate.getTime());
    newTime.setHours(hour, 0, 0, 0);
    
    if (resizeEdge === 'start') {
      resizeEventMutation.mutate({ event: resizingEvent, newStart: newTime });
    } else {
      resizeEventMutation.mutate({ event: resizingEvent, newEnd: newTime });
    }
  };

  const splynxTaskId = selectedEvent?.type === 'splynx_task' 
    ? selectedEvent.id.replace('splynx-task-', '') 
    : null;

  const { data: splynxTaskDetail, isLoading: isLoadingTaskDetail } = useQuery<{
    success: boolean;
    task: any;
    customer: { id: number; name: string; email: string; phone: string; status: string; address: string } | null;
  }>({
    queryKey: ['/api/calendar/splynx/tasks', splynxTaskId],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/splynx/tasks/${splynxTaskId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch task details');
      return response.json();
    },
    enabled: !!splynxTaskId,
  });

  const updateSplynxTaskMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      return apiRequest(`/api/calendar/splynx/tasks/${splynxTaskId}`, {
        method: 'PUT',
        body: updates,
      });
    },
    onSuccess: () => {
      toast({ title: 'Task updated and synced to Splynx' });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/combined'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/splynx/tasks', splynxTaskId] });
      setSplynxTaskEdit(null);
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update task', description: error.message, variant: 'destructive' });
    },
  });

  const initSplynxTaskEdit = () => {
    if (splynxTaskDetail?.task) {
      const task = splynxTaskDetail.task;
      // Splynx assignment model:
      // - assigned_to: enum ('assigned_to_anyone', 'assigned_to_administrator', 'assigned_to_team')
      // - assignee: the ID (interpretation depends on assigned_to)
      const assignedTo = task.assigned_to;
      const assigneeValue = task.assignee || 0;
      let derivedTeamId = 0;
      let derivedAdminId = 0;
      
      if (assignedTo === 'assigned_to_team') {
        // assignee IS the team ID directly
        derivedTeamId = Number(assigneeValue);
      } else if (assignedTo === 'assigned_to_administrator' && assigneeValue && filtersData?.filters?.splynxTeams) {
        // assignee is admin ID - derive team from membership
        derivedAdminId = Number(assigneeValue);
        for (const team of filtersData.filters.splynxTeams) {
          const normalizedMemberIds = team.memberIds ? team.memberIds.map(Number) : [];
          if (normalizedMemberIds.includes(derivedAdminId)) {
            derivedTeamId = team.splynxTeamId;
            break;
          }
        }
      }
      
      // Parse scheduled_from datetime (format: "2025-12-09 13:00:00")
      let scheduledDate = '';
      let scheduledTime = '';
      let scheduledEndTime = '';
      if (task.scheduled_from) {
        const parts = task.scheduled_from.split(' ');
        if (parts[0]) scheduledDate = parts[0]; // yyyy-mm-dd
        if (parts[1]) scheduledTime = parts[1].substring(0, 5); // hh:mm
      }
      // Calculate end time from formatted_duration ("Xh Ym" format like "8h 30m")
      // Splynx uses formatted_duration, NOT scheduled_to
      if (task.scheduled_from && task.formatted_duration) {
        const startDate = new Date(task.scheduled_from.replace(' ', 'T'));
        // Parse formatted_duration like "8h 30m" or "2h"
        const durationMatch = task.formatted_duration.match(/(\d+)h(?:\s*(\d+)m)?/);
        if (durationMatch) {
          const hours = parseInt(durationMatch[1]) || 0;
          const mins = parseInt(durationMatch[2]) || 0;
          const durationMs = (hours * 60 + mins) * 60000;
          const endDate = new Date(startDate.getTime() + durationMs);
          scheduledEndTime = format(endDate, 'HH:mm');
        }
      }
      
      setSplynxTaskEdit({
        title: task.title || '',
        description: task.description || '',
        location: task.address || '',
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        scheduled_end_time: scheduledEndTime,
        assigned_to: derivedAdminId,
        team_id: derivedTeamId,
        project_id: task.project_id || 0,
        workflow_status_id: task.workflow_status_id || 0,
      });
    }
  };

  const handleSaveSplynxTask = () => {
    if (!splynxTaskEdit) return;
    const payload: Record<string, any> = {};
    if (splynxTaskEdit.title) payload.title = splynxTaskEdit.title;
    if (splynxTaskEdit.description !== undefined) payload.description = splynxTaskEdit.description;
    if (splynxTaskEdit.location) payload.address = splynxTaskEdit.location; // Splynx uses 'address' field
    // Combine date and time into scheduled_from format
    if (splynxTaskEdit.scheduled_date) {
      const startTime = splynxTaskEdit.scheduled_time || '00:00';
      payload.scheduled_from = `${splynxTaskEdit.scheduled_date} ${startTime}:00`;
      
      // Splynx uses formatted_duration ("Xh Ym" format), NOT scheduled_to
      if (splynxTaskEdit.scheduled_end_time && splynxTaskEdit.scheduled_time) {
        const [startHour, startMin] = splynxTaskEdit.scheduled_time.split(':').map(Number);
        const [endHour, endMin] = splynxTaskEdit.scheduled_end_time.split(':').map(Number);
        const startTotalMins = startHour * 60 + startMin;
        const endTotalMins = endHour * 60 + endMin;
        const durationMins = endTotalMins - startTotalMins;
        
        if (durationMins > 0) {
          const durationHours = Math.floor(durationMins / 60);
          const remainingMins = durationMins % 60;
          payload.formatted_duration = remainingMins > 0 
            ? `${durationHours}h ${remainingMins}m`
            : `${durationHours}h`;
        }
      }
    }
    
    // Handle assignment - Splynx requires 'assigned_to' type, 'assignee' value, AND 'team_id' for team assignments
    // Priority: If team is set, assign to team. Otherwise assign to individual admin.
    if (splynxTaskEdit.team_id && splynxTaskEdit.team_id > 0) {
      payload.assigned_to = 'assigned_to_team';
      payload.assignee = splynxTaskEdit.team_id;
      payload.team_id = splynxTaskEdit.team_id; // Splynx also requires team_id field
    } else if (splynxTaskEdit.assigned_to && splynxTaskEdit.assigned_to > 0) {
      payload.assigned_to = 'assigned_to_administrator';
      payload.assignee = splynxTaskEdit.assigned_to;
    }
    
    if (splynxTaskEdit.project_id && splynxTaskEdit.project_id > 0) payload.project_id = splynxTaskEdit.project_id;
    if (splynxTaskEdit.workflow_status_id && splynxTaskEdit.workflow_status_id > 0) payload.workflow_status_id = splynxTaskEdit.workflow_status_id;
    updateSplynxTaskMutation.mutate(payload);
  };

  const startDate = useMemo(() => {
    if (viewMode === 'roadmap') {
      return format(startOfMonth(currentDate), 'yyyy-MM-dd');
    } else if (viewMode === 'month') {
      return format(startOfWeek(startOfMonth(currentDate)), 'yyyy-MM-dd');
    } else if (viewMode === 'week') {
      return format(startOfWeek(currentDate), 'yyyy-MM-dd');
    } else {
      return format(startOfDay(currentDate), 'yyyy-MM-dd');
    }
  }, [currentDate, viewMode]);

  const endDate = useMemo(() => {
    if (viewMode === 'roadmap') {
      return format(endOfMonth(addMonths(currentDate, 2)), 'yyyy-MM-dd');
    } else if (viewMode === 'month') {
      return format(endOfWeek(endOfMonth(currentDate)), 'yyyy-MM-dd');
    } else if (viewMode === 'week') {
      return format(endOfWeek(currentDate), 'yyyy-MM-dd');
    } else {
      return format(endOfDay(currentDate), 'yyyy-MM-dd');
    }
  }, [currentDate, viewMode]);

  const { data: filtersData } = useQuery<CalendarFiltersResponse>({
    queryKey: ['/api/calendar/filters'],
    queryFn: async () => {
      const response = await fetch('/api/calendar/filters', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch filters');
      return response.json();
    },
  });

  // Auto-open in edit mode when task details load
  // Wait for both task details AND filters data (for team derivation)
  useEffect(() => {
    if (splynxTaskDetail?.task && filtersData?.filters?.splynxTeams && !splynxTaskEdit) {
      initSplynxTaskEdit();
    }
  }, [splynxTaskDetail, filtersData]);

  const { data: calendarData, isLoading } = useQuery<CalendarCombinedResponse>({
    queryKey: ['/api/calendar/combined', startDate, endDate, selectedUserId, selectedTeamId, selectedProjectId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        includeHolidays: 'true',
        includeBlocks: 'true',
        includeWorkItems: 'true',
        includeSplynxTasks: 'true',
      });
      if (selectedUserId !== 'all') {
        params.append('userIds', selectedUserId);
      }
      if (selectedTeamId !== 'all') {
        params.append('teamIds', selectedTeamId);
      }
      if (selectedProjectId !== 'all') {
        params.append('projectId', selectedProjectId);
      }
      const response = await fetch(`/api/calendar/combined?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch calendar data');
      return response.json();
    },
  });

  const teams = useMemo(() => {
    if (!filtersData?.filters) return [];
    return filtersData.filters.localTeams;
  }, [filtersData]);

  const teamMembers = useMemo(() => {
    if (!filtersData?.filters) return [];
    return filtersData.filters.localUsers.map(u => ({
      id: u.id,
      fullName: u.name,
      email: u.email,
    }));
  }, [filtersData]);

  const filteredTeamMembers = useMemo(() => {
    if (selectedTeamId === 'all') return teamMembers;
    const teamId = parseInt(selectedTeamId);
    const teamMemberIds = filtersData?.filters.teamMemberships
      .filter(m => m.teamId === teamId)
      .map(m => m.userId) || [];
    return teamMembers.filter(u => teamMemberIds.includes(u.id));
  }, [teamMembers, selectedTeamId, filtersData]);

  const events = useMemo(() => {
    if (!calendarData?.events) return [];
    
    return calendarData.events
      .filter((evt) => {
        if (hiddenEventTypes.has('splynx') && (evt.type === 'splynx_task' || evt.type === 'booking')) return false;
        if (hiddenEventTypes.has('work') && evt.type === 'work_item') return false;
        if (hiddenEventTypes.has('leave') && (evt.type === 'holiday' || evt.type === 'public_holiday')) return false;
        if (hiddenEventTypes.has('block') && evt.type === 'block') return false;
        
        // Client-side project filtering for Splynx tasks
        if (selectedProjectId !== 'all' && evt.type === 'splynx_task') {
          const taskProjectId = evt.metadata?.projectId;
          if (selectedProjectId === 'none') {
            // Show only tasks with no project
            if (taskProjectId && taskProjectId !== 0) return false;
          } else {
            // Show only tasks matching the selected project
            if (String(taskProjectId) !== selectedProjectId) return false;
          }
        }
        
        return true;
      })
      .map((evt): CalendarEvent => ({
        id: evt.id,
        title: evt.title,
        start: evt.start ? new Date(evt.start) : new Date(),
        end: evt.end ? new Date(evt.end) : new Date(),
        allDay: evt.allDay,
        type: evt.type,
        color: evt.color,
        userId: evt.userId,
        userName: evt.userName,
        splynxAdminId: evt.splynxAdminId,
        status: evt.status,
        source: evt.source,
        metadata: evt.metadata,
      }));
  }, [calendarData, hiddenEventTypes, selectedProjectId]);

  const days = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      const allDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
      if (!showWeekends) {
        return allDays.filter(day => {
          const dayOfWeek = day.getDay();
          return dayOfWeek !== 0 && dayOfWeek !== 6;
        });
      }
      return allDays;
    } else {
      return [currentDate];
    }
  }, [currentDate, viewMode, showWeekends]);

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });
  };

  const handleNavigatePrevious = () => {
    if (viewMode === 'month' || viewMode === 'roadmap') {
      setCurrentDate(prev => subMonths(prev, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(prev => subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => subDays(prev, 1));
    }
  };

  const handleNavigateNext = () => {
    if (viewMode === 'month' || viewMode === 'roadmap') {
      setCurrentDate(prev => addMonths(prev, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(prev => addWeeks(prev, 1));
    } else {
      setCurrentDate(prev => addDays(prev, 1));
    }
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const getDateRangeLabel = () => {
    if (viewMode === 'roadmap') {
      const endMonth = addMonths(currentDate, 2);
      return `${format(currentDate, 'MMM')} - ${format(endMonth, 'MMM yyyy')}`;
    } else if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy');
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    }
  };

  const workingHours = Array.from({ length: 16 }, (_, i) => i + 6);

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background border-b px-2 sm:px-4 py-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={handleNavigatePrevious}
              data-testid="button-previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={handleNavigateNext}
              data-testid="button-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleGoToToday}
              className="h-8"
              data-testid="button-today"
            >
              Today
            </Button>
            
            <span className="text-sm sm:text-base font-semibold ml-2 truncate" data-testid="text-date-range">
              {getDateRangeLabel()}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate('/settings/calendar')}
              data-testid="button-calendar-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" className="h-8 w-8" data-testid="button-add-event">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => navigate('/strategy/work-items?create=true')}
                  data-testid="menu-add-work-item"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Work Item
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowBlockDialog(true)}
                  data-testid="menu-add-block"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Calendar Block
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowHolidayDialog(true)}
                  data-testid="menu-add-holiday"
                >
                  <Umbrella className="h-4 w-4 mr-2" />
                  Holiday Request
                </DropdownMenuItem>
                              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Select value={selectedTeamId} onValueChange={(value) => {
              setSelectedTeamId(value);
              if (value !== 'all') setSelectedUserId('all');
            }}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-8" data-testid="select-team-filter">
                <Layers className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Team..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {teams.map((team: any) => (
                  <SelectItem key={team.id} value={String(team.id)}>
                    {team.name}
                    {team.linkedSplynxTeamName && (
                      <span className="text-muted-foreground text-xs ml-1">
                        → {team.linkedSplynxTeamName}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-8" data-testid="select-user-filter">
                <User className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="User..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                {filteredTeamMembers.map((member) => (
                  <SelectItem key={member.id} value={String(member.id)}>
                    {member.fullName || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[120px] sm:w-[160px] h-8" data-testid="select-project-filter">
                <FolderOpen className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                <SelectItem value="none">No project</SelectItem>
                {(filtersData?.filters as any)?.splynxProjects?.map((project: any) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center border rounded-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={viewMode === 'month' ? 'secondary' : 'ghost'} 
                  size="icon"
                  className="h-8 w-8 rounded-none rounded-l-md"
                  onClick={() => setViewMode('month')}
                  data-testid="tab-month"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Month</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={viewMode === 'week' ? 'secondary' : 'ghost'} 
                  size="icon"
                  className="h-8 w-8 rounded-none border-x"
                  onClick={() => setViewMode('week')}
                  data-testid="tab-week"
                  >
                    <CalendarDays className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Week</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={viewMode === 'day' ? 'secondary' : 'ghost'} 
                    size="icon"
                    className="h-8 w-8 rounded-none border-r"
                    onClick={() => setViewMode('day')}
                    data-testid="tab-day"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Day</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={viewMode === 'roadmap' ? 'secondary' : 'ghost'} 
                    size="icon"
                    className="h-8 w-8 rounded-none rounded-r-md"
                    onClick={() => setViewMode('roadmap')}
                    data-testid="tab-roadmap"
                  >
                    <GanttChart className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Roadmap</TooltipContent>
              </Tooltip>
            </div>

            {viewMode === 'week' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showWeekends ? 'ghost' : 'secondary'}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setShowWeekends(!showWeekends)}
                    data-testid="toggle-weekends"
                  >
                    {showWeekends ? 'Hide Weekends' : 'Show Weekends'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{showWeekends ? 'Hide Saturday and Sunday' : 'Show Saturday and Sunday'}</TooltipContent>
              </Tooltip>
            )}

            <div className="hidden sm:flex items-center gap-1 text-xs">
              <button
                onClick={() => toggleEventTypeVisibility('splynx')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all cursor-pointer hover:bg-muted ${
                  hiddenEventTypes.has('splynx') 
                    ? 'opacity-40 line-through text-muted-foreground' 
                    : 'text-foreground'
                }`}
                data-testid="filter-toggle-splynx"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${hiddenEventTypes.has('splynx') ? 'bg-gray-400' : 'bg-blue-500'}`} />
                <span>Splynx</span>
              </button>
              <button
                onClick={() => toggleEventTypeVisibility('work')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all cursor-pointer hover:bg-muted ${
                  hiddenEventTypes.has('work') 
                    ? 'opacity-40 line-through text-muted-foreground' 
                    : 'text-foreground'
                }`}
                data-testid="filter-toggle-work"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${hiddenEventTypes.has('work') ? 'bg-gray-400' : 'bg-purple-500'}`} />
                <span>Work</span>
              </button>
              <button
                onClick={() => toggleEventTypeVisibility('leave')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all cursor-pointer hover:bg-muted ${
                  hiddenEventTypes.has('leave') 
                    ? 'opacity-40 line-through text-muted-foreground' 
                    : 'text-foreground'
                }`}
                data-testid="filter-toggle-leave"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${hiddenEventTypes.has('leave') ? 'bg-gray-400' : 'bg-green-500'}`} />
                <span>Leave</span>
              </button>
              <button
                onClick={() => toggleEventTypeVisibility('block')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all cursor-pointer hover:bg-muted ${
                  hiddenEventTypes.has('block') 
                    ? 'opacity-40 line-through text-muted-foreground' 
                    : 'text-foreground'
                }`}
                data-testid="filter-toggle-block"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${hiddenEventTypes.has('block') ? 'bg-gray-400' : 'bg-orange-500'}`} />
                <span>Block</span>
              </button>
            </div>
          </div>
        </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-[1600px] w-full mx-auto overflow-x-hidden">
        {isLoading ? (
          <div className="p-4 grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : viewMode === 'month' ? (
          <MonthView 
            days={days} 
            currentDate={currentDate} 
            getEventsForDay={getEventsForDay}
            onEventClick={handleEventClick}
            onDayClick={handleDayClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onEventDrop={handleEventDrop}
            draggedEvent={draggedEvent}
          />
        ) : viewMode === 'week' ? (
          <WeekView 
            days={days} 
            events={events}
            hours={workingHours}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onEventDrop={handleEventDropWithHour}
            draggedEvent={draggedEvent}
            onResizeStart={handleResizeStart}
            onResizeEnd={handleResizeEnd}
            onResizeDrop={handleResizeDropWithHour}
            resizingEvent={resizingEvent}
            resizeEdge={resizeEdge}
          />
        ) : viewMode === 'roadmap' ? (
          <RoadmapView
            events={events}
            currentDate={currentDate}
            teamMembers={teamMembers || []}
          />
        ) : (
          <DayView 
            day={currentDate} 
            events={getEventsForDay(currentDate)}
            hours={workingHours}
            onSlotClick={handleSlotClick}
            onEventClick={handleEventClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onEventDrop={handleEventDropWithHour}
            draggedEvent={draggedEvent}
            onResizeStart={handleResizeStart}
            onResizeEnd={handleResizeEnd}
            onResizeDrop={handleResizeDropWithHour}
            resizingEvent={resizingEvent}
            resizeEdge={resizeEdge}
          />
        )}
        </div>
      </div>

      {/* Day click context menu */}
      {createMenuDay && createMenuPosition && (
        <div 
          className="fixed inset-0 z-50" 
          onClick={() => { setCreateMenuDay(null); setCreateMenuPosition(null); }}
        >
          <div 
            className="absolute bg-popover border rounded-lg shadow-lg py-1 min-w-[180px]"
            style={{ 
              left: Math.min(createMenuPosition.x, window.innerWidth - 200),
              top: Math.min(createMenuPosition.y, window.innerHeight - 200),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b">
              <div className="text-sm font-medium">{format(createMenuDay, 'EEEE, MMM d')}</div>
            </div>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
              onClick={() => handleCreateBlockForDay(createMenuDay)}
              data-testid="menu-create-block"
            >
              <Clock className="h-4 w-4 text-orange-500" />
              Add Calendar Block
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
              onClick={() => handleCreateHolidayForDay(createMenuDay)}
              data-testid="menu-create-holiday"
            >
              <Umbrella className="h-4 w-4 text-green-500" />
              Request Holiday
            </button>
            <div className="border-t my-1" />
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
              onClick={() => handleViewDayDetails(createMenuDay)}
              data-testid="menu-view-day"
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              View Day Details
            </button>
          </div>
        </div>
      )}

      <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && handleCloseEventDetail()}>
        <SheetContent className="sm:w-[640px] flex flex-col h-full p-0">
          {selectedEvent && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                <div className="flex items-center justify-between">
                  <SheetTitle className="flex items-center gap-2 text-base">
                    <div className={`w-2.5 h-2.5 rounded ${eventTypeColors[selectedEvent.type].split(' ')[0]}`} />
                    {selectedEvent.type === 'splynx_task' ? 'Splynx Task' : 
                     selectedEvent.type === 'work_item' ? 'Work Item' :
                     selectedEvent.type === 'holiday' ? 'Holiday' :
                     selectedEvent.type === 'public_holiday' ? 'Public Holiday' : 'Calendar Block'}
                  </SheetTitle>
                  {selectedEvent.type === 'splynx_task' && (splynxTaskDetail?.task?.id || splynxTaskId) && (
                    <a 
                      href={`https://manage.country-connect.co.uk/admin/scheduling/tasks/view?id=${splynxTaskDetail?.task?.id || splynxTaskId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      data-testid="link-splynx-task-header"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open in Splynx
                    </a>
                  )}
                </div>
                <SheetDescription className="sr-only">Event details panel</SheetDescription>
              </SheetHeader>
              
              <ScrollArea className="flex-1 px-6">
                <div className="py-4 space-y-4">
                {selectedEvent.type === 'splynx_task' && (
                  <div className="space-y-4 pt-2">
                    {/* Compact date/time/status header */}
                    <div className="flex items-center justify-between text-sm pb-2 border-b">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{splynxTaskDetail?.task?.scheduled_from 
                            ? format(new Date(splynxTaskDetail.task.scheduled_from.replace(' ', 'T')), 'MMM d, yyyy')
                            : format(selectedEvent.start, 'MMM d, yyyy')}</span>
                        </div>
                        {!selectedEvent.allDay && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {(() => {
                                const task = splynxTaskDetail?.task;
                                if (task?.scheduled_from && task?.formatted_duration) {
                                  const startDate = new Date(task.scheduled_from.replace(' ', 'T'));
                                  const durationMatch = task.formatted_duration.match(/(\d+)h(?:\s*(\d+)m)?/);
                                  if (durationMatch) {
                                    const hours = parseInt(durationMatch[1]) || 0;
                                    const mins = parseInt(durationMatch[2]) || 0;
                                    const endDate = new Date(startDate.getTime() + (hours * 60 + mins) * 60000);
                                    return `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
                                  }
                                }
                                return `${format(selectedEvent.start, 'h:mm a')} - ${format(selectedEvent.end, 'h:mm a')}`;
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                      {selectedEvent.status && (
                        <Badge variant="outline" className="text-xs">
                          {(() => {
                            const statusId = parseInt(selectedEvent.status);
                            if (!isNaN(statusId)) {
                              const taskStatuses = (filtersData?.filters as any)?.taskStatuses;
                              const status = taskStatuses?.find((s: any) => s.id === statusId);
                              return status?.title || selectedEvent.status;
                            }
                            return selectedEvent.status;
                          })()}
                        </Badge>
                      )}
                    </div>
                    
                    {isLoadingTaskDetail ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : splynxTaskDetail?.task ? (
                      <>
                        {splynxTaskDetail.customer && (
                          <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <Building2 className="h-4 w-4" />
                                Customer
                              </div>
                              <a 
                                href={`https://manage.country-connect.co.uk/admin/customers/view?id=${splynxTaskDetail.customer.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                data-testid="link-splynx-customer"
                              >
                                <Link2 className="h-3 w-3" />
                                Open in Splynx
                              </a>
                            </div>
                            <div className="text-sm font-semibold">{splynxTaskDetail.customer.name}</div>
                            {splynxTaskDetail.customer.email && (
                              <div className="text-xs text-muted-foreground">{splynxTaskDetail.customer.email}</div>
                            )}
                            {splynxTaskDetail.customer.phone && (
                              <div className="text-xs text-muted-foreground">{splynxTaskDetail.customer.phone}</div>
                            )}
                            {splynxTaskDetail.customer.address && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {splynxTaskDetail.customer.address}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {splynxTaskDetail.task.team_id && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Team
                            </div>
                            <Badge variant="outline">{splynxTaskDetail.task.team_name || `Team ${splynxTaskDetail.task.team_id}`}</Badge>
                          </div>
                        )}
                        
                        {splynxTaskEdit ? (
                          <div className="space-y-3 pt-3 border-t">
                            {/* Title - Placeholder instead of label */}
                            <Input 
                              value={splynxTaskEdit.title}
                              onChange={(e) => setSplynxTaskEdit(prev => prev ? {...prev, title: e.target.value} : null)}
                              placeholder="Task title"
                              className="font-medium"
                              data-testid="input-task-title"
                            />
                            
                            {/* Description - Rendered HTML with editable content */}
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">Description</div>
                              <div 
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const newHtml = e.currentTarget.innerHTML;
                                  setSplynxTaskEdit(prev => prev ? {...prev, description: newHtml} : null);
                                }}
                                className="prose prose-sm max-w-none bg-background border rounded-md p-2 text-sm min-h-[60px] max-h-32 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-ring [&_div]:mb-1 [&_h4]:text-sm [&_h4]:font-semibold text-foreground"
                                dangerouslySetInnerHTML={{ 
                                  __html: DOMPurify.sanitize(splynxTaskEdit.description || '<p class="text-muted-foreground">Click to add description...</p>') 
                                }}
                                data-testid="input-task-description"
                              />
                            </div>
                            
                            {/* Location */}
                            <Input 
                              value={splynxTaskEdit.location}
                              onChange={(e) => setSplynxTaskEdit(prev => prev ? {...prev, location: e.target.value} : null)}
                              placeholder="Location"
                              data-testid="input-task-location"
                            />
                            
                            {/* Date & Time - 3-column layout with end time */}
                            <div className="grid grid-cols-3 gap-2">
                              <Input 
                                type="date"
                                value={splynxTaskEdit.scheduled_date}
                                onChange={(e) => setSplynxTaskEdit(prev => prev ? {...prev, scheduled_date: e.target.value} : null)}
                                data-testid="input-task-date"
                              />
                              <Input 
                                type="time"
                                value={splynxTaskEdit.scheduled_time}
                                onChange={(e) => setSplynxTaskEdit(prev => prev ? {...prev, scheduled_time: e.target.value} : null)}
                                data-testid="input-task-time"
                                title="Start time"
                              />
                              <Input 
                                type="time"
                                value={splynxTaskEdit.scheduled_end_time}
                                onChange={(e) => setSplynxTaskEdit(prev => prev ? {...prev, scheduled_end_time: e.target.value} : null)}
                                data-testid="input-task-end-time"
                                title="End time"
                              />
                            </div>
                            
                            {/* Team & Assignee - Compact 2-column */}
                            <div className="grid grid-cols-2 gap-2">
                              <Select 
                                value={splynxTaskEdit.team_id ? splynxTaskEdit.team_id.toString() : 'none'} 
                                onValueChange={(value) => setSplynxTaskEdit(prev => prev ? {...prev, team_id: value === 'none' ? 0 : parseInt(value)} : null)}
                              >
                                <SelectTrigger data-testid="select-task-team" className="h-9">
                                  <Users className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                  <SelectValue placeholder="Team" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No team</SelectItem>
                                  {filtersData?.filters?.splynxTeams?.map((team: any) => (
                                    <SelectItem key={team.id} value={team.splynxTeamId.toString()}>
                                      {team.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select 
                                value={splynxTaskEdit.assigned_to ? splynxTaskEdit.assigned_to.toString() : 'none'} 
                                onValueChange={(value) => setSplynxTaskEdit(prev => prev ? {...prev, assigned_to: value === 'none' ? 0 : parseInt(value)} : null)}
                              >
                                <SelectTrigger data-testid="select-task-assignee" className="h-9">
                                  <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                  <SelectValue placeholder="Assignee" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Unassigned</SelectItem>
                                  {filtersData?.filters?.splynxAdmins?.map((admin: any) => (
                                    <SelectItem key={admin.id} value={admin.splynxAdminId.toString()}>
                                      {admin.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Project & Status - Compact 2-column */}
                            <div className="grid grid-cols-2 gap-2">
                              <Select 
                                value={splynxTaskEdit.project_id ? splynxTaskEdit.project_id.toString() : 'none'} 
                                onValueChange={(value) => setSplynxTaskEdit(prev => prev ? {...prev, project_id: value === 'none' ? 0 : parseInt(value)} : null)}
                              >
                                <SelectTrigger data-testid="select-task-project" className="h-9">
                                  <FolderOpen className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                  <SelectValue placeholder="Project" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No project</SelectItem>
                                  {(filtersData?.filters as any)?.splynxProjects?.map((project: any) => (
                                    <SelectItem key={project.id} value={project.id.toString()}>
                                      {project.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select 
                                value={splynxTaskEdit.workflow_status_id ? splynxTaskEdit.workflow_status_id.toString() : 'none'} 
                                onValueChange={(value) => setSplynxTaskEdit(prev => prev ? {...prev, workflow_status_id: value === 'none' ? 0 : parseInt(value)} : null)}
                              >
                                <SelectTrigger data-testid="select-task-status" className="h-9">
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No status</SelectItem>
                                  {(calendarData?.metadata as any)?.taskStatuses?.map((status: any) => (
                                    <SelectItem key={status.id} value={status.id.toString()}>
                                      <span className="flex items-center gap-2">
                                        <span 
                                          className="w-2 h-2 rounded-full" 
                                          style={{ backgroundColor: status.color || '#6b7280' }}
                                        />
                                        {status.title}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Attachments - Compact */}
                            {splynxTaskDetail?.task?.attachments && splynxTaskDetail.task.attachments.length > 0 && (
                              <div className="text-xs bg-muted/30 p-2 rounded">
                                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                  <Paperclip className="h-3 w-3" />
                                  <span>{splynxTaskDetail.task.attachments.length} attachment(s)</span>
                                </div>
                                <div className="space-y-0.5">
                                  {splynxTaskDetail.task.attachments.slice(0, 3).map((attachment: any, idx: number) => (
                                    <div key={idx} className="truncate text-[11px]">
                                      {attachment.filename || attachment.name || `Attachment ${idx + 1}`}
                                    </div>
                                  ))}
                                  {splynxTaskDetail.task.attachments.length > 3 && (
                                    <div className="text-[11px] text-muted-foreground">
                                      +{splynxTaskDetail.task.attachments.length - 3} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Action buttons */}
                            <div className="flex gap-2 pt-1">
                              <Button 
                                onClick={handleSaveSplynxTask}
                                disabled={updateSplynxTaskMutation.isPending}
                                size="sm"
                                className="flex-1"
                                data-testid="button-save-task"
                              >
                                {updateSplynxTaskMutation.isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <Save className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Save to Splynx
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => setSplynxTaskEdit(null)}
                                data-testid="button-cancel-edit"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Read-only view - compact summary */}
                            <div className="space-y-2 text-sm">
                              {splynxTaskDetail.task.assignee && (
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>
                                    {filtersData?.filters?.splynxAdmins?.find((a: any) => a.splynxAdminId === splynxTaskDetail.task.assignee)?.name || 
                                     `Admin #${splynxTaskDetail.task.assignee}`}
                                  </span>
                                </div>
                              )}
                              
                              {splynxTaskDetail.task.description && (
                                <div 
                                  className="prose prose-sm max-w-none bg-muted/30 p-2 rounded text-xs [&_div]:mb-1 [&_h4]:text-xs [&_h4]:font-semibold"
                                  dangerouslySetInnerHTML={{ 
                                    __html: DOMPurify.sanitize(splynxTaskDetail.task.description) 
                                  }}
                                />
                              )}
                              
                              {splynxTaskDetail.task.address && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">{splynxTaskDetail.task.address}</span>
                                </div>
                              )}
                            </div>
                            
                            <Button 
                              onClick={initSplynxTaskEdit}
                              variant="outline"
                              size="sm"
                              className="w-full"
                              data-testid="button-edit-task"
                            >
                              Edit Task
                            </Button>
                          </>
                        )}
                        
                        <div className="pt-2 border-t">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px]">
                            <CalendarIcon className="h-2.5 w-2.5 mr-1" />
                            Synced from Splynx
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <>
                        {selectedEvent.metadata?.customerId && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Customer ID</div>
                            <div className="text-sm">{selectedEvent.metadata.customerId}</div>
                          </div>
                        )}
                        {selectedEvent.metadata?.description && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Description</div>
                            <div className="text-sm">{selectedEvent.metadata.description}</div>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground pt-2">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            Synced from Splynx
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {selectedEvent.type === 'holiday' && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between text-sm pb-2 border-b">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{format(new Date(selectedEvent.start), 'MMM d, yyyy')} to {format(new Date(selectedEvent.end), 'MMM d, yyyy')}</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={
                          selectedEvent.status === 'approved' 
                            ? 'bg-green-100 text-green-800 border-green-300' 
                            : selectedEvent.status === 'rejected'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                        }
                      >
                        {selectedEvent.status === 'approved' ? 'Approved' : 
                         selectedEvent.status === 'rejected' ? 'Rejected' : 'Pending Approval'}
                      </Badge>
                    </div>
                    
                    {selectedEvent.userName && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Requested By</div>
                        <div className="text-sm font-medium">{selectedEvent.userName}</div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      {selectedEvent.metadata?.holidayType && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Leave Type</div>
                          <div className="text-sm capitalize">{selectedEvent.metadata.holidayType}</div>
                        </div>
                      )}
                      {selectedEvent.metadata?.daysCount && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Days Requested</div>
                          <div className="text-sm">{selectedEvent.metadata.daysCount} day(s)</div>
                        </div>
                      )}
                    </div>
                    
                    {(selectedEvent.metadata?.isHalfDayStart || selectedEvent.metadata?.isHalfDayEnd) && (
                      <div className="flex gap-2">
                        {selectedEvent.metadata?.isHalfDayStart && (
                          <Badge variant="outline" className="text-xs">Half day (start)</Badge>
                        )}
                        {selectedEvent.metadata?.isHalfDayEnd && (
                          <Badge variant="outline" className="text-xs">Half day (end)</Badge>
                        )}
                      </div>
                    )}
                    
                    {selectedEvent.metadata?.notes && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Notes</div>
                        <div className="text-sm">{selectedEvent.metadata.notes}</div>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground pt-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <Umbrella className="h-3 w-3 mr-1" />
                        Holiday Request
                      </Badge>
                    </div>
                    
                    <div className="pt-4 flex gap-2">
                      {selectedEvent.metadata?.workItemId && (
                        <Button 
                          onClick={() => handleNavigateToEvent(selectedEvent)}
                          className="flex-1"
                          data-testid={`button-open-holiday-work-item-${selectedEvent.metadata.workItemId}`}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Request
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        className={selectedEvent.metadata?.workItemId ? '' : 'w-full'}
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete this holiday request?')) return;
                          try {
                            if (selectedEvent.metadata?.workItemId) {
                              const response = await fetch(`/api/work-items/${selectedEvent.metadata.workItemId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                              });
                              if (!response.ok) throw new Error('Failed to delete holiday request');
                            } else {
                              const holidayId = selectedEvent.id.replace('holiday-', '');
                              const response = await fetch(`/api/calendar/holidays/requests/${holidayId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                              });
                              if (!response.ok) throw new Error('Failed to delete holiday request');
                            }
                            queryClient.invalidateQueries({ queryKey: ['/api/calendar/combined'] });
                            handleCloseEventDetail();
                            toast({ title: 'Holiday request deleted' });
                          } catch (err: any) {
                            toast({ title: 'Error', description: err.message, variant: 'destructive' });
                          }
                        }}
                        data-testid="button-delete-holiday"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}

                {selectedEvent.type === 'block' && (
                  <div className="space-y-4 pt-2">
                    {isEditingBlock && blockEditForm ? (
                      <>
                        <div>
                          <Label htmlFor="edit-block-title">Title</Label>
                          <Input
                            id="edit-block-title"
                            value={blockEditForm.title}
                            onChange={(e) => setBlockEditForm({ ...blockEditForm, title: e.target.value })}
                            placeholder="Block title"
                            data-testid="input-edit-block-title"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-block-type">Block Type</Label>
                          <Select 
                            value={blockEditForm.blockType} 
                            onValueChange={(v) => setBlockEditForm({ ...blockEditForm, blockType: v as any })}
                          >
                            <SelectTrigger data-testid="select-edit-block-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="meeting">Meeting</SelectItem>
                              <SelectItem value="focus">Focus Time</SelectItem>
                              <SelectItem value="project">Project Work</SelectItem>
                              <SelectItem value="travel">Travel</SelectItem>
                              <SelectItem value="break">Break</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="edit-block-description">Description</Label>
                          <Textarea
                            id="edit-block-description"
                            value={blockEditForm.description}
                            onChange={(e) => setBlockEditForm({ ...blockEditForm, description: e.target.value })}
                            placeholder="Optional description"
                            rows={2}
                            data-testid="input-edit-block-description"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="edit-block-start">Start</Label>
                            <Input
                              id="edit-block-start"
                              type="datetime-local"
                              value={blockEditForm.startDatetime}
                              onChange={(e) => setBlockEditForm({ ...blockEditForm, startDatetime: e.target.value })}
                              data-testid="input-edit-block-start"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-block-end">End</Label>
                            <Input
                              id="edit-block-end"
                              type="datetime-local"
                              value={blockEditForm.endDatetime}
                              onChange={(e) => setBlockEditForm({ ...blockEditForm, endDatetime: e.target.value })}
                              data-testid="input-edit-block-end"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setIsEditingBlock(false);
                              setBlockEditForm(null);
                            }}
                            data-testid="button-cancel-edit-block"
                          >
                            Cancel
                          </Button>
                          <Button
                            className="flex-1"
                            disabled={updateBlockMutation.isPending}
                            onClick={() => {
                              if (!blockEditForm) return;
                              updateBlockMutation.mutate({
                                id: blockEditForm.id,
                                updates: {
                                  title: blockEditForm.title,
                                  description: blockEditForm.description,
                                  blockType: blockEditForm.blockType,
                                  startDatetime: blockEditForm.startDatetime,
                                  endDatetime: blockEditForm.endDatetime,
                                },
                              });
                            }}
                            data-testid="button-save-block"
                          >
                            {updateBlockMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {selectedEvent.metadata?.blockType && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Block Type</div>
                            <div className="text-sm capitalize">{selectedEvent.metadata.blockType}</div>
                          </div>
                        )}
                        {selectedEvent.metadata?.description && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Description</div>
                            <div className="text-sm">{selectedEvent.metadata.description}</div>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground pt-2">
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Calendar Block
                          </Badge>
                        </div>
                        <div className="pt-4 flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              const blockId = selectedEvent.id.replace('block-', '');
                              setBlockEditForm({
                                id: blockId,
                                title: selectedEvent.title || '',
                                description: selectedEvent.metadata?.description || '',
                                blockType: (selectedEvent.metadata?.blockType as any) || 'other',
                                startDatetime: format(selectedEvent.start, "yyyy-MM-dd'T'HH:mm"),
                                endDatetime: format(selectedEvent.end, "yyyy-MM-dd'T'HH:mm"),
                              });
                              setIsEditingBlock(true);
                            }}
                            data-testid="button-edit-block"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={async () => {
                              if (!confirm('Are you sure you want to delete this calendar block?')) return;
                              try {
                                const blockId = selectedEvent.id.replace('block-', '');
                                const response = await fetch(`/api/calendar/blocks/${blockId}`, {
                                  method: 'DELETE',
                                  headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                                });
                                if (!response.ok) throw new Error('Failed to delete calendar block');
                                queryClient.invalidateQueries({ queryKey: ['/api/calendar/combined'] });
                                handleCloseEventDetail();
                                toast({ title: 'Calendar block deleted' });
                              } catch (err: any) {
                                toast({ title: 'Error', description: err.message, variant: 'destructive' });
                              }
                            }}
                            data-testid="button-delete-block"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {selectedEvent.type === 'public_holiday' && (
                  <div className="space-y-3 pt-2">
                    <div className="text-xs text-muted-foreground pt-2">
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                        <CalendarDays className="h-3 w-3 mr-1" />
                        Public Holiday
                      </Badge>
                    </div>
                  </div>
                )}

                {selectedEvent.type === 'work_item' && (
                  <div className="space-y-3 pt-2">
                    {selectedEvent.metadata?.description && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Description</div>
                        <div className="text-sm">{selectedEvent.metadata.description}</div>
                      </div>
                    )}
                    {selectedEvent.metadata?.workItemType && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Type</div>
                        <Badge variant="outline">{selectedEvent.metadata.workItemType}</Badge>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground pt-2">
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        <CheckSquare className="h-3 w-3 mr-1" />
                        Work Item
                      </Badge>
                    </div>
                    {selectedEvent.metadata?.workItemId && (
                      <div className="pt-4 flex gap-2">
                        <Button 
                          onClick={() => handleNavigateToEvent(selectedEvent)}
                          className="flex-1"
                          data-testid="button-open-work-item"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Work Item
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            if (!confirm('Are you sure you want to delete this work item?')) return;
                            try {
                              const workItemId = selectedEvent.metadata?.workItemId;
                              const response = await fetch(`/api/work-items/${workItemId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                              });
                              if (!response.ok) throw new Error('Failed to delete work item');
                              queryClient.invalidateQueries({ queryKey: ['/api/calendar/combined'] });
                              handleCloseEventDetail();
                              toast({ title: 'Work item deleted' });
                            } catch (err: any) {
                              toast({ title: 'Error', description: err.message, variant: 'destructive' });
                            }
                          }}
                          data-testid="button-delete-work-item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {selectedEvent.type === 'booking' && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between text-sm pb-2 border-b">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{format(selectedEvent.start, 'MMM d, yyyy')}</span>
                        </div>
                        {!selectedEvent.allDay && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{format(selectedEvent.start, 'h:mm a')} - {format(selectedEvent.end, 'h:mm a')}</span>
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="capitalize">{selectedEvent.status || 'confirmed'}</Badge>
                    </div>
                    
                    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <User className="h-4 w-4" />
                        Customer
                      </div>
                      <div className="text-sm font-semibold">{selectedEvent.metadata?.customerName}</div>
                      {selectedEvent.metadata?.customerEmail && (
                        <div className="text-xs text-muted-foreground">{selectedEvent.metadata.customerEmail}</div>
                      )}
                      {selectedEvent.metadata?.customerPhone && (
                        <div className="text-xs text-muted-foreground">{selectedEvent.metadata.customerPhone}</div>
                      )}
                      {selectedEvent.metadata?.serviceAddress && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {selectedEvent.metadata.serviceAddress}
                        </div>
                      )}
                    </div>
                    
                    {selectedEvent.metadata?.taskTypeName && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Appointment Type</div>
                        <Badge variant="outline">{selectedEvent.metadata.taskTypeName}</Badge>
                      </div>
                    )}
                    
                    {selectedEvent.metadata?.additionalNotes && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Notes</div>
                        <div className="text-sm">{selectedEvent.metadata.additionalNotes}</div>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground pt-2">
                      <Badge variant="secondary" className="bg-cyan-100 text-cyan-800">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        Customer Booking
                      </Badge>
                    </div>
                    
                    {selectedEvent.metadata?.splynxTaskId && (
                      <a 
                        href={`https://manage.country-connect.co.uk/admin/scheduling/tasks?view=details&task_id=${selectedEvent.metadata.splynxTaskId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 pt-2"
                        data-testid="link-booking-splynx-task"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Splynx Task
                      </a>
                    )}
                    
                    <div className="pt-4 flex gap-2">
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={async () => {
                          if (!confirm('Are you sure you want to cancel this booking?')) return;
                          try {
                            const bookingId = selectedEvent.id.replace('booking-', '');
                            const response = await fetch(`/api/bookings/all-bookings/${bookingId}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                              },
                              body: JSON.stringify({ status: 'cancelled' })
                            });
                            if (!response.ok) throw new Error('Failed to cancel booking');
                            queryClient.invalidateQueries({ queryKey: ['/api/calendar/combined'] });
                            handleCloseEventDetail();
                            toast({ title: 'Booking cancelled successfully' });
                          } catch (err: any) {
                            toast({ title: 'Error', description: err.message, variant: 'destructive' });
                          }
                        }}
                        data-testid="button-cancel-booking"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel Booking
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={async () => {
                          if (!confirm('Are you sure you want to permanently delete this booking?')) return;
                          try {
                            const bookingId = selectedEvent.id.replace('booking-', '');
                            const response = await fetch(`/api/bookings/all-bookings/${bookingId}`, {
                              method: 'DELETE',
                              headers: {
                                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                              }
                            });
                            if (!response.ok) throw new Error('Failed to delete booking');
                            queryClient.invalidateQueries({ queryKey: ['/api/calendar/combined'] });
                            handleCloseEventDetail();
                            toast({ title: 'Booking deleted successfully' });
                          } catch (err: any) {
                            toast({ title: 'Error', description: err.message, variant: 'destructive' });
                          }
                        }}
                        data-testid="button-delete-booking"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Calendar Block</DialogTitle>
            <DialogDescription>
              Block time on your calendar for focus work, meetings, or other activities.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="block-title">Title</Label>
              <Input 
                id="block-title"
                value={blockForm.title}
                onChange={(e) => setBlockForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Focus time, Team meeting"
                data-testid="input-block-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-type">Block Type</Label>
              <Select value={blockForm.blockType} onValueChange={(v) => setBlockForm(f => ({ ...f, blockType: v as any }))}>
                <SelectTrigger data-testid="select-block-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="focus">Focus Time</SelectItem>
                  <SelectItem value="project">Project Work</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="break">Break</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="block-start">Start</Label>
                <Input 
                  id="block-start"
                  type="datetime-local"
                  value={blockForm.startDatetime}
                  onChange={(e) => setBlockForm(f => ({ ...f, startDatetime: e.target.value }))}
                  data-testid="input-block-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-end">End</Label>
                <Input 
                  id="block-end"
                  type="datetime-local"
                  value={blockForm.endDatetime}
                  onChange={(e) => setBlockForm(f => ({ ...f, endDatetime: e.target.value }))}
                  data-testid="input-block-end"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="block-allday"
                checked={blockForm.isAllDay}
                onCheckedChange={(checked) => setBlockForm(f => ({ ...f, isAllDay: !!checked }))}
                data-testid="checkbox-block-allday"
              />
              <Label htmlFor="block-allday" className="text-sm">All day event</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-description">Description (optional)</Label>
              <Textarea 
                id="block-description"
                value={blockForm.description}
                onChange={(e) => setBlockForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Additional details..."
                rows={2}
                data-testid="input-block-description"
              />
            </div>
            
            {/* Splynx Sync Section */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="block-sync-splynx"
                  checked={blockForm.syncToSplynx}
                  onCheckedChange={(checked) => setBlockForm(f => ({ 
                    ...f, 
                    syncToSplynx: !!checked,
                    splynxProjectId: checked ? f.splynxProjectId : null,
                    splynxTeamId: checked ? f.splynxTeamId : null,
                  }))}
                  data-testid="checkbox-sync-splynx"
                />
                <Label htmlFor="block-sync-splynx" className="text-sm font-medium">
                  Sync to Splynx
                </Label>
              </div>
              
              {blockForm.syncToSplynx && (
                <div className="space-y-3 pl-6 border-l-2 border-blue-200">
                  <div className="space-y-2">
                    <Label htmlFor="block-project" className="text-sm">Project Type (required)</Label>
                    <Select 
                      value={blockForm.splynxProjectId?.toString() || 'none'} 
                      onValueChange={(v) => setBlockForm(f => ({ ...f, splynxProjectId: v === 'none' ? null : parseInt(v) }))}
                    >
                      <SelectTrigger data-testid="select-splynx-project">
                        <SelectValue placeholder="Select project..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select project...</SelectItem>
                        {(filtersData?.filters as any)?.splynxProjects?.map((project: any) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.title || project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="block-team" className="text-sm">Assign to Team (optional)</Label>
                    <Select 
                      value={blockForm.splynxTeamId?.toString() || 'none'} 
                      onValueChange={(v) => setBlockForm(f => ({ ...f, splynxTeamId: v === 'none' ? null : parseInt(v) }))}
                    >
                      <SelectTrigger data-testid="select-splynx-team">
                        <SelectValue placeholder="No team assignment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No team assignment</SelectItem>
                        {filtersData?.filters?.splynxTeams?.map((team: any) => (
                          <SelectItem key={team.splynxTeamId} value={team.splynxTeamId.toString()}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This block will be created as a task in Splynx and appear in the scheduling calendar.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)} data-testid="button-cancel-block">
              Cancel
            </Button>
            <Button 
              onClick={() => createBlockMutation.mutate(blockForm)}
              disabled={!blockForm.title || (blockForm.syncToSplynx && !blockForm.splynxProjectId) || createBlockMutation.isPending}
              data-testid="button-create-block"
            >
              {createBlockMutation.isPending ? 'Creating...' : blockForm.syncToSplynx ? 'Create & Sync' : 'Create Block'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHolidayDialog} onOpenChange={setShowHolidayDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Holiday</DialogTitle>
            <DialogDescription>
              Submit a holiday or time off request for approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="holiday-type">Holiday Type</Label>
              <Select value={holidayForm.holidayType} onValueChange={(v) => setHolidayForm(f => ({ ...f, holidayType: v as any }))}>
                <SelectTrigger data-testid="select-holiday-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="compassionate">Compassionate Leave</SelectItem>
                  <SelectItem value="parental">Parental Leave</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="holiday-start">Start Date</Label>
                <Input 
                  id="holiday-start"
                  type="date"
                  value={holidayForm.startDate}
                  onChange={(e) => setHolidayForm(f => ({ ...f, startDate: e.target.value }))}
                  data-testid="input-holiday-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday-end">End Date</Label>
                <Input 
                  id="holiday-end"
                  type="date"
                  value={holidayForm.endDate}
                  onChange={(e) => setHolidayForm(f => ({ ...f, endDate: e.target.value }))}
                  data-testid="input-holiday-end"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="half-day-start"
                  checked={holidayForm.isHalfDayStart}
                  onCheckedChange={(checked) => setHolidayForm(f => ({ ...f, isHalfDayStart: !!checked }))}
                  data-testid="checkbox-half-day-start"
                />
                <Label htmlFor="half-day-start" className="text-sm">Half day (start)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="half-day-end"
                  checked={holidayForm.isHalfDayEnd}
                  onCheckedChange={(checked) => setHolidayForm(f => ({ ...f, isHalfDayEnd: !!checked }))}
                  data-testid="checkbox-half-day-end"
                />
                <Label htmlFor="half-day-end" className="text-sm">Half day (end)</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-notes">Notes (optional)</Label>
              <Textarea 
                id="holiday-notes"
                value={holidayForm.notes}
                onChange={(e) => setHolidayForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Reason for leave..."
                rows={2}
                data-testid="input-holiday-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHolidayDialog(false)} data-testid="button-cancel-holiday">
              Cancel
            </Button>
            <Button 
              onClick={() => createHolidayMutation.mutate(holidayForm)}
              disabled={!holidayForm.startDate || !holidayForm.endDate || createHolidayMutation.isPending}
              data-testid="button-submit-holiday"
            >
              {createHolidayMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

interface MonthViewProps {
  days: Date[];
  currentDate: Date;
  getEventsForDay: (day: Date) => CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDayClick?: (day: Date, event?: React.MouseEvent) => void;
  onDragStart?: (event: CalendarEvent) => void;
  onDragEnd?: () => void;
  onEventDrop?: (day: Date) => void;
  draggedEvent?: CalendarEvent | null;
}

function MonthView({ days, currentDate, getEventsForDay, onEventClick, onDayClick, onDragStart, onDragEnd, onEventDrop, draggedEvent }: MonthViewProps) {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const draggableTypes = ['splynx_task', 'block', 'booking', 'work_item'];

  return (
    <div className="h-full flex flex-col p-2">
      <div className="grid grid-cols-7 gap-px mb-px">
        {weekDays.map((day) => (
          <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground uppercase">
            {day}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-px bg-border">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={i}
              className={`
                bg-background p-1 min-h-0 overflow-hidden cursor-pointer hover:bg-muted/30 transition-colors
                ${!isCurrentMonth ? 'opacity-40 bg-muted/20' : ''}
                ${draggedEvent ? 'ring-2 ring-primary/20 ring-inset' : ''}
              `}
              data-testid={`day-cell-${format(day, 'yyyy-MM-dd')}`}
              onClick={(e) => onDayClick?.(day, e)}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('bg-primary/10');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('bg-primary/10');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('bg-primary/10');
                // Clone the day to avoid mutating the shared days array
                onEventDrop?.(new Date(day.getTime()));
              }}
            >
              <div className={`
                text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full
                ${isCurrentDay ? 'bg-primary text-primary-foreground' : ''}
              `}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => {
                  const isDraggable = draggableTypes.includes(event.type);
                  return (
                    <div
                      key={event.id}
                      draggable={isDraggable}
                      onDragStart={(e) => {
                        if (!isDraggable) {
                          e.preventDefault();
                          return;
                        }
                        e.dataTransfer.effectAllowed = 'move';
                        onDragStart?.(event);
                      }}
                      onDragEnd={() => onDragEnd?.()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      className={`
                        text-[10px] leading-tight px-1 py-0.5 rounded truncate hover:opacity-80 flex items-center gap-0.5
                        ${eventTypeColors[event.type]}
                        ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                        ${draggedEvent?.id === event.id ? 'opacity-50' : ''}
                      `}
                      title={isDraggable ? `${event.title}${event.status ? ` (${event.status})` : ''} (drag to move)` : `${event.title}${event.status ? ` (${event.status})` : ''}`}
                      data-testid={`event-${event.id}`}
                    >
                      {event.status === 'Done' && <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />}
                      <span className="truncate">{event.title}</span>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface WeekViewProps {
  days: Date[];
  events: CalendarEvent[];
  hours: number[];
  onEventClick?: (event: CalendarEvent) => void;
  onSlotClick?: (day: Date, hour: number, event: React.MouseEvent) => void;
  onDragStart?: (event: CalendarEvent) => void;
  onDragEnd?: () => void;
  onEventDrop?: (newDate: Date, hour: number) => void;
  draggedEvent?: CalendarEvent | null;
  onResizeStart?: (event: CalendarEvent, edge: 'start' | 'end') => void;
  onResizeEnd?: () => void;
  onResizeDrop?: (newDate: Date, hour: number) => void;
  resizingEvent?: CalendarEvent | null;
  resizeEdge?: 'start' | 'end' | null;
}

function WeekView({ days, events, hours, onEventClick, onSlotClick, onDragStart, onDragEnd, onEventDrop, draggedEvent, onResizeStart, onResizeEnd, onResizeDrop, resizingEvent, resizeEdge }: WeekViewProps) {
  const draggableTypes = ['splynx_task', 'block', 'booking', 'work_item'];
  const resizableTypes = ['splynx_task', 'block', 'booking'];
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventStart = startOfDay(new Date(event.start));
      const eventEnd = endOfDay(new Date(event.end));
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });
  };

  const getAllDayEvents = (day: Date) => {
    return getEventsForDay(day).filter(e => e.allDay || e.type === 'work_item' || e.type === 'holiday' || e.type === 'public_holiday');
  };

  const getTimedEvents = (day: Date, hour: number) => {
    return getEventsForDay(day).filter(e => {
      if (e.allDay || e.type === 'work_item' || e.type === 'holiday' || e.type === 'public_holiday') return false;
      const eventStart = new Date(e.start);
      return eventStart.getHours() === hour;
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden w-full max-w-full">
      <div className="flex border-b w-full">
        <div className="w-14 shrink-0 flex-none" />
        {days.map((day, i) => (
          <div 
            key={i} 
            className={`
              flex-1 min-w-0 p-2 text-center border-l
              ${isToday(day) ? 'bg-primary/5' : ''}
            `}
          >
            <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
            <div className={`
              text-lg font-medium mt-0.5
              ${isToday(day) ? 'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}
            `}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex border-b bg-muted/30 w-full">
        <div className="w-14 shrink-0 flex-none pr-2 py-1 text-right text-[10px] text-muted-foreground">
          All day
        </div>
        {days.map((day, dayIndex) => {
          const allDayEvents = getAllDayEvents(day);
          return (
            <div key={dayIndex} className="flex-1 min-w-0 border-l p-1 min-h-[60px] max-h-[100px] overflow-hidden">
              <div className="space-y-0.5">
                {allDayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className={`
                      text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80
                      ${eventTypeColors[event.type]}
                    `}
                    title={event.title}
                    data-testid={`event-week-${event.id}`}
                  >
                    {event.title}
                  </div>
                ))}
                {allDayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{allDayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex w-full">
          <div className="w-14 shrink-0 flex-none">
            {hours.map((hour) => {
              const hourDate = new Date();
              hourDate.setHours(hour, 0, 0, 0);
              return (
                <div key={hour} className="h-12 pr-2 text-right text-xs text-muted-foreground border-b flex items-start justify-end pt-0.5">
                  {format(hourDate, 'h a')}
                </div>
              );
            })}
          </div>
          {days.map((day, dayIndex) => (
            <div key={dayIndex} className="flex-1 min-w-0 border-l">
              {hours.map((hour) => {
                const hourEvents = getTimedEvents(day, hour);

                return (
                  <div 
                    key={hour} 
                    className={`
                      h-12 border-b relative cursor-pointer hover:bg-muted/30 transition-colors
                      ${isToday(day) ? 'bg-primary/5' : ''}
                      ${draggedEvent || resizingEvent ? 'ring-1 ring-primary/10 ring-inset' : ''}
                    `}
                    onClick={(e) => onSlotClick?.(day, hour, e)}
                    data-testid={`slot-${format(day, 'yyyy-MM-dd')}-${hour}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('bg-primary/10');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('bg-primary/10');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-primary/10');
                      if (resizingEvent) {
                        onResizeDrop?.(new Date(day.getTime()), hour);
                      } else {
                        onEventDrop?.(new Date(day.getTime()), hour);
                      }
                    }}
                  >
                    {hourEvents.map((event) => {
                      const isDraggable = draggableTypes.includes(event.type);
                      const isResizable = resizableTypes.includes(event.type);
                      const isBeingResized = resizingEvent?.id === event.id;
                      
                      // Calculate event height based on duration
                      const eventStart = new Date(event.start);
                      const eventEnd = new Date(event.end);
                      const durationMs = eventEnd.getTime() - eventStart.getTime();
                      const durationHours = durationMs / (1000 * 60 * 60);
                      // Each hour slot is h-12 (48px), calculate height in pixels
                      // Minimum height of 1 hour slot (48px), subtract 4px for padding
                      const heightPx = Math.max(44, Math.round(durationHours * 48) - 4);
                      
                      // Calculate top offset based on minutes past the hour
                      const minutesPastHour = eventStart.getMinutes();
                      const topOffsetPx = Math.round((minutesPastHour / 60) * 48);
                      
                      return (
                        <div
                          key={event.id}
                          className={`
                            absolute left-0.5 right-0.5 text-[10px] rounded z-10 overflow-hidden
                            ${eventTypeColors[event.type]}
                            ${draggedEvent?.id === event.id ? 'opacity-50' : ''}
                            ${isBeingResized ? 'ring-2 ring-primary' : ''}
                          `}
                          style={{
                            top: `${topOffsetPx + 2}px`,
                            height: `${heightPx}px`,
                          }}
                          data-testid={`event-week-timed-${event.id}`}
                        >
                          {isResizable && (
                            <div
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                e.dataTransfer.effectAllowed = 'move';
                                onResizeStart?.(event, 'start');
                              }}
                              onDragEnd={() => onResizeEnd?.()}
                              className="absolute top-0 left-0 right-0 h-1 cursor-n-resize hover:bg-white/40 z-20"
                              title="Drag to change start time"
                            />
                          )}
                          <div
                            draggable={isDraggable}
                            onDragStart={(e) => {
                              if (!isDraggable) {
                                e.preventDefault();
                                return;
                              }
                              e.dataTransfer.effectAllowed = 'move';
                              onDragStart?.(event);
                            }}
                            onDragEnd={() => onDragEnd?.()}
                            onClick={(e) => { e.stopPropagation(); onEventClick?.(event); }}
                            className={`p-1 ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} hover:opacity-80 h-full flex flex-col justify-between`}
                            title={isDraggable ? `${event.title} (drag to move)` : event.title}
                          >
                            <span className="truncate">{event.title}</span>
                            {event.status && heightPx > 60 && (
                              <span className="text-[8px] opacity-75 truncate mt-0.5">{event.status}</span>
                            )}
                          </div>
                          {isResizable && (
                            <div
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                e.dataTransfer.effectAllowed = 'move';
                                onResizeStart?.(event, 'end');
                              }}
                              onDragEnd={() => onResizeEnd?.()}
                              className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize hover:bg-white/40 z-20"
                              title="Drag to change end time"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DayViewProps {
  day: Date;
  events: CalendarEvent[];
  hours: number[];
  onEventClick?: (event: CalendarEvent) => void;
  onSlotClick?: (day: Date, hour: number, event: React.MouseEvent) => void;
  onDragStart?: (event: CalendarEvent) => void;
  onDragEnd?: () => void;
  onEventDrop?: (newDate: Date, hour: number) => void;
  draggedEvent?: CalendarEvent | null;
  onResizeStart?: (event: CalendarEvent, edge: 'start' | 'end') => void;
  onResizeEnd?: () => void;
  onResizeDrop?: (newDate: Date, hour: number) => void;
  resizingEvent?: CalendarEvent | null;
  resizeEdge?: 'start' | 'end' | null;
}

function DayView({ day, events, hours, onEventClick, onSlotClick, onDragStart, onDragEnd, onEventDrop, draggedEvent, onResizeStart, onResizeEnd, onResizeDrop, resizingEvent, resizeEdge }: DayViewProps) {
  const draggableTypes = ['splynx_task', 'block', 'booking', 'work_item'];
  const resizableTypes = ['splynx_task', 'block', 'booking'];
  const allDayEvents = events.filter(e => e.allDay || e.type === 'work_item' || e.type === 'holiday' || e.type === 'public_holiday');
  const timedEvents = events.filter(e => !e.allDay && e.type !== 'work_item' && e.type !== 'holiday' && e.type !== 'public_holiday');

  const getEventsForHour = (hour: number) => {
    return timedEvents.filter((event) => {
      const eventStart = new Date(event.start);
      return eventStart.getHours() === hour;
    });
  };

  return (
    <div className="h-full flex">
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-4">
          {allDayEvents.length > 0 && (
            <div className="mb-4 p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground mb-2 font-medium">All Day Events</div>
              <div className="space-y-1">
                {allDayEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className={`
                      p-2 rounded flex items-center gap-3 cursor-pointer hover:opacity-80
                      ${eventTypeBgColors[event.type]}
                    `}
                    data-testid={`event-day-${event.id}`}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{event.title}</div>
                      {event.userName && (
                        <div className="text-xs opacity-75 flex items-center gap-1 mt-0.5">
                          <User className="h-3 w-3" />
                          {event.userName}
                        </div>
                      )}
                    </div>
                    {event.status && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {event.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {hours.map((hour) => {
            const hourEvents = getEventsForHour(hour);
            const hourDate = new Date();
            hourDate.setHours(hour, 0, 0, 0);
            
            return (
              <div key={hour} className="flex border-b min-h-[56px] relative">
                <div className="w-20 shrink-0 pr-3 py-2 text-right text-sm text-muted-foreground">
                  {format(hourDate, 'h:mm a')}
                </div>
                <div 
                  className={`flex-1 py-1 px-2 hover:bg-muted/20 transition-colors cursor-pointer relative ${draggedEvent || resizingEvent ? 'ring-1 ring-primary/20 ring-inset' : ''}`}
                  onClick={(e) => onSlotClick?.(day, hour, e)}
                  data-testid={`day-slot-${hour}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('bg-primary/10');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('bg-primary/10');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('bg-primary/10');
                    if (resizingEvent) {
                      onResizeDrop?.(new Date(day.getTime()), hour);
                    } else {
                      onEventDrop?.(new Date(day.getTime()), hour);
                    }
                  }}
                >
                  {hourEvents.map((event) => {
                    const isDraggable = draggableTypes.includes(event.type);
                    const isResizable = resizableTypes.includes(event.type);
                    const isBeingResized = resizingEvent?.id === event.id;
                    
                    // Calculate event height based on duration (56px per hour for day view)
                    const eventStart = new Date(event.start);
                    const eventEnd = new Date(event.end);
                    const durationMs = eventEnd.getTime() - eventStart.getTime();
                    const durationHours = durationMs / (1000 * 60 * 60);
                    // Day view uses 56px min-height per hour slot
                    const heightPx = Math.max(48, Math.round(durationHours * 56) - 8);
                    
                    return (
                      <div
                        key={event.id}
                        className={`
                          relative rounded mb-1 hover:opacity-90
                          ${eventTypeBgColors[event.type]}
                          ${draggedEvent?.id === event.id ? 'opacity-50' : ''}
                          ${isBeingResized ? 'ring-2 ring-primary' : ''}
                        `}
                        style={{ minHeight: `${heightPx}px` }}
                        data-testid={`event-day-timed-${event.id}`}
                      >
                        {isResizable && (
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.dataTransfer.effectAllowed = 'move';
                              onResizeStart?.(event, 'start');
                            }}
                            onDragEnd={() => onResizeEnd?.()}
                            className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-white/30 rounded-t z-20"
                            title="Drag to change start time"
                          />
                        )}
                        <div
                          draggable={isDraggable}
                          onDragStart={(e) => {
                            if (!isDraggable) {
                              e.preventDefault();
                              return;
                            }
                            e.dataTransfer.effectAllowed = 'move';
                            onDragStart?.(event);
                          }}
                          onDragEnd={() => onDragEnd?.()}
                          onClick={(e) => { e.stopPropagation(); onEventClick?.(event); }}
                          className={`
                            p-2 flex items-start gap-3
                            ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                          `}
                          title={isDraggable ? `${event.title} (drag to move)` : event.title}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">{event.title}</div>
                            {event.userName && (
                              <div className="text-xs opacity-75 flex items-center gap-1 mt-0.5">
                                <User className="h-3 w-3" />
                                {event.userName}
                              </div>
                            )}
                          </div>
                          {event.status && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {event.status}
                            </Badge>
                          )}
                        </div>
                        {isResizable && (
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.dataTransfer.effectAllowed = 'move';
                              onResizeStart?.(event, 'end');
                            }}
                            onDragEnd={() => onResizeEnd?.()}
                            className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-white/30 rounded-b z-20"
                            title="Drag to change end time"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      
      <div className="w-80 border-l p-4 hidden lg:block">
        <h3 className="font-semibold mb-3">Today's Summary</h3>
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-2xl font-bold">{events.length}</div>
            <div className="text-sm text-muted-foreground">Events scheduled</div>
          </div>
          <div className="space-y-2 mt-4">
            {events.slice(0, 5).map((event) => (
              <div 
                key={event.id} 
                onClick={() => onEventClick?.(event)}
                className={`
                  p-2 rounded text-sm cursor-pointer hover:opacity-80
                  ${eventTypeBgColors[event.type]}
                `}
                data-testid={`summary-event-${event.id}`}
              >
                <div className="font-medium truncate">{event.title}</div>
                <div className="text-xs opacity-75">
                  {format(event.start, 'h:mm a')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface RoadmapViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  teamMembers: Array<{ id: number; fullName: string; email: string }>;
}

function RoadmapView({ events, currentDate, teamMembers }: RoadmapViewProps) {
  const months = useMemo(() => {
    return [currentDate, addMonths(currentDate, 1), addMonths(currentDate, 2)];
  }, [currentDate]);

  const roadmapStart = startOfMonth(currentDate);
  const roadmapEnd = endOfMonth(addMonths(currentDate, 2));
  const totalDays = differenceInDays(roadmapEnd, roadmapStart) + 1;

  const workItemEvents = events.filter(e => e.type === 'work_item');
  const holidayEvents = events.filter(e => e.type === 'holiday');

  const groupedByUser = useMemo(() => {
    const groups: Record<number, CalendarEvent[]> = {};
    workItemEvents.forEach(event => {
      if (event.userId) {
        if (!groups[event.userId]) groups[event.userId] = [];
        groups[event.userId].push(event);
      }
    });
    return groups;
  }, [workItemEvents]);

  const getBarStyle = (event: CalendarEvent) => {
    const start = event.start < roadmapStart ? roadmapStart : event.start;
    const end = event.end > roadmapEnd ? roadmapEnd : event.end;
    const startOffset = differenceInDays(start, roadmapStart);
    const duration = Math.max(differenceInDays(end, start) + 1, 1);
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b bg-muted/30">
        <div className="w-48 shrink-0 p-2 border-r font-medium text-sm">
          Team Members
        </div>
        <div className="flex-1 flex">
          {months.map((month, i) => (
            <div 
              key={i} 
              className="flex-1 p-2 text-center border-r last:border-r-0 font-medium text-sm"
            >
              {format(month, 'MMMM yyyy')}
            </div>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div>
          {teamMembers.filter(m => groupedByUser[m.id]?.length > 0).map((member) => (
            <div key={member.id} className="flex border-b hover:bg-muted/20">
              <div className="w-48 shrink-0 p-3 border-r flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                  {(member.fullName || member.email).charAt(0).toUpperCase()}
                </div>
                <span className="text-sm truncate">{member.fullName || member.email}</span>
              </div>
              <div className="flex-1 relative min-h-[60px] py-2">
                {groupedByUser[member.id]?.map((event) => {
                  const style = getBarStyle(event);
                  return (
                    <div
                      key={event.id}
                      className={`
                        absolute h-6 rounded px-2 text-xs flex items-center truncate
                        ${eventTypeColors[event.type]}
                      `}
                      style={{ ...style, top: '50%', transform: 'translateY(-50%)' }}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {holidayEvents.length > 0 && (
            <>
              <div className="flex border-b bg-muted/50">
                <div className="w-48 shrink-0 p-2 border-r font-medium text-xs text-muted-foreground uppercase">
                  Holidays & Leave
                </div>
                <div className="flex-1" />
              </div>
              {holidayEvents.map((event) => (
                <div key={event.id} className="flex border-b hover:bg-muted/20">
                  <div className="w-48 shrink-0 p-3 border-r">
                    <span className="text-sm">{event.userName || 'Public Holiday'}</span>
                  </div>
                  <div className="flex-1 relative min-h-[50px] py-2">
                    <div
                      className={`
                        absolute h-5 rounded px-2 text-xs flex items-center truncate
                        ${eventTypeColors[event.type]}
                      `}
                      style={{ ...getBarStyle(event), top: '50%', transform: 'translateY(-50%)' }}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {Object.keys(groupedByUser).length === 0 && holidayEvents.length === 0 && (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <GanttChart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No scheduled items in this period</p>
                <p className="text-sm">Work items and holidays will appear here</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
