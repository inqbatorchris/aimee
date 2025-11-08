import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { MobileWorkItemCard } from '@/components/meeting/MobileWorkItemCard';
import { 
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ArrowLeft,
  Plus,
  Calendar,
  Users,
  MoreHorizontal,
  Eye,
  EyeOff,
  PlayCircle,
  UserCheck,
  MessageSquare,
  LayoutGrid,
  List,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
  X
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  subWeeks, 
  parseISO,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  addQuarters,
  subQuarters,
  startOfYear,
  endOfYear,
  addYears,
  subYears
} from 'date-fns';
import WorkItemPanel from '@/components/work-items/WorkItemPanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LinearMeetingRunner } from '@/components/meeting/LinearMeetingRunner';
import { MeetingSummaryView } from '@/components/meeting/MeetingSummaryView';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// T2: Org timezone formatter - single source of truth for display
const ORG_TZ = 'Europe/London';

function formatInOrgTz(dateISO: string | Date, fmt: Intl.DateTimeFormatOptions = {}): string {
  const d = typeof dateISO === 'string' ? new Date(dateISO) : dateISO;
  // Minimal, DST-safe: Intl with timeZone
  const base: Intl.DateTimeFormatOptions = { timeZone: ORG_TZ, year: 'numeric', month: 'short', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-GB', { ...base, ...fmt }).format(d);
  return parts;
}

// Helper function to display meeting status with proper naming
function getMeetingStatusDisplay(status: string): string {
  if (status === 'Skipped') return 'Skipped / cancelled';
  return status;
}

// Period type for selector
type PeriodType = 'week' | 'month' | 'quarter' | 'year' | 'custom';

// Helper function to compute date window for a period
function windowFor(period: PeriodType, ref: Date): { start: Date; end: Date } {
  switch (period) {
    case 'week':
      return {
        start: startOfWeek(ref, { weekStartsOn: 1 }), // ISO week Mon-Sun
        end: endOfWeek(ref, { weekStartsOn: 1 })
      };
    case 'month':
      return {
        start: startOfMonth(ref),
        end: endOfMonth(ref)
      };
    case 'quarter':
      return {
        start: startOfQuarter(ref),
        end: endOfQuarter(ref)
      };
    case 'year':
      return {
        start: startOfYear(ref),
        end: endOfYear(ref)
      };
    case 'custom':
      // For custom, return current dateWindow as-is (will be set explicitly)
      // This is a placeholder that should not be called directly
      return { start: ref, end: ref };
  }
}

// Helper function to format date window based on period type
function formatDateWindow(start: Date, end: Date, period: PeriodType): string {
  switch (period) {
    case 'week':
    case 'custom':
      // Week/custom: "MMM d - MMM d, yyyy"
      return `${formatInOrgTz(start, { month: 'short', day: 'numeric' })} - ${formatInOrgTz(end, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    case 'month':
      // Month: "MMMM yyyy"
      return formatInOrgTz(start, { month: 'long', year: 'numeric' });
    case 'quarter':
      // Quarter: "Qn yyyy"
      const quarter = Math.floor(start.getMonth() / 3) + 1;
      return `Q${quarter} ${formatInOrgTz(start, { year: 'numeric' })}`;
    case 'year':
      // Year: "yyyy"
      return formatInOrgTz(start, { year: 'numeric' });
  }
}

export default function CheckInDashboard() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // Parse query parameters
  const params = new URLSearchParams(location.split('?')[1] || '');
  const urlTeamId = params.get('teamId');
  const urlStart = params.get('start');
  const urlEnd = params.get('end');
  const urlView = params.get('view');
  const urlPeriod = params.get('period') as PeriodType | null;
  
  const [selectedTeamId, setSelectedTeamId] = useState<number | 'all' | null>(
    urlTeamId ? (urlTeamId === 'all' ? 'all' : parseInt(urlTeamId)) : null
  );
  const [dateWindow, setDateWindow] = useState<{ start: Date; end: Date }>(() => {
    // If URL has start/end, use them
    if (urlStart && urlEnd) {
      return {
        start: parseISO(urlStart),
        end: parseISO(urlEnd)
      };
    }
    // Otherwise use default for initial period type
    const initialPeriod = urlPeriod && ['week', 'month', 'quarter', 'year'].includes(urlPeriod) 
      ? urlPeriod 
      : 'week';
    return windowFor(initialPeriod as PeriodType, new Date());
  });
  
  // Period selector state - initialize from URL if present
  const [periodType, setPeriodType] = useState<PeriodType>(() => {
    // If URL has valid period and matching start/end dates, use it
    if (urlPeriod && ['week', 'month', 'quarter', 'year', 'custom'].includes(urlPeriod)) {
      return urlPeriod;
    }
    // Otherwise default to week
    return 'week';
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showCreateWorkItem, setShowCreateWorkItem] = useState(false);
  const [showMeetingRunner, setShowMeetingRunner] = useState(false);
  const [runnerMeeting, setRunnerMeeting] = useState<any>(null);
  const [runnerTeamMembers, setRunnerTeamMembers] = useState<any[]>([]);
  const [showMeetingSummary, setShowMeetingSummary] = useState(false);
  const [summaryMeeting, setSummaryMeeting] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'all' | 'team'>(urlView === 'team' ? 'team' : 'all');
  const [layoutMode, setLayoutMode] = useState<'list' | 'board'>('board');
  const [isBacklogCollapsed, setIsBacklogCollapsed] = useState(true);
  const [selectedBacklogItems, setSelectedBacklogItems] = useState<number[]>([]);
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState<any>(null);
  const [showWorkItemPanel, setShowWorkItemPanel] = useState(false);
  const [showSkippedCancelled, setShowSkippedCancelled] = useState(false);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [selectedMeetingToSkip, setSelectedMeetingToSkip] = useState<any>(null);
  
  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  // Fetch teams for the organization
  const { data: teams = [], isLoading: teamsLoading } = useQuery<any[]>({
    queryKey: ['/api/core/teams', { orgId: currentUser?.organizationId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentUser?.organizationId) {
        params.append('orgId', currentUser.organizationId.toString());
      }
      const response = await apiRequest(`/api/core/teams?${params.toString()}`);
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
  });

  // Set default team when teams are loaded
  useEffect(() => {
    if (teams.length > 0 && selectedTeamId === null) {
      // Check if URL has a team ID
      if (urlTeamId) {
        const teamId = urlTeamId === 'all' ? 'all' : parseInt(urlTeamId);
        setSelectedTeamId(teamId);
      } else if (isAdmin) {
        setSelectedTeamId('all');
      } else {
        setSelectedTeamId(teams[0].id);
      }
    }
  }, [teams, selectedTeamId, isAdmin, urlTeamId]);

  // Fetch check-in meetings based on team and date window
  const { data: checkInMeetings = [], isLoading: meetingsLoading } = useQuery<any[]>({
    queryKey: ['/api/strategy/check-in-meetings', selectedTeamId, dateWindow.start.toISOString(), dateWindow.end.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTeamId && selectedTeamId !== 'all') {
        params.append('teamId', selectedTeamId.toString());
      }
      params.append('start', dateWindow.start.toISOString());
      params.append('end', dateWindow.end.toISOString());
      console.log('[period-test] Fetching meetings:', { 
        periodType, 
        start: format(dateWindow.start, 'yyyy-MM-dd'), 
        end: format(dateWindow.end, 'yyyy-MM-dd'),
        params: params.toString()
      });
      const response = await apiRequest(`/api/strategy/check-in-meetings?${params.toString()}`);
      const data = await response.json();
      console.log('[period-test] Meetings fetched:', { count: data.length });
      return data;
    },
    enabled: !!dateWindow.start && !!dateWindow.end,
  });

  // Fetch backlog items (targetMeetingId = null) for single team view
  const backlogQueryKey = selectedTeamId && selectedTeamId !== 'all' 
    ? `/api/work-items?teamId=${selectedTeamId}&targetMeetingId=null`
    : null;
  const { data: backlogItems = [], isLoading: backlogLoading, refetch: refetchBacklog } = useQuery<any[]>({
    queryKey: [backlogQueryKey],
    queryFn: async () => {
      if (!backlogQueryKey) return [];
      console.log('[backlog-debug] Fetching backlog items:', backlogQueryKey);
      const res = await apiRequest(backlogQueryKey);
      const data = await res.json();
      console.log('[backlog-debug] Backlog items received:', data);
      return Array.isArray(data) ? data : data?.data || [];
    },
    enabled: !!backlogQueryKey,
  });

  // Fetch work items for specific check-in meetings
  const { data: checkInItems = {}, isLoading: itemsLoading } = useQuery<Record<number, any[]>>({
    queryKey: ['/api/work-items', 'by-meetings', checkInMeetings.map(m => m.id)],
    queryFn: async () => {
      const itemsByMeeting: Record<number, any[]> = {};
      for (const meeting of checkInMeetings) {
        const params = new URLSearchParams();
        if (selectedTeamId && selectedTeamId !== 'all') {
          params.append('teamId', selectedTeamId.toString());
        }
        params.append('targetMeetingId', meeting.id.toString());
        const res = await apiRequest(`/api/work-items?${params.toString()}`);
        const data = await res.json();
        itemsByMeeting[meeting.id] = Array.isArray(data) ? data : data?.data || [];
      }
      return itemsByMeeting;
    },
    enabled: checkInMeetings.length > 0,
  });

  // Mutation to skip/cancel a meeting
  const skipMeetingMutation = useMutation({
    mutationFn: async ({ meetingId, reason }: { meetingId: number; reason: string }) => {
      const response = await apiRequest(`/api/strategy/check-in-meetings/${meetingId}/status`, {
        method: 'POST',
        body: { status: 'Skipped', reason },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ description: 'Check-in skipped/cancelled successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/check-in-meetings'] });
      setSkipDialogOpen(false);
      setSkipReason('');
      setSelectedMeetingToSkip(null);
    },
    onError: () => {
      toast({ 
        variant: 'destructive', 
        description: 'Failed to skip/cancel check-in' 
      });
    },
  });

  // Helper function to perform bulk assignment sequentially
  const handleBulkAssignment = async (itemIds: number[], targetMeetingId: number) => {
    setIsBulkAssigning(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const itemId of itemIds) {
        try {
          await updateWorkItemMutation.mutateAsync({
            workItemId: itemId,
            targetMeetingId: targetMeetingId,
            oldMeetingId: null
          });
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to assign item ${itemId}:`, error);
        }
      }

      // Show summary toast
      if (successCount > 0) {
        toast({
          description: `Successfully assigned ${successCount} item${successCount !== 1 ? 's' : ''} to check-in${errorCount > 0 ? `. ${errorCount} failed.` : ''}`,
        });
      }
      
      if (errorCount === itemIds.length) {
        toast({
          variant: "destructive",
          description: "Failed to assign any items to check-in",
        });
      }

      // Clear selection if any items succeeded
      if (successCount > 0) {
        setSelectedBacklogItems([]);
      }
    } finally {
      setIsBulkAssigning(false);
    }
  };

  // Mutation to update work item's target meeting with optimistic updates
  const updateWorkItemMutation = useMutation({
    mutationFn: async (data: { workItemId: number; targetMeetingId: number | null; oldMeetingId: number | null }) => {
      return await apiRequest(`/api/work-items/${data.workItemId}`, {
        method: 'PATCH',
        body: { targetMeetingId: data.targetMeetingId },
      });
    },
    onMutate: async ({ workItemId, targetMeetingId, oldMeetingId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/work-items'] });
      
      // Optimistically update the cache
      const previousBacklog = backlogQueryKey ? queryClient.getQueryData([backlogQueryKey]) : null;
      const previousMeetings = queryClient.getQueryData(['/api/work-items', 'by-meetings']);
      
      // Find the item to move
      let itemToMove: any = null;
      
      // Check in backlog
      if (oldMeetingId === null && previousBacklog && backlogQueryKey) {
        const backlogArr = previousBacklog as any[];
        itemToMove = backlogArr.find(item => item.id === workItemId);
        if (itemToMove) {
          queryClient.setQueryData(
            [backlogQueryKey],
            backlogArr.filter(item => item.id !== workItemId)
          );
        }
      }
      
      // Check in old meeting
      if (oldMeetingId !== null && previousMeetings) {
        const meetingsData = previousMeetings as Record<number, any[]>;
        if (meetingsData[oldMeetingId]) {
          itemToMove = meetingsData[oldMeetingId].find(item => item.id === workItemId);
          if (itemToMove) {
            queryClient.setQueryData(
              ['/api/work-items', 'by-meetings', checkInMeetings.map(m => m.id)],
              {
                ...meetingsData,
                [oldMeetingId]: meetingsData[oldMeetingId].filter(item => item.id !== workItemId)
              }
            );
          }
        }
      }
      
      // Add to new location
      if (itemToMove) {
        if (targetMeetingId === null && backlogQueryKey) {
          // Add to backlog
          queryClient.setQueryData(
            [backlogQueryKey],
            (old: any[] = []) => [...old, itemToMove]
          );
        } else if (targetMeetingId !== null) {
          // Add to meeting
          queryClient.setQueryData(
            ['/api/work-items', 'by-meetings', checkInMeetings.map(m => m.id)],
            (old: Record<number, any[]> = {}) => ({
              ...old,
              [targetMeetingId]: [...(old[targetMeetingId] || []), itemToMove]
            })
          );
        }
      }
      
      return { previousBacklog, previousMeetings };
    },
    onError: (err, variables, context) => {
      // Revert optimistic updates on error
      if (context?.previousBacklog && backlogQueryKey) {
        queryClient.setQueryData(
          [backlogQueryKey],
          context.previousBacklog
        );
      }
      if (context?.previousMeetings) {
        queryClient.setQueryData(
          ['/api/work-items', 'by-meetings', checkInMeetings.map(m => m.id)],
          context.previousMeetings
        );
      }
      toast({
        variant: "destructive",
        description: "Failed to update work item",
      });
    },
    onSuccess: (_, variables) => {
      toast({
        description: variables.targetMeetingId 
          ? "Work item added to check-in" 
          : "Work item moved to backlog",
      });
      // Invalidate queries to ensure fresh data - using string-based keys to match MeetingRunnerSheet
      if (selectedTeamId && selectedTeamId !== 'all') {
        queryClient.invalidateQueries({ queryKey: [`/api/work-items?teamId=${selectedTeamId}&targetMeetingId=null`] });
      }
      if (variables.oldMeetingId !== null) {
        queryClient.invalidateQueries({ queryKey: [`/api/work-items?targetMeetingId=${variables.oldMeetingId}`] });
      }
      if (variables.targetMeetingId !== null) {
        queryClient.invalidateQueries({ queryKey: [`/api/work-items?targetMeetingId=${variables.targetMeetingId}`] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/work-items', 'by-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/check-in-meetings'] });
    },
  });

  // Initialize selected team on mount
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      // If admin, default to first team (not "all")
      // If not admin, default to first team
      setSelectedTeamId(teams[0].id);
    }
  }, [teams]); // Remove selectedTeamId from dependencies to avoid infinite loop

  // Update URL when periodType or dateWindow changes
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (selectedTeamId && selectedTeamId !== 'all') {
      newParams.set('teamId', selectedTeamId.toString());
    } else if (selectedTeamId === 'all') {
      newParams.set('teamId', 'all');
    }
    newParams.set('start', format(dateWindow.start, 'yyyy-MM-dd'));
    newParams.set('end', format(dateWindow.end, 'yyyy-MM-dd'));
    newParams.set('period', periodType);
    if (viewMode === 'team') {
      newParams.set('view', 'team');
    }
    
    const newUrl = `/strategy/checkin?${newParams.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [dateWindow, periodType, selectedTeamId, viewMode]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlPeriod = params.get('period') as PeriodType | null;
      const urlStart = params.get('start');
      const urlEnd = params.get('end');
      
      if (urlPeriod && ['week', 'month', 'quarter', 'year', 'custom'].includes(urlPeriod)) {
        setPeriodType(urlPeriod);
      }
      
      if (urlStart && urlEnd) {
        setDateWindow({
          start: parseISO(urlStart),
          end: parseISO(urlEnd)
        });
      }
      
      console.log('[period-test] URL state restored:', { 
        periodType: urlPeriod, 
        start: urlStart, 
        end: urlEnd 
      });
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handler for period type changes
  const handlePeriodTypeChange = (newPeriod: PeriodType) => {
    setPeriodType(newPeriod);
    if (newPeriod !== 'custom') {
      const window = windowFor(newPeriod, new Date());
      setDateWindow(window);
      console.log('[period-test] Period changed:', { 
        periodType: newPeriod, 
        start: format(window.start, 'yyyy-MM-dd'), 
        end: format(window.end, 'yyyy-MM-dd') 
      });
    }
  };

  // Handler for custom date range application
  const handleCustomDateApply = () => {
    if (!customStartDate || !customEndDate) {
      toast({ 
        variant: 'destructive', 
        description: 'Please select both start and end dates' 
      });
      return;
    }
    
    if (customStartDate >= customEndDate) {
      toast({ 
        variant: 'destructive', 
        description: 'Start date must be before end date' 
      });
      return;
    }
    
    // Check span <= 185 days
    const diffMs = customEndDate.getTime() - customStartDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 185) {
      toast({ 
        variant: 'destructive', 
        description: 'Date range cannot exceed 185 days' 
      });
      return;
    }
    
    setPeriodType('custom');
    setDateWindow({ start: customStartDate, end: customEndDate });
    setShowCustomDatePicker(false);
    console.log('[period-test] Custom period applied:', { 
      periodType: 'custom', 
      start: format(customStartDate, 'yyyy-MM-dd'), 
      end: format(customEndDate, 'yyyy-MM-dd'),
      days: diffDays
    });
  };

  // Period-aware navigation functions
  const navigateToPrevious = () => {
    setDateWindow(prev => {
      let newWindow: { start: Date; end: Date };
      switch (periodType) {
        case 'week':
          newWindow = { start: subWeeks(prev.start, 1), end: subWeeks(prev.end, 1) };
          break;
        case 'month':
          newWindow = { start: startOfMonth(subMonths(prev.start, 1)), end: endOfMonth(subMonths(prev.start, 1)) };
          break;
        case 'quarter':
          newWindow = { start: startOfQuarter(subQuarters(prev.start, 1)), end: endOfQuarter(subQuarters(prev.start, 1)) };
          break;
        case 'year':
          newWindow = { start: startOfYear(subYears(prev.start, 1)), end: endOfYear(subYears(prev.start, 1)) };
          break;
        case 'custom':
          return prev; // No navigation for custom
      }
      console.log('[period-test] Navigate previous:', { 
        periodType, 
        start: format(newWindow.start, 'yyyy-MM-dd'), 
        end: format(newWindow.end, 'yyyy-MM-dd') 
      });
      return newWindow;
    });
  };

  const navigateToNext = () => {
    setDateWindow(prev => {
      let newWindow: { start: Date; end: Date };
      switch (periodType) {
        case 'week':
          newWindow = { start: addWeeks(prev.start, 1), end: addWeeks(prev.end, 1) };
          break;
        case 'month':
          newWindow = { start: startOfMonth(addMonths(prev.start, 1)), end: endOfMonth(addMonths(prev.start, 1)) };
          break;
        case 'quarter':
          newWindow = { start: startOfQuarter(addQuarters(prev.start, 1)), end: endOfQuarter(addQuarters(prev.start, 1)) };
          break;
        case 'year':
          newWindow = { start: startOfYear(addYears(prev.start, 1)), end: endOfYear(addYears(prev.start, 1)) };
          break;
        case 'custom':
          return prev; // No navigation for custom
      }
      console.log('[period-test] Navigate next:', { 
        periodType, 
        start: format(newWindow.start, 'yyyy-MM-dd'), 
        end: format(newWindow.end, 'yyyy-MM-dd') 
      });
      return newWindow;
    });
  };

  const navigateToCurrent = () => {
    const window = windowFor(periodType, new Date());
    setDateWindow(window);
    console.log('[period-test] Navigate to current:', { 
      periodType, 
      start: format(window.start, 'yyyy-MM-dd'), 
      end: format(window.end, 'yyyy-MM-dd') 
    });
  };

  // Check for large date ranges and show warning
  useEffect(() => {
    if (checkInMeetings.length > 500) {
      toast({
        description: 'Large range; consider narrowing the view.',
        duration: 5000
      });
      console.log('[period-test] Large range warning:', { 
        meetingCount: checkInMeetings.length 
      });
    }
  }, [checkInMeetings.length]);

  // Group check-ins by team for "All Teams" view
  const checkInsByTeam = checkInMeetings.reduce((acc: Record<number, any[]>, meeting) => {
    if (!acc[meeting.teamId]) {
      acc[meeting.teamId] = [];
    }
    acc[meeting.teamId].push(meeting);
    return acc;
  }, {});
  
  // Sort meetings by scheduledDate ASC within each team
  Object.keys(checkInsByTeam).forEach(teamId => {
    checkInsByTeam[Number(teamId)].sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
  });

  // Generate dynamic timeline columns based on period type
  const getTimelineColumns = () => {
    switch (periodType) {
      case 'week':
        return [
          { label: 'This Week', bgColor: 'bg-blue-50', placeholder: 'No check-ins this week' },
          { label: 'Next Week', bgColor: 'bg-green-50', placeholder: 'Coming soon...' },
          { label: 'Week After', bgColor: 'bg-gray-50', placeholder: 'Future planning...' }
        ];
      case 'month':
        return [
          { label: 'This Month', bgColor: 'bg-blue-50', placeholder: 'No check-ins this month' },
          { label: 'Next Month', bgColor: 'bg-green-50', placeholder: 'Coming soon...' },
          { label: 'Month After', bgColor: 'bg-gray-50', placeholder: 'Future planning...' }
        ];
      case 'quarter':
        return [
          { label: 'This Quarter', bgColor: 'bg-blue-50', placeholder: 'No check-ins this quarter' },
          { label: 'Next Quarter', bgColor: 'bg-green-50', placeholder: 'Coming soon...' },
          { label: 'Quarter After', bgColor: 'bg-gray-50', placeholder: 'Future planning...' }
        ];
      case 'year':
        return [
          { label: 'This Year', bgColor: 'bg-blue-50', placeholder: 'No check-ins this year' },
          { label: 'Next Year', bgColor: 'bg-green-50', placeholder: 'Coming soon...' },
          { label: 'Year After', bgColor: 'bg-gray-50', placeholder: 'Future planning...' }
        ];
      default:
        return [
          { label: 'This Week', bgColor: 'bg-blue-50', placeholder: 'No check-ins this week' },
          { label: 'Next Week', bgColor: 'bg-green-50', placeholder: 'Coming soon...' },
          { label: 'Week After', bgColor: 'bg-gray-50', placeholder: 'Future planning...' }
        ];
    }
  };

  // Get view button label based on period type
  const getViewButtonLabel = () => {
    switch (periodType) {
      case 'week':
        return 'Week View';
      case 'month':
        return 'Month View';
      case 'quarter':
        return 'Quarter View';
      case 'year':
        return 'Year View';
      default:
        return 'Week View';
    }
  };

  // Loading state
  const isLoading = teamsLoading || meetingsLoading || backlogLoading || itemsLoading;

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[1, 2].map(i => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full overflow-y-auto flex justify-center">
        <div className="w-full max-w-7xl p-4 lg:p-6">
        {/* Header with Date Strip and Team Selector */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="font-bold text-gray-900 text-[18px]">Check-in Dashboard</h1>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={navigateToPrevious}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <button
                  className="text-gray-600 hover:text-blue-600 cursor-pointer font-medium px-2 text-[12px] pl-[0.2px] pr-[0.2px]"
                  onClick={navigateToCurrent}
                  title="Click to jump to current period"
                >
                  <Calendar className="h-4 w-4 inline mr-1" />
                  {formatDateWindow(dateWindow.start, dateWindow.end, periodType)}
                </button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={navigateToNext}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {/* Period Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-2">
                      <Calendar className="h-4 w-4 mr-1" />
                      {periodType === 'week' ? 'Week' : 
                       periodType === 'month' ? 'Month' :
                       periodType === 'quarter' ? 'Quarter' :
                       periodType === 'year' ? 'Year' : 'Custom'}
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handlePeriodTypeChange('week')}>
                      Week
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePeriodTypeChange('month')}>
                      Month
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePeriodTypeChange('quarter')}>
                      Quarter
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePeriodTypeChange('year')}>
                      Year
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      setCustomStartDate(dateWindow.start);
                      setCustomEndDate(dateWindow.end);
                      setShowCustomDatePicker(true);
                    }}>
                      Custom range...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="flex gap-2 items-center">
              <Select 
                value={selectedTeamId ? selectedTeamId.toString() : undefined} 
                onValueChange={(value) => setSelectedTeamId(value === 'all' ? 'all' : Number(value))}
              >
                <SelectTrigger className="w-[108px]">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && (
                    <SelectItem value="all">
                      <Users className="h-4 w-4 inline mr-1" />
                      All Teams
                    </SelectItem>
                  )}
                  {teams.map((team: any) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Layout Toggle - Only show for single team view */}
              {selectedTeamId !== 'all' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-layout-toggle">
                      {layoutMode === 'list' ? (
                        <><List className="h-4 w-4 mr-1" /> List</>
                      ) : (
                        <><LayoutGrid className="h-4 w-4 mr-1" /> Board</>
                      )}
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setLayoutMode('list')} data-testid="menu-layout-list">
                      <List className="h-4 w-4 mr-2" />
                      List view
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLayoutMode('board')} data-testid="menu-layout-board">
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      Board view
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSkippedCancelled(!showSkippedCancelled)}
              >
                {showSkippedCancelled ? (
                  <><EyeOff className="h-4 w-4 mr-1" /> Hide skipped</>  
                ) : (
                  <><Eye className="h-4 w-4 mr-1" /> Show skipped</>
                )}
              </Button>
              <Link href="/strategy/objectives">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Strategy
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {selectedTeamId === 'all' && viewMode !== 'team' ? (
          /* All Teams View - Grouped by Team */
          (<div className="space-y-6">
            {Object.entries(checkInsByTeam).map(([teamId, meetings]) => {
              const team = teams.find((t: any) => t.id === Number(teamId));
              return (
                <Card key={teamId}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{team?.name || `Team ${teamId}`}</span>
                      <Badge variant="outline">{meetings.length} check-ins</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {meetings.length === 0 ? (
                        <div className="text-center py-4 text-sm text-gray-500">
                          No check-ins this period
                        </div>
                      ) : (
                        meetings.map((meeting: any) => (
                          <div
                            key={meeting.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={async () => {
                              if (meeting.status === 'Completed') {
                                // Show summary view for completed meetings
                                setSummaryMeeting(meeting);
                                // Fetch team members for this meeting's team
                                if (meeting.teamId) {
                                  try {
                                    const response = await apiRequest(`/api/core/teams/${meeting.teamId}/members`);
                                    const members = await response.json();
                                    setRunnerTeamMembers(members);
                                  } catch (error) {
                                    console.error('Failed to fetch team members:', error);
                                    setRunnerTeamMembers([]);
                                  }
                                }
                                setShowMeetingSummary(true);
                              } else {
                                setRunnerMeeting(meeting);
                                // Fetch team members for this meeting's team
                                if (meeting.teamId) {
                                  try {
                                    const response = await apiRequest(`/api/core/teams/${meeting.teamId}/members`);
                                    const members = await response.json();
                                    setRunnerTeamMembers(members);
                                  } catch (error) {
                                    console.error('Failed to fetch team members:', error);
                                    setRunnerTeamMembers([]);
                                  }
                                }
                                setShowMeetingRunner(true);
                              }
                            }}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm">{meeting.title}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {formatInOrgTz(meeting.scheduledDate, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={
                                  meeting.status === 'Completed' ? 'secondary' :
                                  meeting.status === 'In Progress' ? 'default' :
                                  'outline'
                                }
                                className="text-xs"
                              >
                                {getMeetingStatusDisplay(meeting.status)}
                              </Badge>
                              {checkInItems[meeting.id]?.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {checkInItems[meeting.id].length} items
                                </Badge>
                              )}
                              {/* Feedback Indicator for Completed Meetings */}
                              {meeting.status === 'Completed' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLocation(`/strategy/meeting/${meeting.id}/feedback`);
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Provide feedback for this meeting"
                                >
                                  <UserCheck className="h-4 w-4 text-blue-600" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {Object.keys(checkInsByTeam).length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-sm text-gray-500">No check-ins scheduled for this period</div>
                </CardContent>
              </Card>
            )}
          </div>)
        ) : (
          /* Single Team View - Layout depends on layoutMode */
          (layoutMode === 'list' ? /* Original List Layout - Two Column 50/50 */
          (<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Backlog Column */}
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Backlog</span>
                  <Badge variant="outline">{backlogItems.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-2">
                  {backlogItems.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-sm text-gray-500">No backlog for this team</div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => setShowCreateWorkItem(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create Work Item
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mb-2"
                        onClick={() => setShowCreateWorkItem(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create Work Item
                      </Button>
                      {backlogItems.map((item: any) => (
                        <div key={item.id} className="space-y-2">
                          <MobileWorkItemCard
                            item={item}
                            compact={true}
                            onClick={() => {
                              // Open work item detail
                            }}
                            onStatusClick={(e) => {
                              e.stopPropagation();
                              // Open status change dropdown
                            }}
                            onMenuClick={(e) => {
                              e.stopPropagation();
                              // Show dropdown menu with "Add to check-in" option
                            }}
                          />
                          <Select
                            value=""
                            onValueChange={(meetingId) => {
                              if (meetingId) {
                                updateWorkItemMutation.mutate({
                                  workItemId: item.id,
                                  targetMeetingId: Number(meetingId),
                                  oldMeetingId: null
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="w-auto h-6 px-2 text-xs font-medium text-blue-600 hover:text-blue-700 border-blue-200">
                              <span>Add to check-in</span>
                            </SelectTrigger>
                            <SelectContent>
                              {checkInMeetings.length === 0 ? (
                                <div className="px-2 py-1.5 text-sm text-gray-500">No check-ins available</div>
                              ) : (
                                checkInMeetings
                                  .filter((meeting: any) => meeting.status !== 'Skipped')
                                  .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                                  .map((meeting: any) => (
                                    <SelectItem key={meeting.id} value={meeting.id.toString()}>
                                      <div className="flex items-center gap-2">
                                        <span>{formatInOrgTz(meeting.scheduledDate, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                        {meeting.status !== 'Planning' && (
                                          <Badge variant="outline" className="text-xs">
                                            {getMeetingStatusDisplay(meeting.status)}
                                          </Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* Check-ins Column */}
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Check-ins</span>
                  <Badge variant="outline">{checkInMeetings.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-2">
                  {checkInMeetings.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-sm text-gray-500">No check-ins this period</div>
                    </div>
                  ) : (
                    checkInMeetings
                      .filter((meeting: any) => showSkippedCancelled || meeting.status !== 'Skipped')
                      .map((meeting: any) => (
                      <div key={meeting.id} className="border rounded-lg p-3">
                        <div
                          className="flex items-center justify-between hover:bg-gray-50 -m-3 p-3"
                        >
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={async () => {
                              if (meeting.status === 'Completed') {
                                // Show summary view for completed meetings
                                setSummaryMeeting(meeting);
                                // Fetch team members for this meeting's team
                                if (meeting.teamId) {
                                  try {
                                    const response = await apiRequest(`/api/core/teams/${meeting.teamId}/members`);
                                    const members = await response.json();
                                    setRunnerTeamMembers(members);
                                  } catch (error) {
                                    console.error('Failed to fetch team members:', error);
                                    setRunnerTeamMembers([]);
                                  }
                                }
                                setShowMeetingSummary(true);
                              } else {
                                setRunnerMeeting(meeting);
                                // Fetch team members for this meeting's team
                                if (meeting.teamId) {
                                  try {
                                    const response = await apiRequest(`/api/core/teams/${meeting.teamId}/members`);
                                    const members = await response.json();
                                    setRunnerTeamMembers(members);
                                  } catch (error) {
                                    console.error('Failed to fetch team members:', error);
                                    setRunnerTeamMembers([]);
                                  }
                                }
                                setShowMeetingRunner(true);
                              }
                            }}
                          >
                            <div className="font-medium text-sm">{meeting.title}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatInOrgTz(meeting.scheduledDate, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                            </div>
                            {meeting.status === 'Skipped' && meeting.notes && (
                              <div className="text-xs text-red-600 mt-1 italic">
                                Reason: {meeting.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Feedback Button for Completed Meetings */}
                            {meeting.status === 'Completed' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/strategy/meeting/${meeting.id}/feedback`);
                                }}
                                className="p-2 hover:bg-blue-50 rounded-lg border border-blue-200"
                                title="Provide feedback for this meeting"
                              >
                                <UserCheck className="h-4 w-4 text-blue-600" />
                              </button>
                            )}
                            {/* Start/Resume Meeting Button */}
                            {(meeting.status === 'Planning' || meeting.status === 'In Progress') && (
                              <Button
                                size="sm"
                                variant={meeting.status === 'In Progress' ? 'default' : 'outline'}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setRunnerMeeting(meeting);
                                  // Fetch team members for this meeting's team
                                  if (meeting.teamId) {
                                    try {
                                      const response = await apiRequest(`/api/core/teams/${meeting.teamId}/members`);
                                      const members = await response.json();
                                      setRunnerTeamMembers(members);
                                    } catch (error) {
                                      console.error('Failed to fetch team members:', error);
                                      setRunnerTeamMembers([]);
                                    }
                                  }
                                  setShowMeetingRunner(true);
                                }}
                                className="text-xs"
                              >
                                {meeting.status === 'In Progress' ? (
                                  <>
                                    <PlayCircle className="h-3 w-3 mr-1" />
                                    Resume
                                  </>
                                ) : (
                                  <>
                                    <PlayCircle className="h-3 w-3 mr-1" />
                                    Start
                                  </>
                                )}
                              </Button>
                            )}
                            <Select
                              value={meeting.status}
                              onValueChange={async (value) => {
                                if (value === 'Skipped') {
                                  setSelectedMeetingToSkip(meeting);
                                  setSkipDialogOpen(true);
                                } else {
                                  try {
                                    await apiRequest(`/api/strategy/check-in-meetings/${meeting.id}/status`, {
                                      method: 'POST',
                                      body: { status: value },
                                    });
                                    toast({ description: `Status changed to ${value}` });
                                    queryClient.invalidateQueries({ queryKey: ['/api/strategy/check-in-meetings'] });
                                  } catch (error) {
                                    toast({ variant: 'destructive', description: 'Failed to update status' });
                                  }
                                }
                              }}
                            >
                              <SelectTrigger className="h-6 border-0 px-1 bg-transparent hover:bg-gray-100" onClick={(e) => e.stopPropagation()}>
                                <Badge 
                                  variant={
                                    meeting.status === 'Completed' ? 'secondary' :
                                    meeting.status === 'In Progress' ? 'default' :
                                    meeting.status === 'Skipped' ? 'destructive' :
                                    'outline'
                                  }
                                  className="text-xs cursor-pointer"
                                >
                                  {getMeetingStatusDisplay(meeting.status)}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Planning">Planning</SelectItem>
                                <SelectItem value="Planned">Planned</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Skipped">Skip / cancel</SelectItem>
                              </SelectContent>
                            </Select>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {(meeting.status === 'Planning' || meeting.status === 'In Progress') && (
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      setRunnerMeeting(meeting);
                                      // Fetch team members for this meeting's team
                                      if (meeting.teamId) {
                                        try {
                                          const response = await apiRequest(`/api/core/teams/${meeting.teamId}/members`);
                                          const members = await response.json();
                                          setRunnerTeamMembers(members);
                                        } catch (error) {
                                          console.error('Failed to fetch team members:', error);
                                          setRunnerTeamMembers([]);
                                        }
                                      }
                                      setShowMeetingRunner(true);
                                    }}
                                  >
                                    {meeting.status === 'In Progress' ? 'Resume Meeting' : 'Start Meeting'}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={async () => {
                                    if (meeting.status === 'Completed') {
                                      // Show summary view for completed meetings
                                      setSummaryMeeting(meeting);
                                      // Fetch team members for this meeting's team
                                      if (meeting.teamId) {
                                        try {
                                          const response = await apiRequest(`/api/core/teams/${meeting.teamId}/members`);
                                          const members = await response.json();
                                          setRunnerTeamMembers(members);
                                        } catch (error) {
                                          console.error('Failed to fetch team members:', error);
                                          setRunnerTeamMembers([]);
                                        }
                                      }
                                      setShowMeetingSummary(true);
                                    } else {
                                      setRunnerMeeting(meeting);
                                      // Fetch team members for this meeting's team
                                      if (meeting.teamId) {
                                        try {
                                          const response = await apiRequest(`/api/core/teams/${meeting.teamId}/members`);
                                          const members = await response.json();
                                          setRunnerTeamMembers(members);
                                        } catch (error) {
                                          console.error('Failed to fetch team members:', error);
                                          setRunnerTeamMembers([]);
                                        }
                                      }
                                      setShowMeetingRunner(true);
                                    }
                                  }}
                                >
                                  {meeting.status === 'Completed' ? 'View meeting summary' : 'View details'}
                                </DropdownMenuItem>
                                {meeting.status !== 'Skipped' && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedMeetingToSkip(meeting);
                                      setSkipDialogOpen(true);
                                    }}
                                  >
                                    Skip / cancel
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        {/* Work items in this check-in */}
                        {checkInItems[meeting.id]?.length > 0 && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            {checkInItems[meeting.id].map((item: any) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded"
                              >
                                <div className="flex-1">
                                  <div className="text-sm">{item.title}</div>
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {item.status}
                                  </Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    updateWorkItemMutation.mutate({
                                      workItemId: item.id,
                                      targetMeetingId: null,
                                      oldMeetingId: meeting.id
                                    });
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>) : /* Board Layout - 25/75 split with week-based timeline */
          (<div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[600px]">
            {/* Collapsible Backlog Panel - Responsive width */}
            <div className={`${
              isBacklogCollapsed ? 'lg:w-12 w-full h-16 lg:h-full' : 'lg:w-1/4 w-full lg:h-full'
            } flex flex-col transition-all duration-300 ease-in-out`}>
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className={`text-base flex items-center ${isBacklogCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isBacklogCollapsed && <span>Backlog</span>}
                    <div className="flex items-center gap-2">
                      {!isBacklogCollapsed && <Badge variant="outline" className="text-xs">{backlogItems.length}</Badge>}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsBacklogCollapsed(!isBacklogCollapsed)}
                        className="h-6 w-6 p-0 flex items-center justify-center"
                        data-testid="button-collapse-backlog"
                      >
                        {isBacklogCollapsed ? (
                          <PanelLeftOpen className="h-4 w-4" />
                        ) : (
                          <PanelLeftClose className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto px-2">
                  {isBacklogCollapsed ? (
                    /* Collapsed View - Responsive Layout */
                    (<div className="flex lg:flex-col items-center justify-center h-full lg:space-y-2 space-x-2 lg:space-x-0">
                      <div className="text-xs text-gray-500 lg:transform lg:-rotate-90 whitespace-nowrap">
                        {backlogItems.length} items
                      </div>
                      <div className="lg:hidden flex items-center gap-1">
                        {backlogItems.slice(0, 3).map((item: any) => (
                          <div key={item.id} className="w-2 h-2 bg-blue-400 rounded-full" />
                        ))}
                        {backlogItems.length > 3 && <span className="text-xs">+{backlogItems.length - 3}</span>}
                      </div>
                    </div>)
                  ) : (
                    /* Expanded View - Full Multi-Select Interface */
                    (<div className="space-y-1">
                      {backlogItems.length === 0 ? (
                        <div className="text-center py-4">
                          <div className="text-xs text-gray-500 mb-2">No backlog items</div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => setShowCreateWorkItem(true)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Item
                          </Button>
                        </div>
                      ) : (
                      <>
                        {/* Multi-Select Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedBacklogItems.length === backlogItems.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBacklogItems(backlogItems.map((item: any) => item.id));
                                } else {
                                  setSelectedBacklogItems([]);
                                }
                              }}
                              className="h-3 w-3"
                              data-testid="checkbox-select-all"
                            />
                            <span className="text-xs font-medium">
                              {selectedBacklogItems.length === 0 
                                ? 'Select All' 
                                : `${selectedBacklogItems.length} selected`
                              }
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-6"
                            onClick={() => setShowCreateWorkItem(true)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>

                        {/* Bulk Actions */}
                        {selectedBacklogItems.length > 0 && (
                          <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-blue-700">
                                {selectedBacklogItems.length} item(s) selected
                              </span>
                              <div className="flex items-center gap-1">
                                <Select
                                  value=""
                                  onValueChange={(meetingId) => {
                                    if (meetingId && !isBulkAssigning) {
                                      // Bulk assign selected items to meeting sequentially
                                      handleBulkAssignment(selectedBacklogItems, Number(meetingId));
                                    }
                                  }}
                                  disabled={isBulkAssigning}
                                >
                                  <SelectTrigger className="h-6 px-2 text-xs border-blue-300 bg-white">
                                    <span>{isBulkAssigning ? 'Assigning...' : 'Add to check-in'}</span>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {checkInMeetings.length === 0 ? (
                                      <div className="px-2 py-1.5 text-xs text-gray-500">No check-ins</div>
                                    ) : (
                                      checkInMeetings
                                        .filter((meeting: any) => meeting.status !== 'Skipped')
                                        .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                                        .map((meeting: any) => (
                                          <SelectItem key={meeting.id} value={meeting.id.toString()}>
                                            <span className="text-xs">{formatInOrgTz(meeting.scheduledDate, { month: 'short', day: 'numeric' })}</span>
                                          </SelectItem>
                                        ))
                                    )}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedBacklogItems([])}
                                  className="h-6 w-6 p-0"
                                  data-testid="button-clear-selection"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Compact Backlog Items - Single Row Layout */}
                        {backlogItems.map((item: any) => (
                          <div 
                            key={item.id} 
                            className={`px-2 py-1 border rounded text-xs hover:bg-gray-50 transition-colors ${
                              selectedBacklogItems.includes(item.id) ? 'bg-blue-50 border-blue-200' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {/* Checkbox */}
                              <input
                                type="checkbox"
                                checked={selectedBacklogItems.includes(item.id)}
                                onChange={(e) => {
                                  e.stopPropagation(); // Prevent triggering click-to-open
                                  if (e.target.checked) {
                                    setSelectedBacklogItems([...selectedBacklogItems, item.id]);
                                  } else {
                                    setSelectedBacklogItems(selectedBacklogItems.filter(id => id !== item.id));
                                  }
                                }}
                                className="h-3 w-3 flex-shrink-0"
                                data-testid={`checkbox-item-${item.id}`}
                              />
                              
                              {/* Clickable Title - Takes up remaining space */}
                              <div 
                                className="flex-1 min-w-0 cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => {
                                  setSelectedWorkItem(item);
                                  setShowWorkItemPanel(true);
                                }}
                                title={`${item.title} - Click to view details`}
                              >
                                <span className="font-medium truncate block">{item.title}</span>
                              </div>
                              
                              {/* Status Badge */}
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {item.status}
                              </Badge>
                              
                              {/* Add to Check-in Dropdown */}
                              <Select
                                value=""
                                onValueChange={(meetingId) => {
                                  if (meetingId) {
                                    updateWorkItemMutation.mutate({
                                      workItemId: item.id,
                                      targetMeetingId: Number(meetingId),
                                      oldMeetingId: null
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger 
                                  className="h-6 w-6 p-0 border-none bg-blue-100 hover:bg-blue-200 flex-shrink-0 transition-colors"
                                  onClick={(e) => e.stopPropagation()} // Prevent triggering click-to-open
                                  title="Add to check-in"
                                >
                                  <Plus className="h-3 w-3 text-blue-600" />
                                </SelectTrigger>
                                <SelectContent>
                                  {checkInMeetings.length === 0 ? (
                                    <div className="px-2 py-1.5 text-xs text-gray-500">No check-ins available</div>
                                  ) : (
                                    checkInMeetings
                                      .filter((meeting: any) => meeting.status !== 'Skipped')
                                      .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                                      .map((meeting: any) => (
                                        <SelectItem key={meeting.id} value={meeting.id.toString()}>
                                          <span className="text-xs">
                                            {formatInOrgTz(meeting.scheduledDate, { month: 'short', day: 'numeric' })} - {meeting.title}
                                          </span>
                                        </SelectItem>
                                      ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </>
                      )}
                    </div>)
                  )}
                </CardContent>
              </Card>
            </div>
            {/* Check-in Board - Responsive timeline */}
            <div className="flex-1 flex flex-col lg:mt-0 mt-4">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base lg:text-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span>Check-in Timeline</span>
                    <div className="flex gap-2 items-center flex-wrap">
                      <Badge variant="outline">{checkInMeetings.length} meetings</Badge>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {getViewButtonLabel()}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-x-auto">
                  <div className="min-w-full lg:min-w-0">
                    {/* Dynamic timeline - Responsive grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-h-full lg:min-w-[600px]">
                      {/* First column - current period */}
                      <div className="space-y-2">
                        <div className="font-medium text-center p-2 bg-blue-50 rounded text-[12px] pl-[2.2px] pr-[2.2px] pt-[3.2px] pb-[3.2px]">
                          {getTimelineColumns()[0].label}
                        </div>
                        <div className="space-y-2">
                          {checkInMeetings
                            .filter((meeting: any) => showSkippedCancelled || meeting.status !== 'Skipped')
                            .map((meeting: any) => (
                            <Card key={meeting.id} className="p-4 lg:p-3 hover:shadow-md transition-shadow cursor-pointer touch-manipulation active:scale-95">
                              <div 
                                onClick={async () => {
                                  if (meeting.status === 'Completed') {
                                    setSummaryMeeting(meeting);
                                    if (meeting.teamId) {
                                      try {
                                        const response = await apiRequest(`/api/core/teams/${meeting.teamId}/members`);
                                        const members = await response.json();
                                        setRunnerTeamMembers(members);
                                      } catch (error) {
                                        console.error('Failed to fetch team members:', error);
                                        setRunnerTeamMembers([]);
                                      }
                                    }
                                    setShowMeetingSummary(true);
                                  } else {
                                    setRunnerMeeting(meeting);
                                    if (meeting.teamId) {
                                      try {
                                        const response = await apiRequest(`/api/core/teams/${meeting.teamId}/members`);
                                        const members = await response.json();
                                        setRunnerTeamMembers(members);
                                      } catch (error) {
                                        console.error('Failed to fetch team members:', error);
                                        setRunnerTeamMembers([]);
                                      }
                                    }
                                    setShowMeetingRunner(true);
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="font-medium truncate text-[14px]">{meeting.title}</div>
                                  <Badge 
                                    variant={
                                      meeting.status === 'Completed' ? 'secondary' :
                                      meeting.status === 'In Progress' ? 'default' :
                                      meeting.status === 'Skipped' ? 'destructive' :
                                      'outline'
                                    }
                                    className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground text-[12px]"
                                  >
                                    {getMeetingStatusDisplay(meeting.status)}
                                  </Badge>
                                </div>
                                <div className="text-gray-500 mt-1 text-[12px]">
                                  {formatInOrgTz(meeting.scheduledDate, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <div className="text-gray-500 text-[12px]">
                                    {checkInItems[meeting.id]?.length || 0} work items
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs hover:bg-gray-100"
                                        onClick={(e) => e.stopPropagation()}
                                        data-testid={`button-add-work-item-${meeting.id}`}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        <span className="text-[12px]">Add Work Item</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="min-w-[200px]">
                                      <DropdownMenuLabel>Add to Check-in</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      {backlogItems.filter(item => item.teamId === meeting.teamId).length > 0 ? (
                                        backlogItems
                                          .filter(item => item.teamId === meeting.teamId)
                                          .slice(0, 10)
                                          .map((item: any) => (
                                            <DropdownMenuItem
                                              key={item.id}
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                  setIsBulkAssigning(true);
                                                  await updateWorkItemMutation.mutateAsync({
                                                    workItemId: item.id,
                                                    targetMeetingId: meeting.id,
                                                    oldMeetingId: null,
                                                  });
                                                  refetchBacklog();
                                                  queryClient.invalidateQueries({ 
                                                    queryKey: ['/api/work-items', 'by-meetings'] 
                                                  });
                                                } catch (error) {
                                                  console.error('Failed to assign work item:', error);
                                                } finally {
                                                  setIsBulkAssigning(false);
                                                }
                                              }}
                                              disabled={isBulkAssigning}
                                              className="text-sm"
                                            >
                                              <div className="flex flex-col">
                                                <span className="font-medium">{item.title}</span>
                                                <Badge 
                                                  variant="outline" 
                                                  className="text-xs mt-1 w-fit"
                                                >
                                                  {item.status}
                                                </Badge>
                                              </div>
                                            </DropdownMenuItem>
                                          ))
                                      ) : (
                                        <DropdownMenuItem disabled className="text-gray-500 text-sm">
                                          No available work items for this team
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                {/* Work items preview */}
                                {checkInItems[meeting.id]?.length > 0 && (
                                  <div className="mt-2 pt-2 border-t space-y-1">
                                    {checkInItems[meeting.id].slice(0, 2).map((item: any) => (
                                      <div key={item.id} className="text-xs p-1 bg-gray-50 rounded truncate">
                                        {item.title}
                                      </div>
                                    ))}
                                    {checkInItems[meeting.id].length > 2 && (
                                      <div className="text-xs text-gray-500">
                                        +{checkInItems[meeting.id].length - 2} more items
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </Card>
                          ))}
                          {checkInMeetings.length === 0 && (
                            <div className="text-center py-8 text-xs text-gray-500">
                              {getTimelineColumns()[0].placeholder}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Second column - next period */}
                      <div className="space-y-2">
                        <div className="font-medium text-center p-2 bg-green-50 rounded text-[12px] pl-[0.2px] pr-[0.2px] pt-[1.2px] pb-[1.2px]">
                          {getTimelineColumns()[1].label}
                        </div>
                        <div className="text-center py-8 text-xs text-gray-500">
                          {getTimelineColumns()[1].placeholder}
                        </div>
                      </div>

                      {/* Third column - future period */}
                      <div className="space-y-2">
                        <div className="font-medium text-center p-2 bg-gray-50 rounded text-[12px] pl-[0.2px] pr-[0.2px] pt-[1.2px] pb-[1.2px]">
                          {getTimelineColumns()[2].label}
                        </div>
                        <div className="text-center py-8 text-xs text-gray-500">
                          {getTimelineColumns()[2].placeholder}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>))
        )}

        {/* Linear Meeting Runner */}
        {runnerMeeting && (
          <LinearMeetingRunner
            isOpen={showMeetingRunner}
            onClose={() => {
              setShowMeetingRunner(false);
              setRunnerMeeting(null);
              queryClient.invalidateQueries({ queryKey: ['/api/strategy/check-in-meetings'] });
            }}
            meeting={runnerMeeting}
            workItems={checkInItems[runnerMeeting.id] || []}
            teamMembers={runnerTeamMembers}
            onMeetingUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/strategy/check-in-meetings'] });
            }}
          />
        )}

        {/* Meeting Summary View for Completed Meetings */}
        {summaryMeeting && (
          <MeetingSummaryView
            isOpen={showMeetingSummary}
            onClose={() => {
              setShowMeetingSummary(false);
              setSummaryMeeting(null);
            }}
            meeting={summaryMeeting}
            workItems={checkInItems[summaryMeeting.id] || []}
            teamMembers={runnerTeamMembers}
          />
        )}


        {/* Work Item Creation Panel */}
        {showCreateWorkItem && (
          <div className="fixed inset-0 z-50">
            <WorkItemPanel
              isOpen={true}
              onClose={() => {
                setShowCreateWorkItem(false);
                // Invalidate all work items queries including the specific backlog query
                queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
                // Also refresh the specific backlog query
                refetchBacklog();
              }}
              mode="create"
            />
          </div>
        )}

        {/* Work Item Detail Panel */}
        {selectedWorkItem && (
          <WorkItemPanel
            isOpen={showWorkItemPanel}
            onClose={() => {
              setShowWorkItemPanel(false);
              setSelectedWorkItem(null);
              // Refresh backlog to show any changes made in the panel
              refetchBacklog();
            }}
            mode="view"
            workItem={selectedWorkItem}
            workItemId={selectedWorkItem?.id}
          />
        )}

        {/* Skip/Cancel Dialog */}
        <AlertDialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Skip/Cancel Check-in</AlertDialogTitle>
              <AlertDialogDescription>
                Please provide a reason for skipping or cancelling this check-in.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  placeholder="Enter reason for skipping/cancelling..."
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setSkipReason('');
                setSelectedMeetingToSkip(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (skipReason.trim() && selectedMeetingToSkip) {
                    skipMeetingMutation.mutate({
                      meetingId: selectedMeetingToSkip.id,
                      reason: skipReason.trim()
                    });
                  }
                }}
                disabled={!skipReason.trim()}
              >
                Skip Check-in
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Custom Date Range Dialog */}
        <Dialog open={showCustomDatePicker} onOpenChange={setShowCustomDatePicker}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Custom Date Range</DialogTitle>
              <DialogDescription>
                Select a custom start and end date for the check-in view.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStartDate ? format(customStartDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setCustomStartDate(e.target.value ? new Date(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEndDate ? format(customEndDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setCustomEndDate(e.target.value ? new Date(e.target.value) : null)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomDatePicker(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCustomDateApply} 
                disabled={!customStartDate || !customEndDate || customStartDate >= customEndDate}
              >
                Apply Range
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Floating Action Button for Mobile */}
        <FloatingActionButton
          onClick={() => setShowCreateWorkItem(true)}
          position="bottom-right"
          label="Create new work item"
        />
        </div>
      </div>
    </div>
  );
}