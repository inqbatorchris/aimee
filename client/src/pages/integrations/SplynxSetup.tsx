import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plug,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Link as LinkIcon,
  Shield,
  TestTube,
  Code2,
  ChevronRight,
  ChevronDown,
  Activity,
  Clock,
  Map,
  MapPin,
  RefreshCw,
  Mail,
  Bot,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { EmailTemplateManager } from "@/components/email/EmailTemplateManager";

// Validation schema for Splynx setup form - simplified to make authHeader optional
const splynxSetupSchema = z.object({
  baseUrl: z.string().url("Must be a valid URL"),
  authHeader: z.string().optional(), // Always optional, we'll check on backend
});

type SplynxSetupFormData = {
  baseUrl: string;
  authHeader?: string;
};

interface SplynxInstallation {
  id: number;
  organizationId: number;
  baseUrl: string;
  connectionStatus: 'disconnected' | 'connected' | 'error';
  lastTestedAt: string | null;
  lastTestError: string | null;
  isEnabled: boolean;
  hasToken: boolean;
  agents: any[];
  createdAt: string;
  updatedAt: string;
}

interface ActivityLog {
  id: number;
  organizationId: number;
  userId: number;
  actionType: string;
  entityType: string;
  entityId: number;
  description: string;
  metadata: any;
  createdAt: string;
}

interface ConnectionTestResult {
  success: boolean;
  status: string;
  message: string;
  error?: string;
  testedAt: string;
  debug?: {
    request: {
      url: string;
      method: string;
      headers: Record<string, string>;
    };
    response: {
      status: number;
      statusText: string;
      body: string;
    };
  };
}

