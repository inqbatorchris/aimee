import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Phone } from 'lucide-react';

interface ManagedServicesTeam {
  id: number;
  teamName: string;
  huntGroupEnabled: boolean;
  huntGroupExtension: string;
  directDialNumber: string;
  featurePack: string;
  site: string;
}

interface AddTeamDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (teamData: any) => void;
  team?: ManagedServicesTeam | null;
}

export function AddTeamDialog({ open, onClose, onSave, team }: AddTeamDialogProps) {
  const isEditing = !!team;

  const [formData, setFormData] = useState({
    teamName: team?.teamName || '',
    huntGroupEnabled: team?.huntGroupEnabled || false,
    huntGroupExtension: team?.huntGroupExtension || '',
    directDialNumber: team?.directDialNumber || '',
    featurePack: team?.featurePack || 'None',
    site: team?.site || 'Newport',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    // Reset form if adding new team
    if (!isEditing) {
      setFormData({
        teamName: '',
        huntGroupEnabled: false,
        huntGroupExtension: '',
        directDialNumber: '',
        featurePack: 'None',
        site: 'Newport',
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isEditing ? 'Edit Team' : 'Add New Team'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="teamName">Team Name *</Label>
                  <Input
                    id="teamName"
                    value={formData.teamName}
                    onChange={(e) => handleInputChange('teamName', e.target.value)}
                    placeholder="e.g., Sales Team"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="site">Site Location</Label>
                  <Select value={formData.site} onValueChange={(value) => handleInputChange('site', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Newport">Newport</SelectItem>
                      <SelectItem value="Neath">Neath</SelectItem>
                      <SelectItem value="Cardiff">Cardiff</SelectItem>
                      <SelectItem value="Remote">Remote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hunt Group Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Hunt Group Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="huntGroupEnabled"
                  checked={formData.huntGroupEnabled}
                  onCheckedChange={(checked) => handleInputChange('huntGroupEnabled', checked)}
                />
                <Label htmlFor="huntGroupEnabled">Enable Hunt Group</Label>
              </div>

              {formData.huntGroupEnabled && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <Label htmlFor="huntGroupExtension">Hunt Group Extension</Label>
                    <Input
                      id="huntGroupExtension"
                      value={formData.huntGroupExtension}
                      onChange={(e) => handleInputChange('huntGroupExtension', e.target.value)}
                      placeholder="e.g., 201"
                    />
                  </div>
                  <div>
                    <Label htmlFor="directDialNumber">Direct Dial Number</Label>
                    <Input
                      id="directDialNumber"
                      value={formData.directDialNumber}
                      onChange={(e) => handleInputChange('directDialNumber', e.target.value)}
                      placeholder="e.g., 01633 123456"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="featurePack">Feature Pack</Label>
                <Select value={formData.featurePack} onValueChange={(value) => handleInputChange('featurePack', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Plus">Plus</SelectItem>
                    <SelectItem value="Premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.teamName}>
              {isEditing ? 'Update Team' : 'Create Team'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}