import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Crown, Shield, User, Users, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SprintTeamTabProps {
  sprintId: number;
  isCreating: boolean;
}

const roleTypes = [
  { value: 'sprint_master', label: 'Sprint Master', icon: Crown, color: 'text-yellow-600' },
  { value: 'product_owner', label: 'Product Owner', icon: Shield, color: 'text-purple-600' },
  { value: 'team_member', label: 'Team Member', icon: User, color: 'text-blue-600' },
  { value: 'stakeholder', label: 'Stakeholder', icon: Users, color: 'text-green-600' },
];

export function SprintTeamTab({ sprintId, isCreating }: SprintTeamTabProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch sprint roles
  const { data: sprintRoles = [], isLoading: loadingRoles } = useQuery({
    queryKey: [`/api/strategy/sprints/${sprintId}/roles`],
    enabled: !isCreating && sprintId > 0,
    queryFn: async () => {
      const response = await apiRequest(`/api/strategy/sprints/${sprintId}/roles`);
      return response.json();
    }
  });

  // Fetch all users
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['/api/users'],
    enabled: !isCreating && sprintId > 0,
    queryFn: async () => {
      const response = await apiRequest('/api/users');
      return response.json();
    }
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: ({ userId, roleType }: { userId: number; roleType: string }) =>
      apiRequest(`/api/strategy/sprints/${sprintId}/roles`, {
        method: 'POST',
        body: { userId, roleType }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/sprints/${sprintId}/roles`] });
      toast({
        title: 'Team member added',
        description: 'Role has been assigned successfully.',
      });
      setSelectedUserId('');
      setSelectedRole('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add team member.',
        variant: 'destructive'
      });
    }
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: (roleId: number) =>
      apiRequest(`/api/strategy/sprints/${sprintId}/roles/${roleId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/sprints/${sprintId}/roles`] });
      toast({
        title: 'Team member removed',
        description: 'Role has been removed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove team member.',
        variant: 'destructive'
      });
    }
  });

  const handleAddRole = () => {
    if (!selectedUserId || !selectedRole) {
      toast({
        title: 'Missing information',
        description: 'Please select both a user and a role.',
        variant: 'destructive'
      });
      return;
    }

    addRoleMutation.mutate({
      userId: parseInt(selectedUserId),
      roleType: selectedRole
    });
  };

  const getRoleIcon = (roleType: string) => {
    const role = roleTypes.find(r => r.value === roleType);
    return role ? <role.icon className={`h-3 w-3 ${role.color}`} /> : null;
  };

  const getRoleLabel = (roleType: string) => {
    const role = roleTypes.find(r => r.value === roleType);
    return role?.label || roleType;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Group roles by type
  const groupedRoles = sprintRoles.reduce((acc: any, role: any) => {
    if (!acc[role.roleType]) {
      acc[role.roleType] = [];
    }
    acc[role.roleType].push(role);
    return acc;
  }, {});

  if (isCreating) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-sm">Save the sprint first to manage team members</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-4">
      {/* Add Team Member */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Add Team Member</CardTitle>
          <CardDescription className="text-xs">
            Assign roles to team members for this sprint
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((user: any) => 
                    !sprintRoles.some((role: any) => role.userId === user.id)
                  )
                  .map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName || user.username}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleTypes.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex items-center gap-2">
                      <role.icon className={`h-3 w-3 ${role.color}`} />
                      {role.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            size="sm"
            onClick={handleAddRole}
            disabled={!selectedUserId || !selectedRole || addRoleMutation.isPending}
            className="w-full h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add to Team
          </Button>
        </CardContent>
      </Card>

      {/* Team Members by Role */}
      {loadingRoles || loadingUsers ? (
        <div className="text-center py-8 text-muted-foreground">Loading team...</div>
      ) : Object.keys(groupedRoles).length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No team members assigned yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add team members to collaborate on this sprint
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {roleTypes.map(roleType => {
            const rolesOfType = groupedRoles[roleType.value] || [];
            if (rolesOfType.length === 0) return null;

            return (
              <Card key={roleType.value}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <roleType.icon className={`h-3 w-3 ${roleType.color}`} />
                    {roleType.label} ({rolesOfType.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {rolesOfType.map((role: any) => {
                    const user = users.find((u: any) => u.id === role.userId);
                    if (!user) return null;

                    return (
                      <div key={role.id} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(user.fullName || user.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-medium">{user.fullName || user.username}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeRoleMutation.mutate(role.id)}
                          disabled={removeRoleMutation.isPending}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}