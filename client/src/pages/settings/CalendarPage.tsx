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
  Link2
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
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showHolidayDialog, setShowHolidayDialog] = useState(false);
  
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

  const handleDayClick = (day: Date) => {
    setCurrentDate(day);
    setViewMode('day');
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
        body: JSON.stringify(updates),
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
      setSplynxTaskEdit({
        title: splynxTaskDetail.task.title || '',
        description: splynxTaskDetail.task.description || '',
        location: splynxTaskDetail.task.location || '',
        scheduled_date: splynxTaskDetail.task.scheduled_date || '',
        scheduled_time: splynxTaskDetail.task.scheduled_time || '',
        assigned_to: splynxTaskDetail.task.assigned_to || 0,
        team_id: splynxTaskDetail.task.team_id || 0,
      });
    }
  };

  // Auto-open in edit mode when task details load
  useEffect(() => {
    if (splynxTaskDetail?.task && !splynxTaskEdit) {
      initSplynxTaskEdit();
    }
  }, [splynxTaskDetail]);

  const handleSaveSplynxTask = () => {
    if (!splynxTaskEdit) return;
    const payload: Record<string, any> = {};
    if (splynxTaskEdit.title) payload.title = splynxTaskEdit.title;
    if (splynxTaskEdit.description !== undefined) payload.description = splynxTaskEdit.description;
    if (splynxTaskEdit.location) payload.location = splynxTaskEdit.location;
    if (splynxTaskEdit.scheduled_date) payload.scheduled_date = splynxTaskEdit.scheduled_date;
    if (splynxTaskEdit.scheduled_time) payload.scheduled_time = splynxTaskEdit.scheduled_time;
    if (splynxTaskEdit.assigned_to && splynxTaskEdit.assigned_to > 0) payload.assigned_to = splynxTaskEdit.assigned_to;
    if (splynxTaskEdit.team_id && splynxTaskEdit.team_id > 0) payload.team_id = splynxTaskEdit.team_id;
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

  const { data: calendarData, isLoading } = useQuery<CalendarCombinedResponse>({
    queryKey: ['/api/calendar/combined', startDate, endDate, selectedUserId, selectedTeamId],
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
  }, [calendarData, hiddenEventTypes]);

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
            onEventClick={handleEventClick}
          />
        )}
      </div>

      <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && handleCloseEventDetail()}>
        <SheetContent className="sm:w-[640px]">
          {selectedEvent && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${eventTypeColors[selectedEvent.type].split(' ')[0]}`} />
                  {selectedEvent.title}
                </SheetTitle>
                <SheetDescription>
                  {selectedEvent.type === 'splynx_task' ? 'Splynx Task' : 
                   selectedEvent.type === 'work_item' ? 'Work Item' :
                   selectedEvent.type === 'holiday' ? 'Holiday' :
                   selectedEvent.type === 'public_holiday' ? 'Public Holiday' : 'Calendar Block'}
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Start</div>
                    <div className="text-sm font-medium">
                      {format(selectedEvent.start, 'PPP')}
                      {!selectedEvent.allDay && ` at ${format(selectedEvent.start, 'p')}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">End</div>
                    <div className="text-sm font-medium">
                      {format(selectedEvent.end, 'PPP')}
                      {!selectedEvent.allDay && ` at ${format(selectedEvent.end, 'p')}`}
                    </div>
                  </div>
                </div>
                
                {selectedEvent.userName && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Assigned To</div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" />
                      {selectedEvent.userName}
                    </div>
                  </div>
                )}
                
                {selectedEvent.status && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                    <Badge variant="outline">{selectedEvent.status}</Badge>
                  </div>
                )}

                {selectedEvent.type === 'splynx_task' && (
                  <div className="space-y-4 pt-2">
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
                                href={`https://manage.country-connect.co.uk/admin/customers/view/${splynxTaskDetail.customer.id}`}
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
                          <div className="space-y-3 pt-2 border-t">
                            <div className="text-sm font-medium">Edit Task</div>
                            <div className="space-y-2">
                              <Label htmlFor="task-title">Title</Label>
                              <Input 
                                id="task-title"
                                value={splynxTaskEdit.title}
                                onChange={(e) => setSplynxTaskEdit(prev => prev ? {...prev, title: e.target.value} : null)}
                                data-testid="input-task-title"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="task-description">Description</Label>
                              <Textarea 
                                id="task-description"
                                value={splynxTaskEdit.description}
                                onChange={(e) => setSplynxTaskEdit(prev => prev ? {...prev, description: e.target.value} : null)}
                                rows={3}
                                data-testid="input-task-description"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="task-location">Location</Label>
                              <Input 
                                id="task-location"
                                value={splynxTaskEdit.location}
                                onChange={(e) => setSplynxTaskEdit(prev => prev ? {...prev, location: e.target.value} : null)}
                                data-testid="input-task-location"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label htmlFor="task-date">Date</Label>
                                <Input 
                                  id="task-date"
                                  type="date"
                                  value={splynxTaskEdit.scheduled_date}
                                  onChange={(e) => setSplynxTaskEdit(prev => prev ? {...prev, scheduled_date: e.target.value} : null)}
                                  data-testid="input-task-date"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="task-time">Time</Label>
                                <Input 
                                  id="task-time"
                                  type="time"
                                  value={splynxTaskEdit.scheduled_time}
                                  onChange={(e) => setSplynxTaskEdit(prev => prev ? {...prev, scheduled_time: e.target.value} : null)}
                                  data-testid="input-task-time"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="task-team">Team</Label>
                              <Select 
                                value={splynxTaskEdit.team_id?.toString() || ''} 
                                onValueChange={(value) => setSplynxTaskEdit(prev => prev ? {...prev, team_id: parseInt(value)} : null)}
                              >
                                <SelectTrigger data-testid="select-task-team">
                                  <SelectValue placeholder="Select team" />
                                </SelectTrigger>
                                <SelectContent>
                                  {filtersData?.filters?.splynxTeams?.map((team: any) => (
                                    <SelectItem key={team.id} value={team.id.toString()}>
                                      {team.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="task-assignee">Assignee</Label>
                              <Select 
                                value={splynxTaskEdit.assigned_to?.toString() || ''} 
                                onValueChange={(value) => setSplynxTaskEdit(prev => prev ? {...prev, assigned_to: parseInt(value)} : null)}
                              >
                                <SelectTrigger data-testid="select-task-assignee">
                                  <SelectValue placeholder="Select assignee" />
                                </SelectTrigger>
                                <SelectContent>
                                  {filtersData?.filters?.splynxAdmins?.map((admin: any) => (
                                    <SelectItem key={admin.id} value={admin.id.toString()}>
                                      {admin.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {splynxTaskDetail?.task?.attachments && splynxTaskDetail.task.attachments.length > 0 && (
                              <div className="space-y-2">
                                <Label className="flex items-center gap-1">
                                  <Paperclip className="h-3 w-3" />
                                  Attachments
                                </Label>
                                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded space-y-1">
                                  {splynxTaskDetail.task.attachments.map((attachment: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-1">
                                      <Paperclip className="h-3 w-3" />
                                      <span>{attachment.filename || attachment.name || `Attachment ${idx + 1}`}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex gap-2 pt-2">
                              <Button 
                                onClick={handleSaveSplynxTask}
                                disabled={updateSplynxTaskMutation.isPending}
                                className="flex-1"
                                data-testid="button-save-task"
                              >
                                {updateSplynxTaskMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4 mr-2" />
                                )}
                                Save & Sync to Splynx
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => setSplynxTaskEdit(null)}
                                data-testid="button-cancel-edit"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {splynxTaskDetail.task.assigned_to && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Assignee
                                </div>
                                <div className="text-sm">
                                  {filtersData?.filters?.splynxAdmins?.find((a: any) => a.id === splynxTaskDetail.task.assigned_to)?.name || 
                                   `Admin #${splynxTaskDetail.task.assigned_to}`}
                                </div>
                              </div>
                            )}
                            
                            {splynxTaskDetail.task.description && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Description</div>
                                <div 
                                  className="text-sm prose prose-sm max-w-none bg-muted/30 p-2 rounded [&_div]:mb-1 [&_h4]:text-sm [&_h4]:font-semibold"
                                  dangerouslySetInnerHTML={{ 
                                    __html: DOMPurify.sanitize(splynxTaskDetail.task.description) 
                                  }}
                                />
                              </div>
                            )}
                            
                            {splynxTaskDetail.task.location && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  Location
                                </div>
                                <div className="text-sm">{splynxTaskDetail.task.location}</div>
                              </div>
                            )}
                            
                            {splynxTaskDetail.task.attachments && splynxTaskDetail.task.attachments.length > 0 && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                  <Paperclip className="h-3 w-3" />
                                  Attachments ({splynxTaskDetail.task.attachments.length})
                                </div>
                                <div className="text-sm bg-muted/30 p-2 rounded space-y-1">
                                  {splynxTaskDetail.task.attachments.map((attachment: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-1 text-xs">
                                      <Paperclip className="h-3 w-3" />
                                      <span>{attachment.filename || attachment.name || `Attachment ${idx + 1}`}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex gap-2 pt-2">
                              <Button 
                                onClick={initSplynxTaskEdit}
                                variant="outline"
                                className="flex-1"
                                data-testid="button-edit-task"
                              >
                                Edit Task
                              </Button>
                              <a 
                                href={`https://manage.country-connect.co.uk/admin/scheduling/tasks?view=details&task_id=${splynxTaskId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm border rounded-md hover:bg-muted"
                                data-testid="link-splynx-task"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Open in Splynx
                              </a>
                            </div>
                          </>
                        )}
                        
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            <CalendarIcon className="h-3 w-3 mr-1" />
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
  onDayClick?: (day: Date) => void;
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
              onClick={() => onDayClick?.(day)}
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
}

function WeekView({ days, events, hours, onEventClick }: WeekViewProps) {
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
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex border-b min-w-0">
        <div className="w-16 shrink-0" />
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
      
      <div className="flex border-b bg-muted/30 min-w-0">
        <div className="w-16 shrink-0 pr-2 py-1 text-right text-[10px] text-muted-foreground">
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

      <ScrollArea className="flex-1 overflow-hidden">
        <div className="flex min-w-0">
          <div className="w-16 shrink-0">
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
                      h-12 border-b relative
                      ${isToday(day) ? 'bg-primary/5' : ''}
                    `}
                  >
                    {hourEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
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
}

function DayView({ day, events, hours, onEventClick }: DayViewProps) {
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
                <div className="flex-1 py-1 px-2 hover:bg-muted/20 transition-colors">
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
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
