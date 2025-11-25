import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, RefreshCw, Eye, Loader2, Check, X, Settings, Filter, GripVertical, ArrowUpDown, Wrench, FileText, Activity, User, Bot, Pencil, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { createWorkItem } from '@/lib/workItems.api';
import WorkItemPanel from '@/components/work-items/WorkItemPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Progress } from '@/components/ui/progress';

interface AddressRecord {
  id: number;
  airtableRecordId: string;
  airtableConnectionId: number;
  // Real searchable Airtable columns
  postcode?: string | null;
  summary?: string | null;
  address?: string | null;
  premise?: string | null;
  network?: string | null;
  udprn?: string | null;
  statusId?: string | null;
  // OCR extracted columns
  routerSerial?: string | null;
  routerMac?: string | null;
  routerModel?: string | null;
  onuSerial?: string | null;
  onuMac?: string | null;
  onuModel?: string | null;
  // Local fields
  localStatus?: string;
  localNotes?: string;
  workItemCount: number;
  lastWorkItemDate?: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
  workItemCounts?: {
    pending: number;
    completed: number;
    total: number;
  };
  workItems?: Array<{
    id: number;
    title: string;
    status: string;
    assignedTo?: number;
    dueDate?: string;
  }>;
}

interface SyncLog {
  id: number;
  organizationId: number;
  airtableConnectionId: number;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsTotal: number;
  status: string;
  errorMessage?: string;
  initiatedBy?: number;
}

function SortableColumnItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center space-x-2 py-1">
      <div {...attributes} {...listeners} className="cursor-move">
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>
      {children}
    </div>
  );
}

// Helper function to format tariff values for display
function formatTariffValue(tariffValue: any): string {
  if (!tariffValue) return '';
  
  // Handle array of objects
  if (Array.isArray(tariffValue)) {
    return tariffValue.map(item => {
      if (typeof item === 'object' && item !== null) {
        return item.name || item.label || item.title || JSON.stringify(item);
      }
      return String(item);
    }).join(', ');
  }
  
  // Handle single object
  if (typeof tariffValue === 'object' && tariffValue !== null) {
    return tariffValue.name || tariffValue.label || tariffValue.title || JSON.stringify(tariffValue);
  }
  
  // Handle string or primitive
  return String(tariffValue);
}

