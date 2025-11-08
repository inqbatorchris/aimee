import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ServiceHealthPanel } from "./ServiceHealthPanel";
import { LinkCustomerModal } from "./LinkCustomerModal";
import { CreateCustomerModal } from "./CreateCustomerModal";
import ErrorBoundary, { MobileErrorFallback } from "./ErrorBoundary";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Wifi, 
  PhoneCall,
  CreditCard,
  Activity,
  ArrowLeft,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Link,
  Plus
} from "lucide-react";

interface CustomerService {
  id: string;
  plan: string;
  status: string;
  speed?: string;
  price: number;
  startDate?: string;
  ipAddress?: string;
  number?: string;
}

interface CustomerDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  mobile?: string;
  address: {
    street1: string;
    street2: string;
    city: string;
    zipCode: string;
    country: string;
    full: string;
  };
  status: string;
  category: string;
  balance: number;
  dateAdded: string;
  lastOnline: string;
  lastUpdate: string;
  services: {
    internet: CustomerService[];
    voice: CustomerService[];
  };
  billing: {
    billingDay: number;
    paymentType: string;
    currency: string;
    creditLimit: number;
  } | null;
  stats: {
    totalServices: number;
    activeServices: number;
    monthlyRecurring: number;
  };
}

interface CustomerDetailsMobileProps {
  customer: CustomerDetails | null;
  isLoading?: boolean;
  onBack: () => void;
  onCreateTicket?: () => void;
  ticketId?: string;
  messages?: any[];
  onCustomerLinked?: () => void;
}

