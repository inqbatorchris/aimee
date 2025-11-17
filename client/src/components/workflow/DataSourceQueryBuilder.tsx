import { useState } from 'react';
import { Plus, X, Database, Play, Braces } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DataTable, DataField, KeyResult } from '@shared/schema';

export interface DataSourceFilter {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface DataSourceQueryConfig {
  sourceTable: string;
  queryConfig: {
    filters: DataSourceFilter[];
    aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
    aggregationField?: string;
    limit?: number;
  };
  resultVariable: string;
  updateKeyResult?: {
    keyResultId: number;
    updateType: 'set_value' | 'increment';
    useResultAs: 'value';
  };
}

interface DataSourceQueryBuilderProps {
  value: DataSourceQueryConfig;
  onChange: (config: DataSourceQueryConfig) => void;
  keyResults?: KeyResult[];
}

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'is_null', label: 'Is null' },
  { value: 'not_null', label: 'Is not null' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
];

const AGGREGATIONS = [
  { value: 'count', label: 'Count records' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
];

const DATE_VARIABLES = [
  { value: '{today}', label: 'Today' },
  { value: '{yesterday}', label: 'Yesterday' },
  { value: '{currentMonthStart}', label: 'Current Month Start' },
  { value: '{currentMonthEnd}', label: 'Current Month End' },
];

const CONTEXT_VARIABLES = [
  { value: '{objectiveId}', label: 'Objective ID (from trigger)' },
  { value: '{keyResultId}', label: 'Key Result ID (from trigger)' },
  { value: '{workItemId}', label: 'Work Item ID (from trigger)' },
  { value: '{userId}', label: 'User ID (from trigger)' },
];

export default function DataSourceQueryBuilder({
  value,
  onChange,
  keyResults = [],
}: DataSourceQueryBuilderProps) {
  const [testResult, setTestResult] = useState<{ count: number; duration: number } | null>(null);
  const { toast } = useToast();
  
  const { data: dataTables } = useQuery<{ tables: DataTable[] }>({
    queryKey: ['/api/data-explorer/tables'],
  });

  const { data: dataFields } = useQuery<{ fields: DataField[] }>({
    queryKey: [`/api/data-explorer/fields/${value.sourceTable}`],
    enabled: !!value.sourceTable,
  });

  const tables = dataTables?.tables || [];
  const fields = dataFields?.fields || [];
  
  const testQueryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/data-explorer/test-query', {
        method: 'POST',
        body: {
          sourceTable: value.sourceTable,
          queryConfig: value.queryConfig,
        },
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setTestResult({ count: data.count, duration: data.duration });
    },
    onError: (error: Error) => {
      setTestResult(null);
      toast({
        title: "Test query failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addFilter = () => {
    const newFilter: DataSourceFilter = {
      id: Math.random().toString(36).substr(2, 9),
      field: fields[0]?.fieldName || 'localStatus',
      operator: 'equals',
      value: '',
    };
    
    const currentConfig = value.queryConfig ?? { filters: [], aggregation: 'count', limit: 1000 };
    
    onChange({
      ...value,
      queryConfig: {
        ...currentConfig,
        filters: [...currentConfig.filters, newFilter],
      },
    });
  };

  const removeFilter = (id: string) => {
    const currentConfig = value.queryConfig ?? { filters: [], aggregation: 'count', limit: 1000 };
    
    onChange({
      ...value,
      queryConfig: {
        ...currentConfig,
        filters: currentConfig.filters.filter(f => f.id !== id),
      },
    });
  };

  const updateFilter = (id: string, updates: Partial<DataSourceFilter>) => {
    const currentConfig = value.queryConfig ?? { filters: [], aggregation: 'count', limit: 1000 };
    
    onChange({
      ...value,
      queryConfig: {
        ...currentConfig,
        filters: currentConfig.filters.map(f =>
          f.id === id ? { ...f, ...updates } : f
        ),
      },
    });
  };

  const needsValue = (operator: string) => {
    return !['is_null', 'not_null'].includes(operator);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Source Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Source Table</Label>
            <Select
              value={value.sourceTable}
              onValueChange={(sourceTable) => onChange({ ...value, sourceTable })}
            >
              <SelectTrigger data-testid="select-source-table">
                <SelectValue placeholder="Select a table" />
              </SelectTrigger>
              <SelectContent>
                {tables.map(table => (
                  <SelectItem key={table.id} value={table.tableName}>
                    {table.label || table.tableName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {value.sourceTable && (
            <>
              <div>
                <Label>Aggregation</Label>
                <Select
                  value={value.queryConfig?.aggregation || 'count'}
                  onValueChange={(aggregation: string) => onChange({
                    ...value,
                    queryConfig: {
                      ...value.queryConfig,
                      filters: value.queryConfig?.filters || [],
                      aggregation: aggregation as 'count' | 'sum' | 'avg' | 'min' | 'max',
                      limit: value.queryConfig?.limit || 1000,
                    }
                  })}
                >
                  <SelectTrigger data-testid="select-aggregation">
                    <SelectValue placeholder="Select aggregation" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGGREGATIONS.map(agg => (
                      <SelectItem key={agg.value} value={agg.value}>
                        {agg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {value.queryConfig?.aggregation && ['sum', 'avg', 'min', 'max'].includes(value.queryConfig.aggregation) && (
                  <div className="mt-2">
                    <Label>Field to aggregate</Label>
                    <Select
                      value={value.queryConfig?.aggregationField || ''}
                      onValueChange={(aggregationField) => onChange({
                        ...value,
                        queryConfig: {
                          ...value.queryConfig,
                          filters: value.queryConfig?.filters || [],
                          aggregation: value.queryConfig?.aggregation || 'count',
                          aggregationField,
                          limit: value.queryConfig?.limit || 1000,
                        }
                      })}
                    >
                      <SelectTrigger data-testid="select-aggregation-field">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {fields
                          .filter(field => {
                            if (value.queryConfig?.aggregation === 'sum' || value.queryConfig?.aggregation === 'avg') {
                              return field.fieldType === 'number';
                            }
                            return true;
                          })
                          .map(field => (
                            <SelectItem key={field.id} value={field.fieldName}>
                              {field.fieldName}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    {(value.queryConfig?.aggregation === 'sum' || value.queryConfig?.aggregation === 'avg') && (
                      <p className="text-xs text-gray-500 mt-1">
                        Only numeric fields are shown for SUM and AVG aggregations
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label>Store Result As</Label>
                <Input
                  placeholder="e.g., addressCount"
                  value={value.resultVariable}
                  onChange={(e) => onChange({ ...value, resultVariable: e.target.value })}
                  data-testid="input-result-variable"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use this variable in next steps as {`{${value.resultVariable || 'variableName'}}`}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {value.sourceTable && fields.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Filters</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={addFilter}
                data-testid="button-add-filter"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(value.queryConfig?.filters?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No filters added. Click "Add Filter" to add conditions.
              </p>
            ) : (
              (value.queryConfig?.filters ?? []).map((filter, index) => (
                <div key={filter.id} className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        {index === 0 && <Label className="text-xs">Field</Label>}
                        <Select
                          value={filter.field}
                          onValueChange={(field) => updateFilter(filter.id, { field })}
                        >
                          <SelectTrigger data-testid={`select-filter-field-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fields.map(field => (
                              <SelectItem key={field.id} value={field.fieldName}>
                                {field.fieldName}
                              </SelectItem>
                            ))}
                            {value.sourceTable === 'address_records' && (
                              <>
                                <SelectItem value="airtableFields.Address">
                                  airtableFields.Address
                                </SelectItem>
                                <SelectItem value="airtableFields.StreetName">
                                  airtableFields.StreetName
                                </SelectItem>
                                <SelectItem value="airtableFields.City">
                                  airtableFields.City
                                </SelectItem>
                                <SelectItem value="airtableFields.Postcode">
                                  airtableFields.Postcode
                                </SelectItem>
                                <SelectItem value="airtableFields.Status">
                                  airtableFields.Status
                                </SelectItem>
                                <SelectItem value="airtableFields.Network">
                                  airtableFields.Network
                                </SelectItem>
                              </>
                            )}
                            {(value.sourceTable === 'rag_status_records' || value.sourceTable === 'tariff_records') && (
                              <>
                                <SelectItem value="airtableFields.Status">
                                  airtableFields.Status
                                </SelectItem>
                                <SelectItem value="airtableFields.Name">
                                  airtableFields.Name
                                </SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        {index === 0 && <Label className="text-xs">Operator</Label>}
                        <Select
                          value={filter.operator}
                          onValueChange={(operator) => updateFilter(filter.id, { operator })}
                        >
                          <SelectTrigger data-testid={`select-filter-operator-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map(op => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {needsValue(filter.operator) && (
                        <div className="space-y-1 relative">
                          {index === 0 && <Label className="text-xs">Value</Label>}
                          <div className="flex gap-1">
                            <Input
                              value={filter.value}
                              onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                              placeholder="Enter value or {variable}"
                              data-testid={`input-filter-value-${index}`}
                              className="flex-1"
                            />
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  data-testid={`button-insert-variable-${index}`}
                                  className="px-2"
                                  type="button"
                                >
                                  <Braces className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-2" align="end">
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2 pt-1">
                                    Date Variables
                                  </div>
                                  {DATE_VARIABLES.map(v => (
                                    <Button
                                      key={v.value}
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start text-xs"
                                      onClick={() => updateFilter(filter.id, { value: v.value })}
                                    >
                                      <code className="mr-2 text-purple-600 dark:text-purple-400">{v.value}</code>
                                      {v.label}
                                    </Button>
                                  ))}
                                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2 pt-2 border-t">
                                    Context Variables
                                  </div>
                                  {CONTEXT_VARIABLES.map(v => (
                                    <Button
                                      key={v.value}
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start text-xs"
                                      onClick={() => updateFilter(filter.id, { value: v.value })}
                                    >
                                      <code className="mr-2 text-blue-600 dark:text-blue-400">{v.value}</code>
                                      {v.label}
                                    </Button>
                                  ))}
                                  <div className="text-xs text-gray-500 px-2 pt-2 border-t">
                                    Variables from previous steps will appear here automatically
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          {filter.value.startsWith('{') && filter.value.endsWith('}') && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              Using variable: <code className="font-mono">{filter.value}</code>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFilter(filter.id)}
                    data-testid={`button-remove-filter-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
            
            {value.sourceTable && (value.queryConfig?.filters?.length ?? 0) > 0 && (
              <div className="pt-4 border-t mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testQueryMutation.mutate()}
                  disabled={testQueryMutation.isPending}
                  data-testid="button-test-query"
                >
                  <Play className="h-4 w-4 mr-1" />
                  {testQueryMutation.isPending ? 'Testing...' : 'Test Query'}
                </Button>
                
                {testResult && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-green-900 dark:text-green-100">
                        ✓ Query returned <strong>{testResult.count}</strong> records
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300">
                        ({testResult.duration}ms)
                      </div>
                    </div>
                  </div>
                )}
                
                {testQueryMutation.isError && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <div className="text-sm font-medium text-red-900 dark:text-red-100">
                      ✗ Query failed
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {value.sourceTable && keyResults.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Optional: Direct KPI Update</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Update Key Result (optional)</Label>
              <Select
                value={value.updateKeyResult?.keyResultId?.toString() || 'none'}
                onValueChange={(val) => {
                  if (val === 'none') {
                    const { updateKeyResult, ...rest } = value;
                    onChange(rest);
                  } else {
                    onChange({
                      ...value,
                      updateKeyResult: {
                        keyResultId: parseInt(val),
                        updateType: 'set_value',
                        useResultAs: 'value',
                      },
                    });
                  }
                }}
              >
                <SelectTrigger data-testid="select-key-result">
                  <SelectValue placeholder="No direct update" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No direct update</SelectItem>
                  {keyResults.map(kr => (
                    <SelectItem key={kr.id} value={kr.id.toString()}>
                      {kr.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Or chain with a separate "Update Strategy" step for more control
              </p>
            </div>

            {value.updateKeyResult && (
              <div>
                <Label>Update Type</Label>
                <Select
                  value={value.updateKeyResult.updateType}
                  onValueChange={(updateType: 'set_value' | 'increment') =>
                    onChange({
                      ...value,
                      updateKeyResult: {
                        ...value.updateKeyResult!,
                        updateType,
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set_value">Set Value</SelectItem>
                    <SelectItem value="increment">Increment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
