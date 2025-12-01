import { useQuery } from '@tanstack/react-query';
import { User, DollarSign, Clock, AlertCircle, Wifi, CheckCircle, Calendar, Link as LinkIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

interface CustomerContextPanelProps {
  workItem: any;
  onGenerateBookingLink?: () => void;
}

export function CustomerContextPanel({ workItem, onGenerateBookingLink }: CustomerContextPanelProps) {
  const customerId = workItem?.sourceTicket?.customer_id || workItem?.customerId;
  const integrationId = workItem?.integrationId;
  
  // Fetch customer context
  const { data: customerContext, isLoading } = useQuery({
    queryKey: [`/api/splynx/integrations/${integrationId}/customer-context/${customerId}`],
    enabled: !!customerId && !!integrationId,
  });
  
  if (!customerId || !integrationId) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No customer information available for this work item.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  
  if (!customerContext) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load customer context. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const { customer, services, balance, recentTickets } = customerContext as any;
  
  return (
    <div className="p-6 space-y-6" data-testid="customer-context-panel">
      {/* Customer Information */}
      <Card className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <User className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <h3 className="font-medium mb-1">{customer?.name || 'Unknown Customer'}</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              {customer?.email && <div>Email: {customer.email}</div>}
              {customer?.phone && <div>Phone: {customer.phone}</div>}
              {customer?.status && (
                <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                  {customer.status}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
      
      {/* Account Balance */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <h3 className="font-medium mb-1">Account Balance</h3>
            <div className="text-2xl font-bold">
              ${balance?.current_balance?.toFixed(2) || '0.00'}
            </div>
            {balance?.overdue_amount > 0 && (
              <div className="text-sm text-destructive mt-1">
                Overdue: ${balance.overdue_amount.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </Card>
      
      {/* Services */}
      <Card className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Wifi className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <h3 className="font-medium mb-3">Active Services</h3>
            {services && services.length > 0 ? (
              <div className="space-y-2">
                {services.map((service: any) => (
                  <div key={service.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">{service.description || service.plan}</div>
                      <div className="text-xs text-muted-foreground">{service.type}</div>
                    </div>
                    {service.status === 'active' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No active services</div>
            )}
          </div>
        </div>
      </Card>
      
      {/* Recent Tickets */}
      <Card className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <h3 className="font-medium mb-3">Recent Tickets</h3>
            {recentTickets && recentTickets.length > 0 ? (
              <div className="space-y-2">
                {recentTickets.slice(0, 5).map((ticket: any) => (
                  <div key={ticket.id} className="p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-sm font-medium">#{ticket.id} - {ticket.subject}</div>
                      <Badge variant="outline" className="text-xs">
                        {ticket.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ticket.created_at && format(new Date(ticket.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No recent tickets</div>
            )}
          </div>
        </div>
      </Card>
      
      {/* Booking Actions */}
      {onGenerateBookingLink && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <h3 className="font-medium mb-2">Schedule Appointment</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Generate a booking link for the customer to schedule a support session or field visit.
              </p>
              <Button 
                onClick={onGenerateBookingLink}
                size="sm"
                data-testid="button-generate-booking-link"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Generate Booking Link
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
