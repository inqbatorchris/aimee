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
  Cable,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Shield,
  TestTube,
  Download,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

// Validation schema for PXC setup form
const pxcSetupSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
  billingAccountId: z.string().min(1, "Billing Account ID is required"),
});

type PXCSetupFormData = z.infer<typeof pxcSetupSchema>;

interface PXCIntegration {
  id: number;
  organizationId: number;
  platformType: string;
  name: string;
  connectionStatus: 'disconnected' | 'connected' | 'active' | 'inactive' | 'error';
  lastTestedAt: string | null;
  isEnabled: boolean;
  hasCredentials?: boolean;
  credentials?: {
    client_id?: string;
    billing_account_id?: string;
    hasClientSecret?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface ConnectionTestResult {
  success: boolean;
  status: string;
  message: string;
  error?: string;
  testedAt: string;
  token?: string;
}

interface CatalogImportResult {
  success: boolean;
  triggersImported: number;
  actionsImported: number;
  message?: string;
}

export default function PXCSetup() {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [catalogImported, setCatalogImported] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to get existing PXC integration
  const { data: integrations = [], isLoading } = useQuery<PXCIntegration[]>({
    queryKey: ['/api/integrations'],
    retry: false,
  });
  
  // Find the PXC integration from the list
  const integration = integrations?.find((int) => int.platformType === 'pxc');

  // Initialize form
  const form = useForm<PXCSetupFormData>({
    resolver: zodResolver(pxcSetupSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
      billingAccountId: "",
    },
  });

  // Populate form with existing data
  useEffect(() => {
    if (integration && !form.formState.isDirty) {
      if (integration.credentials?.client_id) {
        form.setValue('clientId', integration.credentials.client_id);
      }
      if (integration.credentials?.billing_account_id) {
        form.setValue('billingAccountId', integration.credentials.billing_account_id);
      }
      
      if (integration.connectionStatus === 'active' || integration.hasCredentials) {
        setIsSaved(true);
      }
    }
  }, [integration, form]);

  // Mutation for saving integration
  const saveIntegrationMutation = useMutation({
    mutationFn: async (data: PXCSetupFormData) => {
      const credentials = {
        client_id: data.clientId,
        client_secret: data.clientSecret,
        billing_account_id: data.billingAccountId,
      };
      
      const body = {
        platformType: 'pxc',
        name: 'PXC - TalkTalk Wholesale',
        credentials,
        connectionStatus: 'inactive',
      };
      
      return apiRequest('/api/integrations', {
        method: 'POST',
        body,
      });
    },
    onSuccess: () => {
      toast({
        title: "Integration saved",
        description: "PXC connection details have been saved successfully.",
      });
      setIsSaved(true);
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save integration details.",
        variant: "destructive",
      });
    },
  });

  // Mutation for testing connection
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      if (!integration?.id) {
        throw new Error('Please save the integration first');
      }
      
