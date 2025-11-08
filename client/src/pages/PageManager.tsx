import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Filter, Save, Trash2, Eye, EyeOff, Edit2, 
  MoreHorizontal, Search, Download, Upload,
  CheckCircle, XCircle, Clock, Plus, AlertTriangle,
  Database, Settings, Layers, Zap, ChevronRight,
  LayoutDashboard, FileText, Copy, Loader2, Columns,
  Grid, List, Package, Link2, SlidersHorizontal, X
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { PageDetailPanel } from '@/components/page-detail/PageDetailPanel';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { pageRegistry, PageMetadata } from '@/services/PageRegistry';
import { templateEngine } from '@/services/TemplateEngine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Use PageMetadata interface from PageRegistry service
type Page = PageMetadata;

// Form schema for creating new pages
const createPageSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  path: z.string().min(1, 'Path is required').startsWith('/', 'Path must start with /'),
  description: z.string().optional(),
  template: z.enum(['dashboard', 'list-view', 'form-page', 'content-page', 'my-day-clone'])
});

type CreatePageFormValues = z.infer<typeof createPageSchema>;

// Predefined page templates with configurations
const pageTemplates = {
  'dashboard': {
    name: 'Dashboard Page',
    description: 'Analytics dashboard with metrics and charts',
    icon: LayoutDashboard,
    pageContent: {
      sections: [
        {
          id: 'header',
          type: 'page-header',
          config: {
            title: 'Dashboard',
            subtitle: 'Analytics and insights overview'
          }
        },
        {
          id: 'metrics',
          type: 'stats-grid',
          config: {
            responsive: 'md:grid-cols-4',
            metrics: [
              { id: 'total-users', icon: 'Users', label: 'Total Users', iconColor: 'text-blue-500' },
              { id: 'active-sessions', icon: 'Target', label: 'Active Sessions', iconColor: 'text-green-500' },
              { id: 'conversion-rate', icon: 'TrendingUp', label: 'Conversion Rate', iconColor: 'text-purple-500' },
              { id: 'revenue', icon: 'BarChart3', label: 'Revenue', iconColor: 'text-orange-500' }
            ]
          }
        }
      ],
      mockData: {
        quickStats: {
          totalUsers: { value: '1,234', trend: '+12% from last week' },
          activeSessions: { value: '89', trend: '4 active now' },
          conversionRate: { value: '3.2%', trend: '+0.5% from yesterday' },
          revenue: { value: '$12,345', trend: '+18% this month' }
        }
      }
    }
  },
  'list-view': {
    name: 'List View Page',
    description: 'Data table with filtering and pagination',
    icon: FileText,
    pageContent: {
      sections: [
        {
          id: 'header',
          type: 'page-header',
          config: {
            title: 'Data List',
            subtitle: 'Manage and view records'
          }
        }
      ]
    }
  },
  'form-page': {
    name: 'Form Page',
    description: 'Input form with validation',
    icon: Edit2,
    pageContent: {
      sections: [
        {
          id: 'header',
          type: 'page-header',
          config: {
            title: 'Form',
            subtitle: 'Enter your information'
          }
        }
      ]
    }
  },
  'content-page': {
    name: 'Content Page',
    description: 'Static content with rich text',
    icon: FileText,
    pageContent: {
      sections: [
        {
          id: 'header',
          type: 'page-header',
          config: {
            title: 'Content Page',
            subtitle: 'Information and resources'
          }
        }
      ]
    }
  },
  'my-day-clone': {
    name: 'My Day Clone',
    description: 'Complete replica of My Day dashboard',
    icon: Copy,
    pageContent: {
      sections: [
        {
          id: 'header',
          type: 'page-header',
          config: {
            title: 'My Day Clone',
            subtitle: 'dynamic-date',
            actions: [
              { icon: 'Calendar', type: 'button', label: 'View Calendar', variant: 'outline', size: 'sm' },
              { icon: 'BarChart3', type: 'button', label: 'Reports', variant: 'outline', size: 'sm' }
            ]
          }
        },
        {
          id: 'quick-add',
          type: 'quick-task-input',
          config: {
            placeholder: 'Quick add a task...',
            buttonText: 'Add Task',
            buttonIcon: 'Plus',
            enterKeySubmit: true,
            microphoneEnabled: true
          }
        },
        {
          id: 'top-outcomes',
          type: 'outcomes-grid',
          config: {
            title: "Today's Top 3 Outcomes",
            titleIcon: 'Target',
            responsive: 'md:grid-cols-3',
            dataSource: 'objectives.getTopThree()',
            itemConfig: {
              showTrend: true,
              showTarget: true,
              showProgress: true
            }
          }
        },
        {
          id: 'tasks-section',
          type: 'tasks-grid',
          config: {
            responsive: 'md:grid-cols-2',
            sections: [
              {
                id: 'today-tasks',
                title: "Today's Tasks",
                titleIcon: 'CheckCircle',
                titleIconColor: 'text-green-500',
                showBadge: true,
                badgeVariant: 'default',
                emptyState: {
                  message: 'All tasks completed! Great work.',
                  iconSize: 'h-8 w-8',
                  iconColor: 'text-green-400'
                }
              },
              {
                id: 'overdue-tasks',
                title: 'Overdue Tasks',
                titleIcon: 'AlertCircle',
                titleIconColor: 'text-red-500',
                showBadge: true,
                badgeVariant: 'destructive',
                emptyState: {
                  message: 'No overdue tasks. Stay on track!',
                  iconSize: 'h-8 w-8',
                  iconColor: 'text-green-400'
                }
              }
            ]
          }
        },
        {
          id: 'quick-stats',
          type: 'stats-grid',
          config: {
            responsive: 'md:grid-cols-4',
            metrics: [
              { id: 'tasks-completed', icon: 'CheckCircle', label: 'Tasks Completed', iconColor: 'text-green-500' },
              { id: 'team-velocity', icon: 'TrendingUp', label: 'Team Velocity', iconColor: 'text-blue-500' },
              { id: 'active-projects', icon: 'BarChart3', label: 'Active Projects', iconColor: 'text-purple-500' },
              { id: 'team-members', icon: 'Users', label: 'Team Members', iconColor: 'text-orange-500' }
            ]
          }
        }
      ],
      mockData: {
        topOutcomes: [
          {
            id: 1,
            title: 'Increase Monthly Recurring Revenue',
            progress: 65,
            target: 100000,
            current: 65000,
            unit: 'USD',
            trend: 'up'
          },
          {
            id: 2,
            title: 'Onboard New Enterprise Clients',
            progress: 40,
            target: 10,
            current: 4,
            unit: 'clients',
            trend: 'up'
          },
          {
            id: 3,
            title: 'Reduce Support Response Time',
            progress: 80,
            target: 2,
            current: 2.5,
            unit: 'hours',
            trend: 'down'
          }
        ],
        todayTasks: [
          {
            id: 1,
            title: 'Review Q1 performance metrics',
            dueDate: 'Today, 2:00 PM',
            priority: 'high',
            keyResult: 'Increase Monthly Recurring Revenue',
            status: 'in_progress'
          }
        ],
        overdueTasks: [],
        quickStats: {
          tasksCompleted: { value: '12', trend: '+20% from yesterday' },
          teamVelocity: { value: '87%', trend: 'On track' },
          activeProjects: { value: '5', trend: '2 near deadline' },
          teamMembers: { value: '8', trend: 'All active' }
        }
      }
    }
  }
};

