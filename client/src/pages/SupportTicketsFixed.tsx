import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// Support ticket schemas - simplified for clean architecture
const addMessageSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  isInternal: z.boolean().optional(),
});

const draftSchema = z.object({
  content: z.string().min(1, 'Draft content is required'),
});

type AddMessageForm = z.infer<typeof addMessageSchema>;
type DraftForm = z.infer<typeof draftSchema>;
import { MessageCircle, Plus, Search, Filter, ArrowLeft, User, Phone, Mail, MapPin, Loader2, ChevronLeft, ChevronRight, Eye, Building, Calendar, CreditCard, DollarSign, Info, ChevronDown, X, RotateCcw, ArrowDown, ArrowUp, Send, Sparkles, Maximize2, Minimize2, Save, Clock } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { formatMessage, getEnhancedTimestamp, groupMessages, getMessageStyle, getAuthorBadge } from '@/utils/textFormatting';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CustomerDetailsPanel } from '@/components/CustomerDetailsPanel';
import { CustomerDetailsMobile } from '@/components/CustomerDetailsMobile';
import { ServiceHealthPanel } from '@/components/ServiceHealthPanel';
import ErrorBoundary from '@/components/ErrorBoundary';

interface Ticket {
  id: string;
  subject: string;
  status: string;
  statusId?: string;
  priority: string;
  customerId: string;
  customerName: string;
  createdAt: string;
  updatedAt: string;
  assignedTo: string;
  assignedToName: string;
  category: string;
  messageCount: number;
  slaWarning?: boolean;
}

interface SplynxAdministrator {
  id: number;
  splynxId: number;
  login: string;
  name: string;
  email: string;
  roleName: string;
  phone: string;
  calendarColor: string;
  routerAccess: string;
  isActive: boolean;
}

interface TicketMessage {
  id: string;
  ticketId: string;
  message: string;
  authorName: string;
  authorType: string;
  createdAt: string;
  isInternal: boolean;
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

// Status options for tickets
const STATUS_OPTIONS = [
  { value: 'waiting_on_customer', label: 'Waiting on Customer', color: 'bg-blue-100 text-blue-800' },
  { value: 'new', label: 'New', color: 'bg-gray-100 text-gray-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'waiting_on_agent', label: 'Waiting on Agent', color: 'bg-orange-100 text-orange-800' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-800' }
];

// Status options for the send button dropdown - matches Splynx status IDs
const SEND_STATUS_OPTIONS = [
  { value: '1', label: 'Send and set as New' },
  { value: '2', label: 'Send and set as Work in progress' },
  { value: '3', label: 'Send and set as Resolved' },
  { value: '5', label: 'Send and set as Waiting on customer' },
  { value: '6', label: 'Send and set as Waiting on agent' },
  { value: '7', label: 'Send and set as Site Visit Required' },
  { value: '8', label: 'Send and set as Monitoring' },
  { value: '9', label: 'Send and set as Engineer Assigned' },
  { value: '11', label: 'Send and set as Sales in progress' },
  { value: '12', label: 'Send and set as Awaiting response' },
  { value: '14', label: 'Send and set as Resolved, unconfirmed' },
];

const createTicketSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type CreateTicketForm = z.infer<typeof createTicketSchema>;

export default function SupportTickets() {
  const [location] = useLocation();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'detail' | 'customer'>('list');
  const [showCustomerPanel, setShowCustomerPanel] = useState(false);
  
  // Initialize filter state from URL parameters
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'open');
  const [ticketStatusFilter, setTicketStatusFilter] = useState(searchParams.get('ticketStatus') || 'all');
  const [assignedUserFilter, setAssignedUserFilter] = useState(searchParams.get('assignedTo') || 'all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Message enhancement states
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [textareaHeight, setTextareaHeight] = useState(40);
  const [isTextareaExpanded, setIsTextareaExpanded] = useState(false);
  const [maxTextareaHeight, setMaxTextareaHeight] = useState(120);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  
  const { toast } = useToast();
  
  // Customer linking callback
  const handleCustomerLinked = () => {
    // Refresh customer data and ticket data
    if (selectedTicket) {
      queryClient.invalidateQueries({ queryKey: ['/api/customers/details', selectedTicket.customerId] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
    }
  };

  // Draft state management
  const [draftContent, setDraftContent] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Draft queries and mutations
  const { data: existingDraft } = useQuery({
    queryKey: [`/api/tickets/${selectedTicket?.id}/draft`],
    enabled: !!selectedTicket?.id,
  });

  const saveDraftMutation = useMutation({
    mutationFn: async (draftData: any) => {
      const response = await fetch(`/api/tickets/${selectedTicket?.id}/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draftData),
      });
      if (!response.ok) throw new Error('Failed to save draft');
      return response.json();
    },
    onSuccess: () => {
      setLastAutoSave(new Date());
      setIsDraftSaving(false);
      setHasDraft(true);
    },
    onError: () => {
      setIsDraftSaving(false);
    }
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tickets/${selectedTicket?.id}/draft`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete draft');
      return response.json();
    },
    onSuccess: () => {
      setHasDraft(false);
      setDraftContent('');
    }
  });

  // Calculate active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (statusFilter !== 'open') count++;
    if (ticketStatusFilter !== 'all') count++; // Default is "All"
    if (assignedUserFilter !== 'all') count++;
    if (fromDate) count++;
    if (toDate) count++;
    return count;
  };

  // Reset all filters
  const resetFilters = () => {
    setStatusFilter('open');
    setTicketStatusFilter('all'); // Reset to "All"
    setAssignedUserFilter('all');
    setFromDate('');
    setToDate('');
  };

  // Check for mobile screen size and update textarea max height
  useEffect(() => {
    const updateViewportSettings = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      // Calculate available space for textarea on mobile
      if (mobile) {
        const viewportHeight = window.innerHeight;
        // Reserve space for: compact header (48px), form fields (~100px), buttons (~60px), padding (~30px)
        const reservedSpace = 238;
        const availableSpace = viewportHeight - reservedSpace;
        // Use 70% of available space, with min 120px and max 450px for better mobile experience
        const newMaxHeight = Math.min(450, Math.max(120, Math.floor(availableSpace * 0.7)));
        setMaxTextareaHeight(newMaxHeight);
      } else {
        setMaxTextareaHeight(120);
      }
      
      // Adjust current textarea height if it exceeds new max
      if (textareaHeight > maxTextareaHeight) {
        setTextareaHeight(Math.min(textareaHeight, maxTextareaHeight));
      }
    };
    
    updateViewportSettings();
    window.addEventListener('resize', updateViewportSettings);
    return () => window.removeEventListener('resize', updateViewportSettings);
  }, [textareaHeight, maxTextareaHeight]);

  // Handle URL parameter changes for dashboard navigation
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const urlTicketStatus = params.get('ticketStatus');
    
    if (urlTicketStatus && urlTicketStatus !== ticketStatusFilter) {
      setTicketStatusFilter(urlTicketStatus);
    }
  }, [location]);

  // Clear draft on successful message send
  const clearDraft = () => {
    if (selectedTicket?.id) {
      deleteDraftMutation.mutate();
    }
  };

