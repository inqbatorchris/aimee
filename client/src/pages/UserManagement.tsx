import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Search,
  MoreHorizontal,
  UserCheck,
  Mail,
  Shield,
  AlertCircle,
  Check,
  X,
  Trash2,
  Key,
  Bot
} from 'lucide-react';

// Types
interface User {
  id: number;
  email: string;
  fullName: string;
  username: string;
  role: string;
  userType: 'human' | 'agent';
  isActive: boolean;
  canAssignTickets: boolean;
  splynxAdminId: number | null;
  lastLoginAt: string | null;
  createdAt: string;
  isEmailVerified: boolean;
}

interface SplynxAdmin {
  id: number;
  splynxId: number;
  login: string;
  fullName: string;
  role: string;
}

// Schema for creating new users
const createUserSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  fullName: z.string().min(1, 'Full name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.enum(['super_admin', 'admin', 'manager', 'team_member']),
  userType: z.enum(['human', 'agent']),
  canAssignTickets: z.boolean(),
  splynxAdminId: z.number().nullable().optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

// Schema for editing users
const editUserSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  role: z.enum(['super_admin', 'admin', 'manager', 'team_member']),
  userType: z.enum(['human', 'agent']),
  canAssignTickets: z.boolean(),
  splynxAdminId: z.number().nullable().optional(),
  isActive: z.boolean(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long').optional().or(z.literal('')),
});

type EditUserForm = z.infer<typeof editUserSchema>;

function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for creating new users
  const createForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      fullName: '',
      password: '',
      role: 'admin',
      userType: 'human',
      canAssignTickets: false,
      splynxAdminId: null,
    },
  });

  // Form for editing users
  const editForm = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      fullName: '',
      role: 'admin',
      userType: 'human',
      canAssignTickets: false,
      splynxAdminId: null,
      isActive: true,
      newPassword: '',
    },
  });

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Fetch Splynx administrators for linking
  const { data: administrators = [] } = useQuery<SplynxAdmin[]>({
    queryKey: ['/api/splynx-administrators'],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      const response = await fetch('/api/core/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "User Created",
        description: "New user has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create user.",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: EditUserForm) => {
      if (!editingUser) throw new Error('No user selected');
      
      const response = await fetch(`/api/core/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "User Updated",
        description: "User has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed", 
        description: error.message || "Failed to update user.",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/core/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "User Deleted",
        description: "User has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete user.",
        variant: "destructive",
      });
    },
  });

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle user selection
  const handleSelectUser = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle editing user
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      fullName: user.fullName,
      role: user.role as 'admin' | 'manager' | 'team_member',
      userType: user.userType,
      canAssignTickets: user.canAssignTickets,
      splynxAdminId: user.splynxAdminId,
      isActive: user.isActive,
      newPassword: '',
    });
    setIsEditDialogOpen(true);
  };

  // Handle deleting user with confirmation
  const handleDeleteUser = async (user: User) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${user.fullName}"? This action cannot be undone.`
    );
    
    if (confirmDelete) {
      deleteUserMutation.mutate(user.id);
    }
  };

  // Handle sending password reset email
  const handleSendPasswordReset = async (user: User) => {
    try {
      const response = await fetch(`/api/auth/reset-password-admin`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ email: user.email })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send reset email');
      }
      
      const data = await response.json();
      
      toast({
        title: 'Password Reset Email Sent',
        description: `A password reset link has been sent to ${user.email}`,
      });
      
      // In development, also log the reset link
      if (data.resetLink) {
        console.log('Password reset link:', data.resetLink);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to send reset email',
        description: error instanceof Error ? error.message : 'An error occurred'
      });
    }
  };

  // Form submission handlers
  const onSubmitCreate = (data: CreateUserForm) => {
    createUserMutation.mutate(data);
  };

  const onSubmitEdit = (data: EditUserForm) => {
    updateUserMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage platform users and their permissions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:gap-4">
          <Badge variant="outline" className="text-xs lg:text-sm">
            <Users className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
            {users.length} Users
          </Badge>
          <Badge variant="outline" className="text-xs lg:text-sm">
            <UserCheck className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
            {users.filter(u => u.canAssignTickets).length} Can Assign
          </Badge>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="text-xs lg:text-sm">
                <UserPlus className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4 pb-4">
                  <FormField
                    control={createForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="user@countryconnect.co.uk" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="John Doe" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Minimum 8 characters" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="team_member">Team Member</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="userType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select user type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="human">Human User</SelectItem>
                            <SelectItem value="agent">Agent User</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="canAssignTickets"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Can assign tickets</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Allow this user to assign support tickets
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="splynxAdminId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link to Splynx Admin (Optional)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === 'none' ? null : parseInt(value))}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Splynx admin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No linking</SelectItem>
                            {administrators.map((admin) => (
                              <SelectItem key={admin.splynxId} value={admin.splynxId.toString()}>
                                {admin.fullName} ({admin.login})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {selectedUsers.length > 0 && (
          <Badge variant="secondary">
            {selectedUsers.length} selected
          </Badge>
        )}
      </div>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => {
          const linkedAdmin = administrators.find(admin => admin.splynxId === user.splynxAdminId);
          const isSelected = selectedUsers.includes(user.id);
          
          return (
            <Card key={user.id} className={`transition-all duration-200 hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}`}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="pt-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectUser(user.id)}
                      className="mt-0.5"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-sm lg:text-base truncate">
                              {user.fullName}
                            </h3>
                            <Badge variant={user.isActive ? "default" : "secondary"} className="text-xs">
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant={user.userType === 'agent' ? "outline" : "secondary"} className="text-xs">
                              {user.userType === 'agent' && <Bot className="h-3 w-3 mr-1" />}
                              {user.userType === 'agent' ? 'Agent' : 'Human'}
                            </Badge>
                            {user.canAssignTickets && (
                              <Badge variant="outline" className="text-xs">
                                <UserCheck className="h-3 w-3 mr-1" />
                                Can Assign
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Shield className="h-3 w-3" />
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendPasswordReset(user)}>
                                <Key className="mr-2 h-4 w-4" />
                                Send Password Reset
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(user)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      {linkedAdmin && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                            Linked to: {linkedAdmin.fullName} ({linkedAdmin.login})
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Users Found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No users match your search criteria.' : 'No users have been created yet.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4 pb-4">
                <div className="text-sm text-muted-foreground">
                  Editing: {editingUser.email}
                </div>
                <FormField
                  control={editForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="John Doe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="team_member">Team Member</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="userType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="human">Human User</SelectItem>
                          <SelectItem value="agent">Agent User</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="canAssignTickets"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Can assign tickets</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Allow this user to assign support tickets
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="splynxAdminId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link to Splynx Admin (Optional)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === 'none' ? null : parseInt(value))}
                        value={field.value?.toString() || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Splynx admin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No linking</SelectItem>
                          {administrators.map((admin) => (
                            <SelectItem key={admin.splynxId} value={admin.splynxId.toString()}>
                              {admin.fullName} ({admin.login})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active User</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Allow this user to access the platform
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                <Separator className="my-4" />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Change Password (Optional)</h4>
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep the current password. Use this to manually set a new password without sending an email.
                  </p>
                </div>
                <FormField
                  control={editForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="password" 
                          placeholder="Enter new password (min 8 characters)"
                          autoComplete="new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UserManagement;