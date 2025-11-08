import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, X } from 'lucide-react';

export interface AirtableFilter {
  id: string;
  field: string;
  operator: string;
  value: string;
}

const OPERATORS = [
  { value: '=', label: 'Equals' },
  { value: '!=', label: 'Not equals' },
  { value: '>', label: 'Greater than' },
  { value: '<', label: 'Less than' },
  { value: '>=', label: 'Greater than or equal' },
  { value: '<=', label: 'Less than or equal' },
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'NOT_CONTAINS', label: 'Does not contain' },
  { value: 'IS_EMPTY', label: 'Is empty' },
  { value: 'IS_NOT_EMPTY', label: 'Is not empty' },
];

interface AirtableFilterBuilderProps {
  availableFields: string[];
  filters: AirtableFilter[];
  onChange: (filters: AirtableFilter[]) => void;
}

export default function AirtableFilterBuilder({
  availableFields,
  filters,
  onChange,
}: AirtableFilterBuilderProps) {
  const addFilter = () => {
    const newFilter: AirtableFilter = {
      id: Math.random().toString(36).substr(2, 9),
      field: availableFields[0] || '',
      operator: '=',
      value: '',
    };
    onChange([...filters, newFilter]);
  };

  const removeFilter = (id: string) => {
    onChange(filters.filter(f => f.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<AirtableFilter>) => {
    onChange(
      filters.map(f => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const clearAllFilters = () => {
    onChange([]);
  };

  const needsValue = (operator: string) => {
    return !['IS_EMPTY', 'IS_NOT_EMPTY'].includes(operator);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Advanced Filters</CardTitle>
          {filters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filters.map((filter, index) => (
          <div key={filter.id} className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* Field Selection */}
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs">Field</Label>}
                  <Select
                    value={filter.field}
                    onValueChange={(value) => updateFilter(filter.id, { field: value })}
                  >
                    <SelectTrigger data-testid={`select-field-${index}`}>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Operator Selection */}
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs">Operator</Label>}
                  <Select
                    value={filter.operator}
                    onValueChange={(value) => updateFilter(filter.id, { operator: value })}
                  >
                    <SelectTrigger data-testid={`select-operator-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Value Input */}
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs">Value</Label>}
                  {needsValue(filter.operator) ? (
                    <Input
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                      placeholder="Enter value"
                      data-testid={`input-value-${index}`}
                    />
                  ) : (
                    <div className="h-10 flex items-center px-3 text-sm text-muted-foreground border rounded-md bg-muted">
                      No value needed
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeFilter(filter.id)}
              className="shrink-0"
              data-testid={`button-remove-filter-${index}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {/* Add Filter Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={addFilter}
          className="w-full"
          disabled={availableFields.length === 0}
          data-testid="button-add-filter"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add filter
        </Button>

        {filters.length > 0 && (
          <div className="pt-2 text-xs text-muted-foreground border-t">
            {filters.length} active {filters.length === 1 ? 'filter' : 'filters'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
