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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  Clock,
  Umbrella,
  ExternalLink,
  CalendarPlus,
  Save,
  Loader2,
  MapPin,
  Building2,
  Users,
  Paperclip,
  Link2,
  FolderOpen
} from 'lucide-react';
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
  type: 'splynx_task' | 'work_item' | 'holiday' | 'public_holiday' | 'block';
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
  type: 'splynx_task' | 'work_item' | 'holiday' | 'public_holiday' | 'block';
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
};

const eventTypeBgColors: Record<string, string> = {
  splynx_task: 'bg-blue-100 text-blue-800 border-blue-200',
  work_item: 'bg-purple-100 text-purple-800 border-purple-200',
  holiday: 'bg-green-100 text-green-800 border-green-200',
  public_holiday: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  block: 'bg-orange-100 text-orange-800 border-orange-200',
};

const statusColors: Record<string, string> = {
  Planning: 'bg-gray-100 text-gray-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  Done: 'bg-green-100 text-green-800',
  Blocked: 'bg-red-100 text-red-800',
};

export default function CalendarPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showHolidayDialog, setShowHolidayDialog] = useState(false);
  const [createMenuDay, setCreateMenuDay] = useState<Date | null>(null);
  const [createMenuPosition, setCreateMenuPosition] = useState<{ x: number; y: number } | null>(null);
  
  const [hiddenEventTypes, setHiddenEventTypes] = useState<Set<string>>(new Set());
  const [showWeekends, setShowWeekends] = useState(true);
  
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
    assigned_to: number;
    team_id: number;
    project_id: number;
  } | null>(null);

  const createBlockMutation = useMutation({
    mutationFn: async (data: typeof blockForm) => {
      return apiRequest('/api/calendar/blocks', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          blocksAvailability: true,
        }),
      });
    },
    onSuccess: () => {
      toast({ title: 'Calendar block created successfully' });
      setShowBlockDialog(false);
      setBlockForm({
        title: '',
        description: '',
        blockType: 'other',
        startDatetime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endDatetime: format(new Date(), "yyyy-MM-dd'T'17:00"),
        isAllDay: false,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/combined'] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create block', description: error.message, variant: 'destructive' });
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
        body: JSON.stringify({
          ...data,
          daysCount,
        }),
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
    if (event.type === 'work_item' && event.metadata?.workItemId) {
      navigate(`/strategy/work-items?id=${event.metadata.workItemId}`);
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
      setSelectedEvent(null);
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
      if (task.scheduled_from) {
        const parts = task.scheduled_from.split(' ');
        if (parts[0]) scheduledDate = parts[0]; // yyyy-mm-dd
        if (parts[1]) scheduledTime = parts[1].substring(0, 5); // hh:mm
      }
      
      setSplynxTaskEdit({
        title: task.title || '',
        description: task.description || '',
        location: task.address || '',
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        assigned_to: derivedAdminId,
        team_id: derivedTeamId,
        project_id: task.project_id || 0,
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
      const time = splynxTaskEdit.scheduled_time || '00:00';
      payload.scheduled_from = `${splynxTaskEdit.scheduled_date} ${time}:00`;
    }
    if (splynxTaskEdit.assigned_to && splynxTaskEdit.assigned_to > 0) payload.assignee = splynxTaskEdit.assigned_to;
    if (splynxTaskEdit.team_id && splynxTaskEdit.team_id > 0) payload.team_id = splynxTaskEdit.team_id;
    if (splynxTaskEdit.project_id && splynxTaskEdit.project_id > 0) payload.project_id = splynxTaskEdit.project_id;
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
        if (hiddenEventTypes.has('splynx') && evt.type === 'splynx_task') return false;
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
            
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
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => navigate('/settings/bookable-appointments')}
                  data-testid="menu-splynx-booking"
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Manage Appointments
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
          />
        ) : viewMode === 'week' ? (
          <WeekView 
            days={days} 
            events={events}
            hours={workingHours}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
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
                  {selectedEvent.type === 'splynx_task' && (
                    <a 
                      href={`https://manage.country-connect.co.uk/admin/scheduling/tasks?view=details&task_id=${splynxTaskId}`}
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
                          <span>{format(selectedEvent.start, 'MMM d, yyyy')}</span>
                        </div>
                        {!selectedEvent.allDay && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{format(selectedEvent.start, 'h:mm a')} - {format(selectedEvent.end, 'h:mm a')}</span>
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
                            
                            {/* Date & Time - Compact 2-column */}
                            <div className="grid grid-cols-2 gap-2">
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
                            
                            {/* Project */}
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
                  <div className="space-y-3 pt-2">
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
                    <div className="text-xs text-muted-foreground pt-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <Umbrella className="h-3 w-3 mr-1" />
                        Holiday Request
                      </Badge>
                    </div>
                  </div>
                )}

                {selectedEvent.type === 'block' && (
                  <div className="space-y-3 pt-2">
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
                      <div className="pt-2">
                        <Button 
                          onClick={() => handleNavigateToEvent(selectedEvent)}
                          className="w-full"
                          data-testid="button-open-work-item"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Work Item
                        </Button>
                      </div>
                    )}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)} data-testid="button-cancel-block">
              Cancel
            </Button>
            <Button 
              onClick={() => createBlockMutation.mutate(blockForm)}
              disabled={!blockForm.title || createBlockMutation.isPending}
              data-testid="button-create-block"
            >
              {createBlockMutation.isPending ? 'Creating...' : 'Create Block'}
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
}

