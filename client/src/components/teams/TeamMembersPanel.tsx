import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, User, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/hooks/use-debounce";

interface TeamMembersPanelProps {
  team: {
    id: number;
    name: string;
  };
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

interface TeamMember {
  userId: number;
  fullName: string;
  email: string;
  role: string;
}

export function TeamMembersPanel({ team, open, onClose, isAdmin }: TeamMembersPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [addingMember, setAddingMember] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("Member");
  const debouncedSearch = useDebounce(userSearch, 300);
  
  // Fetch team members
  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: [`/api/core/teams/${team.id}/members`],
    enabled: open,
  });
  
  // Search users for adding
  const { data: searchResults = [] } = useQuery({
    queryKey: ['/api/core/users', { 
      orgId: currentUser?.organizationId, 
      q: debouncedSearch 
    }],
    enabled: addingMember && debouncedSearch.length > 0,
  });
  
  // Check if user is team leader
  const currentUserMembership = Array.isArray(members) ? members.find((m: TeamMember) => m.userId === currentUser?.id) : null;
  const canManageMembers = isAdmin || currentUserMembership?.role === 'Leader';
  
  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      return apiRequest(`/api/core/teams/${team.id}/members`, {
        method: 'POST',
        body: { userId, role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/core/teams/${team.id}/members`] });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/core/teams'],
        exact: false 
      });
      refetchMembers();
      setAddingMember(false);
      setUserSearch("");
      setSelectedUserId("");
      setSelectedRole("Member");
      toast({ title: "Member added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add member", variant: "destructive" });
    },
  });
  
  // Update member role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      return apiRequest(`/api/core/teams/${team.id}/members/${userId}`, {
        method: 'PATCH',
        body: { role },
      });
    },
    onSuccess: () => {
      refetchMembers();
      toast({ title: "Member role updated" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });
  
  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/core/teams/${team.id}/members/${userId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/core/teams/${team.id}/members`] });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/core/teams'],
        exact: false 
      });
      refetchMembers();
      toast({ title: "Member removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove member", variant: "destructive" });
    },
  });
  
  // Filter out existing members from search results
  const availableUsers = (Array.isArray(searchResults) ? searchResults : []).filter((user: any) => 
    !Array.isArray(members) || !members.some((m: TeamMember) => m.userId === user.id)
  );
  
  if (!canManageMembers && open) {
    return (
      <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="sm:w-[640px]">
          <SheetHeader>
            <SheetTitle>Team Members - {team.name}</SheetTitle>
            <SheetDescription>You don't have permission to manage this team's members</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }
  
  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:w-[640px]">
        <SheetHeader>
          <SheetTitle>Team Members - {team.name}</SheetTitle>
          <SheetDescription>Manage team members and their roles</SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Add Member Section */}
          {canManageMembers && (
            <div className="space-y-4">
              {!addingMember ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setAddingMember(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              ) : (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Search User</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search by name or email..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  {availableUsers.length > 0 && (
                    <div className="space-y-2">
                      <Label>Select User</Label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.fullName} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Leader">Leader</SelectItem>
                        <SelectItem value="Member">Member</SelectItem>
                        <SelectItem value="Watcher">Watcher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (selectedUserId) {
                          addMemberMutation.mutate({
                            userId: parseInt(selectedUserId),
                            role: selectedRole,
                          });
                        }
                      }}
                      disabled={!selectedUserId || addMemberMutation.isPending}
                    >
                      Add Member
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAddingMember(false);
                        setUserSearch("");
                        setSelectedUserId("");
                        setSelectedRole("Member");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Members List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Members</h3>
            <div className="space-y-2">
              {!Array.isArray(members) || members.length === 0 ? (
                <div className="text-sm text-muted-foreground">No members in this team</div>
              ) : (
                members.map((member: TeamMember) => (
                  <div key={member.userId} className="flex items-center justify-between border rounded-lg p-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{member.fullName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{member.email}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {canManageMembers ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) => updateRoleMutation.mutate({
                            userId: member.userId,
                            role: value,
                          })}
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="h-8 w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Leader">Leader</SelectItem>
                            <SelectItem value="Member">Member</SelectItem>
                            <SelectItem value="Watcher">Watcher</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{member.role}</Badge>
                      )}
                      
                      {canManageMembers && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => removeMemberMutation.mutate(member.userId)}
                          disabled={removeMemberMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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