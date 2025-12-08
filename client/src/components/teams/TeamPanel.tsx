import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Clock, Globe, Trash2, Link2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TeamPanelProps {
  team: {
    id: number;
    name: string;
    cadence: string;
    timezone?: string;
    meetingTime?: string;
    weeklyWeekday?: string;
    monthlyRuleType?: string;
    monthlyNth?: string;
    monthlyWeekday?: string;
    monthlyDayOfMonth?: number;
    periodNth?: string;
    periodWeekday?: string;
    defaultMeetingLengthMinutes?: string;
    organizationId: number;
    organizationName?: string;
    splynxTeamId?: number | null;
  } | null;
  open: boolean;
  onClose: () => void;
  onManageMembers?: () => void;
  isAdmin: boolean;
}

interface SplynxTeam {
  id: number;
  splynxTeamId: number;
  title: string;
  color?: string;
}

// Helper function to calculate next meeting dates
function calculateNextMeetings(formData: any, count: number = 8): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  let currentDate = new Date(now);
  currentDate.setHours(0, 0, 0, 0);
  
  const cadence = formData.cadence || 'weekly';
  const meetingTime = formData.meetingTime || '10:00';
  const [hours, minutes] = meetingTime.split(':').map(Number);
  
  while (dates.length < count) {
    let nextMeeting: Date | null = null;
    
    switch (cadence) {
      case 'daily':
        nextMeeting = new Date(currentDate);
        nextMeeting.setHours(hours, minutes, 0, 0);
        currentDate.setDate(currentDate.getDate() + 1);
        break;
        
      case 'weekly':
        const targetWeekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(formData.weeklyWeekday || 'mon');
        while (currentDate.getDay() !== targetWeekday) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
        nextMeeting = new Date(currentDate);
        nextMeeting.setHours(hours, minutes, 0, 0);
        currentDate.setDate(currentDate.getDate() + 7);
        break;
        
      case 'bi_weekly':
        const biWeeklyDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(formData.weeklyWeekday || 'mon');
        while (currentDate.getDay() !== biWeeklyDay) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
        nextMeeting = new Date(currentDate);
        nextMeeting.setHours(hours, minutes, 0, 0);
        currentDate.setDate(currentDate.getDate() + 14);
        break;
        
      case 'monthly':
        if (formData.monthlyRuleType === 'day_of_month') {
          const dayOfMonth = formData.monthlyDayOfMonth || 1;
          const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          const actualDay = Math.min(dayOfMonth, lastDay);
          nextMeeting = new Date(currentDate.getFullYear(), currentDate.getMonth(), actualDay);
          nextMeeting.setHours(hours, minutes, 0, 0);
        } else {
          // nth_weekday logic simplified for preview
          nextMeeting = new Date(currentDate);
          nextMeeting.setHours(hours, minutes, 0, 0);
        }
        currentDate.setMonth(currentDate.getMonth() + 1);
        currentDate.setDate(1);
        break;
        
      default:
        // For quarterly, half_yearly, annual - simplified preview
        nextMeeting = new Date(currentDate);
        nextMeeting.setHours(hours, minutes, 0, 0);
        currentDate.setMonth(currentDate.getMonth() + 3); // Default to quarterly spacing
        break;
    }
    
    if (nextMeeting && nextMeeting >= now) {
      dates.push(nextMeeting);
    }
  }
  
  return dates;
}

