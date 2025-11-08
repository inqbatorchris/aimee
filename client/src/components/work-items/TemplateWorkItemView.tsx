import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Filter, MoreVertical, FileText, Calendar, User, Users, AlertCircle, ListChecks } from 'lucide-react';
import { useQuery as useReactQuery } from '@tanstack/react-query';
import { WorkflowProgressBadge } from './WorkflowProgressBadge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
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
import WorkItemPanel from './WorkItemPanel';
import {
  WorkItem,
  WorkItemFilters,
  fetchWorkItems,
  bulkUpdateWorkItems,
  updateWorkItem,
  deleteWorkItem,
  fetchActiveUsers,
} from '@/lib/workItems.api';
import { apiRequest } from '@/lib/queryClient';

const ORG_TZ = 'Europe/London';

function formatInOrgTz(dateISO: string | Date): string {
  const d = typeof dateISO === 'string' ? new Date(dateISO) : dateISO;
  const base: Intl.DateTimeFormatOptions = { timeZone: ORG_TZ, year: 'numeric', month: 'short', day: '2-digit' };
  return new Intl.DateTimeFormat('en-GB', base).format(d);
}

// Component to fetch and display workflow progress for a work item
function WorkflowProgressCell({ workItemId }: { workItemId: number }) {
  // Use full URL path in queryKey[0] so default fetcher uses it directly
  const { data: steps = [] } = useQuery<any[]>({
    queryKey: [`/api/work-items/${workItemId}/workflow/steps`],
    staleTime: 30000, // Cache for 30 seconds
  });

  if (steps.length === 0) {
    return <span className="text-[11px] text-gray-400">-</span>;
  }

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  return <WorkflowProgressBadge completedSteps={completedSteps} totalSteps={steps.length} />;
}

