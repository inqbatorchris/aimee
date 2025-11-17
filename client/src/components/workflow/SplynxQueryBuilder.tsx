import { useState } from 'react';
import { Plus, X, Zap, Braces, FlaskConical, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import type { KeyResult } from '@shared/schema';

export interface SplynxFilter {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface SplynxQueryConfig {
  entity: 'customers' | 'leads' | 'support_tickets' | 'scheduling_tasks';
  mode: 'count' | 'list';
  filters: SplynxFilter[];
  dateRange?: string;
  dateRangeField?: 'date_add' | 'last_updated';
  limit?: number;
  resultVariable: string;
  updateKeyResult?: {
    keyResultId: number;
    updateType: 'set_value' | 'increment';
    useResultAs: 'value';
  };
}

interface SplynxQueryBuilderProps {
  value: SplynxQueryConfig;
  onChange: (config: SplynxQueryConfig) => void;
  keyResults?: KeyResult[];
}

const ENTITY_OPTIONS = [
  { value: 'customers', label: 'Customers' },
  { value: 'leads', label: 'Leads' },
  { value: 'support_tickets', label: 'Support Tickets' },
  { value: 'scheduling_tasks', label: 'Scheduling Tasks' },
];

const MODE_OPTIONS = [
  { value: 'count', label: 'Count only' },
  { value: 'list', label: 'Full list' },
];

const DATE_RANGE_OPTIONS = [
  { value: 'last_hour', label: 'Last Hour' },
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
];

const CONTEXT_VARIABLES = [
  { value: '{objectiveId}', label: 'Objective ID (from trigger)' },
  { value: '{keyResultId}', label: 'Key Result ID (from trigger)' },
  { value: '{workItemId}', label: 'Work Item ID (from trigger)' },
  { value: '{userId}', label: 'User ID (from trigger)' },
  { value: '{today}', label: 'Today' },
  { value: '{yesterday}', label: 'Yesterday' },
];

export default function SplynxQueryBuilder({
  value,
  onChange,
  keyResults = [],
}: SplynxQueryBuilderProps) {
  const [showVariablePopover, setShowVariablePopover] = useState<{ filterId: string } | null>(null);
  const [testResults, setTestResults] = useState<{
    count: number;
    sampleRecords: any[];
  } | null>(null);
  
  const { data: entitySchema } = useQuery<{
    entity: string;
    label: string;
    fields: Array<{
      name: string;
      label: string;
      type: string;
      operators: string[];
      options?: string[];
    }>;
    dateField: string;
  }>({
    queryKey: [`/api/integrations/splynx/schema/${value.entity}`],
    enabled: !!value.entity,
  });

  const fields = entitySchema?.fields || [];
  
  // Test query mutation
  const testQueryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/agents/workflows/test-splynx-query', {
        method: 'POST',
        body: {
          entity: value.entity,
          mode: 'list', // Always use list mode for testing to get sample records
          filters: value.filters,
          dateRange: value.dateRange,
          dateRangeField: value.dateRangeField,
          limit: 5, // Only fetch 5 records for testing
        },
      });
      
      const data = await response.json();
      return data as {
        count: number;
        records?: Array<{
          id: number;
          attributes: Record<string, any>;
        }>;
      };
    },
    onSuccess: (data) => {
      setTestResults({
        count: data.count,
        sampleRecords: data.records?.slice(0, 5) || [],
      });
    },
  });
  
  const getOperatorsForField = (fieldName: string): Array<{ value: string; label: string }> => {
    const field = fields.find(f => f.name === fieldName);
    if (!field) {
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not equals' }
      ];
    }
    
    const labels: Record<string, string> = {
      equals: 'Equals',
      not_equals: 'Not equals',
      contains: 'Contains',
      does_not_contain: 'Does not contain',
      greater_than: 'Greater than',
      less_than: 'Less than',
      greater_than_or_equal: 'Greater than or equal',
      less_than_or_equal: 'Less than or equal',
      is_null: 'Is null',
      not_null: 'Is not null',
    };
    
    return field.operators.map(op => ({
      value: op,
      label: labels[op] || op
    }));
  };
  
  const getFieldOptions = (fieldName: string): string[] | undefined => {
    const field = fields.find(f => f.name === fieldName);
    return field?.options;
  };

  const addFilter = () => {
    const newFilter: SplynxFilter = {
      id: Math.random().toString(36).substr(2, 9),
      field: fields[0]?.name || 'status',
      operator: 'equals',
      value: '',
    };
    
    onChange({
      ...value,
      filters: [...value.filters, newFilter],
    });
  };

  const updateFilter = (filterId: string, updates: Partial<SplynxFilter>) => {
    onChange({
      ...value,
      filters: value.filters.map(f => 
        f.id === filterId ? { ...f, ...updates } : f
      ),
    });
  };

  const removeFilter = (filterId: string) => {
    onChange({
      ...value,
      filters: value.filters.filter(f => f.id !== filterId),
    });
  };
  
  const insertVariable = (filterId: string, variable: string) => {
    const filter = value.filters.find(f => f.id === filterId);
    if (filter) {
      updateFilter(filterId, { value: (filter.value || '') + variable });
    }
    setShowVariablePopover(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            Splynx Query Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select
                value={value.entity || ''}
                onValueChange={(entity) => onChange({
                  ...value,
                  entity: entity as SplynxQueryConfig['entity'],
                  filters: [], // Reset filters when entity changes
                })}
              >
                <SelectTrigger data-testid="select-splynx-entity">
                  <SelectValue placeholder="Select entity..." />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Query Mode</Label>
              <Select
                value={value.mode || 'count'}
                onValueChange={(mode) => onChange({
                  ...value,
                  mode: mode as SplynxQueryConfig['mode'],
                })}
              >
                <SelectTrigger data-testid="select-splynx-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {value.mode === 'count' ? 'Returns number of records' : 'Returns full record list with IDs'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Result Variable Name</Label>
            <Input
              value={value.resultVariable || ''}
              onChange={(e) => onChange({ ...value, resultVariable: e.target.value })}
              placeholder="e.g., customerCount, leadList"
              data-testid="input-result-variable"
            />
            <p className="text-xs text-muted-foreground">
              Store result in this variable for use in later steps
            </p>
          </div>

          {value.entity && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Filters</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addFilter}
                    data-testid="button-add-filter"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Filter
                  </Button>
                </div>

                {value.filters.length === 0 ? (
                  <div className="text-sm text-muted-foreground border-2 border-dashed rounded-lg p-4 text-center">
                    No filters added. Click "Add Filter" to query specific {entitySchema?.label?.toLowerCase() || 'records'}.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {value.filters.map((filter) => (
                      <Card key={filter.id} className="p-3">
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-4">
                            <Label className="text-xs">Field</Label>
                            <Select
                              value={filter.field}
                              onValueChange={(field) => updateFilter(filter.id, { 
                                field,
                                operator: 'equals',
                                value: ''
                              })}
                            >
                              <SelectTrigger className="h-8 text-sm" data-testid={`select-filter-field-${filter.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {fields.map((field) => (
                                  <SelectItem key={field.name} value={field.name}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="col-span-3">
                            <Label className="text-xs">Operator</Label>
                            <Select
                              value={filter.operator}
                              onValueChange={(operator) => updateFilter(filter.id, { operator })}
                            >
                              <SelectTrigger className="h-8 text-sm" data-testid={`select-filter-operator-${filter.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getOperatorsForField(filter.field).map((op) => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="col-span-4">
                            <Label className="text-xs flex items-center justify-between">
                              Value
                              <Popover
                                open={showVariablePopover?.filterId === filter.id}
                                onOpenChange={(open) => setShowVariablePopover(open ? { filterId: filter.id } : null)}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 px-1"
                                  >
                                    <Braces className="h-3 w-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-2" align="end">
                                  <div className="space-y-1">
                                    <p className="text-xs font-semibold mb-2">Insert Variable</p>
                                    {CONTEXT_VARIABLES.map((variable) => (
                                      <Button
                                        key={variable.value}
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start text-xs h-7"
                                        onClick={() => insertVariable(filter.id, variable.value)}
                                      >
                                        {variable.label}
                                      </Button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </Label>
                            {getFieldOptions(filter.field) ? (
                              <Select
                                value={filter.value}
                                onValueChange={(value) => updateFilter(filter.id, { value })}
                              >
                                <SelectTrigger className="h-8 text-sm" data-testid={`select-filter-value-${filter.id}`}>
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {getFieldOptions(filter.field)!.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={filter.value}
                                onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                className="h-8 text-sm"
                                placeholder="Value..."
                                data-testid={`input-filter-value-${filter.id}`}
                              />
                            )}
                          </div>

                          <div className="col-span-1 flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFilter(filter.id)}
                              className="h-8 w-8 p-0"
                              data-testid={`button-remove-filter-${filter.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Test Query Button */}
              <div className="pt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTestResults(null);
                    testQueryMutation.mutate();
                  }}
                  disabled={!value.entity || testQueryMutation.isPending}
                  data-testid="button-test-query"
                >
                  {testQueryMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <FlaskConical className="h-3 w-3 mr-1" />
                      Test Query
                    </>
                  )}
                </Button>
                {testResults && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {testResults.count} record{testResults.count !== 1 ? 's' : ''} found
                  </Badge>
                )}
              </div>

              {/* Test Query Error */}
              {testQueryMutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {(testQueryMutation.error as Error).message || 'Failed to test query'}
                  </AlertDescription>
                </Alert>
              )}

              {/* Test Results Display */}
              {testResults && (
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Query Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Records:</span>
                        <span className="ml-2 font-semibold text-green-700 dark:text-green-300">
                          {testResults.count}
                        </span>
                      </div>
                    </div>

                    {testResults.sampleRecords.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Sample Records (first {testResults.sampleRecords.length}):
                        </Label>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {testResults.sampleRecords.map((record, index) => (
                            <Card key={record.id} className="p-2 bg-white dark:bg-gray-900">
                              <div className="text-xs space-y-1">
                                <div className="font-semibold text-green-700 dark:text-green-300">
                                  Record #{index + 1} (ID: {record.id})
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                                  {Object.entries(record.attributes || {})
                                    .filter(([_, value]) => value != null)
                                    .slice(0, 6)
                                    .map(([key, value]) => (
                                      <div key={key} className="truncate">
                                        <span className="font-medium">{key}:</span>{' '}
                                        {Array.isArray(value)
                                          ? `[${value.length} items]`
                                          : typeof value === 'object'
                                          ? JSON.stringify(value)
                                          : String(value)}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label>Date Range (Optional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Range</Label>
                    <Select
                      value={value.dateRange || 'none'}
                      onValueChange={(dateRange) => onChange({ 
                        ...value, 
                        dateRange: dateRange === 'none' ? undefined : dateRange,
                        dateRangeField: dateRange === 'none' ? undefined : value.dateRangeField // Clear field when removing date filter
                      })}
                    >
                      <SelectTrigger data-testid="select-date-range">
                        <SelectValue placeholder="No date filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No date filter</SelectItem>
                        {DATE_RANGE_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {value.dateRange && value.dateRange !== 'none' && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Date Field</Label>
                      <Select
                        value={value.dateRangeField || 'date_add'}
                        onValueChange={(field) => onChange({ ...value, dateRangeField: field as 'date_add' | 'last_updated' })}
                      >
                        <SelectTrigger data-testid="select-date-range-field">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date_add">Date Added</SelectItem>
                          <SelectItem value="last_updated">Last Updated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {value.dateRange && value.dateRange !== 'none' 
                    ? `Filters by ${value.dateRangeField === 'last_updated' ? 'last_updated' : 'date_add'} field (some fields may not be supported by Splynx)`
                    : 'No date filtering applied'
                  }
                </p>
              </div>

              {value.mode === 'list' && (
                <div className="space-y-2">
                  <Label>Result Limit</Label>
                  <Input
                    type="number"
                    value={value.limit || 1000}
                    onChange={(e) => onChange({ ...value, limit: parseInt(e.target.value) || 1000 })}
                    min={1}
                    max={10000}
                    data-testid="input-result-limit"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of records to return (max: 10,000)
                  </p>
                </div>
              )}
            </>
          )}

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <Label>Update Key Result (Optional)</Label>
              <Badge variant="outline" className="text-xs">Auto-update KPI</Badge>
            </div>
            
            {value.updateKeyResult ? (
              <Card className="p-3 space-y-3 bg-muted/30">
                <div className="space-y-2">
                  <Label className="text-xs">Target Key Result</Label>
                  <Select
                    value={value.updateKeyResult.keyResultId?.toString() || ''}
                    onValueChange={(id) => onChange({
                      ...value,
                      updateKeyResult: {
                        ...value.updateKeyResult!,
                        keyResultId: parseInt(id),
                      }
                    })}
                  >
                    <SelectTrigger className="h-8 text-sm" data-testid="select-target-key-result">
                      <SelectValue placeholder="Select Key Result..." />
                    </SelectTrigger>
                    <SelectContent>
                      {keyResults.map((kr) => (
                        <SelectItem key={kr.id} value={kr.id.toString()}>
                          {kr.title} ({kr.currentValue}/{kr.targetValue})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Update Type</Label>
                  <Select
                    value={value.updateKeyResult.updateType || 'set_value'}
                    onValueChange={(type) => onChange({
                      ...value,
                      updateKeyResult: {
                        ...value.updateKeyResult!,
                        updateType: type as 'set_value' | 'increment',
                      }
                    })}
                  >
                    <SelectTrigger className="h-8 text-sm" data-testid="select-update-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="set_value">Set value</SelectItem>
                      <SelectItem value="increment">Increment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...value, updateKeyResult: undefined })}
                  className="w-full"
                  data-testid="button-remove-key-result-update"
                >
                  <X className="h-3 w-3 mr-1" />
                  Remove KR Update
                </Button>
              </Card>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange({
                  ...value,
                  updateKeyResult: {
                    keyResultId: keyResults[0]?.id || 0,
                    updateType: 'set_value',
                    useResultAs: 'value',
                  }
                })}
                disabled={keyResults.length === 0}
                data-testid="button-add-key-result-update"
              >
                <Plus className="h-3 w-3 mr-1" />
                Auto-update Key Result
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-xs text-blue-900 dark:text-blue-100">
          <strong>💡 Tip:</strong> Use <Badge variant="outline" className="mx-1 text-xs">count</Badge> mode for KPIs and metrics. 
          Use <Badge variant="outline" className="mx-1 text-xs">list</Badge> mode when you need to iterate over records or extract IDs for work item creation.
        </p>
      </div>
    </div>
  );
}
