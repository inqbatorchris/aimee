import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { X, Users, Crown, Shield, User as UserIcon, Calendar } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { generateSprintName, isQuarterlySprint, generateQuarterlySprintName } from '@/utils/sprintNaming';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const createSprintSchema = z.object({
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  department: z.string().optional(),
  goals: z.array(z.string()).optional(),
  metrics: z.array(z.string()).optional(),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return start < end;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type CreateSprintFormData = z.infer<typeof createSprintSchema>;

interface CreateSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editSprint?: any;
  onEdit?: (sprint: any) => void;
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

export function CreateSprintDialog({ open, onOpenChange, editSprint, onEdit }: CreateSprintDialogProps) {
  const { user } = useAuth();
  const [newGoal, setNewGoal] = useState('');
  const [newMetric, setNewMetric] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch users for role assignment
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: open,
  });

  const [roleAssignments, setRoleAssignments] = useState<Array<{
    userId: number;
    roleType: 'sprint_master' | 'product_owner' | 'team_member' | 'stakeholder';
    userName: string;
  }>>([]);
  
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');

  const form = useForm<CreateSprintFormData>({
    resolver: zodResolver(createSprintSchema),
    defaultValues: {
      description: editSprint?.description || '',
      startDate: editSprint?.startDate || '',
      endDate: editSprint?.endDate || '',
      department: editSprint?.department || '',
      goals: editSprint?.goals || [],
      metrics: editSprint?.metrics || [],
    },
  });

  // Watch form values for sprint name preview
  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');
  
  const previewName = (startDate && endDate) 
    ? (isQuarterlySprint(new Date(startDate), new Date(endDate)) 
        ? generateQuarterlySprintName(new Date(startDate), new Date(endDate))
        : generateSprintName(new Date(startDate), new Date(endDate)))
    : 'Sprint Name Preview';

  const createSprintMutation = useMutation({
    mutationFn: (data: CreateSprintFormData) =>
      apiRequest('/api/strategy/sprints', {
        method: 'POST',
        body: {
          ...data,
          createdBy: user?.id,
          status: 'planning',
          goals: data.goals || [],
          metrics: data.metrics || [],
          roles: roleAssignments,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/sprints'] });
      toast({
        title: "Success",
        description: "Sprint created successfully"
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sprint",
        variant: "destructive"
      });
    }
  });

  const updateSprintMutation = useMutation({
    mutationFn: (data: CreateSprintFormData) =>
      apiRequest('/api/strategy/sprints/' + editSprint.id, {
        method: 'PUT',
        body: {
          ...data,
          goals: data.goals || [],
          metrics: data.metrics || [],
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/sprints'] });
      toast({
        title: "Success",
        description: "Sprint updated successfully"
      });
      onEdit?.(null);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sprint",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (data: CreateSprintFormData) => {
    // Convert string dates to Date objects for backend
    const formattedData = {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      goals: data.goals || [],
      metrics: data.metrics || [],
      roles: roleAssignments // Include role assignments
    };
    
    if (editSprint) {
      updateSprintMutation.mutate(formattedData);
    } else {
      createSprintMutation.mutate(formattedData);
    }
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      const currentGoals = form.getValues('goals') || [];
      if (!currentGoals.includes(newGoal.trim())) {
        form.setValue('goals', [...currentGoals, newGoal.trim()]);
      }
      setNewGoal('');
    }
  };

  const removeGoal = (goalToRemove: string) => {
    const currentGoals = form.getValues('goals') || [];
    form.setValue('goals', currentGoals.filter(goal => goal !== goalToRemove));
  };

  const addMetric = () => {
    if (newMetric.trim()) {
      const currentMetrics = form.getValues('metrics') || [];
      if (!currentMetrics.includes(newMetric.trim())) {
        form.setValue('metrics', [...currentMetrics, newMetric.trim()]);
      }
      setNewMetric('');
    }
  };

  const removeMetric = (metricToRemove: string) => {
    const currentMetrics = form.getValues('metrics') || [];
    form.setValue('metrics', currentMetrics.filter(metric => metric !== metricToRemove));
  };

  const addRoleAssignment = (userId: number, roleType: 'sprint_master' | 'product_owner' | 'team_member' | 'stakeholder') => {
    const user = users.find(u => u.id === userId);
    if (user) {
      // Check if user already has this role
      const existingRole = roleAssignments.find(r => r.userId === userId && r.roleType === roleType);
      if (!existingRole) {
        setRoleAssignments(prev => [...prev, {
          userId,
          roleType,
          userName: user.fullName || user.email
        }]);
      }
    }
  };

  const removeRoleAssignment = (userId: number, roleType: string) => {
    setRoleAssignments(prev => prev.filter(r => !(r.userId === userId && r.roleType === roleType)));
  };

  const getRoleIcon = (roleType: string) => {
    switch (roleType) {
      case 'sprint_master': return <Crown className="h-4 w-4" />;
      case 'product_owner': return <Shield className="h-4 w-4" />;
      case 'team_member': return <UserIcon className="h-4 w-4" />;
      case 'stakeholder': return <Users className="h-4 w-4" />;
      default: return <UserIcon className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (roleType: string) => {
    switch (roleType) {
      case 'sprint_master': return 'Sprint Master';
      case 'product_owner': return 'Product Owner';
      case 'team_member': return 'Team Member';
      case 'stakeholder': return 'Stakeholder';
      default: return roleType;
    }
  };

  const getRoleColor = (roleType: string) => {
    switch (roleType) {
      case 'sprint_master': return 'bg-yellow-100 text-yellow-800';
      case 'product_owner': return 'bg-blue-100 text-blue-800';
      case 'team_member': return 'bg-green-100 text-green-800';
      case 'stakeholder': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddRole = () => {
    if (selectedUserId && selectedRole) {
      const userId = parseInt(selectedUserId);
      const roleType = selectedRole as 'sprint_master' | 'product_owner' | 'team_member' | 'stakeholder';
      addRoleAssignment(userId, roleType);
      setSelectedUserId('');
      setSelectedRole('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editSprint ? 'Edit Sprint' : 'Create New Sprint'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Auto-generated Sprint Name Preview */}
              <div className="col-span-full">
                <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <h3 className="font-medium text-blue-900 text-sm">Auto-Generated Sprint Name</h3>
                  </div>
                  <div className="text-base font-semibold text-blue-800">
                    {previewName}
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Sprint names are automatically generated based on your start and end dates
                  </p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the sprint objectives and scope..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Goals Section */}
            <div className="space-y-2">
              <FormLabel>Sprint Goals</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a sprint goal"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addGoal();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addGoal}>
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {(form.watch('goals') || []).map((goal, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm flex-1">{goal}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeGoal(goal)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics Section */}
            <div className="space-y-2">
              <FormLabel>Success Metrics</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a success metric"
                  value={newMetric}
                  onChange={(e) => setNewMetric(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addMetric();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addMetric}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(form.watch('metrics') || []).map((metric, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {metric}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => removeMetric(metric)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Sprint Role Assignment */}
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  Sprint Team Roles
                </CardTitle>
                <CardDescription>
                  Assign team members to specific sprint roles for better collaboration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Role Assignment Interface */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="userSelect">Select Team Member</Label>
                      <Select 
                        value={selectedUserId} 
                        onValueChange={(value) => setSelectedUserId(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.fullName || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="roleSelect">Select Role</Label>
                      <Select 
                        value={selectedRole} 
                        onValueChange={(value) => setSelectedRole(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sprint_master">
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4" />
                              Sprint Master
                            </div>
                          </SelectItem>
                          <SelectItem value="product_owner">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Product Owner
                            </div>
                          </SelectItem>
                          <SelectItem value="team_member">
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4" />
                              Team Member
                            </div>
                          </SelectItem>
                          <SelectItem value="stakeholder">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Stakeholder
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button 
                        type="button" 
                        onClick={handleAddRole}
                        disabled={!selectedUserId || !selectedRole}
                        className="w-full"
                      >
                        Add Role
                      </Button>
                    </div>
                  </div>

                  {/* Current Role Assignments */}
                  <div className="space-y-2">
                    <Label>Current Team Assignments</Label>
                    {roleAssignments.length > 0 ? (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {roleAssignments.map((assignment, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className={`p-1 rounded-full ${getRoleColor(assignment.roleType)}`}>
                                {getRoleIcon(assignment.roleType)}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{assignment.userName}</div>
                                <div className="text-xs text-gray-600">{getRoleLabel(assignment.roleType)}</div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRoleAssignment(assignment.userId, assignment.roleType)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No team members assigned yet</p>
                        <p className="text-xs">Add team members to collaborate on this sprint</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createSprintMutation.isPending || updateSprintMutation.isPending}
              >
                {(createSprintMutation.isPending || updateSprintMutation.isPending) 
                  ? (editSprint ? 'Updating...' : 'Creating...') 
                  : (editSprint ? 'Update Sprint' : 'Create Sprint')
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}