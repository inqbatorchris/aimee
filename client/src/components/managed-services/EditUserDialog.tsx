import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
// Use the portal's user interface to match expected structure
interface ManagedServicesUser {
  id: number;
  userName: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  mobile?: string;
  jobTitle?: string;
  department?: string;
  site?: string;
  teamId: number;
  teamName?: string;
  role?: string;
  userRole?: string;
  userStatus?: string;
  isActive?: boolean;
  extension?: string;
  directDial?: string;
  directDialNumber?: string;
  voicemailEnabled?: boolean;
  voicemailPin?: string;
  forwardingNumber?: string;
  emailAddress?: string;
  microsoft365LicenseType?: string;
  outlookDelegateAccess?: boolean;
  emailTo?: string;
  mobileApp?: boolean;
  desktopApp?: boolean;
  tabletApp?: boolean;
  voiceExtension?: string;
  fullPhoneNumber?: string;
  pendingChangeType?: string;
}

interface ManagedServicesTeam {
  id: number;
  name?: string;
  teamName?: string;
}

interface EditUserDialogProps {
  user: ManagedServicesUser | null;
  teams: ManagedServicesTeam[];
  open: boolean;
  onClose: () => void;
  onSave: (updatedUser: Partial<ManagedServicesUser>) => void;
}

export function EditUserDialog({ user, teams, open, onClose, onSave }: EditUserDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<ManagedServicesUser>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when user changes
  React.useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        teamId: user.teamId,
        role: user.role || 'User',
        isActive: user.isActive,
        extension: user.extension || '',
        directDial: user.directDial || '',
        voicemailEnabled: user.voicemailEnabled || false,
        voicemailPin: user.voicemailPin || '',
        forwardingNumber: user.forwardingNumber || '',
        emailAddress: user.emailAddress || '',
        outlookDelegateAccess: user.outlookDelegateAccess || false,
        mobileApp: user.mobileApp || false,
        desktopApp: user.desktopApp || false,
        tabletApp: user.tabletApp || false,
        jobTitle: user.jobTitle || '',
        department: user.department || '',
        site: user.site || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await onSave(formData);
      toast({
        title: "User Updated",
        description: "User information has been updated successfully.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user information.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof ManagedServicesUser, value: any) => {
    setFormData((prev: Partial<ManagedServicesUser>) => ({ ...prev, [field]: value }));
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User: {user.firstName} {user.lastName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Personal Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName || ''}
                  onChange={(e) => updateField('firstName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName || ''}
                  onChange={(e) => updateField('lastName', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber || ''}
                onChange={(e) => updateField('phoneNumber', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle || ''}
                onChange={(e) => updateField('jobTitle', e.target.value)}
                autoComplete="off"
                data-form-type="other"
              />
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department || ''}
                onChange={(e) => updateField('department', e.target.value)}
                autoComplete="off"
                data-form-type="other"
              />
            </div>

            <div>
              <Label htmlFor="site">Site</Label>
              <Input
                id="site"
                value={formData.site || ''}
                onChange={(e) => updateField('site', e.target.value)}
                autoComplete="off"
                data-form-type="other"
              />
            </div>
          </div>

          {/* System Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">System Settings</h3>

            <div>
              <Label htmlFor="team">Team</Label>
              <Select value={formData.teamId?.toString()} onValueChange={(value) => updateField('teamId', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
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

            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => updateField('role', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="User">User</SelectItem>
                  <SelectItem value="Company Admin">Company Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => updateField('isActive', checked)}
              />
              <Label htmlFor="isActive">Active User</Label>
            </div>

            <h4 className="font-medium">Phone System</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="extension">Extension</Label>
                <Input
                  id="extension"
                  value={formData.extension || ''}
                  onChange={(e) => updateField('extension', e.target.value)}
                  autoComplete="off"
                  data-form-type="other"
                />
              </div>
              <div>
                <Label htmlFor="directDial">Direct Dial</Label>
                <Input
                  id="directDial"
                  value={formData.directDial || ''}
                  onChange={(e) => updateField('directDial', e.target.value)}
                  autoComplete="off"
                  data-form-type="other"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="voicemailEnabled"
                checked={formData.voicemailEnabled}
                onCheckedChange={(checked) => updateField('voicemailEnabled', checked)}
              />
              <Label htmlFor="voicemailEnabled">Voicemail Enabled</Label>
            </div>

            {formData.voicemailEnabled && (
              <div>
                <Label htmlFor="voicemailPin">Voicemail PIN</Label>
                <Input
                  id="voicemailPin"
                  value={formData.voicemailPin || ''}
                  onChange={(e) => updateField('voicemailPin', e.target.value)}
                  autoComplete="off"
                  data-form-type="other"
                />
              </div>
            )}

            <div>
              <Label htmlFor="forwardingNumber">Forwarding Number</Label>
              <Input
                id="forwardingNumber"
                value={formData.forwardingNumber || ''}
                onChange={(e) => updateField('forwardingNumber', e.target.value)}
              />
            </div>

            <h4 className="font-medium">Email & Apps</h4>
            <div>
              <Label htmlFor="emailAddress">Email Address</Label>
              <Input
                id="emailAddress"
                type="email"
                value={formData.emailAddress || ''}
                onChange={(e) => updateField('emailAddress', e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="outlookDelegateAccess"
                checked={formData.outlookDelegateAccess}
                onCheckedChange={(checked) => updateField('outlookDelegateAccess', checked)}
              />
              <Label htmlFor="outlookDelegateAccess">Outlook Delegate Access</Label>
            </div>

            <h4 className="font-medium">App Access</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mobileApp"
                  checked={formData.mobileApp}
                  onCheckedChange={(checked) => updateField('mobileApp', checked)}
                />
                <Label htmlFor="mobileApp">Mobile App</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="desktopApp"
                  checked={formData.desktopApp}
                  onCheckedChange={(checked) => updateField('desktopApp', checked)}
                />
                <Label htmlFor="desktopApp">Desktop App</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tabletApp"
                  checked={formData.tabletApp}
                  onCheckedChange={(checked) => updateField('tabletApp', checked)}
                />
                <Label htmlFor="tabletApp">Tablet App</Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}