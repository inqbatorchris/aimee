import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Brain, Database, Settings, Shield, BookOpen, Eye, EyeOff, Save, TestTube, Key, Loader2, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AgentConfigManager from './AgentConfigManager';
import SimpleTableKB from './KnowledgeBase/SimpleTableKB';
import AIRequestLogs from './AIRequestLogs';

export default function AIConfigurationPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Data Sources state
  const [dataSourcesConfig, setDataSourcesConfig] = useState({
    includeCustomerProfile: true,
    includeFinancialData: true,
    includeServiceData: true,
    includeTicketHistory: true,
    historicalTicketLimit: 5,
    includeInternalNotes: false,
    includeBillingDetails: true,
    includeAgentProfile: true
  });
  
  // Model settings state
  const [modelConfig, setModelConfig] = useState({
    model: 'gpt-5-mini',
    temperature: 0.7,
    maxTokens: 500,
    hasApiKey: false
  });
  
  // Quality controls state
  const [qualityConfig, setQualityConfig] = useState({
    requireApproval: true,
    autoSaveDrafts: true,
    contentFilterLevel: 'moderate',
    confidenceThreshold: 0.7,
    blockInappropriate: true,
    requireHumanReview: false
  });
  
  const { toast } = useToast();

  console.log('AIConfigurationPanel: Rendering component');

  // Load all configurations on mount
  useEffect(() => {
    loadAllConfigurations();
  }, []);

  const loadAllConfigurations = async () => {
    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      // Load prompt configuration
      const promptResponse = await fetch('/api/ai/prompt', { headers });
      if (promptResponse.ok) {
        const promptData = await promptResponse.json();
        setPrompt(promptData.prompt || '');
      }

      // Load data sources configuration
      const dataSourcesResponse = await fetch('/api/ai/data-sources', { headers });
      if (dataSourcesResponse.ok) {
        const dataSourcesData = await dataSourcesResponse.json();
        setDataSourcesConfig(dataSourcesData);
      }

      // Load model configuration
      const modelResponse = await fetch('/api/ai/models', { headers });
      if (modelResponse.ok) {
        const modelData = await modelResponse.json();
        setModelConfig(modelData);
      }

      // Load quality controls configuration
      const qualityResponse = await fetch('/api/ai/quality-controls', { headers });
      if (qualityResponse.ok) {
        const qualityData = await qualityResponse.json();
        setQualityConfig(qualityData);
      }

    } catch (error) {
      console.error('Failed to load AI configurations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI configuration settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePrompt = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Error',
        description: 'Prompt cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/prompt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'AI prompt has been updated successfully',
        });
      } else {
        throw new Error('Failed to save prompt');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save AI prompt. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save data sources configuration
  const saveDataSources = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/data-sources', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataSourcesConfig),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Data sources configuration updated successfully',
        });
      } else {
        throw new Error('Failed to save data sources configuration');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save data sources configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save API key to environment/secrets
  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: 'Error',
        description: 'API key cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/api-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'OpenAI API key has been saved successfully',
        });
        // Update model config to reflect API key is now available
        setModelConfig(prev => ({ ...prev, hasApiKey: true }));
        // Clear the local input for security
        setApiKey('');
      } else if (response.status === 401) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in again to save your API key.',
          variant: 'destructive',
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save API key');
      }
    } catch (error) {
      console.error('Save API key error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save API key. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save model configuration
  const saveModelConfig = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/models', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Model configuration updated successfully',
        });
      } else if (response.status === 401) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in again to save your configuration.',
          variant: 'destructive',
        });
        // Redirect to login or refresh auth
        window.location.href = '/login';
      } else {
        throw new Error('Failed to save model configuration');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save model configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Test OpenAI connection
  const testConnection = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Connection Successful',
          description: `OpenAI connection test passed with ${result.model}`,
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.details || 'Unable to connect to OpenAI',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Connection test error:', error);
      toast({
        title: 'Connection Test Failed',
        description: 'Unable to test OpenAI connection',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save quality controls configuration
  const saveQualityControls = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/quality-controls', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(qualityConfig),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Quality controls updated successfully',
        });
      } else {
        throw new Error('Failed to save quality controls');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save quality controls',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-3 sm:p-4">
      <div className="mb-4">
        <p className="text-xs text-gray-600">
          Configure AI-powered support ticket responses and intelligent customer assistance.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7 h-auto gap-1">
          <TabsTrigger value="dashboard" className="flex flex-col items-center gap-1 text-xs p-2 sm:p-3 min-h-[50px] sm:min-h-[60px] touch-manipulation">
            <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-[10px]">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex flex-col items-center gap-1 text-xs p-2 sm:p-3 min-h-[50px] sm:min-h-[60px] touch-manipulation">
            <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-[10px]">Prompts</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex flex-col items-center gap-1 text-xs p-2 sm:p-3 min-h-[50px] sm:min-h-[60px] touch-manipulation">
            <Database className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-[10px]">Data</span>
          </TabsTrigger>
          <TabsTrigger value="models" className="flex flex-col items-center gap-1 text-xs p-2 sm:p-3 min-h-[50px] sm:min-h-[60px] touch-manipulation">
            <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-[10px]">Models</span>
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex flex-col items-center gap-1 text-xs p-2 sm:p-3 min-h-[50px] sm:min-h-[60px] touch-manipulation">
            <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-[10px]">Quality</span>
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex flex-col items-center gap-1 text-xs p-2 sm:p-3 min-h-[50px] sm:min-h-[60px] touch-manipulation">
            <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-[10px]">Knowledge</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex flex-col items-center gap-1 text-xs p-2 sm:p-3 min-h-[50px] sm:min-h-[60px] touch-manipulation">
            <Code className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-[10px]">Logs</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-3 sm:mt-4">
          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="flex items-center gap-2 text-xs">
                  <Bot className="w-3 h-3" />
                  AI Assistant Status
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Current status and configuration overview
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-xs font-bold text-red-600">Offline</div>
                    <div className="text-[10px] text-gray-600">API Connection</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs font-bold text-blue-600">GPT-4o</div>
                    <div className="text-[10px] text-gray-600">AI Model</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-xs font-bold text-yellow-600">Setup Needed</div>
                    <div className="text-[10px] text-gray-600">Configuration</div>
                  </div>
                </div>
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2 text-xs">Getting Started</h4>
                  <ol className="text-[10px] text-blue-800 space-y-1">
                    <li>1. Configure your OpenAI API key in the Models tab</li>
                    <li>2. Customize the system prompt in the Prompts tab</li>
                    <li>3. Set up data sources and quality controls</li>
                    <li>4. Test AI responses in support tickets</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prompts" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-xs">System Prompt Configuration</CardTitle>
                <CardDescription className="text-[10px]">
                  Customize how the AI assistant responds to customer support tickets
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="prompt" className="text-xs">System Prompt</Label>
                  {isLoading ? (
                    <div className="min-h-[200px] sm:min-h-[300px] border rounded-md flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <Textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Enter your custom AI prompt..."
                      className="min-h-[150px] sm:min-h-[200px] font-mono text-[10px]"
                    />
                  )}
                  <p className="text-[10px] text-gray-500">
                    The AI will receive customer information, account details, ticket context, and this prompt to generate responses.
                  </p>
                </div>
                <Button 
                  onClick={savePrompt}
                  disabled={isSaving || isLoading || !prompt.trim()}
                  className="flex items-center gap-2 text-[10px] w-full sm:w-auto min-h-[40px] sm:min-h-[44px] touch-manipulation"
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Prompt'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-xs">Data Sources Configuration</CardTitle>
                <CardDescription className="text-[10px]">
                  Control what customer and system data is included in AI context
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs">Include Customer Profile</Label>
                      <p className="text-[10px] text-gray-500">Name, email, phone, address, account status</p>
                    </div>
                    <Switch 
                      checked={dataSourcesConfig.includeCustomerProfile}
                      onCheckedChange={(checked) => setDataSourcesConfig(prev => ({ ...prev, includeCustomerProfile: checked }))}
                      className="flex-shrink-0" 
                    />
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs">Include Financial Data</Label>
                      <p className="text-[10px] text-gray-500">Account balance, recent invoices, payment history</p>
                    </div>
                    <Switch 
                      checked={dataSourcesConfig.includeFinancialData}
                      onCheckedChange={(checked) => setDataSourcesConfig(prev => ({ ...prev, includeFinancialData: checked }))}
                      className="flex-shrink-0" 
                    />
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs">Include Service Data</Label>
                      <p className="text-[10px] text-gray-500">Active services, connection status, diagnostics</p>
                    </div>
                    <Switch 
                      checked={dataSourcesConfig.includeServiceData}
                      onCheckedChange={(checked) => setDataSourcesConfig(prev => ({ ...prev, includeServiceData: checked }))}
                      className="flex-shrink-0" 
                    />
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs">Include Ticket History</Label>
                      <p className="text-[10px] text-gray-500">Previous support interactions and resolutions</p>
                    </div>
                    <Switch 
                      checked={dataSourcesConfig.includeTicketHistory}
                      onCheckedChange={(checked) => setDataSourcesConfig(prev => ({ ...prev, includeTicketHistory: checked }))}
                      className="flex-shrink-0" 
                    />
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs">Include Agent Profile</Label>
                      <p className="text-[10px] text-gray-500">Support agent name, email, role for professional sign-offs</p>
                    </div>
                    <Switch 
                      checked={dataSourcesConfig.includeAgentProfile}
                      onCheckedChange={(checked) => setDataSourcesConfig(prev => ({ ...prev, includeAgentProfile: checked }))}
                      className="flex-shrink-0" 
                    />
                  </div>
                </div>
                <Button 
                  onClick={saveDataSources}
                  disabled={isSaving}
                  className="flex items-center gap-2 text-[10px] w-full min-h-[36px] sm:min-h-[44px] touch-manipulation"
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Data Sources'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="flex items-center gap-2 text-xs">
                  <Key className="w-3 h-3" />
                  OpenAI API Configuration
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Configure your OpenAI API key and model settings
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="api-key" className="text-xs">API Key</Label>
                  <div className="flex flex-col gap-3">
                    <div className="relative">
                      <Input
                        id="api-key"
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="pr-10 text-[10px] min-h-[36px] sm:min-h-[44px]"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-2 sm:px-3 min-w-[36px] sm:min-w-[44px] touch-manipulation"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button 
                        onClick={saveApiKey}
                        disabled={isSaving || !apiKey.trim()}
                        className="flex items-center gap-2 text-[10px] min-h-[36px] sm:min-h-[44px] touch-manipulation"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        {isSaving ? 'Saving...' : 'Save API Key'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={testConnection}
                        disabled={isSaving}
                        className="flex items-center gap-2 text-[10px] min-h-[36px] sm:min-h-[44px] touch-manipulation"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <TestTube className="w-3 h-3" />
                        )}
                        {isSaving ? 'Testing...' : 'Test Connection'}
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {modelConfig.hasApiKey ? (
                      <span className="text-green-600">✓ API key configured in environment</span>
                    ) : (
                      <>
                        For persistent storage, add OPENAI_API_KEY to{' '}
                        <button 
                          onClick={() => window.open('https://replit.com/~/secrets', '_blank')}
                          className="text-blue-600 underline hover:text-blue-800"
                        >
                          Replit Secrets
                        </button>
                      </>
                    )}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Model Settings</Label>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label htmlFor="model" className="text-[10px] text-gray-600">AI Model</Label>
                      <Select value={modelConfig.model} onValueChange={(value) => setModelConfig(prev => ({ ...prev, model: value }))}>
                        <SelectTrigger className="text-[10px] min-h-[32px]">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-5" className="text-[10px]">GPT-5 (Top-tier, most capable)</SelectItem>
                          <SelectItem value="gpt-5-mini" className="text-[10px]">GPT-5 Mini (Recommended - balanced)</SelectItem>
                          <SelectItem value="gpt-5-nano" className="text-[10px]">GPT-5 Nano (Fast & budget-friendly)</SelectItem>
                          <SelectItem value="gpt-4.1" className="text-[10px]">GPT-4.1 (1M token context)</SelectItem>
                          <SelectItem value="gpt-4.1-mini" className="text-[10px]">GPT-4.1 Mini (Cost-effective)</SelectItem>
                          <SelectItem value="gpt-4o" className="text-[10px]">GPT-4o (Multimodal)</SelectItem>
                          <SelectItem value="o3" className="text-[10px]">o3 (Advanced reasoning)</SelectItem>
                          <SelectItem value="o3-mini" className="text-[10px]">o3-mini (Efficient reasoning)</SelectItem>
                          <SelectItem value="o4-mini" className="text-[10px]">o4-mini (Fast reasoning)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[9px] text-gray-500">Choose the AI model for your assistant</p>
                    </div>
                    <div>
                      <Label htmlFor="temperature" className="text-[10px] text-gray-600">Temperature ({modelConfig.temperature})</Label>
                      <input
                        id="temperature"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={modelConfig.temperature}
                        onChange={(e) => setModelConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <p className="text-[9px] text-gray-500">Controls randomness in responses</p>
                    </div>
                    <div>
                      <Label htmlFor="maxTokens" className="text-[10px] text-gray-600">Max Tokens</Label>
                      <Input
                        id="maxTokens"
                        type="number"
                        min="50"
                        max="2000"
                        value={modelConfig.maxTokens}
                        onChange={(e) => setModelConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                        className="text-[10px] min-h-[32px]"
                      />
                      <p className="text-[9px] text-gray-500">Maximum response length</p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={saveModelConfig}
                  disabled={isSaving}
                  className="flex items-center gap-2 text-[10px] w-full min-h-[36px] sm:min-h-[44px] touch-manipulation"
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="space-y-4 sm:space-y-6">
            {/* NEW SECTION - Agent Configuration Management */}
            <Card>
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-xs">Agent Configuration</CardTitle>
                <CardDescription className="text-[10px]">
                  Manage versions of AI agent configurations
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
                <AgentConfigManager />
              </CardContent>
            </Card>

            {/* EXISTING SECTION - Quality Controls (unchanged) */}
            <Card>
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-xs">Quality Controls</CardTitle>
                <CardDescription className="text-[10px]">
                  Set approval workflows and content filtering
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs">Require Agent Approval</Label>
                    <p className="text-[10px] text-gray-500">AI responses must be reviewed before sending</p>
                  </div>
                  <Switch 
                    checked={qualityConfig.requireApproval}
                    onCheckedChange={(checked) => setQualityConfig(prev => ({ ...prev, requireApproval: checked }))}
                    className="flex-shrink-0" 
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs">Auto-save as Drafts</Label>
                    <p className="text-[10px] text-gray-500">Automatically save AI responses as drafts</p>
                  </div>
                  <Switch 
                    checked={qualityConfig.autoSaveDrafts}
                    onCheckedChange={(checked) => setQualityConfig(prev => ({ ...prev, autoSaveDrafts: checked }))}
                    className="flex-shrink-0" 
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs">Block Inappropriate Content</Label>
                    <p className="text-[10px] text-gray-500">Filter inappropriate or sensitive content</p>
                  </div>
                  <Switch 
                    checked={qualityConfig.blockInappropriate}
                    onCheckedChange={(checked) => setQualityConfig(prev => ({ ...prev, blockInappropriate: checked }))}
                    className="flex-shrink-0" 
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs">Require Human Review</Label>
                    <p className="text-[10px] text-gray-500">Flag responses for manual review</p>
                  </div>
                  <Switch 
                    checked={qualityConfig.requireHumanReview}
                    onCheckedChange={(checked) => setQualityConfig(prev => ({ ...prev, requireHumanReview: checked }))}
                    className="flex-shrink-0" 
                  />
                </div>
                <Button 
                  onClick={saveQualityControls}
                  disabled={isSaving}
                  className="flex items-center gap-2 text-[10px] w-full min-h-[36px] sm:min-h-[44px] touch-manipulation"
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Quality Controls'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-4 sm:space-y-6">
            <SimpleTableKB />
          </TabsContent>

          <TabsContent value="logs" className="space-y-4 sm:space-y-6">
            <AIRequestLogs />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}