import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, Copy, UserMinus, ArrowRight, Phone, Mail, Eye } from 'lucide-react';

interface ManagedServicesUser {
  id: number;
  userName: string;
  email: string;
  voiceExtension: string;
  fullPhoneNumber: string;
  site: string;
  userStatus: string;
  pendingChangeType: string;
  changeRequestTicketId: number;
  jobTitle: string;
  userRole: string;
  huntGroupMember: boolean;
  teamId: number;
  teamName: string;
  huntGroupEnabled: boolean;
  huntGroupExtension: string;
  directDialNumber: string;
  featurePack: string;
}

interface ManagedServicesTeam {
  id: number;
  teamName: string;
  huntGroupEnabled: boolean;
  huntGroupExtension: string;
  directDialNumber: string;
  featurePack: string;
  site: string;
}

interface UserTableProps {
  users: ManagedServicesUser[];
  teams: ManagedServicesTeam[];
  onCloneUser: (user: ManagedServicesUser) => void;
  onViewUser?: (user: ManagedServicesUser) => void;
  onMoveUser?: (userId: number, fromTeamId: number, toTeamId: number) => void;
  onDeactivateUser?: (userId: number, reason?: string) => void;
  selectedUsers: number[];
  onUserSelect: (userIds: number[]) => void;
}

export function UserTable({ 
  users, 
  teams, 
  onCloneUser, 
  onViewUser,
  onMoveUser, 
  onDeactivateUser, 
  selectedUsers, 
  onUserSelect 
}: UserTableProps) {
  const [pendingMoves, setPendingMoves] = useState<{[key: number]: number}>({});

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onUserSelect(users.map(u => u.id));
    } else {
      onUserSelect([]);
    }
  };

  const handleSelectUser = (userId: number, checked: boolean) => {
    if (checked) {
      onUserSelect([...selectedUsers, userId]);
    } else {
      onUserSelect(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleMoveUser = (userId: number, fromTeamId: number) => {
    const toTeamId = pendingMoves[userId];
    if (toTeamId && toTeamId !== fromTeamId && onMoveUser) {
      onMoveUser(userId, fromTeamId, toTeamId);
      setPendingMoves(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    }
  };

  const getStatusBadge = (user: ManagedServicesUser) => {
    if (user.pendingChangeType) {
      return <Badge variant="outline" className="text-orange-600">Pending {user.pendingChangeType}</Badge>;
    }
    
    switch (user.userStatus) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">{user.userStatus}</Badge>;
    }
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No users found for this client.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedUsers.length === users.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Extension</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {user.userName}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-sm">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Phone className="h-3 w-3" />
                      {user.fullPhoneNumber}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {user.voiceExtension}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{user.teamName}</span>
                    {user.huntGroupMember && (
                      <Badge variant="outline" className="text-xs">Hunt Group</Badge>
                    )}
                  </div>
                  {pendingMoves[user.id] && (
                    <div className="mt-2 flex items-center gap-2">
                      <Select 
                        value={pendingMoves[user.id]?.toString()}
                        onValueChange={(value) => setPendingMoves(prev => ({ ...prev, [user.id]: parseInt(value) }))}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue placeholder="Move to..." />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.filter(t => t.id !== user.teamId).map((team) => (
                            <SelectItem key={team.id} value={team.id.toString()}>
                              {team.teamName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        size="sm" 
                        onClick={() => handleMoveUser(user.id, user.teamId)}
                        className="h-8"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{user.site}</Badge>
                </TableCell>
                <TableCell>
                  {getStatusBadge(user)}
                </TableCell>
                <TableCell>
                  <Badge variant={user.userRole === 'Company Admin' ? 'default' : 'secondary'}>
                    {user.userRole}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewUser?.(user)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCloneUser(user)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Clone User
                      </DropdownMenuItem>
                      {onMoveUser && (
                        <DropdownMenuItem 
                          onClick={() => setPendingMoves(prev => ({ ...prev, [user.id]: user.teamId }))}
                        >
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Move Team
                        </DropdownMenuItem>
                      )}
                      {onDeactivateUser && (
                        <DropdownMenuItem 
                          onClick={() => onDeactivateUser(user.id)}
                          className="text-red-600"
                        >
                          <UserMinus className="mr-2 h-4 w-4" />
                          Deactivate
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
    </div>
  );
}