  const ticketsQuery = useQuery({
    queryKey: ['/api/tickets', { 
      status: statusFilter,
      ticketStatus: ticketStatusFilter,
      assignedTo: assignedUserFilter,
      fromDate: fromDate,
      toDate: toDate,
      limit: 20,
      offset: 0
    }],
  });

  const ticketsData = ticketsQuery.data;
  const ticketsLoading = ticketsQuery.isLoading;

  // Handle both direct array and wrapped object responses
  const extractedTickets = Array.isArray(ticketsData) 
    ? ticketsData 
    : ((ticketsData as any)?.tickets && Array.isArray((ticketsData as any).tickets)) 
      ? (ticketsData as any).tickets 
      : [];

  // Process and sort tickets by date based on sortOrder
  const currentTickets = extractedTickets.sort((a: Ticket, b: Ticket) => {
    const dateA = new Date(a.updatedAt || a.createdAt);
    const dateB = new Date(b.updatedAt || b.createdAt);
    
    if (sortOrder === 'newest') {
      return dateB.getTime() - dateA.getTime(); // Newest first
    } else {
      return dateA.getTime() - dateB.getTime(); // Oldest first
    }
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: [`/api/tickets/${selectedTicket?.id}/messages`],
    enabled: !!selectedTicket,
    refetchInterval: 10000, // Refetch every 10 seconds to get new messages
    refetchIntervalInBackground: false, // Don't refetch when tab is not active
  });

  // Query for assignable administrators (filtered by user permissions)
  const { data: administrators = [], isLoading: administratorsLoading } = useQuery<SplynxAdministrator[]>({
    queryKey: ['/api/splynx-administrators'],
  });

