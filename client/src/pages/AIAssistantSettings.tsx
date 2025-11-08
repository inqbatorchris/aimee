import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, Settings as SettingsIcon, Zap, Shield, TrendingUp, Loader2, Key, CheckCircle2, XCircle, AlertCircle, Activity, ChevronDown, ChevronRight } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ChatSessionActivityView } from '@/components/AIAssistant/ChatSessionActivityView';

function ActivityLogRow({ log }: { log: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'ai_chat': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'agent_action': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'openai_test': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'openai_key_saved': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <>
      <TableRow className="cursor-pointer" data-testid={`log-row-${log.id}`}>
        <TableCell>
          {hasMetadata ? (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0" 
              onClick={() => setIsOpen(!isOpen)}
              data-testid={`button-expand-${log.id}`}
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <span className="w-6 inline-block" />
          )}
        </TableCell>
        <TableCell>
          <Badge className={`text-xs ${getTypeBadgeColor(log.action_type || log.actionType)}`} variant="secondary">
            {formatType(log.action_type || log.actionType)}
          </Badge>
        </TableCell>
        <TableCell className="font-medium">{log.description}</TableCell>
        <TableCell className="text-right text-sm text-muted-foreground">
          {new Date(log.created_at || log.createdAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </TableCell>
      </TableRow>
      {hasMetadata && isOpen && (
        <TableRow>
          <TableCell colSpan={4} className="p-0 border-0 bg-muted/50">
            <div className="px-4 py-3">
              <p className="text-xs font-medium mb-2">Details:</p>
              <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function AIAssistantSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Fetch AI Assistant configuration
  const { data: config, isLoading } = useQuery({
    queryKey: ['/api/ai-chat/config'],
    queryFn: async () => {
      const res = await fetch('/api/ai-chat/config', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      return res.json();
    }
  });

  // Fetch Knowledge Base documents for instruction document selector
  const { data: kbDocuments, isLoading: kbLoading, error: kbError } = useQuery({
    queryKey: ['/api/knowledge-base/documents'],
  });
  
  console.log('🔍 KB Documents Query State:', { 
    kbDocuments, 
    kbLoading, 
    kbError,
    isArray: Array.isArray(kbDocuments),
    count: kbDocuments?.length 
  });
  
  console.log('⚙️ AI Config State:', {
    config,
    instructionDocumentId: config?.instructionDocumentId,
    personalityName: config?.personalityName,
    selectValue: config?.instructionDocumentId?.toString() || 'none'
  });

  // Fetch OpenAI integration status
  const { data: openaiIntegration } = useQuery({
    queryKey: ['/api/integrations/openai'],
    queryFn: async () => {
      const res = await fetch('/api/integrations/openai', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (res.status === 404) return null;
      return res.json();
    }
  });

  // Fetch available functions
  const { data: functionsData, isLoading: functionsLoading } = useQuery({
    queryKey: ['/api/ai-chat/functions'],
    queryFn: async () => {
      const res = await fetch('/api/ai-chat/functions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch functions: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('🔍 Functions fetched from backend:', data);
      console.log('🔍 First function structure:', data[0]);
      return data;
    }
  });

  // Ensure functions is always an array
  const functions = Array.isArray(functionsData) ? functionsData : [];
  console.log('📊 Functions array for rendering:', functions);

  // Activity log filters
  const [logFilter, setLogFilter] = useState('all');
  const [logLimit, setLogLimit] = useState(10);
  const [showGroupedView, setShowGroupedView] = useState(true);

  // Fetch activity logs
  const { data: activityData, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/ai-chat/activity-logs', logFilter, logLimit],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: logLimit.toString(),
        actionType: logFilter
      });
      const res = await fetch(`/api/ai-chat/activity-logs?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      return res.json();
    }
  });

  // Fetch grouped chat sessions
  const { data: chatSessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['/api/ai-chat/activity-logs/grouped', logLimit],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: logLimit.toString(),
      });
      const res = await fetch(`/api/ai-chat/activity-logs/grouped?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      return res.json();
    }
  });

  const activityLogs = activityData?.logs || [];
  const totalLogs = activityData?.total || 0;
  const chatSessions = chatSessionsData?.sessions || [];

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest('/api/ai-chat/config', {
        method: 'PATCH',
        body: updates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-chat/config'] });
      toast({ title: 'Configuration updated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to update configuration', variant: 'destructive' });
    }
  });

  const toggleFunctionMutation = useMutation({
    mutationFn: async ({ functionId, enabled }: { functionId: number; enabled: boolean }) => {
      console.log('🔄 Toggle mutation starting:', { functionId, enabled });
      const response = await apiRequest(`/api/ai-chat/functions/${functionId}`, {
        method: 'PATCH',
        body: { isEnabled: enabled }
      });
      const result = await response.json();
      console.log('✅ Toggle mutation response:', result);
      return result;
    },
    onMutate: async ({ functionId, enabled }) => {
      console.log('🎯 Optimistic update:', { functionId, enabled });
      await queryClient.cancelQueries({ queryKey: ['/api/ai-chat/functions'] });
      
      const previousFunctions = queryClient.getQueryData(['/api/ai-chat/functions']);
      console.log('📦 Previous functions before optimistic update:', previousFunctions);
      
      queryClient.setQueryData(['/api/ai-chat/functions'], (old: any) => {
        if (!old) return old;
        const updated = old.map((f: any) => {
          if (f.id === functionId) {
            console.log(`🔀 Updating function ${f.id}: isEnabled=${f.isEnabled} → ${enabled}`);
            return { ...f, isEnabled: enabled };
          }
          return f;
        });
        console.log('📦 Functions after optimistic update:', updated);
        return updated;
      });
      
      return { previousFunctions };
    },
    onError: (error: any, variables, context: any) => {
      console.error('❌ Toggle mutation error:', error);
      if (context?.previousFunctions) {
        queryClient.setQueryData(['/api/ai-chat/functions'], context.previousFunctions);
      }
      toast({ 
        title: 'Failed to update function', 
        description: error?.message || 'Please try again',
        variant: 'destructive' 
      });
    },
    onSuccess: (data) => {
      console.log('✅ Toggle mutation success, invalidating cache. Response data:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/ai-chat/functions'] });
      toast({ title: 'Function updated successfully' });
    }
  });

  const saveApiKeyMutation = useMutation({
    mutationFn: async (apiKeyValue: string) => {
      return apiRequest('/api/integrations/openai', {
        method: 'POST',
        body: { apiKey: apiKeyValue }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/openai'] });
      setApiKey('');
      setShowApiKey(false);
      toast({ title: 'OpenAI API Key saved successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to save API key', variant: 'destructive' });
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/integrations/openai/test', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/openai'] });
      toast({ title: 'Connection test successful' });
    },
    onError: () => {
      toast({ title: 'Connection test failed', variant: 'destructive' });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">AI Assistant Settings</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Configure Aimee's personality, models, and capabilities</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile: Dropdown */}
          <div className="md:hidden mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger data-testid="select-tab-mobile">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">
                  <div className="flex items-center gap-2">
                    <SettingsIcon className="h-4 w-4" />
                    General
                  </div>
                </SelectItem>
                <SelectItem value="personality">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Personality
                  </div>
                </SelectItem>
                <SelectItem value="functions">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Functions
                  </div>
                </SelectItem>
                <SelectItem value="performance">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Performance
                  </div>
                </SelectItem>
                <SelectItem value="activity">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Activity
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Tabs */}
          <TabsList className="hidden md:grid w-full grid-cols-5">
            <TabsTrigger value="general" data-testid="tab-general">
              <SettingsIcon className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="personality" data-testid="tab-personality">
              <Sparkles className="h-4 w-4 mr-2" />
              Personality
            </TabsTrigger>
            <TabsTrigger value="functions" data-testid="tab-functions">
              <Zap className="h-4 w-4 mr-2" />
              Functions
            </TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">
              <TrendingUp className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              <Activity className="h-4 w-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4">
            {/* OpenAI API Key Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  OpenAI API Key
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Configure your OpenAI API key to enable AI-powered features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Connection Status */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  {openaiIntegration?.connectionStatus === 'connected' ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Connected</p>
                        <p className="text-xs text-muted-foreground">
                          Last tested: {openaiIntegration?.lastTestedAt 
                            ? new Date(openaiIntegration.lastTestedAt).toLocaleString() 
                            : 'Never'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnectionMutation.mutate()}
                        disabled={testConnectionMutation.isPending}
                        data-testid="button-test-connection"
                      >
                        {testConnectionMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          'Test Connection'
                        )}
                      </Button>
                    </>
                  ) : openaiIntegration?.connectionStatus === 'failed' ? (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-600">Connection Failed</p>
                        <p className="text-xs text-muted-foreground">
                          {openaiIntegration?.testResult?.error || 'Unable to connect to OpenAI'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnectionMutation.mutate()}
                        disabled={testConnectionMutation.isPending}
                        data-testid="button-test-connection"
                      >
                        {testConnectionMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          'Retry Test'
                        )}
                      </Button>
                    </>
                  ) : openaiIntegration?.hasCredentials ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Ready to Test</p>
                        <p className="text-xs text-muted-foreground">
                          API key saved. Click to test connection
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnectionMutation.mutate()}
                        disabled={testConnectionMutation.isPending}
                        data-testid="button-test-connection"
                      >
                        {testConnectionMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          'Test Connection'
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Not Configured</p>
                        <p className="text-xs text-muted-foreground">
                          Add your OpenAI API key to enable AI features
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* API Key Input */}
                <div className="space-y-2">
                  <Label htmlFor="api-key">OpenAI API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key"
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      data-testid="input-api-key"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowApiKey(!showApiKey)}
                      data-testid="button-toggle-api-key-visibility"
                    >
                      {showApiKey ? '👁️' : '🔒'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get your API key from{' '}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline"
                    >
                      OpenAI Platform
                    </a>
                    . Your key is encrypted and stored securely per organization.
                  </p>
                </div>

                <Button
                  onClick={() => saveApiKeyMutation.mutate(apiKey)}
                  disabled={!apiKey || saveApiKeyMutation.isPending}
                  data-testid="button-save-api-key"
                >
                  {saveApiKeyMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      {openaiIntegration ? 'Update API Key' : 'Save API Key'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">AI Models & Configuration</CardTitle>
                <CardDescription className="text-xs md:text-sm">Configure which AI models Aimee uses for different tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Default Model</Label>
                    <Select 
                      value={config?.defaultModel || 'gpt-4o-mini'}
                      onValueChange={(value) => updateConfigMutation.mutate({ defaultModel: value })}
                    >
                      <SelectTrigger data-testid="select-default-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o (Latest, Most Capable - Recommended)</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast & Affordable)</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Powerful)</SelectItem>
                        <SelectItem value="gpt-4">GPT-4 (Stable & Reliable)</SelectItem>
                        <SelectItem value="o1">o1 (Advanced Reasoning)</SelectItem>
                        <SelectItem value="o3-mini">o3 Mini (Reasoning, Cost-Effective)</SelectItem>
                        <SelectItem value="o4-mini">o4 Mini (Latest Small Reasoning Model)</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Budget Option)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      GPT-4o Mini recommended for best balance of speed, accuracy, and cost
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Temperature</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={config?.temperature || 0.7}
                      onChange={(e) => updateConfigMutation.mutate({ temperature: parseFloat(e.target.value) })}
                      data-testid="input-temperature"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>AI Assistant Enabled</Label>
                    <p className="text-sm text-muted-foreground">Enable or disable the AI assistant for your organization</p>
                  </div>
                  <Switch
                    checked={config?.isEnabled ?? true}
                    onCheckedChange={(checked) => updateConfigMutation.mutate({ isEnabled: checked })}
                    data-testid="switch-enabled"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Personality Settings */}
          <TabsContent value="personality" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Personality Configuration</CardTitle>
                <CardDescription className="text-xs md:text-sm">Customize how Aimee communicates and behaves</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Assistant Name</Label>
                  <Input
                    value={config?.personalityName || 'Aimee'}
                    onChange={(e) => updateConfigMutation.mutate({ personalityName: e.target.value })}
                    data-testid="input-personality-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Instruction Document (Knowledge Base)</Label>
                  <Select
                    value={config?.instructionDocumentId?.toString() || 'none'}
                    onValueChange={(value) => {
                      console.log('📝 Instruction Document changed:', value);
                      updateConfigMutation.mutate({ 
                        instructionDocumentId: value === 'none' ? null : parseInt(value)
                      });
                    }}
                    data-testid="select-instruction-document"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a knowledge base document..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (use custom instructions only)</SelectItem>
                      {Array.isArray(kbDocuments) && kbDocuments.map((doc: any) => (
                        <SelectItem key={doc.id} value={doc.id.toString()}>
                          {doc.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Link a Knowledge Base document to provide detailed instructions, guidelines, or context for the AI assistant. This content will be included in the system prompt.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Custom Instructions</Label>
                  <Textarea
                    rows={6}
                    placeholder="Add custom instructions for the AI assistant's behavior..."
                    value={config?.customInstructions || ''}
                    onChange={(e) => updateConfigMutation.mutate({ customInstructions: e.target.value })}
                    data-testid="textarea-custom-instructions"
                  />
                  <p className="text-xs text-muted-foreground">
                    These instructions will be included in every conversation to guide Aimee's responses. Use the Instruction Document above for longer guidelines.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Functions Management */}
          <TabsContent value="functions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Available Functions</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Manage which actions Aimee can perform. Enabled functions are sent to OpenAI and executed based on user approval settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {functionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : functions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No functions available</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-12">Enabled</TableHead>
                          <TableHead>Function</TableHead>
                          <TableHead className="hidden md:table-cell">Category</TableHead>
                          <TableHead className="hidden lg:table-cell">Calls</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {functions.map((func: any) => (
                        <TableRow
                          key={func.id}
                          className="group hover:bg-muted/30"
                          data-testid={`function-row-${func.id}`}
                        >
                          <TableCell className="py-2">
                            <Switch
                              checked={func.isEnabled}
                              onCheckedChange={(checked) => toggleFunctionMutation.mutate({ functionId: func.id, enabled: checked })}
                              data-testid={`switch-function-${func.id}`}
                            />
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{func.displayName}</span>
                                {func.requiresApproval && (
                                  <Badge variant="outline" className="text-xs">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Approval Required
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">{func.description}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell py-2">
                            <Badge variant="secondary" className="text-xs">{func.category}</Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell py-2 text-xs text-muted-foreground">
                            {func.totalCalls || 0}
                          </TableCell>
                        </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {!functionsLoading && functions.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-900 dark:text-blue-100">
                      <strong>Note:</strong> Only enabled functions are available to the AI. All function executions are logged to the Activity tab with full details including execution time, parameters, and results.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance */}
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Usage & Performance</CardTitle>
                <CardDescription className="text-xs md:text-sm">Monitor AI assistant usage and performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Sessions</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Messages</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Actions Executed</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Performance metrics coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activity Logs
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  View recent AI chat conversations and activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* View Toggle and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="view-toggle" className="text-xs">View:</Label>
                    <Select value={showGroupedView ? 'grouped' : 'raw'} onValueChange={(v) => setShowGroupedView(v === 'grouped')}>
                      <SelectTrigger id="view-toggle" className="w-40" data-testid="select-view-toggle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grouped">Chat Sessions</SelectItem>
                        <SelectItem value="raw">Raw Activity Logs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {!showGroupedView && (
                    <div className="flex-1">
                      <Label htmlFor="log-filter" className="text-xs">Filter by Type</Label>
                      <Select value={logFilter} onValueChange={setLogFilter}>
                        <SelectTrigger id="log-filter" data-testid="select-log-filter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All AI Assistant Activities</SelectItem>
                          <SelectItem value="ai_chat">AI Chat</SelectItem>
                          <SelectItem value="openai_test">API Tests</SelectItem>
                          <SelectItem value="openai_key_saved">API Key Changes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="w-full sm:w-32">
                    <Label htmlFor="log-limit" className="text-xs">Show Records</Label>
                    <Select value={logLimit.toString()} onValueChange={(v) => setLogLimit(parseInt(v))}>
                      <SelectTrigger id="log-limit" data-testid="select-log-limit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Grouped Chat Sessions View */}
                {showGroupedView ? (
                  <ChatSessionActivityView 
                    sessions={chatSessions} 
                    loading={sessionsLoading} 
                  />
                ) : (
                  <>
                    {/* Stats */}
                    <div className="text-xs text-muted-foreground">
                      Showing {activityLogs.length} of {totalLogs} total records
                    </div>

                    {/* Raw Activity Logs Table */}
                    {logsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : activityLogs && activityLogs.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activityLogs.map((log: any) => (
                              <ActivityLogRow key={log.id} log={log} />
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No activity logs yet</p>
                        <p className="text-xs mt-1">Activity will appear here when you use AI features</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
