import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Phone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  TestTube,
  ExternalLink,
  Activity,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// Validation schema for Vapi setup form
const vapiSetupSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

type VapiSetupFormData = {
  apiKey: string;
};

interface ConnectionTestResult {
  success: boolean;
  status: string;
  message: string;
  error?: string;
  testedAt: string;
}

export default function VapiSetup() {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to get existing Vapi integration
  const { data: integrations = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/integrations'],
    retry: false,
  });
  
  // Find the Vapi integration from the list
  const installation = integrations?.find((int: any) => int.platformType === 'vapi');

  // Initialize form
  const form = useForm<VapiSetupFormData>({
    resolver: zodResolver(vapiSetupSchema),
    defaultValues: {
      apiKey: "",
    },
  });

  // Populate form with existing data
  useEffect(() => {
    if (installation && !form.formState.isDirty) {
      if (installation.connectionStatus === 'active' || installation.hasCredentials) {
        setIsSaved(true);
      }
    }
  }, [installation, form]);

  // Mutation to save or update configuration
  const saveMutation = useMutation({
    mutationFn: async (data: VapiSetupFormData) => {
      if (installation) {
        // Update existing integration
        return await apiRequest(`/api/integrations`, {
          method: 'POST',
          body: {
            platformType: 'vapi',
            name: 'Vapi Voice AI',
            credentials: { apiKey: data.apiKey },
            connectionStatus: 'active',
          },
        });
      } else {
        // Create new integration
        return await apiRequest('/api/integrations', {
          method: 'POST',
          body: {
            platformType: 'vapi',
            name: 'Vapi Voice AI',
            credentials: { apiKey: data.apiKey },
            connectionStatus: 'active',
            isEnabled: true,
          },
        });
      }
    },
    onSuccess: () => {
      setIsSaved(true);
      toast({
        title: 'Configuration saved',
        description: 'Your Vapi API key has been securely stored.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      form.reset({ apiKey: '' }); // Clear the form after saving
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to save',
        description: error?.message || 'Could not save Vapi configuration.',
        variant: 'destructive',
      });
    },
  });

  // Function to test the connection
  const testConnection = async () => {
    if (!installation) {
      toast({
        title: 'Save configuration first',
        description: 'Please save your API key before testing the connection.',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const result: any = await apiRequest(`/api/integrations/vapi/test`, {
        method: 'POST',
      });

      setTestResult({
        success: result.success || result.status === 'connected',
        status: result.status,
        message: result.message || 'Connection test completed',
        testedAt: new Date().toISOString(),
      });

      if (result.success || result.status === 'connected') {
        toast({
          title: 'Connection successful',
          description: 'Your Vapi integration is working correctly.',
        });
        queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      } else {
        toast({
          title: 'Connection failed',
          description: result.message || 'Could not connect to Vapi.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        status: 'error',
        message: error?.message || 'Connection test failed',
        error: error?.message,
        testedAt: new Date().toISOString(),
      });

      toast({
        title: 'Connection test failed',
        description: error?.message || 'An error occurred during the connection test.',
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const onSubmit = (data: VapiSetupFormData) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/integrations">
          <Button variant="ghost" size="sm" className="mb-4">
            ← Back to Integrations
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-violet-500 bg-opacity-10">
            <Phone className="h-6 w-6 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Vapi Voice AI</h1>
            <p className="text-sm text-muted-foreground">
              Autonomous voice AI assistant for support and sales
            </p>
          </div>
        </div>
        
        {installation && (
          <Badge variant={installation.connectionStatus === 'active' ? 'default' : 'secondary'} className="mt-2">
            {installation.connectionStatus === 'active' ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                {installation.connectionStatus}
              </>
            )}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="setup" data-testid="tab-setup">
            <TestTube className="h-4 w-4 mr-2" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <Activity className="h-4 w-4 mr-2" />
            Performance Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          {/* How to Get API Key Instructions */}
          <Alert className="mb-4">
            <AlertDescription>
              <strong>How to get your API key:</strong>
              <ol className="list-decimal ml-4 mt-2 space-y-1 text-sm">
                <li>Go to <a href="https://dashboard.vapi.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">dashboard.vapi.ai</a></li>
                <li>Click on your account menu → <strong>API Keys</strong></li>
                <li>Copy your <strong>Private Key</strong> (click the copy icon)</li>
                <li>Paste it below and save</li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Enter your Vapi API key to enable voice AI integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vapi API Key</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={isSaved ? "API key is saved (hidden)" : "Enter your Vapi API key"}
                            {...field}
                            data-testid="input-api-key"
                          />
                        </FormControl>
                        <FormDescription>
                          Get your API key from{' '}
                          <a
                            href="https://dashboard.vapi.ai/org/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Vapi Dashboard → API Keys
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          {' '}(copy your Private Key)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={saveMutation.isPending}
                      data-testid="button-save"
                    >
                      {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isSaved ? 'Update API Key' : 'Save API Key'}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={testConnection}
                      disabled={isTestingConnection || !installation}
                      data-testid="button-test-connection"
                    >
                      {isTestingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Test Connection
                    </Button>
                  </div>
                </form>
              </Form>

              {/* Test Result */}
              {testResult && (
                <Alert className="mt-4" variant={testResult.success ? 'default' : 'destructive'}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <strong>{testResult.success ? 'Success' : 'Failed'}:</strong> {testResult.message}
                    {testResult.error && (
                      <div className="mt-2 text-sm opacity-80">
                        Error: {testResult.error}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Webhook Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Configure these webhooks in your Vapi assistant settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Webhook URL</label>
                <div className="mt-1 flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/api/vapi/webhooks`}
                    className="font-mono text-sm"
                    data-testid="input-webhook-url"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/vapi/webhooks`);
                      toast({ title: 'Copied to clipboard' });
                    }}
                    data-testid="button-copy-webhook"
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Add this URL to your Vapi assistant's webhook settings to receive call events
                </p>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">Supported Events</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">call.started</code> - Call initiated</li>
                  <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">status-update</code> - Call status changed</li>
                  <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">end-of-call-report</code> - Call completed with full data</li>
                  <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">function-call</code> - Tool was called during conversation</li>
                  <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">hang</code> - Call ended</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Tools Card */}
          <Card>
            <CardHeader>
              <CardTitle>Available Tools</CardTitle>
              <CardDescription>
                Voice AI tools that your assistants can call
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <h4 className="text-sm font-medium">lookup_customer</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Search for customers by email or account ID
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="text-sm font-medium">send_sms_verification</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Send 6-digit SMS verification codes for identity verification
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="text-sm font-medium">create_support_ticket</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create support tickets as work items in your system
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="text-sm font-medium">schedule_demo</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Schedule product demos and create appointments
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="text-sm font-medium">transfer_to_business</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Transfer calls to human agents when needed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Dashboard Tab */}
        <TabsContent value="dashboard">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-2">Performance Dashboard</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  View detailed call analytics and performance metrics
                </p>
                <Link href="/vapi-performance">
                  <Button data-testid="button-view-dashboard">
                    View Dashboard
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
