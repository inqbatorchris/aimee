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
  Flame,
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

const firebaseSetupSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  appId: z.string().min(1, "App ID is required"),
  apiKey: z.string().min(1, "API key is required"),
});

type FirebaseSetupFormData = z.infer<typeof firebaseSetupSchema>;

interface FirebaseIntegration {
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

export default function FirebaseSetup() {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: integrations = [], isLoading } = useQuery<FirebaseIntegration[]>({
    queryKey: ['/api/integrations'],
    retry: false,
  });
  
  const integration = integrations?.find((int) => int.platformType === 'firebase');

  const form = useForm<FirebaseSetupFormData>({
    resolver: zodResolver(firebaseSetupSchema),
    defaultValues: {
      projectId: "",
      appId: "",
      apiKey: "",
    },
  });

  useEffect(() => {
    if (integration?.connectionStatus === 'active' || integration?.hasCredentials) {
      setIsSaved(true);
      form.setValue('apiKey', '••••••••••••••••••••');
      form.setValue('projectId', '••••••••••••••••••••');
      form.setValue('appId', '••••••••••••••••••••');
    }
  }, [integration, form]);

  const saveIntegrationMutation = useMutation({
    mutationFn: async (data: FirebaseSetupFormData) => {
      return apiRequest('/api/integrations/firebase/setup', {
        method: 'POST',
        body: {
          projectId: data.projectId,
          appId: data.appId,
          apiKey: data.apiKey,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Integration saved",
        description: "Firebase configuration has been saved successfully.",
      });
      setIsSaved(true);
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save Firebase configuration.",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (): Promise<ConnectionTestResult> => {
      if (!integration?.id) {
        throw new Error('Please save the configuration first');
      }
      
      setIsTestingConnection(true);
      const response = await apiRequest('/api/integrations/firebase/test', {
        method: 'POST',
      });
      return response as unknown as ConnectionTestResult;
    },
    onSuccess: (data) => {
      setTestResult(data);
      setIsTestingConnection(false);
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      
      if (data.success) {
        toast({
          title: "Connection successful",
          description: "Firebase connection verified successfully.",
        });
      }
    },
    onError: (error: any) => {
      setIsTestingConnection(false);
      setTestResult({
        success: false,
        status: 'error',
        message: error.message || 'Connection test failed',
        testedAt: new Date().toISOString(),
      });
      toast({
        title: "Connection failed",
        description: error.message || "Could not connect to Firebase.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FirebaseSetupFormData) => {
    if (data.apiKey.includes('•')) {
      toast({
        title: "No changes detected",
        description: "Enter new credentials to update the configuration.",
        variant: "default",
      });
      return;
    }
    saveIntegrationMutation.mutate(data);
  };

  const getStatusBadge = () => {
    if (!integration) {
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Not Configured</Badge>;
    }
    
    switch (integration.connectionStatus) {
      case 'active':
      case 'connected':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {integration.connectionStatus}
          </Badge>
        );
    }
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
    <div className="container mx-auto py-4 px-4 pb-24 md:pb-4 max-w-4xl">
      <div className="mb-6">
        <Link href="/integrations">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Integrations
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500 bg-opacity-10">
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Firebase Integration</h1>
              <p className="text-sm text-muted-foreground">
                Configure Firebase for customer authentication on booking pages
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Firebase Configuration
            </CardTitle>
            <CardDescription>
              Enter your Firebase project credentials. These are used for customer authentication on booking pages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="my-firebase-project" 
                          {...field} 
                          data-testid="input-firebase-project-id"
                        />
                      </FormControl>
                      <FormDescription>
                        Your Firebase project ID from the Firebase console
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="appId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>App ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="1:123456789:web:abcdef123456" 
                          {...field} 
                          data-testid="input-firebase-app-id"
                        />
                      </FormControl>
                      <FormDescription>
                        The Firebase app ID for your web application
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="AIzaSy..." 
                          {...field} 
                          data-testid="input-firebase-api-key"
                        />
                      </FormControl>
                      <FormDescription>
                        Your Firebase web API key
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={saveIntegrationMutation.isPending}
                    data-testid="button-save-firebase"
                  >
                    {saveIntegrationMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Save Configuration
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => testConnectionMutation.mutate()}
                    disabled={!isSaved || isTestingConnection || testConnectionMutation.isPending}
                    data-testid="button-test-firebase"
                  >
                    {isTestingConnection && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Test Connection
                  </Button>
                </div>
              </form>
            </Form>

            {testResult && (
              <Alert className={`mt-4 ${testResult.success ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}`}>
                <AlertDescription className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  {testResult.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Getting Your Firebase Credentials</CardTitle>
            <CardDescription>
              Follow these steps to get your Firebase configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Firebase Console <ExternalLink className="h-3 w-3" /></a></li>
              <li>Select your project or create a new one</li>
              <li>Go to Project Settings (gear icon)</li>
              <li>Scroll down to "Your apps" section</li>
              <li>Select your web app or register a new one</li>
              <li>Copy the configuration values (projectId, appId, apiKey)</li>
            </ol>

            <Separator className="my-4" />
            
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Enable Authentication:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>In Firebase Console, go to Authentication</li>
                <li>Click "Get started" if not already enabled</li>
                <li>Enable "Email/Password" sign-in method</li>
                <li>Optionally enable "Google" for social sign-in</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
