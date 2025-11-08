import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Calendar, User, Settings, Database, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AgentVersion {
  id: string;
  name: string;
  notes: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
  configuration: {
    prompt: string;
    model: string;
    temperature: number;
  };
}

interface ConfigurationDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: AgentVersion | null;
  onActivate: (versionId: string) => void;
  onDuplicate: (version: AgentVersion) => void;
}

export function ConfigurationDetailModal({ 
  open, 
  onOpenChange, 
  version, 
  onActivate, 
  onDuplicate 
}: ConfigurationDetailModalProps) {
  const { toast } = useToast();

  if (!version) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyPromptToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(version.configuration.prompt);
      toast({
        title: 'Copied',
        description: 'Prompt copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy prompt',
        variant: 'destructive',
      });
    }
  };

  const handleActivate = () => {
    onActivate(version.id);
    onOpenChange(false);
  };

  const handleDuplicate = () => {
    onDuplicate(version);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                Configuration: {version.name}
                {version.isActive && <Badge variant="secondary">Current</Badge>}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {version.notes}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {!version.isActive && (
                <Button onClick={handleActivate} size="sm">
                  Activate
                </Button>
              )}
              <Button onClick={handleDuplicate} variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-1" />
                Duplicate
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="prompt" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="model">Model</TabsTrigger>
              <TabsTrigger value="data">Data Sources</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto mt-4">
              <TabsContent value="prompt" className="mt-0">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">System Prompt</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyPromptToClipboard}
                      className="h-8"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded-md border max-h-96 overflow-auto">
                        {version.configuration.prompt}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="model" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Model Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Model</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded border">
                          {version.configuration.model}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Temperature</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded border">
                          {version.configuration.temperature}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Additional Settings</label>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-700">
                          Model settings are captured at the time of version creation. 
                          These settings were active when this configuration was saved.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="data" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Data Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm">Customer Profile Data</span>
                        <Badge variant="outline">Enabled</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm">Financial Data</span>
                        <Badge variant="outline">Enabled</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm">Service Data</span>
                        <Badge variant="outline">Enabled</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm">Ticket History</span>
                        <Badge variant="outline">Enabled</Badge>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
                      <p className="text-sm text-amber-700">
                        Data source settings are inherited from the configuration active when this version was created.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="metadata" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Version Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Created</label>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-3 h-3" />
                          {formatDate(version.createdAt)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Created By</label>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                          <User className="w-3 h-3" />
                          {version.createdBy}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <div className="mt-1">
                        {version.isActive ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Active Configuration
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Saved Configuration
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Description</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded border text-sm">
                        {version.notes}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Version ID</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded border font-mono text-xs text-gray-500">
                        {version.id}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}