import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, BarChart3, Package, Zap } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { SprintDetailsTab } from './tabs/SprintDetailsTab';
import { SprintItemsTab } from './tabs/SprintItemsTab';
import { SprintTeamTab } from './tabs/SprintTeamTab';
import { SprintAnalyticsTab } from './tabs/SprintAnalyticsTab';

interface SprintDetailPanelProps {
  sprintId: number | null;
  open: boolean;
  onClose: () => void;
  isCreating?: boolean;
}

export function SprintDetailPanel({ 
  sprintId, 
  open, 
  onClose, 
  isCreating = false 
}: SprintDetailPanelProps) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('details');

  // Reset tab when panel opens with new sprint
  useEffect(() => {
    if (open) {
      setActiveTab('details');
    }
  }, [open, sprintId]);

  // Fetch sprint details
  const { data: sprint, isLoading, error } = useQuery({
    queryKey: [`/api/strategy/sprints/${sprintId}`],
    enabled: open && !!sprintId && !isCreating,
    queryFn: async () => {
      const response = await apiRequest(`/api/strategy/sprints/${sprintId}`);
      return response.json();
    }
  });

  // For creation mode, create a new sprint template
  const newSprintTemplate = {
    id: 0,
    name: 'New Sprint',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks from now
    status: 'planning',
    department: 'General',
    goals: [],
    metrics: [],
    createdBy: currentUser?.id || 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Use either the fetched sprint or the new template
  const currentSprint = isCreating ? newSprintTemplate : sprint;

  if (!open) return null;

  const canEdit = currentUser?.role && ['admin', 'manager', 'super_admin'].includes(currentUser.role);

  // Get status color
  const getSprintStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'planning': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Zap className="h-3 w-3" />;
      case 'planning': return <Calendar className="h-3 w-3" />;
      case 'completed': return <BarChart3 className="h-3 w-3" />;
      default: return <Package className="h-3 w-3" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(newOpen) => !newOpen && onClose()}>
      <SheetContent 
        className="w-full sm:w-[50%] sm:max-w-[800px] p-0 flex flex-col h-screen"
        style={{ maxWidth: '100%' }}
      >
        <SheetHeader className="p-1.5 sm:p-3 border-b">
          <div className="flex items-center gap-1">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-[11px] sm:text-base flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-primary flex-shrink-0" />
                <span className="truncate font-medium">
                  {isLoading ? 'Loading...' : (error ? 'Error' : currentSprint?.name || 'Sprint')}
                </span>
              </SheetTitle>
              {currentSprint && (
                <SheetDescription className="mt-0 flex items-center gap-1 text-[9px] sm:text-[11px]">
                  <Badge 
                    variant="outline" 
                    className={`text-white ${getSprintStatusColor(currentSprint.status)} h-3.5 px-0.5 py-0 text-[8px] sm:text-[10px]`}
                  >
                    <span className="flex items-center gap-0.5">
                      {getStatusIcon(currentSprint.status)}
                      {currentSprint.status}
                    </span>
                  </Badge>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {new Date(currentSprint.startDate).toLocaleDateString()} - {new Date(currentSprint.endDate).toLocaleDateString()}
                  </span>
                </SheetDescription>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="h-full flex flex-col"
          >
            <TabsList className="grid grid-cols-4 h-8 w-full rounded-none border-b px-1.5 sm:px-3">
              <TabsTrigger 
                value="details" 
                className="text-[9px] sm:text-[11px] py-1 px-1 sm:px-2 h-6 data-[state=active]:bg-primary/10"
              >
                Details
              </TabsTrigger>
              <TabsTrigger 
                value="items" 
                className="text-[9px] sm:text-[11px] py-1 px-1 sm:px-2 h-6 data-[state=active]:bg-primary/10"
              >
                Items
              </TabsTrigger>
              <TabsTrigger 
                value="team" 
                className="text-[9px] sm:text-[11px] py-1 px-1 sm:px-2 h-6 data-[state=active]:bg-primary/10"
              >
                Team
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="text-[9px] sm:text-[11px] py-1 px-1 sm:px-2 h-6 data-[state=active]:bg-primary/10"
              >
                Analytics
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              {isLoading && !isCreating ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">Loading sprint details...</div>
                </div>
              ) : error && !isCreating ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2">
                  <Calendar className="h-8 w-8 text-destructive" />
                  <div className="text-destructive">Failed to load sprint</div>
                </div>
              ) : currentSprint ? (
                <>
                  <TabsContent value="details" className="h-full overflow-y-auto m-0">
                    <SprintDetailsTab
                      sprint={currentSprint}
                      canEdit={canEdit}
                      isCreating={isCreating}
                      onClose={onClose}
                    />
                  </TabsContent>

                  <TabsContent value="items" className="h-full overflow-y-auto m-0">
                    <SprintItemsTab
                      sprintId={currentSprint.id}
                      sprintName={currentSprint.name}
                      isCreating={isCreating}
                    />
                  </TabsContent>

                  <TabsContent value="team" className="h-full overflow-y-auto m-0">
                    <SprintTeamTab
                      sprintId={currentSprint.id}
                      canEdit={canEdit}
                      isCreating={isCreating}
                    />
                  </TabsContent>

                  <TabsContent value="analytics" className="h-full overflow-y-auto m-0">
                    <SprintAnalyticsTab
                      sprintId={currentSprint.id}
                      isCreating={isCreating}
                    />
                  </TabsContent>
                </>
              ) : null}
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}