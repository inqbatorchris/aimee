/**
 * Table Template Component
 * 
 * Data table layout with filters, search, pagination, and bulk operations.
 * This template provides a consistent structure for all table-type pages.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, Filter, Download, Upload, MoreHorizontal, 
  RefreshCw, Plus, Trash2, Eye, Settings
} from 'lucide-react';
import { PageMetadata } from '@/services/PageRegistry';
import { Separator } from '@/components/ui/separator';

interface TableTemplateProps {
  pageMetadata: PageMetadata;
  children: React.ReactNode;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onFilter?: (filters: Record<string, any>) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onCreate?: () => void;
  bulkActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    action: (selectedIds: string[]) => void;
    variant?: 'default' | 'destructive';
  }>;
  selectedItems?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  totalItems?: number;
  loading?: boolean;
  filters?: React.ReactNode;
  headerActions?: React.ReactNode;
  className?: string;
}

export function TableTemplate({
  pageMetadata,
  children,
  searchPlaceholder = 'Search...',
  onSearch,
  onFilter,
  onRefresh,
  onExport,
  onImport,
  onCreate,
  bulkActions,
  selectedItems = [],
  onSelectionChange,
  totalItems,
  loading = false,
  filters,
  headerActions,
  className = ''
}: TableTemplateProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {/* Table Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {pageMetadata.title}
              </h1>
              {pageMetadata.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {pageMetadata.description}
                </p>
              )}
            </div>
            {pageMetadata.isCorePage && (
              <Badge variant="secondary" className="text-xs">
                Core
              </Badge>
            )}
            {totalItems !== undefined && (
              <Badge variant="outline" className="text-xs">
                {totalItems} items
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {headerActions}
          </div>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="border-b px-6 py-3 bg-muted/30">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-4 flex-1">
            {/* Search */}
            {onSearch && (
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>
            )}

            {/* Filters */}
            {filters}

            {/* Selected items actions */}
            {selectedItems.length > 0 && bulkActions && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {selectedItems.length} selected
                </span>
                <Separator orientation="vertical" className="h-4" />
                {bulkActions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => action.action(selectedItems)}
                    className="h-8"
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="h-8"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}

            {(onExport || onImport) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {onExport && (
                    <DropdownMenuItem onClick={onExport}>
                      <Download className="mr-2 h-4 w-4" />
                      Export Data
                    </DropdownMenuItem>
                  )}
                  {onImport && (
                    <DropdownMenuItem onClick={onImport}>
                      <Upload className="mr-2 h-4 w-4" />
                      Import Data
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {onCreate && (
              <Button size="sm" onClick={onCreate} className="h-8">
                <Plus className="mr-2 h-4 w-4" />
                Create
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 p-6">
        <Card className="rounded-lg border bg-card">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            children
          )}
        </Card>
      </div>
    </div>
  );
}

// Table Filter Component
export function TableFilter({
  title,
  options,
  value,
  onValueChange,
  placeholder = 'Select...'
}: {
  title: string;
  options: Array<{ label: string; value: string }>;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
        {title}:
      </span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-32 h-8">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Table Empty State
export function TableEmptyState({
  title,
  description,
  action,
  icon
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="font-medium text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}