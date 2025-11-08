import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Save, X, Edit2, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SprintDetailsTabProps {
  sprint: any;
  canEdit: boolean;
  isCreating: boolean;
  onClose: () => void;
}

const departments = [
  'Engineering',
  'Operations', 
  'Customer Success',
  'Marketing',
  'Sales',
  'HR',
  'Finance',
  'General'
];

export function SprintDetailsTab({ sprint, canEdit, isCreating, onClose }: SprintDetailsTabProps) {
  const [isEditing, setIsEditing] = useState(isCreating);
  
  // Format dates for input fields
  const formatDateForInput = (date: any) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };
  
  const [formData, setFormData] = useState({
    description: sprint.description || '',
    startDate: formatDateForInput(sprint.startDate),
    endDate: formatDateForInput(sprint.endDate),
    department: sprint.department || 'General',
    goals: sprint.goals || [],
    metrics: sprint.metrics || []
  });
  const [newGoal, setNewGoal] = useState('');
  const [newMetric, setNewMetric] = useState('');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Generate sprint name based on dates
  const generateSprintName = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 'Sprint Name Preview';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const startMonth = monthNames[start.getMonth()];
    const startDay = start.getDate();
    const endMonth = monthNames[end.getMonth()];
    const endDay = end.getDate();
    const year = start.getFullYear();
    
    // Check if it's a quarterly sprint (roughly 3 months)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 80) {
      const quarter = Math.floor(start.getMonth() / 3) + 1;
      return `Q${quarter} ${year} Sprint`;
    }
    
    // Monthly or shorter sprint
    if (start.getMonth() === end.getMonth()) {
      return `${startMonth} ${year} Sprint (${startMonth} ${startDay}-${endDay})`;
    } else {
      return `${startMonth}-${endMonth} ${year} Sprint`;
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const sprintData = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      };
      
      if (isCreating) {
        return apiRequest('/api/strategy/sprints', {
          method: 'POST',
          body: { ...sprintData, status: 'planning' }
        });
      } else {
        return apiRequest(`/api/strategy/sprints/${sprint.id}`, {
          method: 'PUT',
          body: sprintData
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/sprints'] });
      if (!isCreating) {
        queryClient.invalidateQueries({ queryKey: [`/api/strategy/sprints/${sprint.id}`] });
      }
      toast({
        title: isCreating ? 'Sprint created' : 'Sprint updated',
        description: isCreating ? 'New sprint has been created successfully.' : 'Sprint details have been updated.',
      });
      setIsEditing(false);
      if (isCreating) {
        onClose();
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save sprint.',
        variant: 'destructive'
      });
    }
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (isCreating) {
      onClose();
    } else {
      setFormData({
        description: sprint.description || '',
        startDate: formatDateForInput(sprint.startDate),
        endDate: formatDateForInput(sprint.endDate),
        department: sprint.department || 'General',
        goals: sprint.goals || [],
        metrics: sprint.metrics || []
      });
      setIsEditing(false);
    }
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      setFormData(prev => ({
        ...prev,
        goals: [...prev.goals, newGoal.trim()]
      }));
      setNewGoal('');
    }
  };

  const removeGoal = (index: number) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index)
    }));
  };

  const addMetric = () => {
    if (newMetric.trim()) {
      setFormData(prev => ({
        ...prev,
        metrics: [...prev.metrics, newMetric.trim()]
      }));
      setNewMetric('');
    }
  };

  const removeMetric = (index: number) => {
    setFormData(prev => ({
      ...prev,
      metrics: prev.metrics.filter((_, i) => i !== index)
    }));
  };

  const previewName = generateSprintName(formData.startDate, formData.endDate);

  return (
    <div className="p-3 sm:p-4 space-y-4">
      {/* Action Buttons */}
      {canEdit && (
        <div className="flex justify-end gap-2">
          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="h-7 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="h-7 text-xs"
              >
                <Save className="h-3 w-3 mr-1" />
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="h-7 text-xs"
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
      )}

      {/* Sprint Name Preview */}
      {isEditing && (
        <Card>
          <CardContent className="p-3">
            <Label className="text-xs font-medium mb-1">Sprint Name (Auto-generated)</Label>
            <div className="text-sm font-medium">{previewName}</div>
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Description</Label>
          {isEditing ? (
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Sprint description..."
              className="mt-1 text-xs min-h-[60px]"
            />
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              {sprint.description || 'No description'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Start Date</Label>
            {isEditing ? (
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="mt-1 text-xs"
              />
            ) : (
              <p className="text-xs mt-1">{new Date(sprint.startDate).toLocaleDateString()}</p>
            )}
          </div>
          
          <div>
            <Label className="text-xs">End Date</Label>
            {isEditing ? (
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="mt-1 text-xs"
              />
            ) : (
              <p className="text-xs mt-1">{new Date(sprint.endDate).toLocaleDateString()}</p>
            )}
          </div>
        </div>

        <div>
          <Label className="text-xs">Department</Label>
          {isEditing ? (
            <Select
              value={formData.department}
              onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
            >
              <SelectTrigger className="mt-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs mt-1">{sprint.department || 'General'}</p>
          )}
        </div>

        {/* Goals */}
        <div>
          <Label className="text-xs mb-2 block">Sprint Goals</Label>
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="Add a goal..."
                  className="text-xs"
                  onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                />
                <Button
                  size="sm"
                  onClick={addGoal}
                  className="h-7 px-2"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {formData.goals.map((goal, index) => (
                  <div key={index} className="flex items-center gap-2 bg-muted rounded p-2">
                    <span className="text-xs flex-1">{goal}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeGoal(index)}
                      className="h-5 w-5 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {sprint.goals?.length > 0 ? (
                sprint.goals.map((goal: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {goal}
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No goals set</p>
              )}
            </div>
          )}
        </div>

        {/* Metrics */}
        <div>
          <Label className="text-xs mb-2 block">Success Metrics</Label>
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newMetric}
                  onChange={(e) => setNewMetric(e.target.value)}
                  placeholder="Add a metric..."
                  className="text-xs"
                  onKeyPress={(e) => e.key === 'Enter' && addMetric()}
                />
                <Button
                  size="sm"
                  onClick={addMetric}
                  className="h-7 px-2"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {formData.metrics.map((metric, index) => (
                  <div key={index} className="flex items-center gap-2 bg-muted rounded p-2">
                    <span className="text-xs flex-1">{metric}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeMetric(index)}
                      className="h-5 w-5 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {sprint.metrics?.length > 0 ? (
                sprint.metrics.map((metric: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {metric}
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No metrics set</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}