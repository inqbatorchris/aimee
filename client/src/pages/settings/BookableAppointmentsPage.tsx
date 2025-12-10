import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Calendar,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Clock,
  Car,
  Loader2,
  Link,
  ExternalLink,
  Phone,
  Wrench
} from 'lucide-react';

interface BookableTaskType {
  id: number;
  organizationId: number;
  name: string;
  slug: string;
  description: string | null;
  taskCategory: string;
  teamId: number | null;
  team?: { id: number; name: string } | null;
  accessMode: 'open' | 'authenticated';
  requireCustomerAccount: boolean;
  splynxProjectId: number | null;
  splynxWorkflowStatusId: number | null;
  splynxTaskTypeId: number | null;
  defaultDuration: string;
  defaultTravelTimeTo: number;
  defaultTravelTimeFrom: number;
  bufferTimeMinutes: number;
  triggerConditions: Record<string, any>;
  buttonLabel: string;
  buttonColor: string;
  confirmationMessage: string;
  postBookingRedirectUrl?: string | null;
  backToAppUrl?: string | null;
  isActive: boolean;
  displayOrder: number;
  bookingUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Team {
  id: number;
  name: string;
}

const accessModeLabels: Record<string, { label: string; description: string }> = {
  open: { label: 'Open', description: 'Anyone with the link can book' },
  authenticated: { label: 'Login Required', description: 'Customers must log in to book' },
};


export default function BookableAppointmentsPage() {
  const [selectedType, setSelectedType] = useState<BookableTaskType | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: types, isLoading } = useQuery<BookableTaskType[]>({
    queryKey: ['/api/bookings/bookable-task-types'],
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<BookableTaskType>) => {
      const response = await apiRequest('/api/bookings/bookable-task-types', {
        method: 'POST',
        body: data,
      });
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/bookings/bookable-task-types'] });
      toast({ title: 'Success', description: 'Appointment type created successfully' });
      setIsSheetOpen(false);
      setSelectedType(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<BookableTaskType> }) => {
      const response = await apiRequest(`/api/bookings/bookable-task-types/${id}`, {
        method: 'PATCH',
        body: updates,
      });
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/bookings/bookable-task-types'] });
      toast({ title: 'Success', description: 'Appointment type updated successfully' });
      setIsSheetOpen(false);
      setSelectedType(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/bookings/bookable-task-types/${id}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/bookings/bookable-task-types'] });
      toast({ title: 'Success', description: 'Appointment type deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleCreate = () => {
    setSelectedType(null);
    setIsCreating(true);
    setIsSheetOpen(true);
  };

  const handleEdit = (type: BookableTaskType) => {
    setSelectedType(type);
    setIsCreating(false);
    setIsSheetOpen(true);
  };

  const handleDelete = (type: BookableTaskType) => {
    if (confirm(`Are you sure you want to delete "${type.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(type.id);
    }
  };

  const handleToggleActive = (type: BookableTaskType) => {
    updateMutation.mutate({
      id: type.id,
      updates: { isActive: !type.isActive },
    });
  };

  const copyBookingUrl = (type: BookableTaskType) => {
    if (type.bookingUrl) {
      navigator.clipboard.writeText(type.bookingUrl);
      toast({
        title: 'Booking URL Copied',
        description: 'The booking link has been copied to your clipboard.',
      });
    } else {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/book/${type.slug}`;
      navigator.clipboard.writeText(url);
      toast({
        title: 'Booking URL Copied',
        description: 'The booking link has been copied to your clipboard.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-bookable-appointments">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto" data-testid="bookable-appointments-page">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Bookable Appointments</h1>
          <p className="text-muted-foreground mt-1">
            Configure appointment types that customers can book through secure links.
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-type">
          <Plus className="h-4 w-4 mr-2" />
          Add Appointment Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Types</CardTitle>
          <CardDescription>
            Each type generates a unique booking URL when linked to a support ticket. Customers use these URLs to schedule appointments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(!types || types.length === 0) ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No appointment types configured</p>
              <p className="text-sm">Create your first appointment type to get started.</p>
              <Button onClick={handleCreate} className="mt-4" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Appointment Type
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Access Mode</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Booking URL</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => {
                  const teamName = type.team?.name || teams?.find(t => t.id === type.teamId)?.name;
                  
                  return (
                    <TableRow key={type.id} data-testid={`row-appointment-type-${type.id}`}>
                      <TableCell>
                        <div className="font-medium">{type.name}</div>
                        {type.description && (
                          <div className="text-sm text-muted-foreground">{type.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {teamName ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            {teamName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">No team</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.accessMode === 'open' ? 'outline' : 'default'}>
                          {accessModeLabels[type.accessMode]?.label || type.accessMode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {type.defaultDuration}
                        </div>
                        {(type.defaultTravelTimeTo > 0 || type.defaultTravelTimeFrom > 0) && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Car className="h-3 w-3" />
                            +{type.defaultTravelTimeTo}m / -{type.defaultTravelTimeFrom}m
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={type.isActive}
                            onCheckedChange={() => handleToggleActive(type)}
                            data-testid={`switch-active-${type.id}`}
                          />
                          <span className={type.isActive ? 'text-green-600' : 'text-muted-foreground'}>
                            {type.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate" title={`/book/${type.slug}`}>
                            /book/{type.slug}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyBookingUrl(type)}
                            data-testid={`button-copy-url-${type.id}`}
                            title="Copy booking URL"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(`/book/${type.slug}`, '_blank')}
                            data-testid={`button-open-url-${type.id}`}
                            title="Open booking page"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${type.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(type)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(type)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">How Booking Links Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="border rounded-lg p-4">
              <div className="font-medium mb-2 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                Share the Link
              </div>
              <p className="text-muted-foreground">
                Copy the booking URL and share it anywhere - emails, SMS, support tickets, or your website. No token generation needed.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="font-medium mb-2 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                Customer Books
              </div>
              <p className="text-muted-foreground">
                Customer clicks the link, fills in their details, selects an available time slot, and confirms their booking.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="font-medium mb-2 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                Task Created
              </div>
              <p className="text-muted-foreground">
                A scheduled task is automatically created in Splynx with all customer details and the selected appointment time.
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Access Modes</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><strong>Open:</strong> Anyone with the link can book - great for sales inquiries or new customers</li>
              <li><strong>Login Required:</strong> Customers must log in before booking - good for existing customer service calls</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <AppointmentTypeSheet
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          setSelectedType(null);
        }}
        type={selectedType}
        isCreating={isCreating}
        onSave={(data) => {
          if (isCreating) {
            createMutation.mutate(data);
          } else if (selectedType) {
            updateMutation.mutate({ id: selectedType.id, updates: data });
          }
        }}
        isSaving={createMutation.isPending || updateMutation.isPending}
        teams={teams || []}
      />
    </div>
  );
}

interface SplynxAdmin {
  id: number;
  splynxAdminId?: number;
  fullName?: string;
  name?: string;
  login?: string;
  email?: string | null;
}

interface SplynxTeam {
  id: number;
  title: string;
}

interface CalendarFiltersResponse {
  success: boolean;
  filters: {
    splynxTeams: Array<{ id: number; splynxTeamId: number; name: string; title?: string }>;
    splynxAdmins: SplynxAdmin[];
  };
}

interface ExtendedBookableTaskType extends Partial<BookableTaskType> {
  teamId?: number | null;
  defaultAssigneeTeamId?: number | null;
  defaultAssigneeUserId?: number | null;
  fallbackAssigneeUserId?: number | null;
  postBookingRedirectUrl?: string | null;
}

interface AssigneeSelectorProps {
  formData: ExtendedBookableTaskType;
  setFormData: (data: ExtendedBookableTaskType) => void;
}

function AssigneeSelector({ formData, setFormData }: AssigneeSelectorProps) {
  const { data: filtersData, isLoading: isLoadingFilters } = useQuery<CalendarFiltersResponse>({
    queryKey: ['/api/calendar/filters'],
  });

  const admins = filtersData?.filters?.splynxAdmins || [];
  const teams = filtersData?.filters?.splynxTeams || [];
  const isLoadingAdmins = isLoadingFilters;
  const isLoadingTeams = isLoadingFilters;

  return (
    <div className="border-t pt-4">
      <h4 className="font-medium mb-3">Task Assignment</h4>
      <p className="text-sm text-muted-foreground mb-3">
        Configure who gets assigned when a booking is made through this appointment type.
      </p>
      <div className="space-y-4">
        <div>
          <Label htmlFor="defaultAssigneeTeamId">Default Team</Label>
          <Select
            value={formData.defaultAssigneeTeamId?.toString() || 'none'}
            onValueChange={(val) => setFormData({ ...formData, defaultAssigneeTeamId: val === 'none' ? null : parseInt(val) })}
          >
            <SelectTrigger data-testid="select-default-team">
              <SelectValue placeholder={isLoadingTeams ? 'Loading...' : 'Select team (optional)'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No default team</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id.toString()}>
                  {team.name || team.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Splynx team that will be assigned to tasks created from this booking type.
          </p>
        </div>

        <div>
          <Label htmlFor="defaultAssigneeUserId">Default Assignee</Label>
          <Select
            value={formData.defaultAssigneeUserId?.toString() || 'none'}
            onValueChange={(val) => setFormData({ ...formData, defaultAssigneeUserId: val === 'none' ? null : parseInt(val) })}
          >
            <SelectTrigger data-testid="select-default-assignee">
              <SelectValue placeholder={isLoadingAdmins ? 'Loading...' : 'Select team member (optional)'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No default assignee</SelectItem>
              {admins.map((admin) => (
                <SelectItem key={admin.id} value={admin.id.toString()}>
                  {admin.fullName || admin.name || `Admin ${admin.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Team member who will be assigned to tasks created from this booking type.
          </p>
        </div>
        
        <div>
          <Label htmlFor="fallbackAssigneeUserId">Fallback Assignee</Label>
          <Select
            value={formData.fallbackAssigneeUserId?.toString() || 'none'}
            onValueChange={(val) => setFormData({ ...formData, fallbackAssigneeUserId: val === 'none' ? null : parseInt(val) })}
          >
            <SelectTrigger data-testid="select-fallback-assignee">
              <SelectValue placeholder={isLoadingAdmins ? 'Loading...' : 'Select fallback team member'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No fallback assignee</SelectItem>
              {admins.map((admin) => (
                <SelectItem key={admin.id} value={admin.id.toString()}>
                  {admin.fullName || admin.name || `Admin ${admin.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Used when the customer cannot be matched in Splynx (e.g., for lead creation).
          </p>
        </div>
      </div>
    </div>
  );
}

interface AppointmentTypeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  type: BookableTaskType | null;
  isCreating: boolean;
  onSave: (data: Partial<BookableTaskType>) => void;
  isSaving: boolean;
  teams: Team[];
}

interface WorkflowStatus {
  id: number;
  name: string;
  color?: string;
}

function AppointmentTypeSheet({ isOpen, onClose, type, isCreating, onSave, isSaving, teams }: AppointmentTypeSheetProps) {
  const [formData, setFormData] = useState<ExtendedBookableTaskType>({
    name: '',
    description: '',
    teamId: null,
    accessMode: 'open',
    requireCustomerAccount: false,
    defaultDuration: '2h 30m',
    defaultTravelTimeTo: 15,
    defaultTravelTimeFrom: 15,
    bufferTimeMinutes: 30,
    buttonLabel: 'Book Appointment',
    buttonColor: 'primary',
    confirmationMessage: 'Your appointment has been scheduled.',
    postBookingRedirectUrl: '',
    isActive: true,
    displayOrder: 1,
    splynxProjectId: 1,
    splynxWorkflowStatusId: 1,
    defaultAssigneeTeamId: null,
    defaultAssigneeUserId: null,
    fallbackAssigneeUserId: null,
  });

  useEffect(() => {
    if (type) {
      setFormData({
        ...type,
        teamId: type.teamId ?? null,
        defaultAssigneeTeamId: (type as any).defaultAssigneeTeamId ?? null,
        defaultAssigneeUserId: (type as any).defaultAssigneeUserId ?? null,
        fallbackAssigneeUserId: (type as any).fallbackAssigneeUserId ?? null,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        teamId: null,
        accessMode: 'open',
        requireCustomerAccount: false,
        defaultDuration: '2h 30m',
        defaultTravelTimeTo: 15,
        defaultTravelTimeFrom: 15,
        bufferTimeMinutes: 30,
        buttonLabel: 'Book Appointment',
        buttonColor: 'primary',
        confirmationMessage: 'Your appointment has been scheduled.',
        postBookingRedirectUrl: '',
        isActive: true,
        displayOrder: 1,
        splynxProjectId: 1,
        splynxWorkflowStatusId: 1,
        defaultAssigneeTeamId: null,
        defaultAssigneeUserId: null,
        fallbackAssigneeUserId: null,
      });
    }
  }, [type]);

  // Fetch Splynx scheduling projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery<{ projects: Array<{ id: number; title: string }> }>({
    queryKey: ['/api/integrations/splynx/scheduling-projects'],
    queryFn: async () => {
      const response = await fetch('/api/integrations/splynx/scheduling-projects', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
  });

  // Fetch workflow statuses when project ID changes
  const { data: workflowStatuses, isLoading: statusesLoading } = useQuery<{ statuses: WorkflowStatus[] }>({
    queryKey: ['/api/integrations/splynx/project', formData.splynxProjectId, 'workflow-statuses'],
    queryFn: async () => {
      if (!formData.splynxProjectId) return { statuses: [] };
      const response = await fetch(`/api/integrations/splynx/project/${formData.splynxProjectId}/workflow-statuses`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch workflow statuses');
      return response.json();
    },
    enabled: !!formData.splynxProjectId && formData.splynxProjectId > 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:w-[640px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isCreating ? 'Create Appointment Type' : 'Edit Appointment Type'}</SheetTitle>
          <SheetDescription>
            {isCreating
              ? 'Configure a new type of appointment customers can book.'
              : 'Update the settings for this appointment type.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Field Engineering Visit"
                required
                data-testid="input-name"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this appointment type"
                data-testid="input-description"
              />
            </div>

            <div>
              <Label htmlFor="teamId">Team</Label>
              <Select
                value={formData.teamId?.toString() || 'none'}
                onValueChange={(value) => setFormData({ ...formData, teamId: value === 'none' ? null : parseInt(value) })}
              >
                <SelectTrigger data-testid="select-team">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team assigned</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                The team responsible for handling these appointments.
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Access Control</h4>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="accessMode">Who can book?</Label>
                  <Select
                    value={formData.accessMode}
                    onValueChange={(value: 'open' | 'authenticated') => setFormData({ ...formData, accessMode: value })}
                  >
                    <SelectTrigger data-testid="select-access-mode">
                      <SelectValue placeholder="Select access mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open - Anyone with the link can book</SelectItem>
                      <SelectItem value="authenticated">Login Required - Customers must log in first</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.accessMode === 'open' 
                      ? 'Great for sales inquiries or new customers who don\'t have an account yet.'
                      : 'Best for existing customers who need to schedule service calls.'}
                  </p>
                </div>
                {formData.accessMode === 'authenticated' && (
                  <div className="flex items-center gap-3">
                    <Switch
                      id="requireCustomerAccount"
                      checked={formData.requireCustomerAccount}
                      onCheckedChange={(checked) => setFormData({ ...formData, requireCustomerAccount: checked })}
                      data-testid="switch-require-customer"
                    />
                    <div>
                      <Label htmlFor="requireCustomerAccount">Require linked customer account</Label>
                      <p className="text-xs text-muted-foreground">
                        If enabled, only users with a linked Splynx customer ID can book.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="defaultDuration">Duration *</Label>
                <Input
                  id="defaultDuration"
                  value={formData.defaultDuration || ''}
                  onChange={(e) => setFormData({ ...formData, defaultDuration: e.target.value })}
                  placeholder="e.g., 2h 30m"
                  required
                  data-testid="input-duration"
                />
              </div>
              <div>
                <Label htmlFor="bufferTimeMinutes">Buffer Time (minutes)</Label>
                <Input
                  id="bufferTimeMinutes"
                  type="number"
                  value={formData.bufferTimeMinutes || 0}
                  onChange={(e) => setFormData({ ...formData, bufferTimeMinutes: parseInt(e.target.value) || 0 })}
                  data-testid="input-buffer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="defaultTravelTimeTo">Travel Time To (minutes)</Label>
                <Input
                  id="defaultTravelTimeTo"
                  type="number"
                  value={formData.defaultTravelTimeTo || 0}
                  onChange={(e) => setFormData({ ...formData, defaultTravelTimeTo: parseInt(e.target.value) || 0 })}
                  data-testid="input-travel-to"
                />
              </div>
              <div>
                <Label htmlFor="defaultTravelTimeFrom">Travel Time From (minutes)</Label>
                <Input
                  id="defaultTravelTimeFrom"
                  type="number"
                  value={formData.defaultTravelTimeFrom || 0}
                  onChange={(e) => setFormData({ ...formData, defaultTravelTimeFrom: parseInt(e.target.value) || 0 })}
                  data-testid="input-travel-from"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Splynx Integration</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="splynxProjectId">Splynx Project</Label>
                  {projectsLoading ? (
                    <div className="flex items-center gap-2 h-10 px-3 text-sm text-muted-foreground border rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading projects...
                    </div>
                  ) : projectsData?.projects && projectsData.projects.length > 0 ? (
                    <Select
                      value={formData.splynxProjectId?.toString() || ''}
                      onValueChange={(value) => setFormData({ ...formData, splynxProjectId: parseInt(value) || null })}
                    >
                      <SelectTrigger data-testid="select-splynx-project">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectsData.projects.map((project) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="splynxProjectId"
                      type="number"
                      value={formData.splynxProjectId || ''}
                      onChange={(e) => setFormData({ ...formData, splynxProjectId: parseInt(e.target.value) || null })}
                      placeholder="Enter project ID"
                      data-testid="input-splynx-project"
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="splynxWorkflowStatusId">Workflow Status</Label>
                  {statusesLoading ? (
                    <div className="flex items-center gap-2 h-10 px-3 text-sm text-muted-foreground border rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading statuses...
                    </div>
                  ) : workflowStatuses?.statuses && workflowStatuses.statuses.length > 0 ? (
                    <Select
                      value={formData.splynxWorkflowStatusId?.toString() || ''}
                      onValueChange={(value) => setFormData({ ...formData, splynxWorkflowStatusId: parseInt(value) || null })}
                    >
                      <SelectTrigger data-testid="select-splynx-workflow">
                        <SelectValue placeholder="Select a workflow status" />
                      </SelectTrigger>
                      <SelectContent>
                        {workflowStatuses.statuses.map((status) => (
                          <SelectItem key={status.id} value={status.id.toString()}>
                            {status.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="splynxWorkflowStatusId"
                      type="number"
                      value={formData.splynxWorkflowStatusId || ''}
                      onChange={(e) => setFormData({ ...formData, splynxWorkflowStatusId: parseInt(e.target.value) || null })}
                      placeholder="Select project first"
                      data-testid="input-splynx-workflow"
                    />
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {workflowStatuses?.statuses?.length ? 'Initial status for new bookings' : 'Select a project to load statuses'}
                  </p>
                </div>
              </div>
            </div>

            <AssigneeSelector 
              formData={formData}
              setFormData={setFormData}
            />

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Customer Facing</h4>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="buttonLabel">Button Label</Label>
                  <Input
                    id="buttonLabel"
                    value={formData.buttonLabel || ''}
                    onChange={(e) => setFormData({ ...formData, buttonLabel: e.target.value })}
                    placeholder="e.g., Book Engineer Visit"
                    data-testid="input-button-label"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmationMessage">Confirmation Message</Label>
                  <Textarea
                    id="confirmationMessage"
                    value={formData.confirmationMessage || ''}
                    onChange={(e) => setFormData({ ...formData, confirmationMessage: e.target.value })}
                    placeholder="Message shown after booking is confirmed"
                    data-testid="input-confirmation"
                  />
                </div>
                <div>
                  <Label htmlFor="postBookingRedirectUrl">Post-Booking Redirect URL</Label>
                  <Input
                    id="postBookingRedirectUrl"
                    type="url"
                    value={formData.postBookingRedirectUrl || ''}
                    onChange={(e) => setFormData({ ...formData, postBookingRedirectUrl: e.target.value })}
                    placeholder="https://example.com/thank-you (optional)"
                    data-testid="input-redirect-url"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional URL to redirect customers after successful booking. Leave empty to show the confirmation message instead.
                  </p>
                </div>
                <div>
                  <Label htmlFor="backToAppUrl">"Back to Application" Button URL</Label>
                  <Input
                    id="backToAppUrl"
                    type="url"
                    value={(formData as any).backToAppUrl || ''}
                    onChange={(e) => setFormData({ ...formData, backToAppUrl: e.target.value } as any)}
                    placeholder="https://example.com/portal (optional)"
                    data-testid="input-back-url"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL for the "Back to Application" button on the booking page. Leave empty to redirect to the main app.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t pt-4">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-is-active"
              />
              <Label htmlFor="isActive">Active (available for booking)</Label>
            </div>
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} data-testid="button-save">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isCreating ? 'Create' : 'Save Changes'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
