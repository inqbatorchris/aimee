import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Calendar, 
  User, 
  Link2, 
  Unlink, 
  Search, 
  MessageSquare, 
  ExternalLink,
  ListTodo,
  MoreVertical,
  Edit2,
  FileText,
  MessageSquare as CommentsIcon,
  Send,
  GitBranch,
  X,
  Paperclip
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { AttachedDocumentsList } from '@/components/KnowledgeBase/AttachedDocumentsList';
import { DocumentAttachmentButton } from '@/components/KnowledgeBase/DocumentAttachmentButton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  WorkItem,
  CheckInCycle,
  User as UserType,
  createWorkItem,
  updateWorkItem,
  fetchCheckInCycles,
  fetchActiveUsers,
  searchKeyResultTasks,
} from '@/lib/workItems.api';
import { WorkflowExecutionPanel } from '@/components/work-items/WorkflowExecutionPanel';
import { DraftResponsePanel } from '@/components/work-items/DraftResponsePanel';
import { CustomerContextPanel } from '@/components/work-items/CustomerContextPanel';

interface WorkItemPanelProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'view' | 'edit';
  workItemId?: number;
  workItem?: WorkItem;
  onOpenKeyResult?: (keyResultId: number) => void;
  initialData?: {
    workflowTemplateId?: string;
    workItemType?: string;
    workflowSource?: string;
    workflowMetadata?: Record<string, any>;
  };
}

