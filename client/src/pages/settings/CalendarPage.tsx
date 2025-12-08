import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  Layers
} from 'lucide-react';
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');

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
    
    return calendarData.events.map((evt): CalendarEvent => ({
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
  }, [calendarData]);

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
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      return [currentDate];
    }
  }, [currentDate, viewMode]);

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
            
            <Button size="icon" className="h-8 w-8" data-testid="button-add-event">
              <Plus className="h-4 w-4" />
            </Button>
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
                {teams.map((team) => (
                  <SelectItem key={team.id} value={String(team.id)}>
                    {team.name}
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

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded bg-blue-500" />
                <span>Splynx</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded bg-purple-500" />
                <span>Work</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded bg-green-500" />
                <span>Leave</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded bg-orange-500" />
                <span>Block</span>
              </div>
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
          />
        ) : viewMode === 'week' ? (
          <WeekView 
            days={days} 
            events={events}
            hours={workingHours}
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
          />
        )}
      </div>
    </div>
  );
}

interface MonthViewProps {
  days: Date[];
  currentDate: Date;
  getEventsForDay: (day: Date) => CalendarEvent[];
}

function MonthView({ days, currentDate, getEventsForDay }: MonthViewProps) {
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
                    className={`
                      text-[10px] leading-tight px-1 py-0.5 rounded truncate
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
}

function WeekView({ days, events, hours }: WeekViewProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b">
        <div className="w-16 shrink-0" />
        {days.map((day, i) => (
          <div 
            key={i} 
            className={`
              flex-1 p-2 text-center border-l
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
      <ScrollArea className="flex-1">
        <div className="flex">
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
            <div key={dayIndex} className="flex-1 border-l">
              {hours.map((hour) => {
                const hourEvents = events.filter((event) => {
                  const eventStart = new Date(event.start);
                  return isSameDay(eventStart, day) && eventStart.getHours() === hour;
                });

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
                        className={`
                          absolute left-0.5 right-0.5 top-0.5 text-[10px] p-1 rounded truncate z-10
                          ${eventTypeColors[event.type]}
                        `}
                        title={event.title}
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
}

function DayView({ day, events, hours }: DayViewProps) {
  const getEventsForHour = (hour: number) => {
    return events.filter((event) => {
      const eventStart = new Date(event.start);
      return eventStart.getHours() === hour;
    });
  };

  return (
    <div className="h-full flex">
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-4">
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
                      className={`
                        p-2 rounded mb-1 flex items-start gap-3
                        ${eventTypeBgColors[event.type]}
                      `}
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
                className={`
                  p-2 rounded text-sm
                  ${eventTypeBgColors[event.type]}
                `}
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