export function CustomerDetailsMobile({ 
  customer, 
  isLoading = false, 
  onBack,
  onCreateTicket,
  ticketId,
  messages = [],
  onCustomerLinked
}: CustomerDetailsMobileProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  if (isLoading) {
    return (
      <div className="h-full w-full bg-background overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-background">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-semibold">Customer Details</h1>
          </div>
        </div>
        
        {/* Loading skeleton optimized for mobile */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Header skeleton */}
          <Card>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="h-5 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                  </div>
                  <div className="w-16 h-6 bg-gray-300 rounded"></div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[1, 2, 3].map((i) => (
                    <div key={i}>
                      <div className="h-6 bg-gray-300 rounded mb-1"></div>
                      <div className="h-3 bg-gray-300 rounded w-2/3 mx-auto"></div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Service health skeleton */}
          <Card>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-1/3 mb-3"></div>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-300 rounded"></div>
                        <div className="h-3 bg-gray-300 rounded w-20"></div>
                      </div>
                      <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Contact info skeleton */}
          <Card>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-1/2 mb-3"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-gray-300 rounded"></div>
                      <div className="h-4 bg-gray-300 rounded flex-1"></div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="h-full w-full bg-background overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-background">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-semibold">Customer Details</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <User className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-sm text-muted-foreground">Customer not found</p>
            
            {ticketId && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Would you like to link this ticket to a customer?</p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLinkModal(true)}
                  >
                    <Link className="w-4 h-4 mr-2" />
                    Link Existing Customer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Customer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Customer Linking Modals */}
        {ticketId && (
          <>
            <LinkCustomerModal
              isOpen={showLinkModal}
              onClose={() => setShowLinkModal(false)}
              ticketId={ticketId}
              onSuccess={() => {
                setShowLinkModal(false);
                onCustomerLinked?.();
              }}
            />
            <CreateCustomerModal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              ticketId={ticketId}
              messages={messages}
              onSuccess={() => {
                setShowCreateModal(false);
                onCustomerLinked?.();
              }}
            />
          </>
        )}
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (!status) return 'outline';
    switch (status.toLowerCase()) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'blocked': return 'destructive';
      default: return 'outline';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: customer.billing?.currency || 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <ErrorBoundary fallbackComponent={MobileErrorFallback}>
      <div className="h-full w-full bg-background overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-semibold">Customer Details</h1>
          </div>
          
          {/* Customer Header Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate">{customer.name}</h2>
                  <p className="text-sm text-muted-foreground">ID: {customer.id}</p>
                </div>
                <Badge variant={getStatusColor(customer.status)} className="ml-2">
                  {customer.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className={`text-lg font-semibold ${customer.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(customer.balance)}
                  </p>
                  <p className="text-xs text-muted-foreground">Balance</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{customer.stats?.activeServices || 0}</p>
                  <p className="text-xs text-muted-foreground">Active Services</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{formatCurrency(customer.stats?.monthlyRecurring || 0)}</p>
                  <p className="text-xs text-muted-foreground">Monthly</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Service Health Panel - wrapped in additional error boundary */}
          <ErrorBoundary 
            fallbackComponent={({ error, retry }) => (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    Service Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Unable to load service health information. This may be due to a temporary network issue.
                  </p>
                  <Button onClick={retry} variant="outline" size="sm">
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            )}
          >
            <ServiceHealthPanel customerId={customer.id} />
          </ErrorBoundary>
          
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <a 
                      href={`mailto:${customer.email}`}
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {customer.email}
                    </a>
                  </div>
                </div>
              )}
              
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <a 
                      href={`tel:${customer.phone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {customer.phone}
                    </a>
                    <p className="text-xs text-muted-foreground">Primary</p>
                  </div>
                </div>
              )}

              {customer.mobile && customer.mobile !== customer.phone && (
                <div className="flex items-center gap-3">
                  <PhoneCall className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <a 
                      href={`tel:${customer.mobile}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {customer.mobile}
                    </a>
                    <p className="text-xs text-muted-foreground">Mobile</p>
                  </div>
                </div>
              )}

              {customer.address?.full && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm break-words">{customer.address.full}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Internet Services */}
          {customer.services?.internet?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  Internet Services ({customer.services?.internet?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.services?.internet?.map((service) => (
                  <div key={service.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm">{service.plan}</h4>
                      <Badge 
                        variant={service.status === 'active' ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {service.status}
                      </Badge>
                    </div>
                    {service.speed && (
                      <p className="text-sm text-muted-foreground mb-1">{service.speed}</p>
                    )}
                    {service.ipAddress && (
                      <p className="text-xs text-muted-foreground mb-2">IP: {service.ipAddress}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Since {service.startDate ? formatDate(service.startDate) : 'Unknown'}
                      </span>
                      <span className="text-sm font-medium">
                        {formatCurrency(service.price)}/month
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Voice Services */}
          {customer.services?.voice?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PhoneCall className="w-4 h-4" />
                  Voice Services ({customer.services?.voice?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.services?.voice?.map((service) => (
                  <div key={service.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm">{service.plan}</h4>
                      <Badge 
                        variant={service.status === 'active' ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {service.status}
                      </Badge>
                    </div>
                    {service.number && (
                      <p className="text-sm text-muted-foreground mb-2">{service.number}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Voice Service</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(service.price)}/month
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Customer Since</span>
                <span className="text-sm font-medium">{formatDate(customer.dateAdded)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Online</span>
                <span className="text-sm font-medium">{formatDate(customer.lastOnline)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Category</span>
                <span className="text-sm font-medium capitalize">{customer.category}</span>
              </div>
              {customer.billing && (
                <>
                  <Separator className="my-3" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Billing Day</span>
                    <span className="text-sm font-medium">{customer.billing.billingDay}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Payment Type</span>
                    <span className="text-sm font-medium capitalize">{customer.billing.paymentType}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Credit Limit</span>
                    <span className="text-sm font-medium">{formatCurrency(customer.billing.creditLimit)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        </div>

      {/* Quick Actions - Fixed at bottom */}
      <div className="p-4 border-t bg-background">
        <div className="space-y-3">
          {onCreateTicket && (
            <Button onClick={onCreateTicket} className="w-full">
              <MessageSquare className="w-4 h-4 mr-2" />
              Create New Ticket
            </Button>
          )}
          
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" className="text-xs">
              <ExternalLink className="w-3 h-3 mr-1" />
              Splynx
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Mail className="w-3 h-3 mr-1" />
              Email
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Phone className="w-3 h-3 mr-1" />
              Call
            </Button>
          </div>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}