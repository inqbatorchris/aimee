import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Filter, MoreVertical, ChevronDown, FileText, Calendar, User, Users, Settings2, WifiOff, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { WorkflowProgressBadge } from '@/components/work-items/WorkflowProgressBadge';
import { ManualGenerateDialog } from '@/components/work-items/ManualGenerateDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
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
import { DocumentIndicator } from '@/components/KnowledgeBase/DocumentIndicator';
import WorkItemPanel from '@/components/work-items/WorkItemPanel';
import { KeyResultDetailPanel } from '@/components/key-result-detail/KeyResultDetailPanel';
import {
  WorkItem,
  WorkItemFilters,
  CheckInCycle,
  User as UserType,
  fetchWorkItems,
  bulkUpdateWorkItems,
  updateWorkItem,
  deleteWorkItem,
  fetchCheckInCycles,
  fetchActiveUsers,
} from '@/lib/workItems.api';

// T2: Org timezone formatter - single source of truth for display
const ORG_TZ = 'Europe/London';

function formatInOrgTz(dateISO: string | Date, fmt: Intl.DateTimeFormatOptions = {}): string {
  const d = typeof dateISO === 'string' ? new Date(dateISO) : dateISO;
  // Minimal, DST-safe: Intl with timeZone
  const base: Intl.DateTimeFormatOptions = { timeZone: ORG_TZ, year: 'numeric', month: 'short', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-GB', { ...base, ...fmt }).format(d);
  return parts;
}

const STATUS_OPTIONS = [
  { value: 'Planning', label: 'Planning', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
  { value: 'Ready', label: 'Ready', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' },
  { value: 'In Progress', label: 'In Progress', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' },
  { value: 'Stuck', label: 'Stuck', color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' },
  { value: 'Completed', label: 'Completed', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' },
  { value: 'Archived', label: 'Archived', color: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' },
];

// Component to fetch and display workflow progress for a work item
function WorkflowProgressCell({ workItemId }: { workItemId: number }) {
  const { data: steps = [] } = useQuery<any[]>({
    queryKey: [`/api/work-items/${workItemId}/workflow/steps`],
    staleTime: 30000,
  });

  if (steps.length === 0) {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  return <WorkflowProgressBadge completedSteps={completedSteps} totalSteps={steps.length} className="scale-90" />;
}

interface WorkItemsProps {
  offlineAppMode?: boolean;
  [key: string]: any; // Allow wouter route props
}

const STORAGE_KEY_FILTERS = 'workItems:filters';
const STORAGE_KEY_PAGE_SIZE = 'workItems:pageSize';

export default function WorkItems(props: WorkItemsProps = {}) {
  const { offlineAppMode = false } = props;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const isOnline = navigator.onLine;
  
  // Parse URL query parameters - use window.location as wouter doesn't include query params
  // We'll handle synchronization issues through proper state management
  const [panelState, setPanelState] = useState<{ mode: 'create' | 'view' | 'edit' | null; id?: number }>(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('panel') === 'workItem' ? params.get('mode') as 'create' | 'view' | 'edit' : null;
    const id = params.get('id') ? parseInt(params.get('id')!) : undefined;
    return { mode, id };
  });
  
  // Offline work items state
  const [offlineWorkItems, setOfflineWorkItems] = useState<WorkItem[]>([]);
  
  // Key Result Panel state
  const [selectedKeyResultId, setSelectedKeyResultId] = useState<number | null>(null);
  const [keyResultPanelOpen, setKeyResultPanelOpen] = useState(false);
  const [keyResultPanelTab, setKeyResultPanelTab] = useState<string>('details');
  
  const panelMode = panelState.mode;
  const selectedId = panelState.id;
  
  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('panel') === 'workItem' ? params.get('mode') as 'create' | 'view' | 'edit' : null;
      const id = params.get('id') ? parseInt(params.get('id')!) : undefined;
      setPanelState({ mode, id });
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PAGE_SIZE);
    return saved ? parseInt(saved) : 100; // Increased default from 25 to 100
  });
  
  // Filters state - load from localStorage with currentUser as default assignee
  const [filters, setFilters] = useState<WorkItemFilters>(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Try to load saved filters from localStorage
    const savedFilters = localStorage.getItem(STORAGE_KEY_FILTERS);
    const parsedSaved = savedFilters ? JSON.parse(savedFilters) : {};
    
    // Clean up any legacy assigneeId from localStorage
    if (parsedSaved.assigneeId) {
      delete parsedSaved.assigneeId;
      localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(parsedSaved));
    }
    
    // URL params take precedence over saved filters
    return {
      status: params.get('status')?.split(',') || parsedSaved.status || [],
      origin: (params.get('origin') as WorkItemFilters['origin']) || parsedSaved.origin || 'All',
      // assigneeId: Only use URL param if explicitly provided, otherwise default to currentUser (set by useEffect)
      assigneeId: params.get('assigneeId') ? parseInt(params.get('assigneeId')!) : undefined,
      dueFrom: params.get('dueFrom') || parsedSaved.dueFrom || undefined,
      dueTo: params.get('dueTo') || parsedSaved.dueTo || undefined,
      inCycle: params.get('inCycle') ? params.get('inCycle') === 'true' : parsedSaved.inCycle,
      teamId: params.get('teamId') ? parseInt(params.get('teamId')!) : parsedSaved.teamId,
      workflowTemplateId: params.get('workflowTemplateId') || parsedSaved.workflowTemplateId || undefined,
    };
  });
  
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [editingField, setEditingField] = useState<{ itemId: number; field: 'status' | 'dueDate' | 'team' } | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [visibleColumns, setVisibleColumns] = useState({
    status: true,
    due: true,
    assignee: true,
    origin: false,
    team: true,
    checkin: true,
    progress: true,
    files: false,
    updated: false,
  });
  
  // Sorting state - default to due date ascending
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' }>({
    column: 'dueDate',
    direction: 'asc',
  });
  
  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; item: WorkItem | null }>({
    isOpen: false,
    item: null,
  });
  
  // Bulk delete confirmation state
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState(false);
  
  // Manual generate dialog state
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  
  // Bulk due date picker state
  const [bulkDueDatePickerOpen, setBulkDueDatePickerOpen] = useState(false);
  const [bulkDueDateValue, setBulkDueDateValue] = useState('');
  
  // Fetch work items (only when online)
  const { data: onlineWorkItems = [], isLoading, error } = useQuery<WorkItem[]>({
    queryKey: ['/api/work-items', filters, pageSize],
    queryFn: () => fetchWorkItems({ ...filters, pageSize, page: 1 }),
    enabled: isOnline,
  });
  
  if (error) {
    console.error('Error fetching work items:', error);
  }
  
  // Always use online data now since offline functionality moved to field app
  const workItems = onlineWorkItems;
  
  // Fetch cycles for bulk actions
  const { data: cycles = [] } = useQuery<CheckInCycle[]>({
    queryKey: ['/api/work-items/check-in-cycles'],
    queryFn: () => fetchCheckInCycles(['Planning', 'In Progress']),
  });
  
  // Fetch users for filter
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ['/api/work-items/users'],
    queryFn: fetchActiveUsers,
  });
  
  // Fetch teams for filter and bulk actions
  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['/api/teams'],
    queryFn: async () => {
      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch teams');
      return response.json();
    },
  });
  
  // Fetch workflow templates for bulk assignment
  const { data: workflowTemplates = [] } = useQuery<any[]>({
    queryKey: ['/api/workflows/templates'],
    queryFn: async () => {
      const response = await fetch('/api/workflows/templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch workflow templates');
      return response.json();
    },
  });
  
  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: bulkUpdateWorkItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      setSelectedItems(new Set());
      toast({
        title: 'Success',
        description: 'Work items updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update work items',
        variant: 'destructive',
      });
    },
  });
  
  // Inline update mutation
  const inlineUpdateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateWorkItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      setEditingField(null);
      toast({
        title: 'Success',
        description: 'Work item updated',
      });
    },
    onError: (error: any) => {
      setEditingField(null);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update work item',
        variant: 'destructive',
      });
    },
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteWorkItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      toast({
        title: 'Success',
        description: 'Work item deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete work item',
        variant: 'destructive',
      });
    },
  });
  
  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Delete items sequentially to avoid overwhelming the server
      const results = await Promise.allSettled(
        ids.map(id => deleteWorkItem(id))
      );
      
      const succeeded = results.filter((r, i) => r.status === 'fulfilled').map((_, i) => ids[i]);
      const failed = results.filter((r, i) => r.status === 'rejected').map((_, i) => ids[i]);
      
      return { 
        succeeded: succeeded.length, 
        failed: failed.length,
        failedIds: failed,
        total: ids.length
      };
    },
    onSuccess: (data) => {
      // Always invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      setSelectedItems(new Set());
      setBulkDeleteConfirmation(false);
      
      if (data.failed === 0) {
        toast({
          title: 'Success',
          description: `Deleted ${data.succeeded} work items`,
        });
      } else {
        toast({
          title: 'Partial Success',
          description: `Deleted ${data.succeeded} of ${data.total} work items. ${data.failed} failed.`,
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      // Always invalidate queries and clear selection even on error
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      setSelectedItems(new Set());
      setBulkDeleteConfirmation(false);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete work items',
        variant: 'destructive',
      });
    },
  });
  
  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Clear all filter params first
    params.delete('status');
    params.delete('origin');
    params.delete('assigneeId');
    params.delete('dueFrom');
    params.delete('dueTo');
    params.delete('inCycle');
    params.delete('teamId');
    params.delete('workflowTemplateId');
    
    // Set only the active filters
    if (filters.status && filters.status.length > 0) {
      params.set('status', filters.status.join(','));
    }
    if (filters.origin && filters.origin !== 'All') {
      params.set('origin', filters.origin);
    }
    if (filters.assigneeId) {
      params.set('assigneeId', filters.assigneeId.toString());
    }
    if (filters.dueFrom) {
      params.set('dueFrom', filters.dueFrom);
    }
    if (filters.dueTo) {
      params.set('dueTo', filters.dueTo);
    }
    if (filters.inCycle !== undefined) {
      params.set('inCycle', filters.inCycle.toString());
    }
    if (filters.teamId) {
      params.set('teamId', filters.teamId.toString());
    }
    if (filters.workflowTemplateId) {
      params.set('workflowTemplateId', filters.workflowTemplateId);
    }
    
    // Preserve panel state
    if (panelMode) {
      params.set('panel', 'workItem');
      params.set('mode', panelMode);
      if (selectedId) {
        params.set('id', selectedId.toString());
      }
    }
    
    const queryString = params.toString();
    const newUrl = `/strategy/work-items${queryString ? `?${queryString}` : ''}`;
    if (window.location.pathname + window.location.search !== newUrl) {
      window.history.replaceState({}, '', newUrl);
    }
  }, [filters, panelMode, selectedId]);
  
  const updateFilters = (updates: Partial<WorkItemFilters>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    // Reset to page 1 when filters change
    setCurrentPage(1);
    // Save filters to localStorage (excluding assigneeId which should always default to current user)
    const { assigneeId, ...filtersToSave } = newFilters;
    localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(filtersToSave));
  };
  
  // Set default assigneeId to currentUser when user becomes available
  useEffect(() => {
    if (currentUser && !filters.assigneeId) {
      setFilters(prev => ({
        ...prev,
        assigneeId: currentUser.id
      }));
    }
  }, [currentUser]);
  
  // Save page size to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PAGE_SIZE, pageSize.toString());
  }, [pageSize]);
  
  // Sort work items
  const sortedWorkItems = [...workItems].sort((a, b) => {
    const { column, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;
    
    switch (column) {
      case 'title':
        return multiplier * a.title.localeCompare(b.title);
      
      case 'status': {
        const statusOrder = STATUS_OPTIONS.map(s => s.value);
        const aIndex = statusOrder.indexOf(a.status);
        const bIndex = statusOrder.indexOf(b.status);
        return multiplier * (aIndex - bIndex);
      }
      
      case 'dueDate': {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1; // Items without due date go to end
        if (!b.dueDate) return -1;
        return multiplier * (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      }
      
      case 'assignee': {
        const aName = a.assignee?.fullName || a.assignee?.email || '';
        const bName = b.assignee?.fullName || b.assignee?.email || '';
        return multiplier * aName.localeCompare(bName);
      }
      
      case 'team': {
        const aTeam = a.team?.name || '';
        const bTeam = b.team?.name || '';
        return multiplier * aTeam.localeCompare(bTeam);
      }
      
      case 'checkin': {
        if (!a.targetMeeting?.scheduledDate && !b.targetMeeting?.scheduledDate) return 0;
        if (!a.targetMeeting?.scheduledDate) return 1;
        if (!b.targetMeeting?.scheduledDate) return -1;
        return multiplier * (new Date(a.targetMeeting.scheduledDate).getTime() - new Date(b.targetMeeting.scheduledDate).getTime());
      }
      
      case 'updated':
        return multiplier * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
      
      default:
        return 0;
    }
  });
  
  // Pagination calculations
  const totalItems = sortedWorkItems.length;
  const showAll = pageSize === 99999; // Special value for "All"
  const totalPages = showAll ? 1 : Math.ceil(totalItems / pageSize);
  const startIndex = showAll ? 0 : (currentPage - 1) * pageSize;
  const endIndex = showAll ? totalItems : Math.min(startIndex + pageSize, totalItems);
  const paginatedWorkItems = sortedWorkItems.slice(startIndex, endIndex);
  
  // Reset to page 1 if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);
  
  const openPanel = (mode: 'create' | 'view' | 'edit', id?: number) => {
    // Update state immediately
    setPanelState({ mode, id });
    
    // Update URL for bookmarkability
    const params = new URLSearchParams(window.location.search);
    params.set('panel', 'workItem');
    params.set('mode', mode);
    if (id) {
      params.set('id', id.toString());
    } else {
      params.delete('id');
    }
    const newUrl = `/strategy/work-items?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  };
  
  const closePanel = () => {
    // Update state immediately
    setPanelState({ mode: null, id: undefined });
    
    // Update URL
    const params = new URLSearchParams(window.location.search);
    params.delete('panel');
    params.delete('mode');
    params.delete('id');
    const queryString = params.toString();
    const newUrl = `/strategy/work-items${queryString ? `?${queryString}` : ''}`;
    window.history.pushState({}, '', newUrl);
  };
  
  // Open Key Result panel handler
  const openKeyResultPanel = (keyResultId: number, tab: string = 'details') => {
    setSelectedKeyResultId(keyResultId);
    setKeyResultPanelTab(tab);
    setKeyResultPanelOpen(true);
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(workItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };
  
  const handleSelectItem = (id: number, checked: boolean) => {
    const newSelection = new Set(selectedItems);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedItems(newSelection);
  };
  
  const handleBulkAddToCycle = (cycleId: number) => {
    bulkUpdateMutation.mutate({
      ids: Array.from(selectedItems),
      set: { checkInCycleId: cycleId },
    });
  };
  
  const handleBulkRemoveFromCycle = () => {
    bulkUpdateMutation.mutate({
      ids: Array.from(selectedItems),
      set: { checkInCycleId: null },
    });
  };
  
  const handleBulkSetStatus = (status: WorkItem['status']) => {
    bulkUpdateMutation.mutate({
      ids: Array.from(selectedItems),
      set: { status },
    });
  };
  
  const handleBulkSetTeam = (teamId: number | null) => {
    bulkUpdateMutation.mutate({
      ids: Array.from(selectedItems),
      set: { teamId },
    });
  };
  
  const handleBulkSetWorkflowTemplate = (workflowTemplateId: string | null) => {
    if (workflowTemplateId) {
      const template = workflowTemplates.find((t: any) => t.id === workflowTemplateId);
      
      if (!template) {
        toast({
          title: 'Error',
          description: 'Selected workflow template not found',
          variant: 'destructive',
        });
        return;
      }
      
      bulkUpdateMutation.mutate({
        ids: Array.from(selectedItems),
        set: { 
          workflowTemplateId: template.id,
          workItemType: template.id,
          workflowSource: 'manual',
          workflowMetadata: {
            templateName: template.name,
            category: template.category,
          },
        },
      });
    } else {
      // Remove workflow
      bulkUpdateMutation.mutate({
        ids: Array.from(selectedItems),
        set: { 
          workflowTemplateId: null,
          workItemType: null,
          workflowSource: null,
          workflowMetadata: null,
        },
      });
    }
  };
  
  const handleSort = (column: string) => {
    setSortConfig(prev => {
      if (prev.column === column) {
        return prev.direction === 'asc' 
          ? { column, direction: 'desc' }
          : { column: 'dueDate', direction: 'asc' };
      }
      return { column, direction: 'asc' };
    });
  };
  
  const handleBulkSetDueDate = (action: 'clear' | 'set' | 'add' | 'subtract', value?: number | string) => {
    if (action === 'clear') {
      bulkUpdateMutation.mutate({
        ids: Array.from(selectedItems),
        set: { dueDate: null },
      });
    } else if (action === 'set' && typeof value === 'string') {
      bulkUpdateMutation.mutate({
        ids: Array.from(selectedItems),
        set: { dueDate: value },
      });
    } else if ((action === 'add' || action === 'subtract') && typeof value === 'number') {
      // For add/subtract, we need to update each item individually
      const updates = Array.from(selectedItems).map(async (id) => {
        const item = workItems.find(w => w.id === id);
        if (!item) return;
        
        const currentDate = item.dueDate ? new Date(item.dueDate) : new Date();
        const daysToAdd = action === 'add' ? value : -value;
        currentDate.setDate(currentDate.getDate() + daysToAdd);
        const newDueDate = currentDate.toISOString().split('T')[0];
        
        await updateWorkItem(id, { dueDate: newDueDate });
      });
      
      Promise.all(updates).then(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
        setSelectedItems(new Set());
        toast({
          title: 'Success',
          description: 'Work items updated successfully',
        });
      }).catch((error: any) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to update work items',
          variant: 'destructive',
        });
      });
    }
  };
  
  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return option ? option.color : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  };
  
  const getOriginChip = (item: WorkItem) => {
    if (item.keyResultTask) {
      return <Badge variant="outline" className="text-xs">KR Task: {item.keyResultTask.title}</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Ad-hoc</Badge>;
  };
  
  const handleInlineEdit = (itemId: number, field: 'status' | 'dueDate' | 'team') => {
    const currentItem = workItems.find(item => item.id === itemId);
    if (!currentItem) return;
    
    setEditingField({ itemId, field });
    if (field === 'status') {
      setTempValue(currentItem.status);
    } else if (field === 'dueDate') {
      setTempValue(currentItem.dueDate ? format(new Date(currentItem.dueDate), 'yyyy-MM-dd') : '');
    } else if (field === 'team') {
      setTempValue(currentItem.teamId?.toString() || 'none');
    }
  };
  
  const saveInlineEdit = () => {
    if (!editingField) return;
    
    const data: any = {};
    if (editingField.field === 'status') {
      data.status = tempValue;
    } else if (editingField.field === 'dueDate') {
      data.dueDate = tempValue || null;
    } else if (editingField.field === 'team') {
      data.teamId = tempValue === 'none' ? null : parseInt(tempValue);
    }
    
    inlineUpdateMutation.mutate({ id: editingField.itemId, data });
  };
  
  const cancelInlineEdit = () => {
    setEditingField(null);
    setTempValue('');
  };
  
  const selectedWorkItem = workItems.find(item => item.id === selectedId);
  
  const SortableHeader = ({ column, children, className = "" }: { column: string; children: React.ReactNode; className?: string }) => {
    const isSorted = sortConfig.column === column;
    const direction = isSorted ? sortConfig.direction : null;
    
    return (
      <TableHead 
        className={`text-[11px] text-muted-foreground font-normal py-1 px-1 border-r border-border cursor-pointer hover:bg-muted select-none ${className}`}
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isSorted && (
            direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
          )}
        </div>
      </TableHead>
    );
  };
  
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex justify-center">
        <div className="w-full max-w-7xl">
          {/* Header */}
          <div className="px-3 py-1 pt-8">
            <div className="mb-1">
              <h1 className="mt-[10px] mb-[10px] text-[14px] font-bold">Work Items</h1>
              <p className="text-xs text-muted-foreground">Manage tasks and deliverables</p>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center justify-between gap-2">
              {/* Mobile Filter Dropdown - Only visible on mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex sm:hidden h-6 px-2 py-0 text-[11px] font-normal hover:bg-muted items-center gap-1"
                  >
                    <Filter className="h-3 w-3" />
                    <span>Filters</span>
                    {(filters.status && filters.status.length > 0) || filters.assigneeId || filters.teamId || filters.workflowTemplateId || filters.dueFrom || filters.dueTo ? (
                      <Badge variant="secondary" className="h-3 px-1 text-[10px] ml-1">
                        {(filters.status?.length || 0) + (filters.assigneeId ? 1 : 0) + (filters.teamId ? 1 : 0) + (filters.workflowTemplateId ? 1 : 0) + ((filters.dueFrom || filters.dueTo) ? 1 : 0)}
                      </Badge>
                    ) : null}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {/* Status Filter Section */}
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  {STATUS_OPTIONS.map(option => (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={filters.status?.includes(option.value) || false}
                      onCheckedChange={checked => {
                        const currentStatus = filters.status || [];
                        if (checked) {
                          updateFilters({ status: [...currentStatus, option.value] });
                        } else {
                          updateFilters({ status: currentStatus.filter(s => s !== option.value) });
                        }
                      }}
                    >
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  
                  {/* Assignee Filter Section */}
                  <DropdownMenuLabel>Filter by Assignee</DropdownMenuLabel>
                  <DropdownMenuRadioGroup 
                    value={filters.assigneeId?.toString() || 'all'} 
                    onValueChange={(value) => updateFilters({ assigneeId: value === 'all' ? undefined : parseInt(value) })}
                  >
                    <DropdownMenuRadioItem value="all">All Assignees</DropdownMenuRadioItem>
                    {users.map(user => (
                      <DropdownMenuRadioItem key={user.id} value={user.id.toString()}>
                        {user.fullName || user.email}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Team Filter Section */}
                  <DropdownMenuLabel>Filter by Team</DropdownMenuLabel>
                  <DropdownMenuRadioGroup 
                    value={filters.teamId?.toString() || 'all'} 
                    onValueChange={(value) => updateFilters({ teamId: value === 'all' ? undefined : parseInt(value) })}
                  >
                    <DropdownMenuRadioItem value="all">All Teams</DropdownMenuRadioItem>
                    {teams.map(team => (
                      <DropdownMenuRadioItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Workflow Template Filter Section */}
                  <DropdownMenuLabel>Filter by Workflow</DropdownMenuLabel>
                  <DropdownMenuRadioGroup 
                    value={filters.workflowTemplateId || 'all'} 
                    onValueChange={(value) => updateFilters({ workflowTemplateId: value === 'all' ? undefined : value })}
                  >
                    <DropdownMenuRadioItem value="all">All Workflows</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="none">No Workflow</DropdownMenuRadioItem>
                    {workflowTemplates.map((template: any) => (
                      <DropdownMenuRadioItem key={template.id} value={template.id}>
                        {template.name}
                        {template.steps?.length > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({template.steps.length} steps)
                          </span>
                        )}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Due Date Filter Section */}
                  <DropdownMenuLabel>Filter by Due Date</DropdownMenuLabel>
                  <div className="px-2 py-1 space-y-2">
                    <div>
                      <Label className="text-xs">From</Label>
                      <Input
                        type="date"
                        value={filters.dueFrom || ''}
                        onChange={(e) => updateFilters({ dueFrom: e.target.value || undefined })}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">To</Label>
                      <Input
                        type="date"
                        value={filters.dueTo || ''}
                        onChange={(e) => updateFilters({ dueTo: e.target.value || undefined })}
                        className="h-7 text-xs"
                      />
                    </div>
                    {(filters.dueFrom || filters.dueTo) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={() => updateFilters({ dueFrom: undefined, dueTo: undefined })}
                      >
                        Clear Dates
                      </Button>
                    )}
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Column Visibility Section */}
                  <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                  {Object.entries(visibleColumns).map(([key, visible]) => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={visible}
                      onCheckedChange={checked => {
                        setVisibleColumns({ ...visibleColumns, [key]: checked });
                      }}
                    >
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </DropdownMenuCheckboxItem>
                  ))}
                  
                  {/* Clear Filters Option */}
                  {((filters.status && filters.status.length > 0) || filters.assigneeId || filters.teamId || filters.workflowTemplateId || filters.dueFrom || filters.dueTo) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          updateFilters({ status: [], assigneeId: undefined, teamId: undefined, workflowTemplateId: undefined, dueFrom: undefined, dueTo: undefined });
                        }}
                        className="text-red-600"
                      >
                        Clear All Filters
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Desktop Filters - Hidden on mobile */}
              <div className="hidden sm:flex items-center gap-2">
                {/* Status Filter Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-6 px-2 py-0 text-[11px] font-normal hover:bg-muted flex items-center gap-1">
                      <Filter className="h-3 w-3" />
                      <span>Status {filters.status && filters.status.length > 0 ? `(${filters.status.length})` : ''}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {STATUS_OPTIONS.map(option => (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={filters.status?.includes(option.value) || false}
                        onCheckedChange={checked => {
                          const currentStatus = filters.status || [];
                          if (checked) {
                            updateFilters({ status: [...currentStatus, option.value] });
                          } else {
                            updateFilters({ status: currentStatus.filter(s => s !== option.value) });
                          }
                        }}
                      >
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Assignee Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-6 px-2 py-0 text-[11px] font-normal hover:bg-muted flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{filters.assigneeId ? users.find(u => u.id === filters.assigneeId)?.fullName || 'Assignee' : 'All Assignees'}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Filter by Assignee</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => updateFilters({ assigneeId: undefined })}>
                      All Assignees
                    </DropdownMenuItem>
                    {users.map(user => (
                      <DropdownMenuItem 
                        key={user.id}
                        onClick={() => updateFilters({ assigneeId: user.id })}
                      >
                        {user.fullName || user.email}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Team Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-6 px-2 py-0 text-[11px] font-normal hover:bg-muted flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{filters.teamId ? teams.find(t => t.id === filters.teamId)?.name || 'Team' : 'All Teams'}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Filter by Team</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => updateFilters({ teamId: undefined })}>
                      All Teams
                    </DropdownMenuItem>
                    {teams.map(team => (
                      <DropdownMenuItem 
                        key={team.id}
                        onClick={() => updateFilters({ teamId: team.id })}
                      >
                        {team.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Workflow Template Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-6 px-2 py-0 text-[11px] font-normal hover:bg-muted flex items-center gap-1" data-testid="button-filter-workflow">
                      <FileText className="h-3 w-3" />
                      <span>
                        {filters.workflowTemplateId === 'none' 
                          ? 'No Workflow' 
                          : filters.workflowTemplateId 
                            ? workflowTemplates.find((t: any) => t.id === filters.workflowTemplateId)?.name || 'Workflow' 
                            : 'All Workflows'}
                      </span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Filter by Workflow</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => updateFilters({ workflowTemplateId: undefined })} data-testid="menu-item-workflow-all">
                      All Workflows
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateFilters({ workflowTemplateId: 'none' })} data-testid="menu-item-workflow-none">
                      No Workflow
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {workflowTemplates.map((template: any) => (
                      <DropdownMenuItem 
                        key={template.id}
                        onClick={() => updateFilters({ workflowTemplateId: template.id })}
                        data-testid={`menu-item-workflow-filter-${template.id}`}
                      >
                        {template.name}
                        {template.steps?.length > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({template.steps.length} steps)
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Due Date Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-6 px-2 py-0 text-[11px] font-normal hover:bg-muted flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{filters.dueFrom || filters.dueTo ? 'Due Date' : 'All Dates'}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64">
                    <DropdownMenuLabel>Filter by Due Date</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="p-2 space-y-2">
                      <div>
                        <Label className="text-xs">From</Label>
                        <Input
                          type="date"
                          value={filters.dueFrom || ''}
                          onChange={(e) => updateFilters({ dueFrom: e.target.value || undefined })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">To</Label>
                        <Input
                          type="date"
                          value={filters.dueTo || ''}
                          onChange={(e) => updateFilters({ dueTo: e.target.value || undefined })}
                          className="h-7 text-xs"
                        />
                      </div>
                      {(filters.dueFrom || filters.dueTo) && (
                        <>
                          <DropdownMenuSeparator />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-7 text-xs"
                            onClick={() => updateFilters({ dueFrom: undefined, dueTo: undefined })}
                          >
                            Clear Dates
                          </Button>
                        </>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Column Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-6 px-2 py-0 text-[11px] font-normal hover:bg-muted flex items-center gap-1">
                      <Settings2 className="h-3 w-3" />
                      <span>Columns</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.entries(visibleColumns).map(([key, visible]) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={visible}
                        onCheckedChange={checked => {
                          setVisibleColumns({ ...visibleColumns, [key]: checked });
                        }}
                      >
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setGenerateDialogOpen(true)}
                  variant="outline"
                  className="h-6 w-6 p-0 flex items-center justify-center"
                  size="sm"
                  title="Generate Items"
                  data-testid="button-generate-items"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button 
                  onClick={() => openPanel('create')}
                  className="h-6 px-2 py-0 text-[11px] flex items-center gap-1"
                  size="sm"
                >
                  <Plus className="h-3 w-3" />
                  <span className="hidden sm:inline">New Item</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bulk Actions Toolbar */}
      {selectedItems.size > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium mr-4">
                {selectedItems.size} selected
              </span>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Add to Cycle
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {cycles.map(cycle => (
                    <DropdownMenuItem
                      key={cycle.id}
                      onClick={() => handleBulkAddToCycle(cycle.id)}
                    >
                      {cycle.status} ({format(new Date(cycle.startDate), 'MMM d')} - {format(new Date(cycle.endDate), 'MMM d')})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkRemoveFromCycle}
              >
                Remove from Cycle
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Set Status
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {STATUS_OPTIONS.map(option => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleBulkSetStatus(option.value as WorkItem['status'])}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Assign Team
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkSetTeam(null)}>
                    No team
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {teams.map(team => (
                    <DropdownMenuItem
                      key={team.id}
                      onClick={() => handleBulkSetTeam(team.id)}
                    >
                      {team.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-assign-workflow-template">
                    Assign Workflow
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkSetWorkflowTemplate(null)}>
                    No workflow
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {workflowTemplates.map((template: any) => (
                    <DropdownMenuItem
                      key={template.id}
                      onClick={() => handleBulkSetWorkflowTemplate(template.id)}
                      data-testid={`menu-item-workflow-${template.id}`}
                    >
                      {template.name}
                      {template.steps?.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({template.steps.length} steps)
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu open={bulkDueDatePickerOpen} onOpenChange={setBulkDueDatePickerOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Set Due Date
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64">
                  <DropdownMenuLabel>Set Due Date</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="p-2 space-y-2">
                    <div>
                      <Label className="text-xs">Specific Date</Label>
                      <div className="flex gap-1">
                        <Input
                          type="date"
                          value={bulkDueDateValue}
                          onChange={(e) => setBulkDueDateValue(e.target.value)}
                          className="h-7 text-xs flex-1"
                        />
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            if (bulkDueDateValue) {
                              handleBulkSetDueDate('set', bulkDueDateValue);
                              setBulkDueDateValue('');
                              setBulkDueDatePickerOpen(false);
                            }
                          }}
                        >
                          Set
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-normal">Add Days</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => { handleBulkSetDueDate('add', 1); setBulkDueDatePickerOpen(false); }}>
                    +1 day
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { handleBulkSetDueDate('add', 7); setBulkDueDatePickerOpen(false); }}>
                    +7 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { handleBulkSetDueDate('add', 14); setBulkDueDatePickerOpen(false); }}>
                    +14 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { handleBulkSetDueDate('add', 30); setBulkDueDatePickerOpen(false); }}>
                    +30 days
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-normal">Subtract Days</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => { handleBulkSetDueDate('subtract', 1); setBulkDueDatePickerOpen(false); }}>
                    -1 day
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { handleBulkSetDueDate('subtract', 7); setBulkDueDatePickerOpen(false); }}>
                    -7 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { handleBulkSetDueDate('subtract', 14); setBulkDueDatePickerOpen(false); }}>
                    -14 days
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { handleBulkSetDueDate('clear'); setBulkDueDatePickerOpen(false); }} className="text-red-600">
                    Clear Due Date
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkDeleteConfirmation(true)}
                className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300"
                data-testid="button-bulk-delete"
              >
                Delete ({selectedItems.size})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Table */}
      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-7xl border-t border-border flex flex-col h-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading work items...</div>
          </div>
        ) : workItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-background rounded-lg">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No work items found</h3>
            <p className="text-muted-foreground mb-4">Start by creating your first work item</p>
            <Button onClick={() => openPanel('create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Work Item
            </Button>
          </div>
        ) : (
          <>
          {/* Desktop Table View - Hidden on mobile */}
          <div className="hidden sm:flex flex-1 overflow-auto">
            <Table className="border-collapse">
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow className="border-b border-border bg-muted/50">
                <TableHead className="text-[11px] text-muted-foreground font-normal py-1 px-1 w-12 border-r border-border">
                  <Checkbox
                    checked={workItems.length > 0 && selectedItems.size === workItems.length}
                    onCheckedChange={handleSelectAll}
                    className="scale-75"
                  />
                </TableHead>
                <SortableHeader column="title" className="px-2">Title</SortableHeader>
                {visibleColumns.status && <SortableHeader column="status" className="w-[100px]">Status</SortableHeader>}
                {visibleColumns.due && <SortableHeader column="dueDate" className="w-[100px]">Due</SortableHeader>}
                {visibleColumns.assignee && <SortableHeader column="assignee" className="w-[120px]">Assignee</SortableHeader>}
                {visibleColumns.origin && <TableHead className="text-[11px] text-muted-foreground font-normal py-1 px-1 w-[80px] border-r border-border">Origin</TableHead>}
                {visibleColumns.team && <SortableHeader column="team" className="w-[100px]">Team</SortableHeader>}
                {visibleColumns.checkin && <SortableHeader column="checkin" className="w-[100px]">Check-in</SortableHeader>}
                {visibleColumns.progress && <TableHead className="text-[11px] text-muted-foreground font-normal py-1 px-1 w-[140px] border-r border-border">Progress</TableHead>}
                {visibleColumns.files && <TableHead className="text-[11px] text-muted-foreground font-normal py-1 px-1 w-[80px] text-center border-r border-border">Files</TableHead>}
                {visibleColumns.updated && <SortableHeader column="updated" className="w-[100px]">Updated</SortableHeader>}
                <TableHead className="w-6 py-1 px-1"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedWorkItems.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-muted/30 border-b border-border h-5"
                  onClick={() => openPanel('view', item.id)}
                  data-testid={`work-item-row-${item.id}`}
                >
                  <TableCell className="py-0 px-1 border-r border-border text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                      className="scale-75"
                    />
                  </TableCell>
                  <TableCell className="py-0 px-2 border-r border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium leading-tight truncate flex-1 text-foreground">
                        {item.title}
                      </span>
                      <DocumentIndicator 
                        entityType="workItem" 
                        entityId={item.id} 
                        entityTitle={item.title}
                        size="sm"
                        showZero={true}
                      />
                    </div>
                  </TableCell>
                  {visibleColumns.status && (
                  <TableCell className="py-0 px-1 border-r border-border">
                    {editingField?.itemId === item.id && editingField.field === 'status' ? (
                          <Select
                            value={tempValue}
                            onValueChange={(value) => setTempValue(value)}
                            onOpenChange={(open) => {
                              if (!open && editingField) {
                                saveInlineEdit();
                              }
                            }}
                            open={true}
                          >
                            <SelectTrigger className="h-5 w-28 text-[10px]" onClick={(e) => e.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                    ) : (
                      <Badge 
                        className={`cursor-pointer text-[7px] px-1 py-0 h-auto whitespace-nowrap ${getStatusBadge(item.status)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInlineEdit(item.id, 'status');
                        }}
                      >
                        {item.status}
                      </Badge>
                    )}
                  </TableCell>
                  )}
                  {visibleColumns.due && (
                  <TableCell className="py-0 px-1 border-r border-border">
                    {editingField?.itemId === item.id && editingField.field === 'dueDate' ? (
                          <Input
                            type="date"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={saveInlineEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                saveInlineEdit();
                              } else if (e.key === 'Escape') {
                                cancelInlineEdit();
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-20 text-[7px]"
                            autoFocus
                          />
                    ) : (
                      <div 
                        className="flex items-center gap-0.5 text-[7px] cursor-pointer hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInlineEdit(item.id, 'dueDate');
                        }}
                      >
                        {item.dueDate ? (
                          <>
                            <Calendar className="h-2.5 w-2.5" />
                            {format(new Date(item.dueDate), 'MMM d')}
                          </>
                        ) : (
                          <span className="text-muted-foreground text-[12px]">Set date</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  )}
                  {visibleColumns.assignee && (
                  <TableCell className="py-0.5 px-2 border-r border-border">
                    {item.assignee ? (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-medium whitespace-nowrap">
                        {item.assignee.fullName || item.assignee.email}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">—</span>
                    )}
                  </TableCell>
                  )}
                  {visibleColumns.origin && (
                  <TableCell className="py-0.5 px-2 border-r border-border">{getOriginChip(item)}</TableCell>
                  )}
                  {visibleColumns.team && (
                  <TableCell className="py-0 px-1 border-r border-border">
                    {editingField?.itemId === item.id && editingField.field === 'team' ? (
                          <Select
                            value={tempValue}
                            onValueChange={(value) => setTempValue(value)}
                            onOpenChange={(open) => {
                              if (!open && editingField) {
                                saveInlineEdit();
                              }
                            }}
                            open={true}
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No team</SelectItem>
                              {teams.map((team) => (
                                <SelectItem key={team.id} value={team.id.toString()}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                    ) : (
                      <div 
                        className="cursor-pointer hover:text-primary"
                        onClick={() => handleInlineEdit(item.id, 'team')}
                      >
                        {item.team ? (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 h-auto">
                            {item.team.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  )}
                  {visibleColumns.checkin && (
                  <TableCell className="py-0.5 px-2 border-r border-border">
                    {item.targetMeeting ? (
                      <div className="flex items-center gap-1 text-[10px]">
                        <Calendar className="h-3 w-3" />
                        {formatInOrgTz(item.targetMeeting.scheduledDate, { month: 'short', day: 'numeric' })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">—</span>
                    )}
                  </TableCell>
                  )}
                  {visibleColumns.progress && (
                  <TableCell className="py-0.5 px-2 border-r border-border">
                    {item.workflowTemplateId ? (
                      <WorkflowProgressCell workItemId={item.id} />
                    ) : (
                      <span className="text-muted-foreground text-[10px]">—</span>
                    )}
                  </TableCell>
                  )}
                  {visibleColumns.files && (
                  <TableCell className="py-0.5 px-2 text-center border-r border-border">
                    {(item.attachments?.length ?? 0) > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span className="text-[10px]">{item.attachments?.length ?? 0}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">—</span>
                    )}
                  </TableCell>
                  )}
                  {visibleColumns.updated && (
                  <TableCell className="py-0.5 px-2 border-r border-border">
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(item.updatedAt), 'MMM d, h:mm a')}
                    </span>
                  </TableCell>
                  )}
                  <TableCell className="py-0.5 px-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-2.5 w-2.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openPanel('view', item.id); }}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openPanel('edit', item.id); }}>
                          Edit Item
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setDeleteConfirmation({ isOpen: true, item });
                          }}
                          className="text-red-600"
                        >
                          Delete Item
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
          
          {/* Mobile Card View - Hidden on desktop */}
          <div className="sm:hidden flex-1 overflow-auto px-3 py-2 space-y-2">
            {paginatedWorkItems.map((item) => (
              <Card 
                key={item.id} 
                className="border border-border hover:border-muted-foreground/30 transition-colors cursor-pointer"
                onClick={() => openPanel('view', item.id)}
                data-testid={`work-item-card-${item.id}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                        className="scale-75 mt-0.5"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[13px] font-semibold leading-tight truncate flex-1">
                          {item.title}
                        </h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 -mr-2">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openPanel('view', item.id); }}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openPanel('edit', item.id); }}>
                              Edit Item
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setDeleteConfirmation({ isOpen: true, item });
                              }}
                              className="text-red-600"
                            >
                              Delete Item
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        <Badge className={`text-[9px] px-1.5 py-0 h-auto ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </Badge>
                        
                        {item.dueDate && (
                          <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Calendar className="h-2.5 w-2.5" />
                            <span>{format(new Date(item.dueDate), 'MMM d')}</span>
                          </div>
                        )}
                        
                        {item.assignee && (
                          <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <User className="h-2.5 w-2.5" />
                            <span className="truncate max-w-[120px]">{item.assignee.fullName || item.assignee.email}</span>
                          </div>
                        )}
                        
                        {item.team && (
                          <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Users className="h-2.5 w-2.5" />
                            <span>{item.team.name}</span>
                          </div>
                        )}
                        
                        {(item.attachments?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <FileText className="h-2.5 w-2.5" />
                            <span>{item.attachments?.length ?? 0}</span>
                          </div>
                        )}
                      </div>
                      
                      {item.workflowTemplateId && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <WorkflowProgressCell workItemId={item.id} />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Pagination Controls */}
          {workItems.length > 0 && (
            <div className="px-3 py-3 border-t border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  Showing {startIndex + 1}-{endIndex} of {totalItems}
                </span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-7 w-[100px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                    <SelectItem value="200">200 per page</SelectItem>
                    <SelectItem value="99999">Show All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          </>
        )}
        </div>
      </div>
      {/* Work Item Panel - render outside main container to avoid z-index issues */}
      {panelMode && (
        <div className="fixed inset-0 z-50">
          <WorkItemPanel
            isOpen={true}
            onClose={closePanel}
            mode={panelMode}
            workItemId={selectedId}
            workItem={selectedWorkItem}
            onOpenKeyResult={(keyResultId) => openKeyResultPanel(keyResultId, 'details')}
          />
        </div>
      )}
      {/* Key Result Detail Panel */}
      {selectedKeyResultId && (
        <KeyResultDetailPanel
          keyResultId={selectedKeyResultId}
          open={keyResultPanelOpen}
          initialTab={keyResultPanelTab}
          onClose={() => {
            setKeyResultPanelOpen(false);
            setSelectedKeyResultId(null);
            setKeyResultPanelTab('details');
          }}
        />
      )}
      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={deleteConfirmation.isOpen} 
        onOpenChange={(open) => setDeleteConfirmation({ isOpen: open, item: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmation.item?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteConfirmation.item) {
                  deleteMutation.mutate(deleteConfirmation.item.id);
                  setDeleteConfirmation({ isOpen: false, item: null });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog 
        open={bulkDeleteConfirmation} 
        onOpenChange={setBulkDeleteConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedItems.size} Work Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedItems.size} work items? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                bulkDeleteMutation.mutate(Array.from(selectedItems));
              }}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Manual Generate Dialog */}
      <ManualGenerateDialog 
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
      />
    </div>
  );
}