// Activity Log Component
function AddressActivityLog({ addressId }: { addressId: number }) {
  const { data: activitiesData, isLoading } = useQuery<{ activities: any[] }>({
    queryKey: ['/api/addresses', addressId, 'activity'],
  });

  const activities = activitiesData?.activities || [];

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-gray-500 mt-2">Loading activity...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No activity recorded yet</p>
        <p className="text-xs mt-2">Actions like viewing, status changes, and work item creation will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity: any) => (
        <Card key={activity.id} className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {activity.actionType === 'status_change' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
              )}
              {activity.actionType === 'creation' && (
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-green-600" />
                </div>
              )}
              {activity.actionType === 'assignment' && (
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-purple-600" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{activity.description}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(activity.createdAt).toLocaleString()}
              </p>
              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  {activity.metadata.previousStatus && activity.metadata.newStatus && (
                    <p>Changed from "{activity.metadata.previousStatus}" to "{activity.metadata.newStatus}"</p>
                  )}
                  {activity.metadata.action && (
                    <p>Action: {activity.metadata.action}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function Addresses() {
  const { toast } = useToast();
  const [selectedAddress, setSelectedAddress] = useState<AddressRecord | null>(null);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterHasWorkItems, setFilterHasWorkItems] = useState<string>('all'); // all, with, without
  const [filterNetwork, setFilterNetwork] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterResolvedStatus, setFilterResolvedStatus] = useState<string>('all');
  const [filterTariff, setFilterTariff] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced filter state
  interface AdvancedFilter {
    id: string;
    field: string;
    operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'not_equals' | 'is_empty' | 'not_empty';
    value: string;
  }
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilter[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('addresses');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Bulk selection and work item creation
  const [selectedAddresses, setSelectedAddresses] = useState<number[]>([]);
  const [showWorkItemDialog, setShowWorkItemDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [workItemAssignee, setWorkItemAssignee] = useState<string>('unassigned');
  const [workItemTeam, setWorkItemTeam] = useState<string>('');
  const [workItemDueDate, setWorkItemDueDate] = useState<string>('');
  const [isCreatingWorkItems, setIsCreatingWorkItems] = useState(false);
  
  // Column widths state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState<number>(0);
  const [resizeStartWidth, setResizeStartWidth] = useState<number>(0);
  
  // Equipment editing state
  const [isEditingEquipment, setIsEditingEquipment] = useState(false);
  const [equipmentEditValues, setEquipmentEditValues] = useState<Record<string, string>>({});
  const [savingField, setSavingField] = useState<string | null>(null);
  
  // Reset equipment editing state when selected address changes
  useEffect(() => {
    setIsEditingEquipment(false);
    setEquipmentEditValues({});
    setSavingField(null);
  }, [selectedAddress?.id]);
  
  // Storage keys for persistence
  const STORAGE_KEY_VISIBLE = 'addresses_visible_columns';
  const STORAGE_KEY_ORDER = 'addresses_column_order';
  const STORAGE_KEY_WIDTHS = 'addresses_column_widths';
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Fetch addresses with work items
  const { data: addressesData, isLoading } = useQuery<{ addresses: AddressRecord[] }>({
    queryKey: ['/api/addresses', { includeWorkItems: true }],
    queryFn: async () => {
      const response = await fetch('/api/addresses?includeWorkItems=true', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }
      return response.json();
    },
  });
  
  const addresses: AddressRecord[] = addressesData?.addresses || [];
  
  // Fetch Airtable connections
  const { data: connectionsData } = useQuery<{ connections: any[] }>({
    queryKey: ['/api/airtable/connections'],
  });
  
  const connections = connectionsData?.connections || [];
  const connectionId = connections.find((c: any) => c.tableName === 'address')?.id || null;
  
  // Fetch sync logs
  const { data: syncLogsData, refetch: refetchSyncLogs } = useQuery<{ logs: SyncLog[] }>({
    queryKey: ['/api/addresses/sync-logs', connectionId],
    enabled: activeTab === 'sync-logs' && !!connectionId,
  });
  
  const syncLogs: SyncLog[] = syncLogsData?.logs || [];
  const latestSyncLog = syncLogs[0];
  
  // Fetch workflow templates for work item creation
  const { data: templates } = useQuery<any[]>({
    queryKey: ['/api/workflows/templates'],
  });
  
  // Fetch users for assignee selection
  const { data: users } = useQuery<any[]>({
    queryKey: ['/api/work-items/users'],
  });
  
  // Fetch detailed address data when an address is selected
  const { data: addressDetailData, isLoading: isLoadingAddressDetail } = useQuery<{
    address: AddressRecord;
  }>({
    queryKey: [`/api/addresses/${selectedAddress?.id}`],
    enabled: !!selectedAddress?.id,
  });
  
  // Poll for sync progress
  useEffect(() => {
    if (latestSyncLog?.status === 'in_progress') {
      const interval = setInterval(() => {
        refetchSyncLogs();
        queryClient.invalidateQueries({ queryKey: ['/api/addresses'] });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [latestSyncLog?.status, refetchSyncLogs]);
  
  // Update sync progress from latest log
  useEffect(() => {
    if (latestSyncLog?.status === 'in_progress') {
      const current = (latestSyncLog.recordsCreated || 0) + (latestSyncLog.recordsUpdated || 0);
      const total = addresses.length; // Use current count as approximation
      setSyncProgress({ current, total });
    } else {
      setSyncProgress(null);
    }
  }, [latestSyncLog, addresses.length]);
  
  // Fetch available columns dynamically from backend
  const { data: columnMetadata, isLoading: isLoadingColumns } = useQuery<{
    columns: Array<{ key: string; category: string; label: string }>;
  }>({
    queryKey: ['/api/addresses/metadata/columns'],
  });
  
  // Parse column metadata into categories
  const airtableColumns = useMemo(() => {
    return columnMetadata?.columns
      ?.filter((col: any) => col.category === 'airtable')
      ?.map((col: any) => col.key) || [];
  }, [columnMetadata]);
  
  const ocrColumns = useMemo(() => {
    return columnMetadata?.columns
      ?.filter((col: any) => col.category === 'ocr')
      ?.map((col: any) => col.key) || [];
  }, [columnMetadata]);
  
  // System columns (local-only fields)
  const systemColumns = ['localStatus', 'workItems'];
  
  // All available columns
  const allColumns = useMemo(() => {
    return [...airtableColumns, ...ocrColumns, ...systemColumns];
  }, [airtableColumns, ocrColumns]);
  
  // Initialize column order and visibility with first 6 Airtable columns + system columns
  useEffect(() => {
    // Skip if columns haven't loaded yet or already initialized with same columns
    if (allColumns.length === 0) return;
    
    // Check if we need to reinitialize (columns changed or not yet initialized)
    const needsInit = columnOrder.length === 0 || columnOrder.length !== allColumns.length;
    if (!needsInit) return;
    
    // Try to load from localStorage first
    const savedOrder = localStorage.getItem(STORAGE_KEY_ORDER);
    const savedVisible = localStorage.getItem(STORAGE_KEY_VISIBLE);
    const savedWidths = localStorage.getItem(STORAGE_KEY_WIDTHS);
    
    if (savedOrder && savedVisible) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        const parsedVisible = JSON.parse(savedVisible);
        
        // Validate that saved columns are still valid (in case schema changed)
        const validOrder = parsedOrder.filter((col: string) => allColumns.includes(col));
        const newColumns = allColumns.filter(col => !validOrder.includes(col));
        const finalOrder = [...validOrder, ...newColumns];
        
        setColumnOrder(finalOrder);
        setVisibleColumns(new Set(parsedVisible.filter((col: string) => allColumns.includes(col))));
        
        // Load column widths
        if (savedWidths) {
          try {
            const parsedWidths = JSON.parse(savedWidths);
            setColumnWidths(parsedWidths);
          } catch (e) {
            console.error('Error loading column widths:', e);
          }
        }
        
        console.log('Loaded saved column preferences:', {
          total: allColumns.length,
          visible: parsedVisible.length,
          order: finalOrder.length
        });
        return;
      } catch (error) {
        console.error('Error loading saved column preferences:', error);
      }
    }
    
    // Default initialization if no saved preferences
    const defaultOrder = [...allColumns];
    setColumnOrder(defaultOrder);
    
    const defaultVisible = new Set([
      ...airtableColumns.slice(0, Math.min(6, airtableColumns.length)),
      ...systemColumns
    ]);
    setVisibleColumns(defaultVisible);
    
    // Save defaults to localStorage
    localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(defaultOrder));
    localStorage.setItem(STORAGE_KEY_VISIBLE, JSON.stringify(Array.from(defaultVisible)));
    
    console.log('Initialized columns with defaults:', {
      total: allColumns.length,
      visible: defaultVisible.size,
      airtable: airtableColumns.length
    });
  }, [allColumns.length]);
  
  // Get ordered visible columns
  const orderedVisibleColumns = useMemo(() => {
    return columnOrder.filter(col => visibleColumns.has(col));
  }, [columnOrder, visibleColumns]);
  
  // Sync from Airtable mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!connectionId) {
        throw new Error('No Airtable connection found');
      }
      const response = await fetch(`/api/airtable/connections/${connectionId}/sync-addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Sync failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      const { addresses: stats, warnings } = data;
      
      // Build description with warnings if present
      let description = `✅ ${stats.created} created, ${stats.updated} updated from ${stats.total} total records`;
      
      if (warnings && warnings.length > 0) {
        description += '\n\n⚠️ ' + warnings.join('\n⚠️ ');
      }
      
      toast({
        title: warnings && warnings.length > 0 ? 'Sync Complete (with warnings)' : 'Sync Complete',
        description,
        duration: warnings && warnings.length > 0 ? 10000 : 5000, // Longer duration if there are warnings
      });
      queryClient.invalidateQueries({ queryKey: ['/api/addresses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/addresses/sync-logs'] });
      setSyncProgress(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/addresses/sync-logs'] });
      setSyncProgress(null);
    },
  });
  
  // Equipment field update mutation
  const updateEquipmentMutation = useMutation({
    mutationFn: async ({ addressId, fieldName, value }: { addressId: number; fieldName: string; value: string }) => {
      const response = await fetch(`/api/addresses/${addressId}/equipment-data`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fieldName, value }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update field');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Field Updated',
        description: data.message || 'Equipment field updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/addresses'] });
      queryClient.invalidateQueries({ queryKey: [`/api/addresses/${variables.addressId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/addresses/${variables.addressId}/activity`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSyncClick = () => {
    setShowSyncConfirm(true);
  };
  
  const handleSyncConfirm = () => {
    setShowSyncConfirm(false);
    syncMutation.mutate();
    // Switch to sync logs tab to watch progress
    setActiveTab('sync-logs');
  };
  
  // Export CSV handler
  const handleExport = () => {
    if (!connectionId) {
      toast({
        title: 'Export Failed',
        description: 'No addresses found to export',
        variant: 'destructive',
      });
      return;
    }
    window.location.href = `/api/airtable/connections/${connectionId}/export-addresses-csv`;
    toast({
      title: 'Export Started',
      description: 'Your CSV file will download shortly',
    });
  };
  
  // Bulk work item creation using standard work items API
  const handleCreateWorkItems = async () => {
    if (!selectedTemplate) {
      toast({
        title: 'Template Required',
        description: 'Please select a workflow template',
        variant: 'destructive',
      });
      return;
    }
    
    const template = templates?.find((t: any) => t.id === selectedTemplate);
    if (!template) {
      toast({
        title: 'Template Not Found',
        description: 'Selected template could not be found',
        variant: 'destructive',
      });
      return;
    }
    
    // Get addresses to process
    const addressesToProcess = addresses.filter(a => selectedAddresses.includes(a.id));
    
    if (addressesToProcess.length === 0) return;
    
    setIsCreatingWorkItems(true);
    try {
      // Create work items for all selected addresses
      const promises = addressesToProcess.map(address => {
        // Extract useful address info - prioritize summary (full address)
        const addressName = address.summary || 
                           address.address || 
                           address.premise || 
                           `Address ${address.id}`;
        
        const workItemData = {
          title: addressName,
          description: `${template.name} work item for ${addressName}`,
          status: 'Planning' as const,
          assignedTo: workItemAssignee && workItemAssignee !== 'unassigned' ? parseInt(workItemAssignee) : undefined,
          teamId: workItemTeam ? parseInt(workItemTeam) : undefined,
          dueDate: workItemDueDate || undefined,
          workflowTemplateId: template.id,
          workflowSource: 'manual',
          workItemType: template.id,
          workflowMetadata: {
            templateName: template.name,
            templateCategory: template.category || 'Address Management',
            addressRecordId: address.id,
            airtableRecordId: address.airtableRecordId,
            addressData: {
              name: addressName,
              summary: address.summary,
              address: address.address,
              premise: address.premise,
              postcode: address.postcode,
              network: address.network,
            },
          },
        };
        return createWorkItem(workItemData);
      });

      await Promise.all(promises);
      
      toast({
        title: 'Success',
        description: `${addressesToProcess.length} work item${addressesToProcess.length > 1 ? 's' : ''} created successfully`,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/addresses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      setShowWorkItemDialog(false);
      setSelectedTemplate('');
      setWorkItemAssignee('unassigned');
      setWorkItemTeam('');
      setWorkItemDueDate('');
      setSelectedAddresses([]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create work item(s)',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingWorkItems(false);
    }
  };
  
  // Filter addresses based on search and filters
  const filteredAddresses = useMemo(() => {
    return addresses.filter(addr => {
      // Search across all searchable real columns
      const searchableFields = [
        addr.postcode,
        addr.summary,
        addr.address,
        addr.premise,
        addr.network,
        addr.udprn,
        addr.statusId,
        addr.routerSerial,
        addr.routerMac,
        addr.routerModel,
        addr.onuSerial,
        addr.onuMac,
        addr.onuModel,
        addr.localStatus,
      ].filter(Boolean);
      
      const searchMatch = searchTerm === '' || 
        searchableFields.some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const statusMatch = filterStatus === 'all' || addr.localStatus === filterStatus;
      
      // Filter by work items
      const hasWorkItems = (addr.workItemCounts?.total || 0) > 0;
      const workItemsMatch = filterHasWorkItems === 'all' ||
        (filterHasWorkItems === 'with' && hasWorkItems) ||
        (filterHasWorkItems === 'without' && !hasWorkItems);
      
      // Filter by network (using real column)
      const networkMatch = filterNetwork === 'all' || (addr.network === filterNetwork);
      
      // Disable legacy airtableFields-based filters
      const cityMatch = true; // Legacy filter disabled
      const resolvedStatusMatch = true; // Legacy filter disabled
      const tariffMatch = true; // Legacy filter disabled
      
      // Apply advanced filters (using real columns)
      const advancedFilterMatch = advancedFilters.every(filter => {
        const fieldValue = (addr as any)[filter.field];
        const valueStr = fieldValue !== undefined && fieldValue !== null ? String(fieldValue).toLowerCase() : '';
        const filterValueStr = filter.value.toLowerCase();
        
        switch (filter.operator) {
          case 'equals':
            return valueStr === filterValueStr;
          case 'not_equals':
            return valueStr !== filterValueStr;
          case 'contains':
            return valueStr.includes(filterValueStr);
          case 'starts_with':
            return valueStr.startsWith(filterValueStr);
          case 'ends_with':
            return valueStr.endsWith(filterValueStr);
          case 'is_empty':
            return !valueStr;
          case 'not_empty':
            return !!valueStr;
          default:
            return true;
        }
      });
      
      return searchMatch && statusMatch && workItemsMatch && networkMatch && cityMatch && resolvedStatusMatch && tariffMatch && advancedFilterMatch;
    });
  }, [addresses, searchTerm, filterStatus, filterHasWorkItems, filterNetwork, filterCity, filterResolvedStatus, filterTariff, advancedFilters]);
  
  // Pagination
  const totalPages = Math.ceil(filteredAddresses.length / itemsPerPage);
  const paginatedAddresses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAddresses.slice(startIndex, endIndex);
  }, [filteredAddresses, currentPage, itemsPerPage]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterHasWorkItems, filterNetwork, filterCity, filterResolvedStatus, filterTariff, advancedFilters]);
  
  // Extract unique values for filters
  const uniqueStatuses = Array.from(new Set(
    addresses.map(a => a.localStatus).filter(Boolean)
  )).sort();
  
  const uniqueNetworks = Array.from(new Set(
    addresses.map(a => a.network).filter(Boolean)
  )).sort();
  
  // Legacy filters disabled - using simple network filter only
  const uniqueCities: string[] = [];
  const uniqueResolvedStatuses: string[] = [];
  const uniqueTariffs: string[] = [];
  
  // Check if any filters are active
  const hasActiveFilters = filterStatus !== 'all' || filterHasWorkItems !== 'all' || 
    filterNetwork !== 'all' || filterCity !== 'all' || 
    filterResolvedStatus !== 'all' || filterTariff !== 'all';
  
  // Clear all filters
  const handleClearFilters = () => {
    setFilterStatus('all');
    setFilterHasWorkItems('all');
    setFilterNetwork('all');
    setFilterCity('all');
    setFilterResolvedStatus('all');
    setFilterTariff('all');
  };
  
  const toggleColumn = (column: string) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(column)) {
      newVisible.delete(column);
    } else {
      newVisible.add(column);
    }
    setVisibleColumns(newVisible);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY_VISIBLE, JSON.stringify(Array.from(newVisible)));
  };
  
  // Column resize handlers
  const handleResizeStart = (column: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(column);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[column] || 150); // Default width 150px
  };
  
  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingColumn) return;
    
    const diff = e.clientX - resizeStartX;
    const newWidth = Math.max(80, resizeStartWidth + diff); // Minimum width 80px
    
    setColumnWidths(prev => {
      const updated = { ...prev, [resizingColumn]: newWidth };
      localStorage.setItem(STORAGE_KEY_WIDTHS, JSON.stringify(updated));
      return updated;
    });
  };
  
  const handleResizeEnd = () => {
    setResizingColumn(null);
  };
  
  // Add/remove resize event listeners
  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingColumn, resizeStartX, resizeStartWidth]);
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Save to localStorage
        localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(newOrder));
        
        return newOrder;
      });
    }
  };
  
  const getColumnDisplayName = (column: string) => {
    if (column === 'localStatus') return 'Local Status';
    if (column === 'workItems') return 'Work Items';
    return column;
  };
  
  const getCellValue = (addr: AddressRecord, column: string) => {
    if (column === 'localStatus') {
      return addr.localStatus ? (
        <Badge variant="secondary">{addr.localStatus}</Badge>
      ) : '-';
    }
    if (column === 'workItems') {
      // Display individual work items as clickable chips
      if (addr.workItems && addr.workItems.length > 0) {
        const displayItems = addr.workItems.slice(0, 3); // Show max 3
        const remaining = addr.workItems.length - 3;
        
        return (
          <div className="flex flex-wrap gap-1">
            {displayItems.map((item) => (
              <Badge
                key={item.id}
                variant={item.status === 'Completed' ? 'secondary' : 'default'}
                className="cursor-pointer hover:bg-opacity-80 text-xs truncate max-w-[150px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedWorkItemId(item.id);
                }}
                title={`${item.title} (${item.status})`}
                data-testid={`badge-work-item-${item.id}`}
              >
                {item.title}
              </Badge>
            ))}
            {remaining > 0 && (
              <Badge variant="outline" className="text-xs">
                +{remaining} more
              </Badge>
            )}
          </div>
        );
      }
      return <span className="text-gray-400">0</span>;
    }
    
    // For all other columns, get value from real database columns
    const value = (addr as any)[column];
    return value !== undefined && value !== null ? String(value) : '-';
  };
  
  const getCellValueAsString = (addr: AddressRecord, column: string): string => {
    if (column === 'localStatus') {
      return addr.localStatus || '-';
    }
    if (column === 'workItems') {
      if (addr.workItemCounts && addr.workItemCounts.total > 0) {
        return `${addr.workItemCounts.total} work items${addr.workItemCounts.pending > 0 ? ` (${addr.workItemCounts.pending} pending)` : ''}`;
      }
      return '0';
    }
    
    // For all other columns, get value from real database columns
    const value = (addr as any)[column];
    return value !== undefined && value !== null ? String(value) : '-';
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-4 max-w-full overflow-hidden">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Address Records</h1>
        <div className="flex gap-2">
          <Button 
            onClick={handleExport}
            variant="outline"
            disabled={addresses.length === 0}
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            onClick={handleSyncClick}
            disabled={syncMutation.isPending || !connectionId || latestSyncLog?.status === 'in_progress'}
            size="icon"
            data-testid="button-sync-airtable"
            title="Sync from Airtable"
          >
            {syncMutation.isPending || latestSyncLog?.status === 'in_progress' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Sync Progress Indicator */}
      {latestSyncLog?.status === 'in_progress' && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span className="font-medium text-blue-700">Sync in Progress</span>
              </div>
              <span className="text-sm text-blue-600">
                {addresses.length.toLocaleString()} records synced
              </span>
            </div>
            <Progress value={50} className="h-2" />
            <p className="text-xs text-blue-600">
              Fetching and processing records from Airtable... This may take a few minutes for large datasets.
            </p>
          </div>
        </Card>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="addresses">
            Addresses
            {latestSyncLog?.status === 'in_progress' && (
              <Loader2 className="w-3 h-3 ml-1 animate-spin" />
            )}
          </TabsTrigger>
          <TabsTrigger value="sync-logs">
            Sync Logs
            {latestSyncLog?.status === 'in_progress' && (
              <Badge variant="default" className="ml-2 bg-blue-500">Live</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="addresses" className="space-y-4">
          {/* Search and Filters Bar */}
          <Card className="p-4">
            <div className="flex gap-3 items-center flex-wrap">
              {/* Search Box */}
              <div className="flex-1 min-w-[250px]">
                <Input
                  placeholder="Search all fields..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9"
                  data-testid="input-search"
                />
              </div>
              
              {/* Filters Button */}
              <Button
                variant={hasActiveFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-9"
                data-testid="button-toggle-filters"
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {hasActiveFilters && (
                  <Badge className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-white text-primary">
                    {(filterStatus !== 'all' ? 1 : 0) + 
                     (filterHasWorkItems !== 'all' ? 1 : 0) + 
                     (filterNetwork !== 'all' ? 1 : 0) +
                     (filterCity !== 'all' ? 1 : 0) +
                     (filterResolvedStatus !== 'all' ? 1 : 0) +
                     (filterTariff !== 'all' ? 1 : 0)}
                  </Badge>
                )}
              </Button>
              
              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-9"
                  data-testid="button-clear-filters"
                >
                  Clear
                </Button>
              )}
              
              {/* Column Settings */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9" title="Column Settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Columns ({orderedVisibleColumns.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96">
                  <div className="space-y-2">
                    <h4 className="font-medium">Column Settings</h4>
                    <p className="text-xs text-gray-500">
                      {allColumns.length} total columns • Drag to reorder
                    </p>
                    <ScrollArea className="h-96">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={columnOrder}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-1 pr-4">
                            {columnOrder.map(col => (
                              <SortableColumnItem key={col} id={col}>
                                <Checkbox
                                  id={`col-${col}`}
                                  checked={visibleColumns.has(col)}
                                  onCheckedChange={() => toggleColumn(col)}
                                />
                                <label 
                                  htmlFor={`col-${col}`} 
                                  className="text-sm flex-1 cursor-pointer"
                                >
                                  {getColumnDisplayName(col)}
                                </label>
                              </SortableColumnItem>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Expandable Filter Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg border mt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Local Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-9" data-testid="select-filter-status">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {uniqueStatuses.map(status => (
                        <SelectItem key={status} value={status!}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Work Items</Label>
                  <Select value={filterHasWorkItems} onValueChange={setFilterHasWorkItems}>
                    <SelectTrigger className="h-9" data-testid="select-filter-work-items">
                      <SelectValue placeholder="All Addresses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Addresses</SelectItem>
                      <SelectItem value="with">With Work Items</SelectItem>
                      <SelectItem value="without">Without Work Items</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Network</Label>
                  <Select value={filterNetwork} onValueChange={setFilterNetwork}>
                    <SelectTrigger className="h-9" data-testid="select-filter-network">
                      <SelectValue placeholder="All Networks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Networks</SelectItem>
                      {uniqueNetworks.map(network => (
                        <SelectItem key={network} value={network!}>
                          {network}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">City</Label>
                  <Select value={filterCity} onValueChange={setFilterCity}>
                    <SelectTrigger className="h-9" data-testid="select-filter-city">
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {uniqueCities.map(city => (
                        <SelectItem key={city} value={city!}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">RAG Status</Label>
                  <Select value={filterResolvedStatus} onValueChange={setFilterResolvedStatus}>
                    <SelectTrigger className="h-9" data-testid="select-filter-resolved-status">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {uniqueResolvedStatuses.map(status => (
                        <SelectItem key={status} value={status!}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tariff</Label>
                  <Select value={filterTariff} onValueChange={setFilterTariff}>
                    <SelectTrigger className="h-9" data-testid="select-filter-tariff">
                      <SelectValue placeholder="All Tariffs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tariffs</SelectItem>
                      {uniqueTariffs.map(tariff => (
                        <SelectItem key={tariff} value={tariff!}>
                          {tariff}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {/* Advanced Filters Section */}
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="mb-2"
                data-testid="button-toggle-advanced-filters"
              >
                <Filter className="w-4 h-4 mr-2" />
                Advanced Filters {advancedFilters.length > 0 && `(${advancedFilters.length} active)`}
              </Button>
              
              {showAdvancedFilters && (
                <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                  {advancedFilters.map((filter, index) => (
                    <div key={filter.id} className="flex items-end gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs">Field</Label>
                        <Select
                          value={filter.field}
                          onValueChange={(value) => {
                            const newFilters = [...advancedFilters];
                            newFilters[index].field = value;
                            setAdvancedFilters(newFilters);
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {columnOrder.map(col => (
                              <SelectItem key={col} value={col}>
                                {getColumnDisplayName(col)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs">Operator</Label>
                        <Select
                          value={filter.operator}
                          onValueChange={(value: any) => {
                            const newFilters = [...advancedFilters];
                            newFilters[index].operator = value;
                            setAdvancedFilters(newFilters);
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Operator" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals</SelectItem>
                            <SelectItem value="not_equals">Not Equals</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                            <SelectItem value="starts_with">Starts With</SelectItem>
                            <SelectItem value="ends_with">Ends With</SelectItem>
                            <SelectItem value="is_empty">Is Empty</SelectItem>
                            <SelectItem value="not_empty">Not Empty</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs">Value</Label>
                        <Input
                          value={filter.value}
                          onChange={(e) => {
                            const newFilters = [...advancedFilters];
                            newFilters[index].value = e.target.value;
                            setAdvancedFilters(newFilters);
                          }}
                          placeholder="Filter value"
                          className="h-9"
                          disabled={filter.operator === 'is_empty' || filter.operator === 'not_empty'}
                        />
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAdvancedFilters(advancedFilters.filter((_, i) => i !== index));
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAdvancedFilters([...advancedFilters, {
                          id: `filter-${Date.now()}`,
                          field: columnOrder[0] || '',
                          operator: 'contains',
                          value: ''
                        }]);
                      }}
                      data-testid="button-add-advanced-filter"
                    >
                      Add Condition
                    </Button>
                    
                    {advancedFilters.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdvancedFilters([])}
                        className="text-red-600"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
          
          {/* Bulk Actions Toolbar */}
          {selectedAddresses.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedAddresses.length} address{selectedAddresses.length > 1 ? 'es' : ''} selected
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedAddresses([])}
                    className="text-blue-600 hover:text-blue-800"
                    data-testid="button-clear-selection"
                  >
                    Clear Selection
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowWorkItemDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-bulk-create-work-items"
                >
                  <Wrench className="h-4 w-4 mr-1" />
                  Create Work Items ({selectedAddresses.length})
                </Button>
              </div>
            </Card>
          )}
          
          {/* Table with Horizontal Scroll */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table style={{ tableLayout: 'fixed', minWidth: '100%' }}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] min-w-[50px]" style={{ width: '50px' }}>
                      <Checkbox
                        checked={selectedAddresses.length === filteredAddresses.length && filteredAddresses.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAddresses(filteredAddresses.map(a => a.id));
                          } else {
                            setSelectedAddresses([]);
                          }
                        }}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    {orderedVisibleColumns.map(column => (
                      <TableHead 
                        key={column} 
                        className="relative group"
                        style={{ 
                          width: `${columnWidths[column] || 150}px`,
                          minWidth: `${columnWidths[column] || 150}px`,
                          maxWidth: `${columnWidths[column] || 150}px`
                        }}
                      >
                        <div className="flex items-center gap-1 pr-2">
                          <span className="truncate">{getColumnDisplayName(column)}</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        </div>
                        {/* Resize handle */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100"
                          onMouseDown={(e) => handleResizeStart(column, e)}
                          title="Drag to resize column"
                        />
                      </TableHead>
                    ))}
                    <TableHead className="w-[100px] min-w-[100px]" style={{ width: '100px' }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAddresses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={orderedVisibleColumns.length + 2} className="text-center py-8 text-gray-500">
                        {addresses.length === 0 
                          ? 'No addresses found. Click the sync button to import addresses from Airtable.'
                          : 'No addresses match your search criteria.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedAddresses.map((addr) => (
                      <TableRow key={addr.id} data-testid={`row-address-${addr.id}`}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedAddresses.includes(addr.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAddresses([...selectedAddresses, addr.id]);
                              } else {
                                setSelectedAddresses(selectedAddresses.filter(id => id !== addr.id));
                              }
                            }}
                            data-testid={`checkbox-${addr.id}`}
                          />
                        </TableCell>
                        {orderedVisibleColumns.map(column => (
                          <TableCell 
                            key={column}
                            className="overflow-hidden"
                            style={{ 
                              width: `${columnWidths[column] || 150}px`,
                              minWidth: `${columnWidths[column] || 150}px`,
                              maxWidth: `${columnWidths[column] || 150}px`
                            }}
                          >
                            <div className="overflow-hidden text-ellipsis whitespace-nowrap" title={getCellValueAsString(addr, column)}>
                              {getCellValue(addr, column)}
                            </div>
                          </TableCell>
                        ))}
                        <TableCell className="w-[100px] min-w-[100px]" style={{ width: '100px' }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedAddress(addr)}
                            data-testid={`button-view-${addr.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
          
          {/* Pagination Controls */}
          {filteredAddresses.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAddresses.length)} of {filteredAddresses.length.toLocaleString()} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="sync-logs" className="space-y-4">
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Total Records</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No sync history found. Start a sync to see logs here.
                      </TableCell>
                    </TableRow>
                  ) : (
                    syncLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{new Date(log.startedAt).toLocaleString()}</TableCell>
                        <TableCell>
                          {log.duration ? `${(log.duration / 1000).toFixed(1)}s` : '-'}
                        </TableCell>
                        <TableCell>{log.recordsTotal.toLocaleString()}</TableCell>
                        <TableCell>{log.recordsCreated.toLocaleString()}</TableCell>
                        <TableCell>{log.recordsUpdated.toLocaleString()}</TableCell>
                        <TableCell>
                          {log.status === 'completed' && (
                            <Badge variant="default" className="bg-green-500">
                              <Check className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                          {log.status === 'in_progress' && (
                            <Badge variant="default" className="bg-blue-500">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              In Progress
                            </Badge>
                          )}
                          {log.status === 'failed' && (
                            <Badge variant="destructive">
                              <X className="w-3 h-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.errorMessage ? (
                            <div className="text-sm text-red-600 max-w-md" title={log.errorMessage}>
                              {log.errorMessage}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Address Detail Sheet */}
      {selectedAddress && (
        <Sheet open={!!selectedAddress} onOpenChange={(open) => !open && setSelectedAddress(null)}>
          <SheetContent className="sm:w-[640px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                {selectedAddress.summary || selectedAddress.address || selectedAddress.premise || `Address #${selectedAddress.id}`}
              </SheetTitle>
              <SheetDescription>
                {selectedAddress.localStatus && (
                  <Badge variant="secondary">{selectedAddress.localStatus}</Badge>
                )}
                {selectedAddress.network && (
                  <>
                    {selectedAddress.localStatus && ' • '}
                    <span>{selectedAddress.network}</span>
                  </>
                )}
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="details" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details" data-testid="tab-details">
                  <FileText className="w-4 h-4 mr-2" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="work-items" data-testid="tab-work-items">
                  <Wrench className="w-4 h-4 mr-2" />
                  Work Items
                </TabsTrigger>
                <TabsTrigger value="activity" data-testid="tab-activity">
                  <Activity className="w-4 h-4 mr-2" />
                  Activity
                </TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-6">
                {/* Record Identifiers */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Database ID</div>
                        <div className="font-mono font-semibold">{selectedAddress.id}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Airtable Record</div>
                        <div className="font-mono text-xs">{selectedAddress.airtableRecordId}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Address Information */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Address Information</h3>
                  <div className="space-y-2">
                    {selectedAddress.postcode && (
                      <div className="flex gap-2">
                        <div className="text-sm font-medium text-gray-600 w-1/3">Postcode:</div>
                        <div className="text-sm flex-1">{selectedAddress.postcode}</div>
                      </div>
                    )}
                    {selectedAddress.summary && (
                      <div className="flex gap-2">
                        <div className="text-sm font-medium text-gray-600 w-1/3">Summary:</div>
                        <div className="text-sm flex-1">{selectedAddress.summary}</div>
                      </div>
                    )}
                    {selectedAddress.address && (
                      <div className="flex gap-2">
                        <div className="text-sm font-medium text-gray-600 w-1/3">Address:</div>
                        <div className="text-sm flex-1">{selectedAddress.address}</div>
                      </div>
                    )}
                    {selectedAddress.premise && (
                      <div className="flex gap-2">
                        <div className="text-sm font-medium text-gray-600 w-1/3">Premise:</div>
                        <div className="text-sm flex-1">{selectedAddress.premise}</div>
                      </div>
                    )}
                    {selectedAddress.network && (
                      <div className="flex gap-2">
                        <div className="text-sm font-medium text-gray-600 w-1/3">Network:</div>
                        <div className="text-sm flex-1">{selectedAddress.network}</div>
                      </div>
                    )}
                    {selectedAddress.udprn && (
                      <div className="flex gap-2">
                        <div className="text-sm font-medium text-gray-600 w-1/3">UDPRN:</div>
                        <div className="text-sm flex-1">{selectedAddress.udprn}</div>
                      </div>
                    )}
                    {selectedAddress.statusId && (
                      <div className="flex gap-2">
                        <div className="text-sm font-medium text-gray-600 w-1/3">Status:</div>
                        <div className="text-sm flex-1">{selectedAddress.statusId}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* OCR-Extracted Equipment Data - Editable */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Bot className="h-4 w-4 text-blue-500" />
                        Equipment Data
                      </h3>
                      {!isEditingEquipment ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingEquipment(true);
                            setEquipmentEditValues({
                              routerSerial: selectedAddress.routerSerial || '',
                              routerMac: selectedAddress.routerMac || '',
                              routerModel: selectedAddress.routerModel || '',
                              onuSerial: selectedAddress.onuSerial || '',
                              onuMac: selectedAddress.onuMac || '',
                              onuModel: selectedAddress.onuModel || '',
                            });
                          }}
                          data-testid="button-edit-equipment"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsEditingEquipment(false);
                              setEquipmentEditValues({});
                            }}
                            data-testid="button-cancel-equipment"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      {/* Router Information */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">Router</div>
                        {(['routerSerial', 'routerMac', 'routerModel'] as const).map((fieldName) => {
                          const labels: Record<string, string> = {
                            routerSerial: 'Serial',
                            routerMac: 'MAC',
                            routerModel: 'Model',
                          };
                          const currentValue = selectedAddress[fieldName] || '';
                          const editValue = equipmentEditValues[fieldName] ?? currentValue;
                          const hasChanged = isEditingEquipment && editValue !== currentValue;
                          
                          return (
                            <div key={fieldName} className={`flex gap-2 items-center -mx-2 px-2 py-1.5 rounded ${currentValue ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}>
                              <div className="text-sm font-medium text-gray-600 w-1/4">{labels[fieldName]}:</div>
                              {isEditingEquipment ? (
                                <div className="flex-1 flex gap-2">
                                  <Input
                                    value={editValue}
                                    onChange={(e) => setEquipmentEditValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                    className={`h-7 text-sm font-mono ${hasChanged ? 'border-orange-400' : ''}`}
                                    placeholder={`Enter ${labels[fieldName].toLowerCase()}`}
                                    data-testid={`input-${fieldName}`}
                                  />
                                  {hasChanged && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="h-7 px-2"
                                      disabled={savingField === fieldName}
                                      onClick={() => {
                                        setSavingField(fieldName);
                                        updateEquipmentMutation.mutate(
                                          { addressId: selectedAddress.id, fieldName, value: editValue },
                                          {
                                            onSettled: () => setSavingField(null),
                                            onSuccess: () => {
                                              setSelectedAddress({ ...selectedAddress, [fieldName]: editValue || null });
                                            }
                                          }
                                        );
                                      }}
                                      data-testid={`button-save-${fieldName}`}
                                    >
                                      {savingField === fieldName ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Save className="h-3 w-3" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div className="text-sm flex-1 font-mono">{currentValue || <span className="text-muted-foreground italic">Not set</span>}</div>
                                  {currentValue && (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button className="text-blue-500 hover:text-blue-700">
                                          <Bot className="h-3 w-3" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-80">
                                        <div className="space-y-2 text-xs">
                                          <div className="font-semibold text-sm">OCR Extraction Details</div>
                                          <div className="text-muted-foreground">
                                            This field was automatically extracted from a photo using AI-powered OCR.
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* ONU Information */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">ONU</div>
                        {(['onuSerial', 'onuMac', 'onuModel'] as const).map((fieldName) => {
                          const labels: Record<string, string> = {
                            onuSerial: 'Serial',
                            onuMac: 'MAC',
                            onuModel: 'Model',
                          };
                          const currentValue = selectedAddress[fieldName] || '';
                          const editValue = equipmentEditValues[fieldName] ?? currentValue;
                          const hasChanged = isEditingEquipment && editValue !== currentValue;
                          
                          return (
                            <div key={fieldName} className={`flex gap-2 items-center -mx-2 px-2 py-1.5 rounded ${currentValue ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}>
                              <div className="text-sm font-medium text-gray-600 w-1/4">{labels[fieldName]}:</div>
                              {isEditingEquipment ? (
                                <div className="flex-1 flex gap-2">
                                  <Input
                                    value={editValue}
                                    onChange={(e) => setEquipmentEditValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                    className={`h-7 text-sm font-mono ${hasChanged ? 'border-orange-400' : ''}`}
                                    placeholder={`Enter ${labels[fieldName].toLowerCase()}`}
                                    data-testid={`input-${fieldName}`}
                                  />
                                  {hasChanged && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="h-7 px-2"
                                      disabled={savingField === fieldName}
                                      onClick={() => {
                                        setSavingField(fieldName);
                                        updateEquipmentMutation.mutate(
                                          { addressId: selectedAddress.id, fieldName, value: editValue },
                                          {
                                            onSettled: () => setSavingField(null),
                                            onSuccess: () => {
                                              setSelectedAddress({ ...selectedAddress, [fieldName]: editValue || null });
                                            }
                                          }
                                        );
                                      }}
                                      data-testid={`button-save-${fieldName}`}
                                    >
                                      {savingField === fieldName ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Save className="h-3 w-3" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div className="text-sm flex-1 font-mono">{currentValue || <span className="text-muted-foreground italic">Not set</span>}</div>
                                  {currentValue && (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button className="text-blue-500 hover:text-blue-700">
                                          <Bot className="h-3 w-3" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-80">
                                        <div className="space-y-2 text-xs">
                                          <div className="font-semibold text-sm">OCR Extraction Details</div>
                                          <div className="text-muted-foreground">
                                            This field was automatically extracted from a photo using AI-powered OCR.
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Local Management Fields */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Local Management</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Local Status</Label>
                      <Input
                        value={selectedAddress.localStatus || ''}
                        onChange={(e) => setSelectedAddress({
                          ...selectedAddress,
                          localStatus: e.target.value
                        })}
                        placeholder="e.g., Pending Review, Follow-up Required"
                        data-testid="input-local-status"
                      />
                    </div>
                    <div>
                      <Label>Local Notes</Label>
                      <Textarea
                        value={selectedAddress.localNotes || ''}
                        onChange={(e) => setSelectedAddress({
                          ...selectedAddress,
                          localNotes: e.target.value
                        })}
                        placeholder="Add notes for internal tracking..."
                        rows={4}
                        data-testid="textarea-local-notes"
                      />
                    </div>
                    <Button
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/addresses/${selectedAddress.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              localStatus: selectedAddress.localStatus,
                              localNotes: selectedAddress.localNotes,
                            }),
                          });
                          
                          if (!response.ok) throw new Error('Update failed');
                          
                          toast({
                            title: 'Updated',
                            description: 'Local fields updated successfully',
                          });
                          queryClient.invalidateQueries({ queryKey: ['/api/addresses'] });
                          setSelectedAddress(null);
                        } catch (error) {
                          toast({
                            title: 'Update Failed',
                            description: 'Failed to update address',
                            variant: 'destructive',
                          });
                        }
                      }}
                      data-testid="button-save-address"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Work Items Tab */}
              <TabsContent value="work-items" className="space-y-4">
                {selectedAddress.workItems && selectedAddress.workItems.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600 mb-4">
                      {selectedAddress.workItems.length} work item{selectedAddress.workItems.length > 1 ? 's' : ''} linked to this address
                    </div>
                    {selectedAddress.workItems.map((item) => (
                      <Card 
                        key={item.id} 
                        className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedWorkItemId(item.id)}
                        data-testid={`work-item-card-${item.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={item.status === 'Completed' ? 'secondary' : 'default'}>
                                {item.status}
                              </Badge>
                              {item.dueDate && (
                                <span className="text-xs text-gray-500">
                                  Due: {new Date(item.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <Eye className="w-4 h-4 text-gray-400" />
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Wrench className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No work items linked yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Select this address from the table and create a work item to get started
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-4">
                <AddressActivityLog addressId={selectedAddress.id} />
              </TabsContent>
            </Tabs>
          </SheetContent>
        </Sheet>
      )}
      
      {/* Sync Confirmation Dialog */}
      <AlertDialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync from Airtable?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will fetch all records from your Airtable base and update the local database. 
                Existing records will be updated, and new records will be created. Local-only fields 
                (status, notes) will be preserved.
              </p>
              {addresses.length > 0 && addresses.length < 5000 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <strong>Note:</strong> You currently have {addresses.length.toLocaleString()} records. If you expect more, 
                  this sync will fetch all remaining records from Airtable.
                </div>
              )}
              <p className="text-sm text-gray-600 mt-2">
                The sync will now process records in batches for improved performance. 
                You can monitor progress in the Sync Logs tab.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-sync-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSyncConfirm} data-testid="button-sync-confirm">
              Start Sync
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Work Item Creation Dialog */}
      <Dialog open={showWorkItemDialog} onOpenChange={setShowWorkItemDialog}>
        <DialogContent className="sm:max-w-[500px]" data-testid="work-item-dialog">
          <DialogHeader>
            <DialogTitle>
              Create Work Item{selectedAddresses.length > 1 ? 's' : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Workflow Template *</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger data-testid="select-workflow-template">
                  <SelectValue placeholder="Select a workflow template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template: any) => (
                    <SelectItem key={template.id} value={String(template.id)}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Assign To (Optional)</Label>
              <Select value={workItemAssignee} onValueChange={setWorkItemAssignee}>
                <SelectTrigger data-testid="select-assignee">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users?.map((user: any) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.fullName || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Due Date (Optional)</Label>
              <Input
                type="date"
                value={workItemDueDate}
                onChange={(e) => setWorkItemDueDate(e.target.value)}
                data-testid="input-due-date"
              />
            </div>
            
            {selectedAddresses.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Creating work items for {selectedAddresses.length} address{selectedAddresses.length > 1 ? 'es' : ''}
                </p>
                <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                  {addresses.filter(a => selectedAddresses.includes(a.id)).map(a => {
                    const name = a.summary || a.address || a.premise || 'Address';
                    return String(name);
                  }).slice(0, 3).join(', ')}
                  {selectedAddresses.length > 3 && ` and ${selectedAddresses.length - 3} more...`}
                </p>
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowWorkItemDialog(false);
                  setSelectedTemplate('');
                  setWorkItemAssignee('unassigned');
                  setWorkItemTeam('');
                  setWorkItemDueDate('');
                }}
                data-testid="button-cancel-work-item"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateWorkItems}
                disabled={!selectedTemplate || isCreatingWorkItems}
                data-testid="button-confirm-create-work-item"
              >
                {isCreatingWorkItems ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>Create {selectedAddresses.length > 1 ? `${selectedAddresses.length} ` : ''}Work Item{selectedAddresses.length > 1 ? 's' : ''}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Work Item Detail Panel */}
      <WorkItemPanel
        workItemId={selectedWorkItemId ?? undefined}
        isOpen={!!selectedWorkItemId}
        onClose={() => setSelectedWorkItemId(null)}
        mode="view"
      />
    </div>
  );
}
