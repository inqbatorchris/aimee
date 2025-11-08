import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface UserCreationPanelProps {
  open: boolean;
  onClose: () => void;
}

interface Team {
  id: number;
  name: string;
}

interface TeamAssignment {
  teamId: number;
  role: 'Leader' | 'Member' | 'Watcher';
}

export function UserCreationPanel({ open, onClose }: UserCreationPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  // Form state
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<'admin' | 'manager' | 'team_member'>("team_member");
  const [userType, setUserType] = useState<'human' | 'agent'>("human");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [teamAssignments, setTeamAssignments] = useState<TeamAssignment[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedTeamRole, setSelectedTeamRole] = useState<'Leader' | 'Member' | 'Watcher'>('Member');
  
  // Password validation state
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  
  // Fetch available teams
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/core/teams', { 
      orgId: selectedOrganizationId || currentUser?.organizationId 
    }],
    enabled: open,
  });
  
  // Fetch organizations for super admins
  const { data: organizations = [] } = useQuery<{ id: number; name: string; isActive?: boolean }[]>({
    queryKey: ['/api/core/organizations/list'],
    enabled: open && currentUser?.role === 'super_admin',
  });
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      return apiRequest('/api/core/users', {
        method: 'POST',
        body: userData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/core/users'] });
      toast({ 
        title: "User created successfully",
        description: "The new user can now log in with their credentials."
      });
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error || 'Failed to create user';
      toast({ 
        title: "Failed to create user", 
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
  
  // Add team assignment
  const addTeamAssignment = () => {
    if (selectedTeamId) {
      const teamId = parseInt(selectedTeamId);
      if (!teamAssignments.find(ta => ta.teamId === teamId)) {
        setTeamAssignments([...teamAssignments, { teamId, role: selectedTeamRole }]);
        setSelectedTeamId("");
        setSelectedTeamRole('Member');
      }
    }
  };
  
  // Remove team assignment
  const removeTeamAssignment = (teamId: number) => {
    setTeamAssignments(teamAssignments.filter(ta => ta.teamId !== teamId));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!email || !fullName || !password) {
      toast({ 
        title: "Missing required fields", 
        description: "Please fill in all required fields.",
        variant: "destructive" 
      });
      return;
    }
    
    // Validate password
    if (!validatePassword(password)) {
      toast({ 
        title: "Invalid password", 
        description: "Password does not meet requirements.",
        variant: "destructive" 
      });
      return;
    }
    
    // Prepare data for submission
    const userData: any = {
      email,
      fullName,
      password,
      role,
      userType,
      teamIds: teamAssignments.map(ta => ta.teamId),
      teamRoles: teamAssignments.reduce((acc, ta) => {
        acc[ta.teamId] = ta.role;
        return acc;
      }, {} as Record<number, string>)
    };
    
    // Add organizationId for super admins
    if (currentUser?.role === 'super_admin' && selectedOrganizationId) {
      userData.organizationId = selectedOrganizationId;
    }
    
    createUserMutation.mutate(userData);
  };
  
  // Reset form
  const resetForm = () => {
    setEmail("");
    setFullName("");
    setPassword("");
    setRole("team_member");
    setUserType("human");
    setSelectedOrganizationId(null);
    setShowPassword(false);
    setTeamAssignments([]);
    setSelectedTeamId("");
    setSelectedTeamRole('Member');
    setPasswordErrors([]);
  };
  
  // Get available teams (not already assigned)
  const availableTeams = teams.filter(
    team => !teamAssignments.find(ta => ta.teamId === team.id)
  );
  
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create New User</SheetTitle>
          <SheetDescription>
            Add a new user to {currentUser?.role === 'super_admin' ? 'an organisation' : 'your organisation'}. They will receive login credentials.
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>
          
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
            />
            <p className="text-sm text-muted-foreground">
              This will be their login email
            </p>
          </div>
          
          {/* Organization (Super Admin only) */}
          {currentUser?.role === 'super_admin' && organizations.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="organization">Organisation *</Label>
              <Select 
                value={selectedOrganizationId?.toString() || ""} 
                onValueChange={(value) => setSelectedOrganizationId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an organisation" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org: any) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                The user will be added to this organisation
              </p>
            </div>
          )}
          
          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  validatePassword(e.target.value);
                }}
                placeholder="Enter secure password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Password requirements */}
            <div className="space-y-1 mt-2">
              <p className="text-sm font-medium">Password must have:</p>
              <div className="space-y-1">
                {[
                  { text: "At least 8 characters", met: password.length >= 8 },
                  { text: "One uppercase letter", met: /[A-Z]/.test(password) },
                  { text: "One lowercase letter", met: /[a-z]/.test(password) },
                  { text: "One number", met: /[0-9]/.test(password) },
                ].map((req, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {req.met ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={req.met ? "text-green-600" : "text-muted-foreground"}>
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">User Role *</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team_member">Team Member</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {role === 'admin' && "Can manage users, teams, and organization settings"}
              {role === 'manager' && "Can manage team members and view reports"}
              {role === 'team_member' && "Standard user with access to assigned teams"}
            </p>
          </div>
          
          {/* User Type */}
          <div className="space-y-2">
            <Label htmlFor="userType">User Type *</Label>
            <Select value={userType} onValueChange={(value: any) => setUserType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select user type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="human">Human User</SelectItem>
                <SelectItem value="agent">Agent User</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {userType === 'human' && "Regular user account for people"}
              {userType === 'agent' && "Automated agent for workflows and system processes"}
            </p>
          </div>
          
          {/* Team Assignments */}
          <div className="space-y-2">
            <Label>Team Assignments (Optional)</Label>
            
            {/* Current assignments */}
            {teamAssignments.length > 0 && (
              <div className="space-y-2 mb-3">
                {teamAssignments.map(ta => {
                  const team = teams.find(t => t.id === ta.teamId);
                  return (
                    <div key={ta.teamId} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{team?.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {ta.role}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTeamAssignment(ta.teamId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Add team form */}
            {availableTeams.length > 0 && (
              <div className="flex gap-2">
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeams.map(team => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedTeamRole} onValueChange={(value: any) => setSelectedTeamRole(value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Leader">Leader</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Watcher">Watcher</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTeamAssignment}
                  disabled={!selectedTeamId}
                >
                  Add
                </Button>
              </div>
            )}
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => {
              resetForm();
              onClose();
            }}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createUserMutation.isPending || passwordErrors.length > 0}
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}