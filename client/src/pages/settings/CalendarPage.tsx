import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  User,
  Users,
  Sun,
  Briefcase,
  Plus,
  Settings,
  Filter
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
  subDays
} from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'task' | 'holiday' | 'block' | 'work_item';
  color?: string;
  userId?: number;
  userName?: string;
}

interface HolidayRequest {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  status: string;
  type: string;
  reason: string;
}

interface CalendarBlock {
  id: number;
  userId: number;
  title: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  blockType: string;
}

interface PublicHoliday {
  id: number;
  name: string;
  date: string;
  region: string;
}

interface WorkItem {
  id: number;
  title: string;
  status: string;
  dueDate: string;
  assignedTo: number;
}

type ViewMode = 'month' | 'week' | 'day';

const eventTypeColors: Record<string, string> = {
  task: 'bg-blue-100 text-blue-800 border-blue-200',
  holiday: 'bg-green-100 text-green-800 border-green-200',
  block: 'bg-orange-100 text-orange-800 border-orange-200',
  work_item: 'bg-purple-100 text-purple-800 border-purple-200',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  const startDate = useMemo(() => {
    if (viewMode === 'month') {
      return format(startOfWeek(startOfMonth(currentDate)), 'yyyy-MM-dd');
    } else if (viewMode === 'week') {
      return format(startOfWeek(currentDate), 'yyyy-MM-dd');
    } else {
      return format(startOfDay(currentDate), 'yyyy-MM-dd');
    }
  }, [currentDate, viewMode]);

  const endDate = useMemo(() => {
    if (viewMode === 'month') {
      return format(endOfWeek(endOfMonth(currentDate)), 'yyyy-MM-dd');
    } else if (viewMode === 'week') {
      return format(endOfWeek(currentDate), 'yyyy-MM-dd');
    } else {
      return format(endOfDay(currentDate), 'yyyy-MM-dd');
    }
  }, [currentDate, viewMode]);

  const { data: calendarData, isLoading } = useQuery<{
    holidayRequests: Array<{ request: HolidayRequest; user: { id: number; fullName: string } }>;
    calendarBlocks: Array<{ block: CalendarBlock; user: { id: number; fullName: string } }>;
    publicHolidays: PublicHoliday[];
    workItems: WorkItem[];
  }>({
    queryKey: ['/api/calendar/combined', startDate, endDate, selectedUserId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        includeHolidays: 'true',
        includeBlocks: 'true',
        includePublicHolidays: 'true',
        includeWorkItems: 'true',
      });
      if (selectedUserId !== 'all') {
        params.append('userIds', selectedUserId);
      }
      const response = await fetch(`/api/calendar/combined?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch calendar data');
      const data = await response.json();
      return data;
    },
  });

  const { data: teamMembers } = useQuery<Array<{ id: number; fullName: string; email: string }>>({
    queryKey: ['/api/teams/members'],
    queryFn: async () => {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.users || data || [];
    },
  });

  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    if (calendarData?.holidayRequests) {
      calendarData.holidayRequests.forEach(({ request, user }) => {
        allEvents.push({
          id: `holiday-${request.id}`,
          title: `${user?.fullName || 'User'} - ${request.type}`,
          start: new Date(request.startDate),
          end: new Date(request.endDate),
          type: 'holiday',
          userId: request.userId,
          userName: user?.fullName,
        });
      });
    }

    if (calendarData?.calendarBlocks) {
      calendarData.calendarBlocks.forEach(({ block, user }) => {
        allEvents.push({
          id: `block-${block.id}`,
          title: block.title,
          start: new Date(block.startTime),
          end: new Date(block.endTime),
          type: 'block',
          userId: block.userId,
          userName: user?.fullName,
        });
      });
    }

    if (calendarData?.publicHolidays) {
      calendarData.publicHolidays.forEach((holiday) => {
        allEvents.push({
          id: `public-${holiday.id}`,
          title: holiday.name,
          start: new Date(holiday.date),
          end: new Date(holiday.date),
          type: 'holiday',
        });
      });
    }

    if (calendarData?.workItems) {
      calendarData.workItems.forEach((item) => {
        if (item.dueDate) {
          allEvents.push({
            id: `work-${item.id}`,
            title: item.title,
            start: new Date(item.dueDate),
            end: new Date(item.dueDate),
            type: 'work_item',
            userId: item.assignedTo,
          });
        }
      });
    }

    return allEvents;
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
      return day >= eventStart && day <= eventEnd;
    });
  };

  const navigatePrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDateRangeLabel = () => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy');
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Manage team schedules, holidays, and appointments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" data-testid="button-settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button size="sm" data-testid="button-add-event">
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={navigatePrevious}
                data-testid="button-previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={navigateNext}
                data-testid="button-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={goToToday}
                data-testid="button-today"
              >
                Today
              </Button>
              <h2 className="text-lg font-semibold ml-4" data-testid="text-date-range">
                {getDateRangeLabel()}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-[180px]" data-testid="select-user-filter">
                  <SelectValue placeholder="All team members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All team members</SelectItem>
                  {teamMembers?.map((member) => (
                    <SelectItem key={member.id} value={String(member.id)}>
                      {member.fullName || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList>
                  <TabsTrigger value="month" data-testid="tab-month">Month</TabsTrigger>
                  <TabsTrigger value="week" data-testid="tab-week">Week</TabsTrigger>
                  <TabsTrigger value="day" data-testid="tab-day">Day</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
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
              hours={hours}
            />
          ) : (
            <DayView 
              day={currentDate} 
              events={getEventsForDay(currentDate)}
              hours={hours}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Upcoming Holidays
            </CardTitle>
            <CardDescription>Team holiday requests and public holidays</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {calendarData?.publicHolidays?.length === 0 && calendarData?.holidayRequests?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No upcoming holidays</p>
              ) : (
                <div className="space-y-3">
                  {calendarData?.publicHolidays?.map((holiday) => (
                    <div key={holiday.id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                      <div>
                        <p className="font-medium text-sm">{holiday.name}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(holiday.date), 'EEEE, MMM d')}</p>
                      </div>
                      <Badge variant="secondary">Public</Badge>
                    </div>
                  ))}
                  {calendarData?.holidayRequests?.map(({ request, user }) => (
                    <div key={request.id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                      <div>
                        <p className="font-medium text-sm">{user?.fullName || 'Team Member'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d')}
                        </p>
                      </div>
                      <Badge className={statusColors[request.status] || ''}>
                        {request.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Work Items Due
            </CardTitle>
            <CardDescription>Tasks and work items with upcoming due dates</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {calendarData?.workItems?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No work items due in this period</p>
              ) : (
                <div className="space-y-3">
                  {calendarData?.workItems?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {item.dueDate ? format(new Date(item.dueDate), 'MMM d') : 'No date'}
                        </p>
                      </div>
                      <Badge variant="outline">{item.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">Legend:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Tasks</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Holidays</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span>Blocked Time</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span>Work Items</span>
        </div>
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
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={i}
              className={`
                min-h-[100px] p-1 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors
                ${!isCurrentMonth ? 'opacity-40' : ''}
                ${isCurrentDay ? 'border-primary bg-primary/5' : 'border-border'}
              `}
              data-testid={`day-cell-${format(day, 'yyyy-MM-dd')}`}
            >
              <div className={`
                text-sm font-medium mb-1
                ${isCurrentDay ? 'text-primary' : ''}
              `}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className={`
                      text-xs p-0.5 px-1 rounded truncate cursor-pointer
                      ${eventTypeColors[event.type]}
                    `}
                    title={event.title}
                    data-testid={`event-${event.id}`}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground pl-1">
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
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="grid grid-cols-8 gap-1 mb-1">
          <div className="p-2" />
          {days.map((day, i) => (
            <div 
              key={i} 
              className={`
                p-2 text-center text-sm font-medium
                ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}
              `}
            >
              <div>{format(day, 'EEE')}</div>
              <div className={`
                text-lg 
                ${isToday(day) ? 'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}
              `}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        <ScrollArea className="h-[600px]">
          <div className="grid grid-cols-8 gap-px bg-border">
            {hours.map((hour) => (
              <>
                <div key={`hour-${hour}`} className="p-1 text-xs text-muted-foreground bg-background text-right pr-2">
                  {format(new Date().setHours(hour, 0), 'ha')}
                </div>
                {days.map((day, dayIndex) => {
                  const dayStart = new Date(day);
                  dayStart.setHours(hour, 0, 0, 0);
                  const dayEnd = new Date(day);
                  dayEnd.setHours(hour + 1, 0, 0, 0);
                  
                  const hourEvents = events.filter((event) => {
                    const eventStart = new Date(event.start);
                    return isSameDay(eventStart, day) && eventStart.getHours() === hour;
                  });

                  return (
                    <div 
                      key={`${hour}-${dayIndex}`} 
                      className="min-h-[40px] p-0.5 bg-background border-t border-border/50 relative"
                    >
                      {hourEvents.map((event) => (
                        <div
                          key={event.id}
                          className={`
                            text-xs p-1 rounded truncate mb-0.5
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
              </>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

interface DayViewProps {
  day: Date;
  events: CalendarEvent[];
  hours: number[];
}

function DayView({ day, events, hours }: DayViewProps) {
  return (
    <div>
      <ScrollArea className="h-[600px]">
        <div className="space-y-px">
          {hours.map((hour) => {
            const hourEvents = events.filter((event) => {
              const eventStart = new Date(event.start);
              return eventStart.getHours() === hour;
            });

            return (
              <div key={hour} className="flex border-t border-border/50">
                <div className="w-20 p-2 text-sm text-muted-foreground text-right shrink-0">
                  {format(new Date().setHours(hour, 0), 'h:mm a')}
                </div>
                <div className="flex-1 min-h-[60px] p-1 hover:bg-muted/30 transition-colors">
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`
                        p-2 rounded mb-1
                        ${eventTypeColors[event.type]}
                      `}
                    >
                      <div className="font-medium text-sm">{event.title}</div>
                      {event.userName && (
                        <div className="text-xs opacity-75 flex items-center gap-1 mt-1">
                          <User className="h-3 w-3" />
                          {event.userName}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
