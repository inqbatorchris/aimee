import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ChamberWorkflowExecutor from '@/components/workflow/ChamberWorkflowExecutor';
import { MapPin, Plus, CheckCircle2, Loader2 } from 'lucide-react';

export default function ChamberWorkflowPage() {
  const [selectedWorkItem, setSelectedWorkItem] = useState<number | null>(null);
  const templateId = 'chamber-record-workflow';

  // Fetch work items that could use the chamber workflow
  const { data: workItems, isLoading } = useQuery({
    queryKey: ['/api/work-items'],
  });

  // Fetch existing chamber records
  const { data: chambers } = useQuery({
    queryKey: ['/api/fiber-network/nodes'],
  });

  if (selectedWorkItem) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button 
          variant="ghost" 
          onClick={() => setSelectedWorkItem(null)}
          className="mb-4"
          data-testid="button-back"
        >
          ← Back to Work Items
        </Button>
        
        <ChamberWorkflowExecutor
          workItemId={selectedWorkItem}
          templateId={templateId}
          onComplete={() => {
            setSelectedWorkItem(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
          Chamber Record Workflows
        </h1>
        <p className="text-muted-foreground">
          Create new chamber records in the fiber network by completing field workflows
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Available Work Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Available Work Items
            </CardTitle>
            <CardDescription>
              Select a work item to start the chamber record workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {workItems?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No work items available. Create a work item first.
                  </p>
                ) : (
                  workItems?.slice(0, 10).map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.title || `Work Item #${item.id}`}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setSelectedWorkItem(item.id)}
                        data-testid={`button-start-workflow-${item.id}`}
                      >
                        Start
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Chamber Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Recent Chamber Records
            </CardTitle>
            <CardDescription>
              Recently created chamber records from workflows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {chambers?.nodes?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No chamber records yet. Complete a workflow to create one.
                </p>
              ) : (
                chambers?.nodes?.slice(0, 5).map((node: any) => (
                  <div
                    key={node.id}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{node.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {node.network} • {node.nodeType}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {node.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="mt-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                How the Chamber Workflow Works
              </h3>
              <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                <li>Select a work item and click "Start" to begin the workflow</li>
                <li>Capture the chamber's GPS location (or enter manually)</li>
                <li>Enter chamber details like name and network type</li>
                <li>Take photos of the chamber exterior and interior</li>
                <li>Add technical fiber details and notes</li>
                <li>Complete the workflow to automatically create the chamber record</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
