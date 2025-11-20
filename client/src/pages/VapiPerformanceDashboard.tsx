import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PhoneCall, Clock, CheckCircle2, ChevronDown, ChevronRight, Copy, Filter, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { createWorkItem } from '@/lib/workItems.api';

export default function VapiPerformanceDashboard() {
  const { currentUser } = useAuth();
  const organizationId = currentUser?.organizationId || 4;
  const { toast } = useToast();

  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['ended', 'in-progress', 'queued']);
  const [selectedSuccessFilters, setSelectedSuccessFilters] = useState<string[]>(['success', 'failed']);
  const [selectedReviewStatuses, setSelectedReviewStatuses] = useState<string[]>(['New', 'Review needed', 'Pass', 'Fail']);
  const [searchPhone, setSearchPhone] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Local status tracking (stored in localStorage)
  const [callStatuses, setCallStatuses] = useState<Record<string, string>>(() => {
    const stored = localStorage.getItem('vapi_call_statuses');
    return stored ? JSON.parse(stored) : {};
  });

  // Bulk work item creation state
  const [selectedCalls, setSelectedCalls] = useState<string[]>([]);
  const [showWorkItemDialog, setShowWorkItemDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [workItemAssignee, setWorkItemAssignee] = useState<string>('unassigned');
  const [workItemTeam, setWorkItemTeam] = useState<string>('');
  const [workItemDueDate, setWorkItemDueDate] = useState<string>('');
  const [isCreatingWorkItems, setIsCreatingWorkItems] = useState(false);

  const { data: calls, isLoading: callsLoading } = useQuery({
    queryKey: ['/api/vapi/calls', { organizationId, limit: 1000 }],
  });

  // Fetch workflow templates
  const { data: templates } = useQuery({
    queryKey: ['/api/workflows/templates'],
  });

  // Fetch users for assignee dropdown
  const { data: users } = useQuery({
    queryKey: ['/api/users', { organizationId }],
  });

  const { data: expandedCall, isLoading: expandedLoading } = useQuery({
    queryKey: ['/api/vapi/calls', expandedCallId, { organizationId }],
    enabled: !!expandedCallId,
    queryFn: async () => {
      const response = await apiRequest(`/api/vapi/calls/${expandedCallId}?organizationId=${organizationId}`);
      return response.json();
    },
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const copyTranscript = (transcript: string) => {
    navigator.clipboard.writeText(transcript);
    toast({
      title: 'Copied!',
      description: 'Transcript copied to clipboard',
    });
  };

  // Update call status and persist to localStorage
  const updateCallStatus = (callId: string, status: string) => {
    const newStatuses = { ...callStatuses, [callId]: status };
    setCallStatuses(newStatuses);
    localStorage.setItem('vapi_call_statuses', JSON.stringify(newStatuses));
    toast({
      title: 'Status Updated',
      description: `Call marked as "${status}"`,
    });
  };

  // Get call status (defaults to "New" if not set)
  const getCallStatus = (callId: string): string => {
    return callStatuses[callId] || 'New';
  };

  // Check if a ticket was successfully created in the call
  const wasTicketCreated = (call: any): boolean => {
    if (!call.messages) return false;
    
    // Find tool_call_result messages for createTicket
    const ticketResults = call.messages.filter(
      (msg: any) => msg.role === 'tool_call_result' && msg.name === 'createTicket'
    );
    
    if (ticketResults.length === 0) return false;
    
    // Check if any result contains a successful ticket ID
    return ticketResults.some((result: any) => {
      try {
        const parsed = typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
        return parsed?.success === true && parsed?.ticketId;
      } catch {
        return false;
      }
    });
  };

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allCallIds = paginatedCalls.map((call: any) => call.id);
      setSelectedCalls(allCallIds);
    } else {
      setSelectedCalls([]);
    }
  };

  // Handle individual call selection
  const handleCallSelection = (callId: string, checked: boolean) => {
    if (checked) {
      setSelectedCalls([...selectedCalls, callId]);
    } else {
      setSelectedCalls(selectedCalls.filter(id => id !== callId));
    }
  };

  // Handle creating work items from selected calls
  const handleCreateWorkItems = async () => {
    if (!selectedTemplate) {
      toast({
        title: 'Template Required',
        description: 'Please select a workflow template',
        variant: 'destructive',
      });
      return;
    }
    
    const template = templates?.find((t: any) => String(t.id) === String(selectedTemplate));
    if (!template) {
      toast({
        title: 'Template Not Found',
        description: 'Selected template could not be found',
        variant: 'destructive',
      });
      return;
    }
    
    const callsToProcess = Array.isArray(calls) ? calls.filter((call: any) => selectedCalls.includes(call.id)) : [];
    
    if (callsToProcess.length === 0) return;
    
    setIsCreatingWorkItems(true);
    try {
      const promises = callsToProcess.map((call: any) => {
        const phoneNumber = call.customer?.number || call.phoneNumber?.number || 'Unknown';
        const ticketCreated = wasTicketCreated(call);
        const duration = call.endedAt 
          ? Math.floor((new Date(call.endedAt).getTime() - new Date(call.createdAt).getTime()) / 1000)
          : 0;
        
        return createWorkItem({
          title: `${template.name} - Call from ${phoneNumber}`,
          description: `Work item for Vapi call ${call.id}. ${ticketCreated ? 'Ticket was created successfully.' : 'No ticket was created - requires manual review.'}`,
          status: 'Planning' as const,
          assignedTo: workItemAssignee && workItemAssignee !== 'unassigned' ? parseInt(workItemAssignee) : undefined,
          teamId: workItemTeam ? parseInt(workItemTeam) : undefined,
          dueDate: workItemDueDate || undefined,
          workflowTemplateId: template.id,
          workflowSource: 'vapi_voice_ai',
          workItemType: String(template.id),
          workflowMetadata: {
            templateName: template.name,
            vapiCallId: call.id,
            phoneNumber: phoneNumber,
            callDuration: duration,
            callCost: call.cost,
            ticketCreated: ticketCreated,
            callStatus: call.status,
            callStartTime: call.createdAt,
            callEndTime: call.endedAt,
          },
        });
      });
      
      await Promise.all(promises);
      
      toast({
        title: 'Success',
        description: `${callsToProcess.length} work item${callsToProcess.length > 1 ? 's' : ''} created successfully`,
      });
      
      setSelectedCalls([]);
      setShowWorkItemDialog(false);
      setSelectedTemplate('');
      setWorkItemAssignee('unassigned');
      setWorkItemTeam('');
      setWorkItemDueDate('');
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
    } catch (error) {
      console.error('Error creating work items:', error);
      toast({
        title: 'Error',
        description: 'Failed to create work items',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingWorkItems(false);
    }
  };

  // Toggle filter selection
  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const toggleSuccessFilter = (filter: string) => {
    setSelectedSuccessFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const toggleReviewStatus = (status: string) => {
    setSelectedReviewStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  // Filter calls
  const filteredCalls = Array.isArray(calls) ? calls.filter((call: any) => {
    // Status filter
    if (!selectedStatuses.includes(call.status)) return false;
    
    // Success filter
    const isSuccess = wasTicketCreated(call);
    const passesSuccessFilter = 
      (selectedSuccessFilters.includes('success') && isSuccess) ||
      (selectedSuccessFilters.includes('failed') && !isSuccess);
    if (!passesSuccessFilter) return false;
    
    // Review status filter
    if (!selectedReviewStatuses.includes(getCallStatus(call.id))) return false;
    
    // Phone search
    if (searchPhone && !call.customer?.number?.includes(searchPhone)) return false;
    
    // Date filter
    if (dateFilter !== 'all') {
      const callDate = new Date(call.createdAt);
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (dateFilter === 'today' && callDate < dayStart) return false;
      if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (callDate < weekAgo) return false;
      }
      if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (callDate < monthAgo) return false;
      }
    }
    
    return true;
  }) : [];

  // Pagination
  const totalPages = Math.ceil(filteredCalls.length / itemsPerPage);
  const paginatedCalls = filteredCalls.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="vapi-performance-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PhoneCall className="h-8 w-8 text-violet-600" />
            Vapi Voice AI
          </h1>
          <p className="text-muted-foreground mt-2">Connected voice assistants and recent call activity</p>
        </div>
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Connected
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Call Activity</CardTitle>
          <CardDescription>
            Latest voice AI interactions from your Vapi account
            {filteredCalls.length > 0 && ` (${filteredCalls.length} calls)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="space-y-4 mb-6">
            <div className="flex gap-3 flex-wrap items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>

              {/* Call Status Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    Call Status ({selectedStatuses.length})
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3">
                  <div className="space-y-2">
                    <div className="font-medium text-sm mb-2">Call Status</div>
                    {['ended', 'in-progress', 'queued'].map(status => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={selectedStatuses.includes(status)}
                          onCheckedChange={() => toggleStatusFilter(status)}
                        />
                        <label htmlFor={`status-${status}`} className="text-sm cursor-pointer capitalize">
                          {status}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Success Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    Result ({selectedSuccessFilters.length})
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3">
                  <div className="space-y-2">
                    <div className="font-medium text-sm mb-2">Call Result</div>
                    {[
                      { value: 'success', label: 'Success (Ticket Created)' },
                      { value: 'failed', label: 'Failed (No Ticket)' }
                    ].map(item => (
                      <div key={item.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`success-${item.value}`}
                          checked={selectedSuccessFilters.includes(item.value)}
                          onCheckedChange={() => toggleSuccessFilter(item.value)}
                        />
                        <label htmlFor={`success-${item.value}`} className="text-sm cursor-pointer">
                          {item.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Review Status Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    Review Status ({selectedReviewStatuses.length})
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3">
                  <div className="space-y-2">
                    <div className="font-medium text-sm mb-2">Review Status</div>
                    {['New', 'Review needed', 'Pass', 'Fail'].map(status => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`review-${status}`}
                          checked={selectedReviewStatuses.includes(status)}
                          onCheckedChange={() => toggleReviewStatus(status)}
                        />
                        <label htmlFor={`review-${status}`} className="text-sm cursor-pointer">
                          {status}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Search phone number..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="w-[200px] h-8"
              />
            </div>

            {/* Active Filters Display */}
            <div className="flex gap-2 flex-wrap">
              {selectedStatuses.length < 3 && selectedStatuses.map(status => (
                <Badge key={status} variant="secondary" className="gap-1">
                  Status: {status}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => toggleStatusFilter(status)}
                  />
                </Badge>
              ))}
              {selectedSuccessFilters.length < 2 && selectedSuccessFilters.map(filter => (
                <Badge key={filter} variant="secondary" className="gap-1">
                  {filter === 'success' ? 'Has Ticket' : 'No Ticket'}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => toggleSuccessFilter(filter)}
                  />
                </Badge>
              ))}
              {selectedReviewStatuses.length < 4 && selectedReviewStatuses.map(status => (
                <Badge key={status} variant="secondary" className="gap-1">
                  Review: {status}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => toggleReviewStatus(status)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Bulk Actions Toolbar */}
          {selectedCalls.length > 0 && (
            <div className="flex items-center justify-between gap-3 p-4 mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedCalls.length} call{selectedCalls.length > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setShowWorkItemDialog(true)}
                  data-testid="button-create-work-items"
                >
                  Create Work Items
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedCalls([])}
                  data-testid="button-clear-selection"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {callsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : paginatedCalls.length > 0 ? (
            <div className="space-y-2">
              {/* Select All Row */}
              <div className="flex items-center gap-3 p-3 border-b">
                <Checkbox
                  checked={selectedCalls.length === paginatedCalls.length && paginatedCalls.length > 0}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
                <span className="text-sm font-medium text-muted-foreground">
                  Select All ({paginatedCalls.length})
                </span>
              </div>
              
              {paginatedCalls.map((call: any) => {
                const duration = call.endedAt 
                  ? Math.floor((new Date(call.endedAt).getTime() - new Date(call.createdAt).getTime()) / 1000)
                  : 0;
                const isExpanded = expandedCallId === call.id;

                return (
                  <Collapsible
                    key={call.id}
                    open={isExpanded}
                    onOpenChange={(open) => setExpandedCallId(open ? call.id : null)}
                  >
                    <div className={`border rounded-lg ${selectedCalls.includes(call.id) ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-700' : ''}`}>
                      <CollapsibleTrigger asChild>
                        <div 
                          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                          data-testid={`call-row-${call.id}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={selectedCalls.includes(call.id)}
                              onCheckedChange={(checked) => handleCallSelection(call.id, checked as boolean)}
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`checkbox-call-${call.id}`}
                            />
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div className={`h-2 w-2 rounded-full ${
                              call.status === 'ended' ? 'bg-green-500' : 
                              call.status === 'in-progress' ? 'bg-yellow-500' : 
                              'bg-gray-400'
                            }`} />
                            <div className="flex-1">
                              <div className="font-medium">
                                {call.customer?.number || call.phoneNumber?.number || 'Unknown Number'}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {duration > 0 ? formatDuration(duration) : 'In progress'}
                                </span>
                                {call.cost && <span>{formatCost(call.cost)}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="text-right space-y-2">
                            <div className="flex items-center justify-end gap-2">
                              <Badge variant={call.status === 'ended' ? 'default' : 'secondary'}>
                                {call.status}
                              </Badge>
                              {wasTicketCreated(call) ? (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  ✓ Ticket Created
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  ✗ No Ticket
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <Select 
                                value={getCallStatus(call.id)} 
                                onValueChange={(value) => updateCallStatus(call.id, value)}
                              >
                                <SelectTrigger 
                                  className="w-[140px] h-7 text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                  data-testid={`select-status-${call.id}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="New">
                                    <span className="text-gray-600">🆕 New</span>
                                  </SelectItem>
                                  <SelectItem value="Review needed">
                                    <span className="text-yellow-600">⚠️ Review needed</span>
                                  </SelectItem>
                                  <SelectItem value="Pass">
                                    <span className="text-green-600">✅ Pass</span>
                                  </SelectItem>
                                  <SelectItem value="Fail">
                                    <span className="text-red-600">❌ Fail</span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(call.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="p-4 pt-0 space-y-4">
                          {expandedLoading && isExpanded ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                          ) : expandedCall && isExpanded ? (
                            <>
                              {/* Call Metadata */}
                              <div className="border rounded-lg p-4">
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  📊 Call Metadata
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Call ID:</span>
                                    <div className="font-mono text-xs">{expandedCall.id}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Type:</span>
                                    <div>{expandedCall.type || 'Unknown'}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Duration:</span>
                                    <div>{duration > 0 ? `${formatDuration(duration)} (${duration}s)` : 'N/A'}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Cost:</span>
                                    <div>{expandedCall.cost ? formatCost(expandedCall.cost) : 'N/A'}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Messages:</span>
                                    <div>{expandedCall.messages?.length || 0} exchanges</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Started:</span>
                                    <div>{new Date(expandedCall.createdAt).toLocaleString()}</div>
                                  </div>
                                </div>
                              </div>

                              {/* AI Analysis */}
                              {expandedCall.analysis && (
                                <div className="border rounded-lg p-4">
                                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    🤖 AI Analysis
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    {expandedCall.analysis?.summary && (
                                      <div>
                                        <span className="text-muted-foreground">Summary:</span>
                                        <p className="mt-1">{expandedCall.analysis.summary}</p>
                                      </div>
                                    )}
                                    <div>
                                      <span className="text-muted-foreground">Ticket Status:</span>
                                      <Badge className={wasTicketCreated(expandedCall) ? 'bg-green-100 text-green-800 ml-2' : 'bg-red-100 text-red-800 ml-2'}>
                                        {wasTicketCreated(expandedCall) ? '✓ Ticket captured' : '✗ No ticket created'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Actions Taken (Tool Calls) */}
                              {(() => {
                                const toolCalls = expandedCall.messages?.filter((msg: any) => msg.role === 'tool_calls') || [];
                                if (toolCalls.length === 0) return null;
                                
                                return (
                                  <div className="border rounded-lg p-4">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                      ⚙️ Actions Taken
                                    </h4>
                                    <div className="space-y-3">
                                      {toolCalls.map((toolCallMsg: any, idx: number) => (
                                        <div key={idx} className="bg-muted/30 rounded p-3">
                                          {toolCallMsg.toolCalls?.map((call: any, callIdx: number) => {
                                            const args = JSON.parse(call.function.arguments);
                                            return (
                                              <div key={callIdx} className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                  <Badge variant="outline" className="font-mono">
                                                    {call.function.name}
                                                  </Badge>
                                                  <span className="text-xs text-muted-foreground">
                                                    {Math.floor(toolCallMsg.secondsFromStart)}s into call
                                                  </span>
                                                </div>
                                                {call.function.name === 'createTicket' && (() => {
                                                  // Find the result for this specific tool call
                                                  const result = expandedCall.messages?.find(
                                                    (msg: any) => msg.role === 'tool_call_result' && 
                                                    msg.name === 'createTicket' && 
                                                    msg.toolCallId === call.id
                                                  );
                                                  
                                                  let parsedResult = null;
                                                  try {
                                                    parsedResult = result ? (typeof result.result === 'string' ? JSON.parse(result.result) : result.result) : null;
                                                  } catch {}
                                                  
                                                  return (
                                                    <div className="text-sm space-y-1">
                                                      <div><span className="text-muted-foreground">Subject:</span> {args.subject}</div>
                                                      <div><span className="text-muted-foreground">Priority:</span> {args.priority}</div>
                                                      <div><span className="text-muted-foreground">Customer ID:</span> {args.customer_id}</div>
                                                      {args.message?.message && (
                                                        <div className="mt-2 pt-2 border-t">
                                                          <span className="text-muted-foreground">Details:</span>
                                                          <pre className="mt-1 text-xs whitespace-pre-wrap">{args.message.message}</pre>
                                                        </div>
                                                      )}
                                                      {result && (
                                                        <div className="mt-2 pt-2 border-t">
                                                          <span className="text-muted-foreground">Result:</span>
                                                          {parsedResult?.success ? (
                                                            <div className="mt-1 flex items-center gap-2">
                                                              <Badge className="bg-green-100 text-green-800">✓ Success</Badge>
                                                              {parsedResult.ticketId && (
                                                                <span className="text-xs">Ticket ID: <span className="font-mono font-semibold">{parsedResult.ticketId}</span></span>
                                                              )}
                                                            </div>
                                                          ) : (
                                                            <div className="mt-1">
                                                              <Badge className="bg-red-100 text-red-800">✗ Failed</Badge>
                                                              <pre className="mt-1 text-xs text-red-600">{result.result}</pre>
                                                            </div>
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })()}
                                                {call.function.name !== 'createTicket' && (
                                                  <details className="text-xs">
                                                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                                      View arguments
                                                    </summary>
                                                    <pre className="mt-2 p-2 bg-background rounded overflow-x-auto">
                                                      {JSON.stringify(args, null, 2)}
                                                    </pre>
                                                  </details>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Transcript */}
                              {expandedCall.transcript && (
                                <div className="border rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold flex items-center gap-2">
                                      💬 Full Transcript
                                    </h4>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => copyTranscript(expandedCall.transcript)}
                                      data-testid="copy-transcript"
                                    >
                                      <Copy className="h-4 w-4 mr-2" />
                                      Copy
                                    </Button>
                                  </div>
                                  <div className="bg-muted/30 rounded p-4 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
                                    {expandedCall.transcript}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : null}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} ({filteredCalls.length} total calls)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <PhoneCall className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No call data available yet</p>
              <p className="text-sm mt-2">Calls will appear here once your Vapi assistants start receiving calls</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work Item Creation Dialog */}
      <Dialog open={showWorkItemDialog} onOpenChange={setShowWorkItemDialog}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-create-work-item">
          <DialogHeader>
            <DialogTitle>
              Create Work Item{selectedCalls.length > 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Create work items for {selectedCalls.length} selected call{selectedCalls.length > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Workflow Template *</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger data-testid="select-workflow-template">
                  <SelectValue placeholder="Select a workflow template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template: any) => (
                    <SelectItem key={template.id} value={String(template.id)}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Assign To (Optional)</Label>
              <Select value={workItemAssignee} onValueChange={setWorkItemAssignee}>
                <SelectTrigger data-testid="select-assignee">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users?.map((user: any) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.fullName || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Due Date (Optional)</Label>
              <Input
                type="date"
                value={workItemDueDate}
                onChange={(e) => setWorkItemDueDate(e.target.value)}
                data-testid="input-due-date"
              />
            </div>
            
            {selectedCalls.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Creating work items for {selectedCalls.length} call{selectedCalls.length > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowWorkItemDialog(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateWorkItems}
              disabled={!selectedTemplate || isCreatingWorkItems}
              data-testid="button-submit-work-items"
            >
              {isCreatingWorkItems ? 'Creating...' : `Create ${selectedCalls.length} Work Item${selectedCalls.length > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
