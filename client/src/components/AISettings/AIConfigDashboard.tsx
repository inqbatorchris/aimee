import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Bot, Zap, Database, BookOpen, TestTube } from 'lucide-react';

interface AIStatus {
  apiConnection: 'connected' | 'error' | 'checking';
  modelStatus: string;
  kbArticles: number;
  responseCount: number;
  successRate: number;
}

export default function AIConfigDashboard() {
  const [status, setStatus] = useState<AIStatus>({
    apiConnection: 'checking',
    modelStatus: 'GPT-4o',
    kbArticles: 0,
    responseCount: 0,
    successRate: 0
  });

  const [isTestingAI, setIsTestingAI] = useState(false);

  useEffect(() => {
    checkAIStatus();
  }, []);

  const checkAIStatus = async () => {
    try {
      const response = await fetch('/api/ai/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(prev => ({
          ...prev,
          apiConnection: 'connected',
          kbArticles: data.kbArticles || 0,
          responseCount: data.responseCount || 0,
          successRate: data.successRate || 0
        }));
      } else {
        setStatus(prev => ({ ...prev, apiConnection: 'error' }));
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, apiConnection: 'error' }));
    }
  };

  const testAIGeneration = async () => {
    setIsTestingAI(true);
    try {
      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPrompt: 'Generate a brief test response for a connectivity issue.'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`AI Test Successful: ${data.response}`);
      } else {
        alert('AI test failed. Check your configuration.');
      }
    } catch (error) {
      alert('AI test failed. Check your connection.');
    } finally {
      setIsTestingAI(false);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600 animate-pulse" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Status</CardTitle>
            <StatusIcon status={status.apiConnection} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status.apiConnection === 'connected' ? 'Online' : 
               status.apiConnection === 'error' ? 'Offline' : 'Checking...'}
            </div>
            <p className="text-xs text-muted-foreground">
              OpenAI API Connection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Model</CardTitle>
            <Bot className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.modelStatus}</div>
            <p className="text-xs text-muted-foreground">
              Current active model
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KB Articles</CardTitle>
            <BookOpen className="w-5 h-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.kbArticles}</div>
            <p className="text-xs text-muted-foreground">
              Knowledge base entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Zap className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              AI response quality
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Status</CardTitle>
          <CardDescription>
            Overview of your AI assistant setup and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium">System Prompt</span>
            </div>
            <Badge variant="secondary">Configured</Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium">Data Sources</span>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="font-medium">Knowledge Base</span>
            </div>
            <Badge variant="outline">Needs Content</Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="font-medium">API Key</span>
            </div>
            <Badge variant="destructive">Not Configured</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Test your AI configuration and perform common tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={testAIGeneration} 
              disabled={isTestingAI || status.apiConnection !== 'connected'}
              className="flex items-center gap-2"
            >
              <TestTube className="w-4 h-4" />
              {isTestingAI ? 'Testing...' : 'Test AI Response'}
            </Button>

            <Button variant="outline" onClick={checkAIStatus} className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Refresh Status
            </Button>

            <Button variant="outline" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Add KB Article
            </Button>
          </div>

          {status.apiConnection === 'error' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                OpenAI API connection failed. Please check your API key configuration in the Models tab.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>
            AI response generation statistics and usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Response Quality</span>
              <span>{status.successRate}%</span>
            </div>
            <Progress value={status.successRate} className="h-2" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{status.responseCount}</div>
              <div className="text-xs text-muted-foreground">Total Responses</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">89%</div>
              <div className="text-xs text-muted-foreground">Agent Approval</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">2.3s</div>
              <div className="text-xs text-muted-foreground">Avg Response Time</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">$12.34</div>
              <div className="text-xs text-muted-foreground">This Month Cost</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}