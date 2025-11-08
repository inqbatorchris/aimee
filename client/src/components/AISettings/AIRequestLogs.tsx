import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface AIRequestLog {
  id: number;
  user_id?: number;
  agent_id?: number;
  request_payload: any;
  customer_id?: number;
  ticket_subject?: string;
  response_payload?: any;
  response_time?: number;
  success: boolean;
  error_message?: string;
  model?: string;
  token_usage?: number;
  created_at: string;
}

export default function AIRequestLogs() {
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/ai/request-logs'],
    queryFn: async () => {
      const response = await fetch('/api/ai/request-logs', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch AI request logs');
      return response.json();
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const successfulLogs = logs.filter((log: AIRequestLog) => log.success);
  const failedLogs = logs.filter((log: AIRequestLog) => !log.success);

  const LogEntry = ({ log }: { log: AIRequestLog }) => {
    const isExpanded = expandedLogId === log.id;
    
    return (
      <div className="border rounded-lg p-4 space-y-2">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
        >
          <div className="flex items-center gap-3">
            {log.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <div>
              <div className="font-medium text-sm">
                Customer {log.customer_id} - {log.ticket_subject}
              </div>
              <div className="text-xs text-gray-500">
                {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {log.response_time && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {log.response_time}ms
              </Badge>
            )}
            <Badge variant={log.success ? "default" : "destructive"} className="text-xs">
              {log.success ? "Success" : "Failed"}
            </Badge>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Request Details</h4>
                <div className="bg-gray-50 rounded p-3 text-xs">
                  <div><strong>Customer ID:</strong> {log.customer_id}</div>
                  <div><strong>Subject:</strong> {log.ticket_subject}</div>
                  <div><strong>Model:</strong> {log.model || 'gpt-4o'}</div>
                  {log.token_usage && <div><strong>Tokens:</strong> {log.token_usage}</div>}
                </div>
              </div>
              
              {log.error_message && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-red-600">Error Details</h4>
                  <div className="bg-red-50 rounded p-3 text-xs text-red-800">
                    {log.error_message}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Request Payload</h4>
              <ScrollArea className="h-40 bg-gray-50 rounded p-3">
                <pre className="text-xs text-gray-700">
                  {JSON.stringify(log.request_payload, null, 2)}
                </pre>
              </ScrollArea>
            </div>

            {log.response_payload && (
              <div>
                <h4 className="font-medium text-sm mb-2">Response Payload</h4>
                <ScrollArea className="h-40 bg-green-50 rounded p-3">
                  <pre className="text-xs text-gray-700">
                    {JSON.stringify(log.response_payload, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">AI Request Logs</CardTitle>
            <CardDescription>
              Monitor and debug AI ticket response generation requests
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-gray-500">Loading AI request logs...</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <div className="text-sm text-gray-500">No AI requests logged yet</div>
            <div className="text-xs text-gray-400 mt-1">
              Try using the AI response button on a support ticket
            </div>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                All ({logs.length})
              </TabsTrigger>
              <TabsTrigger value="success">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Success ({successfulLogs.length})
              </TabsTrigger>
              <TabsTrigger value="failed">
                <AlertCircle className="w-4 h-4 mr-1" />
                Failed ({failedLogs.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-3 mt-4">
              <ScrollArea className="h-96">
                {logs.map((log: AIRequestLog) => (
                  <LogEntry key={log.id} log={log} />
                ))}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="success" className="space-y-3 mt-4">
              <ScrollArea className="h-96">
                {successfulLogs.map((log: AIRequestLog) => (
                  <LogEntry key={log.id} log={log} />
                ))}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="failed" className="space-y-3 mt-4">
              <ScrollArea className="h-96">
                {failedLogs.map((log: AIRequestLog) => (
                  <LogEntry key={log.id} log={log} />
                ))}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}