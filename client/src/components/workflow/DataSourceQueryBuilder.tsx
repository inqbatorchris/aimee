import { useState } from 'react';
import { Plus, X, Database } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
  // Note: sum/avg/min/max planned for future enhancement
];

export default function DataSourceQueryBuilder({
  value,
  onChange,
  keyResults = [],
}: DataSourceQueryBuilderProps) {
  const { data: dataTables } = useQuery<{ tables: DataTable[] }>({
    queryKey: ['/api/data-explorer/tables'],
  });

  const { data: dataFields } = useQuery<{ fields: DataField[] }>({
    queryKey: [`/api/data-explorer/fields/${value.sourceTable}`],
    enabled: !!value.sourceTable,
  });

  const tables = dataTables?.tables || [];
  const fields = dataFields?.fields || [];

  const addFilter = () => {
    const newFilter: DataSourceFilter = {
      id: Math.random().toString(36).substr(2, 9),
      field: fields[0]?.fieldName || 'localStatus',
      operator: 'equals',
      value: '',
    };
    onChange({
      ...value,
      queryConfig: {
        ...value.queryConfig,
        filters: [...value.queryConfig.filters, newFilter],
      },
    });
  };

  const removeFilter = (id: string) => {
    onChange({
      ...value,
      queryConfig: {
        ...value.queryConfig,
        filters: value.queryConfig.filters.filter(f => f.id !== id),
      },
    });
  };

  const updateFilter = (id: string, updates: Partial<DataSourceFilter>) => {
    onChange({
      ...value,
      queryConfig: {
        ...value.queryConfig,
        filters: value.queryConfig.filters.map(f =>
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
                <div className="flex items-center gap-2">
                  <Input
                    value="Count records"
                    disabled
                    className="bg-gray-100"
                    data-testid="input-aggregation"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  MVP supports counting records. Sum/avg/min/max coming in future release.
                </p>
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
                            <SelectItem value="airtableFields.Network">
                              airtableFields.Network
                            </SelectItem>
                            <SelectItem value="airtableFields.City">
                              airtableFields.City
                            </SelectItem>
                            <SelectItem value="airtableFields.Status">
                              airtableFields.Status
                            </SelectItem>
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
                        <div className="space-y-1">
                          {index === 0 && <Label className="text-xs">Value</Label>}
                          <Input
                            value={filter.value}
                            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                            placeholder="Enter value"
                            data-testid={`input-filter-value-${index}`}
                          />
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
