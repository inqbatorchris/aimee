import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface SplynxDataDisplayStepProps {
  step: any;
  workflowMetadata?: Record<string, any>;
  integrationId?: number;
}

export function SplynxDataDisplayStep({ step, workflowMetadata, integrationId }: SplynxDataDisplayStepProps) {
  const config = step.splynxConfig || step.config?.splynxConfig;
  
  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Configuration Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Splynx display configuration is missing</p>
        </CardContent>
      </Card>
    );
  }

  const { entityType, idSource, fixedId, metadataField, displayFields, refreshOnOpen } = config;
  
  let entityId: string | undefined;
  
  if (idSource === 'fixed') {
    entityId = fixedId;
  } else if (idSource === 'workflowMetadata' && metadataField && workflowMetadata) {
    entityId = workflowMetadata[metadataField];
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/integrations/splynx/entity/${entityType}/${entityId}`, { integrationId }],
    enabled: !!entityId && !!integrationId,
    refetchOnMount: refreshOnOpen,
  });

  if (!entityId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Missing Entity ID
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {idSource === 'workflowMetadata' 
              ? `No value found for "${metadataField}" in workflow metadata`
              : 'No entity ID configured'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading {entityType} data...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Failed to load {entityType} data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{(error as any).message}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()} data-testid="button-retry-splynx">
            <RefreshCw className="h-3 w-3 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const entityData = (data as any)?.entityData;
  const messages = (data as any)?.messages;

  if (!entityData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-destructive">No data found</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const getFieldValue = (field: string) => {
    return entityData[field] || '-';
  };

  const formatFieldName = (field: string) => {
    return field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base" data-testid="text-splynx-entity-title">
                {entityType === 'ticket' ? 'Support Ticket' : 'Scheduling Task'} #{entityId}
              </CardTitle>
              {entityData.subject && (
                <CardDescription className="mt-1">{entityData.subject}</CardDescription>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={() => refetch()} data-testid="button-refresh-splynx">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {displayFields.map((field: string) => (
            <div key={field} className="grid grid-cols-3 gap-2 text-sm" data-testid={`splynx-field-${field}`}>
              <span className="text-muted-foreground font-medium">{formatFieldName(field)}:</span>
              <span className="col-span-2">
                {field.toLowerCase().includes('status') ? (
                  <Badge variant="secondary">{getFieldValue(field)}</Badge>
                ) : (
                  getFieldValue(field)
                )}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {entityType === 'ticket' && messages && messages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Messages ({messages.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {messages.slice(0, 5).map((message: any, index: number) => (
                <AccordionItem key={message.id || index} value={`message-${index}`}>
                  <AccordionTrigger className="text-sm hover:no-underline">
                    <div className="flex items-center gap-2 text-left">
                      <Badge variant="outline" className="text-xs">
                        {message.type || 'public'}
                      </Badge>
                      <span className="truncate">{message.subject || `Message ${index + 1}`}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm">
                      {message.author && (
                        <div className="text-muted-foreground">
                          <strong>From:</strong> {message.author}
                        </div>
                      )}
                      {message.date && (
                        <div className="text-muted-foreground">
                          <strong>Date:</strong> {new Date(message.date).toLocaleString()}
                        </div>
                      )}
                      <div className="border-t pt-2">{message.message || message.body}</div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {messages.length > 5 && (
              <p className="text-xs text-muted-foreground mt-2">
                Showing 5 of {messages.length} messages
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