      setIsTestingConnection(true);
      const response = await apiRequest(`/api/integrations/${integration.id}/test`, {
        method: 'POST',
      });
      return response;
    },
    onSuccess: (result: any) => {
      setTestResult(result);
      setIsTestingConnection(false);
      
      if (result.success) {
        toast({
          title: "Connection successful",
          description: "Successfully authenticated with PXC API.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      } else {
        toast({
          title: "Connection failed",
          description: result.error || "Unable to authenticate with PXC API.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setIsTestingConnection(false);
      setTestResult({
        success: false,
        status: 'error',
        message: 'Connection failed',
        error: error.message || 'Failed to test connection',
        testedAt: new Date().toISOString(),
      });
      
      toast({
        title: "Test failed",
        description: error.message || "Failed to test connection.",
        variant: "destructive",
      });
    },
  });

  // Mutation for importing catalog
  const importCatalogMutation = useMutation({
    mutationFn: async (): Promise<CatalogImportResult> => {
      if (!integration?.id) {
        throw new Error('Please save the integration first');
      }
      
      const response = await apiRequest(`/api/integrations/${integration.id}/import-catalog`, {
        method: 'POST',
      });
      return await response.json();
    },
    onSuccess: (result: CatalogImportResult) => {
      setCatalogImported(true);
      toast({
        title: "Catalog imported",
        description: `Successfully imported ${result.actionsImported} actions for PXC integration.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import action catalog.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PXCSetupFormData) => {
    saveIntegrationMutation.mutate(data);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  const handleImportCatalog = () => {
    importCatalogMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/integrations">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Integrations
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-cyan-500 bg-opacity-10">
            <Cable className="h-6 w-6 text-cyan-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">PXC - TalkTalk Wholesale</h1>
            <p className="text-sm text-muted-foreground">Order management and polling integration</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              API Credentials
            </CardTitle>
            <CardDescription>
              Enter your PXC API credentials to connect your TalkTalk Wholesale account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your PXC client ID" 
                          {...field}
                          data-testid="input-client-id"
                        />
                      </FormControl>
                      <FormDescription>
                        Your PXC API client identifier
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Secret</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Enter your PXC client secret" 
                          {...field}
                          data-testid="input-client-secret"
                        />
                      </FormControl>
                      <FormDescription>
                        Your PXC API client secret (will be encrypted)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Account ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your billing account ID" 
                          {...field}
                          data-testid="input-billing-account-id"
                        />
                      </FormControl>
                      <FormDescription>
                        Your TalkTalk Wholesale billing account identifier
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-2">
                  <Button 
                    type="submit" 
                    disabled={saveIntegrationMutation.isPending}
                    data-testid="button-save-integration"
                  >
                    {saveIntegrationMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Integration
                  </Button>
                  
                  {isSaved && (
                    <Badge variant="outline" className="bg-green-50">
                      <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                      Saved
                    </Badge>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Connection Testing */}
        {isSaved && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Connection Testing
              </CardTitle>
              <CardDescription>
                Verify your PXC API credentials are working correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  variant="outline"
                  data-testid="button-test-connection"
                >
                  {isTestingConnection && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Test Connection
                </Button>
              </div>

              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">{testResult.message}</p>
                      {testResult.error && (
                        <p className="text-sm opacity-90">{testResult.error}</p>
                      )}
                      <p className="text-xs opacity-75 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Tested at: {new Date(testResult.testedAt).toLocaleString()}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Catalog Import */}
        {isSaved && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Action Catalog
              </CardTitle>
              <CardDescription>
                Import PXC actions to use in your workflows
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  The PXC action catalog includes:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span><strong>authenticate</strong> - Get JWT token from PXC API</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span><strong>fetch_orders</strong> - Retrieve filtered product orders</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span><strong>get_order_details</strong> - Fetch specific order information</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleImportCatalog}
                  disabled={importCatalogMutation.isPending || catalogImported}
                  data-testid="button-import-catalog"
                >
                  {importCatalogMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {catalogImported ? 'Catalog Imported' : 'Import Catalog'}
                </Button>
                
                {catalogImported && (
                  <Badge variant="outline" className="bg-green-50">
                    <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                    Ready
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success State - Ready to Use */}
        {isSaved && testResult?.success && catalogImported && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-700 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Integration Ready!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-green-700">
                  Your PXC integration is successfully configured and ready to use in workflows.
                </p>
                <div className="flex gap-2">
                  <Link href="/agents">
                    <Button variant="default" data-testid="button-create-workflow">
                      Create Workflow
                    </Button>
                  </Link>
                  <Link href="/integrations">
                    <Button variant="outline" data-testid="button-view-integrations">
                      View All Integrations
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Client ID:</strong> Your PXC API client identifier from TalkTalk Wholesale</p>
              <p><strong>Client Secret:</strong> Your PXC API client secret (will be encrypted and stored securely)</p>
              <p><strong>Billing Account ID:</strong> Your TalkTalk Wholesale billing account number</p>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                All credentials are encrypted using AES-256-CBC before storage. Never share your client secret.
              </AlertDescription>
            </Alert>
            <div className="pt-2">
              <p className="text-sm font-medium mb-2">API Endpoints:</p>
              <div className="space-y-1 text-xs font-mono bg-muted p-3 rounded">
                <p>Auth: https://api.wholesale.talktalk.co.uk/partners/security/v1/api/token</p>
                <p>Orders: https://api.wholesale.pxc.co.uk/partners/product-order/v3/api/productOrder</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
