import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import ObjectiveRowWithExpansion from './ObjectiveRowWithExpansion';
import ObjectiveDetailsView from './ObjectiveDetailsView';
import CreateObjectiveDialog from './CreateObjectiveDialog';

interface OKRDashboardProps {
  keyResultId?: string | null;
  onViewKeyResult?: (keyResultId: number) => void;
}

export default function OKRDashboard({ keyResultId, onViewKeyResult }: OKRDashboardProps = {}) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'details'>('dashboard');
  const { currentUser: user } = useAuth();

  // Check if user can create objectives (admin or manager)
  const canCreateObjectives = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'super_admin';

  // Fetch objectives
  const { data: objectives = [], isLoading, error } = useQuery<Objective[]>({
    queryKey: ['/api/strategy/objectives'],
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Objectives & Key Results</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load objectives. Please try again.</p>
      </div>
    );
  }

  // Filter objectives based on selected status
  const filteredObjectives = objectives.filter((obj: Objective) => {
    if (statusFilter === 'all') return true;
    return obj.status === statusFilter;
  });

  // Get status counts for filter badges
  const statusCounts = {
    all: objectives.length,
    active: objectives.filter(obj => obj.status === 'active').length,
    paused: objectives.filter(obj => obj.status === 'paused').length,
    achieved: objectives.filter(obj => obj.status === 'achieved').length,
    cancelled: objectives.filter(obj => obj.status === 'cancelled').length,
  };

  const handleViewObjectiveDetails = (objective: Objective) => {
    setSelectedObjective(objective);
    setCurrentView('details');
  };

  const handleBackToDashboard = () => {
    setSelectedObjective(null);
    setCurrentView('dashboard');
  };

  // Show objective details view
  if (currentView === 'details' && selectedObjective) {
    return (
      <ObjectiveDetailsView
        objective={selectedObjective}
        onBack={handleBackToDashboard}
        onViewKeyResult={onViewKeyResult}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h2 className="text-lg font-medium">Objectives & Key Results</h2>
          <p className="text-xs text-gray-600">
            Track progress towards strategic goals with measurable key results
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 h-8">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                All ({statusCounts.all})
              </SelectItem>
              <SelectItem value="active">
                Active ({statusCounts.active})
              </SelectItem>
              <SelectItem value="paused">
                Paused ({statusCounts.paused})
              </SelectItem>
              <SelectItem value="achieved">
                Achieved ({statusCounts.achieved})
              </SelectItem>
              <SelectItem value="cancelled">
                Cancelled ({statusCounts.cancelled})
              </SelectItem>
            </SelectContent>
          </Select>
          {canCreateObjectives && (
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="h-3 w-3 mr-1" />
              Add Objective
            </Button>
          )}
        </div>
      </div>

      {/* Status Summary */}
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-xs">
          Total: {statusCounts.all}
        </Badge>
        {statusCounts.active > 0 && (
          <Badge variant="default" className="text-xs bg-green-100 text-green-800">
            Active: {statusCounts.active}
          </Badge>
        )}
        {statusCounts.paused > 0 && (
          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
            Paused: {statusCounts.paused}
          </Badge>
        )}
        {statusCounts.achieved > 0 && (
          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
            Achieved: {statusCounts.achieved}
          </Badge>
        )}
        {statusCounts.cancelled > 0 && (
          <Badge variant="destructive" className="text-xs bg-red-100 text-red-800">
            Cancelled: {statusCounts.cancelled}
          </Badge>
        )}
      </div>

      {/* Filtered Objectives */}
      {filteredObjectives.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">
              {statusFilter === 'all' ? 'All Objectives' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Objectives`} ({filteredObjectives.length})
            </h3>
          </div>
          {console.log('DEBUG - Objectives:', objectives)}
          {console.log('DEBUG - Filtered objectives:', filteredObjectives)}
          
          {/* Objective Cards */}
          <div className="space-y-3">
            {filteredObjectives.map((objective: Objective) => (
              <ObjectiveRowWithExpansion 
                key={objective.id} 
                objective={objective}
                onViewDetails={() => handleViewObjectiveDetails(objective)}
                highlightKeyResultId={keyResultId}
                onViewKeyResult={onViewKeyResult}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredObjectives.length === 0 && objectives.length > 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">🔍</div>
          <h3 className="text-md font-medium text-gray-900 mb-2">No {statusFilter} Objectives</h3>
          <p className="text-gray-600 mb-4">
            No objectives found with status "{statusFilter}". Try changing the filter or create a new objective.
          </p>
        </div>
      )}

      {objectives.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎯</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Objectives Yet</h3>
          <p className="text-gray-600 mb-4">
            Start by creating your first objective to track progress towards your strategic goals.
          </p>
          {canCreateObjectives && (
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="h-3 w-3 mr-1" />
              Create Your First Objective
            </Button>
          )}
        </div>
      )}

      <CreateObjectiveDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}