import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  ExternalLink,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AirtableFilterBuilder, { type AirtableFilter } from '@/components/airtable/AirtableFilterBuilder';

interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
}

interface AirtableConnection {
  id: number;
  baseId: string;
  baseName: string;
  tableId: string;
  tableName: string;
}

export default function AirtableTableView() {
  const { connectionId } = useParams();
  const { toast } = useToast();
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [currentOffset, setCurrentOffset] = useState<string | undefined>(undefined);
  const [offsetHistory, setOffsetHistory] = useState<(string | undefined)[]>([]);
  const [pageSize, setPageSize] = useState<number>(25);
  const [selectedRecord, setSelectedRecord] = useState<AirtableRecord | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [isCreateWorkItemsDialogOpen, setIsCreateWorkItemsDialogOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isColumnsInitialized, setIsColumnsInitialized] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AirtableFilter[]>([]);
  const [showFilterBuilder, setShowFilterBuilder] = useState(false);

  // Fetch connection details
  const { data: connection, isLoading: loadingConnection } = useQuery<AirtableConnection>({
    queryKey: [`/api/airtable/connections/${connectionId}`],
    enabled: !!connectionId,
  });

  // Fetch table schema to get field names for filter builder (may not be available in all Airtable plans)
  const { data: tableSchema } = useQuery<{ fields: Array<{ id: string; name: string; type: string }> }>({
    queryKey: [`/api/airtable/bases/${connection?.baseId}/tables/${connection?.tableId}/schema`],
    enabled: !!connection?.baseId && !!connection?.tableId,
    retry: 0, // Don't retry if schema endpoint is not available
    meta: {
      // Suppress error toasts for this query since schema is optional
      ignoreErrorToast: true,
    },
  });

  // Build Airtable filter formula from advanced filters
  const buildFilterFormula = (filters: AirtableFilter[]): string | undefined => {
    if (filters.length === 0) return undefined;

    const formulas = filters
      .filter(filter => {
        // Skip filters with empty values (except for IS_EMPTY and IS_NOT_EMPTY which don't need values)
        const needsValue = !['IS_EMPTY', 'IS_NOT_EMPTY'].includes(filter.operator);
        if (!needsValue) return true; // Always include IS_EMPTY and IS_NOT_EMPTY
        
        // Check for truly empty values (undefined, null, or empty string after trim)
        // Allow falsy values like 0 or false which are valid filter values
        if (filter.value === undefined || filter.value === null) return false;
        const stringValue = String(filter.value).trim();
        return stringValue !== '';
      })
      .map(filter => {
        const { field, operator, value } = filter;
        
        // Handle empty/not empty operators
        if (operator === 'IS_EMPTY') {
          return `{${field}} = BLANK()`;
        }
        if (operator === 'IS_NOT_EMPTY') {
          return `{${field}} != BLANK()`;
        }
        
        // Handle contains operators
        if (operator === 'CONTAINS') {
          return `FIND("${value}", {${field}}) > 0`;
        }
        if (operator === 'NOT_CONTAINS') {
          return `FIND("${value}", {${field}}) = 0`;
        }
        
        // Standard comparison - wrap value in quotes for text fields  
        const quotedValue = isNaN(Number(value)) ? `"${value}"` : value;
        return `{${field}} ${operator} ${quotedValue}`;
      });

    // Return undefined if no valid formulas after filtering
    if (formulas.length === 0) return undefined;
    
    // Combine with AND
    return formulas.length > 1 ? `AND(${formulas.join(', ')})` : formulas[0];
  };

  // Build query params string using useMemo to trigger refetch when dependencies change
  const queryParamsString = useMemo(() => {
    const params = new URLSearchParams();
    if (pageSize > 0) {
      params.append('pageSize', pageSize.toString());
    }
    if (currentOffset) {
      params.append('offset', currentOffset);
    }
    
    // Add filter formula if advanced filters exist
    const filterFormula = buildFilterFormula(advancedFilters);
    if (filterFormula) {
      params.append('filterByFormula', filterFormula);
    }
    
    return params.toString();
  }, [pageSize, currentOffset, advancedFilters]);

  // Check if filters are applied
  const hasFiltersApplied = useMemo(() => {
    return advancedFilters.length > 0 && buildFilterFormula(advancedFilters) !== undefined;
  }, [advancedFilters]);

  // Fetch a small sample just to get field names for the filter builder
  const { data: sampleData } = useQuery<{ records: AirtableRecord[]; offset?: string }>({
    queryKey: [`/api/airtable/bases/${connection?.baseId}/tables/${connection?.tableId}/records?pageSize=1`],
    enabled: !!connection?.baseId && !!connection?.tableId && !hasFiltersApplied,
    retry: 1,
  });
  
  const {
    data: recordsData,
    isLoading: loadingRecords,
    refetch: refetchRecords,
  } = useQuery<{ records: AirtableRecord[]; offset?: string }>({
    queryKey: [`/api/airtable/bases/${connection?.baseId}/tables/${connection?.tableId}/records?${queryParamsString}`],
    enabled: !!connection?.baseId && !!connection?.tableId && hasFiltersApplied,
    retry: 1,
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/core/users'],
    retry: 1,
  });

  // Fetch workflow templates
  const { data: workflowTemplates = [] } = useQuery<any[]>({
    queryKey: ['/api/workflows/templates'],
    retry: 1,
  });

  // Create work items mutation
  const createWorkItemsMutation = useMutation({
    mutationFn: async (data: { recordIds: string[]; assigneeId?: number; templateId?: string }) => {
      return await apiRequest(`/api/airtable/connections/${connectionId}/create-work-items`, {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Work Items Created',
        description: `Successfully created ${data.workItems?.length || 0} work items from selected records.`,
      });
      setSelectedRecords(new Set());
      setIsCreateWorkItemsDialogOpen(false);
      setSelectedAssignee('');
      setSelectedTemplate('');
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create work items',
        variant: 'destructive',
      });
    },
  });

  // Initialize visible columns when records are loaded (only first 5)
  useEffect(() => {
    if (recordsData?.records && recordsData.records.length > 0 && !isColumnsInitialized) {
      const allColumns = new Set<string>();
      recordsData.records.forEach(record => {
        Object.keys(record.fields).forEach(key => allColumns.add(key));
      });
      // Only show first 5 columns by default
      const firstFiveColumns = Array.from(allColumns).slice(0, 5);
      setVisibleColumns(new Set(firstFiveColumns));
      setIsColumnsInitialized(true);
    }
  }, [recordsData, isColumnsInitialized]);

  // Reset pagination when page size changes
  useEffect(() => {
    setCurrentOffset(undefined);
    setOffsetHistory([]);
  }, [pageSize]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentOffset(undefined);
    setOffsetHistory([]);
  }, [advancedFilters]);

  // Get all unique column names - prioritize schema fields, fallback to record fields
  const allColumns = useMemo(() => {
    // First try to get columns from schema (if available)
    if (tableSchema?.fields && tableSchema.fields.length > 0) {
      return tableSchema.fields.map(field => field.name);
    }
    
    // Use actual data if filters are applied
    if (hasFiltersApplied && recordsData?.records) {
      return Array.from(
        new Set(
          recordsData.records.flatMap(record => Object.keys(record.fields))
        )
      );
    }
    
    // Use sample data to get field names when no filters applied
    if (sampleData?.records && sampleData.records.length > 0) {
      return Array.from(
        new Set(
          sampleData.records.flatMap(record => Object.keys(record.fields))
        )
      );
    }
    
    return [];
  }, [tableSchema, recordsData, sampleData, hasFiltersApplied]);

  // Use records directly without client-side filtering
  const displayRecords = recordsData?.records || [];

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords(new Set(displayRecords.map(r => r.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  // Handle individual record selection
  const handleSelectRecord = (recordId: string, checked: boolean) => {
    const newSelected = new Set(selectedRecords);
    if (checked) {
      newSelected.add(recordId);
    } else {
      newSelected.delete(recordId);
    }
    setSelectedRecords(newSelected);
  };

  // Open record details
  const handleViewRecord = (record: AirtableRecord) => {
    setSelectedRecord(record);
    setIsDetailSheetOpen(true);
  };

  // Toggle column visibility
  const handleToggleColumn = (columnName: string) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(columnName)) {
      newVisible.delete(columnName);
    } else {
      newVisible.add(columnName);
    }
    setVisibleColumns(newVisible);
  };

  if (loadingConnection) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!connection) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Connection not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-6 px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{connection.tableName}</h1>
          <p className="text-muted-foreground mt-1">{connection.baseName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchRecords()}
            disabled={loadingRecords || !hasFiltersApplied}
            data-testid="button-refresh"
            title={!hasFiltersApplied ? "Apply filters to refresh data" : "Refresh data"}
          >
            <RefreshCw className={`h-4 w-4 ${loadingRecords ? 'animate-spin' : ''}`} />
          </Button>
          <a
            href={`https://airtable.com/${connection.baseId}/${connection.tableId}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-view-in-airtable"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View in Airtable
            </Button>
          </a>
        </div>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1">
              {selectedRecords.size > 0 && (
                <Badge variant="secondary" data-testid="badge-selected-count">
                  {selectedRecords.size} selected
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Label htmlFor="page-size" className="text-sm text-muted-foreground">
                  Show:
                </Label>
                <Select 
                  value={pageSize.toString()} 
                  onValueChange={(value) => {
                    setPageSize(parseInt(value));
                  }}
                >
                  <SelectTrigger id="page-size" className="w-[120px]" data-testid="select-page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 records</SelectItem>
                    <SelectItem value="25">25 records</SelectItem>
                    <SelectItem value="50">50 records</SelectItem>
                    <SelectItem value="100">100 records</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant={showFilterBuilder ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilterBuilder(!showFilterBuilder)}
                data-testid="button-toggle-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {advancedFilters.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {advancedFilters.length}
                  </Badge>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-columns">
                    <Columns3 className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 max-h-[400px] overflow-y-auto">
                  {allColumns.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column}
                      checked={visibleColumns.has(column)}
                      onCheckedChange={() => handleToggleColumn(column)}
                      data-testid={`checkbox-column-${column}`}
                    >
                      {column}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {selectedRecords.size > 0 && (
                <Button
                  size="sm"
                  onClick={() => setIsCreateWorkItemsDialogOpen(true)}
                  data-testid="button-create-work-items"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Work Items ({selectedRecords.size})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filter Builder */}
      {showFilterBuilder && (
        <AirtableFilterBuilder
          availableFields={allColumns}
          filters={advancedFilters}
          onChange={setAdvancedFilters}
        />
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {loadingRecords ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !hasFiltersApplied ? (
            <div className="text-center py-12">
              <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium text-muted-foreground mb-2">No filters applied</p>
              <p className="text-sm text-muted-foreground">
                Click the "Filters" button above to add filters and load data from Airtable
              </p>
            </div>
          ) : displayRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No records match your filters
            </div>
          ) : (
            <div className="overflow-x-auto max-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 sticky left-0 bg-background z-10">
                      <Checkbox
                        checked={selectedRecords.size === displayRecords.length && displayRecords.length > 0}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    {Array.from(visibleColumns).map((column) => (
                      <TableHead key={column} className="min-w-[150px]">
                        <div className="font-semibold">{column}</div>
                      </TableHead>
                    ))}
                    <TableHead className="w-20 sticky right-0 bg-background z-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRecords.map((record) => (
                    <TableRow
                      key={record.id}
                      className="hover:bg-muted/50"
                      data-testid={`row-record-${record.id}`}
                    >
                      <TableCell className="sticky left-0 bg-background z-10">
                        <Checkbox
                          checked={selectedRecords.has(record.id)}
                          onCheckedChange={(checked) => handleSelectRecord(record.id, !!checked)}
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`checkbox-record-${record.id}`}
                        />
                      </TableCell>
                      {Array.from(visibleColumns).map((column) => (
                        <TableCell
                          key={column}
                          onClick={() => handleViewRecord(record)}
                          className="cursor-pointer max-w-[300px] truncate"
                          data-testid={`cell-${record.id}-${column}`}
                          title={formatCellValue(record.fields[column])}
                        >
                          {formatCellValue(record.fields[column])}
                        </TableCell>
                      ))}
                      <TableCell className="sticky right-0 bg-background z-10">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewRecord(record)}
                          data-testid={`button-view-${record.id}`}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {displayRecords.length} records {offsetHistory.length > 0 && `(Page ${offsetHistory.length + 1})`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (offsetHistory.length > 0) {
                const prevOffset = offsetHistory[offsetHistory.length - 1];
                setOffsetHistory(offsetHistory.slice(0, -1));
                setCurrentOffset(prevOffset);
              }
            }}
            disabled={offsetHistory.length === 0}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (recordsData?.offset) {
                setOffsetHistory([...offsetHistory, currentOffset]);
                setCurrentOffset(recordsData.offset);
              }
            }}
            disabled={!recordsData?.offset}
            data-testid="button-next-page"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Record Detail Sheet */}
      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Record Details</SheetTitle>
            <SheetDescription>
              View and manage record information
            </SheetDescription>
          </SheetHeader>
          {selectedRecord && (
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Record ID</p>
                <p className="font-mono text-sm" data-testid="text-record-id">{selectedRecord.id}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{new Date(selectedRecord.createdTime).toLocaleString()}</p>
              </div>
              <div className="space-y-4 pt-4 border-t">
                <p className="text-sm font-medium">Fields</p>
                {Object.entries(selectedRecord.fields).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{key}</p>
                    <p className="text-sm" data-testid={`field-${key}`}>{formatCellValue(value)}</p>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    handleSelectRecord(selectedRecord.id, true);
                    setIsDetailSheetOpen(false);
                  }}
                  data-testid="button-select-this-record"
                >
                  <Checkbox className="mr-2" checked={selectedRecords.has(selectedRecord.id)} />
                  Select This Record
                </Button>
                <a
                  href={`https://airtable.com/${connection.baseId}/${connection.tableId}/${selectedRecord.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full" data-testid="button-open-in-airtable">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Airtable
                  </Button>
                </a>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Work Items Dialog */}
      <Dialog open={isCreateWorkItemsDialogOpen} onOpenChange={setIsCreateWorkItemsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Work Items</DialogTitle>
            <DialogDescription>
              Create work items for {selectedRecords.size} selected record{selectedRecords.size > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template">Workflow Template (Optional)</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger id="template" data-testid="select-template">
                  <SelectValue placeholder="Select a workflow template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Template</SelectItem>
                  {workflowTemplates.map((template: any) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.steps?.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({template.steps.length} steps)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && selectedTemplate !== 'none' && (
                <p className="text-xs text-muted-foreground">
                  Work items will be created with the selected workflow template
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignee">Assign To (Optional)</Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger id="assignee" data-testid="select-assignee">
                  <SelectValue placeholder="Select a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateWorkItemsDialogOpen(false);
                setSelectedTemplate('');
                setSelectedAssignee('');
              }}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                createWorkItemsMutation.mutate({
                  recordIds: Array.from(selectedRecords),
                  assigneeId: selectedAssignee ? parseInt(selectedAssignee) : undefined,
                  templateId: selectedTemplate && selectedTemplate !== 'none' ? selectedTemplate : undefined,
                });
              }}
              disabled={createWorkItemsMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createWorkItemsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>Create {selectedRecords.size} Work Item{selectedRecords.size > 1 ? 's' : ''}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to format cell values
function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