const STATUS_OPTIONS = [
  { value: 'Planning', label: 'Planning', color: 'bg-gray-100 text-gray-700' },
  { value: 'Ready', label: 'Ready', color: 'bg-blue-100 text-blue-700' },
  { value: 'In Progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'Stuck', label: 'Stuck', color: 'bg-red-100 text-red-700' },
  { value: 'Completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
  { value: 'Archived', label: 'Archived', color: 'bg-gray-100 text-gray-500' },
];

interface TemplateWorkItemViewProps {
  templateId: string;
}

export default function TemplateWorkItemView({ templateId }: TemplateWorkItemViewProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch template metadata
  const { data: template, isLoading: templateLoading, error: templateError } = useQuery<any>({
    queryKey: ['/api/workflows/templates', templateId],
    queryFn: async () => {
      const response = await apiRequest(`/api/workflows/templates/${templateId}`);
      if (!response.ok) {
        throw new Error('Failed to load template');
      }
      return response.json();
    },
  });

  // Panel state for creating/viewing/editing
  const [panelState, setPanelState] = useState<{ mode: 'create' | 'view' | 'edit' | null; id?: number }>({ mode: null });

  // Selected items for bulk operations
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });

  // Build filters from template defaults
  const [filters, setFilters] = useState<WorkItemFilters>({});

  // Apply template default filters when template loads
  useEffect(() => {
    if (template?.defaultFilters) {
      setFilters(template.defaultFilters);
    }
  }, [template]);

  // Fetch users for assignee filter
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/work-items/users'],
    queryFn: fetchActiveUsers,
  });

  // Fetch work items with template filter
  const workItemFilters: WorkItemFilters = {
    ...filters,
    workItemType: templateId, // Filter by template ID
  };

  const { data: workItems = [], isLoading: workItemsLoading } = useQuery<WorkItem[]>({
    queryKey: ['/api/work-items', templateId, workItemFilters],
    queryFn: () => fetchWorkItems(workItemFilters),
  });

  // Use filtered work items directly from API
  const filteredWorkItems = workItems;

  // Get visible columns from template metadata
  const visibleColumns = template?.tableColumns || {
    status: true,
    due: true,
    assignee: true,
    team: true,
    updated: true,
  };

  // Panel handlers
  const openPanel = (mode: 'create' | 'view' | 'edit', id?: number) => {
    setPanelState({ mode, id });
  };

  const closePanel = () => {
    setPanelState({ mode: null });
    queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredWorkItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: bulkUpdateWorkItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      setSelectedItems(new Set());
      toast({ title: 'Work items updated successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error updating work items', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteWorkItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      setDeleteDialog({ open: false, id: null });
      toast({ title: 'Work item deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error deleting work item', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  // Status update mutation
  const statusUpdateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      updateWorkItem(id, { status: status as WorkItem['status'] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
    },
  });

  if (templateLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading template...</div>
      </div>
    );
  }

  if (templateError || !template) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium mb-2">Template Not Found</h3>
        <p className="text-gray-500">The requested workflow template could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{template.menuLabel || template.name}</h1>
            {template.description && (
              <p className="text-sm text-gray-500 mt-1">{template.description}</p>
            )}
          </div>
          <Button 
            onClick={() => openPanel('create')} 
            size="sm"
            data-testid="button-create-work-item"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create {template.menuLabel || 'Work Item'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex gap-3 items-center">
          <Filter className="h-4 w-4 text-gray-500" />
          
          {/* Status filter */}
          <Select
            value={filters.status?.join(',') || 'all'}
            onValueChange={(value) => {
              setFilters(prev => ({
                ...prev,
                status: value === 'all' ? [] : value.split(','),
              }));
            }}
          >
            <SelectTrigger className="w-[180px] h-8" data-testid="select-status-filter">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assignee filter */}
          <Select
            value={filters.assigneeId?.toString() || 'all'}
            onValueChange={(value) => {
              setFilters(prev => ({
                ...prev,
                assigneeId: value === 'all' ? undefined : parseInt(value),
              }));
            }}
          >
            <SelectTrigger className="w-[180px] h-8" data-testid="select-assignee-filter">
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {users.map((user: any) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.fullName || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Bulk actions */}
          {selectedItems.size > 0 && (
            <div className="ml-auto flex gap-2 items-center">
              <span className="text-sm text-gray-600">{selectedItems.size} selected</span>
              <Select
                onValueChange={(status) => {
                  bulkUpdateMutation.mutate({
                    ids: Array.from(selectedItems),
                    set: { status: status as WorkItem['status'] },
                  });
                }}
              >
                <SelectTrigger className="w-[140px] h-8" data-testid="select-bulk-status">
                  <SelectValue placeholder="Set Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardContent className="p-0">
            {workItemsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading work items...</div>
              </div>
            ) : filteredWorkItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No work items found</h3>
                <p className="text-gray-500 mb-4">Start by creating your first {template.menuLabel || 'work item'}</p>
                <Button onClick={() => openPanel('create')} data-testid="button-create-first">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First {template.menuLabel || 'Work Item'}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow className="border-b border-gray-200 bg-gray-50">
                    <TableHead className="text-[11px] text-gray-600 font-normal py-1 px-1 w-12 border-r border-gray-100">
                      <Checkbox
                        checked={filteredWorkItems.length > 0 && selectedItems.size === filteredWorkItems.length}
                        onCheckedChange={handleSelectAll}
                        className="scale-75"
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead className="text-[11px] text-gray-600 font-normal py-1 px-2 border-r border-gray-100">Title</TableHead>
                    <TableHead className="text-[11px] text-gray-600 font-normal py-1 px-2 w-[180px] border-r border-gray-100">
                      <div className="flex items-center gap-1">
                        <ListChecks className="h-3 w-3" />
                        <span>Progress</span>
                      </div>
                    </TableHead>
                    {visibleColumns.status && <TableHead className="text-[11px] text-gray-600 font-normal py-1 px-1 w-[100px] border-r border-gray-100">Status</TableHead>}
                    {visibleColumns.due && <TableHead className="text-[11px] text-gray-600 font-normal py-1 px-1 w-[100px] border-r border-gray-100">Due</TableHead>}
                    {visibleColumns.assignee && <TableHead className="text-[11px] text-gray-600 font-normal py-1 px-1 w-[120px] border-r border-gray-100">Assignee</TableHead>}
                    {visibleColumns.team && <TableHead className="text-[11px] text-gray-600 font-normal py-1 px-1 w-[100px] border-r border-gray-100">Team</TableHead>}
                    {visibleColumns.updated && <TableHead className="text-[11px] text-gray-600 font-normal py-1 px-1 w-[100px] border-r border-gray-100">Updated</TableHead>}
                    <TableHead className="w-6 py-1 px-1"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkItems.map((item) => {
                    const statusOption = STATUS_OPTIONS.find(opt => opt.value === item.status);
                    
                    return (
                      <TableRow 
                        key={item.id} 
                        className="hover:bg-gray-50/30 border-b border-gray-100 cursor-pointer"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button, [role="button"], [role="combobox"]')) return;
                          openPanel('view', item.id);
                        }}
                        data-testid={`row-work-item-${item.id}`}
                      >
                        <TableCell className="py-1 px-1 border-r border-gray-100" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                            className="scale-75"
                            data-testid={`checkbox-select-${item.id}`}
                          />
                        </TableCell>
                        <TableCell className="py-1 px-2 border-r border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs" data-testid={`text-title-${item.id}`}>{item.title}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2 border-r border-gray-100">
                          {item.workflowTemplateId && <WorkflowProgressCell workItemId={item.id} />}
                        </TableCell>
                        {visibleColumns.status && (
                          <TableCell className="py-1 px-1 border-r border-gray-100" onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={item.status}
                              onValueChange={(value) => statusUpdateMutation.mutate({ id: item.id, status: value })}
                            >
                              <SelectTrigger className="h-5 text-[11px] border-0 p-0 shadow-none" data-testid={`select-status-${item.id}`}>
                                <Badge variant="outline" className={`${statusOption?.color} text-[10px] px-1 py-0`}>
                                  {item.status}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                        {visibleColumns.due && (
                          <TableCell className="py-1 px-1 border-r border-gray-100">
                            <span className="text-[11px] text-gray-600" data-testid={`text-due-${item.id}`}>
                              {item.dueDate ? formatInOrgTz(item.dueDate) : '-'}
                            </span>
                          </TableCell>
                        )}
                        {visibleColumns.assignee && (
                          <TableCell className="py-1 px-1 border-r border-gray-100">
                            <span className="text-[11px] text-gray-600" data-testid={`text-assignee-${item.id}`}>
                              {item.assignee?.fullName || '-'}
                            </span>
                          </TableCell>
                        )}
                        {visibleColumns.team && (
                          <TableCell className="py-1 px-1 border-r border-gray-100">
                            <span className="text-[11px] text-gray-600" data-testid={`text-team-${item.id}`}>
                              {item.team?.name || '-'}
                            </span>
                          </TableCell>
                        )}
                        {visibleColumns.updated && (
                          <TableCell className="py-1 px-1 border-r border-gray-100">
                            <span className="text-[11px] text-gray-600" data-testid={`text-updated-${item.id}`}>
                              {formatInOrgTz(item.updatedAt)}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="py-1 px-1" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" data-testid={`button-actions-${item.id}`}>
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openPanel('view', item.id)} data-testid={`menuitem-view-${item.id}`}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openPanel('edit', item.id)} data-testid={`menuitem-edit-${item.id}`}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setDeleteDialog({ open: true, id: item.id })}
                                className="text-red-600"
                                data-testid={`menuitem-delete-${item.id}`}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Work Item Panel */}
      <WorkItemPanel
        isOpen={panelState.mode !== null}
        onClose={closePanel}
        mode={panelState.mode || 'view'}
        workItemId={panelState.id}
        initialData={
          panelState.mode === 'create' 
            ? { 
                workflowTemplateId: templateId,
                workItemType: templateId,
                workflowSource: 'template',
                workflowMetadata: {
                  templateName: template.name,
                  category: template.category,
                },
              } 
            : undefined
        }
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this work item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.id && deleteMutation.mutate(deleteDialog.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
