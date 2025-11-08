import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Calendar } from 'lucide-react';
import { useState } from 'react';

interface SprintOverviewSectionProps {
  formData: {
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    department: string;
    goals: string[];
    metrics: string[];
    status: string;
  };
  onChange: (field: string, value: any) => void;
  isNewSprint: boolean;
}

export default function SprintOverviewSection({ formData, onChange, isNewSprint }: SprintOverviewSectionProps) {
  const [newGoal, setNewGoal] = useState('');
  const [newMetric, setNewMetric] = useState('');



  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onChange(field, new Date(value));
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      onChange('goals', [...formData.goals, newGoal.trim()]);
      setNewGoal('');
    }
  };

  const removeGoal = (index: number) => {
    onChange('goals', formData.goals.filter((_, i) => i !== index));
  };

  const addMetric = () => {
    if (newMetric.trim()) {
      onChange('metrics', [...formData.metrics, newMetric.trim()]);
      setNewMetric('');
    }
  };

  const removeMetric = (index: number) => {
    onChange('metrics', formData.metrics.filter((_, i) => i !== index));
  };

  const formatDateForInput = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  };

  const generateSprintName = () => {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    // Handle invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'New Sprint';
    }
    
    const startMonth = start.toLocaleString('default', { month: 'long' });
    const endMonth = end.toLocaleString('default', { month: 'long' });
    const year = start.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${year} Sprint (${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}-${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`;
    } else {
      return `${startMonth}-${endMonth} ${year} Sprint`;
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">Sprint Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 pt-0 sm:pt-6">
          <div className="space-y-2">
            <Label htmlFor="sprint-name">Sprint Name</Label>
            <div className="flex items-center gap-2">
              <Input
                id="sprint-name"
                value={formData.name}
                onChange={(e) => onChange('name', e.target.value)}
                placeholder="Enter sprint name"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange('name', generateSprintName())}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Auto-generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Sprint names are automatically generated from start and end dates
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => onChange('description', e.target.value)}
              placeholder="Describe the sprint objectives and focus areas"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="start-date" className="text-sm">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={formatDateForInput(formData.startDate)}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="h-9 sm:h-10"
              />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="end-date" className="text-sm">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={formatDateForInput(formData.endDate)}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="h-9 sm:h-10"
              />
            </div>
            <div className="space-y-1 sm:space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="department" className="text-sm">Department</Label>
              <Select value={formData.department} onValueChange={(value) => onChange('department', value)}>
                <SelectTrigger className="h-9 sm:h-10">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Product">Product</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sprint Goals */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">Sprint Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 pt-0 sm:pt-6">
          <div className="flex gap-2">
            <Input
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="Add a sprint goal"
              onKeyPress={(e) => e.key === 'Enter' && addGoal()}
              className="h-9 sm:h-10 text-sm sm:text-base"
            />
            <Button onClick={addGoal} size="sm" className="h-9 sm:h-10 px-3">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {formData.goals.map((goal, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {goal}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => removeGoal(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
          
          {formData.goals.length === 0 && (
            <p className="text-sm text-muted-foreground">No goals added yet. Add goals to define what this sprint should achieve.</p>
          )}
        </CardContent>
      </Card>

      {/* Success Metrics */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">Success Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 pt-0 sm:pt-6">
          <div className="flex gap-2">
            <Input
              value={newMetric}
              onChange={(e) => setNewMetric(e.target.value)}
              placeholder="Add a success metric"
              onKeyPress={(e) => e.key === 'Enter' && addMetric()}
              className="h-9 sm:h-10 text-sm sm:text-base"
            />
            <Button onClick={addMetric} size="sm" className="h-9 sm:h-10 px-3">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {formData.metrics.map((metric, index) => (
              <Badge key={index} variant="outline" className="gap-1">
                {metric}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => removeMetric(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
          
          {formData.metrics.length === 0 && (
            <p className="text-sm text-muted-foreground">No metrics defined yet. Add metrics to track sprint success.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}