export default function PageManager() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Page statistics state

  const [selectedPageForDetail, setSelectedPageForDetail] = useState<any | null>(null);
  const [pageFeatures, setPageFeatures] = useState<{[key: string]: any[]}>({});

  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch pages from database - bypassing cache issues
  const [pages, setPages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Create page form
  const createPageForm = useForm<CreatePageFormValues>({
    resolver: zodResolver(createPageSchema),
    defaultValues: {
      title: '',
      slug: '',
      path: '',
      description: '',
      template: 'dashboard'
    }
  });

  // Create page mutation
  const createPageMutation = useMutation({
    mutationFn: async (values: CreatePageFormValues) => {
      const templateConfig = pageTemplates[values.template];
      const pageData = {
        title: values.title,
        slug: values.slug,
        path: values.path,
        description: values.description || templateConfig.description,
        status: 'draft',
        buildStatus: 'building',
        isCorePage: false,
        pageContent: templateConfig.pageContent,
        functions: ['template'],
        visibilityRules: {},
        pageMetadata: {
          template: values.template,
          createdVia: 'page-manager',
          visibleInNavigation: true // Default to visible
        },
        componentConfig: {}
      };
      
      const response = await fetch('/api/dev/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create page');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Refresh the pages list
      const refetchPages = async () => {
        try {
          setIsLoading(true);
          const response = await fetch('/api/dev/pages', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            }
          });
          
          if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
          }
          
          const data = await response.json();
          setPages(data);
        } catch (err) {
          console.error('Error fetching pages:', err);
          setError(err as Error);
          setPages([]);
        } finally {
          setIsLoading(false);
        }
      };
      
      refetchPages();
      setShowCreateDialog(false);
      createPageForm.reset();
      toast({
        title: "Page created",
        description: "Your new page has been created successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create page. Please try again.",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    const fetchPages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Fetching pages directly...');
        
        const response = await fetch('/api/dev/pages', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Direct fetch result:', data, 'Length:', data.length);
        setPages(data);
      } catch (err) {
        console.error('Error fetching pages:', err);
        setError(err as Error);
        setPages([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPages();
  }, []);

  // Fetch features for all pages and available features
  useEffect(() => {
    const fetchPageFeatures = async () => {
      if (pages.length > 0) {
        const featuresMap: {[key: string]: any[]} = {};
        
        // Fetch features for each page in parallel
        const promises = pages.map(async (page) => {
          try {
            const response = await fetch(`/api/pages/${page.id}/features`, {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
              }
            });
            if (response.ok) {
              const features = await response.json();
              featuresMap[page.id] = features;
            } else {
              featuresMap[page.id] = [];
            }
          } catch (error) {
            console.error(`Error fetching features for page ${page.id}:`, error);
            featuresMap[page.id] = [];
          }
        });
        
        await Promise.all(promises);
        setPageFeatures(featuresMap);
        
        // Extract unique features for the filter dropdown
        const allFeatures = new Set<any>();
        const featureMap = new Map();
        Object.values(featuresMap).forEach(features => {
          features.forEach(feature => {
            if (!featureMap.has(feature.id)) {
              featureMap.set(feature.id, feature);
            }
          });
        });
        setAvailableFeatures(Array.from(featureMap.values()));
      }
    };
    
    fetchPageFeatures();
  }, [pages]);

  // Debug logging
  console.log('Pages array length:', pages.length);
  console.log('Loading state:', isLoading);
  console.log('Error state:', error);

  // State for UI interactions
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set([
    'name', 'path', 'status', 'slug', 'type', 'features'
  ]));
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{id: string; field: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFeature, setFilterFeature] = useState('all');
  const [availableFeatures, setAvailableFeatures] = useState<any[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Available columns for column selector
  const availableColumns = [
    { id: 'name', label: 'Name', required: true },
    { id: 'path', label: 'Path', required: false },
    { id: 'status', label: 'Status', required: false },
    { id: 'slug', label: 'Slug', required: false },
    { id: 'build', label: 'Build', required: false },
    { id: 'type', label: 'Type', required: false },
    { id: 'features', label: 'Features', required: false },
    { id: 'modified', label: 'Modified', required: false }
  ];

  // Page update mutation
  const updatePageMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return apiRequest(`/api/dev/pages/${id}`, {
        method: 'PATCH',
        body: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dev/pages'] });
      toast({
        title: 'Page updated',
        description: 'The page has been updated successfully.',
      });
    },
    onError: (error: any) => {
      console.log('Error saving page field:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update page',
        variant: 'destructive',
      });
    },
  });

  // Filter pages based on filters
  const filteredPages = pages.filter(page => {
    const matchesStatus = filterStatus === 'all' || page.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || page.category === filterCategory;
    const matchesFeature = filterFeature === 'all' || 
      (pageFeatures[page.id]?.some(feature => feature.id.toString() === filterFeature));
    return matchesStatus && matchesCategory && matchesFeature;
  });

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPages(new Set(filteredPages.map(p => p.id)));
    } else {
      setSelectedPages(new Set());
    }
  };

  // Handle individual selection
  const handleSelectPage = (pageId: string, checked: boolean) => {
    const newSelected = new Set(selectedPages);
    if (checked) {
      newSelected.add(pageId);
    } else {
      newSelected.delete(pageId);
    }
    setSelectedPages(newSelected);
  };

  // Start editing a cell
  const startEditing = (pageId: string, field: string, value: string) => {
    setEditingCell({ id: pageId, field });
    setEditValue(value);
  };

  // Save edited cell  
  const saveEdit = async () => {
    if (editingCell) {
      try {
        const updateData = { [editingCell.field]: editValue };
        await apiRequest(`/api/dev/pages/${editingCell.id}`, {
          method: 'PATCH',
          body: updateData,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/dev/pages'] });
        setEditingCell(null);
        toast({
          title: "Page updated",
          description: "Changes saved successfully"
        });
      } catch (error) {
        console.error('Error saving page field:', error);
        toast({
          title: "Error",
          description: "Failed to save changes",
          variant: "destructive"
        });
      }
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Column visibility toggle
  const toggleColumn = (columnId: string) => {
    const newVisibleColumns = new Set(visibleColumns);
    if (newVisibleColumns.has(columnId)) {
      // Don't allow removing required columns
      const column = availableColumns.find(col => col.id === columnId);
      if (!column?.required) {
        newVisibleColumns.delete(columnId);
      }
    } else {
      newVisibleColumns.add(columnId);
    }
    setVisibleColumns(newVisibleColumns);
  };

  // Handle status change for kanban
  const handleKanbanStatusChange = async (pageId: string, newStatus: string) => {
    try {
      await apiRequest(`/api/dev/pages/${pageId}`, {
        method: 'PATCH',
        body: { status: newStatus },
      });
      // Refresh pages
      const refetchPages = async () => {
        try {
          setIsLoading(true);
          const response = await fetch('/api/dev/pages', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            }
          });
          
          if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
          }
          
          const data = await response.json();
          setPages(data);
        } catch (err) {
          console.error('Error fetching pages:', err);
          setError(err as Error);
          setPages([]);
        } finally {
          setIsLoading(false);
        }
      };
      
      refetchPages();
      toast({
        title: "Status updated",
        description: "Page status has been updated successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update page status",
        variant: "destructive"
      });
    }
  };

  // Function to open feature detail
  const openFeatureDetail = (featureId: number) => {
    // Navigate to feature manager with selected feature
    setLocation(`/feature-manager?feature=${featureId}`);
  };

  // Bulk actions
  const handleBulkAction = (action: string) => {
    switch(action) {
      case 'delete':
        // TODO: Implement API call to delete pages
        console.log('Bulk delete not implemented yet:', selectedPages);
        setSelectedPages(new Set());
        toast({
          title: "Pages deleted",
          description: `${selectedPages.size} pages removed`
        });
        break;
      case 'hide':
      case 'show':
        // TODO: Implement API call to update visibility
        console.log('Bulk visibility update not implemented yet:', action, selectedPages);
        toast({
          title: `Pages ${action === 'show' ? 'shown' : 'hidden'}`,
          description: `${selectedPages.size} pages ${action === 'show' ? 'made visible' : 'hidden'}`
        });
        break;
      case 'draft':
      case 'in_review':
      case 'active':
        // TODO: Implement API call to update bulk status
        console.log('Bulk status update not implemented yet:', action, selectedPages);
        toast({
          title: "Status updated",
          description: `${selectedPages.size} pages set to ${action}`
        });
        break;
    }
  };

  // Quick status change
  const handleStatusChange = (pageId: string, status: string) => {
    updatePageMutation.mutate({
      id: pageId,
      updates: { status }
    });
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'live': return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'dev': return <Clock className="h-3 w-3 text-yellow-500" />;
      case 'draft': return <XCircle className="h-3 w-3 text-gray-400" />;
      case 'archived': return <XCircle className="h-3 w-3 text-red-500" />;
      default: return <XCircle className="h-3 w-3 text-gray-400" />;
    }
  };

  // Check if user is super admin
  if (currentUser?.role !== 'super_admin') {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            This page is only available to super administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-2 sm:p-4 overflow-hidden max-w-screen-2xl mx-auto w-full">


      {/* Header - Mobile Optimized */}
      <div className="mb-2 sm:mb-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-bold">Page Manager</h1>
          
          <div className="flex items-center gap-1">
            {/* Mobile Filter Button */}
            <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
              <SheetTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 px-2 sm:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {(filterCategory !== 'all' || filterStatus !== 'all' || filterFeature !== 'all') && (
                    <span className="ml-1 h-2 w-2 bg-primary rounded-full" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    Refine your page list
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Core">Core</SelectItem>
                        <SelectItem value="Strategy">Strategy</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Settings">Settings</SelectItem>
                        <SelectItem value="DevTools">DevTools</SelectItem>
                        <SelectItem value="Integrations">Integrations</SelectItem>
                        <SelectItem value="Support">Support</SelectItem>
                        <SelectItem value="Analytics">Analytics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="dev">Development</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Application</label>
                    <Select value={filterFeature} onValueChange={setFilterFeature}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Apps" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Apps</SelectItem>
                        {availableFeatures.map(feature => (
                          <SelectItem key={feature.id} value={feature.id.toString()}>
                            {feature.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      onClick={() => setShowMobileFilters(false)}
                    >
                      Apply Filters
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setFilterCategory('all');
                        setFilterStatus('all');
                        setFilterFeature('all');
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            {/* View Mode Toggle - Compact */}
            <div className="flex border rounded-md">
              <Button 
                size="sm" 
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                className="px-2 rounded-r-none h-8"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                className="px-2 rounded-l-none border-l h-8"
                onClick={() => setViewMode('kanban')}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Column Selector - Hidden on mobile */}
            {viewMode === 'table' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="hidden sm:flex h-8 px-2">
                    <Columns className="h-4 w-4" />
                    <span className="ml-1">Columns</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableColumns.map(column => (
                    <DropdownMenuItem 
                      key={column.id}
                      onClick={() => toggleColumn(column.id)}
                      className="flex items-center gap-2"
                    >
                      <Checkbox 
                        checked={visibleColumns.has(column.id)}
                        disabled={column.required}
                      />
                      <span>{column.label}</span>
                      {column.required && <span className="text-xs text-muted-foreground">(required)</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Action Buttons - Hidden on mobile except New */}
            <Button 
              size="sm" 
              variant="outline"
              className="hidden sm:flex h-8 px-2"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/dev/pages'] });
              }}
            >
              <Zap className="h-4 w-4" />
              <span className="ml-1">Refresh</span>
            </Button>
            <Button size="sm" variant="outline" className="hidden sm:flex h-8 px-2">
              <Upload className="h-4 w-4" />
              <span className="ml-1">Import</span>
            </Button>
            <Button size="sm" variant="outline" className="hidden sm:flex h-8 px-2">
              <Download className="h-4 w-4" />
              <span className="ml-1">Export</span>
            </Button>
            
            {/* New Page Button - Always visible */}
            <Button 
              size="sm" 
              className="h-8 px-2"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">New</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Filters - Hidden on mobile */}
      <div className="hidden sm:flex gap-2 mb-3">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Core">Core</SelectItem>
            <SelectItem value="Strategy">Strategy</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Settings">Settings</SelectItem>
            <SelectItem value="DevTools">DevTools</SelectItem>
            <SelectItem value="Integrations">Integrations</SelectItem>
            <SelectItem value="Support">Support</SelectItem>
            <SelectItem value="Analytics">Analytics</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 h-8 text-sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="dev">Development</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterFeature} onValueChange={setFilterFeature}>
          <SelectTrigger className="w-48 h-8 text-sm">
            <SelectValue placeholder="All Apps" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Apps</SelectItem>
            {availableFeatures.map(feature => (
              <SelectItem key={feature.id} value={feature.id.toString()}>
                {feature.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Mobile Active Filters Pills */}
      {(filterCategory !== 'all' || filterStatus !== 'all' || filterFeature !== 'all') && (
        <div className="sm:hidden flex items-center gap-2 mb-2 overflow-x-auto pb-1">
          {filterCategory !== 'all' && (
            <Badge variant="secondary" className="text-xs whitespace-nowrap flex items-center gap-1">
              {filterCategory}
              <button 
                onClick={() => setFilterCategory('all')}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filterStatus !== 'all' && (
            <Badge variant="secondary" className="text-xs whitespace-nowrap flex items-center gap-1">
              {filterStatus}
              <button 
                onClick={() => setFilterStatus('all')}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filterFeature !== 'all' && (
            <Badge variant="secondary" className="text-xs whitespace-nowrap flex items-center gap-1">
              {availableFeatures.find(f => f.id.toString() === filterFeature)?.name || 'App'}
              <button 
                onClick={() => setFilterFeature('all')}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Bulk Actions - Mobile Optimized */}
      {selectedPages.size > 0 && (
        <div className="flex items-center gap-1 mb-2 p-2 bg-muted rounded overflow-x-auto">
          <span className="text-xs font-medium whitespace-nowrap">{selectedPages.size} selected</span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 hidden sm:flex" onClick={() => handleBulkAction('draft')}>
              Set Draft
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 hidden sm:flex" onClick={() => handleBulkAction('in_review')}>
              Set Review
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 hidden sm:flex" onClick={() => handleBulkAction('active')}>
              Set Active
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleBulkAction('show')}>
              <Eye className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleBulkAction('hide')}>
              <EyeOff className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSelectedPages(new Set())}>
              <X className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => handleBulkAction('delete')}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Table or Kanban View */}
      {viewMode === 'table' ? (
        <div className="flex-1 min-h-0 overflow-hidden border rounded">
          <div className="h-full overflow-auto max-w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-sm text-muted-foreground">Loading pages...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-sm text-red-500">Error loading pages: {String(error)}</div>
            </div>
          ) : (
          <Table className="w-full min-w-full">
            <TableHeader className="sticky top-0 bg-background">
              <TableRow className="text-xs">
                <TableHead className="w-8">
                  <Checkbox 
                    checked={selectedPages.size === filteredPages.length && filteredPages.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-6">Type</TableHead>
                <TableHead className="min-w-0">Name</TableHead>
                {visibleColumns.has('path') && <TableHead className="hidden sm:table-cell min-w-0">Path</TableHead>}
                {visibleColumns.has('status') && <TableHead className="w-16 sm:w-20">Status</TableHead>}
                {visibleColumns.has('slug') && <TableHead className="hidden md:table-cell w-24">Slug</TableHead>}
                {visibleColumns.has('type') && <TableHead className="hidden lg:table-cell w-32">Type</TableHead>}
                {visibleColumns.has('features') && <TableHead className="hidden xl:table-cell w-32">Features</TableHead>}
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredPages.map(page => (
              <TableRow key={page.id} className="text-xs h-10 sm:h-12">
                <TableCell className="py-1 sm:py-2">
                  <Checkbox 
                    checked={selectedPages.has(page.id)}
                    onCheckedChange={(checked) => handleSelectPage(page.id, checked as boolean)}
                    className="h-3 w-3 sm:h-4 sm:w-4"
                  />
                </TableCell>
                <TableCell className="py-1 sm:py-2">
                  <div className="text-sm">
                    {page.buildStatus === 'testing' || page.slug?.includes('-core') ? '✅' : '👨‍💻'}
                  </div>
                </TableCell>
                <TableCell className="py-1 sm:py-2">
                  {editingCell?.id === page.id && editingCell?.field === 'title' ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => e.key === 'Enter' ? saveEdit() : e.key === 'Escape' ? cancelEdit() : null}
                      className="h-6 text-xs"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Eye 
                        className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-primary" 
                        onClick={() => window.open(page.path, '_blank')}
                      />
                      <div 
                        className="cursor-pointer hover:bg-muted px-1 rounded text-primary hover:underline truncate text-xs sm:text-sm flex-1"
                        onClick={() => {
                          setSelectedPageForDetail(page);
                          setDetailPanelOpen(true);
                        }}
                        onDoubleClick={() => startEditing(page.id, 'title', page.title)}
                      >
                        {page.title}
                      </div>
                      {/* Show linked application */}
                      {pageFeatures[page.id] && pageFeatures[page.id].length > 0 && (
                        <div className="flex items-center gap-1">
                          <Link2 className="h-3 w-3 text-muted-foreground" />
                          <span 
                            className="text-xs text-muted-foreground cursor-pointer hover:text-primary hover:underline"
                            onClick={() => openFeatureDetail(pageFeatures[page.id][0].id)}
                            title={`View ${pageFeatures[page.id][0].name} feature details`}
                          >
                            {pageFeatures[page.id][0].name}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </TableCell>
                {visibleColumns.has('path') && (
                  <TableCell className="hidden sm:table-cell py-1 sm:py-2">
                    {editingCell?.id === page.id && editingCell?.field === 'path' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => e.key === 'Enter' ? saveEdit() : e.key === 'Escape' ? cancelEdit() : null}
                        className="h-6 text-xs"
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="cursor-pointer hover:bg-muted px-1 rounded font-mono text-xs overflow-hidden truncate"
                        onDoubleClick={() => startEditing(page.id, 'path', page.path)}
                      >
                        {page.path}
                      </div>
                    )}
                  </TableCell>
                )}
                {visibleColumns.has('status') && (
                  <TableCell className="py-1 sm:py-2">
                    <Select value={page.status} onValueChange={(value) => handleStatusChange(page.id, value as any)}>
                      <SelectTrigger className="h-5 sm:h-6 text-xs border-0 p-0">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(page.status)}
                          <span className="text-xs">{page.status}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="dev">Development</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                )}
                {visibleColumns.has('slug') && (
                  <TableCell className="hidden md:table-cell py-1 sm:py-2">
                    <span className="text-xs truncate block max-w-20">{page.slug}</span>
                  </TableCell>
                )}
                {visibleColumns.has('type') && (
                  <TableCell className="hidden lg:table-cell py-1 sm:py-2">
                    <Badge variant={page.isCorePage ? "default" : "outline"} className="text-xs px-1 py-0 h-4">
                      {page.isCorePage ? "Core" : "Custom"}
                    </Badge>
                  </TableCell>
                )}
                {visibleColumns.has('features') && (
                  <TableCell className="hidden xl:table-cell py-1 sm:py-2">
                    <div className="flex flex-wrap gap-1 max-w-32">
                      {pageFeatures[page.id]?.map((feature) => (
                        <Badge 
                          key={feature.id}
                          variant="secondary" 
                          className="text-xs px-1 py-0 h-4 cursor-pointer hover:bg-blue-100 hover:text-blue-800 transition-colors"
                          onClick={() => openFeatureDetail(feature.id)}
                          title={`Click to view ${feature.name} feature details`}
                        >
                          {feature.name}
                        </Badge>
                      )) || (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                )}
                <TableCell className="py-1 sm:py-2">
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 w-5 p-0 sm:h-6 sm:w-6"
                      onClick={() => {
                        setSelectedPageForDetail(page);
                        setDetailPanelOpen(true);
                      }}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 sm:h-6 sm:w-6">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-xs"
                          onClick={() => {
                            setSelectedPageForDetail(page);
                            setDetailPanelOpen(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs">
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs">
                          View Logs
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-xs text-destructive">
                          <Trash2 className="h-3 w-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
        </div>
      </div>

      ) : (
        /* Kanban View */
        <div className="flex-1 overflow-auto">
          <div className="flex gap-4 p-4 min-w-fit">
            {['draft', 'dev', 'live', 'archived'].map(status => (
              <div key={status} className="flex-1 min-w-80">
                <div className="mb-3">
                  <h3 className="font-medium text-sm capitalize flex items-center gap-2">
                    {getStatusIcon(status)}
                    {status}
                    <Badge variant="outline" className="ml-auto">
                      {filteredPages.filter(page => page.status === status).length}
                    </Badge>
                  </h3>
                </div>
                <div className="space-y-2 min-h-96 bg-muted/20 rounded-lg p-2">
                  {filteredPages
                    .filter(page => page.status === status)
                    .map(page => (
                      <Card 
                        key={page.id} 
                        className="p-3 cursor-move hover:shadow-md transition-shadow"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', page.id);
                          e.dataTransfer.setData('application/json', JSON.stringify({ pageId: page.id, sourceStatus: status }));
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const data = e.dataTransfer.getData('application/json');
                          if (data) {
                            const { pageId, sourceStatus } = JSON.parse(data);
                            if (sourceStatus !== status) {
                              handleKanbanStatusChange(pageId, status);
                            }
                          }
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                              <Eye 
                                className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-primary" 
                                onClick={() => window.open(page.path, '_blank')}
                              />
                            </div>
                            <h4 className="font-medium text-sm truncate">{page.title}</h4>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setSelectedPageForDetail(page);
                              setDetailPanelOpen(true);
                            }}
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-2 truncate">{page.path}</p>
                        
                        {pageFeatures[page.id] && pageFeatures[page.id].length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {pageFeatures[page.id].slice(0, 2).map(feature => (
                              <Badge 
                                key={feature.id} 
                                variant="outline" 
                                className="text-xs cursor-pointer hover:bg-primary/10"
                                onClick={() => openFeatureDetail(feature.id)}
                              >
                                <Package className="h-3 w-3 mr-1" />
                                {feature.name}
                              </Badge>
                            ))}
                            {pageFeatures[page.id].length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{pageFeatures[page.id].length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{page.slug}</span>
                          <span>{new Date(page.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </Card>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-muted-foreground">
          Showing {filteredPages.length} of {pages.length} pages
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled>
            Previous
          </Button>
          <Button size="sm" variant="outline" disabled>
            Next
          </Button>
        </div>
      </div>

      {/* Page Detail Panel */}
      <PageDetailPanel 
        page={selectedPageForDetail}
        open={detailPanelOpen}
        onClose={() => {
          setDetailPanelOpen(false);
          setSelectedPageForDetail(null);
        }}
        onSave={async (updatedPage) => {
          try {
            const response = await apiRequest(`/api/dev/pages/${updatedPage.id}`, {
              method: 'PATCH',
              body: {
                title: updatedPage.title,
                path: updatedPage.path,
                description: updatedPage.description,
                status: updatedPage.status,
                category: updatedPage.category,
                visible: updatedPage.visible,
                pageMetadata: updatedPage.pageMetadata,
                roles: updatedPage.roles,
                visibilityRules: updatedPage.visibilityRules,
                pageContent: updatedPage.pageContent,
                themeOverrides: updatedPage.themeOverrides,
                componentConfig: updatedPage.componentConfig
              }
            });
            
            if (!response.ok) {
              throw new Error('Failed to update page');
            }
            
            // Refresh the pages list
            const fetchPages = async () => {
              try {
                setIsLoading(true);
                const response = await fetch('/api/dev/pages', {
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                  }
                });
                
                if (!response.ok) {
                  throw new Error(`API Error: ${response.status}`);
                }
                
                const data = await response.json();
                setPages(data);
              } catch (err) {
                console.error('Error fetching pages:', err);
                setError(err as Error);
                setPages([]);
              } finally {
                setIsLoading(false);
              }
            };
            
            await fetchPages();
            
            toast({
              title: "Page updated",
              description: `${updatedPage.title} has been saved successfully.`
            });
          } catch (error) {
            toast({
              title: "Error",
              description: "Failed to save page changes.",
              variant: "destructive"
            });
            console.error('Error saving page:', error);
          }
        }}
      />

      {/* Create Page Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
            <DialogDescription>
              Choose a template and configure your new page. Pages created here will be dynamically rendered from the database.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...createPageForm}>
            <form onSubmit={createPageForm.handleSubmit((values) => createPageMutation.mutate(values))} className="space-y-6">
              {/* Template Selection */}
              <FormField
                control={createPageForm.control}
                name="template"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Page Template</FormLabel>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(pageTemplates).map(([key, template]) => {
                        const Icon = template.icon;
                        return (
                          <div
                            key={key}
                            className={`relative cursor-pointer rounded-lg border-2 p-4 hover:border-primary ${
                              field.value === key ? 'border-primary bg-primary/5' : 'border-border'
                            }`}
                            onClick={() => field.onChange(key)}
                          >
                            <div className="flex items-start gap-3">
                              <Icon className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-sm">{template.name}</h4>
                                <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                              </div>
                            </div>
                            {field.value === key && (
                              <div className="absolute top-2 right-2">
                                <div className="h-2 w-2 rounded-full bg-primary"></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createPageForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="My Awesome Page" {...field} onChange={(e) => {
                          field.onChange(e);
                          // Auto-generate slug from title
                          if (!createPageForm.getValues('slug')) {
                            const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                            createPageForm.setValue('slug', slug);
                          }
                          // Auto-generate path from title
                          if (!createPageForm.getValues('path')) {
                            const path = '/' + e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                            createPageForm.setValue('path', path);
                          }
                        }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createPageForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input placeholder="my-awesome-page" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createPageForm.control}
                name="path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Path</FormLabel>
                    <FormControl>
                      <Input placeholder="/my-awesome-page" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createPageForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="A brief description of what this page is for..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPageMutation.isPending}>
                  {createPageMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Page
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}