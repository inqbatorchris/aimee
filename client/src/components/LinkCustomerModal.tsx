import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, User, CheckCircle } from 'lucide-react';

interface LinkCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  onSuccess: () => void;
}

interface CustomerVerification {
  exists: boolean;
  customer: {
    id: number;
    name: string;
    email: string;
    phone: string;
    status: string;
  };
}

export function LinkCustomerModal({ isOpen, onClose, ticketId, onSuccess }: LinkCustomerModalProps) {
  const [customerId, setCustomerId] = useState('');
  const [verifiedCustomer, setVerifiedCustomer] = useState<CustomerVerification | null>(null);
  const { toast } = useToast();

  // Verify customer exists
  const verifyMutation = useMutation({
    mutationFn: async (customerIdToVerify: string) => {
      const response = await apiRequest(`/api/customers/${customerIdToVerify}/verify`, {
        method: 'GET'
      });
      return response.json();
    },
    onSuccess: (data) => {
      setVerifiedCustomer(data);
      toast({
        title: 'Customer Found',
        description: `${data.customer.name} is ready to be linked to this ticket.`,
      });
    },
    onError: (error: any) => {
      setVerifiedCustomer(null);
      toast({
        title: 'Customer Not Found',
        description: 'Please check the customer ID and try again.',
        variant: 'destructive',
      });
    }
  });

  // Link ticket to customer
  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!verifiedCustomer) throw new Error('No customer verified');
      
      const response = await apiRequest(`/api/tickets/${ticketId}/link-customer`, {
        method: 'PUT',
        body: {
          customerId: verifiedCustomer.customer.id.toString()
        }
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Ticket has been linked to the customer successfully.',
      });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'Failed to link ticket to customer. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const handleVerifyCustomer = () => {
    if (!customerId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a customer ID.',
        variant: 'destructive',
      });
      return;
    }
    verifyMutation.mutate(customerId.trim());
  };

  const handleLinkCustomer = () => {
    if (!verifiedCustomer) {
      toast({
        title: 'Error',
        description: 'Please verify the customer first.',
        variant: 'destructive',
      });
      return;
    }
    linkMutation.mutate();
  };

  const resetModal = () => {
    setCustomerId('');
    setVerifiedCustomer(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Link Existing Customer</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerId">Customer ID</Label>
            <div className="flex gap-2">
              <Input
                id="customerId"
                placeholder="Enter customer ID (e.g. 1234)"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                disabled={verifyMutation.isPending}
              />
              <Button
                onClick={handleVerifyCustomer}
                disabled={verifyMutation.isPending || !customerId.trim()}
                variant="outline"
              >
                {verifyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Verify'
                )}
              </Button>
            </div>
          </div>

          {verifiedCustomer && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Customer Found</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">{verifiedCustomer.customer.name}</span>
                  <Badge variant={verifiedCustomer.customer.status === 'active' ? 'default' : 'secondary'}>
                    {verifiedCustomer.customer.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Email: {verifiedCustomer.customer.email}</p>
                  <p>Phone: {verifiedCustomer.customer.phone}</p>
                  <p>ID: {verifiedCustomer.customer.id}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleLinkCustomer}
            disabled={!verifiedCustomer || linkMutation.isPending}
          >
            {linkMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Linking...
              </>
            ) : (
              'Link Customer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}