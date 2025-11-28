import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SlidePanel } from '@/components/ui/slide-panel';
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
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { KeyResultDetailPanel } from '@/components/key-result-detail/KeyResultDetailPanel';
import { KeyResultTaskDetailPanel } from '@/components/key-result-detail/KeyResultTaskDetailPanel';
import WorkItemPanel from '@/components/work-items/WorkItemPanel';
import { format } from 'date-fns';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Target,
  MoreVertical,
  Settings2,
  X,
  CalendarIcon,
  ListTodo,
  Filter,
  UserCircle,
  CornerDownRight,
  FileText,
  GripVertical,
  Table as TableIcon,
  GitBranch,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import CreateObjectiveDialog from '@/components/okr/CreateObjectiveDialog';
import CreateKeyResultDialog from '@/components/okr/CreateKeyResultDialog';
import { DeleteObjectiveDialog } from '@/components/okr/dialogs/DeleteObjectiveDialog';
import { DocumentAttachmentButton } from '@/components/KnowledgeBase/DocumentAttachmentButton';
import { AttachedDocumentsList } from '@/components/KnowledgeBase/AttachedDocumentsList';
import { DeleteKeyResultDialog } from '@/components/okr/dialogs/DeleteKeyResultDialog';
import MindMap from '@/components/strategy/MindMap';

interface User {
  id: number;
  fullName: string;
  email: string;
}

interface Team {
  id: number;
  name: string;
  description?: string;
}

interface Objective {
  id: number;
  organizationId: number;
  title: string;
  description?: string;
  status: string;
  targetValue?: number;
  currentValue?: number;
  ownerId?: number;
  ownerName?: string;
  owner?: User;
  teamId?: number;
  team?: Team;
  keyResults?: KeyResult[];
}

interface KeyResult {
  id: number;
  objectiveId: number;
  title: string;
  description?: string;
  targetValue?: string;
  currentValue?: string;
  unit?: string;
  status: string;
  type?: string;
  ownerId?: number;
  ownerName?: string;
  owner?: User;
  tasks?: any[];
}

interface ActivityLog {
  id: number;
  userId: number;
  userName?: string;
  actionType: string;
  description: string;
  createdAt: string;
  metadata?: any;
}


