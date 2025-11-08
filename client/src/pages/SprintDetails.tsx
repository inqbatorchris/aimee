import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Play, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import SprintOverviewSection from '@/components/strategy/SprintOverviewSection';
import SprintTeamSection from '@/components/strategy/SprintTeamSection';
import SprintItemsSection from '@/components/strategy/SprintItemsSection';
import SprintBacklogSection from '@/components/strategy/SprintBacklogSection';
import { apiRequest } from '@/lib/queryClient';

export default function SprintDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { user } = useAuth();
  
  // Check if user can delete sprints (admin or super_admin)
  const canDeleteSprints = user?.role === 'admin' || user?.role === 'super_admin';

  const isNewSprint = id === 'new';

  // Fetch sprint data
  const { data: sprint, isLoading, error } = useQuery({
    queryKey: [`/api/strategy/sprints/${id}`],
    enabled: !isNewSprint,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always consider data stale to ensure fresh fetch
  });

  // Fetch available backlog items
  const { data: availableBacklogItems = [] } = useQuery({
    queryKey: ['/api/strategy/backlog/available'],
  });

  // Fetch current sprint items  
  const { data: sprintItems = [] } = useQuery({
    queryKey: [`/api/strategy/tickets`, { sprintId: id }],
    enabled: !isNewSprint,
  });

  // Fetch team members
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/users'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Fetch sprint roles
  const { data: sprintRoles = [] } = useQuery({
    queryKey: [`/api/strategy/sprints/${id}/roles`],
    enabled: !isNewSprint,
  });

  // Debug logging with safety checks
  useEffect(() => {
    try {
      console.log('SprintDetails debug:', {
        id,
        isNewSprint,
        sprint: sprint ? 'loaded' : 'null',
        isLoading,
        error: error ? error.message : 'none',
        usersData: Array.isArray(users) ? `array(${users.length})` : typeof users,
        usersLoading,
        usersError: usersError ? usersError.message : 'none',
        sprintRoles: Array.isArray(sprintRoles) ? `array(${sprintRoles.length})` : typeof sprintRoles,
        apiRequestEnabled: !isNewSprint
      });
    } catch (e) {
      console.error('Debug logging error:', e);
    }
  }, [id, isNewSprint, sprint, isLoading, error, users, usersLoading, usersError, sprintRoles]);

  // Sprint form state - initialize empty for new sprints, will be populated by useEffect for existing sprints
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(),
    department: 'General',
    goals: [] as string[],
    metrics: [] as string[],
    status: 'planning' as const,
  });



  // Initialize form data when sprint loads  
  useEffect(() => {
    if (sprint && !isNewSprint) {
      console.log('Populating form with sprint data:', sprint);
      
      // Handle both snake_case (database) and camelCase field names
      const startDate = new Date(sprint.start_date || sprint.startDate || new Date());
      const endDate = new Date(sprint.end_date || sprint.endDate || new Date());
      
      // Handle different possible data formats for goals and metrics
      let goals = [];
      let metrics = [];
      
      if (Array.isArray(sprint.goals)) {
        goals = sprint.goals;
      } else if (typeof sprint.goals === 'string') {
        try {
          goals = JSON.parse(sprint.goals);
        } catch {
          goals = sprint.goals ? [sprint.goals] : [];
        }
      } else if (sprint.goals) {
        goals = [sprint.goals];
      }
      
      if (Array.isArray(sprint.metrics)) {
        metrics = sprint.metrics;
      } else if (typeof sprint.metrics === 'string') {
        try {
          metrics = JSON.parse(sprint.metrics);
        } catch {
          metrics = sprint.metrics ? [sprint.metrics] : [];
        }
      } else if (sprint.metrics) {
        metrics = [sprint.metrics];
      }
      
      const newFormData = {
        name: sprint.name || '',
        description: sprint.description || '',
        startDate: isNaN(startDate.getTime()) ? new Date() : startDate,
        endDate: isNaN(endDate.getTime()) ? new Date() : endDate,
        department: sprint.department || 'General',
        goals: goals,
        metrics: metrics,
        status: (typeof sprint.status === 'number' && sprint.status === 200) ? 'planning' : (sprint.status || 'planning'),
      };
      
      console.log('Setting form data:', newFormData);
      setFormData(newFormData);
    }
  }, [sprint, isNewSprint]);



  // Save sprint mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isNewSprint) {
        return apiRequest('/api/strategy/sprints', {
          method: 'POST',
          body: data,
        });
      } else {
        return apiRequest(`/api/strategy/sprints/${id}`, {
          method: 'PUT',
          body: data,
        });
      }
    },
    onSuccess: (savedSprint) => {
      toast({
        title: isNewSprint ? 'Sprint created' : 'Sprint updated',
        description: 'Sprint details have been saved successfully.',
      });
      setHasUnsavedChanges(false);
      
      // Only invalidate the sprints list, preserve current form data
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      
      // Don't refetch the current sprint to preserve form state
      // The data is already saved and form reflects current state
      
      if (isNewSprint && savedSprint?.id) {
        setLocation(`/strategy/sprint/${savedSprint.id}`);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error saving sprint',
        description: 'Failed to save sprint details. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Delete sprint mutation
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/strategy/sprints/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({
        title: 'Sprint deleted',
        description: 'Sprint has been deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      setLocation('/strategy');
    },
    onError: () => {
      toast({
        title: 'Error deleting sprint',
        description: 'Failed to delete sprint. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    // Clean the data to ensure only valid sprint fields are sent
    const cleanData = {
      name: formData.name,
      description: formData.description,
      startDate: formData.startDate,
      endDate: formData.endDate,
      department: formData.department,
      goals: formData.goals,
      metrics: formData.metrics,
      status: formData.status
    };

    saveMutation.mutate(cleanData);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this sprint? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        setLocation('/strategy');
      }
    } else {
      setLocation('/strategy');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading sprint...</p>
        </div>
      </div>
    );
  }

  if (error && !isNewSprint) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">Sprint not found</p>
          <p className="mt-2 text-sm text-muted-foreground">The sprint you're looking for doesn't exist.</p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Strategy
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-2 sm:px-4 py-2 sm:py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" onClick={handleBack} size="sm" className="px-2 sm:px-3">
                <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Back to Strategy</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold truncate">
                  {isNewSprint ? 'Create New Sprint' : formData.name || 'Sprint Details'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  {isNewSprint ? 'Set up a new sprint for your team' : 'Manage sprint details, team, and items'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {hasUnsavedChanges && (
                <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">Unsaved changes</span>
              )}
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                size="sm"
                className="gap-1 sm:gap-2"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">{saveMutation.isPending ? 'Saving...' : 'Save Sprint'}</span>
                <span className="sm:hidden">{saveMutation.isPending ? 'Save...' : 'Save'}</span>
              </Button>
              {!isNewSprint && canDeleteSprints && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  size="sm"
                  className="gap-1 sm:gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-6">
            {/* Main Content */}
            <Tabs defaultValue="overview" className="space-y-3 sm:space-y-6">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
                  <span className="sm:hidden">Info</span>
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="team" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
                  Team
                </TabsTrigger>
                <TabsTrigger value="items" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
                  <span className="sm:hidden">Items</span>
                  <span className="hidden sm:inline">Sprint Items</span>
                </TabsTrigger>
                <TabsTrigger value="backlog" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
                  <span className="sm:hidden">Tagnut</span>
                  <span className="hidden sm:inline">Add from Tagnut</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3 sm:space-y-6">
                <SprintOverviewSection
                  formData={formData}
                  onChange={handleFormChange}
                  isNewSprint={isNewSprint}
                />
              </TabsContent>

              <TabsContent value="team" className="space-y-3 sm:space-y-6">
                {usersLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <SprintTeamSection
                    sprintId={id}
                    users={users}
                    sprint={{ ...sprint, roles: sprintRoles }}
                    onUpdate={() => {
                      queryClient.invalidateQueries({ queryKey: [`/api/strategy/sprints/${id}`] });
                      queryClient.invalidateQueries({ queryKey: [`/api/strategy/sprints/${id}/roles`] });
                    }}
                  />
                )}
              </TabsContent>

              <TabsContent value="items" className="space-y-3 sm:space-y-6">
                <SprintItemsSection
                  sprintId={id}
                  items={sprintItems}
                  onUpdate={() => queryClient.invalidateQueries({ queryKey: ['sprint-items', id] })}
                />
              </TabsContent>

              <TabsContent value="backlog" className="space-y-3 sm:space-y-6">
                <SprintBacklogSection
                  sprintId={id}
                  availableItems={availableBacklogItems}
                  onUpdate={() => {
                    queryClient.invalidateQueries({ queryKey: ['sprint-items', id] });
                    queryClient.invalidateQueries({ queryKey: ['backlog-available'] });
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}