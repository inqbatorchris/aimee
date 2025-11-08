import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, User, Phone, Mail, Building2 } from 'lucide-react';

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

interface CloneUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceUser: ManagedServicesUser;
  teams: ManagedServicesTeam[];
  onSubmit: (userData: any) => void;
  loading: boolean;
}

export function CloneUserDialog({ open, onOpenChange, sourceUser, teams, onSubmit, loading }: CloneUserDialogProps) {
  // Don't render if no sourceUser
  if (!sourceUser) return null;

  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    jobTitle: sourceUser.jobTitle || '',
    teamId: sourceUser.teamId?.toString() || '',
    site: sourceUser.site || '',
    userRole: sourceUser.userRole || '',
    voiceExtension: '',
    fullPhoneNumber: '',
    huntGroupMember: sourceUser.huntGroupMember || false,
    voicemailEnabled: true,
    microsoft365LicenseType: 'Business Standard',
    phoneSystemUsername: '',
    // Additional fields
    mobileNumber: '',
    department: '',
    manager: '',
    startDate: '',
    notes: `Cloned from ${sourceUser.userName}`,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      ...formData,
      sourceUserId: sourceUser.id,
    });
    // Reset form
    setFormData({
      userName: '',
      email: '',
      jobTitle: sourceUser.jobTitle || '',
      teamId: sourceUser.teamId?.toString() || '',
      site: sourceUser.site || '',
      userRole: sourceUser.userRole || '',
      voiceExtension: '',
      fullPhoneNumber: '',
      huntGroupMember: sourceUser.huntGroupMember || false,
      voicemailEnabled: true,
      microsoft365LicenseType: 'Business Standard',
      phoneSystemUsername: '',
      mobileNumber: '',
      department: '',
      manager: '',
      startDate: '',
      notes: `Cloned from ${sourceUser.userName}`,
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate phone system username from email
    if (field === 'email' && value) {
      const username = value.split('@')[0];
      setFormData(prev => ({ ...prev, phoneSystemUsername: username }));
    }
  };

  const selectedTeam = teams.find(t => t.id.toString() === formData.teamId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Clone User Setup
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg border">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <User className="h-4 w-4" />
            Cloning from: {sourceUser.userName}
          </h4>
          <div className="text-xs space-y-1 text-gray-600">
            <p>Email: {sourceUser.email}</p>
            <p>Extension: {sourceUser.voiceExtension}</p>
            <p>Team: {sourceUser.teamName}</p>
            <p>Role: {sourceUser.userRole}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                New User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="userName">Full Name *</Label>
                  <Input
                    id="userName"
                    value={formData.userName}
                    onChange={(e) => handleInputChange('userName', e.target.value)}
                    placeholder="e.g. Jane Smith"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="jane.smith@hennahhaywood.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    placeholder={`Same as ${sourceUser.userName}`}
                    autoComplete="off"
                    data-form-type="other"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    placeholder="e.g. Legal"
                    autoComplete="off"
                    data-form-type="other"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="manager">Line Manager</Label>
                  <Input
                    id="manager"
                    value={formData.manager}
                    onChange={(e) => handleInputChange('manager', e.target.value)}
                    placeholder="e.g. Mark Tomlinson"
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Voice Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="voiceExtension">Extension *</Label>
                  <Input
                    id="voiceExtension"
                    value={formData.voiceExtension}
                    onChange={(e) => handleInputChange('voiceExtension', e.target.value)}
                    placeholder="e.g. 6576"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fullPhoneNumber">Full Phone Number *</Label>
                  <Input
                    id="fullPhoneNumber"
                    value={formData.fullPhoneNumber}
                    onChange={(e) => handleInputChange('fullPhoneNumber', e.target.value)}
                    placeholder="e.g. 01633 846576"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phoneSystemUsername">Phone System Username</Label>
                  <Input
                    id="phoneSystemUsername"
                    value={formData.phoneSystemUsername}
                    onChange={(e) => handleInputChange('phoneSystemUsername', e.target.value)}
                    placeholder="Auto-generated from email"
                  />
                </div>
                <div>
                  <Label htmlFor="mobileNumber">Mobile Number</Label>
                  <Input
                    id="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                    placeholder="e.g. 07700 900000"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="voicemailEnabled"
                  checked={formData.voicemailEnabled}
                  onCheckedChange={(checked) => handleInputChange('voicemailEnabled', checked)}
                />
                <Label htmlFor="voicemailEnabled">Enable voicemail</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Team Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="teamId">Team</Label>
                  <Select value={formData.teamId} onValueChange={(value) => handleInputChange('teamId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.teamName} ({team.site})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="site">Site</Label>
                  <Select value={formData.site} onValueChange={(value) => handleInputChange('site', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Newport">Newport</SelectItem>
                      <SelectItem value="Neath">Neath</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedTeam && (
                <div className="p-3 bg-blue-50 rounded-lg border">
                  <h4 className="font-medium text-sm mb-2">Team Details</h4>
                  <div className="text-xs space-y-1 text-gray-600">
                    <p>Hunt Group: {selectedTeam.huntGroupEnabled ? `Yes (${selectedTeam.huntGroupExtension})` : 'No'}</p>
                    <p>Direct Dial: {selectedTeam.directDialNumber}</p>
                    <p>Feature Pack: {selectedTeam.featurePack}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="huntGroupMember"
                  checked={formData.huntGroupMember}
                  onCheckedChange={(checked) => handleInputChange('huntGroupMember', checked)}
                  disabled={!selectedTeam?.huntGroupEnabled}
                />
                <Label htmlFor="huntGroupMember">
                  Add to hunt group {!selectedTeam?.huntGroupEnabled && '(team has no hunt group)'}
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Permissions & Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="userRole">User Role</Label>
                <Select value={formData.userRole} onValueChange={(value) => handleInputChange('userRole', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="User">User</SelectItem>
                    <SelectItem value="Company Admin">Company Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="microsoft365LicenseType">Microsoft 365 License</Label>
                <Select 
                  value={formData.microsoft365LicenseType} 
                  onValueChange={(value) => handleInputChange('microsoft365LicenseType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Business Basic">Business Basic</SelectItem>
                    <SelectItem value="Business Standard">Business Standard</SelectItem>
                    <SelectItem value="Business Premium">Business Premium</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Cloned setup details..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.userName || !formData.email}>
              {loading ? 'Cloning...' : 'Clone User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}