import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { User, Phone, Mail, MapPin, Building, Briefcase, Smartphone, Monitor, Tablet } from 'lucide-react';

interface UserDetailsModalProps {
  user: ManagedServicesUser | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (user: ManagedServicesUser) => void;
}

export function UserDetailsModal({ user, open, onClose, onEdit }: UserDetailsModalProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {user.firstName} {user.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Personal Information</h3>
              <Badge variant={user.isActive ? "default" : "secondary"}>
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Name:</span>
                <span>{user.firstName} {user.lastName}</span>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Email:</span>
                <span>{user.email || 'Not provided'}</span>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Phone:</span>
                <span>{user.phoneNumber || 'Not provided'}</span>
              </div>

              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Job Title:</span>
                <span>{user.jobTitle || 'Not provided'}</span>
              </div>

              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Department:</span>
                <span>{user.department || 'Not provided'}</span>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Site:</span>
                <span>{user.site || 'Not provided'}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium">Role:</span>
                <Badge variant="outline">{user.role}</Badge>
              </div>
            </div>
          </div>

          {/* Phone System */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Phone System</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Extension:</span>
                <span>{user.extension || 'Not assigned'}</span>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Direct Dial:</span>
                <span>{user.directDial || 'Not assigned'}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium">Voicemail:</span>
                <Badge variant={user.voicemailEnabled ? "default" : "secondary"}>
                  {user.voicemailEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              {user.voicemailEnabled && user.voicemailPin && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Voicemail PIN:</span>
                  <span className="font-mono">****</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Forwarding:</span>
                <span>{user.forwardingNumber || 'Not set'}</span>
              </div>
            </div>

            <Separator />

            <h4 className="font-medium">Email & Collaboration</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Email Address:</span>
                <span>{user.emailAddress || 'Not provided'}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium">Outlook Delegate:</span>
                <Badge variant={user.outlookDelegateAccess ? "default" : "secondary"}>
                  {user.outlookDelegateAccess ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>

            <Separator />

            <h4 className="font-medium">App Access</h4>
            <div className="flex flex-wrap gap-2">
              {user.mobileApp && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  Mobile
                </Badge>
              )}
              {user.desktopApp && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  Desktop
                </Badge>
              )}
              {user.tabletApp && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Tablet className="h-3 w-3" />
                  Tablet
                </Badge>
              )}
              {!user.mobileApp && !user.desktopApp && !user.tabletApp && (
                <span className="text-muted-foreground">No app access configured</span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onEdit?.(user)}>
            Edit User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}