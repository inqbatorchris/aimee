import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users, Building, Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { UserTable } from '@/components/managed-services/UserTable';
import { AddUserDialog } from '@/components/managed-services/AddUserDialog';
import { EditUserDialog } from '@/components/managed-services/EditUserDialog';
import { CloneUserDialog } from '@/components/managed-services/CloneUserDialog';
import { AddTeamDialog } from '@/components/managed-services/AddTeamDialog';
import { UserDetailsModal } from '@/components/managed-services/UserDetailsModal';
import { PendingRequests } from '@/components/managed-services/PendingRequests';
import { apiRequest } from '@/lib/queryClient';
// Local types for clean architecture
type ManagedServicesClient = {
  id: number;
  name: string;
  status?: string;
};

type ManagedServicesUser = {
  id: number;
  name: string;
  email: string;
  status?: string;
};

type ManagedServicesTeam = {
  id: number;
  name: string;
  clientId: number;
};





export default function ManagedServices() {
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [cloningUser, setCloningUser] = useState<any>(null);
  const [viewingUser, setViewingUser] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debug: Log component mount
  console.log('ManagedServices: Component mounted');

  // Fetch all managed services clients
  const { data: clients, isLoading: clientsLoading, error: clientsError } = useQuery({
    queryKey: ['/api/managed-services/clients'],
    enabled: true,
    retry: (failureCount, error) => {
      // Retry up to 3 times, but not for auth errors
      if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Debug: Log query state
  console.log('ManagedServices: Query state:', {
    clients,
    clientsLoading,
    clientsError,
    hasClients: clients && Array.isArray(clients),
    clientsLength: clients?.length
  });

  // Fetch users for selected client
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/managed-services/clients', selectedClient, 'users'],
    enabled: !!selectedClient
  });

  // Fetch teams for selected client
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['/api/managed-services/clients', selectedClient, 'teams'],
    enabled: !!selectedClient
  });

  // Fetch change requests for selected client
  const { data: changeRequests, isLoading: changeRequestsLoading, refetch: refetchChangeRequests } = useQuery({
    queryKey: ['/api/managed-services/clients', selectedClient, 'change-requests'],
    enabled: !!selectedClient
  });

  const handleCloneUser = (user: any) => {
    setCloningUser(user);
  };

  const handleViewUser = (user: any) => {
    setViewingUser(user);
  };

  const handleMoveUser = (userId: number, fromTeamId: number, toTeamId: number) => {
    console.log(`Moving user ${userId} from team ${fromTeamId} to team ${toTeamId}`);
    // In production, this would make an API call to update the user's team
  };

  const handleDeactivateUser = (userId: number, reason?: string) => {
    console.log(`Deactivating user ${userId} with reason: ${reason}`);
    // In production, this would make an API call to deactivate the user
  };

  const handleBackToClients = () => {
    setSelectedClient(null);
    setSelectedUsers([]);
    setEditingUser(null);
    setCloningUser(null);
    setViewingUser(null);
  };

  const selectedClientData = clients?.find((c: ManagedServicesClient) => c.id === selectedClient);

  const stats = {
    totalUsers: users?.length || 0,
    activeUsers: users?.filter((u: ManagedServicesUser) => u.userStatus === 'Active').length || 0,
    pendingRequests: users?.filter((u: ManagedServicesUser) => u.pendingChangeType).length || 0,
    totalTeams: teams?.length || 0
  };

  // If no client is selected, show client selection interface
  if (!selectedClient) {
    return (
      <div className="h-full w-full bg-background overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Managed Services</h1>
                <p className="text-muted-foreground">
                  Select a client to manage their services, teams, and voice configurations
                </p>
              </div>
            </div>

                {clientsError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-red-800">Error loading clients</h3>
                <p className="text-sm text-red-700 mt-1">
                  {clientsError instanceof Error ? clientsError.message : 'Failed to load managed services clients'}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
              </div>
            )}

            {clientsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading clients...</p>
                </div>
              </div>
            ) : !clientsError && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients?.map((client: ManagedServicesClient) => (
                  <Card key={client.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Building className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{client.companyName}</h3>
                            <p className="text-sm text-muted-foreground">
                              Splynx ID: {client.splynxCustomerId}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Contact:</p>
                          <p className="font-medium">{client.primaryContactName}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Phone:</span>
                          <span>{client.primaryContactPhone || 'Not provided'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant={client.status === 'active' ? "default" : "secondary"}>
                            {client.status === 'active' ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>

                      <Button 
                        onClick={() => setSelectedClient(client.id)}
                        className="w-full"
                      >
                        Manage Services
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!clientsLoading && !clientsError && clients?.length === 0 && (
              <div className="text-center py-12">
                <Building className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Managed Services Clients</h3>
                <p className="text-muted-foreground mb-4">
                  No clients have been set up for managed services yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-background overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Managed Services</h1>
          <p className="text-muted-foreground">
            Manage business customer services, teams, and voice configurations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddUser(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
          <Button variant="outline" onClick={() => setShowAddTeam(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Team
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeams}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Users Table - Takes up 3 columns */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <UserTable
                users={users || []}
                teams={teams || []}
                onCloneUser={handleCloneUser}
                onViewUser={handleViewUser}
                onMoveUser={handleMoveUser}
                onDeactivateUser={handleDeactivateUser}
                selectedUsers={selectedUsers}
                onUserSelect={setSelectedUsers}
              />
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests - Takes up 1 column */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <PendingRequests 
                requests={changeRequests || []} 
                loading={changeRequestsLoading}
                onRefresh={refetchChangeRequests}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <AddUserDialog
        isOpen={showAddUser}
        onClose={() => setShowAddUser(false)}
        teams={teams || []}
      />

      <AddTeamDialog
        isOpen={showAddTeam}
        onClose={() => setShowAddTeam(false)}
      />

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          teams={teams || []}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}

      {cloningUser && (
        <CloneUserDialog
          user={cloningUser}
          teams={mockTeams}
          isOpen={!!cloningUser}
          onClose={() => setCloningUser(null)}
        />
      )}

      {viewingUser && (
        <UserDetailsModal
          user={viewingUser}
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
          onEdit={setEditingUser}
        />
      )}
        </div>
      </div>
    </div>
  );
}