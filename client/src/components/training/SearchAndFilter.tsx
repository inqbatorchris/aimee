import React, { useState, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, X, Tag, Eye, Clock, BookOpen } from "lucide-react";

interface SearchFilters {
  searchTerm: string;
  category: string;
  status: string;
  visibility: string;
  labels: string[];
}

interface SearchAndFilterProps {
  onFiltersChange: (filters: SearchFilters) => void;
  availableLabels: string[];
  availableCategories: string[];
}

export function SearchAndFilter({ 
  onFiltersChange, 
  availableLabels, 
  availableCategories 
}: SearchAndFilterProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    category: '',
    status: '',
    visibility: '',
    labels: []
  });

  const [showFilters, setShowFilters] = useState(false);

  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    // Convert "all" values to empty strings for filtering
    const processedUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
      if (value === "all") {
        acc[key as keyof SearchFilters] = "" as any;
      } else {
        acc[key as keyof SearchFilters] = value as any;
      }
      return acc;
    }, {} as Partial<SearchFilters>);
    
    const newFilters = { ...filters, ...processedUpdates };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  const toggleLabel = useCallback((label: string) => {
    const newLabels = filters.labels.includes(label)
      ? filters.labels.filter(l => l !== label)
      : [...filters.labels, label];
    updateFilters({ labels: newLabels });
  }, [filters.labels, updateFilters]);

  const clearFilters = useCallback(() => {
    const clearedFilters = {
      searchTerm: '',
      category: '',
      status: '',
      visibility: '',
      labels: []
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  }, [onFiltersChange]);

  const hasActiveFilters = filters.searchTerm || filters.category || filters.status || 
                          filters.visibility || filters.labels.length > 0;

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documents..."
            value={filters.searchTerm}
            onChange={(e) => updateFilters({ searchTerm: e.target.value })}
            className="pl-10 text-xs"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="text-xs"
        >
          <Filter className="w-4 h-4 mr-1" />
          Filters
          {hasActiveFilters && (
            <Badge variant="destructive" className="ml-1 text-xs px-1">
              {Object.values(filters).filter(v => v && (Array.isArray(v) ? v.length > 0 : true)).length}
            </Badge>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1">
          {filters.searchTerm && (
            <Badge variant="outline" className="text-xs">
              <Search className="w-3 h-3 mr-1" />
              "{filters.searchTerm}"
              <X 
                className="w-3 h-3 ml-1 cursor-pointer" 
                onClick={() => updateFilters({ searchTerm: '' })}
              />
            </Badge>
          )}
          {filters.category && (
            <Badge variant="outline" className="text-xs">
              <BookOpen className="w-3 h-3 mr-1" />
              {filters.category}
              <X 
                className="w-3 h-3 ml-1 cursor-pointer" 
                onClick={() => updateFilters({ category: '' })}
              />
            </Badge>
          )}
          {filters.status && (
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {filters.status}
              <X 
                className="w-3 h-3 ml-1 cursor-pointer" 
                onClick={() => updateFilters({ status: '' })}
              />
            </Badge>
          )}
          {filters.visibility && (
            <Badge variant="outline" className="text-xs">
              <Eye className="w-3 h-3 mr-1" />
              {filters.visibility}
              <X 
                className="w-3 h-3 ml-1 cursor-pointer" 
                onClick={() => updateFilters({ visibility: '' })}
              />
            </Badge>
          )}
          {filters.labels.map(label => (
            <Badge key={label} variant="outline" className="text-xs">
              <Tag className="w-3 h-3 mr-1" />
              {label}
              <X 
                className="w-3 h-3 ml-1 cursor-pointer" 
                onClick={() => toggleLabel(label)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Detailed Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Category</label>
                <Select value={filters.category || "all"} onValueChange={(value) => updateFilters({ category: value })}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {availableCategories.map(category => (
                      <SelectItem key={category} value={category} className="text-xs">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Status</label>
                <Select value={filters.status || "all"} onValueChange={(value) => updateFilters({ status: value })}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                    <SelectItem value="published" className="text-xs">Published</SelectItem>
                    <SelectItem value="archived" className="text-xs">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Type</label>
                <Select value={filters.visibility || "all"} onValueChange={(value) => updateFilters({ visibility: value })}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="internal" className="text-xs">Internal Only</SelectItem>
                    <SelectItem value="customer_facing" className="text-xs">Customer Facing</SelectItem>
                    <SelectItem value="public" className="text-xs">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Labels Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Labels</label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableLabels.map(label => (
                    <div key={label} className="flex items-center space-x-2">
                      <Checkbox
                        id={label}
                        checked={filters.labels.includes(label)}
                        onCheckedChange={() => toggleLabel(label)}
                      />
                      <label 
                        htmlFor={label} 
                        className="text-xs cursor-pointer"
                      >
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}