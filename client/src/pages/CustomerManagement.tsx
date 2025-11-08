import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSplynxCustomers, useSplynxCustomer } from "@/hooks/useSplynxData";
import { TransformedCustomer } from "@/lib/splynxTransformers";
import MultiTabWarning from "@/components/MultiTabWarning";
import { 
  Search, 
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Wifi,
  Phone as PhoneIcon,
  Tv,
  CreditCard,
  Download,
  Eye,
  Edit,
  Plus,
  Settings,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  FileText,
  Clock,
  Globe,
  Users,
  ChevronRight,
  Filter,
  SortAsc,
  MoreVertical,
  Grid,
  List,
  Zap
} from "lucide-react";

export default function CustomerManagement() {
  const [location, setLocation] = useLocation();
  const [selectedCustomer, setSelectedCustomer] = useState<TransformedCustomer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TransformedCustomer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load customer data from Splynx
  const { data: customers = [], isLoading, error } = useSplynxCustomers();
  const { data: customerDetail, isLoading: isLoadingDetail } = useSplynxCustomer(selectedCustomer?.id || null);

  // Listen for external customer selection
  useEffect(() => {
    const handleCustomerSearch = (event: any) => {
      const { customerId, customerName } = event.detail;
      
      if (customerId && customers.length > 0) {
        const customer = customers.find(c => c.id === customerId || c.id === customerId.toString());
        if (customer) {
          setSelectedCustomer(customer);
          console.log('Customer found and selected:', customerName);
        }
      }
    };

    window.addEventListener('customerSearch', handleCustomerSearch);
    return () => window.removeEventListener('customerSearch', handleCustomerSearch);
  }, [customers]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(searchQuery);
      }, 1000); // Increased from 300ms to 1000ms to reduce API calls
    } else {
      setSearchMode(false);
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSearch = async (query: string): Promise<void> => {
    if (!query.trim()) {
      setSearchMode(false);
      setSearchResults([]);
      return Promise.resolve();
    }

    setIsSearching(true);
    setSearchMode(true);
    
    try {
      const token = localStorage.getItem('authToken');
      
      if (/^\d+$/.test(query.trim())) {
        const response = await fetch(`/api/customers-live`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const allCustomers = await response.json();
          const customerById = allCustomers.find((c: any) => c.id === query.trim());
          if (customerById) {
            setSearchResults([customerById]);
            return Promise.resolve();
          }
        }
      }
      
      const response = await fetch(`/api/customers/search?email=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const results = await response.json();
      const validResults = Array.isArray(results) ? results : [];
      setSearchResults(validResults);
      return Promise.resolve();
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      return Promise.resolve();
    } finally {
      setIsSearching(false);
    }
  };

  const displayCustomers = searchMode ? searchResults : customers;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading customer data from Splynx...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md saas-card">
          <CardContent className="p-6 text-center space-y-4">
            <div className="p-3 rounded-full bg-destructive/10 w-fit mx-auto">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Connection Error</h2>
              <p className="text-muted-foreground">Unable to connect to Splynx API</p>
              <p className="text-sm text-muted-foreground">
                {error.message.includes('401') ? 
                  'Failed to fetch live customers: 401 Unauthorized' : 
                  error.message
                }
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => window.location.reload()} 
                className="saas-button-primary"
              >
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/strategy/objectives')}
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'saas-badge-success';
      case 'suspended': return 'saas-badge-warning';
      case 'inactive': return 'saas-badge-muted';
      default: return 'saas-badge-muted';
    }
  };

  const getInitials = (name: string) => {
    return (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (selectedCustomer) {
    // Modern customer detail view
    return (
      <div className="min-h-screen bg-background">
        {/* Modern Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="mobile-container">
            <div className="flex h-16 items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedCustomer(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(selectedCustomer.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="heading-compact truncate">{selectedCustomer.fullName}</h1>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(selectedCustomer.status)}>
                      {selectedCustomer.status}
                    </Badge>
                    <span className="text-compact-xs text-muted-foreground">ID: {selectedCustomer.id}</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-compact">
                <Edit className="h-4 w-4 mr-1.5" />
                Edit
              </Button>
            </div>
          </div>
        </header>

        {/* Customer details - modern layout */}
        <div className="mobile-container py-6 space-y-6">
          {/* Contact Information */}
          <Card className="saas-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium truncate">{selectedCustomer.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50">
                    <Phone className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{selectedCustomer.phone}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-50">
                  <MapPin className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium">{selectedCustomer.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account summary card */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    £{Math.abs(selectedCustomer.accountBalance).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedCustomer.accountBalance < 0 ? 'Credit' : 'Due'}
                  </div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {(selectedCustomer.tickets || []).length}
                  </div>
                  <div className="text-xs text-gray-500">Support Tickets</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-11">
              <Phone className="mr-2 h-4 w-4" />
              Call
            </Button>
            <Button variant="outline" className="h-11">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
            <Button variant="outline" className="h-11">
              <MessageSquare className="mr-2 h-4 w-4" />
              Ticket
            </Button>
            <Button variant="outline" className="h-11">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Mobile-optimized customer list view
  return (
    <div className="w-full bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b sticky top-0 z-10 flex-shrink-0">
        <div className="app-container">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation('/strategy/objectives')}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-bold">Customers</h1>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {displayCustomers.length} total
                  </Badge>
                </div>
              </div>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      </header>

      {/* Search bar */}
      <div className="app-container py-4 bg-card border-b flex-shrink-0">
        <MultiTabWarning />
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </div>

      {/* Customer list - responsive grid */}
      <div className="app-container py-2">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm text-gray-500">Searching...</span>
            </div>
          ) : displayCustomers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchMode ? 'No customers found' : 'No customers available'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {displayCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className="bg-white rounded-lg border p-4 hover:shadow-md active:bg-gray-50 cursor-pointer transition-shadow"
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10 bg-blue-500 flex-shrink-0">
                      <AvatarFallback className="text-white text-sm font-medium">
                        {getInitials(customer.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900 text-sm truncate">
                          {customer.fullName}
                        </h3>
                        <Badge className={`text-xs ${getStatusColor(customer.status)}`}>
                          {customer.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-2">{customer.email}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">ID: {customer.id}</span>
                          <span className={`text-xs font-medium ${
                            customer.accountBalance < 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            £{Math.abs(customer.accountBalance).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {customer.accountBalance < 0 ? 'Credit balance' : 'Amount due'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}