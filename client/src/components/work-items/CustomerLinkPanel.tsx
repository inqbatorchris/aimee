import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, User, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SplynxCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  category: string;
}

interface CustomerLinkPanelProps {
  workItemId: number;
  integrationId?: number;
  onCustomerLinked?: () => void;
}

export function CustomerLinkPanel({ workItemId, integrationId, onCustomerLinked }: CustomerLinkPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<SplynxCustomer | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading: searchLoading } = useQuery<SplynxCustomer[]>({
    queryKey: ['/api/customers', { search: searchTerm, limit: 20 }],
    enabled: searchTerm.length >= 2 || /^\d+$/.test(searchTerm),
    staleTime: 2 * 60 * 1000,
  });

  const linkCustomerMutation = useMutation({
    mutationFn: async (customerId: number) => {
      return apiRequest(`/api/work-items/${workItemId}/link-customer`, {
        method: 'POST',
        body: { customerId },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Customer linked successfully',
        description: 'The workflow can now be resumed with customer context.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/work-items', workItemId] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      onCustomerLinked?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to link customer',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleLinkCustomer = () => {
    if (selectedCustomer) {
      linkCustomerMutation.mutate(selectedCustomer.id);
    }
  };

  return (
    <div className="p-6 space-y-4" data-testid="customer-link-panel">
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">Customer ID Required</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          This support ticket was received without a customer ID. Search for and link the customer to continue processing.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <label className="text-sm font-medium">Search for Customer</label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or customer ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-customer-search"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Enter at least 2 characters to search, or enter a numeric customer ID
        </p>
      </div>

      {searchLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
        </div>
      )}

      {!searchLoading && customers.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {customers.map((customer) => (
            <Card
              key={customer.id}
              className={`cursor-pointer transition-all ${
                selectedCustomer?.id === customer.id
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:bg-accent'
              }`}
              onClick={() => setSelectedCustomer(customer)}
              data-testid={`card-customer-${customer.id}`}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {customer.id} • {customer.email || 'No email'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                      {customer.status}
                    </Badge>
                    {selectedCustomer?.id === customer.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!searchLoading && searchTerm.length >= 2 && customers.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No customers found matching "{searchTerm}"</p>
        </div>
      )}

      {selectedCustomer && (
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Selected Customer</p>
              <p className="text-sm text-muted-foreground">
                {selectedCustomer.name} (ID: {selectedCustomer.id})
              </p>
            </div>
            <Button
              onClick={handleLinkCustomer}
              disabled={linkCustomerMutation.isPending}
              data-testid="button-link-customer"
            >
              {linkCustomerMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                'Link Customer'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
