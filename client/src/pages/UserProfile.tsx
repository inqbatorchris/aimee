import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  User, 
  Mail, 
  Shield,
  Bell,
  Key,
  Camera,
  Save,
  Clock,
  Building2,
  Activity,
  LogOut,
  Smartphone,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Umbrella,
  ExternalLink,
  Calendar
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { getAvatarUrl, getInitials } from "@/lib/utils";

interface ActivityLog {
  id: number;
  actionType: string;
  entityType: string;
  description: string;
  createdAt: string;
  metadata?: any;
}

interface ProfileUpdateResponse {
  success: boolean;
  user: any;
}

interface AvatarUpdateResponse {
  success: boolean;
  avatarUrl: string;
  user: any;
}

interface OrganizationData {
  organization: {
    id: number;
    name: string;
  };
}

export default function UserProfile() {
  const { currentUser, logout, updateProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("profile");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarKey, setAvatarKey] = useState(0); // Force re-render of avatar
  
  // Form state - initialize with current user data
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [splynxAdminId, setSplynxAdminId] = useState<string>(currentUser?.splynxAdminId?.toString() || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  // Update form state when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setEmail(currentUser.email || '');
      setSplynxAdminId(currentUser.splynxAdminId?.toString() || '');
    }
  }, [currentUser]);

  // Fetch user activity logs
  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: ['/api/core/user/activity'],
    enabled: !!currentUser
  });

  // Fetch field app sync logs
  const { data: syncLogsData, refetch: refetchSyncLogs } = useQuery<{ logs: ActivityLog[] }>({
    queryKey: ['/api/field-app/sync-logs'],
    enabled: !!currentUser
  });

  const syncLogs = syncLogsData?.logs || [];
  const [expandedSyncLogs, setExpandedSyncLogs] = useState<Set<number>>(new Set());

  // Fetch organization data
  const { data: organizationData } = useQuery<OrganizationData>({
    queryKey: [`/api/core/organizations/${currentUser?.organizationId}`],
    enabled: !!currentUser?.organizationId
  });

  // Fetch holiday allowance data
  const { data: allowanceData } = useQuery<{
    success: boolean;
    allowance: {
      annualAllowance: string;
      carriedOver: string;
      usedDays: string;
      pendingDays: string;
      totalAvailable: number;
      remaining: number;
      percentUsed: number;
    } | null;
  }>({
    queryKey: ['/api/calendar/holidays/allowance'],
    enabled: !!currentUser
  });
  
  // Fetch user's holiday requests (stored as work items with workItemType='holiday_request')
  type HolidayWorkItem = {
    id: number;
    title: string;
    status: string;
    workflowMetadata: {
      startDate: string;
      endDate: string;
      daysCount: number;
      holidayType: string;
    } | null;
    createdAt: string;
  };
  
  const { data: holidayWorkItemsData } = useQuery({
    queryKey: ['/api/work-items', { ownerId: currentUser?.id, workItemType: 'holiday_request' }],
    queryFn: async () => {
      const response = await fetch(`/api/work-items?ownerId=${currentUser?.id}&workItemType=holiday_request`, {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch holiday requests');
      const data = await response.json();
      if (Array.isArray(data)) return data;
      return data?.items || [];
    },
    enabled: !!currentUser,
  });
  
  const holidayWorkItems: HolidayWorkItem[] = Array.isArray(holidayWorkItemsData) ? holidayWorkItemsData : [];

  // Single profile update mutation (handles both form data and file upload)
  const updateProfileMutation = useMutation({
    mutationFn: async (data: FormData | object): Promise<ProfileUpdateResponse> => {
      const isFormData = data instanceof FormData;
      
      return await apiRequest('/api/core/user/profile', {
        method: 'PATCH',
        body: data,
        headers: isFormData ? {} : { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: async (result: ProfileUpdateResponse) => {
      // Update the auth context with new data
      await updateProfile(result.user);
      
      // Invalidate queries to refresh all components
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/check'] });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully."
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast({
        title: "Password change failed",
        description: error.message || "Failed to change password",
        variant: "destructive"
      });
    }
  });

  // Handle profile form save
  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      fullName,
      email,
      splynxAdminId: splynxAdminId ? parseInt(splynxAdminId) : null,
      emailNotifications,
      pushNotifications,
      securityAlerts
    });
  };

  // Handle avatar upload with single endpoint
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    // Create FormData with current profile data + avatar file
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('fullName', fullName);
    formData.append('email', email);

    try {
      // Get upload URL first
      const uploadResponse = await fetch('/api/core/objects/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }
      
      const uploadData = await uploadResponse.json();
      
      // Upload file to the presigned URL
      const uploadResult = await fetch(uploadData.uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });
      
      if (!uploadResult.ok) {
        throw new Error('Failed to upload file');
      }
      
      // Update user avatar in single call
      const avatarResult = await apiRequest('/api/core/user/avatar', {
        method: 'PUT',
        body: { avatarURL: uploadData.uploadURL }
      }) as AvatarUpdateResponse;
      
      // Update auth context and force UI refresh
      await updateProfile({ avatarUrl: avatarResult.avatarUrl });
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/check'] });
      
      // Force immediate avatar re-render
      setAvatarKey(prev => prev + 1);
      
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully."
      });
      
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive"
      });
    }
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirmation don't match",
        variant: "destructive"
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
      confirmPassword
    });
  };

  // Format activity for display
  const formatActivityDescription = (activity: ActivityLog) => {
    const actions = {
      'creation': 'Created',
      'status_change': 'Updated', 
      'assignment': 'Assigned',
      'completion': 'Completed'
    };
    return `${actions[activity.actionType as keyof typeof actions] || activity.actionType} ${activity.entityType}`;
  };

  // Toggle sync log expansion
  const toggleSyncLog = (logId: number) => {
    const newExpanded = new Set(expandedSyncLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedSyncLogs(newExpanded);
  };

  // Get sync status icon
  const getSyncStatusIcon = (actionType: string) => {
    if (actionType === 'field_app_sync_success') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (actionType === 'field_app_sync_partial') {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  // Mobile tab selector component
  const MobileTabSelector = () => (
    <Select value={activeTab} onValueChange={setActiveTab}>
      <SelectTrigger className="sm:hidden w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="profile">📋 Profile</SelectItem>
        <SelectItem value="security">🔒 Security</SelectItem>
        <SelectItem value="notifications">🔔 Notifications</SelectItem>
        <SelectItem value="activity">📊 Activity</SelectItem>
        <SelectItem value="sync">🔄 Sync Logs</SelectItem>
      </SelectContent>
    </Select>
  );

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Header with Clickable Avatar */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Clickable Avatar */}
          <div 
            className="relative group cursor-pointer" 
            onClick={() => fileInputRef.current?.click()}
          >
            <Avatar className="h-16 w-16" key={avatarKey}>
              <AvatarImage 
                src={`${getAvatarUrl(currentUser.avatarUrl)}?v=${avatarKey}`} 
                alt="Profile picture"
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {getInitials(currentUser.fullName || currentUser.email || 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </div>
          <input 
            ref={fileInputRef} 
            type="file" 
            hidden 
            accept="image/*" 
            onChange={handleAvatarUpload} 
          />
          
          <div>
            <h2 className="font-bold text-[20px] mt-[0px] mb-[0px]">{currentUser.fullName || currentUser.email}</h2>
            <p className="text-muted-foreground">{currentUser.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{currentUser.role?.toUpperCase()}</Badge>
              <Badge variant="outline">Active</Badge>
            </div>
            <a 
              href="/field-app" 
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mt-2"
              data-testid="link-field-app"
            >
              <Smartphone className="h-3 w-3" />
              <span>Field App</span>
            </a>
          </div>
        </div>

        {/* Always-visible Save and Logout buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending}
            className="text-[12px] pl-[8px] pr-[8px]"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button 
            variant="destructive"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
      {/* Mobile-responsive Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="space-y-4">
          <MobileTabSelector />
          <TabsList className="hidden sm:grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="sync">Sync Logs</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold tracking-tight flex items-center gap-2 text-[18px] mt-[0px] mb-[0px]">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold tracking-tight flex items-center gap-2 text-[18px] mt-[0px] mb-[0px]">
                <Building2 className="h-5 w-5" />
                Integration Settings
              </CardTitle>
              <CardDescription>
                Configure your external system connections for proper message attribution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Splynx Admin ID</Label>
                  <Input
                    type="number"
                    value={splynxAdminId}
                    onChange={(e) => setSplynxAdminId(e.target.value)}
                    placeholder="Enter your Splynx admin ID"
                    data-testid="input-splynx-admin-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Splynx administrator ID. Messages you send from tickets will appear from this account.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="card-leave-balance">
            <CardHeader>
              <CardTitle className="font-semibold tracking-tight flex items-center gap-2 text-[18px] mt-[0px] mb-[0px]">
                <Umbrella className="h-5 w-5" />
                Leave Balance
              </CardTitle>
              <CardDescription>
                Your annual leave allowance and usage for {new Date().getFullYear()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {allowanceData?.allowance ? (
                <>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-primary" data-testid="text-total-allowance">
                        {allowanceData.allowance.totalAvailable}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Available</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-used-days">
                        {parseFloat(allowanceData.allowance.usedDays || '0')}
                      </div>
                      <div className="text-xs text-muted-foreground">Used</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-pending-days">
                        {parseFloat(allowanceData.allowance.pendingDays || '0')}
                      </div>
                      <div className="text-xs text-muted-foreground">Pending</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-remaining-days">
                        {allowanceData.allowance.remaining}
                      </div>
                      <div className="text-xs text-muted-foreground">Remaining</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Usage</span>
                      <span className="font-medium">{allowanceData.allowance.percentUsed}%</span>
                    </div>
                    <Progress value={allowanceData.allowance.percentUsed} className="h-2" />
                  </div>
                  {parseFloat(allowanceData.allowance.carriedOver || '0') > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Includes {parseFloat(allowanceData.allowance.carriedOver)} days carried over from last year
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Umbrella className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No leave allowance configured for this year.</p>
                  <p className="text-xs mt-1">Contact your administrator to set up your annual leave entitlement.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Holiday Requests Table */}
          <Card data-testid="card-holiday-requests">
            <CardHeader>
              <CardTitle className="font-semibold tracking-tight flex items-center gap-2 text-[18px] mt-[0px] mb-[0px]">
                <Calendar className="h-5 w-5" />
                My Holiday Requests
              </CardTitle>
              <CardDescription>
                View and track your holiday requests for {new Date().getFullYear()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {holidayWorkItems.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No holiday requests found.</p>
                  <p className="text-xs mt-1">Submit a holiday request from the Calendar page.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dates</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holidayWorkItems.map((item) => {
                        const metadata = item.workflowMetadata;
                        const statusMap: Record<string, string> = {
                          'Ready': 'pending',
                          'In Progress': 'pending', 
                          'Completed': 'approved',
                          'Archived': 'rejected'
                        };
                        const displayStatus = statusMap[item.status] || 'pending';
                        
                        return (
                          <TableRow 
                            key={item.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setLocation(`/strategy/work-items?panel=workItem&mode=view&id=${item.id}&tab=workflow`)}
                            data-testid={`holiday-request-row-${item.id}`}
                          >
                            <TableCell className="font-medium">
                              {metadata?.startDate ? new Date(metadata.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A'}
                              {metadata?.startDate !== metadata?.endDate && metadata?.endDate && (
                                <> - {new Date(metadata.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</>
                              )}
                            </TableCell>
                            <TableCell>{metadata?.daysCount || 0}</TableCell>
                            <TableCell className="capitalize">{metadata?.holidayType || 'Annual'}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={displayStatus === 'approved' ? 'default' : displayStatus === 'rejected' ? 'destructive' : 'secondary'}
                                className={displayStatus === 'approved' ? 'bg-green-600' : ''}
                              >
                                {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <Button 
                onClick={handleChangePassword} 
                disabled={changePasswordMutation.isPending || !currentPassword || !newPassword}
              >
                <Key className="h-4 w-4 mr-2" />
                {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Control how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Receive email notifications for important updates
                  </div>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-medium">Push Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Receive push notifications on your devices
                  </div>
                </div>
                <Switch
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-medium">Security Alerts</div>
                  <div className="text-sm text-muted-foreground">
                    Get notified about security-related activities
                  </div>
                </div>
                <Switch
                  checked={securityAlerts}
                  onCheckedChange={setSecurityAlerts}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Your recent account and system activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLogs.length > 0 ? (
                  activityLogs.map((activity: ActivityLog) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="flex-shrink-0">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {activity.description || formatActivityDescription(activity)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium text-lg mb-2">No Recent Activity</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Your account activity will appear here once you start using the platform.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Offline Synchronisation Records
                  </CardTitle>
                  <CardDescription>
                    Field app sync attempts and their status
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchSyncLogs()}
                  data-testid="button-refresh-sync-logs"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {syncLogs.length > 0 ? (
                  syncLogs.map((log: ActivityLog) => {
                    const isExpanded = expandedSyncLogs.has(log.id);
                    const metadata = log.metadata || {};
                    
                    return (
                      <div key={log.id} className="border rounded-lg">
                        {/* Compact Header - Always Visible */}
                        <div 
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleSyncLog(log.id)}
                          data-testid={`sync-log-${log.id}`}
                        >
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {getSyncStatusIcon(log.actionType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium">
                                {log.description}
                              </p>
                              {metadata.updateCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {metadata.updateCount} updates
                                </Badge>
                              )}
                              {metadata.conflictCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {metadata.conflictCount} conflicts
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString()} · {metadata.duration || 0}ms
                            </p>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-3 border-t bg-muted/20">
                            <div className="pt-3 space-y-2">
                              <h4 className="text-sm font-semibold">Sync Details</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Status:</span>{' '}
                                  <Badge variant={
                                    log.actionType === 'field_app_sync_success' ? 'default' :
                                    log.actionType === 'field_app_sync_partial' ? 'secondary' : 
                                    'destructive'
                                  }>
                                    {log.actionType.replace('field_app_sync_', '')}
                                  </Badge>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Duration:</span> {metadata.duration || 0}ms
                                </div>
                                {metadata.updateCount !== undefined && (
                                  <div>
                                    <span className="text-muted-foreground">Total Updates:</span> {metadata.updateCount}
                                  </div>
                                )}
                                {metadata.successCount !== undefined && (
                                  <div>
                                    <span className="text-muted-foreground">Successful:</span> {metadata.successCount}
                                  </div>
                                )}
                                {metadata.conflictCount !== undefined && (
                                  <div>
                                    <span className="text-muted-foreground">Conflicts:</span> {metadata.conflictCount}
                                  </div>
                                )}
                              </div>

                              {/* Updated Types Breakdown */}
                              {metadata.updatedTypes && Object.keys(metadata.updatedTypes).length > 0 && (
                                <div>
                                  <h5 className="text-xs font-semibold text-muted-foreground mb-1">Updated Types</h5>
                                  <div className="flex gap-2 flex-wrap">
                                    {Object.entries(metadata.updatedTypes).map(([type, count]) => (
                                      <Badge key={type} variant="outline" className="text-xs">
                                        {type}: {String(count)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Conflicts Details */}
                              {metadata.conflicts && metadata.conflicts.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-semibold text-muted-foreground mb-1">Conflicts</h5>
                                  <div className="space-y-1">
                                    {metadata.conflicts.map((conflict: any, idx: number) => (
                                      <div key={idx} className="text-xs bg-destructive/10 p-2 rounded">
                                        <span className="font-medium">{conflict.type}</span> #{conflict.entityId}: {conflict.error}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Error Details */}
                              {metadata.error && (
                                <div>
                                  <h5 className="text-xs font-semibold text-muted-foreground mb-1">Error</h5>
                                  <div className="space-y-1">
                                    {metadata.errorType && (
                                      <div className="text-xs text-muted-foreground">
                                        Type: <span className="font-medium">{metadata.errorType}</span>
                                      </div>
                                    )}
                                    <div className="text-xs bg-destructive/10 p-2 rounded">
                                      {metadata.error}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium text-lg mb-2">No Sync Records</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Field app synchronisation attempts will appear here once you start using the offline field app.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}