  // Mutation for syncing Splynx administrators
  const syncAdministratorsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/sync/splynx-administrators', {
        method: 'POST',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/splynx-administrators'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assignable-administrators'] });
      toast({
        title: "Success",
        description: "Splynx administrators synced successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync administrators",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating ticket assignment
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ ticketId, assignTo }: { ticketId: string; assignTo: number }) => {
      const response = await apiRequest(`/api/tickets/${ticketId}/assignment`, {
        method: 'PATCH',
        body: { assignTo },
      });
      
      // Handle null response from Splynx API (null indicates successful update)
      const text = await response.text();
      try {
        return text && text !== 'null' && text.trim() !== '' ? JSON.parse(text) : { success: true };
      } catch (parseError) {
        // If JSON parsing fails, treat as successful assignment
        console.log('Assignment response parsing failed, treating as success:', text);
        return { success: true };
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate all ticket queries to ensure real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      
      // Also update the selected ticket directly for immediate UI feedback
      if (selectedTicket && selectedTicket.id === variables.ticketId) {
        const updatedTicket = { 
          ...selectedTicket, 
          assignedTo: variables.assignTo.toString(),
          assignedToName: administrators.find(admin => admin.splynxId === variables.assignTo)?.name || 'Unknown'
        };
        setSelectedTicket(updatedTicket);
      }
      
      toast({
        title: "Assignment Updated",
        description: "Ticket assignment updated successfully",
      });
    },
    onError: (error: any) => {
      console.error('Assignment error details:', error);
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to update ticket assignment",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating ticket status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, statusId }: { ticketId: string; statusId: string }) => {
      const response = await apiRequest(`/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        body: { status: statusId },
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate all ticket queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      
      // Update the selected ticket directly for immediate UI feedback
      if (selectedTicket && selectedTicket.id === variables.ticketId) {
        // Map status ID to status name for UI display
        const statusMap: Record<string, string> = {
          '1': 'new',
          '2': 'in_progress', 
          '3': 'resolved',
          '5': 'waiting_on_customer',
          '6': 'waiting_on_agent',
          '7': 'site_visit_required',
          '8': 'monitoring',
          '9': 'engineer_assigned',
          '11': 'sales_in_progress',
          '12': 'awaiting_response',
          '14': 'resolved_unconfirmed'
        };
        
        const updatedTicket = { 
          ...selectedTicket, 
          status: statusMap[variables.statusId] || 'new',
          statusId: variables.statusId
        };
        setSelectedTicket(updatedTicket);
      }
      
      toast({
        title: "Status Updated",
        description: "Ticket status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Status Update Failed",
        description: error.message || "Failed to update ticket status",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to latest messages
  useEffect(() => {
    if (Array.isArray(messages) && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Group messages for better display
  const groupedMessages = useMemo(() => {
    if (!Array.isArray(messages)) return [];
    return groupMessages(messages as TicketMessage[]);
  }, [messages]);

  const messageForm = useForm<AddMessageForm>({
    resolver: zodResolver(addMessageSchema),
    defaultValues: {
      subject: '',
      to: '',
      cc: '',
      bcc: '',
      message: '',
      isInternal: false,
      newStatus: 'waiting_on_customer',
      newStatusId: '5', // Default to 'Waiting on customer' (status ID 5)
      saveAsDraft: false,
    },
  });

  // Remove auto-save functionality as requested

  // Load existing draft when ticket changes
  useEffect(() => {
    if (existingDraft && selectedTicket?.id) {
      const draft = existingDraft as any;
      messageForm.setValue('subject', draft.subject || '');
      messageForm.setValue('to', draft.toEmail || '');
      messageForm.setValue('cc', draft.ccEmails || '');
      messageForm.setValue('bcc', draft.bccEmails || '');
      messageForm.setValue('message', draft.message || '');
      messageForm.setValue('isInternal', draft.isInternal || false);
      messageForm.setValue('newStatus', draft.newStatus || 'waiting_on_customer');
      messageForm.setValue('newStatusId', draft.newStatusId || '5');
      setHasDraft(true);
    }
  }, [existingDraft, selectedTicket?.id, messageForm]);

  // Remove auto-save watchers

  const addMessageMutation = useMutation({
    mutationFn: async (data: AddMessageForm) => {
      if (!selectedTicket?.customerId) {
        throw new Error('No customer ID available');
      }
      
      const requestData = {
        ...data,
        customer_id: selectedTicket.customerId,
      };
      
      const response = await fetch(`/api/tickets/${selectedTicket?.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || 'Failed to add message';
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: async (result, variables) => {
      // Reset the form immediately
      messageForm.reset();
      clearDraft();
      
      // Immediately invalidate and refetch messages query to refresh message list
      await queryClient.invalidateQueries({ queryKey: [`/api/tickets/${selectedTicket?.id}/messages`] });
      // Add a small delay to ensure the backend has processed the message
      setTimeout(() => {
        console.log('Refetching messages for ticket:', selectedTicket?.id);
        queryClient.refetchQueries({ queryKey: [`/api/tickets/${selectedTicket?.id}/messages`] });
      }, 500);
      
      // Invalidate tickets query to refresh ticket list with updated status
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      
      // Also optimistically update the tickets cache for immediate UI feedback
      if (selectedTicket && variables.newStatusId && variables.newStatusId !== 'no_change') {
        const statusMap: Record<string, string> = {
          '1': 'new',
          '2': 'in_progress', 
          '3': 'resolved',
          '5': 'waiting_on_customer',
          '6': 'waiting_on_agent',
          '7': 'site_visit_required',
          '8': 'monitoring',
          '9': 'engineer_assigned',
          '11': 'sales_in_progress',
          '12': 'awaiting_response',
          '14': 'resolved_unconfirmed'
        };
        
        queryClient.setQueryData(['/api/tickets'], (oldData: any) => {
          if (!oldData || !Array.isArray(oldData)) return oldData;
          return oldData.map((ticket: any) => 
            ticket.id === selectedTicket.id 
              ? { 
                  ...ticket, 
                  status: statusMap[variables.newStatusId!] || ticket.status,
                  statusId: variables.newStatusId
                }
              : ticket
          );
        });
      }
      
      // Update the selected ticket's status immediately for instant UI feedback
      if (selectedTicket && variables.newStatusId && variables.newStatusId !== 'no_change') {
        const statusMap: Record<string, string> = {
          '1': 'new',
          '2': 'in_progress', 
          '3': 'resolved',
          '5': 'waiting_on_customer',
          '6': 'waiting_on_agent',
          '7': 'site_visit_required',
          '8': 'monitoring',
          '9': 'engineer_assigned',
          '11': 'sales_in_progress',
          '12': 'awaiting_response',
          '14': 'resolved_unconfirmed'
        };
        
        const updatedTicket = { 
          ...selectedTicket, 
          status: statusMap[variables.newStatusId] || selectedTicket.status,
          statusId: variables.newStatusId
        };
        setSelectedTicket(updatedTicket);
      }
      
      setTextareaHeight(40);
      toast({
        title: 'Success',
        description: 'Message added successfully',
      });
    },
    onError: (error: any) => {
      console.error('Message send error:', error);
      const errorMessage = error.message || 'Failed to add message';
      
      // Provide specific guidance for common errors
      let description = errorMessage;
      if (errorMessage.includes('not linked to a Splynx admin account')) {
        description = 'Your account needs to be linked to a Splynx administrator. Please contact your system administrator to resolve this issue.';
      } else if (errorMessage.includes('Splynx API error')) {
        description = 'There was an issue connecting to the messaging system. Please try again or contact support if the problem persists.';
      }
      
      toast({
        title: 'Message Send Failed',
        description: description,
        variant: 'destructive',
      });
    },
  });

  const generateAIResponseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTicket) throw new Error('No ticket selected');
      
      // Get current message content to use as human notes
      const currentMessage = messageForm.getValues('message');
      const humanNotes = currentMessage?.trim() || undefined;
      
      return apiRequest('/api/ai/generate-response', {
        method: 'POST',
        body: {
          customerId: selectedTicket.customerId,
          ticketSubject: selectedTicket.subject,
          ticketMessages: Array.isArray(messages) ? messages : [],
          customPrompt: null,
          humanNotes,
        }
      }).then(response => response.json());
    },
    onSuccess: (data) => {
      // Store if human notes were used before overwriting the textarea
      const hadHumanNotes = messageForm.getValues('message')?.trim().length > 0;
      
      messageForm.setValue('message', data.response);
      
      // Calculate height for AI response using dynamic max height
      const estimatedHeight = data.response.split('\n').length * 20;
      const newHeight = Math.min(maxTextareaHeight, Math.max(40, estimatedHeight));
      setTextareaHeight(newHeight);
      
      toast({
        title: hadHumanNotes ? 'Enhanced AI Response Generated' : 'AI Response Generated',
        description: hadHumanNotes ? 'AI incorporated your notes - review and edit before sending' : 'Review and edit the response before sending',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate AI response',
        variant: 'destructive',
      });
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTicket) throw new Error('No ticket selected');
      
      const response = await fetch('/api/tickets/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ticketId: selectedTicket.id,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to close ticket');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Ticket Closed',
        description: 'The ticket has been successfully closed and marked as resolved',
      });
      
      // Refresh the tickets list
      ticketsQuery.refetch();
      
      // For mobile: return to list view
      if (isMobile) {
        setMobileView('list');
      }
      
      // Clear selected ticket if it was closed
      setSelectedTicket(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to close ticket',
        variant: 'destructive',
      });
    },
  });



  const handleAddMessage = (data: AddMessageForm) => {
    addMessageMutation.mutate(data);
  };

  // Handle textarea auto-resize and draft saving with viewport-aware max height
  const handleTextareaChange = (field: any) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    field.onChange(e);
    
    // Auto-resize textarea with dynamic max height
    const textarea = e.target;
    textarea.style.height = 'auto';
    
    const minHeight = isMobile ? 60 : 40;
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxTextareaHeight);
    setTextareaHeight(newHeight);
    textarea.style.height = `${newHeight}px`;
    
    // Remove auto-save functionality as requested
  };

  // Handle Enter key behavior - Enter creates new line, Cmd/Ctrl+Enter sends message
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      messageForm.handleSubmit(handleAddMessage)();
    }
    // Regular Enter key creates new line (default behavior)
  };

  const handleTicketSelect = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setSelectedCustomerId(ticket.customerId);
    
    if (isMobile) {
      setMobileView('detail');
    } else {
      setShowCustomerPanel(true);
    }
  };

  const handleBackToList = () => {
    setMobileView('list');
    setSelectedTicket(null);
    setSelectedCustomerId(null);
  };

  const handleShowCustomer = () => {
    if (isMobile) {
      // Only switch to customer view if we have a valid customer ID
      if (selectedCustomerId && selectedCustomerId !== '0') {
        setMobileView('customer');
      } else {
        toast({
          title: "Customer Information Unavailable",
          description: "Customer details cannot be displayed at this time. Please try selecting a different ticket.",
          variant: "destructive",
        });
      }
    }
  };

  // Fetch customer details using React Query with session authentication
  const { data: customer, isLoading: customerLoading, error: customerError } = useQuery<CustomerDetails>({
    queryKey: [`/api/customers/${selectedCustomerId}`],
    enabled: !!selectedCustomerId && selectedCustomerId !== '0',
    queryFn: async () => {
      // Add timeout for mobile devices
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const response = await fetch(`/api/customers/${selectedCustomerId}`, {
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch customer data'}`);
        }
        
        return response.json();
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please check your connection and try again');
        }
        throw error;
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on timeout or 404 errors
      if (error.message.includes('timeout') || error.message.includes('404')) return false;
      return failureCount < 2;
    },
    retryDelay: 1000,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });

  // Update form values when ticket or customer changes
  useEffect(() => {
    if (selectedTicket && customer) {
      messageForm.setValue('subject', `Re: ${selectedTicket.subject}`);
      messageForm.setValue('to', (customer as CustomerDetails).email || '');
    }
  }, [selectedTicket, customer, messageForm]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'waiting_response': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // Map status string to Splynx status ID
  const getStatusId = (status: string): string => {
    const statusToIdMap: Record<string, string> = {
      'new': '1',
      'in_progress': '2',
      'resolved': '3',
      'waiting_on_customer': '5',
      'waiting_on_agent': '6',
      'site_visit_required': '7',
      'monitoring': '8',
      'engineer_assigned': '9',
      'sales_in_progress': '11',
      'awaiting_response': '12',
      'resolved_unconfirmed': '14'
    };
    return statusToIdMap[status] || '1';
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Handle both direct array and wrapped object responses


  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {isMobile ? (
        <div className="flex-1 flex flex-col min-h-0 mobile-container overflow-hidden">
          {/* Mobile Header */}
          <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
            <div className="flex h-12 items-center px-2">
              {mobileView !== 'list' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToList}
                  className="mr-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              
              <h1 className="text-lg font-semibold">
                {mobileView === 'list' ? 'Support Tickets' : 
                 mobileView === 'detail' ? 'Ticket Details' : 
                 'Customer Details'}
              </h1>
            </div>
          </header>

          {/* Mobile Content */}
          {mobileView === 'list' && (
            <div className="flex-1 flex flex-col min-h-0 w-full max-w-full overflow-hidden">
              {/* Mobile Tickets List */}
              <div className="px-1 py-1 w-full max-w-full overflow-hidden">
                
                {/* Mobile Filter Panel */}
                <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
                  <CollapsibleTrigger className="w-full p-2 bg-gray-50 border rounded-md hover:bg-gray-100 transition-colors mb-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Filter className="w-3 h-3" />
                        <span className="text-xs font-medium">Filters</span>
                        {getActiveFilterCount() > 0 && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">
                            {getActiveFilterCount()}
                          </Badge>
                        )}
                      </div>
                      <ChevronDown className={`w-3 h-3 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-2 bg-gray-50 border rounded-md mb-2">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {/* Status & Workflow */}
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Status</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Ticket Status</label>
                        <Select value={ticketStatusFilter} onValueChange={setTicketStatusFilter}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="1">New</SelectItem>
                            <SelectItem value="2">Work in progress</SelectItem>
                            <SelectItem value="3">Resolved</SelectItem>
                            <SelectItem value="5">Waiting on customer</SelectItem>
                            <SelectItem value="6">Waiting on agent</SelectItem>
                            <SelectItem value="7">Site Visit Required</SelectItem>
                            <SelectItem value="8">Monitoring</SelectItem>
                            <SelectItem value="9">Engineer Assigned</SelectItem>
                            <SelectItem value="11">Sales in progress</SelectItem>
                            <SelectItem value="12">Awaiting response</SelectItem>
                            <SelectItem value="14">Resolved, unconfirmed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>



                    {/* Compact Date Range and Controls - Mobile */}
                    <div className="flex items-center gap-1 mb-2">
                      <div className="flex-1">
                        <Input 
                          type="date" 
                          value={fromDate} 
                          onChange={(e) => setFromDate(e.target.value)}
                          className="h-6 text-[10px]"
                          placeholder="From"
                        />
                      </div>
                      <div className="flex-1">
                        <Input 
                          type="date" 
                          value={toDate} 
                          onChange={(e) => setToDate(e.target.value)}
                          className="h-6 text-[10px]"
                          placeholder="To"
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={resetFilters}
                        className="h-6 w-6 p-0"
                        title="Reset filters"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                        className="h-6 w-6 p-0"
                        title={`Sort ${sortOrder === 'newest' ? 'oldest first' : 'newest first'}`}
                      >
                        {sortOrder === 'newest' ? 
                          <ArrowDown className="w-3 h-3" /> : 
                          <ArrowUp className="w-3 h-3" />
                        }
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              <ScrollArea className="flex-1 px-1 w-full max-w-full overflow-hidden">
                <div className="space-y-2 pb-2 w-full max-w-full overflow-hidden">
                  {ticketsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : currentTickets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No tickets found</h3>
                      <p className="text-sm">Create your first support ticket</p>
                    </div>
                  ) : (
                    currentTickets.map((ticket: Ticket) => (
                      <Card key={ticket.id} className="cursor-pointer hover:shadow-md transition-shadow mobile-card">
                        <CardContent className="p-2 mobile-card" onClick={() => handleTicketSelect(ticket)}>
                          <div className="mobile-flex justify-between items-start mb-1 gap-2">
                            <h3 className="text-sm font-semibold mobile-text flex-1 leading-tight">{ticket.subject}</h3>
                            <Badge className={`text-[9px] px-1 py-0.5 flex-shrink-0 whitespace-nowrap ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority.charAt(0).toUpperCase()}
                            </Badge>
                          </div>
                          <div className="mobile-flex items-center justify-between mb-1 gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xs text-muted-foreground mobile-text flex-1">
                                {ticket.customerName}
                              </span>
                              {ticket.slaWarning && (
                                <Badge className="text-[9px] px-1.5 py-0.5 bg-orange-100 text-orange-800 flex-shrink-0 whitespace-nowrap">
                                  SLA Warning
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="mobile-flex justify-between items-center gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <Badge className={`text-[9px] px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap font-medium ${getStatusColor(ticket.status)}`}>
                                {ticket.status.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {ticket.messageCount} msg
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                              {formatRelativeTime(ticket.updatedAt)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Mobile Ticket Details */}
          {mobileView === 'detail' && selectedTicket && (
            <div className="flex-1 flex flex-col min-h-0 pb-safe">
              {/* Ultra-compact mobile header */}
              <div className="flex items-center justify-between p-2 border-b bg-gray-50 h-12">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleBackToList}
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate leading-tight">{selectedTicket.subject}</div>
                    <div className="text-[10px] text-gray-500 truncate leading-tight">
                      {selectedTicket.customerName.length > 20 
                        ? `${selectedTicket.customerName.substring(0, 17)}...`
                        : selectedTicket.customerName
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Badge className={`text-[8px] px-1 py-0 whitespace-nowrap ${getPriorityColor(selectedTicket.priority)}`}>
                    {selectedTicket.priority.charAt(0).toUpperCase()}
                  </Badge>
                  {/* Mobile Assignment Control */}
                  <Select 
                    value={selectedTicket.assignedTo || "unassigned"} 
                    onValueChange={(value) => {
                      if (value !== "unassigned" && value !== "sync") {
                        updateAssignmentMutation.mutate({
                          ticketId: selectedTicket.id,
                          assignTo: parseInt(value)
                        });
                      } else if (value === "sync") {
                        syncAdministratorsMutation.mutate();
                      }
                    }}
                    disabled={updateAssignmentMutation.isPending}
                  >
                    <SelectTrigger className="h-6 text-[8px] border-0 bg-transparent p-1 w-auto min-w-[60px]">
                      <User className="w-3 h-3" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      <Separator />
                      {(administrators || []).map((admin: SplynxAdministrator) => (
                        <SelectItem key={admin.splynxId} value={admin.splynxId.toString()}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: admin.calendarColor || '#6b7280' }}
                            />
                            <span className="text-xs">{admin.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <Separator />
                      <SelectItem value="sync" className="text-blue-600">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="w-3 h-3" />
                          <span className="text-xs">Sync</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleShowCustomer}
                    className="h-8 w-8 p-0 flex-shrink-0"
                    title="View Customer"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-2 space-y-2">
                  {messagesLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : groupedMessages.map((messageGroup, groupIndex) => (
                    <div key={groupIndex} className="space-y-1">
                      {messageGroup.map((message: TicketMessage, messageIndex) => {
                        const timestamp = getEnhancedTimestamp(message.createdAt);
                        const authorBadge = getAuthorBadge(message.authorType);
                        const isFirstInGroup = messageIndex === 0;
                        
                        return (
                          <div key={message.id} className={`max-w-[85%] ${
                            message.authorType === 'customer' || message.authorType === 'incoming' 
                              ? 'ml-0 mr-auto' 
                              : 'ml-auto mr-0'
                          }`}>
                            {isFirstInGroup && (
                              <div className="flex items-center gap-2 mb-1 px-1">
                                <span className="font-medium text-xs">{message.authorName}</span>
                                <Badge variant={authorBadge.variant} className="text-[9px] px-1 py-0">
                                  {authorBadge.text}
                                </Badge>
                                <span 
                                  className="text-[9px] text-muted-foreground cursor-help" 
                                  title={timestamp.absolute}
                                >
                                  {timestamp.relative}
                                </span>
                              </div>
                            )}
                            <div className={getMessageStyle(message.authorType, message.isInternal)}>
                              <div className="font-sans text-xs leading-relaxed break-words space-y-2">
                                {formatMessage(message.message).split('\n\n').map((paragraph, idx) => (
                                  <p key={idx} className="whitespace-pre-wrap m-0">
                                    {paragraph}
                                  </p>
                                ))}
                              </div>
                              {message.isInternal && !isFirstInGroup && (
                                <Badge variant="secondary" className="mt-2 text-[9px] px-1 py-0">Internal Note</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Enhanced Message Input - Mobile Optimized Layout */}
              <div className="border-t bg-background flex-shrink-0 flex flex-col" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <Form {...messageForm}>
                  <form onSubmit={messageForm.handleSubmit(handleAddMessage)} className="flex flex-col">
                    {/* Compact form fields */}
                    <div className="p-2 md:p-3 overflow-y-auto max-h-[60vh]">
                      <div className="space-y-1.5 md:space-y-2">
                        {/* Subject field */}
                        <FormField
                          control={messageForm.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  {...field}
                                  placeholder="Subject: Re: [Ticket Subject]"
                                  className="text-xs h-8 touch-manipulation"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Ultra-compact form layout */}
                        <div>
                          {/* Desktop: Full form with all fields */}
                          <div className="hidden md:block space-y-1">
                            <FormField
                              control={messageForm.control}
                              name="to"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      {...field}
                                      placeholder="To: customer@email.com"
                                      className="text-xs h-7 bg-gray-50"
                                      readOnly
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-1">
                              <FormField
                                control={messageForm.control}
                                name="cc"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input 
                                        {...field}
                                        placeholder="CC: optional"
                                        className="text-xs h-7"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={messageForm.control}
                                name="bcc"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input 
                                        {...field}
                                        placeholder="BCC: optional"
                                        className="text-xs h-7"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                          
                          {/* Mobile: Ultra-minimal - only "To" field, very compact */}
                          <div className="md:hidden mb-1">
                            <FormField
                              control={messageForm.control}
                              name="to"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      {...field}
                                      placeholder="To: customer@email.com"
                                      className="text-sm h-7 bg-gray-50 text-gray-600 border-0 px-2 rounded"
                                      readOnly
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Message textarea */}
                        <div className="w-full">
                          <FormField
                            control={messageForm.control}
                            name="message"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Add notes/instructions here, then click AI to enhance response, or leave blank for standard generation..." 
                                    className="resize-none border-2 focus:border-blue-400 transition-colors w-full leading-relaxed"
                                    style={{ 
                                      height: `${textareaHeight}px`, 
                                      minHeight: isMobile ? '80px' : '40px', 
                                      maxHeight: `${maxTextareaHeight}px`,
                                      fontSize: isMobile ? '14px !important' : '14px',
                                      lineHeight: '1.4'
                                    }}
                                    onChange={handleTextareaChange(field)}
                                    onKeyDown={handleKeyDown}
                                    value={field.value}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Ultra-compact button area */}
                    <div className="p-1.5 md:p-3 border-t bg-background flex-shrink-0">
                      {/* Single-row button layout for all devices */}
                      <div className="space-y-1">
                        {/* Single row with all controls: [AI][Save][Status][Send] */}
                        <div className="flex items-center gap-1.5">
                          {/* AI Button */}
                          <Button 
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={generateAIResponseMutation.isPending || !selectedTicket}
                            onClick={() => generateAIResponseMutation.mutate()}
                            className="h-8 w-8 shrink-0 flex items-center justify-center touch-manipulation"
                            title="Generate AI Response"
                          >
                            {generateAIResponseMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                          </Button>
                          
                          {/* Save Button */}
                          <Button 
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!messageForm.watch('message').trim() || saveDraftMutation.isPending}
                            onClick={() => {
                              const formData = messageForm.getValues();
                              saveDraftMutation.mutate(formData);
                              toast({
                                title: 'Draft Saved',
                                description: 'Your message has been saved as a draft',
                              });
                            }}
                            className="h-8 w-8 shrink-0 flex items-center justify-center touch-manipulation"
                            title="Save Draft"
                          >
                            {saveDraftMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3" />
                            )}
                          </Button>
                          
                          {/* Status Dropdown - Compact */}
                          <FormField
                            control={messageForm.control}
                            name="newStatus"
                            render={({ field }) => (
                              <FormItem className="flex-1 min-w-0">
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-8 text-xs bg-blue-50 border-blue-200 px-2 text-left">
                                      <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {STATUS_OPTIONS.map((status) => (
                                      <SelectItem key={status.value} value={status.value}>
                                        <div className="flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full ${status.color.split(' ')[0]}`} />
                                          {status.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          
                          {/* Send Button - Prominent */}
                          <Button 
                            type="submit" 
                            size="sm"
                            disabled={addMessageMutation.isPending || !messageForm.watch('message').trim()}
                            className="h-8 px-3 shrink-0 bg-blue-600 hover:bg-blue-700 flex items-center gap-1 touch-manipulation font-medium"
                          >
                            {addMessageMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span className="text-xs">Send</span>
                          </Button>
                        </div>
                        
                        {/* Minimal footer inline with buttons */}
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <FormField
                              control={messageForm.control}
                              name="isInternal"
                              render={({ field }) => (
                                <FormItem className="flex items-center gap-1">
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value}
                                      onChange={field.onChange}
                                      className="rounded border w-3 h-3"
                                    />
                                  </FormControl>
                                  <label className="text-xs whitespace-nowrap">Internal</label>
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={closeTicketMutation.isPending || !selectedTicket}
                              onClick={() => closeTicketMutation.mutate()}
                              className="h-6 px-2 text-xs bg-red-600 text-white hover:bg-red-700 border-red-600"
                            >
                              {closeTicketMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                'Close'
                              )}
                            </Button>
                          </div>
                          {hasDraft && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <Clock className="w-3 h-3" />
                              <span>Draft</span>
                            </div>
                          )}
                          <span className="flex-shrink-0">{messageForm.watch('message').length}/2000</span>
                        </div>
                      </div>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          )}


        </div>
      ) : (
        // Desktop Layout - Three Panel System with Resizable Panels
        <div className="flex-1 flex h-full overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Left Panel - Ticket List */}
            <ResizablePanel defaultSize={showCustomerPanel ? 25 : 35} minSize={20} maxSize={40}>
              <div className="h-full border-r flex flex-col bg-background overflow-hidden">
            <div className="px-2 py-2 border-b bg-background">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <h1 className="text-sm font-medium">Support Tickets</h1>
                  <p className="text-[10px] text-muted-foreground">Manage customer support requests</p>
                </div>

              </div>
            </div>

            {/* Filter Panel */}
            <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
              <CollapsibleTrigger className="w-full p-2 bg-gray-50 border-b hover:bg-gray-100 transition-colors">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3 h-3" />
                    <span className="text-xs font-medium">Filters</span>
                    {getActiveFilterCount() > 0 && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">
                        {getActiveFilterCount()}
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className={`w-3 h-3 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-2 bg-gray-50 border-b">
                <div className="grid grid-cols-1 gap-2 mb-3">
                  {/* Status Filter */}
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ticket Status Filter */}
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Ticket Status</label>
                    <Select value={ticketStatusFilter} onValueChange={setTicketStatusFilter}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="1">New</SelectItem>
                        <SelectItem value="2">Work in progress</SelectItem>
                        <SelectItem value="3">Resolved</SelectItem>
                        <SelectItem value="5">Waiting on customer</SelectItem>
                        <SelectItem value="6">Waiting on agent</SelectItem>
                        <SelectItem value="7">Site Visit Required</SelectItem>
                        <SelectItem value="8">Monitoring</SelectItem>
                        <SelectItem value="9">Engineer Assigned</SelectItem>
                        <SelectItem value="11">Sales in progress</SelectItem>
                        <SelectItem value="12">Awaiting response</SelectItem>
                        <SelectItem value="14">Resolved, unconfirmed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Assigned User Filter */}
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Assigned To</label>
                    <Select value={assignedUserFilter} onValueChange={setAssignedUserFilter}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {administrators.map((admin) => (
                          <SelectItem key={admin.splynxId} value={admin.splynxId.toString()}>
                            {admin.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Compact Date Range and Controls */}
                  <div className="flex items-center gap-1">
                    <div className="flex-1">
                      <Input 
                        type="date" 
                        value={fromDate} 
                        onChange={(e) => setFromDate(e.target.value)}
                        className="h-6 text-[10px]"
                        placeholder="From"
                      />
                    </div>
                    <div className="flex-1">
                      <Input 
                        type="date" 
                        value={toDate} 
                        onChange={(e) => setToDate(e.target.value)}
                        className="h-6 text-[10px]"
                        placeholder="To"
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={resetFilters}
                      className="h-6 w-6 p-0"
                      title="Reset filters"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                      className="h-6 w-6 p-0"
                      title={`Sort ${sortOrder === 'newest' ? 'oldest first' : 'newest first'}`}
                    >
                      {sortOrder === 'newest' ? 
                        <ArrowDown className="w-3 h-3" /> : 
                        <ArrowUp className="w-3 h-3" />
                      }
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {ticketsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : currentTickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <h3 className="text-sm font-medium mb-1">No tickets found</h3>
                    <p className="text-xs">Create your first support ticket</p>
                  </div>
                ) : (
                  currentTickets.map((ticket: Ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => handleTicketSelect(ticket)}
                      className="p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors w-full overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-1 min-w-0 gap-1">
                        <h3 className="text-xs font-medium truncate flex-1 leading-tight min-w-0">{ticket.subject}</h3>
                        <Badge className={`text-[8px] px-1 py-0 flex-shrink-0 whitespace-nowrap ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority.charAt(0).toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mb-1 min-w-0 gap-1">
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {formatRelativeTime(ticket.updatedAt)}
                        </span>
                      </div>
                      {/* Customer name with inline badges */}
                      <div className="flex justify-between items-center min-w-0 gap-1">
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <span className="text-[9px] text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded text-nowrap">
                            {ticket.customerName.length > 12 ? `${ticket.customerName.substring(0, 12)}...` : ticket.customerName}
                          </span>
                          {ticket.slaWarning && (
                            <Badge className="text-[8px] px-1 py-0 bg-orange-100 text-orange-800 flex-shrink-0 whitespace-nowrap">
                              SLA Warning
                            </Badge>
                          )}
                          <Badge className={`text-[8px] px-1 py-0 flex-shrink-0 whitespace-nowrap ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority.charAt(0).toUpperCase()}
                          </Badge>
                          <Badge className={`text-[8px] px-1 py-0 flex-shrink-0 whitespace-nowrap ${getStatusColor(ticket.status)}`}>
                            {ticket.status.replace('_', ' ').substring(0, 8)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="w-2 bg-gray-200 hover:bg-gray-300 transition-colors" />

            {/* Center Panel - Ticket Details */}
            <ResizablePanel defaultSize={showCustomerPanel ? 45 : 65} minSize={30}>
              <div className="h-full flex flex-col overflow-hidden">
            {selectedTicket ? (
              <>
                <div className="px-1.5 py-1.5 md:px-2 md:py-2 border-b bg-gray-50 flex-shrink-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 mr-1 md:mr-2">
                      <h2 className="text-xs md:text-sm font-medium leading-tight truncate">{selectedTicket.subject}</h2>
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 truncate">
                        <span className="hidden md:inline">{selectedTicket.customerName} • </span>
                        {formatRelativeTime(selectedTicket.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-0.5 md:gap-1 flex-shrink-0">
                      <Badge className={`text-[8px] md:text-[9px] px-1 py-0 ${getPriorityColor(selectedTicket.priority)}`}>
                        <span className="md:hidden">{selectedTicket.priority.charAt(0).toUpperCase()}</span>
                        <span className="hidden md:inline">{selectedTicket.priority}</span>
                      </Badge>
                      {/* Status Badge with Dropdown */}
                      <Select
                        value={selectedTicket.statusId || getStatusId(selectedTicket.status)}
                        onValueChange={(value) => {
                          updateStatusMutation.mutate({
                            ticketId: selectedTicket.id,
                            statusId: value
                          });
                        }}
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger className={`h-5 text-[8px] md:text-[9px] px-1 py-0 border-0 bg-transparent hover:bg-gray-100 w-auto ${getStatusColor(selectedTicket.status)}`}>
                          <SelectValue asChild>
                            <Badge className={`text-[8px] md:text-[9px] px-1 py-0 ${getStatusColor(selectedTicket.status)}`}>
                              <span className="md:hidden">•</span>
                              <span className="hidden md:inline">{selectedTicket.status.replace('_', ' ')}</span>
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">New</SelectItem>
                          <SelectItem value="2">Work in progress</SelectItem>
                          <SelectItem value="3">Resolved</SelectItem>
                          <SelectItem value="5">Waiting on customer</SelectItem>
                          <SelectItem value="6">Waiting on agent</SelectItem>
                          <SelectItem value="7">Site Visit Required</SelectItem>
                          <SelectItem value="8">Monitoring</SelectItem>
                          <SelectItem value="9">Engineer Assigned</SelectItem>
                          <SelectItem value="11">Sales in progress</SelectItem>
                          <SelectItem value="12">Awaiting response</SelectItem>
                          <SelectItem value="14">Resolved, unconfirmed</SelectItem>
                        </SelectContent>
                      </Select>
                      {updateStatusMutation.isPending && (
                        <Loader2 className="w-3 h-3 animate-spin ml-1" />
                      )}
                      
                      {/* Assignment Control */}
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <Select 
                          value={selectedTicket.assignedTo || "unassigned"} 
                          onValueChange={(value) => {
                            if (value !== "unassigned" && value !== "sync") {
                              updateAssignmentMutation.mutate({
                                ticketId: selectedTicket.id,
                                assignTo: parseInt(value)
                              });
                            } else if (value === "sync") {
                              syncAdministratorsMutation.mutate();
                            }
                          }}
                          disabled={updateAssignmentMutation.isPending}
                        >
                          <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent p-1 w-auto min-w-[80px]">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            <Separator />
                            {(administrators || []).map((admin: SplynxAdministrator) => (
                              <SelectItem key={admin.splynxId} value={admin.splynxId.toString()}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: admin.calendarColor || '#6b7280' }}
                                  />
                                  <span className="text-xs">{admin.name}</span>
                                  <span className="text-[10px] text-muted-foreground">({admin.roleName})</span>
                                </div>
                              </SelectItem>
                            ))}
                            <Separator />
                            <SelectItem value="sync" className="text-blue-600">
                              <div className="flex items-center gap-2">
                                <RotateCcw className="w-3 h-3" />
                                <span className="text-xs">Sync Users</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {updateAssignmentMutation.isPending && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 overflow-y-auto">
                  <div className="p-1.5 md:p-2 space-y-1.5 md:space-y-2">
                    {messagesLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : groupedMessages.map((messageGroup, groupIndex) => (
                      <div key={groupIndex} className="space-y-1">
                        {messageGroup.map((message: TicketMessage, messageIndex) => {
                          const timestamp = getEnhancedTimestamp(message.createdAt);
                          const authorBadge = getAuthorBadge(message.authorType);
                          const isFirstInGroup = messageIndex === 0;
                          
                          return (
                            <div key={message.id} className={`max-w-[85%] ${
                              message.authorType === 'customer' || message.authorType === 'incoming' 
                                ? 'ml-0 mr-auto' 
                                : 'ml-auto mr-0'
                            }`}>
                              {isFirstInGroup && (
                                <div className="flex items-center gap-2 mb-1 px-1">
                                  <span className="font-medium text-[10px]">{message.authorName}</span>
                                  <Badge variant={authorBadge.variant} className="text-[8px] px-1 py-0">
                                    {authorBadge.text}
                                  </Badge>
                                  <span 
                                    className="text-[8px] text-muted-foreground cursor-help" 
                                    title={timestamp.absolute}
                                  >
                                    {timestamp.relative}
                                  </span>
                                </div>
                              )}
                              <div className={getMessageStyle(message.authorType, message.isInternal)}>
                                <div className="font-sans text-[10px] leading-relaxed break-words space-y-1.5">
                                  {formatMessage(message.message).split('\n\n').map((paragraph, idx) => (
                                    <p key={idx} className="whitespace-pre-wrap m-0">
                                      {paragraph}
                                    </p>
                                  ))}
                                </div>
                                {message.isInternal && !isFirstInGroup && (
                                  <Badge variant="secondary" className="mt-1 text-[8px] px-1 py-0">Internal Note</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Compact Response Form */}
                <div className="p-1 md:p-1.5 border-t bg-background flex-shrink-0">
                  <Form {...messageForm}>
                    <form onSubmit={messageForm.handleSubmit(handleAddMessage)} className="space-y-0.5 md:space-y-0.5">
                      {/* Desktop: Compact Email Headers */}
                      <div className="hidden md:block space-y-0.5">
                        <FormField
                          control={messageForm.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center gap-2">
                                <FormLabel className="text-[10px] font-medium min-w-fit">Subject</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    placeholder="Email subject"
                                    className="text-[10px] h-5 flex-1"
                                  />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-3 gap-0.5">
                          <FormField
                            control={messageForm.control}
                            name="to"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-medium">To</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    placeholder="customer@email.com"
                                    className="text-[10px] h-5 bg-gray-50"
                                    readOnly
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={messageForm.control}
                            name="cc"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-medium">CC</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    placeholder="cc@email.com"
                                    className="text-[10px] h-5"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={messageForm.control}
                            name="bcc"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-medium">BCC</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    placeholder="bcc@email.com"
                                    className="text-[10px] h-5"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Mobile: Simple Form with Large Textarea */}
                      <div className="md:hidden space-y-1.5">
                        <FormField
                          control={messageForm.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  {...field}
                                  placeholder="Subject: Re: [Ticket Subject]"
                                  className="text-sm h-9 touch-manipulation"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Advanced Options Toggle for Mobile */}
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
                              Advanced Email Options
                              <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-1.5 mt-1.5">
                            <FormField
                              control={messageForm.control}
                              name="to"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium">To</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field}
                                      placeholder="customer@email.com"
                                      className="text-sm h-9 bg-gray-50 touch-manipulation"
                                      readOnly
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-1.5">
                              <FormField
                                control={messageForm.control}
                                name="cc"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-medium">CC</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field}
                                        placeholder="cc@email.com"
                                        className="text-sm h-9 touch-manipulation"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={messageForm.control}
                                name="bcc"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-medium">BCC</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field}
                                        placeholder="bcc@email.com"
                                        className="text-sm h-9 touch-manipulation"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Mobile Message Area with Expand Button */}
                        <FormField
                          control={messageForm.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between mb-1">
                                <FormLabel className="text-xs font-medium">Message</FormLabel>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs"
                                  onClick={() => setIsTextareaExpanded(!isTextareaExpanded)}
                                >
                                  {isTextareaExpanded ? (
                                    <>
                                      <Minimize2 className="w-3 h-3 mr-1" />
                                      Collapse
                                    </>
                                  ) : (
                                    <>
                                      <Maximize2 className="w-3 h-3 mr-1" />
                                      Expand
                                    </>
                                  )}
                                </Button>
                              </div>
                              <FormControl>
                                <Textarea 
                                  placeholder="Add notes/instructions here, then click AI to enhance response, or leave blank for standard generation..." 
                                  className="resize-none text-sm border-2 focus:border-blue-400 transition-all duration-300 w-full touch-manipulation"
                                  style={{
                                    height: isTextareaExpanded ? '80vh' : '160px'
                                  }}
                                  onChange={handleTextareaChange(field)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape' && isTextareaExpanded) {
                                      setIsTextareaExpanded(false);
                                      return;
                                    }
                                    handleKeyDown(e);
                                  }}
                                  value={field.value}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Message Body - Desktop */}
                      <div className="hidden md:block">
                        <FormField
                          control={messageForm.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-medium">Message</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  {/* Overlay for expanded state */}
                                  {isTextareaExpanded && (
                                    <>
                                      <div 
                                        className="fixed inset-0 bg-black bg-opacity-50 z-40"
                                        onClick={() => setIsTextareaExpanded(false)}
                                      />
                                      <div className="fixed top-4 left-4 z-50 bg-white px-3 py-2 rounded-md shadow-lg border text-xs font-medium text-gray-700">
                                        Full Screen Mode - Press Esc to close
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="ml-2 h-5 w-5 p-0"
                                          onClick={() => setIsTextareaExpanded(false)}
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                  
                                  <Textarea 
                                    placeholder="Add notes/instructions here, then click AI to enhance response, or leave blank for standard generation..." 
                                    className={`resize-none text-[10px] border-2 focus:border-blue-400 transition-all duration-300 pr-6 ${
                                      isTextareaExpanded 
                                        ? 'fixed z-50 bg-white shadow-2xl border-blue-500 rounded-lg p-4' 
                                        : 'min-h-[120px]'
                                    }`}
                                    style={isTextareaExpanded ? { 
                                      top: '5vh', 
                                      left: '2vw', 
                                      right: '2vw', 
                                      bottom: '5vh',
                                      width: '96vw',
                                      height: '90vh'
                                    } : {}}
                                    onChange={handleTextareaChange(field)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Escape' && isTextareaExpanded) {
                                        setIsTextareaExpanded(false);
                                        return;
                                      }
                                      handleKeyDown(e);
                                    }}
                                    value={field.value}
                                    rows={isTextareaExpanded ? 30 : 6}
                                    autoFocus={isTextareaExpanded}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className={`absolute border border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 ${
                                      isTextareaExpanded 
                                        ? 'top-3 right-3 z-50 h-6 w-6' 
                                        : 'top-1 right-1 h-4 w-4'
                                    }`}
                                    onClick={() => setIsTextareaExpanded(!isTextareaExpanded)}
                                    title={isTextareaExpanded ? "Minimize (Esc)" : "Expand to full screen"}
                                  >
                                    {isTextareaExpanded ? (
                                      <Minimize2 className="w-2.5 h-2.5 text-blue-600" />
                                    ) : (
                                      <Maximize2 className="w-2.5 h-2.5 text-blue-600" />
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Footer Controls - Mobile */}
                      <div className="md:hidden flex items-center justify-between gap-2 pt-2">
                        <div className="flex items-center gap-3">
                          <FormField
                            control={messageForm.control}
                            name="isInternal"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-1.5">
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="rounded border w-3 h-3"
                                  />
                                </FormControl>
                                <label className="text-xs font-medium cursor-pointer">Internal note</label>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={closeTicketMutation.isPending || !selectedTicket}
                            onClick={() => closeTicketMutation.mutate()}
                            className="h-7 px-3 text-xs bg-red-600 text-white hover:bg-red-700 border-red-600"
                          >
                            {closeTicketMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Close Ticket'
                            )}
                          </Button>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={generateAIResponseMutation.isPending || !selectedTicket}
                            onClick={() => generateAIResponseMutation.mutate()}
                            className="h-8 px-3 shrink-0"
                            title="Generate AI Response"
                          >
                            {generateAIResponseMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            <span className="ml-1 text-xs">AI</span>
                          </Button>
                          
                          {/* Send Button with Status Dropdown */}
                          <div className="flex items-center bg-blue-600 hover:bg-blue-700 rounded text-white">
                            <Button 
                              type="submit" 
                              size="sm"
                              disabled={addMessageMutation.isPending || !messageForm.watch('message').trim()}
                              className="h-8 px-3 shrink-0 bg-transparent hover:bg-transparent border-0 border-r border-blue-500"
                            >
                              {addMessageMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              <span className="ml-1 text-xs">Send</span>
                            </Button>
                            <FormField
                              control={messageForm.control}
                              name="newStatusId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger className="h-8 w-4 border-0 bg-transparent hover:bg-blue-700 text-white focus:ring-0">
                                        <ChevronDown className="w-3 h-3" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {SEND_STATUS_OPTIONS.map((status) => (
                                          <SelectItem key={status.value} value={status.value}>
                                            {status.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Footer Controls - Desktop */}
                      <div className="hidden md:flex justify-between items-center pt-0.5 border-t">
                        <div className="flex items-center gap-2">
                          <FormField
                            control={messageForm.control}
                            name="isInternal"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-1">
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="rounded border w-2.5 h-2.5"
                                  />
                                </FormControl>
                                <label className="text-[9px] font-medium cursor-pointer">Internal note</label>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={closeTicketMutation.isPending || !selectedTicket}
                            onClick={() => closeTicketMutation.mutate()}
                            className="h-6 px-2 text-[9px] bg-red-600 text-white hover:bg-red-700 border-red-600"
                          >
                            {closeTicketMutation.isPending ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              'Close'
                            )}
                          </Button>
                          
                          {/* AI Button */}
                          <Button 
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={generateAIResponseMutation.isPending || !selectedTicket}
                            onClick={() => generateAIResponseMutation.mutate()}
                            className="h-6 px-2 text-[9px] shrink-0"
                            title="Generate AI Response"
                          >
                            {generateAIResponseMutation.isPending ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-2.5 h-2.5" />
                            )}
                            <span className="ml-1">AI</span>
                          </Button>
                          
                          {/* Send Button with Status Dropdown */}
                          <div className="flex items-center bg-blue-600 hover:bg-blue-700 rounded text-white">
                            <Button 
                              type="submit" 
                              size="sm"
                              disabled={addMessageMutation.isPending || !messageForm.watch('message').trim()}
                              className="h-6 px-2 text-[9px] shrink-0 bg-transparent hover:bg-transparent border-0 border-r border-blue-500"
                            >
                              {addMessageMutation.isPending ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <Send className="w-2.5 h-2.5" />
                              )}
                              <span className="ml-1">Send</span>
                            </Button>
                            <FormField
                              control={messageForm.control}
                              name="newStatusId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger className="h-6 w-4 border-0 bg-transparent hover:bg-blue-700 text-white focus:ring-0">
                                        <ChevronDown className="w-2.5 h-2.5" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {SEND_STATUS_OPTIONS.map((status) => (
                                          <SelectItem key={status.value} value={status.value}>
                                            {status.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        <span className="text-[8px] text-muted-foreground">
                          {messageForm.watch('message').length}/2000
                        </span>
                      </div>
                    </form>
                  </Form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Select a ticket</h3>
                  <p className="text-sm">Choose a ticket from the list to view details and messages</p>
                </div>
              </div>
            )}
              </div>
            </ResizablePanel>

            {/* Right Panel - Customer Details */}
            {showCustomerPanel && (
              <>
                <ResizableHandle withHandle className="w-2 bg-gray-200 hover:bg-gray-300 transition-colors" />
                <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                  <div className="h-full overflow-hidden">
                    <CustomerDetailsPanel 
                      customer={customer || null} 
                      isLoading={customerLoading}
                      onClose={() => setShowCustomerPanel(false)}
                      className="h-full"
                      ticketId={selectedTicket?.id}
                      messages={messages || []}
                      onCustomerLinked={handleCustomerLinked}
                    />
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      )}
      {/* Mobile Customer Details View */}
      {isMobile && mobileView === 'customer' && (
        <ErrorBoundary 
          fallbackComponent={({ error, retry }) => (
            <div className="flex-1 flex flex-col bg-background p-4">
              <div className="flex items-center gap-3 mb-4">
                <Button variant="ghost" size="sm" onClick={handleBackToList}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className="text-lg font-semibold">Customer Details</h1>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-sm">
                  <User className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <h2 className="text-lg font-semibold mb-2">Unable to Load Customer</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {error.message.includes('timeout') 
                      ? "The request timed out. Please check your connection and try again."
                      : "There was an error loading the customer details. Please try again."
                    }
                  </p>
                  <div className="space-y-2">
                    <Button onClick={retry} variant="outline" size="sm">
                      Try Again
                    </Button>
                    <Button onClick={handleBackToList} variant="ghost" size="sm">
                      Back to Tickets
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        >
          <CustomerDetailsMobile
            customer={customer || null}
            isLoading={customerLoading}
            onBack={handleBackToList}
            ticketId={selectedTicket?.id}
            messages={messages || []}
            onCustomerLinked={handleCustomerLinked}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}