export default function Objectives() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // View mode state - Table or Mind Map with localStorage persistence
  const [viewMode, setViewMode] = useState<'table' | 'mindmap'>(() => {
    const saved = localStorage.getItem('objectives-view-mode');
    return (saved === 'table' || saved === 'mindmap') ? saved as 'table' | 'mindmap' : 'table';
  });

  // Persist view mode changes to localStorage
  useEffect(() => {
    localStorage.setItem('objectives-view-mode', viewMode);
  }, [viewMode]);
  
  // State management
  const [expandedObjectives, setExpandedObjectives] = useState<Set<number>>(new Set());
  const [expandedKeyResults, setExpandedKeyResults] = useState<Set<number>>(new Set());
  const [viewFilter, setViewFilter] = useState<'all' | 'objectives' | 'keyResults' | 'tasks'>('all');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState({
    owner: true,
    team: true,
    progress: true,
    status: true,
  });
  
  // Edit states
  const [editingCell, setEditingCell] = useState<{ id: number; field: string; type: 'objective' | 'keyResult' } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  // Panel states
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'create' | 'edit'>('edit');
  const [selectedItem, setSelectedItem] = useState<{ type: 'objective' | 'keyResult'; data: any } | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [selectedObjectiveForKeyResult, setSelectedObjectiveForKeyResult] = useState<number | null>(null);
  
  // Quick add task state
  const [selectedKeyResultId, setSelectedKeyResultId] = useState<number | null>(null);
  const [keyResultPanelOpen, setKeyResultPanelOpen] = useState(false);
  const [keyResultPanelTab, setKeyResultPanelTab] = useState<string>('details');
  
  // Task Panel states
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<number | null>(null);
  const [taskKeyResultId, setTaskKeyResultId] = useState<number | null>(null);
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  
  // Key Result Task Panel states
  const [selectedKrTask, setSelectedKrTask] = useState<any | null>(null);
  const [krTaskPanelOpen, setKrTaskPanelOpen] = useState(false);
  
  // Create dialogs - DEPRECATED - using Panel instead
  const [createObjectiveOpen, setCreateObjectiveOpen] = useState(false);
  const [createKeyResultOpen, setCreateKeyResultOpen] = useState(false);
  
  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [objectiveToDelete, setObjectiveToDelete] = useState<Objective | null>(null);
  const [deleteKeyResultDialogOpen, setDeleteKeyResultDialogOpen] = useState(false);
  const [keyResultToDelete, setKeyResultToDelete] = useState<KeyResult | null>(null);

  // Fetch data
  const { data: objectives = [], isLoading } = useQuery<Objective[]>({
    queryKey: ['/api/strategy/objectives'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/core/users'],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: [`/api/strategy/activity-logs?objectiveId=${selectedItem?.data.id}`],
    enabled: !!selectedItem && panelOpen && !!selectedItem.data.id,
  });

  // Query for attached documents
  const { data: attachedDocuments = [], refetch: refetchAttachedDocuments } = useQuery<any[]>({
    queryKey: [`/api/knowledge-base/attachments/objective/${selectedItem?.data.id}`],
    enabled: !!selectedItem && panelOpen && !!selectedItem.data.id && selectedItem.type === 'objective'
  });

  // Mutations
  const updateObjectiveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Objective> }) => {
      return apiRequest(`/api/strategy/objectives/${id}`, {
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      toast({ title: 'Success', description: 'Objective updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update objective', variant: 'destructive' });
    },
  });

  const updateKeyResultMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<KeyResult> }) => {
      return apiRequest(`/api/strategy/key-results/${id}`, {
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      toast({ title: 'Success', description: 'Key result updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update key result', variant: 'destructive' });
    },
  });

  const deleteObjectiveMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/strategy/objectives/${id}?cascade=true`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      toast({ title: 'Success', description: 'Objective and all dependencies deleted successfully' });
      setDeleteDialogOpen(false);
      setObjectiveToDelete(null);
    },
    onError: (error: any) => {
      const message = error.message || 'Failed to delete objective';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });

  const deleteKeyResultMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/strategy/key-results/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      toast({ title: 'Success', description: 'Key result deleted successfully' });
      setDeleteKeyResultDialogOpen(false);
      setKeyResultToDelete(null);
    },
    onError: (error: any) => {
      const message = error.message || 'Failed to delete key result';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/strategy/tasks', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      toast({ title: 'Success', description: 'Task created successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create task', variant: 'destructive' });
    },
  });

  const reorderObjectivesMutation = useMutation({
    mutationFn: async (updates: { id: number; displayOrder: number }[]) => {
      return apiRequest('/api/strategy/objectives/reorder', {
        method: 'PUT',
        body: { updates },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      toast({ title: 'Success', description: 'Objectives reordered successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to reorder objectives', variant: 'destructive' });
    },
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handlers
  const toggleObjective = (id: number) => {
    const newExpanded = new Set(expandedObjectives);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedObjectives(newExpanded);
  };

  const toggleKeyResult = (id: number) => {
    const newExpanded = new Set(expandedKeyResults);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedKeyResults(newExpanded);
  };

  const handleCellEdit = (id: number, field: string, type: 'objective' | 'keyResult', currentValue: string) => {
    setEditingCell({ id, field, type });
    setEditValue(currentValue || '');
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    const data = { [editingCell.field]: editValue };
    
    if (editingCell.type === 'objective') {
      await updateObjectiveMutation.mutateAsync({ id: editingCell.id, data });
    } else {
      await updateKeyResultMutation.mutateAsync({ id: editingCell.id, data });
    }
    
    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const openEditPanel = (type: 'objective', data: any) => {
    setSelectedItem({ type, data });
    setPanelMode('edit');
    setPanelOpen(true);
  };

  const openCreateObjectiveDialog = () => {
    setSelectedItem({ 
      type: 'objective', 
      data: { 
        title: '', 
        description: '', 
        status: 'Draft',
        targetValue: 100,
        currentValue: 0,
        ownerId: null 
      } 
    });
    setPanelMode('create');
    setPanelOpen(true);
  };

  const openCreateKeyResultDialog = (objectiveId: number) => {
    setSelectedObjectiveForKeyResult(objectiveId);
    setCreateKeyResultOpen(true);
  };

  const calculateProgress = (current?: number | string, target?: number | string) => {
    const currentVal = typeof current === 'string' ? parseFloat(current) : (current || 0);
    const targetVal = typeof target === 'string' ? parseFloat(target) : (target || 0);
    if (!targetVal) return 0;
    return Math.min(Math.round((currentVal / targetVal) * 100), 100);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'live':
      case 'on track':
      case 'on_track':
      case 'progressing':
        return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] px-2 py-0.5';
      case 'at risk':
      case 'at_risk':
      case 'off track':
        return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] px-2 py-0.5';
      case 'completed':
      case 'achieved':
        return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] px-2 py-0.5';
      case 'draft':
      case 'not started':
        return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] px-2 py-0.5';
      default:
        return 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] px-2 py-0.5';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  // Filter data
  const filteredData = objectives.filter(obj => {
    if (statusFilter.length > 0 && !statusFilter.includes(obj.status)) return false;
    if (ownerFilter && ownerFilter !== 'all' && obj.ownerId?.toString() !== ownerFilter) return false;
    return true;
  });

  const shouldShowRow = (type: 'objective' | 'keyResult') => {
    if (viewFilter === 'all') return true;
    if (viewFilter === 'objectives') return type === 'objective';
    if (viewFilter === 'keyResults') return type === 'keyResult';
    if (viewFilter === 'tasks') return true; // Show objectives and key results for context when viewing tasks
    return false;
  };

  // Open Key Result panel handler
  const openKeyResultPanel = (keyResultId: number, tab: string = 'details') => {
    setSelectedKeyResultId(keyResultId);
    setKeyResultPanelTab(tab);
    setKeyResultPanelOpen(true);
  };
  
  const openTaskPanel = (task: any, keyResult: any) => {
    setSelectedTask(task);
    setSelectedWorkItemId(null); // Clear work item ID to prevent stale override
    setTaskKeyResultId(keyResult.id);
    setTaskPanelOpen(true);
    setKeyResultPanelOpen(false); // Prevent panel stacking
  };
  
  const closeTaskPanel = () => {
    setSelectedTask(null);
    setSelectedWorkItemId(null);
    setTaskKeyResultId(null);
    setTaskPanelOpen(false);
  };
  
  // Enhanced task opener that routes to the correct panel based on task type
  const openTask = (task: any, keyResult: any) => {
    if (!task || !keyResult) {
      // Fallback to original behavior if task or keyResult is missing
      return openKeyResultPanel(keyResult?.id, 'tasks'); 
    }

    // Key Result tasks should always open KeyResultTaskDetailPanel
    // These are tasks that have a keyResultId (tasks associated with a Key Result)
    if (task.keyResultId || keyResult?.id) {
      setSelectedKrTask(task);
      setTaskKeyResultId(task.keyResultId || keyResult.id);
      setKrTaskPanelOpen(true);
      setTaskPanelOpen(false); // Ensure WorkItemPanel is closed
      setKeyResultPanelOpen(false); // Prevent panel stacking
      return;
    }

    // Only open WorkItemPanel for standalone work items without KR association
    if (task.workItemId && !task.keyResultId) {
      setSelectedTask(null); // Clear workItem prop
      setSelectedWorkItemId(task.workItemId); // Set workItemId prop instead
      setTaskKeyResultId(keyResult.id);
      setTaskPanelOpen(true);
      setKrTaskPanelOpen(false); // Ensure KR task panel is closed
      setKeyResultPanelOpen(false);
      return;
    }
    
    // Default: open as KR task since it's in the KR context
    setSelectedKrTask(task);
    setTaskKeyResultId(task.keyResultId || keyResult.id);
    setKrTaskPanelOpen(true);
    setTaskPanelOpen(false);
    setKeyResultPanelOpen(false);
  };

  // Handle drag end for reordering objectives
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredData.findIndex((obj) => obj.id === active.id);
      const newIndex = filteredData.findIndex((obj) => obj.id === over.id);

      const reordered = arrayMove(filteredData, oldIndex, newIndex);
      
      // Calculate new displayOrder values
      const updates = reordered.map((obj, index) => ({
        id: obj.id,
        displayOrder: index,
      }));

      reorderObjectivesMutation.mutate(updates);
    }
  };

  // Sortable objective row component
  const SortableObjectiveRow = ({ objective }: { objective: Objective }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: objective.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const isExpanded = viewFilter === 'keyResults' || viewFilter === 'tasks' ? true : viewFilter === 'objectives' ? false : expandedObjectives.has(objective.id);
    const objProgress = calculateProgress(objective.currentValue, objective.targetValue);

    return (
      <TableRow ref={setNodeRef} style={style} className="hover:bg-muted/30 border-b border-border">
        <TableCell className="py-0.5 px-3 border-r border-border">
          {editingCell?.id === objective.id && editingCell.field === 'title' ? (
            <Input
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              autoFocus
              className="h-8"
            />
          ) : (
            <div className="cursor-pointer hover:underline leading-tight flex items-center">
              <button
                {...attributes}
                {...listeners}
                className="mr-1 hover:bg-muted rounded p-0.5 inline-flex flex-shrink-0 cursor-grab active:cursor-grabbing"
                data-testid={`drag-handle-objective-${objective.id}`}
              >
                <GripVertical className="h-[18px] w-[18px] text-muted-foreground" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleObjective(objective.id); }}
                className="mr-1 hover:bg-muted rounded p-0.5 inline-flex flex-shrink-0"
              >
                {isExpanded ? <ChevronDown className="h-[18px] w-[18px] text-muted-foreground" /> : <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />}
              </button>
              <span 
                className="mr-1.5 text-sm flex-shrink-0 flex items-center" 
                onClick={() => openEditPanel('objective', objective)}
              >
                🎯
              </span>
              <span 
                className="text-[12px] font-medium truncate" 
                onClick={() => openEditPanel('objective', objective)}
                onDoubleClick={() => handleCellEdit(objective.id, 'title', 'objective', objective.title)}
              >
                {objective.title}
              </span>
            </div>
          )}
        </TableCell>
        {visibleColumns.owner && (
          <TableCell className="py-0.5 px-2 border-r border-border">
            {editingCell?.id === objective.id && editingCell.field === 'ownerId' ? (
              <Select
                value={editValue}
                onValueChange={value => {
                  setEditValue(value);
                  updateObjectiveMutation.mutate({ id: objective.id, data: { ownerId: parseInt(value) } });
                  setEditingCell(null);
                }}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div
                className="cursor-pointer"
                onClick={() => handleCellEdit(objective.id, 'ownerId', 'objective', objective.ownerId?.toString() || 'none')}
              >
                <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-medium whitespace-nowrap">
                  {objective.ownerName || objective.owner?.fullName || '-'}
                </span>
              </div>
            )}
          </TableCell>
        )}
        {visibleColumns.team && (
          <TableCell className="py-0.5 px-2 border-r border-border">
            {editingCell?.id === objective.id && editingCell.field === 'teamId' ? (
              <Select
                value={editValue}
                onValueChange={value => {
                  setEditValue(value);
                  updateObjectiveMutation.mutate({ id: objective.id, data: { teamId: value && value !== 'none' ? parseInt(value) : undefined } });
                  setEditingCell(null);
                }}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Team</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div
                className="cursor-pointer"
                onClick={() => handleCellEdit(objective.id, 'teamId', 'objective', objective.teamId?.toString() || 'none')}
              >
                <span className="inline-block px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-medium whitespace-nowrap">
                  {objective.team?.name || '-'}
                </span>
              </div>
            )}
          </TableCell>
        )}
        {visibleColumns.progress && (
          <TableCell className="py-0.5 px-2 border-r border-border">
            <div className="flex items-center gap-1">
              <Progress value={objProgress} className="flex-1 h-[3px]" />
              <span className="text-[10px] text-muted-foreground w-7 text-right">{objProgress}%</span>
            </div>
          </TableCell>
        )}
        {visibleColumns.status && (
          <TableCell className="py-0.5 px-2 border-r border-border">
            {editingCell?.id === objective.id && editingCell.field === 'status' ? (
              <Select
                value={editValue}
                onValueChange={value => {
                  setEditValue(value);
                  updateObjectiveMutation.mutate({ id: objective.id, data: { status: value } });
                  setEditingCell(null);
                }}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="At Risk">At Risk</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge
                className={cn(getStatusBadgeClass(objective.status), 'cursor-pointer whitespace-nowrap')}
                onClick={() => handleCellEdit(objective.id, 'status', 'objective', objective.status)}
              >
                {objective.status}
              </Badge>
            )}
          </TableCell>
        )}
        <TableCell className="py-0.5 px-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                <MoreVertical className="h-2.5 w-2.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditPanel('objective', objective)}>
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openCreateKeyResultDialog(objective.id)}>
                Add Key Result
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditPanel('objective', objective)}>
                View Activity
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setObjectiveToDelete(objective);
                  setDeleteDialogOpen(true);
                }}
                className="text-red-600"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  };

  // Component to display tasks for an expanded key result
  const KeyResultTaskRows = ({ keyResultId, keyResult, visibleColumns }: { keyResultId: number; keyResult: any; visibleColumns: any }) => {
    // Lazy load tasks only when expanded
    const { data: tasks = [], isLoading } = useQuery<any[]>({
      queryKey: [`/api/strategy/key-results/${keyResultId}/tasks`],
      enabled: true,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="pl-20 py-1">
            <span className="text-xs text-gray-400">Loading tasks...</span>
          </TableCell>
        </TableRow>
      );
    }

    if (!tasks || tasks.length === 0) {
      return (
        <TableRow className="bg-gray-50/30">
          <TableCell colSpan={5} className="pl-20 py-2">
            <span className="text-xs text-gray-400 italic">No tasks defined for this key result</span>
          </TableCell>
        </TableRow>
      );
    }

    return (
      <>
        {tasks.map((task: any) => (
          <TableRow key={task.id} className="hover:bg-gray-50/50 bg-gray-50/30 border-b border-gray-50">
            <TableCell className="py-0.5 px-3 pl-20 border-r border-gray-100">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:text-gray-900"
                onClick={() => openTask(task, keyResult)}
              >
                <CornerDownRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="text-[11px] text-gray-700 hover:underline">{task.title}</span>
                {task.isRecurring && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 h-auto">
                    {task.frequency}
                  </Badge>
                )}
              </div>
            </TableCell>
            
            {visibleColumns.owner && (
              <TableCell className="py-0.5 px-2 border-r border-gray-100">
                <span className="text-[10px] text-gray-500">
                  {task.assignedToName || task.teamName || '-'}
                </span>
              </TableCell>
            )}
            
            {visibleColumns.team && (
              <TableCell className="py-0.5 px-2 border-r border-gray-100">
                <span className="text-[10px] text-gray-500 opacity-50">
                  -
                </span>
              </TableCell>
            )}
            
            {visibleColumns.progress && (
              <TableCell className="py-0.5 px-2 border-r border-gray-100">
                {task.isRecurring ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-600">
                      {task.completedCount || 0} of {task.totalOccurrences || '∞'}
                    </span>
                    {task.currentStreak > 0 && (
                      <Badge className="text-[9px] px-1 py-0 h-auto" variant="outline">
                        🔥 {task.currentStreak}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-500">
                    {task.status === 'Not Started' ? '-' : task.status === 'In Progress' ? '50%' : task.status === 'Completed' ? '100%' : '-'}
                  </span>
                )}
              </TableCell>
            )}
            
            {visibleColumns.status && (
              <TableCell className="py-0.5 px-2 border-r border-gray-100">
                <Badge className="text-[9px] px-1.5 py-0.5 h-auto" variant="outline">
                  {task.generationStatus || task.status}
                </Badge>
              </TableCell>
            )}
            
            <TableCell className="py-0.5 px-1">
              {/* Minimal actions for tasks */}
            </TableCell>
          </TableRow>
        ))}
      </>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex justify-center">
        <div className="w-full max-w-7xl">
          {/* Header */}
          <div className="px-3 py-1 pt-8">
            <div className="mb-1">
              <h1 className="text-[14px] font-bold mt-[10px] mb-[10px]">Objectives and Key Results</h1>
              <p className="text-xs text-muted-foreground">Track strategic goals and measurable outcomes</p>
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
                    {(statusFilter.length > 0 || (ownerFilter && ownerFilter !== 'all')) && (
                      <Badge variant="secondary" className="h-3 px-1 text-[10px] ml-1">
                        {statusFilter.length + (ownerFilter && ownerFilter !== 'all' ? 1 : 0)}
                      </Badge>
                    )}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {/* View Mode Section */}
                  <DropdownMenuLabel>View Mode</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={viewFilter} onValueChange={(value: any) => setViewFilter(value)}>
                    <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="objectives">Objectives Only</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="keyResults">Key Results Only</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="tasks">Tasks Only</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  
                  {/* Status Filter Section */}
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  {['Active', 'Draft', 'Completed', 'At Risk', 'Archived'].map(status => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={statusFilter.includes(status)}
                      onCheckedChange={checked => {
                        if (checked) {
                          setStatusFilter([...statusFilter, status]);
                        } else {
                          setStatusFilter(statusFilter.filter(s => s !== status));
                        }
                      }}
                    >
                      {status}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  
                  {/* Owner Filter Section */}
                  <DropdownMenuLabel>Filter by Owner</DropdownMenuLabel>
                  <DropdownMenuRadioGroup 
                    value={ownerFilter || 'all'} 
                    onValueChange={setOwnerFilter}
                  >
                    <DropdownMenuRadioItem value="all">All Owners</DropdownMenuRadioItem>
                    {users.map(user => (
                      <DropdownMenuRadioItem key={user.id} value={user.id.toString()}>
                        {user.fullName}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
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
                  {(statusFilter.length > 0 || (ownerFilter && ownerFilter !== 'all')) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setStatusFilter([]);
                          setOwnerFilter('all');
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
          {/* View Toggle */}
          <div className="flex gap-1">
            <Button
              variant={viewFilter === 'all' ? 'secondary' : 'ghost'}
              className="h-6 px-2 py-0 text-[11px] font-normal"
              onClick={() => setViewFilter('all')}
            >
              All
            </Button>
            <Button
              variant={viewFilter === 'objectives' ? 'secondary' : 'ghost'}
              className="h-6 px-2 py-0 text-[11px] font-normal"
              onClick={() => setViewFilter('objectives')}
            >
              Objectives Only
            </Button>
            <Button
              variant={viewFilter === 'keyResults' ? 'secondary' : 'ghost'}
              className="h-6 px-2 py-0 text-[11px] font-normal"
              onClick={() => setViewFilter('keyResults')}
            >
              Key Results Only
            </Button>
            <Button
              variant={viewFilter === 'tasks' ? 'secondary' : 'ghost'}
              className="h-6 px-2 py-0 text-[11px] font-normal"
              onClick={() => {
                setViewFilter('tasks');
                // Auto-expand all key results that have tasks when filtering by tasks
                const newExpanded = new Set(expandedKeyResults);
                objectives.forEach(obj => {
                  obj.keyResults?.forEach(kr => {
                    newExpanded.add(kr.id);
                  });
                });
                setExpandedKeyResults(newExpanded);
              }}
            >
              Tasks Only
            </Button>
          </div>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-6 px-2 py-0 text-[11px] font-normal hover:bg-gray-100 flex items-center gap-1">
                <Filter className="h-3 w-3" />
                <span>Status {statusFilter.length > 0 && `(${statusFilter.length})`}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {['Active', 'Draft', 'Completed', 'At Risk', 'Archived'].map(status => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilter.includes(status)}
                  onCheckedChange={checked => {
                    if (checked) {
                      setStatusFilter([...statusFilter, status]);
                    } else {
                      setStatusFilter(statusFilter.filter(s => s !== status));
                    }
                  }}
                >
                  {status}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Owner Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-6 px-2 py-0 text-[11px] font-normal hover:bg-gray-100 flex items-center gap-1">
                <UserCircle className="h-3 w-3" />
                <span>{ownerFilter && ownerFilter !== 'all' ? users.find(u => u.id.toString() === ownerFilter)?.fullName : 'All Owners'}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Owner</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setOwnerFilter('all')}>
                All Owners
              </DropdownMenuItem>
              {users.map(user => (
                <DropdownMenuItem 
                  key={user.id} 
                  onClick={() => setOwnerFilter(user.id.toString())}
                >
                  {user.fullName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Column Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-6 px-2 py-0 text-[11px] font-normal hover:bg-gray-100 flex items-center gap-1">
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

          {/* Clear Filters */}
          {(statusFilter.length > 0 || (ownerFilter && ownerFilter !== 'all')) && (
            <Button
              variant="ghost"
              className="h-6 px-2 py-0 text-[11px] font-normal hover:bg-gray-100"
              onClick={() => {
                setStatusFilter([]);
                setOwnerFilter('all');
              }}
            >
              Clear Filters
            </Button>
          )}
          </div>
          
          {/* View Toggle & New Objective Buttons */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 py-0 text-[11px] rounded-none border-0"
                onClick={() => setViewMode('table')}
                data-testid="button-table-view"
              >
                <TableIcon className="h-3 w-3 mr-1" />
                Table
              </Button>
              <Button
                variant={viewMode === 'mindmap' ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 py-0 text-[11px] rounded-none border-0"
                onClick={() => setViewMode('mindmap')}
                data-testid="button-mindmap-view"
              >
                <GitBranch className="h-3 w-3 mr-1" />
                Mind Map
              </Button>
            </div>
            
            {/* New Objective Button */}
            <Button 
              onClick={openCreateObjectiveDialog}
              className="h-6 px-2 py-0 text-[11px] flex items-center gap-1"
              size="sm"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">New Objective</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
            </div>
          </div>
        </div>
      </div>
      {/* Content: Table or Mind Map */}
      <div className="flex-1 overflow-auto p-0 flex justify-center">
        <div className="w-full max-w-7xl border-t border-border">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading objectives...</div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-background rounded-lg">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No objectives created yet</h3>
            <p className="text-muted-foreground mb-4">Start by defining your first strategic objective</p>
            <Button onClick={openCreateObjectiveDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Objective
            </Button>
          </div>
        ) : viewMode === 'mindmap' ? (
          <div className="w-full" style={{ height: 'calc(100vh - 200px)' }}>
            <MindMap 
              objectives={filteredData}
              onNodeClick={(nodeId, nodeType, data) => {
                if (nodeType === 'objective') {
                  openEditPanel('objective', data);
                } else if (nodeType === 'keyResult') {
                  const krId = parseInt(nodeId.replace('kr-', ''));
                  openKeyResultPanel(krId, 'details');
                }
              }}
            />
          </div>
        ) : (
          <Table className="border-collapse">
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/50">
                <TableHead className="text-[11px] text-muted-foreground font-normal py-1 px-3 border-r border-border">Name</TableHead>
                {visibleColumns.owner && <TableHead className="text-[11px] text-muted-foreground font-normal py-1 px-2 w-[100px] border-r border-border">Owner</TableHead>}
                {visibleColumns.team && <TableHead className="text-[11px] text-muted-foreground font-normal py-1 px-2 w-[120px] border-r border-border">Team</TableHead>}
                {visibleColumns.progress && <TableHead className="text-[11px] text-muted-foreground font-normal py-1 px-2 w-[80px] border-r border-border">Progress</TableHead>}
                {visibleColumns.status && <TableHead className="text-[11px] text-muted-foreground font-normal py-1 px-2 w-[100px] border-r border-border">Status</TableHead>}
                <TableHead className="w-6 py-1 px-1"></TableHead>
              </TableRow>
            </TableHeader>
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={filteredData.map(obj => obj.id)}
                strategy={verticalListSortingStrategy}
              >
                <TableBody>
                  {filteredData.map(objective => {
                    const isExpanded = viewFilter === 'keyResults' || viewFilter === 'tasks' ? true : viewFilter === 'objectives' ? false : expandedObjectives.has(objective.id);
                    
                    return (
                      <React.Fragment key={objective.id}>
                        {shouldShowRow('objective') && (
                          <SortableObjectiveRow objective={objective} />
                        )}

                        {/* Key Results */}
                        {isExpanded && objective.keyResults?.map(keyResult => {
                      const krProgress = calculateProgress(keyResult.currentValue, keyResult.targetValue);
                      
                      return (
                        <React.Fragment key={keyResult.id}>
                        <TableRow className="hover:bg-muted/30 border-b border-border">
                          <TableCell className="py-0.5 px-3 pl-10 border-r border-border">
                            {editingCell?.id === keyResult.id && editingCell.field === 'title' ? (
                              <Input
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={saveEdit}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveEdit();
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                autoFocus
                                className="h-8"
                              />
                            ) : (
                              <div
                                className="cursor-pointer hover:underline flex items-center"
                                onClick={() => openKeyResultPanel(keyResult.id, 'details')}
                                onDoubleClick={() => handleCellEdit(keyResult.id, 'title', 'keyResult', keyResult.title)}
                              >
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    toggleKeyResult(keyResult.id); 
                                  }}
                                  className="mr-1 hover:bg-gray-100 rounded p-0.5 inline-flex flex-shrink-0"
                                >
                                  {expandedKeyResults.has(keyResult.id) ? 
                                    <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                  }
                                </button>
                                <span className="mr-1 text-xs flex-shrink-0">✅</span>
                                <span className="text-[11px] leading-tight truncate">{keyResult.title}</span>
                              </div>
                            )}
                          </TableCell>
                          {visibleColumns.owner && (
                            <TableCell className="py-0.5 px-2 border-r border-gray-100">
                              {editingCell?.id === keyResult.id && editingCell.field === 'ownerId' ? (
                                <Select
                                  value={editValue}
                                  onValueChange={value => {
                                    setEditValue(value);
                                    updateKeyResultMutation.mutate({ id: keyResult.id, data: { ownerId: parseInt(value) } });
                                    setEditingCell(null);
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {users.map(user => (
                                      <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.fullName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div
                                  className="cursor-pointer"
                                  onClick={() => handleCellEdit(keyResult.id, 'ownerId', 'keyResult', keyResult.ownerId?.toString() || 'none')}
                                >
                                  <span className="inline-block px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-medium whitespace-nowrap">
                                    {keyResult.ownerName || keyResult.owner?.fullName || '-'}
                                  </span>
                                </div>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.team && (
                            <TableCell className="py-0.5 px-2 border-r border-gray-100">
                              <div className="cursor-pointer">
                                <span className="inline-block px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-medium whitespace-nowrap opacity-50">
                                  {objective.team?.name || '-'}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.progress && (
                            <TableCell className="py-0.5 px-2 border-r border-gray-100">
                              <div className="space-y-0.5">
                                <div className="text-[10px] text-gray-600 font-medium">
                                  {Math.floor(parseFloat(keyResult.currentValue || '0'))}/{Math.floor(parseFloat(keyResult.targetValue || '0'))}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Progress value={krProgress} className="flex-1 h-[3px]">
                                    <div
                                      className={cn('h-full transition-all', getProgressColor(krProgress))}
                                      style={{ width: `${krProgress}%` }}
                                    />
                                  </Progress>
                                  <span className="text-[10px] text-gray-500 w-7 text-right">{krProgress}%</span>
                                </div>
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.status && (
                            <TableCell className="py-0.5 px-2 border-r border-gray-100">
                              {editingCell?.id === keyResult.id && editingCell.field === 'status' ? (
                                <Select
                                  value={editValue}
                                  onValueChange={value => {
                                    setEditValue(value);
                                    updateKeyResultMutation.mutate({ id: keyResult.id, data: { status: value } });
                                    setEditingCell(null);
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Not Started">Not Started</SelectItem>
                                    <SelectItem value="On Track">On Track</SelectItem>
                                    <SelectItem value="At Risk">At Risk</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge
                                  className={cn(getStatusBadgeClass(keyResult.status), 'cursor-pointer whitespace-nowrap')}
                                  onClick={() => handleCellEdit(keyResult.id, 'status', 'keyResult', keyResult.status)}
                                >
                                  {keyResult.status}
                                </Badge>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="py-0.5 px-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                  <MoreVertical className="h-2.5 w-2.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openKeyResultPanel(keyResult.id, 'details')}>
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openKeyResultPanel(keyResult.id, 'tasks')}>
                                  <ListTodo className="h-4 w-4 mr-2" />
                                  Manage Tasks
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setLocation(`/strategy/tasks?keyResult=${keyResult.id}`)}>
                                  View Tasks
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => {
                                    setKeyResultToDelete(keyResult);
                                    setDeleteKeyResultDialogOpen(true);
                                  }}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        
                        {/* Tasks for this Key Result */}
                        {expandedKeyResults.has(keyResult.id) && (
                          <KeyResultTaskRows 
                            keyResultId={keyResult.id}
                            keyResult={keyResult}
                            visibleColumns={visibleColumns}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}

                    {/* No Key Results */}
                    {isExpanded && (!objective.keyResults || objective.keyResults.length === 0) && (
                      <TableRow>
                        <TableCell></TableCell>
                        <TableCell colSpan={6} className="pl-12 text-gray-500">
                          No key results defined
                          <Button
                            variant="link"
                            size="sm"
                            className="ml-2 h-auto p-0"
                            onClick={() => openCreateKeyResultDialog(objective.id)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add First Key Result
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
                </TableBody>
              </SortableContext>
            </DndContext>
          </Table>
        )}
        </div>
      </div>
      {/* Edit Panel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10">
              <Target className="h-4 w-4 text-orange-500" />
            </div>
            <div className="flex-1">
              <div className="text-foreground flex items-center gap-2 text-[14px] font-medium">
                {panelMode === 'create' ? 'Create New Objective' : selectedItem?.data.title || 'Edit Objective'}
                {panelMode === 'edit' && selectedItem?.data && (
                  <span className="font-normal text-muted-foreground text-[12px]">
                    {calculateProgress(selectedItem.data.currentValue, selectedItem.data.targetValue)}% Complete
                  </span>
                )}
              </div>
            </div>
          </div>
        }
        description={
          <div className="text-muted-foreground mt-1 text-[12px]">
            {panelMode === 'create' ? 'Define a new strategic objective for your organization' : 'Make changes to your objective and track progress'}
          </div>
        }
      >
        <div className="p-6">
          <Tabs 
            value={activeTab}
            onValueChange={setActiveTab}
            className="mt-6"
          >
            {/* Desktop tabs */}
            <TabsList className="items-center justify-center rounded-md bg-muted text-muted-foreground hidden sm:grid w-full grid-cols-3 h-auto p-1">
              <TabsTrigger value="details" className="justify-center whitespace-nowrap rounded-sm px-3 font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-2 py-2 text-[12px]">
                <Target className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="activity" className="justify-center whitespace-nowrap rounded-sm px-3 font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-2 py-2 text-[12px]">
                <ListTodo className="h-4 w-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="documents" className="justify-center whitespace-nowrap rounded-sm px-3 font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-2 py-2 text-[12px]">
                <FileText className="h-4 w-4" />
                Documents ({attachedDocuments.length})
              </TabsTrigger>
            </TabsList>

            {/* Mobile dropdown */}
            <div className="sm:hidden px-1 pb-3">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="details">
                    <div className="flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Details
                    </div>
                  </SelectItem>
                  <SelectItem value="activity">
                    <div className="flex items-center">
                      <ListTodo className="h-4 w-4 mr-2" />
                      Activity
                    </div>
                  </SelectItem>
                  <SelectItem value="documents">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Documents ({attachedDocuments.length})
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="details" className="space-y-6 mt-6">
              {/* Basic Information */}
              <div className="space-y-4">
                
                <div className="space-y-2">
                  <Input
                    id="title"
                    className="h-10"
                    value={selectedItem?.data.title || ''}
                    onChange={e => {
                      if (selectedItem) {
                        setSelectedItem({
                          ...selectedItem,
                          data: { ...selectedItem.data, title: e.target.value }
                        });
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Textarea
                    id="description"
                    className="min-h-[80px] resize-none"
                    value={selectedItem?.data.description || ''}
                    onChange={e => {
                      if (selectedItem) {
                        setSelectedItem({
                          ...selectedItem,
                          data: { ...selectedItem.data, description: e.target.value }
                        });
                      }
                    }}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="owner" className="text-sm font-medium">Owner</Label>
                    <Select
                      value={selectedItem?.data.ownerId?.toString() || ''}
                      onValueChange={value => {
                        if (selectedItem) {
                          setSelectedItem({
                            ...selectedItem,
                            data: { ...selectedItem.data, ownerId: parseInt(value) }
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select owner" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="team" className="text-sm font-medium">Team</Label>
                    <Select
                      value={selectedItem?.data.teamId?.toString() || 'none'}
                      onValueChange={value => {
                        if (selectedItem) {
                          setSelectedItem({
                            ...selectedItem,
                            data: { ...selectedItem.data, teamId: value === 'none' ? null : parseInt(value) }
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Team</SelectItem>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                    <Select
                      value={selectedItem?.data.status || ''}
                      onValueChange={value => {
                        if (selectedItem) {
                          setSelectedItem({
                            ...selectedItem,
                            data: { ...selectedItem.data, status: value }
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedItem?.type === 'objective' ? (
                          <>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="On Track">On Track</SelectItem>
                            <SelectItem value="At Risk">At Risk</SelectItem>
                            <SelectItem value="Off Track">Off Track</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Archived">Archived</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="Not Started">Not Started</SelectItem>
                            <SelectItem value="On Track">On Track</SelectItem>
                            <SelectItem value="At Risk">At Risk</SelectItem>
                            <SelectItem value="Stuck">Stuck</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Progress</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentValue" className="text-sm font-medium">Current Value</Label>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 px-3"
                        onClick={() => {
                          if (selectedItem) {
                            const current = parseFloat(selectedItem.data.currentValue || '0') - 1;
                            setSelectedItem({
                              ...selectedItem,
                              data: { ...selectedItem.data, currentValue: current.toString() }
                            });
                          }
                        }}
                      >
                        -
                      </Button>
                      <Input
                        id="currentValue"
                        className="h-10"
                        type="number"
                        value={selectedItem?.data.currentValue || '0'}
                        onChange={e => {
                          if (selectedItem) {
                            const value = e.target.value;
                            // Remove leading zeros by converting to number and back to string
                            const cleanValue = value === '' ? '0' : parseFloat(value || '0').toString();
                            setSelectedItem({
                              ...selectedItem,
                              data: { ...selectedItem.data, currentValue: cleanValue }
                            });
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 px-3"
                        onClick={() => {
                          if (selectedItem) {
                            const current = parseFloat(selectedItem.data.currentValue || '0') + 1;
                            setSelectedItem({
                              ...selectedItem,
                              data: { ...selectedItem.data, currentValue: current.toString() }
                            });
                          }
                        }}
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetValue" className="text-sm font-medium">Target Value</Label>
                    <Input
                      id="targetValue"
                      className="h-10"
                      type="number"
                      value={selectedItem?.data.targetValue || '0'}
                      onChange={e => {
                        if (selectedItem) {
                          const value = e.target.value;
                          // Remove leading zeros by converting to number and back to string
                          const cleanValue = value === '' ? '0' : parseFloat(value || '0').toString();
                          setSelectedItem({
                            ...selectedItem,
                            data: { ...selectedItem.data, targetValue: cleanValue }
                          });
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>
                      {calculateProgress(selectedItem?.data.currentValue, selectedItem?.data.targetValue)}%
                    </span>
                  </div>
                  <Progress
                    value={calculateProgress(selectedItem?.data.currentValue, selectedItem?.data.targetValue)}
                    className="h-2"
                  />
                </div>
              </div>

              {/* Key Results Section - Only for Objectives */}
              {panelMode === 'edit' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">Key Results</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-[12px] pl-[5px] pr-[5px]"
                      onClick={() => {
                        // Save current state and open new key result creation
                        const currentObjectiveId = selectedItem?.data.id;
                        if (currentObjectiveId) openCreateKeyResultDialog(currentObjectiveId);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Key Result
                    </Button>
                  </div>
                  
                  {selectedItem?.data?.keyResults && selectedItem.data.keyResults.length > 0 ? (
                    <div className="space-y-3">
                      {selectedItem?.data?.keyResults?.map((kr: KeyResult) => (
                        <div key={kr.id} className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-[14px]">{kr.title}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-muted-foreground text-[12px]">
                                  {kr.ownerName || kr.owner?.fullName || 'Unassigned'}
                                </span>
                                <Badge variant={kr.status === 'Completed' ? 'default' : 'secondary'} className="text-[10px] text-center">
                                  {kr.status}
                                </Badge>
                                <span className="text-muted-foreground text-[12px]">
                                  {calculateProgress(kr.currentValue, kr.targetValue)}% complete
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Open key result in edit mode
                                openKeyResultPanel(kr.id, 'details');
                              }}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <p className="text-muted-foreground">No key results defined</p>
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-3 h-auto p-0"
                        onClick={() => {
                          const currentObjectiveId = selectedItem?.data?.id;
                          if (currentObjectiveId) openCreateKeyResultDialog(currentObjectiveId);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Key Result
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-8 border-t">
                <Button variant="outline" size="default" onClick={() => setPanelOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (selectedItem) {
                      // Prepare data for saving
                      const dataToSave = {
                        ...selectedItem.data,
                      };
                      
                      // Convert values based on type
                      if (selectedItem.type === 'objective') {
                        // For objectives, convert to numbers
                        dataToSave.targetValue = selectedItem.data.targetValue ? parseFloat(selectedItem.data.targetValue) : undefined;
                        dataToSave.currentValue = selectedItem.data.currentValue ? parseFloat(selectedItem.data.currentValue) : undefined;
                      } else {
                        // For key results, keep as strings and ensure no leading zeros
                        dataToSave.targetValue = selectedItem.data.targetValue ? parseFloat(selectedItem.data.targetValue).toString() : undefined;
                        dataToSave.currentValue = selectedItem.data.currentValue ? parseFloat(selectedItem.data.currentValue).toString() : '0';
                      }
                      
                      if (panelMode === 'create') {
                        // Create new item
                        if (selectedItem.type === 'objective') {
                          await apiRequest('/api/strategy/objectives', {
                            method: 'POST',
                            body: dataToSave,
                          });
                        } else {
                          await apiRequest('/api/strategy/key-results', {
                            method: 'POST',
                            body: dataToSave,
                          });
                        }
                        queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
                        toast({ title: 'Success', description: `${selectedItem.type === 'objective' ? 'Objective' : 'Key Result'} created successfully` });
                      } else {
                        // Update existing item
                        if (selectedItem.type === 'objective') {
                          await updateObjectiveMutation.mutateAsync({
                            id: selectedItem.data.id,
                            data: dataToSave
                          });
                        } else {
                          await updateKeyResultMutation.mutateAsync({
                            id: selectedItem.data.id,
                            data: dataToSave
                          });
                        }
                      }
                      setPanelOpen(false);
                      setSelectedItem(null);
                      setPanelMode('edit');
                    }
                  }}
                >
                  {panelMode === 'create' ? 'Create' : 'Save Changes'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <h3 className="font-medium text-[14px]">Activity Log</h3>
              {activityLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No activity recorded yet
                </div>
              ) : (
                <div className="space-y-3">
                  {activityLogs.map(log => (
                    <div key={log.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{log.userName}</p>
                          <p className="text-sm text-gray-600">{log.description}</p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Knowledge Base Documents</h3>
                    <p className="text-muted-foreground mt-1 text-[12px]">
                      Attach relevant documents to provide context and resources for this objective.
                    </p>
                  </div>
                  {selectedItem?.data.id && selectedItem.type === 'objective' && (
                    <DocumentAttachmentButton
                      entityType="objective"
                      entityId={selectedItem.data.id}
                      entityTitle={selectedItem?.data.title}
                      buttonVariant="outline"
                      buttonSize="sm"
                      showLabel={true}
                      attachedDocuments={attachedDocuments}
                      onDocumentsAttached={refetchAttachedDocuments}
                    />
                  )}
                </div>
                
                {selectedItem?.data.id && selectedItem.type === 'objective' && (
                  attachedDocuments.length > 0 ? (
                    <AttachedDocumentsList
                      entityType="objective"
                      entityId={selectedItem.data.id}
                      attachedDocuments={attachedDocuments}
                      onDocumentDetached={refetchAttachedDocuments}
                      showActions={true}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm">No documents attached yet.</p>
                      <p className="text-xs mt-1">
                        Attach knowledge base documents to provide context and resources.
                      </p>
                    </div>
                  )
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SlidePanel>
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
      {/* Key Result Task Detail Panel */}
      <KeyResultTaskDetailPanel
        task={selectedKrTask}
        open={krTaskPanelOpen}
        onClose={() => {
          setKrTaskPanelOpen(false);
          setSelectedKrTask(null);
        }}
        keyResultId={selectedKrTask?.keyResultId || taskKeyResultId}
      />
      {/* Work Item Panel */}
      <WorkItemPanel
        isOpen={taskPanelOpen}
        onClose={closeTaskPanel}
        mode="edit"
        workItem={selectedTask}
        workItemId={selectedWorkItemId ?? undefined}
        onOpenKeyResult={(keyResultId) => openKeyResultPanel(keyResultId, 'details')}
      />
      {/* Create Objective Dialog */}
      <CreateObjectiveDialog
        open={createObjectiveOpen}
        onOpenChange={setCreateObjectiveOpen}
      />
      {/* Create Key Result Dialog */}
      {selectedObjectiveForKeyResult && (
        <CreateKeyResultDialog
          objectiveId={selectedObjectiveForKeyResult}
          objectiveTitle={objectives.find(o => o.id === selectedObjectiveForKeyResult)?.title || ''}
          open={createKeyResultOpen}
          onOpenChange={setCreateKeyResultOpen}
        />
      )}
      {/* Delete Objective Dialog */}
      {objectiveToDelete && (
        <DeleteObjectiveDialog
          objective={objectiveToDelete}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={() => {
            if (objectiveToDelete) {
              deleteObjectiveMutation.mutate(objectiveToDelete.id);
            }
          }}
          isDeleting={deleteObjectiveMutation.isPending}
        />
      )}
      {/* Delete Key Result Dialog */}
      {keyResultToDelete && (
        <DeleteKeyResultDialog
          keyResult={keyResultToDelete}
          open={deleteKeyResultDialogOpen}
          onOpenChange={setDeleteKeyResultDialogOpen}
          onConfirm={() => {
            if (keyResultToDelete) {
              deleteKeyResultMutation.mutate(keyResultToDelete.id);
            }
          }}
          isDeleting={deleteKeyResultMutation.isPending}
        />
      )}
    </div>
  );
}