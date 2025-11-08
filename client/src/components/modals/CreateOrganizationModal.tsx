import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: any[];
}

export function CreateOrganizationModal({ isOpen, onClose, plans }: CreateOrganizationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    adminEmail: '',
    planId: 1,
    subdomain: '',
  });
  const [errors, setErrors] = useState<any>({});
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('/api/organizations', 'POST', data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({
        title: 'Organization created',
        description: `Successfully created ${formData.name}`,
      });
      onClose();
      setFormData({ name: '', adminEmail: '', planId: 1, subdomain: '' });
    },
    onError: (error: any) => {
      const errorData = error.response?.data || error;
      setErrors({ general: errorData.error || 'Failed to create organization' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Basic validation
    if (!formData.name) {
      setErrors({ name: 'Organization name is required' });
      return;
    }
    if (!formData.adminEmail || !formData.adminEmail.includes('@')) {
      setErrors({ adminEmail: 'Valid email is required' });
      return;
    }
    if (formData.subdomain && !/^[a-z0-9-]+$/.test(formData.subdomain)) {
      setErrors({ subdomain: 'Subdomain can only contain lowercase letters, numbers, and hyphens' });
      return;
    }
    
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Set up a new organization with an admin account and subscription plan.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {errors.general && (
              <Alert variant="destructive">
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Acme Corporation"
                disabled={createMutation.isPending}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="adminEmail">Admin Email *</Label>
              <Input
                id="adminEmail"
                type="email"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                placeholder="admin@example.com"
                disabled={createMutation.isPending}
              />
              {errors.adminEmail && <p className="text-sm text-destructive">{errors.adminEmail}</p>}
              <p className="text-xs text-muted-foreground">
                An invitation will be sent to this email address
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="plan">Subscription Plan</Label>
              <Select 
                value={formData.planId.toString()} 
                onValueChange={(value) => setFormData({ ...formData, planId: parseInt(value) })}
                disabled={createMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.name} - ${plan.priceMonthly}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="subdomain">Subdomain (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="subdomain"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase() })}
                  placeholder="acme"
                  disabled={createMutation.isPending}
                />
                <span className="text-sm text-muted-foreground">.aimee.works</span>
              </div>
              {errors.subdomain && <p className="text-sm text-destructive">{errors.subdomain}</p>}
              <p className="text-xs text-muted-foreground">
                Leave empty for auto-generated subdomain
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Organization
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}