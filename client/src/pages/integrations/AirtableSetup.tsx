import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check, Database, Table, Plus, ExternalLink, Key, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

const airtableSetupSchema = z.object({
  apiKey: z.string().min(1, 'API Key is required').startsWith('pat', 'Must be a valid Airtable Personal Access Token'),
});

type AirtableSetupFormData = z.infer<typeof airtableSetupSchema>;

interface AirtableBase {
  id: string;
  name: string;
  permissionLevel: string;
}

interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: any[];
}

interface AirtableConnection {
  id: number;
  baseId: string;
  baseName: string;
  tableId: string;
  tableName: string;
  isActive: boolean;
  menuItemId: number | null;
}

interface AirtableIntegration {
  id: number;
  organizationId: number;
  platformType: string;
  connectionStatus: string;
  isEnabled: boolean;
  hasCredentials: boolean;
}

export default function AirtableSetup() {
  const { toast } = useToast();
  const [selectedBaseId, setSelectedBaseId] = useState<string>('');
  const [selectedBaseName, setSelectedBaseName] = useState<string>('');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [selectedTableName, setSelectedTableName] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState(false);

  // Form for API key
  const form = useForm<AirtableSetupFormData>({
    resolver: zodResolver(airtableSetupSchema),
    defaultValues: {
      apiKey: '',
    },
  });

  // Fetch Airtable integration status
  const { data: integrations = [], isLoading: loadingIntegration } = useQuery<AirtableIntegration[]>({
    queryKey: ['/api/integrations'],
    retry: 1
  });

  const airtableIntegration = integrations.find(i => i.platformType === 'airtable');

  useEffect(() => {
    if (airtableIntegration?.hasCredentials) {
      setIsConfigured(true);
    }
  }, [airtableIntegration]);

  // Save API key mutation
  const saveApiKeyMutation = useMutation({
    mutationFn: async (data: AirtableSetupFormData) => {
      if (airtableIntegration) {
        // Update existing integration
        return await apiRequest(`/api/integrations/${airtableIntegration.id}`, {
          method: 'PATCH',
          body: {
            credentials: { apiKey: data.apiKey },
            isEnabled: true,
            connectionStatus: 'active'
          }
        });
      } else {
        // Create new integration
        return await apiRequest('/api/integrations', {
          method: 'POST',
          body: {
            platformType: 'airtable',
            name: 'Airtable Integration',
            credentials: { apiKey: data.apiKey },
            isEnabled: true,
            connectionStatus: 'active'
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      setIsConfigured(true);
      toast({
        title: 'API Key Saved',
        description: 'Your Airtable API key has been saved securely.',
      });
      form.reset({ apiKey: '' }); // Clear the form for security
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save API key',
        variant: 'destructive',
      });
    }
  });

  // Fetch Airtable bases (only if configured)
  const { data: basesData, isLoading: loadingBases, error: basesError } = useQuery<{ bases: AirtableBase[] }>({
    queryKey: ['/api/airtable/bases'],
    enabled: isConfigured,
    retry: 1
  });

  // Fetch tables for selected base
  const { data: tablesData, isLoading: loadingTables } = useQuery<{ tables: AirtableTable[] }>({
    queryKey: [`/api/airtable/bases/${selectedBaseId}/tables`],
    enabled: !!selectedBaseId && isConfigured,
    retry: 1
  });

  // Fetch existing connections
  const { data: connectionsData, isLoading: loadingConnections } = useQuery<{ connections: AirtableConnection[] }>({
    queryKey: ['/api/airtable/connections'],
    enabled: isConfigured,
    retry: 1
  });

  // Create connection mutation
  const createConnection = useMutation({
    mutationFn: async (data: {
      baseId: string;
      baseName: string;
      tableId: string;
      tableName: string;
    }) => {
      const response = await apiRequest('/api/airtable/connections', {
        method: 'POST',
        body: data
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/airtable/connections'] });
      toast({
        title: 'Connection Created',
        description: 'Airtable connection has been saved successfully. Click on the table name below to view data.',
      });
      // Reset form
      setSelectedBaseId('');
      setSelectedBaseName('');
      setSelectedTableId('');
      setSelectedTableName('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create connection',
        variant: 'destructive',
      });
    }
  });

  const handleBaseChange = (baseId: string) => {
    const base = basesData?.bases.find(b => b.id === baseId);
    if (base) {
      setSelectedBaseId(baseId);
      setSelectedBaseName(base.name);
      setSelectedTableId('');
      setSelectedTableName('');
    }
  };

  const handleTableChange = (tableId: string) => {
    const table = tablesData?.tables.find(t => t.id === tableId);
    if (table) {
      setSelectedTableId(tableId);
      setSelectedTableName(table.name);
    }
  };

  const handleSaveConnection = () => {
    if (!selectedBaseId || !selectedTableId) {
      toast({
        title: 'Validation Error',
        description: 'Please select both a base and a table',
        variant: 'destructive',
      });
      return;
    }

    createConnection.mutate({
      baseId: selectedBaseId,
      baseName: selectedBaseName,
      tableId: selectedTableId,
      tableName: selectedTableName,
    });
  };

  const onSubmitApiKey = (data: AirtableSetupFormData) => {
    saveApiKeyMutation.mutate(data);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Airtable Integration</h1>
        <p className="text-muted-foreground mt-2">
          Connect your Airtable bases and tables to create workflows and manage data
        </p>
      </div>

      {/* API Key Configuration */}
      {!isConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Configure API Key
            </CardTitle>
            <CardDescription>
              Enter your Airtable Personal Access Token to get started. For production deployments, you can set the AIRTABLE_API_KEY secret in Replit Secrets for automatic persistence across all environments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitApiKey)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Airtable Personal Access Token</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="pat..."
                          {...field}
                          data-testid="input-api-key"
                        />
                      </FormControl>
                      <FormDescription>
                        Get your token from{' '}
                        <a
                          href="https://airtable.com/create/tokens"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Airtable Developer Hub
                        </a>
                        . Required scopes: data.records:read, data.records:write, schema.bases:read
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={saveApiKeyMutation.isPending}
                  data-testid="button-save-api-key"
                >
                  {saveApiKeyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Save API Key
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Connection Management (only show if configured) */}
      {isConfigured && (
        <>
          {basesError && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load Airtable bases. Please check your API key configuration.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-green-600" />
            <span>API Key configured</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsConfigured(false)}
              data-testid="button-reconfigure"
            >
              Reconfigure
            </Button>
          </div>

          <Separator />

          <div className="grid gap-6 md:grid-cols-2">
            {/* New Connection Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  New Connection
                </CardTitle>
                <CardDescription>
                  Select an Airtable base and table to create a new connection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="base-select">Select Base</Label>
                  <Select
                    value={selectedBaseId}
                    onValueChange={handleBaseChange}
                    disabled={loadingBases}
                  >
                    <SelectTrigger id="base-select" data-testid="select-base">
                      <SelectValue placeholder={loadingBases ? 'Loading bases...' : 'Select a base'} />
                    </SelectTrigger>
                    <SelectContent>
                      {basesData?.bases.map((base) => (
                        <SelectItem key={base.id} value={base.id}>
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            {base.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="table-select">Select Table</Label>
                  <Select
                    value={selectedTableId}
                    onValueChange={handleTableChange}
                    disabled={!selectedBaseId || loadingTables}
                  >
                    <SelectTrigger id="table-select" data-testid="select-table">
                      <SelectValue 
                        placeholder={
                          !selectedBaseId 
                            ? 'Select a base first' 
                            : loadingTables 
                            ? 'Loading tables...' 
                            : 'Select a table'
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {tablesData?.tables?.map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          <div className="flex items-center gap-2">
                            <Table className="h-4 w-4" />
                            {table.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSaveConnection}
                  disabled={!selectedBaseId || !selectedTableId || createConnection.isPending}
                  className="w-full"
                  data-testid="button-save-connection"
                >
                  {createConnection.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Save Connection
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Existing Connections Card */}
            <Card>
              <CardHeader>
                <CardTitle>Existing Connections</CardTitle>
                <CardDescription>
                  Your connected Airtable tables
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingConnections ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : connectionsData?.connections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No connections yet. Create one to get started.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {connectionsData?.connections.map((connection) => (
                      <div
                        key={connection.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        data-testid={`connection-${connection.id}`}
                      >
                        <div className="flex-1">
                          <a
                            href={`/data/airtable/${connection.id}`}
                            className="font-medium text-primary hover:underline flex items-center gap-2"
                            data-testid={`link-view-table-${connection.id}`}
                          >
                            <Table className="h-4 w-4" />
                            {connection.tableName}
                          </a>
                          <div className="text-sm text-muted-foreground">{connection.baseName}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://airtable.com/${connection.baseId}/${connection.tableId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-primary hover:underline flex items-center gap-1"
                            data-testid={`link-view-airtable-${connection.id}`}
                          >
                            <ExternalLink className="h-3 w-3" />
                            View in Airtable
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
