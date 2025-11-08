import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, Users, CreditCard, Database, Globe, 
  Calendar, Activity, Settings, Trash2, RefreshCw 
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface OrganizationDetailPanelProps {
  organization: any;
  onClose: () => void;
}

export function OrganizationDetailPanel({ organization, onClose }: OrganizationDetailPanelProps) {
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch organization details with users
  const { data: orgDetails, isLoading } = useQuery({
    queryKey: [`/api/organizations/${organization.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch organization details');
      return response.json();
    },
  });

  // Update organization
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/organizations/${organization.id}`, {
        method: 'PATCH',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${organization.id}`] });
      toast({
        title: 'Organization updated',
        description: 'Changes saved successfully',
      });
    },
  });

  // Delete organization
  const deleteMutation = useMutation({
    mutationFn: async (hardDelete: boolean) => {
      return apiRequest(`/api/organizations/${organization.id}?hard=${hardDelete}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({
        title: 'Organization deleted',
        description: 'Organization has been removed',
      });
      onClose();
    },
  });

  // Provision database
  const provisionDbMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/tenants/${organization.tenant?.id}/provision-db`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${organization.id}`] });
      toast({
        title: 'Database provisioned',
        description: 'Dedicated database has been created',
      });
    },
  });

  const handleDelete = () => {
    if (deleteConfirm !== organization.name) {
      toast({
        title: 'Confirmation required',
        description: 'Please type the organization name to confirm',
        variant: 'destructive',
      });
      return;
    }
    deleteMutation.mutate(false); // Soft delete by default
  };

  const details = orgDetails || { organization, stats: {} };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {organization.name}
          </SheetTitle>
          <SheetDescription>
            Organization ID: {organization.id}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
              <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Organization Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={organization.status === 'active' ? 'default' : 'secondary'}>
                      {organization.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm">
                      {new Date(organization.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Users</span>
                    <span className="text-sm font-medium">{details.stats?.userCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active Users</span>
                    <span className="text-sm font-medium">{details.stats?.activeUsers || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {organization.status === 'active' ? (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => updateMutation.mutate({ status: 'suspended' })}
                    >
                      <Activity className="mr-2 h-4 w-4" />
                      Suspend Organization
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => updateMutation.mutate({ status: 'active' })}
                    >
                      <Activity className="mr-2 h-4 w-4" />
                      Activate Organization
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => window.open(`https://${organization.tenant?.subdomain}.aimee.works`, '_blank')}
                    disabled={!organization.tenant?.subdomain}
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    Visit Organization Site
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscription" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Subscription Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {organization.subscription ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Plan</span>
                        <Badge>{details.subscription?.planId || 'Basic'}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant={organization.subscription.status === 'active' ? 'default' : 'secondary'}>
                          {organization.subscription.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Current Period</span>
                        <span className="text-sm">
                          {new Date(organization.subscription.currentPeriodStart).toLocaleDateString()} - 
                          {new Date(organization.subscription.currentPeriodEnd).toLocaleDateString()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <Alert>
                      <AlertDescription>No subscription found</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="infrastructure" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tenant Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {organization.tenant ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Subdomain</span>
                        <span className="text-sm font-mono">{organization.tenant.subdomain}.aimee.works</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Database Status</span>
                        {organization.tenant.databaseUrl ? (
                          <Badge variant="default">Provisioned</Badge>
                        ) : (
                          <Badge variant="secondary">Not Provisioned</Badge>
                        )}
                      </div>
                      {!organization.tenant.databaseUrl && (
                        <Button 
                          className="w-full"
                          onClick={() => provisionDbMutation.mutate()}
                          disabled={provisionDbMutation.isPending}
                        >
                          <Database className="mr-2 h-4 w-4" />
                          Provision Database
                        </Button>
                      )}
                    </>
                  ) : (
                    <Alert>
                      <AlertDescription>No tenant configuration found</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible actions that affect the organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="delete-confirm">
                      Type "{organization.name}" to confirm deletion
                    </Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="Enter organization name"
                    />
                  </div>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={handleDelete}
                    disabled={deleteConfirm !== organization.name || deleteMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Organization
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}