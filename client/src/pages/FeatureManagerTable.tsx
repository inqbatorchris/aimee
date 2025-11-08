import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import FeatureDetailPanel from '@/components/FeatureDetail/FeatureDetailPanel';
import {
  Package,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle,
  Archive,
  Search,
  Link,
  Users,
  MoreHorizontal,
  ExternalLink,
  Grid,
  List,
  Bot,
  Palette,
  Database,
  HelpCircle,
  ShoppingCart,
  Zap,
  FileText,
  Edit,
  Trash2,
  X,
  Calendar,
  Activity,
  ChevronRight,
  Columns,
  Check
} from 'lucide-react';

interface Feature {
  id: number;
  organizationId: number;
  name: string;
  description?: string;           // Maps to scope_definition from API
  visibilityStatus: 'draft' | 'dev' | 'live' | 'archived';
  isEnabled: boolean;
  icon?: string;
  route?: string;
  parentFeatureId?: number;
  linkedPageIds?: string[];       // Array of page IDs
  createdAt?: string;
  updatedAt?: string;
  scopeDefinition?: string;       // Raw field from API
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300',
  dev: 'bg-orange-100 text-orange-800 border-orange-300', 
  live: 'bg-green-100 text-green-800 border-green-300',
  archived: 'bg-gray-100 text-gray-600 border-gray-300'
};

const statusIcons = {
  draft: AlertCircle,
  dev: Clock,
  live: CheckCircle,
  archived: Archive
};



const getIconComponent = (iconName?: string) => {
  const iconMap: { [key: string]: any } = {
    'Bot': Bot,
    'Palette': Palette,
    'Database': Database,
    'Settings': Settings,
    'HelpCircle': HelpCircle,
    'ShoppingCart': ShoppingCart,
    'Zap': Zap,
    'FileText': FileText,
    'Users': Users,
    'Package': Package,
    'CheckCircle': CheckCircle,
    'Calendar': Calendar,
    'Activity': Activity
  };
  return iconMap[iconName || 'Package'] || Package;
};

// Column configuration
interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

const defaultColumns: ColumnConfig[] = [
  { key: 'module', label: 'Module', visible: true },
  { key: 'status', label: 'Status', visible: true },
  { key: 'enabled', label: 'Enabled', visible: true },
  { key: 'linkedPages', label: 'Linked Pages', visible: false },
  { key: 'route', label: 'Route', visible: false },
  { key: 'createdAt', label: 'Created', visible: false },
  { key: 'actions', label: 'Actions', visible: true },
];

