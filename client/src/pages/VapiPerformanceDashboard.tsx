import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhoneCall, Bot, Clock, CheckCircle2, XCircle, AlertCircle, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function VapiPerformanceDashboard() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || 4;

  const { data: assistants, isLoading: assistantsLoading } = useQuery({
    queryKey: ['/api/vapi/assistants', { organizationId }],
  });

  const { data: calls, isLoading: callsLoading } = useQuery({
    queryKey: ['/api/vapi/calls', { organizationId, limit: 100 }],
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  if (assistantsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Vapi account data...</p>
        </div>
      </div>
    );
  }

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-violet-600" />
              Connected Assistants
            </CardTitle>
            <CardDescription>Voice AI agents configured in your Vapi account</CardDescription>
          </CardHeader>
          <CardContent>
            {assistantsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : Array.isArray(assistants) && assistants.length > 0 ? (
              <div className="space-y-3">
                {assistants.map((assistant: any) => (
                  <div 
                    key={assistant.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    data-testid={`assistant-${assistant.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{assistant.name || 'Unnamed Assistant'}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Model: {assistant.model?.model || 'Unknown'}
                        </div>
                        {assistant.voice && (
                          <div className="text-xs text-muted-foreground">
                            Voice: {assistant.voice.provider}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline">{assistant.type || 'Assistant'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No assistants configured yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              Call Statistics
            </CardTitle>
            <CardDescription>Overview of voice AI call activity</CardDescription>
          </CardHeader>
          <CardContent>
            {callsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : Array.isArray(calls) && calls.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="text-2xl font-bold">{calls.length}</div>
                    <div className="text-sm text-muted-foreground">Total Calls</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {calls.filter((c: any) => c.status === 'ended').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No call data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calls" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calls">Recent Calls</TabsTrigger>
        </TabsList>

        <TabsContent value="calls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Call Activity</CardTitle>
              <CardDescription>Latest voice AI interactions from your Vapi account</CardDescription>
            </CardHeader>
            <CardContent>
              {callsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : Array.isArray(calls) && calls.length > 0 ? (
                <div className="space-y-2">
                  {calls.map((call: any) => (
                    <div 
                      key={call.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`call-row-${call.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
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
                              {call.endedAt ? formatDuration(Math.floor((new Date(call.endedAt).getTime() - new Date(call.createdAt).getTime()) / 1000)) : 'In progress'}
                            </span>
                            {call.cost && (
                              <span>{formatCost(call.cost)}</span>
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
                  ))}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
