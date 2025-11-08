import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Crown, Shield, User, Users, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SprintTeamSectionProps {
  sprintId: string;
  users: any[];
  sprint: any;
  onUpdate: () => void;
}

const roleIcons = {
  sprint_master: Crown,
  product_owner: Shield,
  team_member: User,
  stakeholder: Users,
};

const roleLabels = {
  sprint_master: 'Sprint Master',
  product_owner: 'Product Owner',
  team_member: 'Team Member',
  stakeholder: 'Stakeholder',
};

const roleColors = {
  sprint_master: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  product_owner: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  team_member: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  stakeholder: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

export default function SprintTeamSection({ sprintId, users, sprint, onUpdate }: SprintTeamSectionProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Ensure users and sprint roles are always arrays
  const safeUsers = Array.isArray(users) ? users : [];
  const safeSprintRoles = Array.isArray(sprint?.roles) ? sprint.roles : [];



  // Early return if users are still loading or empty
  if (!users || users.length === 0) {
    return (
      <div className="space-y-3 sm:space-y-6">
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Team Management</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 sm:pt-6">
            <div className="text-center space-y-2">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                {!users ? 'Loading team members...' : 'No team members available'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, roleType }: { userId: number; roleType: string }) => {
      const user = safeUsers.find(u => u.id === userId);
      return apiRequest(`/api/strategy/sprints/${sprintId}/roles`, {
        method: 'POST',
        body: {
          userId,
          roleType,
          userName: user?.fullName || user?.username || 'Unknown User',
        },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Team member added',
        description: 'Team member has been added to the sprint.',
      });
      onUpdate();
      setSelectedUserId('');
      setSelectedRole('');
    },
    onError: () => {
      toast({
        title: 'Error adding team member',
        description: 'Failed to add team member to sprint.',
        variant: 'destructive',
      });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (role: { userId: number; roleType: string }) => {
      return apiRequest(`/api/strategy/sprints/${sprintId}/roles`, {
        method: 'DELETE',
        body: {
          userId: role.userId,
          roleType: role.roleType,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Team member removed',
        description: 'Team member has been removed from the sprint.',
      });
      onUpdate();
    },
    onError: () => {
      toast({
        title: 'Error removing team member',
        description: 'Failed to remove team member from sprint.',
        variant: 'destructive',
      });
    },
  });

  const handleAddRole = () => {
    if (selectedUserId && selectedRole) {
      addRoleMutation.mutate({
        userId: parseInt(selectedUserId),
        roleType: selectedRole,
      });
    }
  };

  const handleRemoveRole = (role: { userId: number; roleType: string }) => {
    removeRoleMutation.mutate(role);
  };

  const getAvailableUsers = () => {
    const assignedUserIds = safeSprintRoles.map(role => role.userId);
    return safeUsers.filter(user => !assignedUserIds.includes(user.id));
  };

  const getUserInitials = (user: any) => {
    if (user.fullName) {
      return user.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return user.username?.substring(0, 2).toUpperCase() || 'U';
  };

  const groupedRoles = safeSprintRoles.reduce((acc, role) => {
    if (!acc[role.roleType]) {
      acc[role.roleType] = [];
    }
    acc[role.roleType].push(role);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Add Team Member */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">Add Team Member</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 pt-0 sm:pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select User</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team member" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableUsers().map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getUserInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        {user.fullName || user.username}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([key, label]) => {
                    const Icon = roleIcons[key as keyof typeof roleIcons];
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button
                onClick={handleAddRole}
                disabled={!selectedUserId || !selectedRole || addRoleMutation.isPending}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Sprint
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Team */}
      <Card>
        <CardHeader>
          <CardTitle>Current Team ({safeSprintRoles.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(roleLabels).map(([roleType, label]) => {
            const Icon = roleIcons[roleType as keyof typeof roleIcons];
            const roleMembers = groupedRoles[roleType] || [];
            
            return (
              <div key={roleType} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {roleMembers.length}
                  </Badge>
                </div>
                
                <div className="ml-6 space-y-2">
                  {roleMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No {label.toLowerCase()} assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {roleMembers.map(role => {
                        const user = users.find(u => u.id === role.userId);
                        return (
                          <div key={role.id} className="flex items-center gap-2 bg-muted p-2 rounded-lg">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getUserInitials(user || { username: role.userName })}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {user?.fullName || role.userName}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-1 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveRole({ userId: role.userId, roleType: role.roleType })}
                              disabled={removeRoleMutation.isPending}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {safeSprintRoles.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No team members assigned yet</p>
              <p className="text-sm text-muted-foreground">Add team members to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}