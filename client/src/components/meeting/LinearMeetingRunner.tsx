import React, { useState, useEffect, useRef, useMemo, KeyboardEvent } from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// MobileWorkItemCard removed - using compact row layout instead
import WorkItemPanel from '../work-items/WorkItemPanel';
import { ModernDocumentEditor } from '../DocumentEditor/ModernDocumentEditor';
import { KeyResultDetailPanel } from '@/components/key-result-detail/KeyResultDetailPanel';
import { cn } from '@/lib/utils';
// Chart imports for KPI visualization
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
// Feedback form removed - feedback is collected separately via the feedback page
import {
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Target,
  User,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Calendar,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Edit2
} from 'lucide-react';

interface LinearMeetingRunnerProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: any;
  workItems?: any[];
  teamMembers?: any[];
  onMeetingUpdate?: () => void;
}

type MeetingPhase = 'setup' | 'review' | 'summary' | 'feedback' | 'items-review';

export function LinearMeetingRunner({
  isOpen,
  onClose,
  meeting,
  workItems: initialWorkItems = [],
  teamMembers = [],
  onMeetingUpdate
}: LinearMeetingRunnerProps) {
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout>();
  
  // Meeting phases
  const [currentPhase, setCurrentPhase] = useState<MeetingPhase>('setup');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  
  // Key Results and Work Items
  const [keyResults, setKeyResults] = useState<any[]>([]);
  const [workItems, setWorkItems] = useState<any[]>([]);
  const [currentKeyResultIndex, setCurrentKeyResultIndex] = useState(0);
  const [itemComments, setItemComments] = useState<{[key: number]: string}>({});
  const [meetingChanges, setMeetingChanges] = useState<any[]>([]);
  
  // UI state
  const [selectedWorkItem, setSelectedWorkItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('review');
  const [isMobile, setIsMobile] = useState(false);
  const [expandedKeyResults, setExpandedKeyResults] = useState<Set<number>>(new Set());
  
  // Quick add state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddOwner, setQuickAddOwner] = useState('');
  const [quickAddKeyResult, setQuickAddKeyResult] = useState('');
  
  // Meeting notes - now store as rich HTML
  const [meetingNotes, setMeetingNotes] = useState('');  
  const [richNotes, setRichNotes] = useState('');
  
  // Comments state - store all comments for each work item
  const [workItemComments, setWorkItemComments] = useState<{[key: number]: any[]}>({});
  
  // Activity tracking - store all changes (status, comments, etc) for each work item
  const [workItemActivities, setWorkItemActivities] = useState<{[key: number]: any[]}>({});
  
  // Track local activities separately to prevent loss on refetch
  const [localActivities, setLocalActivities] = useState<{[key: number]: any[]}>({});
  
  // Fixed order for work items (locked when review starts)
  const [fixedWorkItemOrder, setFixedWorkItemOrder] = useState<any[]>([]);
  
  // Feedback state
  const [userReviews, setUserReviews] = useState<{[key: number]: any[]}>({});
  const [feedbackValues, setFeedbackValues] = useState({
    clarity: 5,
    skills: 5,
    environment: 5
  });
  
  // Key Result Detail Panel state
  const [selectedKeyResultId, setSelectedKeyResultId] = useState<number | null>(null);
  const [isKeyResultPanelOpen, setIsKeyResultPanelOpen] = useState(false);
  
  // KPI Tracking state
  const [keyResultComments, setKeyResultComments] = useState<{[key: number]: string}>({});
  const [kpiHistory, setKpiHistory] = useState<{[key: number]: any[]}>({});
  const [previousSnapshots, setPreviousSnapshots] = useState<{[key: number]: any}>({});
  const [showKpiGraphs, setShowKpiGraphs] = useState<Set<number>>(new Set());

  // Fetch objectives and key results
  const { data: objectives } = useQuery({
    queryKey: ['/api/strategy/objectives'],
    enabled: isOpen,
  });
  
  // Fetch Key Result Tasks to link work items to Key Results
  const { data: keyResultTasks } = useQuery({
    queryKey: ['/api/strategy/key-result-tasks'],
    enabled: isOpen,
  });
  
  // Fetch KPI history for all key results
  useEffect(() => {
    const fetchKpiData = async () => {
      if (keyResults.length > 0) {
        const historyPromises = keyResults.map(async (kr) => {
          if (kr.id > 0) { // Skip unlinked items section
            try {
              const response = await apiRequest(`/api/strategy/key-results/${kr.id}/kpi-history`);
              const data = await response.json();
              return { keyResultId: kr.id, history: data };
            } catch (error) {
              console.error(`Failed to fetch KPI history for KR ${kr.id}:`, error);
              return { keyResultId: kr.id, history: [] };
            }
          }
          return null;
        });
        
        const results = await Promise.all(historyPromises);
        const historyMap: {[key: number]: any[]} = {};
        const prevSnapshotMap: {[key: number]: any} = {};
        
        results.forEach(result => {
          if (result && result.keyResultId) {
            historyMap[result.keyResultId] = result.history;
            // Get the previous snapshot (most recent before current meeting)
            if (result.history.length > 0) {
              prevSnapshotMap[result.keyResultId] = result.history[result.history.length - 2] || null;
            }
          }
        });
        
        setKpiHistory(historyMap);
        setPreviousSnapshots(prevSnapshotMap);
      }
    };
    
    fetchKpiData();
  }, [keyResults]);

  // Fetch work items for this meeting ONLY
  const { data: meetingWorkItems } = useQuery({
    queryKey: [`/api/work-items?targetMeetingId=${meeting?.id}`],
    enabled: !!meeting?.id,
  });
  
  // Use only the items specifically assigned to this meeting
  const allWorkItems = useMemo(() => {
    // Only return items that are specifically for THIS meeting
    return Array.isArray(meetingWorkItems) ? meetingWorkItems : [];
  }, [meetingWorkItems]);

  // Mutation to seed work items to this meeting
  const seedWorkItemsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/strategy/meetings/${meeting.id}/seed-items`, {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log(`Seeded ${data.assignedCount} work items to meeting ${meeting.id}`);
      // Invalidate work items query to refetch with newly assigned items
      queryClient.invalidateQueries({ queryKey: [`/api/work-items?targetMeetingId=${meeting?.id}`] });
      if (data.assignedCount > 0) {
        toast({ 
          description: `Added ${data.assignedCount} work items to this meeting` 
        });
      }
    },
    onError: (error) => {
      console.error('Failed to seed work items:', error);
      toast({ 
        description: 'Failed to add work items to meeting',
        variant: 'destructive'
      });
    }
  });

  // Auto-seed work items when meeting opens and no items are found
  useEffect(() => {
    if (meeting?.id && Array.isArray(meetingWorkItems) && meetingWorkItems.length === 0 && !seedWorkItemsMutation.isPending) {
      console.log('Meeting has no work items, attempting to seed...');
      seedWorkItemsMutation.mutate();
    }
  }, [meeting?.id, meetingWorkItems, seedWorkItemsMutation]);
  
  // Fetch comments only once when entering review/setup phase
  useEffect(() => {
    const fetchComments = async () => {
      if (allWorkItems.length > 0 && (currentPhase === 'review' || currentPhase === 'setup')) {
        const commentPromises = allWorkItems.map(async (item) => {
          try {
            const data = await apiRequest(`/api/work-items/${item.id}/comments`) as any;
            return { itemId: item.id, comments: data?.comments || [] };
          } catch (error) {
            console.error(`Failed to fetch comments for item ${item.id}:`, error);
            return { itemId: item.id, comments: [] };
          }
        });
        
        const results = await Promise.all(commentPromises);
        const commentsMap: {[key: number]: any[]} = {};
        
        results.forEach(result => {
          commentsMap[result.itemId] = result.comments;
        });
        
        setWorkItemComments(commentsMap);
        
        // Initialize activities with fetched comments only if not already initialized
        setWorkItemActivities(prev => {
          const newActivities = { ...prev };
          results.forEach(result => {
            // Only set if not already initialized (preserve existing activities)
            if (!newActivities[result.itemId]) {
              newActivities[result.itemId] = result.comments.map((c: any) => ({
                type: 'comment',
                ...c,
                isFetched: true
              }));
            }
          });
          return newActivities;
        });
      }
    };
    
    fetchComments();
  }, [currentPhase]); // Only depend on phase change, not on data changes
  
  // Merge local activities into display activities whenever they change
  useEffect(() => {
    setWorkItemActivities(prev => {
      const merged = { ...prev };
      Object.keys(localActivities).forEach(itemId => {
        const id = parseInt(itemId);
        const existing = merged[id] || [];
        const local = localActivities[id] || [];
        
        // Add local activities that aren't already in the list
        const localIds = new Set(local.map((a: any) => 
          `${a.type}-${a.timestamp?.toISOString()}-${a.comment || a.newValue}`
        ));
        
        // Filter out duplicates and merge
        const filtered = existing.filter((a: any) => !a.isLocal);
        merged[id] = [...filtered, ...local];
      });
      return merged;
    });
  }, [localActivities]);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Process and group data
  useEffect(() => {
    console.log('LinearMeetingRunner data:', { 
      objectives, 
      allWorkItems, 
      meetingWorkItems,
      workItems,
      keyResultTasks,
      meeting 
    });
    
    // Debug logging for Key Result matching
    if (allWorkItems && Array.isArray(allWorkItems) && keyResultTasks && Array.isArray(keyResultTasks)) {
      const itemsWithKRTask = allWorkItems.filter((item: any) => item.keyResultTask?.keyResultId);
      console.log(`[LinearMeetingRunner] Work Items with Key Result links: ${itemsWithKRTask.length}/${allWorkItems.length}`);
      
      // Log a sample to verify the structure
      if (itemsWithKRTask.length > 0) {
        const sample = itemsWithKRTask[0];
        console.log(`  Sample work item:`, {
          id: sample.id,
          title: sample.title,
          keyResultTaskId: sample.keyResultTaskId,
          keyResultTask: sample.keyResultTask
        });
      }
    }
    
    if (objectives && Array.isArray(objectives)) {
      // Extract key results from objectives
      const allKeyResults: any[] = [];
      const linkedWorkItemIds = new Set<number>();
      
      objectives.forEach((obj: any) => {
        if (obj.keyResults && Array.isArray(obj.keyResults)) {
          obj.keyResults.forEach((kr: any) => {
            let linkedItems: any[] = [];
            
            if (keyResultTasks && Array.isArray(keyResultTasks)) {
              // Find Key Result Tasks that belong to this Key Result
              const krTasks = keyResultTasks.filter((task: any) => 
                task.keyResultId === kr.id
              );
              
              // Get the IDs of these Key Result Tasks
              const krTaskIds = krTasks.map((task: any) => task.id);
              
              // Find work items linked to these Key Result Tasks
              linkedItems = allWorkItems?.filter((item: any) => 
                item.keyResultTaskId && krTaskIds.includes(item.keyResultTaskId) &&
                item.status !== 'Completed' && item.status !== 'Archived'
              ) || [];
              
              // Track which work items are linked
              linkedItems.forEach(item => linkedWorkItemIds.add(item.id));
              
              console.log(`Key Result '${kr.title}' has ${krTasks.length} tasks and ${linkedItems.length} work items`);
            }
            
            const krTasksForThisKR = Array.isArray(keyResultTasks) ? keyResultTasks.filter((task: any) => task.keyResultId === kr.id) : [];
            
            allKeyResults.push({
              ...kr,
              objectiveTitle: obj.title,
              objectiveId: obj.id,
              reviewOrder: allKeyResults.length + 1,
              itemCount: linkedItems.length,
              items: linkedItems,
              tasks: krTasksForThisKR
            });
            
          });
        }
      });
      
      // Add a special "Unlinked Items" key result for orphaned work items
      const unlinkedItems = allWorkItems?.filter((item: any) => 
        !linkedWorkItemIds.has(item.id) &&
        item.status !== 'Completed' && item.status !== 'Archived'
      ) || [];
      
      if (unlinkedItems.length > 0) {
        allKeyResults.push({
          id: -1,
          title: 'Unlinked Work Items',
          description: 'Work items not linked to any Key Result',
          objectiveTitle: 'Other',
          objectiveId: -1,
          reviewOrder: allKeyResults.length + 1,
          itemCount: unlinkedItems.length,
          items: unlinkedItems,
          tasks: []
        });
      }
      
      setKeyResults(allKeyResults);
    }
    
    if (allWorkItems && allWorkItems.length > 0) {
      // Filter and organize work items
      const activeItems = allWorkItems.filter((item: any) => 
        item.status !== 'Completed' && item.status !== 'Archived'
      );
      setWorkItems(activeItems);

      // Group work items by user for feedback phase
      const byUser: {[key: number]: any[]} = {};
      activeItems.forEach((item: any) => {
        if (item.assigneeId || item.assignedTo) {
          const assigneeId = item.assigneeId || item.assignedTo;
          if (!byUser[assigneeId]) byUser[assigneeId] = [];
          byUser[assigneeId].push(item);
        }
      });
      setUserReviews(byUser);
    }
  }, [objectives, allWorkItems, keyResultTasks, meeting]);

  // Timer management
  useEffect(() => {
    if (isStarted && currentPhase === 'review') {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted, currentPhase]);

  // Format timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Mutations
  const handleStartMeeting = async () => {
    try {
      // Call backend to update meeting status to 'In Progress'
      await apiRequest(`/api/strategy/check-in-meetings/${meeting.id}/start`, {
        method: 'POST'
      });
      
      // Lock the work item order when starting the meeting
      setFixedWorkItemOrder([...allWorkItems]);
      
      setIsStarted(true);
      setCurrentPhase('review');
      setElapsedTime(0); // Reset timer
      toast({ description: 'Meeting started - Review your work items' });
      
      // Refresh parent data to show updated status
      onMeetingUpdate?.();
    } catch (error) {
      console.error('Failed to start meeting:', error);
      toast({ 
        description: 'Failed to start meeting',
        variant: 'destructive'
      });
    }
  };

  const updateWorkItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/work-items/${id}`, {
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: () => {
      // Invalidate the queries that this component actually uses
      queryClient.invalidateQueries({ queryKey: [`/api/work-items?targetMeetingId=${meeting?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/work-items?teamId=${meeting?.teamId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      toast({ description: 'Status updated' });
    },
  });

  // Get status color based on status value
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500';
      case 'In Progress':
        return 'bg-blue-500';
      case 'Stuck':
        return 'bg-yellow-500';
      case 'Ready':
      case 'Not Started':
      default:
        return 'bg-gray-400';
    }
  };
  
  // Get badge styles for status
  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'Stuck':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
      case 'Planning':
      case 'Ready':
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';
    }
  };
  
  // Status options for dropdown
  const statusOptions = ['Planning', 'Ready', 'In Progress', 'Stuck', 'Completed'];

  // Get activity count for a work item
  const getActivityCount = (itemId: number) => {
    const activities = workItemActivities[itemId] || [];
    return activities.length;
  };

  const updateKeyResultMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/strategy/key-results/${id}`, {
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      toast({ description: 'Progress updated' });
    },
  });

  const createWorkItemMutation = useMutation({
    mutationFn: async ({ title, keyResultId, assigneeId }: any) => {
      // Get the Key Result Task ID from the selected Key Result
      const selectedKr = keyResults.find(kr => kr.id === parseInt(keyResultId));
      const krTask = selectedKr?.tasks?.[0]; // Get first task if available
      
      return apiRequest('/api/work-items', {
        method: 'POST',
        body: {
          title,
          status: 'Planning',
          teamId: meeting.teamId,
          keyResultTaskId: krTask?.id || null, // Use Key Result Task ID
          assignedTo: assigneeId,
          targetMeetingId: meeting.id, // Correct field name
          organizationId: meeting.organizationId
        },
      });
    },
    onSuccess: () => {
      toast({ description: 'Item added' });
      setQuickAddTitle('');
      setShowQuickAdd(false);
      // Invalidate the correct queries that the meeting runner uses
      queryClient.invalidateQueries({ queryKey: [`/api/work-items?targetMeetingId=${meeting?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/work-items?teamId=${meeting?.teamId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/key-result-tasks'] });
    },
  });

  const addKeyResultCommentMutation = useMutation({
    mutationFn: async ({ keyResultId, comment }: { keyResultId: number; comment: string }) => {
      return apiRequest(`/api/strategy/key-results/${keyResultId}/comments`, {
        method: 'POST',
        body: {
          comment,
          meetingId: meeting.id
        },
      });
    },
    onSuccess: (data, { keyResultId }) => {
      toast({ description: 'Comment added to Key Result' });
      setKeyResultComments(prev => ({ ...prev, [keyResultId]: '' }));
      // Invalidate comments query to refresh
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/key-results/${keyResultId}/comments`] });
    },
  });

  const logActivityMutation = useMutation({
    mutationFn: async ({ itemId, comment }: { itemId: number; comment: string }) => {
      return apiRequest(`/api/work-items/${itemId}/activity`, {
        method: 'POST',
        body: {
          actionType: 'comment',
          description: comment,
          metadata: { meetingId: meeting.id }
        },
      });
    },
    onSuccess: async (data, { itemId }) => {
      // Fetch the updated comments immediately
      try {
        const response = await apiRequest(`/api/work-items/${itemId}/comments`) as any;
        const updatedComments = response?.comments || [];
        
        // Update comments
        setWorkItemComments(prev => ({
          ...prev,
          [itemId]: updatedComments
        }));
        
        // Update activities with the new comment
        const newComment = updatedComments[updatedComments.length - 1];
        if (newComment) {
          const commentActivity = { 
            type: 'comment', 
            ...newComment,
            isLocal: true // Mark as locally added
          };
          
          // Add to local activities
          setLocalActivities(prev => ({
            ...prev,
            [itemId]: [...(prev[itemId] || []), commentActivity]
          }));
          
          // Add to display activities
          setWorkItemActivities(prev => ({
            ...prev,
            [itemId]: [...(prev[itemId] || []), commentActivity]
          }));
        }
      } catch (error) {
        console.error('Failed to refresh comments:', error);
      }
      // Don't invalidate queries to prevent refetch that would reset state
    },
  });

  const completeMeetingMutation = useMutation({
    mutationFn: async () => {
      // Save meeting data to agenda field (matches database schema)
      await apiRequest(`/api/strategy/check-in-meetings/${meeting.id}/complete`, {
        method: 'POST',
        body: { 
          notes: meetingNotes,
          duration: elapsedTime,
          // Store all meeting data in metadata (which gets saved to agenda field in DB)
          metadata: {
            // Store the work items that were reviewed in this meeting
            reviewedWorkItems: allWorkItems.map(item => ({
              id: item.id,
              title: item.title,
              status: item.status,
              assignedTo: item.assignedTo,
              keyResultTaskId: item.keyResultTaskId
            })),
            feedback: feedbackValues,
            activities: meetingChanges, // Include all activities (comments + status changes)
            startedAt: new Date(Date.now() - (elapsedTime * 1000)).toISOString(),
            completedAt: new Date().toISOString(),
            duration: Math.floor(elapsedTime / 60) // Convert to minutes
          }
        },
      });
      
      // Then update with rich notes
      if (richNotes) {
        await apiRequest(`/api/strategy/meetings/${meeting.id}/notes`, {
          method: 'PATCH',
          body: { richNotes }
        });
      }
    },
    onSuccess: () => {
      toast({ description: 'Meeting completed' });
      onMeetingUpdate?.();
      onClose();
    },
  });

  // Handle work item status change
  const handleStatusChange = async (itemId: number, newStatus: string) => {
    const item = workItems.find(w => w.id === itemId);
    if (!item) return;

    await updateWorkItemMutation.mutateAsync({ 
      id: itemId, 
      data: { status: newStatus }
    });
    
    const statusChange = {
      type: 'status',
      itemId,
      itemTitle: item.title,
      oldValue: item.status,
      newValue: newStatus,
      timestamp: new Date(),
      userName: 'Current User',
      isLocal: true // Mark as local activity
    };
    
    // Track change in both places
    setMeetingChanges(prev => [...prev, statusChange]);
    
    // Add to local activities
    setLocalActivities(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), statusChange]
    }));
    
    // Add to activities for immediate display
    setWorkItemActivities(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), statusChange]
    }));
  };

  // Handle comment submission
  const handleCommentSubmit = async (itemId: number) => {
    const comment = itemComments[itemId];
    if (!comment?.trim()) return;
    
    // Track change immediately for meeting summary
    const item = workItems.find(w => w.id === itemId);
    const commentActivity = {
      type: 'comment',
      itemId,
      itemTitle: item?.title,
      comment,
      timestamp: new Date(),
      user: 'Current User', // Would get from auth context
      userName: 'Current User',
      description: comment,
      isLocal: true
    };
    
    setMeetingChanges(prev => [...prev, commentActivity]);
    
    // Add to local activities for persistence through refetches
    setLocalActivities(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), commentActivity]
    }));
    
    // Add to display activities for immediate UI update
    setWorkItemActivities(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), commentActivity]
    }));
    
    // Clear comment input
    setItemComments(prev => ({ ...prev, [itemId]: '' }));
    
    // Show immediate feedback
    toast({ description: 'Comment added' });
    
    // Then submit to backend
    await logActivityMutation.mutateAsync({ itemId, comment });
  };

  // Handle quick add
  const handleQuickAdd = () => {
    if (!quickAddTitle || !quickAddKeyResult) return;
    
    createWorkItemMutation.mutate({
      title: quickAddTitle,
      keyResultId: parseInt(quickAddKeyResult),
      assigneeId: quickAddOwner ? parseInt(quickAddOwner) : null
    });
  };
  
  // Handle Key Result comment submission
  const handleKeyResultCommentSubmit = async (keyResultId: number) => {
    const comment = keyResultComments[keyResultId];
    if (!comment?.trim()) return;
    
    await addKeyResultCommentMutation.mutateAsync({ keyResultId, comment });
  };
  
  // Calculate KPI change since last meeting
  const getKpiChange = (keyResultId: number, currentValue: number) => {
    const previousSnapshot = previousSnapshots[keyResultId];
    if (!previousSnapshot || !previousSnapshot.value) return null;
    
    const change = currentValue - previousSnapshot.value;
    const percentChange = (change / previousSnapshot.value) * 100;
    
    return {
      absolute: change,
      percent: percentChange,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
    };
  };
  
  // Toggle KPI graph visibility
  const toggleKpiGraph = (keyResultId: number) => {
    setShowKpiGraphs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyResultId)) {
        newSet.delete(keyResultId);
      } else {
        newSet.add(keyResultId);
      }
      return newSet;
    });
  };

  // Handle Key Result detail panel opening
  const handleOpenKeyResult = (keyResultId: number) => {
    // Don't auto-close WorkItemPanel - let both panels coexist
    setSelectedKeyResultId(keyResultId);
    setIsKeyResultPanelOpen(true);
  };

  // Group work items by status - show all team items
  const itemsToReview = workItems.filter(item => 
    item.status === 'In Progress' || item.status === 'Ready'
  );
  const itemsInPlanning = workItems.filter(item => 
    item.status === 'Planning'
  );
  const itemsStuck = workItems.filter(item => 
    item.status === 'Stuck'
  );
  const itemsCompleted = workItems.filter(item => 
    item.status === 'Completed'
  );

  // Get work items for current key result
  const currentKeyResult = keyResults[currentKeyResultIndex];
  const currentKRItems = workItems.filter(item => 
    item.keyResultTaskId === currentKeyResult?.id
  );

  // Render based on current phase
  const renderPhase = () => {
    switch (currentPhase) {
      case 'setup':
        return (
          <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-3 sm:space-y-6">
            {/* Compact Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg sm:text-2xl font-semibold">
                  Check-in {format(new Date(meeting?.scheduledDate || Date.now()), 'dd MMM yyyy')}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {meeting?.status || 'Planning'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Team: {meeting?.team?.name || 'Leadership'}
                  </span>
                </div>
              </div>
            </div>

            {/* Work Items Summary */}
            <div>
              {/* Unified tabbed interface for all screen sizes */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="review" className="text-xs sm:text-sm">
                    Review ({itemsToReview.length})
                  </TabsTrigger>
                  <TabsTrigger value="planning" className="text-xs sm:text-sm">
                    Planning ({itemsInPlanning.length})
                  </TabsTrigger>
                  <TabsTrigger value="stuck" className="text-xs sm:text-sm">
                    Stuck ({itemsStuck.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="text-xs sm:text-sm">
                    Completed ({itemsCompleted.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="review" className="mt-3 space-y-2">
                  {itemsToReview.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No items to review</p>
                  ) : (
                    itemsToReview.map(item => {
                      // Find the Key Result for this item using the embedded keyResultTask
                      const itemKeyResult = item.keyResultTask?.keyResultId 
                        ? keyResults.find(kr => kr.id === item.keyResultTask.keyResultId)
                        : null;
                      
                      return (
                        <div 
                          key={item.id}
                          className="grid grid-cols-[8px_1fr_100px] items-start gap-2 py-1.5 px-2 group hover:bg-muted/50 rounded cursor-pointer"
                          onClick={() => setSelectedWorkItem(item)}
                        >
                          {/* Status dot */}
                          <div className={cn("w-2 h-2 rounded-full mt-1.5", getStatusColor(item.status))} />
                          {/* Title, KR label, and activity count */}
                          <div className="min-w-0">
                            <p className="text-sm truncate">{item.title}</p>
                            {itemKeyResult && (
                              <button 
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate block mt-0.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Open KR details/edit sheet
                                  handleOpenKeyResult(itemKeyResult.id);
                                }}
                              >
                                KR: {itemKeyResult.title}
                              </button>
                            )}
                            {getActivityCount(item.id) > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{getActivityCount(item.id)}</span>
                              </div>
                            )}
                          </div>
                          {/* Status dropdown */}
                          <Select
                            value={item.status}
                            onValueChange={(value) => {
                              handleStatusChange(item.id, value);
                            }}
                          >
                            <SelectTrigger 
                              className="h-6 w-[100px] text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map(status => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })
                  )}
                </TabsContent>
                
                <TabsContent value="planning" className="mt-3 space-y-2">
                  {itemsInPlanning.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No items in planning</p>
                  ) : (
                    itemsInPlanning.map(item => {
                      // Find the Key Result for this item using the embedded keyResultTask
                      const itemKeyResult = item.keyResultTask?.keyResultId 
                        ? keyResults.find(kr => kr.id === item.keyResultTask.keyResultId)
                        : null;
                      
                      return (
                        <div 
                          key={item.id}
                          className="grid grid-cols-[8px_1fr_100px] items-start gap-2 py-1.5 px-2 group hover:bg-muted/50 rounded cursor-pointer"
                          onClick={() => setSelectedWorkItem(item)}
                        >
                          {/* Status dot */}
                          <div className={cn("w-2 h-2 rounded-full mt-1.5", getStatusColor(item.status))} />
                          {/* Title, KR label, and activity count */}
                          <div className="min-w-0">
                            <p className="text-sm truncate">{item.title}</p>
                            {itemKeyResult && (
                              <button 
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate block mt-0.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Open KR details/edit sheet
                                  handleOpenKeyResult(itemKeyResult.id);
                                }}
                              >
                                KR: {itemKeyResult.title}
                              </button>
                            )}
                            {getActivityCount(item.id) > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{getActivityCount(item.id)}</span>
                              </div>
                            )}
                          </div>
                          {/* Status dropdown */}
                          <Select
                            value={item.status}
                            onValueChange={(value) => {
                              handleStatusChange(item.id, value);
                            }}
                          >
                            <SelectTrigger 
                              className="h-6 w-[100px] text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map(status => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })
                  )}
                </TabsContent>
                
                <TabsContent value="stuck" className="mt-3 space-y-2">
                  {itemsStuck.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No stuck items</p>
                  ) : (
                    itemsStuck.map(item => {
                      // Find the Key Result for this item using the embedded keyResultTask
                      const itemKeyResult = item.keyResultTask?.keyResultId 
                        ? keyResults.find(kr => kr.id === item.keyResultTask.keyResultId)
                        : null;
                      
                      return (
                        <div 
                          key={item.id}
                          className="grid grid-cols-[8px_1fr_100px] items-start gap-2 py-1.5 px-2 group hover:bg-muted/50 rounded cursor-pointer"
                          onClick={() => setSelectedWorkItem(item)}
                        >
                          {/* Status dot */}
                          <div className={cn("w-2 h-2 rounded-full mt-1.5", getStatusColor(item.status))} />
                          {/* Title, KR label, and activity count */}
                          <div className="min-w-0">
                            <p className="text-sm truncate">{item.title}</p>
                            {itemKeyResult && (
                              <button 
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate block mt-0.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Open KR details/edit sheet
                                  handleOpenKeyResult(itemKeyResult.id);
                                }}
                              >
                                KR: {itemKeyResult.title}
                              </button>
                            )}
                            {getActivityCount(item.id) > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{getActivityCount(item.id)}</span>
                              </div>
                            )}
                          </div>
                          {/* Status dropdown */}
                          <Select
                            value={item.status}
                            onValueChange={(value) => {
                              handleStatusChange(item.id, value);
                            }}
                          >
                            <SelectTrigger 
                              className="h-6 w-[100px] text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map(status => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })
                  )}
                </TabsContent>
                
                <TabsContent value="completed" className="mt-3 space-y-2">
                  {itemsCompleted.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No completed items</p>
                  ) : (
                    itemsCompleted.map(item => {
                      // Find the Key Result for this item using the embedded keyResultTask
                      const itemKeyResult = item.keyResultTask?.keyResultId 
                        ? keyResults.find(kr => kr.id === item.keyResultTask.keyResultId)
                        : null;
                      
                      return (
                        <div 
                          key={item.id}
                          className="grid grid-cols-[8px_1fr_100px] items-start gap-2 py-1.5 px-2 group hover:bg-muted/50 rounded cursor-pointer"
                          onClick={() => setSelectedWorkItem(item)}
                        >
                          {/* Status dot */}
                          <div className={cn("w-2 h-2 rounded-full mt-1.5", getStatusColor(item.status))} />
                          {/* Title, KR label, and activity count */}
                          <div className="min-w-0">
                            <p className="text-sm truncate">{item.title}</p>
                            {itemKeyResult && (
                              <button 
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate block mt-0.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Open KR details/edit sheet
                                  handleOpenKeyResult(itemKeyResult.id);
                                }}
                              >
                                KR: {itemKeyResult.title}
                              </button>
                            )}
                            {getActivityCount(item.id) > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{getActivityCount(item.id)}</span>
                              </div>
                            )}
                          </div>
                          {/* Status dropdown */}
                          <Select
                            value={item.status}
                            onValueChange={(value) => {
                              handleStatusChange(item.id, value);
                            }}
                          >
                            <SelectTrigger 
                              className="h-6 w-[100px] text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map(status => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })
                  )}
                </TabsContent>
              </Tabs>
            </div>


            {/* Quick Add Section - Mobile optimized */}
            {showQuickAdd ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quick add item</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`${isMobile ? 'space-y-3' : 'flex gap-2'}`}>
                    <Input
                      placeholder="Item title..."
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      className="flex-1"
                    />
                    
                    {/* Combo dropdowns for mobile */}
                    <div className={`${isMobile ? 'grid grid-cols-2 gap-2' : 'flex gap-2'}`}>
                      <Select value={quickAddOwner} onValueChange={setQuickAddOwner}>
                        <SelectTrigger className={isMobile ? 'w-full' : 'w-[150px]'}>
                          <SelectValue placeholder="Owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map(member => (
                            <SelectItem key={member.userId} value={member.userId.toString()}>
                              {member.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={quickAddKeyResult} onValueChange={setQuickAddKeyResult}>
                        <SelectTrigger className={isMobile ? 'w-full' : 'w-[200px]'}>
                          <SelectValue placeholder="Key Result" />
                        </SelectTrigger>
                        <SelectContent>
                          {keyResults.map(kr => (
                            <SelectItem key={kr.id} value={kr.id.toString()}>
                              {kr.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className={isMobile ? 'flex gap-2' : ''}>
                      {isMobile && (
                        <Button 
                          variant="outline" 
                          onClick={() => setShowQuickAdd(false)}
                          className="flex-1"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      )}
                      <Button 
                        onClick={handleQuickAdd} 
                        size="sm"
                        className={isMobile ? 'flex-1' : ''}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowQuickAdd(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Quick add item...
              </Button>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel/Skip
              </Button>
              <Button onClick={handleStartMeeting}>
                Start
              </Button>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="h-full flex flex-col">
            {/* Compact Header with timer */}
            <div className="sticky top-0 z-10 bg-background border-b px-3 py-2">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-medium">
                  Review Items ({allWorkItems.length})
                </h2>
                <Badge variant="secondary" className="text-xs font-mono">
                  {formatTime(elapsedTime)}
                </Badge>
              </div>
            </div>

            {/* Scrollable content with Key Results as sections */}
            <ScrollArea className="flex-1">
              <div className="p-2 sm:p-4 space-y-4 sm:space-y-6">
                {keyResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No work items to review
                  </p>
                ) : (
                  keyResults.map((kr, krIndex) => {
                    // Skip Key Results without items
                    if (!kr.items || kr.items.length === 0) return null;
                    
                    const kpiChange = kr.id > 0 ? getKpiChange(kr.id, kr.currentValue) : null;
                    const history = kr.id > 0 ? kpiHistory[kr.id] : [];
                    const isExpanded = expandedKeyResults.has(kr.id);
                    const isGraphVisible = showKpiGraphs.has(kr.id);
                    
                    return (
                      <div key={kr.id} className="space-y-3">
                        {/* Key Result Section Header with KPI */}
                        <div className="bg-muted/30 rounded-lg p-3">
                          <div className="space-y-3">
                            {/* KR Title and Toggle */}
                            <div className="flex items-center justify-between">
                              <button
                                className="flex items-center gap-2 text-left flex-1"
                                onClick={() => {
                                  const newExpanded = new Set(expandedKeyResults);
                                  if (isExpanded) {
                                    newExpanded.delete(kr.id);
                                  } else {
                                    newExpanded.add(kr.id);
                                  }
                                  setExpandedKeyResults(newExpanded);
                                }}
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <div className="flex-1">
                                  <h3 className="font-medium text-sm">{kr.title}</h3>
                                  <p className="text-xs text-muted-foreground">
                                    {kr.objectiveTitle} • {kr.items.length} work item{kr.items.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </button>
                              
                              {/* KPI Display for real Key Results */}
                              {kr.id > 0 && (
                                <div className="flex items-center gap-3">
                                  {/* Current KPI Progress */}
                                  <div className="text-right">
                                    <div className="flex items-center gap-2">
                                      <Target className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm font-medium">
                                        {kr.currentValue || 0} / {kr.targetValue || 0}
                                      </span>
                                      {kr.type === 'percentage' && <span className="text-xs text-muted-foreground">%</span>}
                                    </div>
                                    
                                    {/* Change indicator */}
                                    {kpiChange && (
                                      <div className="flex items-center gap-1 mt-1">
                                        {kpiChange.trend === 'up' ? (
                                          <TrendingUp className="h-3 w-3 text-green-600" />
                                        ) : kpiChange.trend === 'down' ? (
                                          <TrendingDown className="h-3 w-3 text-red-600" />
                                        ) : (
                                          <Activity className="h-3 w-3 text-gray-400" />
                                        )}
                                        <span className={cn(
                                          "text-xs",
                                          kpiChange.trend === 'up' ? 'text-green-600' : 
                                          kpiChange.trend === 'down' ? 'text-red-600' : 
                                          'text-gray-500'
                                        )}>
                                          {kpiChange.absolute > 0 ? '+' : ''}{kpiChange.absolute.toFixed(1)}
                                          {kr.type === 'percentage' && '%'}
                                          <span className="text-[10px] ml-0.5">
                                            ({kpiChange.percent > 0 ? '+' : ''}{kpiChange.percent.toFixed(0)}%)
                                          </span>
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Graph toggle button */}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleKpiGraph(kr.id);
                                    }}
                                    title="Show/hide KPI graph"
                                  >
                                    <BarChart3 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            
                            {/* Progress Bar for real Key Results */}
                            {kr.id > 0 && (
                              <div className="space-y-1">
                                <Progress 
                                  value={(kr.currentValue / kr.targetValue) * 100} 
                                  className="h-2"
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                  {((kr.currentValue / kr.targetValue) * 100).toFixed(0)}% complete
                                </p>
                              </div>
                            )}
                            
                            {/* KPI Graph */}
                            {isGraphVisible && history && history.length > 0 && (
                              <div className="bg-background rounded p-3">
                                <h4 className="text-xs font-medium mb-2">Historical KPI Performance</h4>
                                <ResponsiveContainer width="100%" height={200}>
                                  <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                      dataKey="date" 
                                      tick={{ fontSize: 10 }}
                                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                                    />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip 
                                      labelFormatter={(date) => format(new Date(date), 'PPP')}
                                      formatter={(value: any) => [
                                        kr.type === 'percentage' ? `${value}%` : value,
                                        value === history[0]?.target ? 'Target' : 'Current'
                                      ]}
                                    />
                                    <ReferenceLine 
                                      y={kr.targetValue} 
                                      stroke="red" 
                                      strokeDasharray="5 5" 
                                      label={{ value: "Target", fontSize: 10 }}
                                    />
                                    <Line 
                                      type="monotone" 
                                      dataKey="value" 
                                      stroke="#8884d8" 
                                      strokeWidth={2}
                                      dot={{ r: 4 }}
                                      activeDot={{ r: 6 }}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                            
                            {/* Quick comment for Key Result */}
                            {kr.id > 0 && (
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Add a quick comment for this Key Result..."
                                  value={keyResultComments[kr.id] || ''}
                                  onChange={(e) => setKeyResultComments(prev => ({ ...prev, [kr.id]: e.target.value }))}
                                  className="h-8 text-xs flex-1"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleKeyResultCommentSubmit(kr.id);
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3 text-xs"
                                  onClick={() => handleKeyResultCommentSubmit(kr.id)}
                                  disabled={!keyResultComments[kr.id]?.trim()}
                                >
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Comment
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenKeyResult(kr.id);
                                  }}
                                  title="Edit Key Result"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Work items for this Key Result */}
                        {isExpanded && (
                          <div className="space-y-2 pl-4">
                            {kr.items.map((item: any, itemIndex: number) => {
                              // Mobile: Compact row layout, Desktop: Card layout
                              if (isMobile) {
                                return (
                                  <div 
                                    key={item.id} 
                                    className="border rounded-lg p-2 bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedWorkItem(item)}
                        >
                          {/* Compact Mobile Row Layout */}
                          <div className="space-y-1">
                            {/* Title row with status dot */}
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full flex-shrink-0",
                                item.status === 'Completed' && "bg-green-500",
                                item.status === 'In Progress' && "bg-blue-500",
                                item.status === 'Planning' && "bg-gray-400",
                                item.status === 'Ready' && "bg-yellow-500",
                                item.status === 'Stuck' && "bg-red-500"
                              )} />
                              <span className="text-xs font-medium flex-1 truncate">{item.title}</span>
                              {/* Quick status change */}
                              <Select
                                value={item.status}
                                onValueChange={(value) => {
                                  handleStatusChange(item.id, value);
                                }}
                              >
                                <SelectTrigger 
                                  className="h-6 w-[80px] text-[10px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {statusOptions.map(status => (
                                    <SelectItem key={status} value={status}>
                                      {status}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Meta info row */}
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span>#{itemIndex + 1}</span>
                              {kr.id > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{kr.title}</span>
                                </>
                              )}
                              {item.assignee && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{item.assignee.fullName || item.assignee.name}</span>
                                </>
                              )}
                              {workItemActivities[item.id]?.length > 0 && (
                                <>
                                  <span>•</span>
                                  <MessageSquare className="h-3 w-3" />
                                  <span>{workItemActivities[item.id].length}</span>
                                </>
                              )}
                            </div>
                            
                            {/* Quick comment input - hidden by default, shown on expand */}
                            {itemComments[item.id] !== undefined && (
                              <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  placeholder="Quick comment..."
                                  value={itemComments[item.id] || ''}
                                  onChange={(e) => setItemComments(prev => ({ ...prev, [item.id]: e.target.value }))}
                                  className="h-6 text-xs flex-1"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleCommentSubmit(item.id);
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  className="h-6 px-2 text-[10px]"
                                  onClick={() => handleCommentSubmit(item.id)}
                                  disabled={!itemComments[item.id]?.trim()}
                                >
                                  Add
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    // Desktop: Keep existing card layout
                    return (
                      <Card key={item.id} className="overflow-hidden">
                        <CardContent className="p-3 sm:pt-4">
                          {/* Item header with status dropdown */}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-muted-foreground">
                                  Item {itemIndex + 1} of {kr.items.length}
                                </span>
                                {kr.id > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {kr.title}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-sm sm:text-lg flex-1">{item.title}</h3>
                                {/* Status dropdown in title row */}
                                <Select
                                  value={item.status}
                                  onValueChange={(value) => {
                                    handleStatusChange(item.id, value);
                                  }}
                                >
                                  <SelectTrigger 
                                    className="h-7 w-[110px] text-xs sm:text-sm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statusOptions.map(status => (
                                      <SelectItem key={status} value={status}>
                                        {status}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {item.assignee && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Assigned to: {item.assignee.fullName || item.assignee.name}
                                </p>
                              )}
                            </div>
                          </div>
                      
                          {/* Activity display - Shows both comments and status changes */}
                          <div className="bg-muted/30 rounded-lg p-2 mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium">
                                Activity {workItemActivities[item.id] ? `(${workItemActivities[item.id].length})` : '(0)'}
                              </span>
                            </div>
                            <div className="space-y-1 max-h-[120px] sm:max-h-[200px] overflow-y-auto">
                              {workItemActivities[item.id] && workItemActivities[item.id].length > 0 ? (
                                workItemActivities[item.id].map((activity: any, idx: number) => {
                                  if (activity.type === 'comment') {
                                    return (
                                      <div key={activity.id || `comment-${idx}`} className="flex gap-2 text-sm">
                                        <div className="flex-shrink-0">
                                          <Avatar className="h-6 w-6">
                                            <AvatarFallback className="text-[10px]">
                                              {activity.userName?.charAt(0) || 'U'}
                                            </AvatarFallback>
                                          </Avatar>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-medium text-xs">
                                              {activity.userName || 'Unknown'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                              {activity.createdAt ? format(new Date(activity.createdAt), 'MMM d, h:mm a') : 
                                               activity.timestamp ? format(new Date(activity.timestamp), 'MMM d, h:mm a') : ''}
                                            </span>
                                          </div>
                                          <p className="text-xs text-muted-foreground break-words">
                                            {activity.description || activity.comment}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  } else if (activity.type === 'status') {
                                    return (
                                      <div key={`status-${idx}`} className="text-xs text-muted-foreground pl-8">
                                        <span className="font-medium">{activity.userName || 'System'}</span>
                                        <span> changed status: </span>
                                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                                          {activity.oldValue}
                                        </Badge>
                                        <span> → </span>
                                        <Badge className="text-[10px] px-1 py-0">
                                          {activity.newValue}
                                        </Badge>
                                        {activity.timestamp && (
                                          <span className="ml-2 text-[10px]">
                                            {format(new Date(activity.timestamp), 'h:mm a')}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }
                                  return null;
                                })
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-2">No activity yet</p>
                              )}
                            </div>
                          </div>
                      
                          {/* Add comment section - Compact */}
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Add comment</Label>
                            <div className="flex gap-2">
                              <Textarea
                                placeholder="Add a comment..."
                                value={itemComments[item.id] || ''}
                                onChange={(e) => setItemComments(prev => ({ ...prev, [item.id]: e.target.value }))}
                                className="min-h-[40px] sm:min-h-[60px] flex-1 text-xs sm:text-sm"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && e.shiftKey === false) {
                                    e.preventDefault();
                                    handleCommentSubmit(item.id);
                                  }
                                }}
                              />
                              <Button 
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={() => handleCommentSubmit(item.id)}
                                disabled={!itemComments[item.id]?.trim()}
                              >
                                Log
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })
    )}
  </div>
              
              {/* Complete meeting button at bottom */}
              {allWorkItems.length > 0 && (
                <div className="p-2 sm:p-4 border-t">
                  <Button 
                    className="w-full h-10 sm:h-12 text-sm"
                    size={isMobile ? "default" : "lg"}
                    onClick={() => setCurrentPhase('summary')}
                  >
                    Complete Review & Go to Summary
                  </Button>
                </div>
              )}
            </ScrollArea>
          </div>
        );

      case 'summary':
        // Get incomplete items that will be carried forward
        const incompleteItems = workItems.filter(item => 
          !['Completed', 'Archived'].includes(item.status)
        );
        
        return (
          <div className="p-3 sm:p-6 space-y-3 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold">Meeting Summary</h2>
            
            {/* Actions list */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">📋 Actions Taken</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-[150px] sm:max-h-[250px] overflow-y-auto">
                  {meetingChanges.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No changes recorded</p>
                  ) : (
                    meetingChanges.map((change, index) => (
                      <div key={index} className="text-xs sm:text-sm pb-1 border-b last:border-0">
                        {change.type === 'status' && (
                          <div>
                            <span className="font-medium">{change.itemTitle}</span>
                            <span className="text-muted-foreground"> status: </span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {change.oldValue}
                            </Badge>
                            <span className="text-muted-foreground"> → </span>
                            <Badge className="text-[10px] px-1 py-0">
                              {change.newValue}
                            </Badge>
                          </div>
                        )}
                        {change.type === 'comment' && (
                          <div>
                            <span className="font-medium">{change.user}</span>
                            <span className="text-muted-foreground"> on </span>
                            <span className="font-medium">{change.itemTitle}:</span>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">"{change.comment}"</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Items to Carry Forward */}
            {incompleteItems.length > 0 && (
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>🔄 Items to Carry Forward</span>
                    <Badge variant="secondary" className="text-xs">
                      {incompleteItems.length} items
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    These incomplete items will automatically move to your next meeting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 max-h-[120px] sm:max-h-[200px] overflow-y-auto">
                    {incompleteItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs sm:text-sm">
                        <span className="text-xs">
                          {item.status === 'Stuck' ? '⚠️' : 
                           item.status === 'In Progress' ? '🔄' : 
                           item.status === 'Ready' ? '✅' : '○'}
                        </span>
                        <span className="flex-1 truncate">{item.title}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Meeting minutes with rich text editor */}
            <div className="space-y-2">
              <Label htmlFor="minutes">Meeting minutes</Label>
              <div className="border rounded-lg p-4 bg-background">
                <ModernDocumentEditor
                  content={richNotes}
                  onChange={setRichNotes}
                  placeholder="Add meeting notes, decisions, action items... Use formatting, headings, images and videos as needed."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentPhase('review')}>
                Back
              </Button>
              <Button onClick={() => {
                // Complete the meeting without showing feedback immediately
                completeMeetingMutation.mutate();
              }}>
                Complete Meeting
              </Button>
            </div>
          </div>
        );

      case 'feedback':
        // Feedback is now collected separately via the feedback button/page
        // This phase is no longer used
        return null;
      case 'items-review':
        return (
          <div className="p-6">
            <div>
              <h3 className="text-sm font-medium mb-3">
                Items for next check-in by team member
              </h3>
              <div className="space-y-4">
                {Object.entries(userReviews).map(([userId, items]) => {
                  const user = teamMembers.find(m => m.userId === parseInt(userId));
                  return (
                    <Card key={userId}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {user?.fullName || 'Unknown User'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {items.slice(0, 5).map(item => (
                            <div key={item.id} className="flex items-center gap-2">
                              <Checkbox className="h-4 w-4" defaultChecked />
                              <span className="text-sm flex-1">{item.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {item.status}
                              </Badge>
                            </div>
                          ))}
                          {items.length > 5 && (
                            <p className="text-xs text-muted-foreground">
                              +{items.length - 5} more items
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Feedback sliders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Team Feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="clarity">Clarity</Label>
                    <span className="text-sm text-muted-foreground">
                      {feedbackValues.clarity}/10
                    </span>
                  </div>
                  <Slider
                    id="clarity"
                    min={1}
                    max={10}
                    step={1}
                    value={[feedbackValues.clarity]}
                    onValueChange={([value]) => 
                      setFeedbackValues(prev => ({ ...prev, clarity: value }))
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="skills">Skills</Label>
                    <span className="text-sm text-muted-foreground">
                      {feedbackValues.skills}/10
                    </span>
                  </div>
                  <Slider
                    id="skills"
                    min={1}
                    max={10}
                    step={1}
                    value={[feedbackValues.skills]}
                    onValueChange={([value]) => 
                      setFeedbackValues(prev => ({ ...prev, skills: value }))
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="environment">Environment</Label>
                    <span className="text-sm text-muted-foreground">
                      {feedbackValues.environment}/10
                    </span>
                  </div>
                  <Slider
                    id="environment"
                    min={1}
                    max={10}
                    step={1}
                    value={[feedbackValues.environment]}
                    onValueChange={([value]) => 
                      setFeedbackValues(prev => ({ ...prev, environment: value }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Complete meeting - mobile optimized */}
            <div className={`
              ${isMobile ? 'fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg' : 'pt-4'}
              flex justify-between gap-3
            `}>
              <Button 
                variant="outline" 
                onClick={() => setCurrentPhase('summary')}
                className={isMobile ? 'flex-1' : ''}
              >
                Back
              </Button>
              <Button onClick={() => {
                // Complete the meeting without showing feedback immediately
                completeMeetingMutation.mutate();
              }}>
                Complete Meeting
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <Sheet 
        open={isOpen} 
        modal={!isKeyResultPanelOpen && !selectedWorkItem}
        onOpenChange={(open) => {
          if (!open) {
            // Only close if no child panels are open
            if (!isKeyResultPanelOpen && !selectedWorkItem) {
              onClose();
            } else {
              // If child panels are open, close them first but don't close main meeting
              setIsKeyResultPanelOpen(false);
              setSelectedKeyResultId(null);
              setSelectedWorkItem(null);
            }
          }
        }}
      >
        <SheetContent 
          className="p-0 flex h-dvh sm:h-screen w-full sm:w-[900px]"
          onInteractOutside={(e) => {
            // Prevent parent sheet from closing when child panels are open
            if (isKeyResultPanelOpen || selectedWorkItem) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            // Close child panels first, then parent
            if (isKeyResultPanelOpen) {
              setIsKeyResultPanelOpen(false);
              setSelectedKeyResultId(null);
              e.preventDefault();
            } else if (selectedWorkItem) {
              setSelectedWorkItem(null);
              e.preventDefault();
            }
          }}
        >
          {/* Mobile scrolling fix: min-h-0 on flex container */}
          <div className="flex flex-col min-h-0 w-full">
            {/* Ultra-compact Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium truncate max-w-[120px]">
                  {meeting?.teamName || meeting?.team?.name || 'Check-in'}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground text-xs">
                  {meeting?.scheduledDate ? format(new Date(meeting.scheduledDate), 'MMM d') : ''}
                </span>
                {isStarted && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{formatTime(elapsedTime)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {currentPhase === 'setup' && (
                  <Badge variant="outline" className="text-xs">Setup</Badge>
                )}
                {currentPhase === 'review' && (
                  <Badge variant="default" className="text-xs">In Progress</Badge>
                )}
                {currentPhase === 'summary' && (
                  <Badge variant="secondary" className="text-xs">Summary</Badge>
                )}
              </div>
            </div>
            
            {/* Content area with proper overflow */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {renderPhase()}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Work Item Detail Panel */}
      {selectedWorkItem && (
        <WorkItemPanel
          isOpen={!!selectedWorkItem}
          onClose={() => {
            setSelectedWorkItem(null);
            // Refresh work items when panel closes to get latest updates
            queryClient.invalidateQueries({ queryKey: [`/api/work-items?targetMeetingId=${meeting?.id}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/work-items?teamId=${meeting?.teamId}`] });
            queryClient.invalidateQueries({ queryKey: ['/api/strategy/key-result-tasks'] });
          }}
          mode="view"
          workItemId={selectedWorkItem.id}
          workItem={selectedWorkItem}
          onOpenKeyResult={handleOpenKeyResult}
        />
      )}
      
      {/* Key Result Detail Panel */}
      <KeyResultDetailPanel
        keyResultId={selectedKeyResultId}
        open={isKeyResultPanelOpen}
        onClose={() => {
          setIsKeyResultPanelOpen(false);
          setSelectedKeyResultId(null);
        }}
        initialTab="details"
      />
    </>
  );
}