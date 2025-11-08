import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus, User, Mail, Shield, Key, Eye, EyeOff, Bot, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface PersonPanelProps {
  user: {
    id: number;
    email: string;
    fullName: string;
    role: string;
    userType?: 'human' | 'agent';
    organizationId: number;
    organizationName?: string;
    teams?: { id: number; name: string; role: string }[];
  };
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

export function PersonPanel({ user, open, onClose, isAdmin }: PersonPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [addingTeam, setAddingTeam] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedTeamRole, setSelectedTeamRole] = useState<string>("Member");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number>(user.organizationId);
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editedName, setEditedName] = useState(user.fullName);
  const [editedEmail, setEditedEmail] = useState(user.email);
  const [editedUserType, setEditedUserType] = useState<'human' | 'agent'>(user.userType || 'human');
  
  // Fetch available teams
  const { data: allTeams = [] } = useQuery({
    queryKey: ['/api/core/teams', { orgId: currentUser?.organizationId }],
    enabled: isAdmin && addingTeam,
  });
  
  // Fetch organizations for super admins
  const { data: organizations = [] } = useQuery<{ id: number; name: string; isActive?: boolean }[]>({
    queryKey: ['/api/core/organizations/list'],
    enabled: open && currentUser?.role === 'super_admin',
  });
  
  // Fetch user's team memberships
  const { data: memberships = [], refetch: refetchMemberships } = useQuery({
    queryKey: ['/api/core/users', user.id, 'teams'],
    queryFn: async () => {
      // Get teams and their members to build membership info
      const teamsResponse = await apiRequest(`/api/core/teams?orgId=${user.organizationId}`);
      const teams: any[] = Array.isArray(teamsResponse) ? teamsResponse : [];
      const userMemberships = [];
      for (const team of teams) {
        const membersResponse = await apiRequest(`/api/core/teams/${team.id}/members`);
        const members: any[] = Array.isArray(membersResponse) ? membersResponse : [];
        const membership = members.find((m: any) => m.userId === user.id);
        if (membership) {
          userMemberships.push({
            teamId: team.id,
            teamName: team.name,
            role: membership.role
          });
        }
      }
      return userMemberships;
    },
    enabled: open,
  });
  
  // Update user profile (name, email, userType)
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { fullName?: string; email?: string; userType?: 'human' | 'agent' }) => {
      return apiRequest(`/api/core/users/${user.id}`, {
        method: 'PATCH',
        body: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/core/users'] });
      toast({ title: "Profile updated successfully" });
      setEditingName(false);
      setEditingEmail(false);
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });
  
  // Update user role
  const updateRoleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      return apiRequest(`/api/core/users/${user.id}/role`, {
        method: 'PATCH',
        body: { role: newRole },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/core/users'] });
      toast({ title: "Role updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });
  
  // Update user organization (super admin only)
  const updateOrganizationMutation = useMutation({
    mutationFn: async (newOrgId: number) => {
      return apiRequest(`/api/core/users/${user.id}/organization`, {
        method: 'PATCH',
        body: { organizationId: newOrgId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/core/users'] });
      toast({ title: "Organisation updated successfully" });
      // Update the local state
      user.organizationId = selectedOrganizationId;
    },
    onError: () => {
      toast({ title: "Failed to update organisation", variant: "destructive" });
      // Reset the selection
      setSelectedOrganizationId(user.organizationId);
    },
  });
  
  // Add team membership
  const addMembershipMutation = useMutation({
    mutationFn: async ({ teamId, role }: { teamId: number; role: string }) => {
      return apiRequest(`/api/core/teams/${teamId}/members`, {
        method: 'POST',
        body: { userId: user.id, role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/core/users'] });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/core/teams'],
        exact: false 
      });
      refetchMemberships();
      setAddingTeam(false);
      setSelectedTeamId("");
      setSelectedTeamRole("Member");
      toast({ title: "Team membership added" });
    },
    onError: () => {
      toast({ title: "Failed to add team membership", variant: "destructive" });
    },
  });
  
  // Update team membership role
  const updateMembershipMutation = useMutation({
    mutationFn: async ({ teamId, role }: { teamId: number; role: string }) => {
      return apiRequest(`/api/core/teams/${teamId}/members/${user.id}`, {
        method: 'PATCH',
        body: { role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/core/users'] });
      refetchMemberships();
      toast({ title: "Team role updated" });
    },
    onError: () => {
      toast({ title: "Failed to update team role", variant: "destructive" });
    },
  });
  
  // Remove team membership
  const removeMembershipMutation = useMutation({
    mutationFn: async (teamId: number) => {
      return apiRequest(`/api/core/teams/${teamId}/members/${user.id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/core/users'] });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/core/teams'],
        exact: false 
      });
      refetchMemberships();
      toast({ title: "Team membership removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove team membership", variant: "destructive" });
    },
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      return apiRequest(`/api/core/users/${user.id}/reset-password`, {
        method: 'POST',
        body: { password },
      });
    },
    onSuccess: () => {
      toast({ 
        title: "Password reset successfully",
        description: "The user's password has been updated."
      });
      setShowPasswordReset(false);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors([]);
    },
    onError: (error: any) => {
      const errorMessage = error?.details || error?.message || 'Failed to reset password';
      toast({ 
        title: "Failed to reset password", 
        description: errorMessage,
        variant: "destructive" 
      });
    },
  });
  
  // Validate password
  const validatePassword = (pwd: string) => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push("At least 8 characters");
    if (!/[A-Z]/.test(pwd)) errors.push("One uppercase letter");
    if (!/[a-z]/.test(pwd)) errors.push("One lowercase letter");
    if (!/[0-9]/.test(pwd)) errors.push("One number");
    setPasswordErrors(errors);
    return errors.length === 0;
  };
  
  const handlePasswordReset = () => {
    if (newPassword !== confirmPassword) {
      toast({ 
        title: "Passwords don't match", 
        description: "Please make sure both passwords are the same.",
        variant: "destructive" 
      });
      return;
    }
    
    if (!validatePassword(newPassword)) {
      toast({ 
        title: "Invalid password", 
        description: "Password must meet all requirements.",
        variant: "destructive" 
      });
      return;
    }
    
    resetPasswordMutation.mutate(newPassword);
  };
  
  const availableTeams = (Array.isArray(allTeams) ? allTeams : []).filter((team: any) => 
    !memberships.some((m: any) => m.teamId === team.id)
  );
  
  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:w-[640px] sm:max-w-none">
        <SheetHeader>
          <SheetTitle className="text-lg sm:text-xl">User Details</SheetTitle>
          <SheetDescription className="text-sm">View and manage user information</SheetDescription>
        </SheetHeader>
        
        <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6 pb-6 overflow-y-auto max-h-[calc(100vh-120px)]">
          {/* Profile Section */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Profile</h3>
            
            {/* Name Field */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Name
              </Label>
              {isAdmin && editingName ? (
                <div className="flex gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-10 sm:h-9"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (editedName !== user.fullName) {
                        updateProfileMutation.mutate({ fullName: editedName });
                        user.fullName = editedName;
                      } else {
                        setEditingName(false);
                      }
                    }}
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditedName(user.fullName);
                      setEditingName(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div 
                  className={`text-sm ${isAdmin ? 'cursor-pointer hover:bg-muted/50 p-2 rounded' : ''}`}
                  onClick={() => isAdmin && setEditingName(true)}
                >
                  {user.fullName}
                </div>
              )}
            </div>
            
            {/* Email Field */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              {isAdmin && editingEmail ? (
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    className="h-10 sm:h-9"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (editedEmail !== user.email) {
                        updateProfileMutation.mutate({ email: editedEmail });
                        user.email = editedEmail;
                      } else {
                        setEditingEmail(false);
                      }
                    }}
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditedEmail(user.email);
                      setEditingEmail(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div 
                  className={`text-sm ${isAdmin ? 'cursor-pointer hover:bg-muted/50 p-2 rounded' : ''}`}
                  onClick={() => isAdmin && setEditingEmail(true)}
                >
                  {user.email}
                </div>
              )}
            </div>
            
            {/* User Type Field */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                User Type
              </Label>
              {isAdmin ? (
                <Select
                  value={editedUserType}
                  onValueChange={(value: 'human' | 'agent') => {
                    setEditedUserType(value);
                    updateProfileMutation.mutate({ userType: value });
                  }}
                  disabled={updateProfileMutation.isPending}
                >
                  <SelectTrigger className="h-10 sm:h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="human">Human User</SelectItem>
                    <SelectItem value="agent">Agent User</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline">
                  {editedUserType === 'agent' ? 'Agent' : 'Human'}
                </Badge>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role
              </Label>
              {isAdmin ? (
                <Select
                  value={user.role}
                  onValueChange={(value) => updateRoleMutation.mutate(value)}
                  disabled={updateRoleMutation.isPending}
                >
                  <SelectTrigger className="h-10 sm:h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="team_member">Team Member</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline">
                  {user.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </Badge>
              )}
            </div>
            
            {/* Organization Field */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Organisation
              </Label>
              {currentUser?.role === 'super_admin' && organizations.length > 0 ? (
                <Select
                  value={selectedOrganizationId.toString()}
                  onValueChange={(value) => {
                    const newOrgId = parseInt(value);
                    setSelectedOrganizationId(newOrgId);
                    updateOrganizationMutation.mutate(newOrgId);
                  }}
                  disabled={updateOrganizationMutation.isPending}
                >
                  <SelectTrigger className="h-10 sm:h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm">{user.organizationName || 'Unknown Organisation'}</div>
              )}
            </div>
          </div>
          
          {/* Password Reset Section - Admin Only */}
          {isAdmin && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <h3 className="text-base sm:text-lg font-semibold">Security</h3>
                {!showPasswordReset && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPasswordReset(true)}
                    className="h-9 px-4 text-sm w-full sm:w-auto"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Reset Password
                  </Button>
                )}
              </div>
              
              {showPasswordReset && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          validatePassword(e.target.value);
                        }}
                        placeholder="Enter new password"
                        className="h-10 text-base sm:h-9 sm:text-sm pr-12"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-10 sm:h-9 w-10 sm:w-9"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {passwordErrors.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Password must have:
                        <ul className="list-disc list-inside mt-1">
                          {passwordErrors.map((error, idx) => (
                            <li key={idx} className="text-destructive">{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="h-10 text-base sm:h-9 sm:text-sm"
                    />
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p className="text-xs text-destructive">Passwords don't match</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="sm"
                      onClick={handlePasswordReset}
                      disabled={!newPassword || !confirmPassword || resetPasswordMutation.isPending}
                      className="h-9 px-4 text-sm"
                    >
                      {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowPasswordReset(false);
                        setNewPassword("");
                        setConfirmPassword("");
                        setPasswordErrors([]);
                      }}
                      className="h-9 px-4 text-sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Team Memberships Section */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
              <h3 className="text-base sm:text-lg font-semibold">Team Memberships</h3>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddingTeam(true)}
                  disabled={addingTeam}
                  className="h-9 px-4 text-sm w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Team
                </Button>
              )}
            </div>
            
            {addingTeam && isAdmin && (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="space-y-2">
                  <Label>Select Team</Label>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger className="h-10 sm:h-9">
                      <SelectValue placeholder="Choose a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeams.map((team: any) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Role in Team</Label>
                  <Select value={selectedTeamRole} onValueChange={setSelectedTeamRole}>
                    <SelectTrigger className="h-10 sm:h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Leader">Leader</SelectItem>
                      <SelectItem value="Member">Member</SelectItem>
                      <SelectItem value="Watcher">Watcher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (selectedTeamId) {
                        addMembershipMutation.mutate({
                          teamId: parseInt(selectedTeamId),
                          role: selectedTeamRole,
                        });
                      }
                    }}
                    disabled={!selectedTeamId || addMembershipMutation.isPending}
                    className="h-9 px-4 text-sm"
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAddingTeam(false);
                      setSelectedTeamId("");
                      setSelectedTeamRole("Member");
                    }}
                    className="h-9 px-4 text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              {memberships.length === 0 ? (
                <div className="text-sm text-muted-foreground">No team memberships</div>
              ) : (
                memberships.map((membership: any) => (
                  <div key={membership.teamId} className="flex flex-col sm:flex-row sm:items-center justify-between border rounded-lg p-3 space-y-2 sm:space-y-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <Badge variant="secondary" className="w-fit">{membership.teamName}</Badge>
                      {isAdmin ? (
                        <Select
                          value={membership.role}
                          onValueChange={(value) => updateMembershipMutation.mutate({
                            teamId: membership.teamId,
                            role: value,
                          })}
                          disabled={updateMembershipMutation.isPending}
                        >
                          <SelectTrigger className="h-9 w-full sm:h-7 sm:w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Leader">Leader</SelectItem>
                            <SelectItem value="Member">Member</SelectItem>
                            <SelectItem value="Watcher">Watcher</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-xs w-fit">
                          {membership.role}
                        </Badge>
                      )}
                    </div>
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 sm:h-7 sm:w-7 self-end sm:self-center"
                        onClick={() => removeMembershipMutation.mutate(membership.teamId)}
                        disabled={removeMembershipMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}