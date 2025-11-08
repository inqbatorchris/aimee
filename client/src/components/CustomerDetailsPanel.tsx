import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ServiceHealthPanel } from "./ServiceHealthPanel";
import { LinkCustomerModal } from "./LinkCustomerModal";
import { CreateCustomerModal } from "./CreateCustomerModal";
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
  ChevronRight,
  ExternalLink,
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

interface CustomerDetailsPanelProps {
  customer: CustomerDetails | null;
  isLoading?: boolean;
  onClose?: () => void;
  className?: string;
  ticketId?: string;
  messages?: any[];
  onCustomerLinked?: () => void;
}

export function CustomerDetailsPanel({ 
  customer, 
  isLoading = false, 
  onClose,
  className = "",
  ticketId,
  messages = [],
  onCustomerLinked
}: CustomerDetailsPanelProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  if (isLoading) {
    return (
      <div className={`w-full border-l bg-background flex flex-col ${className}`}>
        <div className="p-2 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium">Customer Details</h3>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="h-5 w-5 p-0">
                ×
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className={`w-full border-l bg-background flex flex-col ${className}`}>
        <div className="p-2 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium">Customer Details</h3>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="h-5 w-5 p-0">
                ×
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <User className="w-6 h-6 mx-auto text-gray-300 mb-2" />
            <p className="text-[10px] text-muted-foreground">No customer selected</p>
            
            {ticketId && (
              <div className="space-y-2">
                <p className="text-[9px] text-muted-foreground">Would you like to link this ticket to a customer?</p>
                <div className="flex flex-col gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLinkModal(true)}
                    className="text-[10px] h-6"
                  >
                    <Link className="w-3 h-3 mr-1" />
                    Link Existing Customer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateModal(true)}
                    className="text-[10px] h-6"
                  >
                    <Plus className="w-3 h-3 mr-1" />
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
    <div className={`w-full border-l bg-background flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-2 border-b">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-medium">Customer Details</h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-5 w-5 p-0">
              ×
            </Button>
          )}
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-medium truncate leading-tight text-right">{customer.name}</h4>
          <div className="flex items-center justify-end gap-1">
            <span className="text-[10px] text-muted-foreground">ID: {customer.id}</span>
            <Badge variant={getStatusColor(customer.status)} className="text-[9px] px-1 py-0">
              {customer.status}
            </Badge>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* Service Health Panel */}
          <ServiceHealthPanel customerId={customer.id} />
          
          {/* Account Overview */}
          <Card>
            <CardHeader className="p-1.5 pb-1">
              <CardTitle className="text-[10px] font-medium flex items-center gap-1">
                <DollarSign className="w-2.5 h-2.5" />
                Account Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-1.5 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">Balance</span>
                <span className={`text-[10px] font-medium ${customer.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(customer.balance)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">Monthly</span>
                <span className="text-[10px] font-medium">
                  {formatCurrency(customer.stats?.monthlyRecurring || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">Services</span>
                <span className="text-[10px] font-medium">
                  {customer.stats?.activeServices || 0}/{customer.stats?.totalServices || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader className="p-1.5 pb-1">
              <CardTitle className="text-[10px] font-medium flex items-center gap-1">
                <User className="w-2.5 h-2.5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-1.5 space-y-1">
              {customer.email && (
                <div className="flex items-start gap-1 justify-end">
                  <div className="flex-1 min-w-0 text-right">
                    <a 
                      href={`mailto:${customer.email}`}
                      className="text-[10px] text-primary hover:underline break-all"
                    >
                      {customer.email}
                    </a>
                  </div>
                  <Mail className="w-2.5 h-2.5 mt-0.5 text-muted-foreground" />
                </div>
              )}
              
              {customer.phone && (
                <div className="flex items-start gap-1 justify-end">
                  <div className="flex-1 min-w-0 text-right">
                    <a 
                      href={`tel:${customer.phone}`}
                      className="text-[10px] text-primary hover:underline"
                    >
                      {customer.phone}
                    </a>
                  </div>
                  <Phone className="w-2.5 h-2.5 mt-0.5 text-muted-foreground" />
                </div>
              )}

              {customer.mobile && customer.mobile !== customer.phone && (
                <div className="flex items-start gap-1 justify-end">
                  <div className="flex-1 min-w-0 text-right">
                    <a 
                      href={`tel:${customer.mobile}`}
                      className="text-[10px] text-primary hover:underline"
                    >
                      {customer.mobile}
                    </a>
                  </div>
                  <PhoneCall className="w-2.5 h-2.5 mt-0.5 text-muted-foreground" />
                </div>
              )}

              {customer.address?.full && (
                <div className="flex items-start gap-1 justify-end">
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-[10px] text-muted-foreground break-words leading-relaxed">
                      {customer.address.full}
                    </p>
                  </div>
                  <MapPin className="w-2.5 h-2.5 mt-0.5 text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Internet Services */}
          {customer.services?.internet?.length > 0 && (
            <Card>
              <CardHeader className="p-1.5 pb-1">
                <CardTitle className="text-[10px] font-medium flex items-center gap-1">
                  <Wifi className="w-2.5 h-2.5" />
                  Internet Services ({customer.services?.internet?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1.5 space-y-1">
                {customer.services?.internet?.map((service) => (
                  <div key={service.id} className="p-1 border rounded-sm">
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="text-[10px] font-medium truncate">{service.plan}</span>
                      <Badge 
                        variant={service.status === 'active' ? 'default' : 'secondary'} 
                        className="text-[9px] h-3 px-1 py-0"
                      >
                        {service.status}
                      </Badge>
                    </div>
                    {service.speed && (
                      <p className="text-[9px] text-muted-foreground">{service.speed}</p>
                    )}
                    {service.ipAddress && (
                      <p className="text-[9px] text-muted-foreground">IP: {service.ipAddress}</p>
                    )}
                    <div className="flex justify-between items-center mt-0.5">
                      <span className="text-[9px] text-muted-foreground">
                        {service.startDate ? formatDate(service.startDate) : 'Unknown start'}
                      </span>
                      <span className="text-xs font-medium">
                        {formatCurrency(service.price)}/mo
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
              <CardHeader className="p-1.5 pb-1">
                <CardTitle className="text-[10px] font-medium flex items-center gap-1">
                  <PhoneCall className="w-2.5 h-2.5" />
                  Voice Services ({customer.services?.voice?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {customer.services?.voice?.map((service) => (
                  <div key={service.id} className="p-2 border rounded-md">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-medium truncate">{service.plan}</span>
                      <Badge 
                        variant={service.status === 'active' ? 'default' : 'secondary'} 
                        className="text-xs h-4"
                      >
                        {service.status}
                      </Badge>
                    </div>
                    {service.number && (
                      <p className="text-xs text-muted-foreground">{service.number}</p>
                    )}
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-muted-foreground">Voice Service</span>
                      <span className="text-xs font-medium">
                        {formatCurrency(service.price)}/mo
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Account Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium flex items-center gap-2">
                <Activity className="w-3 h-3" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Customer Since</span>
                <span className="text-xs">{formatDate(customer.dateAdded)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Last Online</span>
                <span className="text-xs">{formatDate(customer.lastOnline)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Category</span>
                <span className="text-xs capitalize">{customer.category}</span>
              </div>
              {customer.billing && (
                <>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Billing Day</span>
                    <span className="text-xs">{customer.billing.billingDay}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Payment Type</span>
                    <span className="text-xs capitalize">{customer.billing.paymentType}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="p-2 border-t space-y-1">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-center text-[10px] h-6"
          onClick={() => window.open(`https://manage.country-connect.co.uk/admin/customers/view?id=${customer.id}`, '_blank')}
        >
          <ExternalLink className="w-2.5 h-2.5 mr-1" />
          View in Splynx
        </Button>
        <div className="grid grid-cols-2 gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-[10px] h-6"
            onClick={() => window.open(`mailto:${customer.email}`, '_blank')}
          >
            <Mail className="w-2.5 h-2.5 mr-1" />
            Email
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-[10px] h-6"
            onClick={() => window.open(`tel:${customer.phone}`, '_blank')}
          >
            <Phone className="w-2.5 h-2.5 mr-1" />
            Call
          </Button>
        </div>
      </div>
    </div>
  );
}