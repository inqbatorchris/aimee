import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SplynxCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  category: string;
  billing_type: string;
}

interface SplynxClientSelectorProps {
  onClientCreated: () => void;
}

export default function SplynxClientSelector({ onClientCreated }: SplynxClientSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<SplynxCustomer | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Splynx customers with search (handles both ID and text search)
  const { data: splynxCustomers = [], isLoading } = useQuery({
    queryKey: ['/api/customers', { search: searchTerm, limit: 50 }],
    enabled: isDialogOpen && (searchTerm.length > 2 || /^\d+$/.test(searchTerm)),
    staleTime: 2 * 60 * 1000,
  });

  // Create managed services client from Splynx customer
  const createClientMutation = useMutation({
    mutationFn: async (customerData: any) => {
      return apiRequest('POST', '/api/managed-services/clients', {
        splynxCustomerId: customerData.id,
        companyName: customerData.name,
        primaryContactName: customerData.name,
        primaryContactEmail: customerData.email,
        primaryContactPhone: customerData.phone,
        status: 'active',
        industry: 'Business Services',
        broadbandType: 'Unknown',
        routerProvided: false,
        switchProvided: false,
        hasServer: false,
        serverManager: 'customer',
        osStandard: 'Mixed',
        microsoft365Enabled: false,
        antivirusSolution: 'Unknown',
        lineOfBusinessApps: [],
        documentationLinks: []
      });
    },
    onSuccess: () => {
      toast({ title: 'Managed Services client created successfully' });
      setIsDialogOpen(false);
      setSelectedCustomer(null);
      setSearchTerm('');
      queryClient.invalidateQueries({ queryKey: ['/api/managed-services/clients'] });
      onClientCreated();
    },
    onError: () => {
      toast({ title: 'Failed to create client', variant: 'destructive' });
    },
  });

  const handleCreateClient = () => {
    if (selectedCustomer) {
      createClientMutation.mutate(selectedCustomer);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="w-full text-sm h-auto py-2">
          <Plus className="h-4 w-4 mr-2" />
          Add Client from Splynx
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Client from Splynx</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div>
            <Label htmlFor="search">Search Splynx Customers</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Enter customer name, company, or ID (e.g. 1118)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Customer List */}
          {(searchTerm.length > 2 || /^\d+$/.test(searchTerm)) && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Searching Splynx customers...
                </div>
              ) : splynxCustomers.length > 0 ? (
                splynxCustomers.map((customer: SplynxCustomer) => (
                  <Card 
                    key={customer.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedCustomer?.id === customer.id ? 'ring-2 ring-primary' : 'hover:bg-accent'
                    }`}
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Building className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {customer.id} • {customer.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                            {customer.status}
                          </Badge>
                          <Badge variant="outline">
                            {customer.category}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No customers found matching "{searchTerm}". Try searching by name, company, or customer ID.
                </div>
              )}
            </div>
          )}

          {/* Selected Customer Preview */}
          {selectedCustomer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Selected Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div><strong>Company:</strong> {selectedCustomer.name}</div>
                  <div><strong>Email:</strong> {selectedCustomer.email}</div>
                  <div><strong>Phone:</strong> {selectedCustomer.phone}</div>
                  <div><strong>Splynx ID:</strong> {selectedCustomer.id}</div>
                  <div><strong>Status:</strong> {selectedCustomer.status}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateClient}
              disabled={!selectedCustomer || createClientMutation.isPending}
            >
              {createClientMutation.isPending ? 'Creating...' : 'Create Managed Services Client'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}