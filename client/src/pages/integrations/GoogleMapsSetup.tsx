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
  Map,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Shield,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

const googleMapsSetupSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

type GoogleMapsSetupFormData = z.infer<typeof googleMapsSetupSchema>;

interface GoogleMapsIntegration {
  id: number;
  organizationId: number;
  platformType: string;
  name: string;
  connectionStatus: 'disconnected' | 'connected' | 'active' | 'inactive' | 'error';
  lastTestedAt: string | null;
  isEnabled: boolean;
  hasCredentials?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ConnectionTestResult {
  success: boolean;
  status: string;
  message: string;
  error?: string;
  testedAt: string;
}

export default function GoogleMapsSetup() {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: integrations = [], isLoading } = useQuery<GoogleMapsIntegration[]>({
    queryKey: ['/api/integrations'],
    retry: false,
  });
  
  const integration = integrations?.find((int) => int.platformType === 'google_maps');

  const form = useForm<GoogleMapsSetupFormData>({
    resolver: zodResolver(googleMapsSetupSchema),
    defaultValues: {
      apiKey: "",
    },
  });

  useEffect(() => {
    if (integration?.connectionStatus === 'active' || integration?.hasCredentials) {
      setIsSaved(true);
      form.setValue('apiKey', '••••••••••••••••••••');
    }
  }, [integration, form]);

  const saveIntegrationMutation = useMutation({
    mutationFn: async (data: GoogleMapsSetupFormData) => {
      return apiRequest('/api/integrations/google-maps/setup', {
        method: 'POST',
        body: {
          apiKey: data.apiKey,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Integration saved",
        description: "Google Maps API key has been saved successfully.",
      });
      setIsSaved(true);
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save API key.",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      if (!integration?.id) {
        throw new Error('Please save the API key first');
      }
      
      setIsTestingConnection(true);
      const response = await apiRequest('/api/integrations/google-maps/test', {
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
          description: "Google Maps API is working correctly.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      } else {
        toast({
          title: "Connection failed",
          description: result.message || "Unable to verify API key.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setIsTestingConnection(false);
      setTestResult({
        success: false,
        status: 'error',
        message: error.message || 'Connection test failed',
        error: error.message,
        testedAt: new Date().toISOString(),
      });
      toast({
        title: "Test failed",
        description: error.message || "Failed to test connection.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: GoogleMapsSetupFormData) => {
    if (data.apiKey === '••••••••••••••••••••' && isSaved) {
      toast({
        title: "Already saved",
        description: "API key is already configured. Enter a new key to update.",
      });
      return;
    }
    saveIntegrationMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" data-testid="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/integrations" data-testid="link-back-integrations">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Integrations
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-500 rounded-lg">
          <Map className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-title">Google Maps Setup</h1>
          <p className="text-muted-foreground" data-testid="text-subtitle">
            Configure Google Maps API for geocoding services
          </p>
        </div>
      </div>

      {integration && (
        <div className="mb-6">
          <Badge
            variant={integration.connectionStatus === 'active' ? 'default' : 'secondary'}
            data-testid={`badge-status-${integration.connectionStatus}`}
          >
            {integration.connectionStatus === 'active' && <CheckCircle className="mr-1 h-3 w-3" />}
            {integration.connectionStatus === 'error' && <XCircle className="mr-1 h-3 w-3" />}
            {integration.connectionStatus === 'inactive' && <AlertTriangle className="mr-1 h-3 w-3" />}
            Status: {integration.connectionStatus}
          </Badge>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle data-testid="text-card-title">API Configuration</CardTitle>
          <CardDescription data-testid="text-card-description">
            Enter your Google Maps API key to enable geocoding services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription data-testid="text-security-note">
              Your API key will be encrypted and stored securely. It will only be used for geocoding customer addresses.
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-api-key">Google Maps API Key</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your API key"
                        {...field}
                        type="password"
                        data-testid="input-api-key"
                      />
                    </FormControl>
                    <FormDescription data-testid="text-api-key-description">
                      Get your API key from the{" "}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center"
                        data-testid="link-google-console"
                      >
                        Google Cloud Console
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={saveIntegrationMutation.isPending}
                  data-testid="button-save"
                >
                  {saveIntegrationMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save API Key
                </Button>

                {isSaved && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => testConnectionMutation.mutate()}
                    disabled={isTestingConnection || testConnectionMutation.isPending}
                    data-testid="button-test-connection"
                  >
                    {(isTestingConnection || testConnectionMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Test Connection
                  </Button>
                )}
              </div>
            </form>
          </Form>

          {testResult && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold" data-testid="text-test-result-title">Connection Test Result</h3>
                <Alert variant={testResult.success ? 'default' : 'destructive'} data-testid={`alert-test-${testResult.success ? 'success' : 'error'}`}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertDescription data-testid="text-test-message">
                    <div className="font-semibold mb-1">
                      {testResult.success ? 'Success' : 'Failed'}
                    </div>
                    <div>{testResult.message}</div>
                    {testResult.error && (
                      <div className="text-sm mt-2 opacity-80" data-testid="text-test-error">
                        Error: {testResult.error}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold" data-testid="text-info-title">Setup Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li data-testid="text-instruction-1">
                Visit the{" "}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  data-testid="link-credentials"
                >
                  Google Cloud Console
                </a>
              </li>
              <li data-testid="text-instruction-2">Create a new API key or use an existing one</li>
              <li data-testid="text-instruction-3">Enable the "Geocoding API" for your project</li>
              <li data-testid="text-instruction-4">Copy the API key and paste it above</li>
              <li data-testid="text-instruction-5">Click "Save API Key" to store it securely</li>
              <li data-testid="text-instruction-6">Test the connection to verify it works</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
