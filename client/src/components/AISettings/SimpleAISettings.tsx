import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Bot, Shield, CheckCircle, TestTube, Save, ChevronDown, ChevronRight, RefreshCw, Clock, AlertCircle, Settings, Database, Cpu, Sliders, MessageSquare, Activity, Book, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/lib/auth';
import KnowledgeBaseManager from './KnowledgeBaseManager';
import AIDataPreview from './AIDataPreview';

interface AIRequestLog {
  id: number;
  userId?: number;
  customerId?: number;
  ticketSubject?: string;
  responseTime?: number;
  success: boolean;
  errorMessage?: string;
  model?: string;
  createdAt: string;
  requestPayload?: any;
  responsePayload?: any;
}

export default function SimpleAISettings() {
  const [prompt, setPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // General settings state
  const [generalSettings, setGeneralSettings] = useState({
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 500
  });

  // Data sources state
  const [dataSettings, setDataSettings] = useState({
    includeCustomerProfile: true,
    includeFinancialData: true,
    includeServiceData: true,
    includeTicketHistory: true,
    includeServiceHealth: true,
    includeInternalNotes: false,
    includeBillingDetails: true,
    includeKnowledgeBase: true,
    historicalTicketLimit: 5
  });

  // KB settings state
  const [kbSettings, setKbSettings] = useState({
    includeKnowledgeBase: true,
    kbFilterByTags: [] as string[]
  });

  const loadPrompt = async () => {
    try {
      const response = await authService.authenticatedFetch('/api/ai/prompt');
      if (response.ok) {
        const data = await response.json();
        setPrompt(data.prompt || '');
      }
    } catch (error) {
      console.error('Failed to load prompt:', error);
    }
  };

  const loadGeneralSettings = async () => {
    try {
      const response = await authService.authenticatedFetch('/api/ai/general-settings');
      if (response.ok) {
        const data = await response.json();
        setGeneralSettings({
          model: data.model || 'gpt-4o',
          temperature: data.temperature || 0.7,
          maxTokens: data.maxTokens || 500
        });
      }
    } catch (error) {
      console.error('Failed to load general settings:', error);
    }
  };

  const loadDataSettings = async () => {
    try {
      const response = await authService.authenticatedFetch('/api/ai/data-sources');
      if (response.ok) {
        const data = await response.json();
        setDataSettings({
          includeCustomerProfile: data.includeCustomerProfile ?? true,
          includeFinancialData: data.includeFinancialData ?? true,
          includeServiceData: data.includeServiceData ?? true,
          includeTicketHistory: data.includeTicketHistory ?? true,
          includeServiceHealth: data.includeServiceHealth ?? true,
          includeInternalNotes: data.includeInternalNotes ?? false,
          includeBillingDetails: data.includeBillingDetails ?? true,
          includeKnowledgeBase: data.includeKnowledgeBase ?? true,
          historicalTicketLimit: data.historicalTicketLimit || 5
        });
      }
    } catch (error) {
      console.error('Failed to load data settings:', error);
    }
  };

  const loadKbSettings = async () => {
    try {
      const response = await authService.authenticatedFetch('/api/ai/kb-settings');
      if (response.ok) {
        const data = await response.json();
        setKbSettings({
          includeKnowledgeBase: data.includeKnowledgeBase ?? true,
          kbFilterByTags: data.kbFilterByTags ?? []
        });
      }
    } catch (error) {
      console.error('Failed to load KB settings:', error);
    }
  };

  const savePrompt = async () => {
    setIsSaving(true);
    try {
      const response = await authService.authenticatedFetch('/api/ai/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'AI prompt updated successfully',
        });
      } else {
        throw new Error('Failed to save prompt');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save AI prompt',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveGeneralSettings = async () => {
    try {
      const response = await authService.authenticatedFetch('/api/ai/general-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generalSettings),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'General settings updated successfully',
        });
      } else {
        throw new Error('Failed to save general settings');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save general settings',
        variant: 'destructive',
      });
    }
  };

  const saveDataSettings = async () => {
    try {
      const response = await authService.authenticatedFetch('/api/ai/data-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataSettings),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Data sources updated successfully',
        });
      } else {
        throw new Error('Failed to save data settings');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save data sources',
        variant: 'destructive',
      });
    }
  };

  const saveKbSettings = async () => {
    try {
      const response = await authService.authenticatedFetch('/api/ai/kb-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(kbSettings),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Knowledge Base settings updated successfully',
        });
      } else {
        throw new Error('Failed to save KB settings');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save Knowledge Base settings',
        variant: 'destructive',
      });
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const response = await authService.authenticatedFetch('/api/ai/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'AI connection test successful',
        });
      } else {
        throw new Error('Connection test failed');
      }
    } catch (error) {
      toast({
        title: 'Connection Test Failed',
        description: 'Please check the configuration and try again',
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Load current configuration
  useEffect(() => {
    loadPrompt();
    loadGeneralSettings();
    loadDataSettings();
    loadKbSettings();
  }, []);

  // Fetch AI request logs with authentication
  const { data: logs = [], isLoading: logsLoading, refetch } = useQuery({
    queryKey: ['/api/ai/request-logs'],
    queryFn: async () => {
      const response = await authService.authenticatedFetch('/api/ai/request-logs?limit=20');
      if (!response.ok) throw new Error('Failed to fetch logs');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const LogRow = ({ log }: { log: AIRequestLog }) => {
    const isExpanded = expandedLogId === log.id;
    
    return (
      <div className="border-b border-gray-100 last:border-b-0">
        <div 
          className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer"
          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {log.success ? (
              <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3 h-3 text-red-600 flex-shrink-0" />
            )}
            
            <div className="flex items-center gap-1 flex-1 min-w-0 text-xs">
              <span className="text-gray-500">
                {formatTimestamp(log.createdAt)}
              </span>
              <span className="text-gray-400">•</span>
              <span className="truncate font-medium">
                {log.ticketSubject || 'Test'}
              </span>
              {log.customerId && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">
                    {log.customerId}
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {log.responseTime && (
              <span className="text-[10px] text-gray-500">
                {(log.responseTime / 1000).toFixed(1)}s
              </span>
            )}
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-400" />
            )}
          </div>
        </div>
        
        {isExpanded && (
          <div className="px-2 pb-2 space-y-3 bg-gray-50 text-[10px]">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="font-medium text-gray-700 mb-1">Request Details</div>
                <div className="space-y-0.5">
                  <div><span className="text-gray-500">Model:</span> {log.model || 'gpt-4o'}</div>
                  <div><span className="text-gray-500">User ID:</span> {log.userId || 'N/A'}</div>
                  <div><span className="text-gray-500">Customer ID:</span> {log.customerId || 'N/A'}</div>
                  <div><span className="text-gray-500">Status:</span> {log.success ? 'Success' : 'Failed'}</div>
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700 mb-1">Performance</div>
                <div className="space-y-0.5">
                  <div><span className="text-gray-500">Response Time:</span> {log.responseTime ? `${log.responseTime}ms` : 'N/A'}</div>
                  <div><span className="text-gray-500">Date:</span> {formatTimestamp(log.createdAt)}</div>
                  <div><span className="text-gray-500">Subject:</span> {log.ticketSubject || 'N/A'}</div>
                </div>
              </div>
            </div>
            
            {log.errorMessage && (
              <div>
                <div className="font-medium text-red-700 mb-1">Error Message</div>
                <div className="text-red-600 bg-red-50 p-2 rounded text-[10px] font-mono">
                  {log.errorMessage}
                </div>
              </div>
            )}
            
            {log.requestPayload && (
              <div>
                <div className="font-medium text-gray-700 mb-1">Raw Request Input</div>
                <div className="bg-white p-2 rounded border text-[10px] font-mono max-h-32 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(log.requestPayload, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            
            {log.responsePayload && (
              <div>
                <div className="font-medium text-gray-700 mb-1">Raw Response Output</div>
                <div className="bg-white p-2 rounded border text-[10px] font-mono max-h-32 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(log.responsePayload, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-3">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-7 h-auto gap-1">
          <TabsTrigger value="general" className="flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] touch-manipulation">
            <Cpu className="w-3 h-3" />
            <span className="text-[10px]">General</span>
          </TabsTrigger>
          <TabsTrigger value="prompt" className="flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] touch-manipulation">
            <MessageSquare className="w-3 h-3" />
            <span className="text-[10px]">Prompt</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] touch-manipulation">
            <Database className="w-3 h-3" />
            <span className="text-[10px]">Data</span>
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] touch-manipulation">
            <Book className="w-3 h-3" />
            <span className="text-[10px]">Knowledge</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] touch-manipulation">
            <Activity className="w-3 h-3" />
            <span className="text-[10px]">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] touch-manipulation">
            <Sliders className="w-3 h-3" />
            <span className="text-[10px]">Advanced</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] touch-manipulation">
            <Eye className="w-3 h-3" />
            <span className="text-[10px]">Preview</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-3">
          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-3">
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium">AI Model</Label>
                <Select value={generalSettings.model} onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, model: value }))}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o (Latest)</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium">Temperature: {generalSettings.temperature}</Label>
                <Slider
                  value={[generalSettings.temperature]}
                  onValueChange={([value]) => setGeneralSettings(prev => ({ ...prev, temperature: value }))}
                  max={1}
                  min={0}
                  step={0.1}
                  className="mt-2"
                />
                <div className="text-[10px] text-gray-500 mt-1">Controls creativity (0 = focused, 1 = creative)</div>
              </div>

              <div>
                <Label className="text-xs font-medium">Max Tokens</Label>
                <Input
                  type="number"
                  value={generalSettings.maxTokens}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 500 }))}
                  className="text-xs h-8 mt-1"
                  min={100}
                  max={2000}
                />
                <div className="text-[10px] text-gray-500 mt-1">Maximum response length (100-2000)</div>
              </div>

              <Button onClick={saveGeneralSettings} className="w-full h-8 text-xs">
                <Save className="w-3 h-3 mr-1" />
                Save General Settings
              </Button>
            </div>
          </TabsContent>

          {/* Prompt Configuration Tab */}
          <TabsContent value="prompt" className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-gray-700 mb-2 block">System Prompt</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter custom instructions for the AI assistant..."
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[120px] resize-none"
                style={{ fontSize: '8pt' }}
              />
              <div className="text-[10px] text-gray-500 mt-1">
                This prompt guides how the AI responds to support tickets. It currently uses database configuration or falls back to working defaults.
              </div>
            </div>
            
            <Button 
              onClick={savePrompt} 
              disabled={isSaving}
              className="w-full h-8 text-xs"
            >
              <Save className="w-3 h-3 mr-1" />
              {isSaving ? 'Saving...' : 'Save Prompt'}
            </Button>
          </TabsContent>

          {/* Data Sources Tab */}
          <TabsContent value="data" className="space-y-3">
            <div className="space-y-3">
              <div className="text-xs font-medium text-gray-700 mb-2">Customer Information</div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Include Customer Profile</Label>
                  <Switch 
                    checked={dataSettings.includeCustomerProfile}
                    onCheckedChange={(checked) => setDataSettings(prev => ({ ...prev, includeCustomerProfile: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Include Financial Data</Label>
                  <Switch 
                    checked={dataSettings.includeFinancialData}
                    onCheckedChange={(checked) => setDataSettings(prev => ({ ...prev, includeFinancialData: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Include Service Data</Label>
                  <Switch 
                    checked={dataSettings.includeServiceData}
                    onCheckedChange={(checked) => setDataSettings(prev => ({ ...prev, includeServiceData: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Include Billing Details</Label>
                  <Switch 
                    checked={dataSettings.includeBillingDetails}
                    onCheckedChange={(checked) => setDataSettings(prev => ({ ...prev, includeBillingDetails: checked }))}
                  />
                </div>
              </div>

              <div className="text-xs font-medium text-gray-700 mb-2 mt-4">Ticket History</div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Include Ticket History</Label>
                  <Switch 
                    checked={dataSettings.includeTicketHistory}
                    onCheckedChange={(checked) => setDataSettings(prev => ({ ...prev, includeTicketHistory: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Include Service Health</Label>
                  <Switch 
                    checked={dataSettings.includeServiceHealth}
                    onCheckedChange={(checked) => setDataSettings(prev => ({ ...prev, includeServiceHealth: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Include Internal Notes</Label>
                  <Switch 
                    checked={dataSettings.includeInternalNotes}
                    onCheckedChange={(checked) => setDataSettings(prev => ({ ...prev, includeInternalNotes: checked }))}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium">Historical Ticket Limit: {dataSettings.historicalTicketLimit}</Label>
                <Slider
                  value={[dataSettings.historicalTicketLimit]}
                  onValueChange={([value]) => setDataSettings(prev => ({ ...prev, historicalTicketLimit: value }))}
                  max={20}
                  min={1}
                  step={1}
                  className="mt-2"
                />
                <div className="text-[10px] text-gray-500 mt-1">Number of recent messages to include (1-20)</div>
              </div>

              <Button onClick={saveDataSettings} className="w-full h-8 text-xs">
                <Save className="w-3 h-3 mr-1" />
                Save Data Sources
              </Button>
            </div>
          </TabsContent>

          {/* Knowledge Base Tab */}
          <TabsContent value="knowledge" className="space-y-3">
            <div className="text-xs font-medium text-gray-900 mb-2">Knowledge Base Management</div>
            <div className="space-y-4">
              {/* KB Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-gray-700">Knowledge Base Settings</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600">Include Knowledge Base</div>
                  <Switch
                    checked={kbSettings.includeKnowledgeBase}
                    onCheckedChange={(checked) => setKbSettings({...kbSettings, includeKnowledgeBase: checked})}
                  />
                </div>
                
                <div className="mt-3">
                  <Button onClick={saveKbSettings} className="w-full h-8 text-xs">
                    <Save className="w-3 h-3 mr-1" />
                    Save KB Settings
                  </Button>
                </div>
              </div>
              
              {/* Knowledge Base Manager */}
              <div className="border-t pt-3">
                <KnowledgeBaseManager />
              </div>
            </div>
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="activity" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-gray-900">AI Request Logs</div>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={logsLoading}
                className="text-xs px-2 py-1 h-auto"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${logsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            {logsLoading ? (
              <div className="text-center py-4">
                <div className="text-xs text-gray-500">Loading...</div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-4">
                <Clock className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <div className="text-xs text-gray-500">No activity yet</div>
                <div className="text-[10px] text-gray-400">Requests will appear here</div>
              </div>
            ) : (
              <div className="border rounded-md max-h-[200px] overflow-y-auto">
                {logs.map((log: AIRequestLog) => (
                  <LogRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Advanced Settings Tab */}
          <TabsContent value="advanced" className="space-y-3">
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Settings className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-blue-800">Connection Status</div>
                  <div className="text-[10px] text-blue-700">OpenAI GPT-4o • API key from Replit Secrets</div>
                </div>
                <Button 
                  onClick={testConnection} 
                  disabled={isTestingConnection}
                  variant="outline"
                  className="text-xs px-2 py-1 h-auto"
                >
                  <TestTube className="w-3 h-3 mr-1" />
                  {isTestingConnection ? 'Testing...' : 'Test'}
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-green-50 rounded border">
                  <div className="text-xs font-medium text-green-600">Online</div>
                  <div className="text-[10px] text-gray-500">Connection</div>
                </div>
                <div className="p-2 bg-blue-50 rounded border">
                  <div className="text-xs font-medium text-blue-600">{generalSettings.model}</div>
                  <div className="text-[10px] text-gray-500">Model</div>
                </div>
                <div className="p-2 bg-gray-50 rounded border">
                  <div className="text-xs font-medium text-gray-600">Ready</div>
                  <div className="text-[10px] text-gray-500">Status</div>
                </div>
              </div>

              <div className="text-xs text-gray-600 p-3 bg-gray-50 rounded-lg">
                <div className="font-medium mb-2">Current Configuration Summary:</div>
                <div className="space-y-1 text-[11px]">
                  <div>• Model: {generalSettings.model}</div>
                  <div>• Temperature: {generalSettings.temperature}</div>
                  <div>• Max Tokens: {generalSettings.maxTokens}</div>
                  <div>• Historical Limit: {dataSettings.historicalTicketLimit} messages</div>
                  <div>• Customer Profile: {dataSettings.includeCustomerProfile ? 'Enabled' : 'Disabled'}</div>
                  <div>• Ticket History: {dataSettings.includeTicketHistory ? 'Enabled' : 'Disabled'}</div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Data Preview Tab */}
          <TabsContent value="preview" className="space-y-3">
            <AIDataPreview />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}