function MonthView({ days, currentDate, getEventsForDay, onEventClick, onDayClick }: MonthViewProps) {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
              `}
              data-testid={`day-cell-${format(day, 'yyyy-MM-dd')}`}
              onClick={(e) => onDayClick?.(day, e)}
            >
              <div className={`
                text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full
                ${isCurrentDay ? 'bg-primary text-primary-foreground' : ''}
              `}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    className={`
                      text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80
                      ${eventTypeColors[event.type]}
                    `}
                    title={event.title}
                    data-testid={`event-${event.id}`}
                  >
                    {event.title}
                  </div>
                ))}
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
}

function WeekView({ days, events, hours, onEventClick, onSlotClick }: WeekViewProps) {
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

      <ScrollArea className="flex-1 overflow-x-hidden">
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
                    `}
                    onClick={(e) => onSlotClick?.(day, hour, e)}
                    data-testid={`slot-${format(day, 'yyyy-MM-dd')}-${hour}`}
                  >
                    {hourEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick?.(event); }}
                        className={`
                          absolute left-0.5 right-0.5 top-0.5 text-[10px] p-1 rounded truncate z-10 cursor-pointer hover:opacity-80
                          ${eventTypeColors[event.type]}
                        `}
                        title={event.title}
                        data-testid={`event-week-timed-${event.id}`}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface DayViewProps {
  day: Date;
  events: CalendarEvent[];
  hours: number[];
  onEventClick?: (event: CalendarEvent) => void;
  onSlotClick?: (day: Date, hour: number, event: React.MouseEvent) => void;
}

function DayView({ day, events, hours, onEventClick, onSlotClick }: DayViewProps) {
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
              <div key={hour} className="flex border-b min-h-[56px]">
                <div className="w-20 shrink-0 pr-3 py-2 text-right text-sm text-muted-foreground">
                  {format(hourDate, 'h:mm a')}
                </div>
                <div 
                  className="flex-1 py-1 px-2 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={(e) => onSlotClick?.(day, hour, e)}
                  data-testid={`day-slot-${hour}`}
                >
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick?.(event); }}
                      className={`
                        p-2 rounded mb-1 flex items-start gap-3 cursor-pointer hover:opacity-80
                        ${eventTypeBgColors[event.type]}
                      `}
                      data-testid={`event-day-timed-${event.id}`}
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
