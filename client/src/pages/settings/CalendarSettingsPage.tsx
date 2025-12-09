import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Settings, 
  Users, 
  User, 
  Umbrella, 
  Save,
  Loader2,
  ArrowLeft,
  CalendarPlus
} from 'lucide-react';
import { useLocation } from 'wouter';
import BookableAppointmentsPage from './BookableAppointmentsPage';

interface TeamMember {
  id: number;
  fullName: string;
  email: string;
}

interface Team {
  id: number;
  name: string;
}

export default function CalendarSettingsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [approverType, setApproverType] = useState<'user' | 'team' | 'none'>('none');
  const [approverId, setApproverId] = useState<number | null>(null);

  const { data: usersResponse } = useQuery<TeamMember[] | { users: TeamMember[] }>({
    queryKey: ['/api/core/users'],
  });
  const teamMembers = Array.isArray(usersResponse) ? usersResponse : (usersResponse?.users || []);

  const { data: teamsData } = useQuery<Team[]>({
    queryKey: ['/api/core/teams'],
  });
  const teams = teamsData || [];

  const { data: holidayApproverData, isLoading: isLoadingApprover } = useQuery<{
    holidayApprover: { type: 'user' | 'team' | null; id: number | null };
  }>({
    queryKey: ['/api/calendar/settings/holiday-approver'],
  });

  useEffect(() => {
    if (holidayApproverData?.holidayApprover) {
      const { type, id } = holidayApproverData.holidayApprover;
      setApproverType(type || 'none');
      setApproverId(id);
    }
  }, [holidayApproverData]);

  const saveApproverMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/calendar/settings/holiday-approver', {
        method: 'POST',
        body: { 
          type: approverType === 'none' ? null : approverType, 
          id: approverType === 'none' ? null : approverId 
        },
      });
    },
    onSuccess: () => {
      toast({ title: 'Holiday approver settings saved' });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/settings/holiday-approver'] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to save settings', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/calendar')}
          data-testid="button-back-to-calendar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Calendar Settings
          </h1>
          <p className="text-muted-foreground">Configure calendar behavior, holiday approvals, and bookable appointments</p>
        </div>
      </div>

      <Tabs defaultValue="holidays" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="holidays" className="flex items-center gap-2" data-testid="tab-holidays">
            <Umbrella className="h-4 w-4" />
            Holiday Settings
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center gap-2" data-testid="tab-appointments">
            <CalendarPlus className="h-4 w-4" />
            Appointments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="holidays">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Umbrella className="h-5 w-5" />
            Holiday Request Approval
          </CardTitle>
          <CardDescription>
            Configure who should be assigned to approve holiday requests by default. 
            When a team member submits a holiday request, it will be automatically assigned to this approver.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingApprover ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading settings...
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Approval Assignment Type</Label>
                <Select 
                  value={approverType} 
                  onValueChange={(v) => {
                    setApproverType(v as 'user' | 'team' | 'none');
                    setApproverId(null);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[300px]" data-testid="select-approver-type">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No default approver</SelectItem>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Specific User
                      </div>
                    </SelectItem>
                    <SelectItem value="team">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Team
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {approverType === 'none' && 'Holiday requests will not be automatically assigned to an approver.'}
                  {approverType === 'user' && 'Holiday requests will be assigned to a specific user for approval.'}
                  {approverType === 'team' && 'Holiday requests will be assigned to a team for approval.'}
                </p>
              </div>

              {approverType === 'user' && (
                <div className="space-y-2">
                  <Label>Select Approver</Label>
                  <Select 
                    value={approverId?.toString() || ''} 
                    onValueChange={(v) => setApproverId(parseInt(v))}
                  >
                    <SelectTrigger className="w-full sm:w-[300px]" data-testid="select-approver-user">
                      <SelectValue placeholder="Select user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.fullName || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {approverType === 'team' && (
                <div className="space-y-2">
                  <Label>Select Team</Label>
                  <Select 
                    value={approverId?.toString() || ''} 
                    onValueChange={(v) => setApproverId(parseInt(v))}
                  >
                    <SelectTrigger className="w-full sm:w-[300px]" data-testid="select-approver-team">
                      <SelectValue placeholder="Select team..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button 
                onClick={() => saveApproverMutation.mutate()}
                disabled={saveApproverMutation.isPending || (approverType !== 'none' && !approverId)}
                data-testid="button-save-approver-settings"
              >
                {saveApproverMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <BookableAppointmentsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
