import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PhoneCall, Clock, CheckCircle2, ChevronDown, ChevronRight, Copy, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function VapiPerformanceDashboard() {
  const { currentUser } = useAuth();
  const organizationId = currentUser?.organizationId || 4;
  const { toast } = useToast();

  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [successFilter, setSuccessFilter] = useState<string>('all');
  const [searchPhone, setSearchPhone] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const { data: calls, isLoading: callsLoading } = useQuery({
    queryKey: ['/api/vapi/calls', { organizationId, limit: 1000 }],
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

  // Filter calls
  const filteredCalls = Array.isArray(calls) ? calls.filter((call: any) => {
    if (statusFilter !== 'all' && call.status !== statusFilter) return false;
    if (successFilter === 'success' && !wasTicketCreated(call)) return false;
    if (successFilter === 'failed' && wasTicketCreated(call)) return false;
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
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
              </SelectContent>
            </Select>
            <Select value={successFilter} onValueChange={setSuccessFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Success" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px]">
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
              className="w-[200px]"
            />
          </div>

          {callsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : paginatedCalls.length > 0 ? (
            <div className="space-y-2">
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
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <div 
                          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                          data-testid={`call-row-${call.id}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
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
                                {wasTicketCreated(call) && (
                                  <Badge variant="outline" className="text-green-600">✓ Ticket Created</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={call.status === 'ended' ? 'default' : 'secondary'}>
                              {call.status}
                            </Badge>
                            <div className="text-xs text-muted-foreground mt-1">
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
    </div>
  );
}