export function TeamPanel({ team, open, onClose, onManageMembers, isAdmin }: TeamPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    cadence: "weekly",
    timezone: "UTC",
    meetingTime: "10:00",
    weeklyWeekday: "mon",
    monthlyRuleType: "nth_weekday",
    monthlyNth: "1",
    monthlyWeekday: "mon",
    monthlyDayOfMonth: 1,
    periodRuleType: "nth_weekday",
    periodNth: "1",
    periodWeekday: "mon",
    defaultMeetingLengthMinutes: "15",
    splynxTeamId: null as number | null,
  });
  
  // Fetch organizations for super admins
  const { data: organizations = [] } = useQuery<{ id: number; name: string; isActive?: boolean }[]>({
    queryKey: ['/api/core/organizations/list'],
    enabled: open && currentUser?.role === 'super_admin',
  });
  
  // Fetch Splynx teams for team mapping (live from Splynx API)
  const { data: splynxTeamsResponse, isLoading: isLoadingSplynxTeams } = useQuery<{ success: boolean; teams: Array<{ id: number; title: string }> }>({
    queryKey: ['/api/calendar/splynx/teams'],
    enabled: open,
  });
  
  const splynxTeams = splynxTeamsResponse?.teams || [];
  
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        cadence: team.cadence,
        timezone: team.timezone || "UTC",
        meetingTime: (team.meetingTime || "10:00").substring(0, 5),
        weeklyWeekday: team.weeklyWeekday || "mon",
        monthlyRuleType: team.monthlyRuleType || "nth_weekday",
        monthlyNth: team.monthlyNth || "1",
        monthlyWeekday: team.monthlyWeekday || "mon",
        monthlyDayOfMonth: team.monthlyDayOfMonth || 1,
        periodRuleType: "nth_weekday",
        periodNth: team.periodNth || "1",
        periodWeekday: team.periodWeekday || "mon",
        defaultMeetingLengthMinutes: team.defaultMeetingLengthMinutes || "15",
        splynxTeamId: team.splynxTeamId || null,
      });
      setSelectedOrganizationId(team.organizationId);
    } else {
      setFormData({
        name: "",
        cadence: "weekly",
        timezone: "UTC",
        meetingTime: "10:00",
        weeklyWeekday: "mon",
        monthlyRuleType: "nth_weekday",
        monthlyNth: "1",
        monthlyWeekday: "mon",
        monthlyDayOfMonth: 1,
        periodRuleType: "nth_weekday",
        periodNth: "1",
        periodWeekday: "mon",
        defaultMeetingLengthMinutes: "15",
        splynxTeamId: null,
      });
      // Initialize organization for new teams
      setSelectedOrganizationId(currentUser?.organizationId || null);
    }
  }, [team, currentUser]);
  
  // Calculate next meetings for preview
  const nextMeetings = useMemo(() => {
    return calculateNextMeetings(formData, 8);
  }, [formData]);
  
  // Create team mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Strip seconds from time format (09:00:00 -> 09:00) 
      // PostgreSQL returns HH:MM:SS but backend expects HH:MM
      const meetingTime = (data.meetingTime || '10:00').substring(0, 5);
      return apiRequest('/api/core/teams', {
        method: 'POST',
        body: {
          ...data,
          meetingTime,
          organizationId: selectedOrganizationId || currentUser?.organizationId,
        },
      });
    },
    onSuccess: () => {
      // Invalidate all teams queries to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: ['/api/core/teams'],
        exact: false 
      });
      toast({ title: "Team created successfully" });
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error || "Failed to create team";
      toast({ 
        title: "Cannot create team", 
        description: errorMessage,
        variant: "destructive" 
      });
    },
  });
  
  // Update team mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Strip seconds from time format (09:00:00 -> 09:00)
      // PostgreSQL returns HH:MM:SS but backend expects HH:MM
      const meetingTime = (data.meetingTime || '10:00').substring(0, 5);
      return apiRequest(`/api/core/teams/${team?.id}`, {
        method: 'PATCH',
        body: {
          ...data,
          meetingTime,
        },
      });
    },
    onSuccess: () => {
      // Invalidate all teams queries to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: ['/api/core/teams'],
        exact: false 
      });
      toast({ title: "Team updated successfully" });
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error || "Failed to update team";
      toast({ 
        title: "Cannot update team", 
        description: errorMessage,
        variant: "destructive" 
      });
    },
  });
  
  // Delete team mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/core/teams/${team?.id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Invalidate all teams queries to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: ['/api/core/teams'],
        exact: false 
      });
      toast({ title: "Team deleted successfully" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to delete team", variant: "destructive" });
    },
  });
  
  // Update team organization (super admin only)
  const updateOrganizationMutation = useMutation({
    mutationFn: async (newOrgId: number) => {
      return apiRequest(`/api/core/teams/${team?.id}/organization`, {
        method: 'PATCH',
        body: { organizationId: newOrgId },
      });
    },
    onSuccess: () => {
      // Invalidate all teams queries to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: ['/api/core/teams'],
        exact: false 
      });
      toast({ title: "Organisation updated successfully" });
      // Update the local state
      if (team) {
        team.organizationId = selectedOrganizationId!;
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error || "Failed to update organisation";
      toast({ 
        title: "Cannot change organisation", 
        description: errorMessage,
        variant: "destructive" 
      });
      // Reset the selection
      if (team) {
        setSelectedOrganizationId(team.organizationId);
      }
    },
  });
  
  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({ title: "Team name is required", variant: "destructive" });
      return;
    }
    
    // Map form fields to meeting anchor fields
    const dataToSave = {
      ...formData,
      // Convert weeklyWeekday to meeting_anchor_dow (mon=1, tue=2, etc)
      meeting_anchor_dow: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(formData.weeklyWeekday),
      // For monthly cadence, set the appropriate anchor fields
      meeting_anchor_week_of_month: formData.monthlyRuleType === 'nth_weekday' ? parseInt(formData.monthlyNth) : undefined,
      meeting_anchor_day_of_month: formData.monthlyRuleType === 'day_of_month' ? formData.monthlyDayOfMonth : undefined,
    };
    
    if (team) {
      updateMutation.mutate(dataToSave);
    } else {
      createMutation.mutate(dataToSave);
    }
  };
  
  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  
  return (
    <>
      <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="sm:w-[640px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{team ? 'Edit Team' : 'Create Team'}</SheetTitle>
            <SheetDescription>
              {team ? 'Update team information and meeting cadence' : 'Create a new team for your organization'}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter team name"
                disabled={!isAdmin}
              />
            </div>
            
            {/* Organization Field */}
            {currentUser?.role === 'super_admin' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Organisation
                </Label>
                {organizations.length > 0 ? (
                  <Select
                    value={selectedOrganizationId?.toString() || ""}
                    onValueChange={(value) => {
                      const newOrgId = parseInt(value);
                      setSelectedOrganizationId(newOrgId);
                      if (team) {
                        updateOrganizationMutation.mutate(newOrgId);
                      }
                    }}
                    disabled={updateOrganizationMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organisation" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm p-2 border rounded">
                    Loading organisations...
                  </div>
                )}
              </div>
            )}
            
            {/* Splynx Team Mapping */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Splynx Team Mapping
              </Label>
              <Select
                value={formData.splynxTeamId?.toString() || "none"}
                onValueChange={(value) => setFormData({ ...formData, splynxTeamId: value === "none" ? null : parseInt(value) })}
                disabled={!isAdmin || isLoadingSplynxTeams}
              >
                <SelectTrigger data-testid="select-splynx-team">
                  <SelectValue placeholder={isLoadingSplynxTeams ? "Loading teams..." : "Link to Splynx team..."} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Splynx team linked</SelectItem>
                  {splynxTeams.map((splynxTeam) => (
                    <SelectItem key={splynxTeam.id} value={splynxTeam.id.toString()}>
                      {splynxTeam.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link this team to a Splynx scheduling team for calendar integration and task routing.
              </p>
              {splynxTeams.length === 0 && !isLoadingSplynxTeams && (
                <p className="text-xs text-amber-600">
                  No Splynx teams found. Make sure your Splynx integration is configured.
                </p>
              )}
              {formData.splynxTeamId && (
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Linked to: {splynxTeams.find(t => t.id === formData.splynxTeamId)?.title || `Team #${formData.splynxTeamId}`}
                </div>
              )}
            </div>
            
            {/* Cadence Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Cadence Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Timezone
                    </Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cadence" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Cadence
                    </Label>
                    <Select
                      value={formData.cadence}
                      onValueChange={(value) => setFormData({ ...formData, cadence: value })}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger id="cadence">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="half_yearly">Half Yearly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="meetingTime" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Meeting Time
                    </Label>
                    <Input
                      id="meetingTime"
                      type="time"
                      value={formData.meetingTime}
                      onChange={(e) => setFormData({ ...formData, meetingTime: e.target.value })}
                      disabled={!isAdmin}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="meetingLength">Meeting Length</Label>
                    <Select
                      value={formData.defaultMeetingLengthMinutes}
                      onValueChange={(value) => setFormData({ ...formData, defaultMeetingLengthMinutes: value })}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger id="meetingLength">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Conditional fields based on cadence */}
                {(formData.cadence === 'weekly' || formData.cadence === 'bi_weekly') && (
                  <div className="space-y-2">
                    <Label htmlFor="weekday">Day of Week</Label>
                    <Select
                      value={formData.weeklyWeekday}
                      onValueChange={(value) => setFormData({ ...formData, weeklyWeekday: value })}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger id="weekday">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mon">Monday</SelectItem>
                        <SelectItem value="tue">Tuesday</SelectItem>
                        <SelectItem value="wed">Wednesday</SelectItem>
                        <SelectItem value="thu">Thursday</SelectItem>
                        <SelectItem value="fri">Friday</SelectItem>
                        <SelectItem value="sat">Saturday</SelectItem>
                        <SelectItem value="sun">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {formData.cadence === 'monthly' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="monthlyRule">Monthly Rule</Label>
                      <Select
                        value={formData.monthlyRuleType}
                        onValueChange={(value) => setFormData({ ...formData, monthlyRuleType: value })}
                        disabled={!isAdmin}
                      >
                        <SelectTrigger id="monthlyRule">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nth_weekday">Nth Weekday</SelectItem>
                          <SelectItem value="day_of_month">Day of Month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {formData.monthlyRuleType === 'nth_weekday' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="monthlyNth">Which</Label>
                          <Select
                            value={formData.monthlyNth}
                            onValueChange={(value) => setFormData({ ...formData, monthlyNth: value })}
                            disabled={!isAdmin}
                          >
                            <SelectTrigger id="monthlyNth">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">First</SelectItem>
                              <SelectItem value="2">Second</SelectItem>
                              <SelectItem value="3">Third</SelectItem>
                              <SelectItem value="4">Fourth</SelectItem>
                              <SelectItem value="last">Last</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="monthlyWeekday">Weekday</Label>
                          <Select
                            value={formData.monthlyWeekday}
                            onValueChange={(value) => setFormData({ ...formData, monthlyWeekday: value })}
                            disabled={!isAdmin}
                          >
                            <SelectTrigger id="monthlyWeekday">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mon">Monday</SelectItem>
                              <SelectItem value="tue">Tuesday</SelectItem>
                              <SelectItem value="wed">Wednesday</SelectItem>
                              <SelectItem value="thu">Thursday</SelectItem>
                              <SelectItem value="fri">Friday</SelectItem>
                              <SelectItem value="sat">Saturday</SelectItem>
                              <SelectItem value="sun">Sunday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="monthlyDay">Day of Month</Label>
                        <Input
                          id="monthlyDay"
                          type="number"
                          min="1"
                          max="31"
                          value={formData.monthlyDayOfMonth}
                          onChange={(e) => setFormData({ ...formData, monthlyDayOfMonth: parseInt(e.target.value) || 1 })}
                          disabled={!isAdmin}
                        />
                        <p className="text-sm text-muted-foreground">
                          If the day doesn't exist in a month (e.g., 31st in February), the last valid day will be used.
                        </p>
                      </div>
                    )}
                  </>
                )}
                
                {(formData.cadence === 'quarterly' || formData.cadence === 'half_yearly' || formData.cadence === 'annual') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="periodNth">Which</Label>
                      <Select
                        value={formData.periodNth}
                        onValueChange={(value) => setFormData({ ...formData, periodNth: value })}
                        disabled={!isAdmin}
                      >
                        <SelectTrigger id="periodNth">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">First</SelectItem>
                          <SelectItem value="2">Second</SelectItem>
                          <SelectItem value="3">Third</SelectItem>
                          <SelectItem value="4">Fourth</SelectItem>
                          <SelectItem value="last">Last</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="periodWeekday">Weekday of Period</Label>
                      <Select
                        value={formData.periodWeekday}
                        onValueChange={(value) => setFormData({ ...formData, periodWeekday: value })}
                        disabled={!isAdmin}
                      >
                        <SelectTrigger id="periodWeekday">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mon">Monday</SelectItem>
                          <SelectItem value="tue">Tuesday</SelectItem>
                          <SelectItem value="wed">Wednesday</SelectItem>
                          <SelectItem value="thu">Thursday</SelectItem>
                          <SelectItem value="fri">Friday</SelectItem>
                          <SelectItem value="sat">Saturday</SelectItem>
                          <SelectItem value="sun">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Next Check-ins Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Next 8 check-ins (preview)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {nextMeetings.map((date, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{index + 1}.</span>
                      <span>
                        {date.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                      <span className="text-muted-foreground">at</span>
                      <span>{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {team && onManageMembers && (
              <div className="border-t pt-6">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onManageMembers}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Members
                </Button>
              </div>
            )}
          </div>
          
          <SheetFooter className="mt-8 flex justify-between">
            <div className="flex-1">
              {team && isAdmin && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Team
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              {isAdmin && (
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? 'Saving...' : (team ? 'Save Changes' : 'Create Team')}
                </Button>
              )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{team?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}