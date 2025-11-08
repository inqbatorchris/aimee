import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Check, ChevronsUpDown, User, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
}

interface Team {
  id: number;
  name: string;
  description?: string;
  memberCount?: number;
}

interface AssignTrainingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  documentTitle: string;
}

export function AssignTrainingDialog({ isOpen, onClose, documentId, documentTitle }: AssignTrainingDialogProps) {
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [activeTab, setActiveTab] = useState<"users" | "teams">("users");
  const [usersOpen, setUsersOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/core/users"],
    enabled: isOpen
  });

  // Fetch all teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/core/teams"],
    enabled: isOpen
  });

  // Reset selections when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const assignTrainingMutation = useMutation({
    mutationFn: async () => {
      const assignments = [];

      // Create user assignments
      for (const userId of selectedUsers) {
        assignments.push({
          userId,
          documentId,
          dueDate: dueDate || null,
          priority
        });
      }

      // Create team assignments
      for (const teamId of selectedTeams) {
        assignments.push({
          teamId,
          documentId,
          dueDate: dueDate || null,
          priority
        });
      }

      // Submit all assignments
      const responses = await Promise.all(
        assignments.map(assignment =>
          apiRequest("/api/knowledge-base/assignments", {
            method: "POST",
            body: assignment
          })
        )
      );
      return responses;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Training assigned to ${selectedUsers.length} user(s) and ${selectedTeams.length} team(s) successfully.`
      });
      
      // Invalidate training-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/team-progress"] });
      
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign training. Please try again.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setSelectedUsers([]);
    setSelectedTeams([]);
    setDueDate("");
    setPriority("medium");
    setActiveTab("users");
    setUsersOpen(false);
    setTeamsOpen(false);
  };

  const toggleUser = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleTeam = (teamId: number) => {
    setSelectedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const removeUser = (userId: number) => {
    setSelectedUsers(prev => prev.filter(id => id !== userId));
  };

  const removeTeam = (teamId: number) => {
    setSelectedTeams(prev => prev.filter(id => id !== teamId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedUsers.length === 0 && selectedTeams.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user or team to assign training to.",
        variant: "destructive"
      });
      return;
    }

    assignTrainingMutation.mutate();
  };

  const totalSelected = selectedUsers.length + selectedTeams.length;
  const selectedUserObjects = users.filter(u => selectedUsers.includes(u.id));
  const selectedTeamObjects = teams.filter(t => selectedTeams.includes(t.id));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Assign Training</DialogTitle>
          <DialogDescription>
            Assign the document "{documentTitle}" to team members for training.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Assignment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="due-date">Due Date (Optional)</Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                data-testid="input-due-date"
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabs for Users and Teams */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "users" | "teams")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="users" data-testid="tab-users">
                <User className="h-4 w-4 mr-2" />
                Users ({selectedUsers.length})
              </TabsTrigger>
              <TabsTrigger value="teams" data-testid="tab-teams">
                <Users className="h-4 w-4 mr-2" />
                Teams ({selectedTeams.length})
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-3">
              <div>
                <Label>Select Users</Label>
                <Popover open={usersOpen} onOpenChange={setUsersOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={usersOpen}
                      className="w-full justify-between"
                      data-testid="button-select-users"
                    >
                      {selectedUsers.length === 0 ? (
                        <span className="text-muted-foreground">Select users...</span>
                      ) : (
                        <span>{selectedUsers.length} user(s) selected</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0">
                    <Command>
                      <CommandInput placeholder="Search users..." />
                      <CommandList>
                        <CommandEmpty>No users found.</CommandEmpty>
                        <CommandGroup>
                          {users.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={`${user.fullName} ${user.email} ${user.username}`}
                              onSelect={() => toggleUser(user.id)}
                              data-testid={`user-item-${user.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedUsers.includes(user.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{user.fullName}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Selected Users */}
              {selectedUserObjects.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Selected Users</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedUserObjects.map((user) => (
                      <Badge key={user.id} variant="secondary" className="pl-2 pr-1">
                        {user.fullName}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 ml-1 hover:bg-transparent"
                          onClick={() => removeUser(user.id)}
                          data-testid={`remove-user-${user.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Teams Tab */}
            <TabsContent value="teams" className="space-y-3">
              <div>
                <Label>Select Teams</Label>
                <Popover open={teamsOpen} onOpenChange={setTeamsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={teamsOpen}
                      className="w-full justify-between"
                      data-testid="button-select-teams"
                    >
                      {selectedTeams.length === 0 ? (
                        <span className="text-muted-foreground">Select teams...</span>
                      ) : (
                        <span>{selectedTeams.length} team(s) selected</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0">
                    <Command>
                      <CommandInput placeholder="Search teams..." />
                      <CommandList>
                        <CommandEmpty>No teams found.</CommandEmpty>
                        <CommandGroup>
                          {teams.map((team) => (
                            <CommandItem
                              key={team.id}
                              value={`${team.name} ${team.description || ''}`}
                              onSelect={() => toggleTeam(team.id)}
                              data-testid={`team-item-${team.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedTeams.includes(team.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{team.name}</span>
                                {team.description && (
                                  <span className="text-xs text-muted-foreground">{team.description}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Selected Teams */}
              {selectedTeamObjects.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Selected Teams</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTeamObjects.map((team) => (
                      <Badge key={team.id} variant="secondary" className="pl-2 pr-1">
                        {team.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 ml-1 hover:bg-transparent"
                          onClick={() => removeTeam(team.id)}
                          data-testid={`remove-team-${team.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={totalSelected === 0 || assignTrainingMutation.isPending}
              data-testid="button-submit"
            >
              {assignTrainingMutation.isPending ? "Assigning..." : `Assign to ${totalSelected} User(s)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