export default function FeatureManagerTable() {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  
  // Load saved column preferences from localStorage or use defaults
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const savedColumns = localStorage.getItem('featureManager.columnVisibility');
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        // Merge saved preferences with default columns to handle any new columns
        return defaultColumns.map(col => {
          const saved = parsed.find((s: ColumnConfig) => s.key === col.key);
          return saved ? { ...col, visible: saved.visible } : col;
        });
      } catch (e) {
        console.error('Error loading column preferences:', e);
        return defaultColumns;
      }
    }
    return defaultColumns;
  });
  
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [pageNames, setPageNames] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: featuresData, isLoading, error } = useQuery({
    queryKey: ['/api/features'],
    queryFn: async () => {
      const response = await apiRequest('/api/features');
      const data = await response.json();
      // Map API response to frontend interface
      return Array.isArray(data) ? data.map((feature: any) => ({
        ...feature,
        description: feature.scopeDefinition || feature.description || '',
        visibilityStatus: feature.visibilityStatus || 'draft'
      })) : [];
    },
    staleTime: 30000,
    retry: 2
  });

  // Ensure features is always an array and handle the response properly
  const features: Feature[] = Array.isArray(featuresData) ? featuresData : [];
  
  // Fetch page names for all linked pages
  React.useEffect(() => {
    const fetchPageNames = async () => {
      // Collect all unique page IDs from features
      const allPageIds = new Set<string>();
      features.forEach(feature => {
        if (feature.linkedPageIds && Array.isArray(feature.linkedPageIds)) {
          feature.linkedPageIds.forEach(id => allPageIds.add(id));
        }
      });

      if (allPageIds.size > 0) {
        try {
          const response = await apiRequest('/api/pages/by-ids', {
            method: 'POST',
            body: { ids: Array.from(allPageIds) }
          });
          const data = await response.json();
          setPageNames(data);
        } catch (error) {
          console.error('Error fetching page names:', error);
        }
      }
    };

    if (features.length > 0) {
      fetchPageNames();
    }
  }, [features]);
  
  // Group features by parent
  const moduleFeatures = features.filter(f => !f.parentFeatureId);
  const childFeatures = features.filter(f => f.parentFeatureId);
  
  const getChildrenForModule = (moduleId: number) => {
    return childFeatures.filter(f => f.parentFeatureId === moduleId);
  };
  
  // Debug logging
  console.log('Features API Response:', featuresData);
  console.log('Module Features:', moduleFeatures.length);
  console.log('Child Features:', childFeatures.length);

  const updateFeatureMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Feature> }) => {
      return apiRequest(`/api/features/${id}`, {
        method: 'PATCH',
        body: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      toast({
        title: 'Feature updated',
        description: 'The feature has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update feature',
        variant: 'destructive',
      });
    },
  });

  const handleStatusChange = (featureId: number, newStatus: string) => {
    updateFeatureMutation.mutate({
      id: featureId,
      updates: { visibilityStatus: newStatus as any }
    });
  };

  const handleEnabledToggle = (featureId: number, isEnabled: boolean) => {
    updateFeatureMutation.mutate({
      id: featureId,
      updates: { isEnabled }
    });
  };


  const deleteFeatureMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/features/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      toast({
        title: 'Feature deleted',
        description: 'The feature has been deleted successfully.',
      });
      setIsDetailOpen(false);
      setSelectedFeature(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete feature',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = (feature: Feature) => {
    if (confirm(`Are you sure you want to delete "${feature.name}"? This action cannot be undone.`)) {
      deleteFeatureMutation.mutate(feature.id);
    }
  };

  // Handle status change for kanban
  const handleKanbanStatusChange = async (featureId: number, newStatus: string) => {
    updateFeatureMutation.mutate({
      id: featureId,
      updates: { visibilityStatus: newStatus as any }
    });
  };

  const handleEdit = (feature: Feature) => {
    // Open edit panel immediately
    openDetail(feature);
  };

  const handlePreview = (feature: Feature) => {
    if (feature.route) {
      window.open(feature.route, '_blank');
    } else {
      toast({
        title: 'No preview available',
        description: 'This feature does not have a route configured.',
        variant: 'destructive',
      });
    }
  };

  const openDetail = async (feature: Feature) => {
    // Show panel immediately with basic data
    setSelectedFeature(feature);
    setIsDetailOpen(true);
    
    // Fetch the full feature details including linked pages
    try {
      const response = await apiRequest(`/api/features/${feature.id}`);
      const fullFeature = await response.json();
      setSelectedFeature(fullFeature);
    } catch (error) {
      console.error('Error fetching feature details:', error);
      // Keep the panel open with basic data if detailed fetch fails
      toast({
        title: 'Warning',
        description: 'Could not load complete feature details. Some information may be missing.',
        variant: 'destructive'
      });
    }
  };

  const toggleModule = (moduleId: number) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  // Filter features (removed search functionality)
  // Build hierarchical structure for display
  const hierarchicalFeatures = moduleFeatures.flatMap(module => {
    const children = getChildrenForModule(module.id);
    return [module, ...children];
  });
  
  const filteredFeatures = hierarchicalFeatures.filter((feature: Feature) => {
    const matchesStatus = selectedStatus === 'all' || feature.visibilityStatus === selectedStatus;
    
    return matchesStatus;
  });

  // Get unique statuses
  const statuses = Array.from(new Set(features.map((f: Feature) => f.visibilityStatus)));

  // Calculate feature counts for dashboard
  const featureCounts = {
    total: features.length,
    modules: moduleFeatures.length,
    childFeatures: childFeatures.length,
    byStatus: statuses.reduce((acc, status) => {
      acc[status] = features.filter(f => f.visibilityStatus === status).length;
      return acc;
    }, {} as Record<string, number>)
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Feature Manager
          </CardTitle>
          <CardDescription>Loading features...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Feature Manager
          </CardTitle>
          <CardDescription className="text-red-600">
            Error loading features: {error.message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/features'] })}>
            Retry Loading
          </Button>
        </CardContent>
      </Card>
    );
  }

  const FeatureCard = ({ feature }: { feature: Feature }) => {
    const StatusIcon = statusIcons[feature.visibilityStatus];
    const IconComponent = getIconComponent(feature.icon);

    return (
      <Card 
        className={`p-3 hover:shadow-md active:shadow-lg transition-all cursor-pointer touch-manipulation select-none ${
          feature.parentFeatureId ? 'ml-4 border-l-2 border-blue-200' : ''
        }`}
        onClick={() => openDetail(feature)}
        onTouchStart={() => {}} // Enable touch on mobile
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`p-1.5 rounded-lg shadow-sm shrink-0 ${
              !feature.parentFeatureId 
                ? 'bg-purple-500' 
                : 'bg-gradient-to-br from-blue-400 to-blue-600'
            }`}>
              <IconComponent className="h-4 w-4 text-white drop-shadow-sm" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm truncate">
                {feature.parentFeatureId && <span className="text-gray-400 mr-1">↳</span>}
                {feature.name}
              </h3>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(feature); }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePreview(feature); }}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); handleDelete(feature); }}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-xs text-gray-600 mb-2 line-clamp-2 min-h-[2rem]">
          {feature.description || 'No description available'}
        </p>

        <div className="flex flex-wrap gap-1 mb-2">
          {!feature.parentFeatureId ? (
            // Parent module - show child count
            <>
              <Badge variant="outline" className="text-xs py-0 px-1.5 bg-purple-100 text-purple-800">
                Module
              </Badge>
              <Badge variant="outline" className="text-xs py-0 px-1.5">
                {getChildrenForModule(feature.id).length} features
              </Badge>
            </>
          ) : (
            // Child feature - show RAG and other badges
            <>
            </>
          )}
          <Badge variant="outline" className={`text-xs py-0 px-1.5 ${statusColors[feature.visibilityStatus]}`}>
            <StatusIcon className="h-3 w-3 mr-0.5" />
            {feature.visibilityStatus}
          </Badge>
        </div>


        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">Enabled</span>
            <Switch
              checked={feature.isEnabled}
              onCheckedChange={(checked) => {
                handleEnabledToggle(feature.id, checked);
              }}
              onClick={(e) => e.stopPropagation()}
              className="scale-75"
            />
          </div>
          
        </div>
      </Card>
    );
  };

  const FeatureListItem = ({ feature }: { feature: Feature }) => {
    const StatusIcon = statusIcons[feature.visibilityStatus];
    const IconComponent = getIconComponent(feature.icon);

    return (
      <div 
        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => openDetail(feature)}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`p-2 rounded-lg shadow-sm bg-gradient-to-br from-blue-400 to-blue-600`}>
            <IconComponent className="h-5 w-5 text-white drop-shadow-sm" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm truncate">{feature.name}</h3>
              <Badge variant="outline" className={`text-xs ${statusColors[feature.visibilityStatus]} shrink-0`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {feature.visibilityStatus}
              </Badge>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 shrink-0">
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Switch
            checked={feature.isEnabled}
            onCheckedChange={(checked) => handleEnabledToggle(feature.id, checked)}
            onClick={(e) => e.stopPropagation()}
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(feature); }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePreview(feature); }}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); handleDelete(feature); }}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full">
      <div className={`${isDetailOpen ? 'flex-1' : 'w-full'} transition-all duration-300 flex flex-col`}>
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-full">
            {/* Filters and Column Selection */}
            <div className="flex gap-2 mb-6 justify-between">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Column Selection Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {columns.map((col) => (
                    <DropdownMenuItem
                      key={col.key}
                      className="flex items-center justify-between cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setColumns(cols => {
                          const newCols = cols.map(c => 
                            c.key === col.key ? { ...c, visible: !c.visible } : c
                          );
                          // Save to localStorage
                          localStorage.setItem('featureManager.columnVisibility', JSON.stringify(newCols));
                          return newCols;
                        });
                      }}
                    >
                      <span>{col.label}</span>
                      {col.visible && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Clean Table Display */}
            {moduleFeatures.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No modules found.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {columns.find(c => c.key === 'module')?.visible && (
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Module</th>
                      )}
                      {columns.find(c => c.key === 'status')?.visible && (
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Status</th>
                      )}
                      {columns.find(c => c.key === 'enabled')?.visible && (
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Enabled</th>
                      )}
                      {columns.find(c => c.key === 'linkedPages')?.visible && (
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Linked Pages</th>
                      )}
                      {columns.find(c => c.key === 'route')?.visible && (
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Route</th>
                      )}
                      {columns.find(c => c.key === 'createdAt')?.visible && (
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Created</th>
                      )}
                      {columns.find(c => c.key === 'actions')?.visible && (
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {moduleFeatures
                      .filter(module => selectedStatus === 'all' || module.visibilityStatus === selectedStatus)
                      .map((module) => {
                        const IconComponent = getIconComponent(module.icon);
                        const StatusIcon = statusIcons[module.visibilityStatus];
                        const isExpanded = expandedModules.has(module.id);
                        const childFeatures = getChildrenForModule(module.id);
                        const filteredChildren = childFeatures.filter(child => 
                          selectedStatus === 'all' || child.visibilityStatus === selectedStatus
                        );

                        return (
                          <React.Fragment key={`module-${module.id}`}>
                            {/* Module Row */}
                            <tr 
                              className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => toggleModule(module.id)}
                            >
                          {columns.find(c => c.key === 'module')?.visible && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <ChevronRight 
                                    className={`h-4 w-4 text-gray-400 transition-transform ${
                                      isExpanded ? 'rotate-90' : ''
                                    }`}
                                  />
                                  <div className="p-2 rounded-lg bg-purple-500">
                                    <IconComponent className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                                <div>
                                  <div className="font-medium text-sm">{module.name}</div>
                                  <div className="text-xs text-gray-500">{childFeatures.length} features</div>
                                </div>
                              </div>
                            </td>
                          )}
                          {columns.find(c => c.key === 'status')?.visible && (
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              {editingStatusId === module.id ? (
                                <Select 
                                  value={module.visibilityStatus} 
                                  onValueChange={(value) => {
                                    handleStatusChange(module.id, value);
                                    setEditingStatusId(null);
                                  }}
                                >
                                  <SelectTrigger className="w-32 mx-auto">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="dev">Dev</SelectItem>
                                    <SelectItem value="live">Live</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge 
                                  variant="outline" 
                                  className={`${statusColors[module.visibilityStatus]} cursor-pointer`}
                                  onClick={() => setEditingStatusId(module.id)}
                                >
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {module.visibilityStatus}
                                </Badge>
                              )}
                            </td>
                          )}
                          {columns.find(c => c.key === 'enabled')?.visible && (
                            <td className="px-4 py-3 text-center">
                              <Switch
                                checked={module.isEnabled}
                                onCheckedChange={(checked) => {
                                  handleEnabledToggle(module.id, checked);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                          )}
                          {columns.find(c => c.key === 'linkedPages')?.visible && (
                            <td className="px-4 py-3 text-center">
                              {module.linkedPageIds && module.linkedPageIds.length > 0 ? (
                                <div className="text-sm text-gray-700">
                                  {module.linkedPageIds.map((pageId, idx) => (
                                    <a
                                      key={pageId}
                                      href={`/page/${pageId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {pageNames[pageId] || 'Loading...'}
                                    </a>
                                  )).reduce<React.ReactNode[]>((prev, curr, idx) => {
                                    return idx === 0 ? [curr] : [...prev, ', ', curr];
                                  }, [])}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                          )}
                          {columns.find(c => c.key === 'route')?.visible && (
                            <td className="px-4 py-3">
                              {module.route ? (
                                <a
                                  href={module.route}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {module.route}
                                </a>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                          )}
                          {columns.find(c => c.key === 'createdAt')?.visible && (
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {module.createdAt ? new Date(module.createdAt).toLocaleDateString() : '-'}
                            </td>
                          )}
                          {columns.find(c => c.key === 'actions')?.visible && (
                            <td className="px-4 py-3 text-center">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetail(module);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                            </tr>

                            {/* Child Features Rows */}
                            {isExpanded && filteredChildren.map((feature) => {
                              const FeatureIcon = getIconComponent(feature.icon);
                              const FeatureStatusIcon = statusIcons[feature.visibilityStatus];

                              return (
                                <tr 
                                  key={feature.id}
                                  className="border-b bg-gray-25 hover:bg-gray-50 cursor-pointer transition-colors"
                                  onClick={() => openDetail(feature)}
                                >
                              {columns.find(c => c.key === 'module')?.visible && (
                                <td className="px-4 py-2">
                                  <div className="flex items-center gap-3 ml-6">
                                    <div className="flex items-center gap-2">
                                      <div className={`p-1.5 rounded-md bg-gradient-to-br from-blue-400 to-blue-600`}>
                                        <FeatureIcon className="h-3 w-3 text-white" />
                                      </div>
                                      <span className="text-sm">{feature.name}</span>
                                    </div>
                                  </div>
                                </td>
                              )}
                              {columns.find(c => c.key === 'status')?.visible && (
                                <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                  {editingStatusId === feature.id ? (
                                    <Select 
                                      value={feature.visibilityStatus} 
                                      onValueChange={(value) => {
                                        handleStatusChange(feature.id, value);
                                        setEditingStatusId(null);
                                      }}
                                    >
                                      <SelectTrigger className="w-28 mx-auto">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="dev">Dev</SelectItem>
                                        <SelectItem value="live">Live</SelectItem>
                                        <SelectItem value="archived">Archived</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Badge 
                                      variant="outline" 
                                      className={`${statusColors[feature.visibilityStatus]} cursor-pointer`}
                                      onClick={() => setEditingStatusId(feature.id)}
                                    >
                                      <FeatureStatusIcon className="h-2 w-2 mr-1" />
                                      {feature.visibilityStatus}
                                    </Badge>
                                  )}
                                </td>
                              )}
                              {columns.find(c => c.key === 'enabled')?.visible && (
                                <td className="px-4 py-2 text-center">
                                  <Switch
                                    checked={feature.isEnabled}
                                    onCheckedChange={(checked) => {
                                      handleEnabledToggle(feature.id, checked);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="scale-75"
                                  />
                                </td>
                              )}
                              {columns.find(c => c.key === 'linkedPages')?.visible && (
                                <td className="px-4 py-2 text-center">
                                  {feature.linkedPageIds && feature.linkedPageIds.length > 0 ? (
                                    <div className="text-xs text-gray-700">
                                      {feature.linkedPageIds.map((pageId, idx) => (
                                        <a
                                          key={pageId}
                                          href={`/page/${pageId}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {pageNames[pageId] || 'Loading...'}
                                        </a>
                                      )).reduce<React.ReactNode[]>((prev, curr, idx) => {
                                        return idx === 0 ? [curr] : [...prev, ', ', curr];
                                      }, [])}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                              )}
                              {columns.find(c => c.key === 'route')?.visible && (
                                <td className="px-4 py-2">
                                  {feature.route ? (
                                    <a
                                      href={feature.route}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {feature.route}
                                    </a>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                              )}
                              {columns.find(c => c.key === 'createdAt')?.visible && (
                                <td className="px-4 py-2 text-xs text-gray-600">
                                  {feature.createdAt ? new Date(feature.createdAt).toLocaleDateString() : '-'}
                                </td>
                              )}
                              {columns.find(c => c.key === 'actions')?.visible && (
                                <td className="px-4 py-2 text-center">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDetail(feature);
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </td>
                              )}
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center text-sm text-gray-600">
              <span>Showing {moduleFeatures.length} modules with {features.filter(f => f.parentFeatureId !== null).length} features</span>
            </div>
          </div>
        </div>
      </div>

    {/* Feature Detail Panel - Slide out from right */}
    <FeatureDetailPanel
      feature={selectedFeature}
      isOpen={isDetailOpen}
      onClose={() => {
        setIsDetailOpen(false);
        setSelectedFeature(null);
      }}
      onUpdate={(updatedFeature) => {
        setSelectedFeature(updatedFeature);
        queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      }}
    />
  </div>
  );
}