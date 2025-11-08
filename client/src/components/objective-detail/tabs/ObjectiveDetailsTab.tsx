import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Target,
  User,
  TrendingUp,
  Edit2,
  Hash,
  Tag,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface Objective {
  id: number;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  status: string;
  startDate?: string;
  targetDate?: string;
  primaryKpi?: string;
  targetValue?: number;
  currentValue?: number;
  ownerId?: number;
  owner?: {
    id: number;
    fullName: string;
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface ObjectiveDetailsTabProps {
  objective: Objective;
  canEdit: boolean;
  onEdit: () => void;
}

export function ObjectiveDetailsTab({ objective, canEdit, onEdit }: ObjectiveDetailsTabProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'strategic':
        return 'bg-purple-100 text-purple-800';
      case 'operational':
        return 'bg-blue-100 text-blue-800';
      case 'financial':
        return 'bg-green-100 text-green-800';
      case 'customer':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 space-y-4 w-full max-w-full overflow-hidden">
      {/* Main Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Objective Details</h3>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-7 px-2"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
          
          {/* Description */}
          <div className="mb-6">
            <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">
              {objective.description || 'No description provided'}
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
                <Tag className="h-3 w-3" />
                Category
              </label>
              <Badge className={getCategoryColor(objective.category)}>
                {objective.category || 'General'}
              </Badge>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
                <AlertCircle className="h-3 w-3" />
                Priority
              </label>
              <Badge className={getPriorityColor(objective.priority)}>
                {objective.priority || 'Medium'}
              </Badge>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
                <Calendar className="h-3 w-3" />
                Start Date
              </label>
              <p className="text-sm text-gray-900">{formatDate(objective.startDate)}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
                <Target className="h-3 w-3" />
                Target Date
              </label>
              <p className="text-sm text-gray-900">{formatDate(objective.targetDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Metrics Card */}
      {(objective.primaryKpi || objective.targetValue) && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Key Performance Indicator
            </h3>
            
            <div className="space-y-3">
              {objective.primaryKpi && (
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Primary KPI</label>
                  <p className="text-sm text-gray-900">{objective.primaryKpi}</p>
                </div>
              )}

              {objective.targetValue && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Target Value</label>
                    <p className="text-lg font-semibold text-gray-900">{objective.targetValue}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Current Value</label>
                    <p className="text-lg font-semibold text-gray-900">{objective.currentValue || '0'}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Owner Card */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1">
            <User className="h-4 w-4" />
            Ownership
          </h3>
          
          {objective.owner ? (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{objective.owner.fullName}</p>
                <p className="text-xs text-gray-500">{objective.owner.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No owner assigned</p>
          )}
        </CardContent>
      </Card>

      {/* Timeline Card */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Timeline
          </h3>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Created</span>
              <span className="text-sm text-gray-900">{formatDate(objective.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Last Updated</span>
              <span className="text-sm text-gray-900">{formatDate(objective.updatedAt)}</span>
            </div>
            {objective.startDate && objective.targetDate && (
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-xs text-gray-500">Duration</span>
                <span className="text-sm text-gray-900">
                  {(() => {
                    try {
                      const start = new Date(objective.startDate);
                      const end = new Date(objective.targetDate);
                      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                      return `${days} days`;
                    } catch {
                      return 'N/A';
                    }
                  })()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}