export default function SplynxSetup() {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);
  const [isActivitySheetOpen, setIsActivitySheetOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [defaultSplynxAdminId, setDefaultSplynxAdminId] = useState<string>('72');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to get existing Splynx integration
  const { data: integrations = [], isLoading, error: installationError } = useQuery<any[]>({
    queryKey: ['/api/integrations'],
    retry: false,
  });
  
  // Find the Splynx integration from the list
  const installation = integrations?.find((int: any) => int.platformType === 'splynx');
  
  // Query to get activity logs for this integration
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<ActivityLog[]>({
    queryKey: ['/api/integrations/splynx/activities'],
    enabled: !!installation, // Only fetch if integration exists
    refetchInterval: 5000, // Auto refresh every 5 seconds
  });

  // Check if there's a token decryption error
  const hasTokenDecryptionError = installationError?.message?.includes('decrypt') || 
    (installation?.credentials?.authHeader && testResult?.error?.includes('decrypt'));

  // Initialize form with simplified schema
  const form = useForm<SplynxSetupFormData>({
    resolver: zodResolver(splynxSetupSchema),
    defaultValues: {
      baseUrl: "",
      authHeader: "",
    },
  });

  // Populate form with existing data
  useEffect(() => {
    if (installation && !form.formState.isDirty) {
      // Set the base URL if it exists
      if (installation.credentials?.baseUrl) {
        form.setValue('baseUrl', installation.credentials.baseUrl);
      }
      
      // Check if credentials are saved (status is 'active' means they're saved)
      if (installation.connectionStatus === 'active' || installation.hasCredentials || installation.credentials?.hasAuthHeader) {
        setIsSaved(true);
      }
      
      // Initialize automation settings from metadata
      if (installation.metadata?.defaultSplynxAdminId) {
        setDefaultSplynxAdminId(installation.metadata.defaultSplynxAdminId.toString());
      }
    }
  }, [installation, form]);

  // Mutation for saving installation
  const saveInstallationMutation = useMutation({
    mutationFn: async (data: SplynxSetupFormData) => {
      console.log('saveInstallationMutation.mutationFn called with:', data);
      // Build credentials object
      const credentials: any = {
        baseUrl: data.baseUrl,
      };
      
      // Only include authHeader if user provided a new one
      // If they left it blank but credentials exist, backend will keep existing
      if (data.authHeader) {
        credentials.authHeader = data.authHeader;
      } else if (installation?.credentials?.hasAuthHeader) {
        // Indicate we want to keep existing auth header
        credentials.keepExistingAuthHeader = true;
      }
      
      const body: any = {
        platformType: 'splynx',
        name: 'Splynx Integration',
        credentials,
        connectionStatus: 'inactive',
      };
      
      console.log('Sending POST to /api/integrations with body:', body);
      // Always use POST to create or update integrations
      const response = apiRequest('/api/integrations', {
        method: 'POST',
        body,
      });
      console.log('API request initiated');
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Installation saved",
        description: "Splynx connection details have been saved successfully.",
      });
      setIsSaved(true);
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/splynx/activities'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save installation details.",
        variant: "destructive",
      });
    },
  });

  // Mutation for clearing token directly
  const clearTokenMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/integrations', {
        method: 'POST',
        body: {
          platformType: 'splynx',
          name: 'Splynx Integration',
          credentials: {
            baseUrl: installation?.credentials?.baseUrl || form.getValues('baseUrl'),
            authHeader: '', // Clear the token
          },
          connectionStatus: 'inactive',
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Token cleared",
        description: "The stored token has been cleared. Please enter a new token.",
      });
      form.setValue('authHeader', ''); // Clear the form field
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/splynx/activities'] });
      setTestResult(null); // Clear any existing test results
    },
    onError: (error: any) => {
      toast({
        title: "Clear failed",
        description: error.message || "Failed to clear the token.",
        variant: "destructive",
      });
    },
  });

  // Mutation for saving automation settings
  const saveAutomationSettingsMutation = useMutation({
    mutationFn: async (adminId: number) => {
      if (!installation?.id) {
        throw new Error('No Splynx integration found');
      }
      
      return apiRequest(`/api/integrations/${installation.id}/metadata`, {
        method: 'PATCH',
        body: {
          defaultSplynxAdminId: adminId,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Automation settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save automation settings.",
        variant: "destructive",
      });
    },
  });

  // Handle saving automation settings
  const handleSaveAutomationSettings = () => {
    const adminId = parseInt(defaultSplynxAdminId);
    if (isNaN(adminId) || adminId <= 0) {
      toast({
        title: "Invalid Admin ID",
        description: "Please enter a valid Splynx Admin ID.",
        variant: "destructive",
      });
      return;
    }
    saveAutomationSettingsMutation.mutate(adminId);
  };

  // Mutation for testing connection
  const testConnectionMutation = useMutation({
    mutationFn: async (): Promise<ConnectionTestResult> => {
      const response = await apiRequest('/api/integrations/splynx/test', {
        method: 'POST',
      });
      return await response.json();
    },
    onSuccess: (result) => {
      setTestResult(result);
      if (result.success) {
        toast({
          title: "Connection successful",
          description: "Successfully connected to your Splynx instance.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
        queryClient.invalidateQueries({ queryKey: ['/api/integrations/splynx/activities'] });
      } else {
        toast({
          title: "Connection failed",
          description: result.error || "Unable to connect to Splynx instance.",
          variant: "destructive",
        });
      }
    },
    onError: async (error: any) => {
      console.error('Test connection error:', error);
      
      // Try to extract the error response if it's a fetch error
      let errorData: any = null;
      if (error.response) {
        try {
          errorData = await error.response.json();
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
      }
      
      // If we have structured error data with debug info, use it
      if (errorData?.debug) {
        setTestResult({
          success: false,
          status: 'error',
          message: errorData.message || 'Connection failed',
          error: errorData.error,
          testedAt: errorData.testedAt || new Date().toISOString(),
          debug: errorData.debug
        });
      } else {
        // Fallback to basic error display
        setTestResult({
          success: false,
          status: 'error',
          message: 'Connection failed',
          error: error.message || 'Failed to test connection',
          testedAt: new Date().toISOString(),
          debug: {
            request: {
              url: 'Unknown',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            },
            response: {
              status: 500,
              statusText: 'Internal Server Error',
              body: error.message || 'Failed to test connection'
            }
          }
        });
      }
      
      toast({
        title: "Test failed",
        description: errorData?.error || error.message || "Failed to test connection.",
        variant: "destructive",
      });
      
      // If error mentions decryption, show clear token option
      if ((errorData?.error || error.message)?.includes('decrypt')) {
        toast({
          title: "Token Issue Detected",
          description: "Your stored token appears to be corrupted. Try clearing it and entering a new one.",
          variant: "destructive",
        });
      }
    },
  });

  const handleSave = async (data: SplynxSetupFormData) => {
    console.log('handleSave called with data:', data);
    try {
      // Just save the installation without testing
      console.log('Calling saveInstallationMutation.mutateAsync...');
      await saveInstallationMutation.mutateAsync(data);
      console.log('Save completed successfully');
      
      // Refresh the integrations list to show saved data
      await queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleTestConnection = async () => {
    if (!installation) {
      toast({
        title: "No configuration found",
        description: "Please save your Splynx connection details first.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
    await testConnectionMutation.mutateAsync();
    setIsTestingConnection(false);
  };

  const getStatusBadge = () => {
    if (!installation) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Not Configured
        </Badge>
      );
    }

    // Check if credentials are saved (either from saved state or from backend)
    const hasCredentials = isSaved || installation.connectionStatus === 'active' || installation.credentialsEncrypted;

    if (!hasCredentials) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Not Configured
        </Badge>
      );
    }

    // If we have credentials and status is active, show as configured
    if (installation.connectionStatus === 'active') {
      return (
        <Badge variant="default" className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-3 w-3" />
          Configured
        </Badge>
      );
    }

    const statusConfig = {
      connected: { label: 'Connected', variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      disconnected: { label: 'Disconnected', variant: 'secondary' as const, icon: XCircle, color: 'text-gray-600' },
      error: { label: 'Error', variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' },
      inactive: { label: 'Configured', variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
    };

    const config = statusConfig[installation.connectionStatus as keyof typeof statusConfig] || statusConfig.disconnected;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl" data-testid="splynx-setup">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Plug className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Splynx Integration Setup</h1>
          {getStatusBadge()}
        </div>
        <p className="text-gray-600">
          Connect your Splynx instance to automatically update Key Results with lead counts and other metrics.
        </p>
      </div>

      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="connection" data-testid="tab-connection">
            <LinkIcon className="h-4 w-4 mr-2" />
            Connection
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <Mail className="h-4 w-4 mr-2" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="activities" data-testid="tab-activities">
            <Activity className="h-4 w-4 mr-2" />
            Activities
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-6">
        {/* Token Decryption Error Alert */}
        {hasTokenDecryptionError && (
          <Alert className="border-destructive bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold text-destructive">Token Decryption Error</p>
                <p className="text-sm">
                  Your stored authentication token cannot be decrypted and appears to be corrupted. 
                  This happens when encryption keys change or data becomes corrupted.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Clear corrupted token? You'll need to enter it again.")) {
                        clearTokenMutation.mutate();
                      }
                    }}
                    disabled={clearTokenMutation.isPending}
                  >
                    {clearTokenMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      "Clear Corrupted Token"
                    )}
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Connection Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="baseUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Splynx Base URL</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://your-splynx-instance.com"
                          data-testid="input-base-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="authHeader"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Authorization Header
                        {installation?.credentials?.hasAuthHeader && (
                          <span className="text-xs text-green-600 font-normal">
                            (Saved - Enter new value to replace)
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder={
                            installation?.credentials?.hasAuthHeader 
                              ? "••••••••• (Saved - enter new value to replace)" 
                              : "Basic <your-base64-encoded-credentials>"
                          }
                          data-testid="input-auth-header"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        {installation?.credentials?.hasAuthHeader 
                          ? "✓ Authorization header is saved and encrypted. Leave blank to keep existing, or enter a new header to replace it." 
                          : "Enter your complete Splynx authorization header including 'Basic' prefix (e.g., 'Basic NGNiY...'). This will be encrypted and stored securely."
                        }
                      </p>
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={saveInstallationMutation.isPending || isTestingConnection}
                    className="flex items-center gap-2"
                    data-testid="button-save-and-test"
                    onClick={() => {
                      console.log('Button clicked!');
                      console.log('Form values:', form.getValues());
                      console.log('Form errors:', form.formState.errors);
                      console.log('Form isValid:', form.formState.isValid);
                    }}
                  >
                    {saveInstallationMutation.isPending || isTestingConnection ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                    Save Credentials
                  </Button>

                  {installation && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={isTestingConnection}
                      className="flex items-center gap-2"
                      data-testid="button-test-connection"
                    >
                      {isTestingConnection ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                      Test Connection
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Automation Settings */}
        {installation && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Automation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultSplynxAdminId">Default Automation Admin ID</Label>
                <div className="flex gap-3">
                  <Input
                    id="defaultSplynxAdminId"
                    type="number"
                    value={defaultSplynxAdminId}
                    onChange={(e) => setDefaultSplynxAdminId(e.target.value)}
                    placeholder="72"
                    className="max-w-[200px]"
                    data-testid="input-default-splynx-admin-id"
                  />
                  <Button
                    onClick={handleSaveAutomationSettings}
                    disabled={saveAutomationSettingsMutation.isPending}
                    data-testid="button-save-automation-settings"
                  >
                    {saveAutomationSettingsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Splynx Admin ID used for automated workflow messages (e.g., AI audit trails). 
                  Default is 72. Individual workflow steps can override this value.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connection Status with Full Debug Log - ALWAYS VISIBLE */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Status & Debug Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResult ? (
              <>
                <Alert 
                  className={testResult.success ? "border-green-200 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200" : "border-destructive"} 
                  data-testid="test-result"
                >
                  <AlertDescription>
                    <div className="flex items-center gap-2 mb-3">
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <div>
                        <p className="font-medium">{testResult.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Tested at {testResult.testedAt ? new Date(testResult.testedAt).toLocaleString() : 'Unknown time'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Full Request/Response Log - ALWAYS EXPANDED */}
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border">
                      <h4 className="font-semibold text-sm mb-3 text-gray-700 dark:text-gray-300">📋 Full API Request/Response Log</h4>
                        
                        {/* Request Details */}
                        <div className="mb-4">
                          <h5 className="font-medium text-xs mb-2 text-blue-600 dark:text-blue-400">REQUEST SENT:</h5>
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded text-xs font-mono space-y-1">
                            {testResult.debug ? (
                              <>
                                <div><span className="font-semibold">URL:</span> {testResult.debug.request.url}</div>
                                <div><span className="font-semibold">Method:</span> {testResult.debug.request.method}</div>
                                <div><span className="font-semibold">Headers:</span></div>
                                <pre className="ml-4 bg-white dark:bg-gray-800 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(testResult.debug.request.headers, null, 2)}
                                </pre>
                              </>
                            ) : (
                              <div className="text-gray-500">Request details not available</div>
                            )}
                          </div>
                        </div>
                        
                        {/* Response Details */}
                        <div>
                          <h5 className={`font-medium text-xs mb-2 ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>RESPONSE RECEIVED:</h5>
                          <div className={`p-3 rounded text-xs font-mono space-y-1 ${testResult.success ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                            {testResult.debug ? (
                              <>
                                <div><span className="font-semibold">Status:</span> {testResult.debug.response.status} {testResult.debug.response.statusText}</div>
                                <div><span className="font-semibold">Response Body:</span></div>
                                <pre className="ml-4 bg-white dark:bg-gray-800 p-2 rounded overflow-x-auto break-all whitespace-pre-wrap">
                                  {testResult.debug.response.body || '(empty response)'}
                                </pre>
                              </>
                            ) : (
                              <div className="text-gray-500">Response details not available</div>
                            )}
                          </div>
                        </div>
                        
                        {/* Error Analysis */}
                        {testResult.error && (
                          <div className="mt-4">
                            <h5 className="font-medium text-xs mb-2 text-orange-600 dark:text-orange-400">ERROR ANALYSIS:</h5>
                            <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded text-xs">
                              <div className="font-mono break-all">{testResult.error}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                </>
              ) : (
                installation?.lastTestedAt ? (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <p>
                        Last tested: {new Date(installation.lastTestedAt).toLocaleString()}
                      </p>
                      {installation.lastTestError && (
                        <>
                          <Separator orientation="vertical" className="h-4" />
                          <p className="text-destructive">{installation.lastTestError}</p>
                        </>
                      )}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No recent test results. Click "Test Connection" to see full debug logs.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No connection tests have been performed yet. Click "Test Connection" to see full debug logs.
                    </p>
                  </div>
                )
              )}
            </CardContent>
          </Card>

        {/* Next Steps */}
        {installation?.connectionStatus === 'active' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">🎉 Integration Ready!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Your Splynx integration is successfully configured and ready to use.
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="default"
                    onClick={() => window.location.href = '/integrations/splynx/agents'}
                    data-testid="button-configure-agents"
                  >
                    Configure Agents
                  </Button>
                  <Button variant="outline" data-testid="button-view-documentation">
                    View Documentation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Mapping Tool */}
        {installation?.connectionStatus === 'active' && (
          <CustomerMappingSection installationId={installation.id} />
        )}

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Base URL:</strong> Your Splynx installation URL (e.g., https://manage.your-isp.com/api/2.0)</p>
              <p><strong>Authorization Header:</strong> Your complete Splynx API authorization header with 'Basic' prefix</p>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Make sure your API key has the necessary permissions to access leads and customer data.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <EmailTemplateManager />
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          {/* Activity Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Integration Activity Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No activity logs yet</p>
                <p className="text-xs mt-1">Actions like saving credentials and testing connections will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px] text-xs">Time</TableHead>
                      <TableHead className="text-xs">Action</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="w-[120px] text-xs">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.slice(0, 20).map((activity) => (
                      <TableRow 
                        key={activity.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedActivity(activity);
                          setIsActivitySheetOpen(true);
                        }}
                      >
                        <TableCell className="text-xs text-muted-foreground py-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(activity.createdAt).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant={
                            activity.actionType === 'creation' ? 'default' :
                            activity.actionType === 'status_change' ? 'outline' :
                            'secondary'
                          } className="text-xs">
                            {activity.actionType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs py-2">{activity.description}</TableCell>
                        <TableCell className="py-2">
                          {activity.metadata && (
                            <Badge variant="outline" className="text-xs">
                              Has Details
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>

      {/* Activity Detail Sheet */}
      <Sheet open={isActivitySheetOpen} onOpenChange={(open) => !open && setIsActivitySheetOpen(false)}>
        <SheetContent className="sm:w-[640px]">
          <SheetHeader>
            <SheetTitle>Activity Details</SheetTitle>
            <SheetDescription>
              Detailed information about this integration activity
            </SheetDescription>
          </SheetHeader>
          
          {selectedActivity && (
            <div className="mt-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Timestamp</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{new Date(selectedActivity.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Action Type</Label>
                  <div className="mt-1">
                    <Badge variant={
                      selectedActivity.actionType === 'creation' ? 'default' :
                      selectedActivity.actionType === 'status_change' ? 'outline' :
                      'secondary'
                    }>
                      {selectedActivity.actionType.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{selectedActivity.description}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Entity</Label>
                  <p className="text-sm mt-1">{selectedActivity.entityType} (ID: {selectedActivity.entityId})</p>
                </div>
              </div>

              {/* Metadata */}
              {selectedActivity.metadata && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Metadata</Label>
                  <div className="mt-2 p-4 bg-muted rounded-lg">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(selectedActivity.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CustomerMappingSection({ installationId }: { installationId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: locations = [], isLoading: locationsLoading } = useQuery<any[]>({
    queryKey: ['/api/splynx/locations'],
    retry: false,
  });

  const syncLocationsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/splynx/locations/sync', {
        method: 'POST',
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Locations synchronized",
        description: `Successfully synced ${data.synced} locations from Splynx.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/splynx/locations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync locations from Splynx.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card data-testid="card-customer-mapping">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Map className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle data-testid="text-customer-mapping-title">Customer Mapping Tool</CardTitle>
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-customer-mapping-description">
                Visualize your customers on an interactive map
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            <p>Sync service areas from Splynx tariffs to enable customer mapping</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncLocationsMutation.mutate()}
              disabled={syncLocationsMutation.isPending}
              data-testid="button-sync-locations"
            >
              {syncLocationsMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {!syncLocationsMutation.isPending && <RefreshCw className="mr-2 h-4 w-4" />}
              Sync Locations
            </Button>
          </div>
        </div>

        {locations.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold" data-testid="text-synced-locations-title">
                  Synced Service Areas ({locations.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {locations.slice(0, 6).map((location: any) => (
                  <div
                    key={location.id}
                    className="flex items-center gap-2 p-2 border rounded-lg text-sm"
                    data-testid={`location-item-${location.id}`}
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" data-testid={`location-name-${location.id}`}>
                        {location.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {location.locationType}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {locations.length > 6 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{locations.length - 6} more locations
                </p>
              )}
            </div>
          </>
        )}

        <Separator />
        
        <div className="flex gap-2">
          <Link href="/field-engineering/customer-mapping" data-testid="link-customer-mapping">
            <Button variant="default" data-testid="button-open-mapping">
              <Map className="mr-2 h-4 w-4" />
              Open Customer Map
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}