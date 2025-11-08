import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Users, User, ChevronDown, Bot, MoreVertical, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PersonPanel } from "@/components/people/PersonPanel";
import { UserCreationPanel } from "@/components/people/UserCreationPanel";
import { TeamPanel } from "@/components/teams/TeamPanel";
import { TeamMembersPanel } from "@/components/teams/TeamMembersPanel";
import { useDebounce } from "@/hooks/use-debounce";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
  userType?: 'human' | 'agent';
  organizationId: number;
  organizationName?: string;
  teams?: { id: number; name: string; role: string }[];
}

interface Team {
  id: number;
  name: string;
  cadence: string;
  organizationId: number;
  organizationName?: string;
  memberCount?: number;
}

export default function PeopleAndTeams() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const urlTab = searchParams.get('tab') || 'users';
  
  // Use state for the active tab to ensure proper reactivity
  const [activeTab, setActiveTab] = useState(urlTab);
  
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all');
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showTeamMembers, setShowTeamMembers] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch organizations for super admins
  const { data: organizations = [] } = useQuery<{ id: number; name: string; isActive?: boolean }[]>({
    queryKey: ['/api/core/organizations/list'],
    enabled: isSuperAdmin,
  });
  
  // Fetch users
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['/api/core/users', { 
      orgId: isSuperAdmin ? selectedOrgId : currentUser?.organizationId,
      q: debouncedSearch,
      teamId: searchParams.get('teamId')
    }],
    enabled: !!currentUser?.organizationId,
    staleTime: 0, // Force fresh data
    refetchOnMount: true, // Always refetch on mount
  });

  
  // Fetch teams
  const { data: teams = [], isLoading: teamsLoading, refetch: refetchTeams } = useQuery({
    queryKey: ['/api/core/teams', { 
      orgId: isSuperAdmin ? selectedOrgId : currentUser?.organizationId,
      q: debouncedSearch
    }],
    enabled: !!currentUser?.organizationId,
    staleTime: 0, // Force fresh data
    refetchOnMount: true, // Always refetch on mount
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/core/users/${userId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/core/users'] });
      toast({ title: "User deleted successfully" });
      setUserToDelete(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete user", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });
  
  // Sync active tab with URL parameter
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const tab = params.get('tab') || 'users';
    setActiveTab(tab);
  }, [location]);
  
  // Force refresh data on component mount
  useEffect(() => {
    refetchUsers();
    refetchTeams();
  }, [refetchUsers, refetchTeams]);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', value);
    setLocation(`/core/people?${newParams.toString()}`);
    // Clear selections when switching tabs
    setSelectedUser(null);
    setSelectedTeam(null);
    setShowTeamMembers(false);
  };
  
  // Auto-open team if teamId is in URL
  const teamIdParam = searchParams.get('teamId');
  useMemo(() => {
    if (teamIdParam && Array.isArray(teams) && teams.length > 0) {
      const team = teams.find((t: Team) => t.id === parseInt(teamIdParam));
      if (team) {
        setSelectedTeam(team);
      }
    }
  }, [teamIdParam, teams]);
  
  const formatCadence = (cadence: string) => {
    return cadence.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };
  
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">People & Teams</h1>
          
          {/* Desktop Action Button */}
          <div className="hidden sm:flex">
            {activeTab === 'users' && isAdmin && (
              <Button onClick={() => setIsCreatingUser(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            )}
            {activeTab === 'teams' && isAdmin && (
              <Button onClick={() => setIsCreatingTeam(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            )}
          </div>
        </div>
        
        {/* Search and Mobile Tab Selector */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 sm:max-w-sm"
          />
          
          {/* Organization Filter (Super Admin Only) */}
          {isSuperAdmin && organizations.length > 0 && (
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select organisation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organisations</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id.toString()}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Mobile Tab Dropdown */}
          <div className="sm:hidden">
            <Select value={activeTab} onValueChange={handleTabChange}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  {activeTab === 'users' ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                  <SelectValue placeholder="Select view" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="users">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Users
                  </div>
                </SelectItem>
                <SelectItem value="teams">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Teams
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Mobile Action Button */}
          <div className="sm:hidden">
            {activeTab === 'users' && isAdmin && (
              <Button onClick={() => setIsCreatingUser(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            )}
            {activeTab === 'teams' && isAdmin && (
              <Button onClick={() => setIsCreatingTeam(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Desktop Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="hidden sm:flex">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Teams
          </TabsTrigger>
        </TabsList>
        
        {/* Users Tab */}
        <TabsContent value="users" className="mt-4 sm:mt-6">
          {usersLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Name</TableHead>
                    <TableHead className="min-w-[200px]">Email</TableHead>
                    <TableHead className="min-w-[100px]">Role</TableHead>
                    {currentUser?.role === 'super_admin' && (
                      <TableHead className="min-w-[150px]">Organisation</TableHead>
                    )}
                    <TableHead className="min-w-[120px] hidden sm:table-cell">Teams</TableHead>
                    <TableHead className="min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(users) && users.map((user: User) => (
                    <TableRow 
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedUser(user)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {user.fullName}
                          {user.userType === 'agent' && (
                            <Badge variant="outline" className="text-xs">
                              <Bot className="h-3 w-3 mr-1" />
                              Agent
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {user.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </Badge>
                      </TableCell>
                      {currentUser?.role === 'super_admin' && (
                        <TableCell className="text-sm">
                          {user.organizationName || 'Unknown'}
                        </TableCell>
                      )}
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {user.teams && user.teams.length > 0 ? (
                            user.teams.map(team => (
                              <Badge key={team.id} variant="secondary" className="text-xs">
                                {team.name} ({team.role})
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs">No teams</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              className="h-8 w-8 p-0"
                              data-testid={`button-user-actions-${user.id}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                              }}
                              data-testid={`menu-item-edit-user-${user.id}`}
                            >
                              <User className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {isAdmin && currentUser?.id !== user.id && user.role !== 'super_admin' && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUserToDelete(user);
                                }}
                                className="text-destructive focus:text-destructive"
                                data-testid={`menu-item-delete-user-${user.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        
        {/* Teams Tab */}
        <TabsContent value="teams" className="mt-4 sm:mt-6">
          {teamsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading teams...</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Team</TableHead>
                    <TableHead className="min-w-[100px] hidden sm:table-cell">Cadence</TableHead>
                    {isSuperAdmin && (
                      <TableHead className="min-w-[120px]">Organisation</TableHead>
                    )}
                    <TableHead className="min-w-[100px]">Members</TableHead>
                    <TableHead className="min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(teams) && teams.map((team: Team) => (
                    <TableRow 
                      key={team.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTeam(team)}
                    >
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{formatCadence(team.cadence)}</TableCell>
                      {isSuperAdmin && (
                        <TableCell className="text-sm">
                          {team.organizationName || 'Unknown'}
                        </TableCell>
                      )}
                      <TableCell className="text-sm">{team.memberCount || 0} members</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTeam(team);
                          }}
                          className="text-xs px-2"
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Person Panel */}
      {selectedUser && (
        <PersonPanel
          user={selectedUser}
          open={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          isAdmin={isAdmin}
        />
      )}
      
      {/* User Creation Panel */}
      {isCreatingUser && (
        <UserCreationPanel
          open={isCreatingUser}
          onClose={() => setIsCreatingUser(false)}
        />
      )}
      
      {/* Team Panel */}
      {(selectedTeam || isCreatingTeam) && (
        <TeamPanel
          team={isCreatingTeam ? null : selectedTeam}
          open={!!selectedTeam || isCreatingTeam}
          onClose={() => {
            setSelectedTeam(null);
            setIsCreatingTeam(false);
          }}
          onManageMembers={() => setShowTeamMembers(true)}
          isAdmin={isAdmin}
        />
      )}
      
      {/* Team Members Panel */}
      {showTeamMembers && selectedTeam && (
        <TeamMembersPanel
          team={selectedTeam}
          open={showTeamMembers}
          onClose={() => setShowTeamMembers(false)}
          isAdmin={isAdmin}
        />
      )}
      
      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.fullName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-user">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-user"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}