const STATUS_OPTIONS = [
  { value: 'Planning', label: 'Planning', color: 'bg-gray-100 text-gray-700' },
  { value: 'Ready', label: 'Ready', color: 'bg-blue-100 text-blue-700' },
  { value: 'In Progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'Stuck', label: 'Stuck', color: 'bg-red-100 text-red-700' },
  { value: 'Completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
  { value: 'Archived', label: 'Archived', color: 'bg-gray-100 text-gray-500' },
];

export default function WorkItemPanel({
  isOpen,
  onClose,
  mode: initialMode,
  workItemId,
  workItem: initialWorkItem,
  onOpenKeyResult,
  initialData,
}: WorkItemPanelProps) {
  const isMobile = useIsMobile();
  
  // Default to 'edit' mode for existing items, 'create' for new items
  const [mode, setMode] = useState(
    initialMode === 'create' ? 'create' : (workItemId || initialWorkItem) ? 'edit' : initialMode
  );
  const [activeTab, setActiveTab] = useState('details');
  
  // Sync mode with initialMode prop when it changes
  useEffect(() => {
    if (initialMode === 'create') {
      setMode('create');
    } else if (workItemId || initialWorkItem) {
      setMode('edit');
    } else {
      setMode(initialMode);
    }
  }, [initialMode, workItemId, initialWorkItem]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Planning' as WorkItem['status'],
    dueDate: '',
    assignedTo: undefined as number | undefined,
    checkInCycleId: undefined as number | undefined,
    targetMeetingId: undefined as number | undefined,
    keyResultTaskId: undefined as number | undefined,
    attachments: [] as any[],
    teamId: undefined as number | undefined,
    workflowTemplateId: undefined as string | undefined,
    workItemType: undefined as string | undefined,
    workflowSource: undefined as string | undefined,
    workflowMetadata: undefined as Record<string, any> | undefined,
  });
  const [krTaskSearch, setKrTaskSearch] = useState('');
  const [showKrTaskDialog, setShowKrTaskDialog] = useState(false);
  const [selectedKrTask, setSelectedKrTask] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Activity state
  const [activities, setActivities] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingActivityLogs, setLoadingActivityLogs] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Fetch activities/comments for the work item
  const fetchActivities = async () => {
    if (!workItemId) return;
    
    setLoadingActivities(true);
    try {
      let comments = [];
      
      // Fetch comments from API
      const response = await apiRequest(`/api/work-items/${workItemId}/comments`);
      const data = await response.json();
      comments = data?.comments || [];
      
      // Transform comments to activities format
      const transformedActivities = comments.map((c: any) => ({
        type: 'comment',
        ...c
      }));
      
      setActivities(transformedActivities);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingActivities(false);
    }
  };

  // Fetch activity logs for the work item
  const fetchActivityLogs = async () => {
    if (!workItemId) return;
    
    setLoadingActivityLogs(true);
    try {
      const response = await apiRequest(`/api/work-items/${workItemId}/activity`);
      const data = await response.json();
      setActivityLogs(data?.activities || []);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activity logs. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingActivityLogs(false);
    }
  };
  
  // Fetch activities and activity logs when work item changes
  useEffect(() => {
    if (workItemId && isOpen) {
      fetchActivities();
      fetchActivityLogs();
    }
  }, [workItemId, isOpen]);
  
  // Submit comment mutation
  const submitCommentMutation = useMutation({
    mutationFn: async () => {
      if (!workItemId || !newComment.trim()) return;
      
      return apiRequest(`/api/work-items/${workItemId}/activity`, {
        method: 'POST',
        body: {
          actionType: 'comment',
          description: newComment,
        },
      });
    },
    onSuccess: () => {
      toast({ description: 'Comment added' });
      setNewComment('');
      fetchActivities();
      fetchActivityLogs();
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      queryClient.invalidateQueries({ queryKey: [`/api/work-items?targetMeetingId`] });
    },
    onError: () => {
      toast({
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    },
  });
  
  // Fetch check-in cycles
  const { data: cycles = [] } = useQuery<CheckInCycle[]>({
    queryKey: ['/api/work-items/check-in-cycles'],
    queryFn: () => fetchCheckInCycles(['Planning', 'In Progress']),
    enabled: isOpen,
  });
  
  // Fetch check-in meetings - filtered by team
  const { data: meetings = [] } = useQuery<any[]>({
    queryKey: ['/api/strategy/check-in-meetings', 'upcoming', formData.teamId],
    queryFn: async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const params = new URLSearchParams();
      params.append('start', start.toISOString());
      params.append('end', end.toISOString());
      
      if (formData.teamId) {
        params.append('teamId', formData.teamId.toString());
      }
      
      const response = await fetch(`/api/strategy/check-in-meetings?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch meetings');
      const allMeetings = await response.json();
      
      const filteredMeetings = allMeetings.filter((meeting: any) => 
        meeting.status === 'Planned' || meeting.status === 'In Progress'
      );
      
      if (!formData.teamId) {
        return filteredMeetings;
      }
      
      return filteredMeetings.filter((meeting: any) => 
        meeting.teamId === formData.teamId
      );
    },
    enabled: isOpen,
  });
  
  // Fetch work item's own documents
  const { data: workItemDocs = [] } = useQuery<any[]>({
    queryKey: [`/api/knowledge-base/attachments/workItem/${workItemId}`],
    enabled: !!workItemId && isOpen,
    select: (data: any) => {
      return Array.isArray(data) ? data : []
    }
  });

  // Fetch inherited documents from Key Result Task
  const { data: inheritedDocs = [] } = useQuery<any[]>({
    queryKey: [`/api/work-items/${workItemId}/inherited-documents`],
    enabled: !!workItemId && isOpen,
    select: (data: any) => {
      return Array.isArray(data) ? data : (data && data.inheritedDocuments) || []
    }
  });

  // Fetch specific meeting if targetMeetingId exists but isn't in the regular meetings list
  const { data: targetMeeting } = useQuery<any>({
    queryKey: ['/api/strategy/check-in-meetings', formData.targetMeetingId],
    queryFn: async () => {
      const response = await fetch(`/api/strategy/check-in-meetings/${formData.targetMeetingId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch meeting');
      }
      return response.json();
    },
    enabled: isOpen && !!formData.targetMeetingId && !meetings.find(m => m.id === formData.targetMeetingId),
  });
  
  // Fetch users
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ['/api/work-items/users'],
    queryFn: fetchActiveUsers,
    enabled: isOpen,
  });
  
  // Fetch teams for team selection
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
    enabled: isOpen,
  });

  // Fetch workflow templates for work item creation
  const { data: workflowTemplates = [] } = useQuery<any[]>({
    queryKey: ['/api/workflows/templates'],
    enabled: isOpen && mode === 'create',
  });
  
  // Fetch work item data when workItemId is provided but initialWorkItem is not
  const { data: fetchedWorkItem } = useQuery<WorkItem>({
    queryKey: ['/api/work-items', workItemId],
    queryFn: async () => {
      const response = await apiRequest(`/api/work-items/${workItemId}`);
      return response.json();
    },
    enabled: !!workItemId && !initialWorkItem && isOpen,
  });

  // Fetch KR tasks for linking
  const { data: krTasks = [], refetch: refetchKrTasks } = useQuery<any[]>({
    queryKey: ['/api/strategy/key-result-tasks', krTaskSearch],
    queryFn: async () => {
      const response = await fetch('/api/strategy/key-result-tasks', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch KR tasks');
      const tasks = await response.json();
      if (krTaskSearch) {
        return tasks.filter((task: any) => 
          task.title.toLowerCase().includes(krTaskSearch.toLowerCase())
        );
      }
      return tasks;
    },
    enabled: showKrTaskDialog,
  });

  // Get current work item for workflow template fetch
  const currentWorkItem = initialWorkItem || fetchedWorkItem;
  console.log('[WorkItemPanel] currentWorkItem:', currentWorkItem);
  console.log('[WorkItemPanel] currentWorkItem.workflowTemplateId:', currentWorkItem?.workflowTemplateId);

  // Fetch workflow template if work item has one
  const { data: workflowTemplate } = useQuery<any>({
    queryKey: ['/api/workflows/templates', currentWorkItem?.workflowTemplateId],
    queryFn: async () => {
      const response = await apiRequest(`/api/workflows/templates/${currentWorkItem?.workflowTemplateId}`);
      return response.json();
    },
    enabled: !!currentWorkItem?.workflowTemplateId && isOpen,
  });
  
  // Initialize form data when work item changes
  useEffect(() => {
    const workItem = initialWorkItem || fetchedWorkItem;
    
    if (workItem && (mode === 'view' || mode === 'edit')) {
      setFormData({
        title: workItem.title,
        description: workItem.description || '',
        status: workItem.status,
        dueDate: workItem.dueDate || '',
        assignedTo: workItem.assignedTo || undefined,
        checkInCycleId: workItem.checkInCycleId || undefined,
        targetMeetingId: workItem.targetMeetingId || undefined,
        keyResultTaskId: workItem.keyResultTaskId || undefined,
        attachments: workItem.attachments || [],
        teamId: workItem.teamId || undefined,
        workflowTemplateId: workItem.workflowTemplateId || undefined,
        workItemType: workItem.workItemType || undefined,
        workflowSource: workItem.workflowSource || undefined,
        workflowMetadata: workItem.workflowMetadata || undefined,
      });
      setSelectedKrTask(workItem.keyResultTask || null);
    } else if (mode === 'create') {
      setFormData({
        title: '',
        description: '',
        status: 'Planning',
        dueDate: '',
        assignedTo: undefined,
        checkInCycleId: undefined,
        targetMeetingId: undefined,
        keyResultTaskId: undefined,
        attachments: [],
        teamId: undefined,
        workflowTemplateId: initialData?.workflowTemplateId || undefined,
        workItemType: initialData?.workItemType || undefined,
        workflowSource: initialData?.workflowSource || undefined,
        workflowMetadata: initialData?.workflowMetadata || undefined,
      });
      setSelectedKrTask(null);
    }
  }, [initialWorkItem, fetchedWorkItem, mode, initialData]);
  
  // Automatically switch to workflow tab when opening a work item with a template
  // Only run this on initial open, not on data refreshes
  useEffect(() => {
    if (!isOpen) return; // Don't run when closing
    
    if (mode === 'create') {
      setActiveTab('details');
    } else {
      const workItem = initialWorkItem || fetchedWorkItem;
      // Only auto-switch if we have a workflow and we're not already on a specific tab
      if (workItem?.workflowTemplateId && activeTab === 'details') {
        setActiveTab('workflow');
      } else if (!workItem?.workflowTemplateId && activeTab === 'workflow') {
        // If workflow was removed, switch away from workflow tab
        setActiveTab('details');
      }
    }
  }, [isOpen, mode, workItemId]); // Remove initialWorkItem and fetchedWorkItem from deps
  
  // Clear targetMeetingId when team changes if the meeting doesn't belong to the new team
  useEffect(() => {
    if (formData.targetMeetingId && formData.teamId && targetMeeting) {
      const meetingBelongsToTeam = targetMeeting.teamId === formData.teamId;
      
      if (!meetingBelongsToTeam) {
        setFormData(prev => ({ ...prev, targetMeetingId: undefined }));
        if (mode === 'edit') {
          toast({
            title: 'Meeting Assignment Cleared',
            description: 'The previously selected meeting doesn\'t belong to the new team.',
          });
        }
      }
    }
  }, [formData.teamId, targetMeeting, formData.targetMeetingId, mode, toast]);
  
  // Create mutation
  const createMutation = useMutation({
    mutationFn: createWorkItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      if (formData.targetMeetingId === undefined) {
        queryClient.invalidateQueries({ queryKey: ['/api/work-items', 'backlog'] });
      }
      if (formData.targetMeetingId) {
        queryClient.invalidateQueries({ queryKey: ['/api/work-items', 'check-ins'] });
        queryClient.invalidateQueries({ queryKey: [`/api/work-items?targetMeetingId=${formData.targetMeetingId}`] });
      }
      if (formData.teamId) {
        queryClient.invalidateQueries({ queryKey: [`/api/work-items?teamId=${formData.teamId}`] });
      }
      toast({
        title: 'Success',
        description: 'Work item created successfully',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create work item',
        variant: 'destructive',
      });
    },
  });
  
  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return updateWorkItem(id, data);
    },
    onSuccess: async () => {
      // Web version - always online, invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      if (formData.targetMeetingId === undefined) {
        queryClient.invalidateQueries({ queryKey: ['/api/work-items', 'backlog'] });
      }
      if (formData.targetMeetingId) {
        queryClient.invalidateQueries({ queryKey: ['/api/work-items', 'check-ins'] });
        queryClient.invalidateQueries({ queryKey: [`/api/work-items?targetMeetingId=${formData.targetMeetingId}`] });
      }
      if (formData.teamId) {
        queryClient.invalidateQueries({ queryKey: [`/api/work-items?teamId=${formData.teamId}`] });
      }
      if (initialWorkItem?.targetMeetingId) {
        queryClient.invalidateQueries({ queryKey: [`/api/work-items?targetMeetingId=${initialWorkItem.targetMeetingId}`] });
      }
      
      // Invalidate Key Result Task queries with the correct query key pattern
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/key-result-tasks'] });
      
      // Get keyResultId by fetching the fresh work item data (only when online)
      if (workItemId) {
        try {
          const response = await apiRequest(`/api/work-items/${workItemId}`);
          const freshWorkItem = await response.json();
          
          if (freshWorkItem?.keyResultTask?.keyResultId) {
            queryClient.invalidateQueries({ 
              queryKey: [`/api/strategy/key-results/${freshWorkItem.keyResultTask.keyResultId}/tasks`] 
            });
          }
        } catch (error) {
          console.error('Failed to fetch work item for invalidation:', error);
        }
      }
      
      // Refresh activity logs to show the updates
      if (workItemId) {
        fetchActivityLogs();
      }
      
      toast({
        title: 'Success',
        description: 'Work item updated successfully',
      });
      
      if (onClose) {
        onClose();
      } else {
        setMode('view');
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update work item',
        variant: 'destructive',
      });
    },
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!workItemId) throw new Error('No work item ID');
      return apiRequest(`/api/work-items/${workItemId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      if (formData.targetMeetingId) {
        queryClient.invalidateQueries({ queryKey: [`/api/work-items?targetMeetingId=${formData.targetMeetingId}`] });
      }
      if (formData.teamId) {
        queryClient.invalidateQueries({ queryKey: [`/api/work-items?teamId=${formData.teamId}`] });
      }
      toast({
        title: 'Success',
        description: 'Work item deleted successfully',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete work item',
        variant: 'destructive',
      });
    },
  });
  
  // Refetch documents when attachment changes
  const refetchAttachedDocuments = () => {
    queryClient.invalidateQueries({ 
      queryKey: [`/api/knowledge-base/attachments/workItem/${workItemId}`] 
    });
  };
  
  const handleSave = () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Title is required',
        variant: 'destructive',
      });
      return;
    }
    
    if (mode === 'create') {
      const payload = {
        ...formData,
        dueDate: formData.dueDate || undefined,
        workflowTemplateId: formData.workflowTemplateId,
        workItemType: formData.workItemType,
        workflowSource: formData.workflowSource,
        workflowMetadata: formData.workflowMetadata,
      };
      createMutation.mutate(payload);
    } else if (mode === 'edit' && workItemId) {
      updateMutation.mutate({
        id: workItemId,
        data: {
          ...formData,
          dueDate: formData.dueDate || undefined,
        },
      });
    }
  };
  
  const handleQuickStatusChange = (newStatus: WorkItem['status']) => {
    if (workItemId) {
      updateMutation.mutate({
        id: workItemId,
        data: { status: newStatus },
      });
    }
  };
  
  const handleLinkKrTask = async () => {
    setShowKrTaskDialog(true);
  };
  
  const handleSelectKrTask = (task: any) => {
    setSelectedKrTask(task);
    setFormData({
      ...formData,
      keyResultTaskId: task.id,
    });
    setShowKrTaskDialog(false);
  };
  
  const handleUnlink = () => {
    setSelectedKrTask(null);
    setFormData({
      ...formData,
      keyResultTaskId: undefined,
    });
  };

  const handleKrClick = async () => {
    const krTaskId = initialWorkItem?.keyResultTaskId || formData.keyResultTaskId;
    
    if (krTaskId) {
      try {
        const response = await apiRequest(`/api/strategy/key-result-tasks/${krTaskId}`);
        const taskData = await response.json();
        
        if (taskData.keyResultId && onOpenKeyResult) {
          onOpenKeyResult(taskData.keyResultId);
        } else {
          toast({
            title: 'Key Result Not Found',
            description: 'Unable to find the linked Key Result',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching Key Result Task:', error);
        toast({
          title: 'Error',
          description: 'Failed to load Key Result details',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'No Key Result',
        description: 'No Key Result is linked to this work item',
        variant: 'destructive',
      });
    }
  };
  
  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return option ? option.color : 'bg-gray-100 text-gray-700';
  };
  
  const getOriginLabel = () => {
    const currentWorkItem = initialWorkItem || fetchedWorkItem;
    
    if (selectedKrTask) {
      return `${selectedKrTask.title}`;
    }
    if (formData.keyResultTaskId || currentWorkItem?.keyResultTask) {
      return `${currentWorkItem?.keyResultTask?.title || 'Linked to Key Result Task'}`;
    }
    return 'One-time task';
  };
  
  const isViewMode = mode === 'view';
  
  // Calculate completion percentage (for display purposes)
  const completionPercentage = formData.status === 'Completed' ? 100 : 
                                formData.status === 'In Progress' ? 50 : 0;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:w-[640px] sm:max-w-none p-0 flex flex-col !z-[220]"
          overlayClassName="!z-[220]"
          hideCloseButton={true}
          data-testid="work-item-panel"
        >
          {/* Header - Compressed for mobile */}
          <SheetHeader className="px-3 sm:px-6 py-2 sm:py-4 border-b space-y-0">
            <div className="flex items-start gap-2 sm:gap-3">
              {/* Icon Circle - Smaller on mobile */}
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-500/10 flex-shrink-0">
                <ListTodo className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              </div>
              
              {/* Title and Status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                  <SheetTitle className="text-sm sm:text-base font-semibold truncate">
                    {mode === 'create' ? 'New Work Item' : formData.title || 'Work Item'}
                  </SheetTitle>
                  <Badge className={`${getStatusBadge(formData.status)} text-[10px] sm:text-xs px-1.5 sm:px-2 flex-shrink-0`}>
                    {formData.status}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-xs sm:text-[14px] text-left">
                  {completionPercentage}% Complete
                </div>
              </div>
              
              {/* Action Buttons - Compact for mobile */}
              <div className="flex gap-1">
                {/* Close Button - Smaller on mobile */}
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    data-testid="work-item-close-button"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </SheetClose>

                {/* Menu Button (only in edit/view mode) - Smaller on mobile */}
                {mode !== 'create' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 sm:h-8 sm:w-8"
                        data-testid="work-item-menu-button"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => setShowDeleteDialog(true)}
                        data-testid="menu-item-delete"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            {/* Mobile Tab Selector */}
            <div className="md:hidden border-b px-4 py-2">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="details">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Details
                    </div>
                  </SelectItem>
                  <SelectItem value="comments">
                    <div className="flex items-center gap-2">
                      <CommentsIcon className="h-4 w-4" />
                      Comments
                    </div>
                  </SelectItem>
                  <SelectItem value="activity">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Activity
                    </div>
                  </SelectItem>
                  <SelectItem value="documents">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents
                      {(workItemDocs.length + inheritedDocs.length) > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({workItemDocs.length + inheritedDocs.length})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                  {formData.workItemType === 'support_ticket' && workItemId && (
                    <SelectItem value="draft">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Draft Response
                      </div>
                    </SelectItem>
                  )}
                  {formData.workItemType === 'support_ticket' && workItemId && (currentWorkItem as any)?.sourceTicket?.customer_id && (
                    <SelectItem value="customer">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Customer
                      </div>
                    </SelectItem>
                  )}
                  {currentWorkItem?.workflowTemplateId && (
                    <SelectItem value="workflow">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4" />
                        Workflow
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Desktop Horizontal Tabs */}
            <TabsList className="hidden md:flex w-full justify-start rounded-none border-b h-12 px-6">
              <TabsTrigger value="details" className="gap-2" data-testid="tab-details">
                <FileText className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-2" data-testid="tab-comments">
                <CommentsIcon className="h-4 w-4" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2" data-testid="tab-activity">
                <FileText className="h-4 w-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2" data-testid="tab-documents">
                <FileText className="h-4 w-4" />
                Documents
                {(workItemDocs.length + inheritedDocs.length) > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({workItemDocs.length + inheritedDocs.length})
                  </span>
                )}
              </TabsTrigger>
              {formData.workItemType === 'support_ticket' && workItemId && (
                <TabsTrigger value="draft" className="gap-2" data-testid="tab-draft">
                  <MessageSquare className="h-4 w-4" />
                  Draft Response
                </TabsTrigger>
              )}
              {formData.workItemType === 'support_ticket' && workItemId && (currentWorkItem as any)?.sourceTicket?.customer_id && (
                <TabsTrigger value="customer" className="gap-2" data-testid="tab-customer">
                  <User className="h-4 w-4" />
                  Customer
                </TabsTrigger>
              )}
              {currentWorkItem?.workflowTemplateId && (
                <TabsTrigger value="workflow" className="gap-2" data-testid="tab-workflow">
                  <GitBranch className="h-4 w-4" />
                  Workflow
                </TabsTrigger>
              )}
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="flex-1 overflow-y-auto m-0 p-6 space-y-6" data-testid="work-item-details-tab">
              {/* Task Type Badge */}
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{getOriginLabel()}</span>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Work item title"
                  className="text-base"
                  data-testid="input-title"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add description..."
                  rows={4}
                  className="resize-none"
                  data-testid="textarea-description"
                />
              </div>

              {/* Workflow Template (create mode only) */}
              {mode === 'create' && workflowTemplates.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="workflowTemplate" className="text-sm font-medium">
                    Workflow Template (Optional)
                  </Label>
                  <Select
                    value={formData.workflowTemplateId || "none"}
                    onValueChange={(value) => {
                      if (value === "none") {
                        setFormData({ 
                          ...formData, 
                          workflowTemplateId: undefined,
                          workItemType: undefined,
                          workflowSource: undefined,
                          workflowMetadata: undefined,
                        });
                      } else {
                        const template = workflowTemplates.find((t: any) => t.id === value);
                        setFormData({ 
                          ...formData, 
                          workflowTemplateId: value,
                          workItemType: value,
                          workflowSource: 'manual',
                          workflowMetadata: {
                            templateName: template?.name,
                            category: template?.category,
                          },
                        });
                      }
                    }}
                  >
                    <SelectTrigger id="workflowTemplate" data-testid="select-workflow-template">
                      <SelectValue placeholder="No workflow" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No workflow</SelectItem>
                      {workflowTemplates.map((template: any) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.workflowTemplateId && (
                    <p className="text-xs text-muted-foreground">
                      This work item will use a {workflowTemplates.find((t: any) => t.id === formData.workflowTemplateId)?.steps?.length || 0}-step workflow
                    </p>
                  )}
                </div>
              )}

              <Separator />

              {/* Assignment Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status */}
                <div className="space-y-2">
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as WorkItem['status'] })}
                  >
                    <SelectTrigger id="status" data-testid="select-status">
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
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    data-testid="input-due-date"
                  />
                </div>

                {/* Team */}
                <div className="space-y-2">
                  <Select
                    value={formData.teamId?.toString() || "none"}
                    onValueChange={(value) => setFormData({ ...formData, teamId: value === "none" ? undefined : parseInt(value) })}
                  >
                    <SelectTrigger id="teamId" data-testid="select-team">
                      <SelectValue placeholder="Select team" />
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
                </div>

                {/* Assignee */}
                <div className="space-y-2">
                  <Select
                    value={formData.assignedTo?.toString() || "unassigned"}
                    onValueChange={(value) => setFormData({ ...formData, assignedTo: value === "unassigned" ? undefined : parseInt(value) })}
                  >
                    <SelectTrigger id="assignedTo" data-testid="select-assignee">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Target Meeting */}
              <div className="space-y-2">
                <Select
                  value={formData.targetMeetingId?.toString() || "backlog"}
                  onValueChange={(value) => setFormData({ ...formData, targetMeetingId: value === "backlog" ? undefined : parseInt(value) })}
                >
                  <SelectTrigger id="targetMeetingId" data-testid="select-target-meeting">
                    <SelectValue placeholder="Select meeting (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Backlog (no meeting)</SelectItem>
                    {meetings.map((meeting) => (
                      <SelectItem key={meeting.id} value={meeting.id.toString()}>
                        {format(new Date(meeting.scheduledDate), 'MMM d')} - {meeting.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Key Result Link */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {selectedKrTask || formData.keyResultTaskId ? (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1 justify-start"
                        onClick={handleKrClick}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {getOriginLabel()}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleUnlink}
                        data-testid="button-unlink-kr"
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleLinkKrTask}
                      data-testid="button-link-kr"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Link to Key Result Task
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="flex-1 flex flex-col m-0 min-h-0" data-testid="work-item-comments-tab">
              <ScrollArea className="flex-1 px-6 py-4">
                {/* Comments Feed */}
                {loadingActivities ? (
                  <div className="text-center py-8 text-muted-foreground">Loading comments...</div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No comments yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity, index) => (
                      <div key={index} className="flex gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {activity.userName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-medium text-sm">{activity.userName || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">
                              {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                            {activity.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              
              {/* Comment Input */}
              {mode !== 'create' && workItemId && (
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={2}
                      className="flex-1 resize-none"
                      data-testid="textarea-new-comment"
                    />
                    <Button
                      onClick={() => submitCommentMutation.mutate()}
                      disabled={!newComment.trim() || submitCommentMutation.isPending}
                      size="icon"
                      className="self-end"
                      data-testid="button-submit-comment"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="flex-1 overflow-y-auto m-0 p-6" data-testid="work-item-activity-tab">
              <ScrollArea className="h-full">
                {loadingActivityLogs ? (
                  <div className="text-center py-8 text-muted-foreground">Loading activity...</div>
                ) : activityLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No activity logs yet</p>
                    <p className="text-xs mt-2">Work item creation, updates, and changes will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activityLogs.map((log, index) => (
                      <div key={index} className="flex gap-3 pb-4 border-b last:border-0">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {log.userName?.split(' ').map((n: string) => n[0]).join('') || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-medium text-sm">{log.userName || 'System'}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {log.actionType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {log.createdAt ? format(new Date(log.createdAt), 'MMM d, yyyy HH:mm') : ''}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                            {log.description}
                          </p>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs">
                              <pre className="whitespace-pre-wrap text-muted-foreground">{JSON.stringify(log.metadata, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="flex-1 flex flex-col m-0 min-h-0" data-testid="work-item-documents-tab">
              {workItemId ? (
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6">
                    {/* Direct Attachments Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-medium">Direct Attachments</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Documents attached directly to this work item
                          </p>
                        </div>
                        <DocumentAttachmentButton
                          entityType="workItem"
                          entityId={workItemId}
                          entityTitle={currentWorkItem?.title}
                          buttonVariant="outline"
                          buttonSize="sm"
                          showLabel={true}
                          attachedDocuments={workItemDocs}
                          onDocumentsAttached={refetchAttachedDocuments}
                        />
                      </div>
                      {workItemDocs.length > 0 ? (
                        <AttachedDocumentsList
                          entityType="workItem"
                          entityId={workItemId}
                          attachedDocuments={workItemDocs}
                          onDocumentDetached={refetchAttachedDocuments}
                          showActions={true}
                          showAttachButton={false}
                        />
                      ) : (
                        <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/50">
                          <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="text-sm">No direct attachments</p>
                          <p className="text-xs mt-1">
                            Use the Documents button above to attach knowledge base documents
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Inherited Documents Section */}
                    {inheritedDocs.length > 0 && (
                      <div>
                        <div className="mb-4">
                          <h3 className="text-sm font-medium">Inherited Documents</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Documents inherited from linked objective, key result, or task
                          </p>
                        </div>
                        <AttachedDocumentsList
                          entityType="workItem"
                          entityId={workItemId}
                          attachedDocuments={inheritedDocs}
                          showActions={false}
                          showAttachButton={false}
                          compact={true}
                        />
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Save the work item to attach documents</p>
                </div>
              )}
            </TabsContent>

            {/* Draft Response Tab */}
            {formData.workItemType === 'support_ticket' && workItemId && (
              <TabsContent value="draft" className="flex-1 overflow-y-auto m-0 p-6" data-testid="work-item-draft-tab">
                <DraftResponsePanel
                  workItemId={workItemId}
                  workItemType={formData.workItemType}
                />
              </TabsContent>
            )}

            {/* Customer Context Tab */}
            {formData.workItemType === 'support_ticket' && workItemId && (currentWorkItem as any)?.sourceTicket?.customer_id && (
              <TabsContent value="customer" className="flex-1 overflow-y-auto m-0" data-testid="work-item-customer-tab">
                <CustomerContextPanel
                  workItem={currentWorkItem}
                  onGenerateBookingLink={() => {
                    // TODO: Implement booking link generation
                    console.log('Generate booking link');
                  }}
                />
              </TabsContent>
            )}

            {/* Workflow Tab */}
            {currentWorkItem?.workflowTemplateId && workItemId && (
              <TabsContent value="workflow" className="flex-1 overflow-y-auto m-0 p-6" data-testid="work-item-workflow-tab">
                <WorkflowExecutionPanel
                  key={`workflow-${workItemId}`}
                  workItemId={workItemId}
                  onClose={() => setActiveTab('details')}
                />
              </TabsContent>
            )}
          </Tabs>

          {/* Footer with Save Button */}
          <div className="border-t p-6">
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="w-full bg-[#FF6B35] hover:bg-[#FF5722] text-white"
              size="lg"
              data-testid="button-save-changes"
            >
              {createMutation.isPending || updateMutation.isPending 
                ? 'Saving...' 
                : 'Save Changes'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      {/* KR Task Selection Dialog */}
      <Dialog open={showKrTaskDialog} onOpenChange={setShowKrTaskDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Link to Key Result Task</DialogTitle>
            <DialogDescription>
              Select a Key Result task to link this work item to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={krTaskSearch}
                onChange={(e) => setKrTaskSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {krTasks.map((task) => (
                  <Button
                    key={task.id}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => handleSelectKrTask(task)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {task.keyResult?.title} • {task.keyResult?.objective?.title}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Work Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this work item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteMutation.isPending}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteMutation.mutate();
                setShowDeleteDialog(false);
              }}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
