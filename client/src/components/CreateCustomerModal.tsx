import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Sparkles, User, Mail, Phone, MapPin, Hash } from 'lucide-react';

const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(8, 'Phone number must be at least 8 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  postcode: z.string().regex(/^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i, 'Please enter a valid UK postcode'),
  city: z.string().min(2, 'City must be at least 2 characters'),
});

type CreateCustomerForm = z.infer<typeof createCustomerSchema>;

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  messages: any[];
  onSuccess: () => void;
}

interface ExtractedData {
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postcode: string | null;
  city: string | null;
  confidence: {
    name: number;
    email: number;
    phone: number;
    address: number;
    postcode: number;
    city: number;
  };
}

export function CreateCustomerModal({ isOpen, onClose, ticketId, messages, onSuccess }: CreateCustomerModalProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const { toast } = useToast();

  const form = useForm<CreateCustomerForm>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      postcode: '',
      city: '',
    },
  });

  // Extract customer data from messages
  const extractDataMutation = useMutation({
    mutationFn: async () => {
      setIsExtracting(true);
      const response = await apiRequest('/api/ai/extract-customer-data', {
        method: 'POST',
        body: { messages }
      });
      return response.json();
    },
    onSuccess: (data: ExtractedData) => {
      setExtractedData(data);
      
      // Pre-populate form with extracted data
      if (data.name) form.setValue('name', data.name);
      if (data.email) form.setValue('email', data.email);
      if (data.phone) form.setValue('phone', data.phone);
      if (data.address) form.setValue('address', data.address);
      if (data.postcode) form.setValue('postcode', data.postcode);
      if (data.city) form.setValue('city', data.city);
      
      const extractedFields = Object.entries(data)
        .filter(([key, value]) => key !== 'confidence' && value !== null)
        .length;
      
      if (extractedFields > 0) {
        toast({
          title: 'Data Extracted',
          description: `Found ${extractedFields} fields from the conversation. Please review and complete the form.`,
        });
      } else {
        toast({
          title: 'No Data Found',
          description: 'No customer information found in the conversation. Please fill out the form manually.',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Extraction Failed',
        description: 'Could not extract customer data. Please fill out the form manually.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsExtracting(false);
    }
  });

  // Create customer
  const createMutation = useMutation({
    mutationFn: async (data: CreateCustomerForm) => {
      const response = await apiRequest('/api/customers/create', {
        method: 'POST',
        body: data
      });
      return response.json();
    },
    onSuccess: async (customer) => {
      // Link the newly created customer to the ticket
      try {
        await apiRequest(`/api/tickets/${ticketId}/link-customer`, {
          method: 'PUT',
          body: { customerId: customer.id.toString() }
        });
        
        toast({
          title: 'Success',
          description: 'Customer created and linked to ticket successfully.',
        });
        onSuccess();
        onClose();
      } catch (error) {
        toast({
          title: 'Customer Created',
          description: 'Customer was created but could not be linked to the ticket. Please link manually.',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'Failed to create customer. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const handleExtractData = () => {
    if (!messages || messages.length === 0) {
      toast({
        title: 'No Messages',
        description: 'No messages available for data extraction.',
        variant: 'destructive',
      });
      return;
    }
    extractDataMutation.mutate();
  };

  const onSubmit = (data: CreateCustomerForm) => {
    createMutation.mutate(data);
  };

  const resetModal = () => {
    form.reset();
    setExtractedData(null);
    setIsExtracting(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Customer</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Extract customer data from conversation or fill manually
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExtractData}
              disabled={isExtracting || extractDataMutation.isPending}
            >
              {isExtracting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {isExtracting ? 'Extracting...' : 'Extract Data'}
            </Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Name
                      {extractedData?.confidence.name && extractedData.confidence.name > 0 && (
                        <span className={`text-xs ${getConfidenceColor(extractedData.confidence.name)}`}>
                          ({Math.round(extractedData.confidence.name * 100)}% confidence)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                      {extractedData?.confidence.email && extractedData.confidence.email > 0 && (
                        <span className={`text-xs ${getConfidenceColor(extractedData.confidence.email)}`}>
                          ({Math.round(extractedData.confidence.email * 100)}% confidence)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                      {extractedData?.confidence.phone && extractedData.confidence.phone > 0 && (
                        <span className={`text-xs ${getConfidenceColor(extractedData.confidence.phone)}`}>
                          ({Math.round(extractedData.confidence.phone * 100)}% confidence)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address
                      {extractedData?.confidence.address && extractedData.confidence.address > 0 && (
                        <span className={`text-xs ${getConfidenceColor(extractedData.confidence.address)}`}>
                          ({Math.round(extractedData.confidence.address * 100)}% confidence)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="postcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Postcode
                        {extractedData?.confidence.postcode && extractedData.confidence.postcode > 0 && (
                          <span className={`text-xs ${getConfidenceColor(extractedData.confidence.postcode)}`}>
                            ({Math.round(extractedData.confidence.postcode * 100)}%)
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="NP10 8XG" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        City
                        {extractedData?.confidence.city && extractedData.confidence.city > 0 && (
                          <span className={`text-xs ${getConfidenceColor(extractedData.confidence.city)}`}>
                            ({Math.round(extractedData.confidence.city * 100)}%)
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter city" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              'Create Customer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}