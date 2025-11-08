import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Phone,
  User,
  Mail,
  Hash,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceAgentLogsProps {
  limit?: number;
}

export function VoiceAgentLogs({ limit = 50 }: VoiceAgentLogsProps) {
  const { toast } = useToast();
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const { data: logs = [], isLoading, error, refetch } = useQuery<VapiInteractionLog[]>({
    queryKey: ['/api/vapi/interaction-logs', limit],
    refetchInterval: 5000, // Auto-refresh every 5 seconds for real-time monitoring
  });

  const toggleExpanded = (logId: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: `${type} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'timeout':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'timeout':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Timeout</Badge>;
      case 'auth_failed':
        return <Badge variant="destructive">Auth Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getToolIcon = (toolName: string) => {
    if (toolName.toLowerCase().includes('customer')) return <User className="h-4 w-4" />;
    if (toolName.toLowerCase().includes('ticket')) return <Phone className="h-4 w-4" />;
    if (toolName.toLowerCase().includes('service')) return <Zap className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const formatTimestamp = (timestamp: string | Date | null) => {
    if (!timestamp) return { date: 'N/A', time: 'N/A', relative: 'Unknown' };
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative: getRelativeTime(date)
    };
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Voice Agent Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              Loading interaction logs...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Voice Agent Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <p className="text-muted-foreground mb-4">Failed to load interaction logs</p>
            <Button onClick={() => refetch()} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-3 md:p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1 md:gap-2 text-sm md:text-base">
            <Activity className="h-4 w-4 md:h-5 md:w-5" />
            <span className="md:hidden">Logs</span>
            <span className="hidden md:inline">Voice Agent Logs</span>
            <Badge variant="outline" className="ml-1 md:ml-2 text-xs px-1 py-0">{logs.length}</Badge>
          </CardTitle>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="h-7 text-xs px-2">
            Refresh
          </Button>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
          Detailed interaction logs with VAPI voice agents and tool executions
        </p>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        <div className="space-y-2 overflow-hidden">
          {logs.length === 0 ? (
            <div className="text-center py-4 md:py-8">
              <Activity className="h-8 w-8 md:h-12 md:w-12 mx-auto text-muted-foreground mb-2 md:mb-4" />
              <p className="text-xs md:text-sm text-muted-foreground px-2">
                No voice agent interactions yet. Logs will appear here when voice agents start using tools.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const isExpanded = expandedLogs.has(log.id);
              const timestamp = formatTimestamp(log.requestTimestamp);
              
              return (
                <div key={log.id} className="border rounded-lg">
                  {/* Compact Log Row */}
                  <div 
                    className="flex items-start gap-1 md:gap-2 p-2 md:p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpanded(log.id)}
                  >
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isExpanded ? <ChevronDown className="h-3 w-3 md:h-4 md:w-4" /> : <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />}
                      <div className="h-4 w-4 md:h-5 md:w-5">
                        {getToolIcon(log.toolName)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 md:gap-2">
                        <div className="flex items-center gap-1 md:gap-2 min-w-0">
                          <p className="text-xs md:text-sm font-medium truncate">{log.toolName}</p>
                          {getStatusIcon(log.status)}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <div className="hidden md:block">
                            {getStatusBadge(log.status)}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {timestamp.relative}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-0.5 md:mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5 md:gap-1">
                          <Clock className="h-2.5 w-2.5 md:h-3 md:w-3" />
                          <span className="hidden md:inline">{timestamp.time}</span>
                          <span className="md:hidden text-xs">{timestamp.time.split(':').slice(0, 2).join(':')}</span>
                        </span>
                        {log.customerEmail && (
                          <span className="flex items-center gap-0.5 md:gap-1 truncate">
                            <Mail className="h-2.5 w-2.5 md:h-3 md:w-3" />
                            <span className="truncate max-w-[100px] md:max-w-[150px]">{log.customerEmail}</span>
                          </span>
                        )}
                        {log.customerId && (
                          <span className="flex items-center gap-0.5 md:gap-1">
                            <Hash className="h-2.5 w-2.5 md:h-3 md:w-3" />
                            {log.customerId}
                          </span>
                        )}
                        {log.responseTime && (
                          <span className="whitespace-nowrap text-xs">{log.responseTime}ms</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t bg-muted/25 p-2 md:p-4 space-y-3 md:space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                        <div>
                          <h5 className="font-medium mb-1 md:mb-2 text-xs md:text-sm">Request Details</h5>
                          <div className="space-y-0.5 md:space-y-1 text-xs">
                            <p><strong>Endpoint:</strong> <span className="break-all">{log.endpoint}</span></p>
                            <p><strong>Method:</strong> {log.httpMethod}</p>
                            <p><strong>Call ID:</strong> <span className="text-xs">{log.callId?.substring(0, 8) || 'N/A'}</span></p>
                            <p><strong>Assistant:</strong> <span className="text-xs">{log.assistantId?.substring(0, 8) || 'N/A'}</span></p>
                            <p><strong>Time:</strong> {timestamp.date} {timestamp.time}</p>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium mb-1 md:mb-2 text-xs md:text-sm">Response Details</h5>
                          <div className="space-y-0.5 md:space-y-1 text-xs">
                            <p><strong>Status:</strong> {log.status}</p>
                            <p><strong>HTTP Code:</strong> {log.httpStatusCode || 'N/A'}</p>
                            <p><strong>Response Time:</strong> {log.responseTime ? `${log.responseTime}ms` : 'N/A'}</p>
                            <p><strong>Error Type:</strong> {log.errorType || 'N/A'}</p>
                            {log.errorMessage && (
                              <p><strong>Error:</strong> <span className="text-red-600 break-words">{log.errorMessage}</span></p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Request Payload */}
                      {log.requestPayload && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium">Request Payload</h5>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(JSON.stringify(log.requestPayload, null, 2), 'Request payload');
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32">
                            {JSON.stringify(log.requestPayload, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Response Payload */}
                      {log.responsePayload && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium">Response Payload</h5>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(JSON.stringify(log.responsePayload, null, 2), 'Response payload');
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32">
                            {JSON.stringify(log.responsePayload, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Raw Logs */}
                      {(log.rawRequestLog || log.rawResponseLog) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {log.rawRequestLog && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium">Raw Request</h5>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(log.rawRequestLog!, 'Raw request log');
                                  }}
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </Button>
                              </div>
                              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32">
                                {log.rawRequestLog}
                              </pre>
                            </div>
                          )}

                          {log.rawResponseLog && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium">Raw Response</h5>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(log.rawResponseLog!, 'Raw response log');
                                  }}
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </Button>
                              </div>
                              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32">
                                {log.rawResponseLog}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}