import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateOrganizationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  plans: any[];
}

export function CreateOrganizationPanel({ isOpen, onClose, plans }: CreateOrganizationPanelProps) {
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
      return apiRequest('/api/organizations', {
        method: 'POST',
        body: JSON.stringify(data)
      });
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
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Slide-in panel */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-[400px] bg-background border-l shadow-xl z-50 transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div>
              <h2 className="text-lg font-semibold">Create New Organization</h2>
              <p className="text-sm text-muted-foreground">
                Set up a new organization with an admin account and subscription plan.
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              {errors.general && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.general}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Organization Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter organization name"
                  autoComplete="off"
                  data-form-type="other"
                  className="h-9"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail" className="text-sm font-medium">Admin Email *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  placeholder="admin@company.com"
                  autoComplete="off"
                  data-form-type="other"
                  className="h-9"
                />
                {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan" className="text-sm font-medium">Subscription Plan</Label>
                <Select 
                  value={formData.planId.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, planId: parseInt(value) })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        {plan.name} - ${plan.priceMonthly}/month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subdomain" className="text-sm font-medium">Subdomain (Optional)</Label>
                <div className="flex">
                  <Input
                    id="subdomain"
                    type="text"
                    value={formData.subdomain}
                    onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                    placeholder="acme"
                    className="rounded-r-none h-9"
                    autoComplete="off"
                    data-form-type="other"
                  />
                  <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-l-0 rounded-r-md h-9">
                    .aimee.works
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty for auto-generated subdomain
                </p>
                {errors.subdomain && <p className="text-xs text-destructive">{errors.subdomain}</p>}
              </div>

              {/* Footer with buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t bg-muted/30 -mx-4 px-4 -mb-4 pb-4 mt-6">
                <Button type="button" variant="outline" onClick={onClose} size="sm">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  size="sm"
                  className="min-w-[120px]"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Organization'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}