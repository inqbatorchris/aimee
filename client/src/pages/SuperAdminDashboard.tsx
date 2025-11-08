import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Edit2, Globe, Mail, Phone } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function SuperAdminDashboard() {
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch organisations
  const { data: orgsData, isLoading, error } = useQuery({
    queryKey: ['/api/organizations'],
  });

  const organisations = orgsData?.organizations || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage all organisations in the system
          </p>
        </div>
        <Button onClick={() => setShowCreatePanel(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Organisation
        </Button>
      </div>

      {/* Organisations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organisations</CardTitle>
          <CardDescription>Click on any organisation to view or edit details</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading organisations...</div>
          ) : organisations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No organisations found. Create your first organisation to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Max Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organisations.map((org: any) => (
                  <TableRow 
                    key={org.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedOrg(org)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {org.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.domain ? (
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          {org.domain}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {org.subscriptionTier || 'basic'}
                      </Badge>
                    </TableCell>
                    <TableCell>{org.maxUsers || 50}</TableCell>
                    <TableCell>
                      <Badge variant={org.isActive ? 'default' : 'secondary'}>
                        {org.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrg(org);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Organisation Sheet */}
      <CreateOrgSheet
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
      />

      {/* Edit Organisation Sheet */}
      {selectedOrg && (
        <EditOrgSheet
          organisation={selectedOrg}
          isOpen={!!selectedOrg}
          onClose={() => setSelectedOrg(null)}
        />
      )}
    </div>
  );
}

// Create Organisation Sheet Component
function CreateOrgSheet({ isOpen, onClose }: any) {
  const [formData, setFormData] = useState({
    name: '',
    adminEmail: '',
    subdomain: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/organizations', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({
        title: "Success",
        description: "Organisation created successfully",
      });
      onClose();
      setFormData({ name: '', adminEmail: '', subdomain: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create organisation",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:w-[640px]">
        <SheetHeader>
          <SheetTitle>Create New Organisation</SheetTitle>
          <SheetDescription>
            Set up a new organisation with an admin account.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Organisation Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter organisation name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adminEmail">Admin Email *</Label>
              <Input
                id="adminEmail"
                type="email"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                placeholder="admin@company.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subdomain">Subdomain (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="subdomain"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="acme"
                />
                <span className="text-sm text-muted-foreground">.aimee.works</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty for auto-generated subdomain
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Organisation'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// Edit Organisation Sheet Component
function EditOrgSheet({ organisation, isOpen, onClose }: any) {
  const [formData, setFormData] = useState({
    name: organisation?.name || '',
    domain: organisation?.domain || '',
    contactEmail: organisation?.contactEmail || '',
    contactPhone: organisation?.contactPhone || '',
    logoUrl: organisation?.logoUrl || '',
    subscriptionTier: organisation?.subscriptionTier || 'basic',
    maxUsers: organisation?.maxUsers || 50,
    isActive: organisation?.isActive ?? true,
    industry: organisation?.industry || '',
    companySize: organisation?.companySize || '',
    timeZone: organisation?.timeZone || 'UTC',
    currency: organisation?.currency || 'USD',
    billingEmail: organisation?.billingEmail || '',
    address: organisation?.address || {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    }
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/organizations/${organisation.id}`, {
        method: 'PATCH',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({
        title: "Success",
        description: "Organisation updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update organisation",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:w-[640px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Organisation</SheetTitle>
          <SheetDescription>
            Update organisation details and settings
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Basic Information</h3>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Organisation Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter organisation name"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-domain">Domain</Label>
                <Input
                  id="edit-domain"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="example.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-logo">Logo URL</Label>
                <Input
                  id="edit-logo"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="edit-active">Organisation Active</Label>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Contact Information</h3>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Contact Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="contact@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Contact Phone</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-phone"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="font-semibold">Address</h3>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-street">Street Address</Label>
                <Input
                  id="edit-street"
                  value={formData.address.street}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    address: { ...formData.address, street: e.target.value }
                  })}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-city">City</Label>
                  <Input
                    id="edit-city"
                    value={formData.address.city}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, city: e.target.value }
                    })}
                    placeholder="San Francisco"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-state">State</Label>
                  <Input
                    id="edit-state"
                    value={formData.address.state}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, state: e.target.value }
                    })}
                    placeholder="CA"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-zip">ZIP Code</Label>
                  <Input
                    id="edit-zip"
                    value={formData.address.zipCode}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, zipCode: e.target.value }
                    })}
                    placeholder="94107"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-country">Country</Label>
                  <Input
                    id="edit-country"
                    value={formData.address.country}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, country: e.target.value }
                    })}
                    placeholder="USA"
                  />
                </div>
              </div>
            </div>

            {/* Company Details */}
            <div className="space-y-4">
              <h3 className="font-semibold">Company Details</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-industry">Industry</Label>
                  <Input
                    id="edit-industry"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="Technology"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-size">Company Size</Label>
                  <select
                    id="edit-size"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.companySize}
                    onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-timezone">Time Zone</Label>
                  <select
                    id="edit-timezone"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.timeZone}
                    onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                    <option value="Australia/Sydney">Sydney</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-currency">Currency</Label>
                  <select
                    id="edit-currency"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="CAD">CAD ($)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Subscription Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold">Subscription Settings</h3>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-tier">Subscription Tier</Label>
                <select
                  id="edit-tier"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.subscriptionTier}
                  onChange={(e) => setFormData({ ...formData, subscriptionTier: e.target.value })}
                >
                  <option value="basic">Basic</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-maxusers">Max Users</Label>
                  <Input
                    id="edit-maxusers"
                    type="number"
                    value={formData.maxUsers}
                    onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 50 })}
                    min="1"
                    max="10000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-billing">Billing Email</Label>
                  <Input
                    id="edit-billing"
                    type="email"
                    value={formData.billingEmail}
                    onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                    placeholder="billing@example.com"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}