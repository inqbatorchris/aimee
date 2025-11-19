import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhoneCall, TrendingUp, MessageSquare, Calendar, BookOpen, Ticket, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

export default function VapiPerformanceDashboard() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || 3;

  const { data: objective, isLoading: objectiveLoading } = useQuery({
    queryKey: ['/api/strategy/objectives', { organizationId }],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/vapi/metrics', { organizationId }],
  });

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['/api/vapi/metrics/trend', { organizationId, days: 30 }],
  });

  const { data: calls, isLoading: callsLoading } = useQuery({
    queryKey: ['/api/vapi/calls', { organizationId, limit: 100 }],
  });

  const vapiObjective = Array.isArray(objective) ? objective.find((obj: any) => obj.title === 'Autonomous Voice Support System') : null;
  const keyResults = vapiObjective?.keyResults || [];

  const getKRIcon = (title: string) => {
    if (title.includes('Autonomous')) return <CheckCircle2 className="h-5 w-5" />;
    if (title.includes('Duration')) return <Clock className="h-5 w-5" />;
    if (title.includes('SMS')) return <MessageSquare className="h-5 w-5" />;
    if (title.includes('Demo')) return <Calendar className="h-5 w-5" />;
    if (title.includes('Knowledge')) return <BookOpen className="h-5 w-5" />;
    if (title.includes('Tickets')) return <Ticket className="h-5 w-5" />;
    return <TrendingUp className="h-5 w-5" />;
  };

  const getProgressPercentage = (kr: any) => {
    const current = parseFloat(kr.currentValue || 0);
    const target = parseFloat(kr.targetValue || 1);
    
    if (kr.type === 'Numeric Target' && kr.title.includes('Duration')) {
      return Math.max(0, Math.min(100, (1 - current / target) * 100));
    }
    
    return Math.min(100, (current / target) * 100);
  };

  const getStatusColor = (kr: any) => {
    const progress = getProgressPercentage(kr);
    if (progress >= 90) return 'text-green-600 dark:text-green-400';
    if (progress >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getStatusBadge = (kr: any) => {
    const progress = getProgressPercentage(kr);
    if (progress >= 90) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">On Track</Badge>;
    if (progress >= 70) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">At Risk</Badge>;
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Off Track</Badge>;
  };

  if (objectiveLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Vapi Performance Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!vapiObjective) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <p className="text-muted-foreground">No Vapi objective found. Please run the seed data script.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="vapi-performance-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PhoneCall className="h-8 w-8" />
            {vapiObjective.title}
          </h1>
          <p className="text-muted-foreground mt-2">{vapiObjective.description}</p>
        </div>
        <Badge className="text-lg px-4 py-2" variant="outline">
          {vapiObjective.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {keyResults.map((kr: any) => (
          <Card key={kr.id} data-testid={`key-result-card-${kr.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className={getStatusColor(kr)}>
                  {getKRIcon(kr.title)}
                </div>
                {getStatusBadge(kr)}
              </div>
              <CardTitle className="text-lg">{kr.title}</CardTitle>
              <CardDescription className="text-sm">{kr.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold" data-testid={`current-value-${kr.id}`}>
                    {kr.currentValue}
                    {kr.type === 'Percentage KPI' && '%'}
                    {kr.title.includes('Duration') && 's'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Target: {kr.targetValue}
                    {kr.type === 'Percentage KPI' && '%'}
                    {kr.title.includes('Duration') && 's'}
                  </span>
                </div>
                <Progress 
                  value={getProgressPercentage(kr)} 
                  className="h-2"
                  data-testid={`progress-${kr.id}`}
                />
                <div className="text-xs text-muted-foreground">
                  Last updated: {new Date(kr.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="calls">Recent Calls</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>30-Day Performance Trends</CardTitle>
              <CardDescription>Daily tracking of key metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={Array.isArray(trendData) ? trendData : []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="metrics.autonomousResolutionRate" 
                      stroke="#10b981" 
                      name="Autonomous Rate (%)" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="metrics.demoConversionRate" 
                      stroke="#3b82f6" 
                      name="Demo Conversion (%)" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="metrics.knowledgeBaseCoverage" 
                      stroke="#8b5cf6" 
                      name="KB Coverage (%)" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Call Duration Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={Array.isArray(trendData) ? trendData.slice(-7) : []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="metrics.averageCallDuration" fill="#f59e0b" name="Avg Duration (s)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tickets Created</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={Array.isArray(trendData) ? trendData.slice(-7) : []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="metrics.ticketsCreatedCount" fill="#ef4444" name="Tickets" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Call Activity</CardTitle>
              <CardDescription>Latest 100 voice AI interactions</CardDescription>
            </CardHeader>
            <CardContent>
              {callsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : Array.isArray(calls) && calls.length > 0 ? (
                <div className="space-y-2">
                  {calls.slice(0, 10).map((call: any) => (
                    <div 
                      key={call.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`call-row-${call.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {call.wasAutonomous ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium">{call.customerPhoneNumber || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">
                            {call.customerIntent || 'No intent detected'} • {call.durationSeconds}s
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={call.wasAutonomous ? 'default' : 'secondary'}>
                          {call.status}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(call.startedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No call data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Strong Autonomous Performance</div>
                    <p className="text-sm text-muted-foreground">
                      Current autonomous resolution rate shows system is handling most calls independently
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium">SMS Verification Effectiveness</div>
                    <p className="text-sm text-muted-foreground">
                      Identity verification process maintains high success rates
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Knowledge Base Health</div>
                    <p className="text-sm text-muted-foreground">
                      Coverage metrics indicate comprehensive documentation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Review Demo Conversion</div>
                    <p className="text-sm text-muted-foreground">
                      Analyze sales call transcripts to optimize demo scheduling pitch
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Optimize Call Duration</div>
                    <p className="text-sm text-muted-foreground">
                      Identify opportunities to reduce average handling time
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Ticket className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Monitor Ticket Volume</div>
                    <p className="text-sm text-muted-foreground">
                      Track escalations to identify systemic issues
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
