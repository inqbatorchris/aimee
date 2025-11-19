# Splynx Ticketing Integration - Detailed Implementation Plan

## Overview
Enable WorkItems created from Splynx tickets/tasks to display live ticket data and sync status updates back to Splynx using existing infrastructure with minimal changes.

---

## **Part 1: New Workflow Step Type - "Splynx Data Display"**

### Purpose
Create a special workflow step that connects to a specific Splynx ticket/task and displays live data in a formatted, read-only view optimized for responding to tickets.

### Database Schema Changes
**File**: `shared/schema.ts`

**NO NEW TABLES NEEDED** - Use existing JSONB fields.

Update `workflowStepSchema` to support new step type:
```typescript
// Add to existing step type enum (line ~2630)
export const workflowStepSchema = z.object({
  id: z.string(),
  type: z.enum([
    'checklist',
    'form',
    'photo',
    'signature',
    'measurement',
    'notes',
    'kb_link',
    'geolocation',
    'splynx_data_display'  // NEW
  ]),
  // ... existing fields ...
  
  // Add Splynx config (only used when type = 'splynx_data_display')
  splynxConfig: z.object({
    entityType: z.enum(['ticket', 'task']),
    idSource: z.enum(['workflowMetadata', 'fixed']),  // Get ID from work item metadata or fixed value
    fixedId: z.string().optional(),  // If idSource='fixed'
    metadataField: z.string().optional(),  // If idSource='workflowMetadata', which field to read
    displayFields: z.array(z.string()),  // Which fields to display: ['subject', 'status', 'priority', 'customer_name', 'messages']
    refreshOnOpen: z.boolean().default(true),  // Auto-refresh data when step is opened
  }).optional(),
});
```

**Impact**: Zero migration needed, just TypeScript schema update.

---

### Backend Implementation

#### **File**: `server/routes/work-items.ts`
Add new endpoint to fetch live Splynx data:

```typescript
// Get live Splynx data for work item
router.get('/work-items/:id/splynx-data', authenticateToken, async (req, res) => {
  try {
    const workItemId = parseInt(req.params.id);
    const { entityType } = req.query;  // 'ticket' or 'task'
    
    // Get work item to extract Splynx reference
    const workItem = await storage.getWorkItem(workItemId);
    if (!workItem) {
      return res.status(404).json({ error: 'Work item not found' });
    }
    
    // Extract Splynx ID from workflowMetadata
    const metadata = workItem.workflowMetadata as any;
    const splynxId = metadata?.splynxTicketId || metadata?.splynxTaskId;
    
    if (!splynxId) {
      return res.status(400).json({ error: 'No Splynx reference found in work item' });
    }
    
    // Get Splynx integration
    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, req.user!.organizationId),
          eq(integrations.platformType, 'splynx')
        )
      )
      .limit(1);
    
    if (!integration) {
      return res.status(400).json({ error: 'Splynx integration not configured' });
    }
    
    // Decrypt credentials
    const credentials = JSON.parse(decryptCredentials(integration.credentialsEncrypted!));
    const splynxService = new SplynxService(credentials);
    
    // Fetch live data
    let data;
    if (entityType === 'ticket') {
      data = await splynxService.getTicketDetails(splynxId);
      // Also fetch recent messages
      const messages = await splynxService.getTicketMessages(splynxId);
      data.messages = messages.slice(-5);  // Last 5 messages
    } else {
      data = await splynxService.getTaskDetails(splynxId);
    }
    
    res.json({
      success: true,
      entityType,
      entityId: splynxId,
      data,
      lastFetched: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching Splynx data:', error);
    res.status(500).json({ error: error.message });
  }
});
```

#### **File**: `server/services/integrations/splynxService.ts`
Add methods if missing:

```typescript
async getTicketDetails(ticketId: string) {
  return this.request(`/tickets/${ticketId}`, 'GET');
}

async getTicketMessages(ticketId: string) {
  return this.request(`/tickets/${ticketId}/messages`, 'GET');
}

async getTaskDetails(taskId: string) {
  return this.request(`/tasks/${taskId}`, 'GET');
}

async updateTicketStatus(ticketId: string, statusId: string) {
  return this.request(`/tickets/${ticketId}`, 'PATCH', { status_id: statusId });
}

async addTicketMessage(ticketId: string, message: string, isInternal: boolean = false) {
  return this.request(`/tickets/${ticketId}/messages`, 'POST', {
    message,
    type: isInternal ? 'internal' : 'public'
  });
}
```

**Effort**: ~40 lines, 30 minutes

---

### Frontend Implementation

#### **File**: `client/src/components/workflow/WorkflowStepBuilder.tsx`
Add configuration UI for Splynx Data Display step:

```typescript
// Add to step type configuration section (around line 600-800)
{step.type === 'splynx_data_display' && (
  <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
    <div className="flex items-center gap-2 mb-2">
      <Cloud className="h-4 w-4 text-blue-600" />
      <Label className="text-sm font-semibold">Splynx Data Display Configuration</Label>
    </div>
    
    <div>
      <Label>Entity Type</Label>
      <Select
        value={step.splynxConfig?.entityType || 'ticket'}
        onValueChange={(value) => updateStep(step.id, {
          splynxConfig: {
            ...step.splynxConfig,
            entityType: value as 'ticket' | 'task'
          }
        })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ticket">Support Ticket</SelectItem>
          <SelectItem value="task">Scheduling Task</SelectItem>
        </SelectContent>
      </Select>
    </div>
    
    <div>
      <Label>ID Source</Label>
      <Select
        value={step.splynxConfig?.idSource || 'workflowMetadata'}
        onValueChange={(value) => updateStep(step.id, {
          splynxConfig: {
            ...step.splynxConfig,
            idSource: value as 'workflowMetadata' | 'fixed'
          }
        })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="workflowMetadata">From Work Item Metadata</SelectItem>
          <SelectItem value="fixed">Fixed ID (for testing)</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground mt-1">
        Usually "From Work Item Metadata" when created by Agent Workflow
      </p>
    </div>
    
    {step.splynxConfig?.idSource === 'workflowMetadata' && (
      <div>
        <Label>Metadata Field Name</Label>
        <Input
          value={step.splynxConfig?.metadataField || 'splynxTicketId'}
          onChange={(e) => updateStep(step.id, {
            splynxConfig: {
              ...step.splynxConfig,
              metadataField: e.target.value
            }
          })}
          placeholder="splynxTicketId"
        />
        <p className="text-xs text-muted-foreground mt-1">
          The field in workflowMetadata that contains the Splynx ID
        </p>
      </div>
    )}
    
    {step.splynxConfig?.idSource === 'fixed' && (
      <div>
        <Label>Fixed Splynx ID</Label>
        <Input
          value={step.splynxConfig?.fixedId || ''}
          onChange={(e) => updateStep(step.id, {
            splynxConfig: {
              ...step.splynxConfig,
              fixedId: e.target.value
            }
          })}
          placeholder="12345"
        />
      </div>
    )}
    
    <div>
      <Label>Display Fields</Label>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {['subject', 'status', 'priority', 'customer_name', 'assigned_to', 'created_at', 'messages'].map(field => (
          <label key={field} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={step.splynxConfig?.displayFields?.includes(field) || false}
              onChange={(e) => {
                const current = step.splynxConfig?.displayFields || [];
                const updated = e.target.checked
                  ? [...current, field]
                  : current.filter(f => f !== field);
                updateStep(step.id, {
                  splynxConfig: {
                    ...step.splynxConfig,
                    displayFields: updated
                  }
                });
              }}
            />
            {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </label>
        ))}
      </div>
    </div>
  </div>
)}
```

**Effort**: ~80 lines, 45 minutes

---

#### **File**: `client/src/components/work-items/TemplateWorkItemView.tsx`
Add step renderer for Splynx data display:

```typescript
// Add to step rendering switch statement (around line 400-600)
{currentStep.stepType === 'splynx_data_display' && (
  <SplynxDataDisplayStep
    workItemId={workItem.id}
    stepConfig={currentStep.config}
    splynxConfig={currentStep.splynxConfig}
  />
)}
```

Create new component:

**File**: `client/src/components/workflow/SplynxDataDisplayStep.tsx`
```typescript
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, ExternalLink, MessageSquare, User, Calendar, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SplynxDataDisplayStepProps {
  workItemId: number;
  stepConfig: any;
  splynxConfig: {
    entityType: 'ticket' | 'task';
    idSource: 'workflowMetadata' | 'fixed';
    fixedId?: string;
    metadataField?: string;
    displayFields: string[];
    refreshOnOpen?: boolean;
  };
}

export function SplynxDataDisplayStep({ workItemId, stepConfig, splynxConfig }: SplynxDataDisplayStepProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/work-items/${workItemId}/splynx-data`, splynxConfig.entityType, refreshKey],
    enabled: !!workItemId,
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-muted-foreground">Loading Splynx data...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Failed to load Splynx data</p>
              <p className="text-sm text-red-700 mt-1">{(error as Error).message}</p>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ticketData = data?.data || {};
  const { displayFields } = splynxConfig;

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">
              {splynxConfig.entityType === 'ticket' ? 'Support Ticket' : 'Scheduling Task'} Details
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Live Data
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-8 w-8 p-0"
              data-testid="button-refresh-splynx"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Subject */}
        {displayFields.includes('subject') && ticketData.subject && (
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Subject</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {ticketData.subject}
            </div>
          </div>
        )}

        {/* Status, Priority, Customer in a grid */}
        <div className="grid grid-cols-3 gap-4">
          {displayFields.includes('status') && ticketData.status && (
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Status</div>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                {ticketData.status}
              </Badge>
            </div>
          )}
          
          {displayFields.includes('priority') && ticketData.priority && (
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Priority</div>
              <Badge variant={ticketData.priority === 'high' ? 'destructive' : 'secondary'}>
                {ticketData.priority}
              </Badge>
            </div>
          )}
          
          {displayFields.includes('customer_name') && ticketData.customer_name && (
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Customer</div>
              <div className="flex items-center gap-1 text-sm font-medium">
                <User className="h-3 w-3" />
                {ticketData.customer_name}
              </div>
            </div>
          )}
        </div>

        {/* Assigned To */}
        {displayFields.includes('assigned_to') && ticketData.assigned_to && (
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Assigned To</div>
            <div className="text-sm">{ticketData.assigned_to}</div>
          </div>
        )}

        {/* Created Date */}
        {displayFields.includes('created_at') && ticketData.created_at && (
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Created</div>
            <div className="flex items-center gap-1 text-sm">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(ticketData.created_at), { addSuffix: true })}
            </div>
          </div>
        )}

        {/* Messages Thread */}
        {displayFields.includes('messages') && ticketData.messages && ticketData.messages.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Recent Messages</div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ticketData.messages.map((msg: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {msg.author_name || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {msg.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View in Splynx Link */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto text-blue-600"
            onClick={() => window.open(`https://your-splynx.com/admin/tickets/${data?.entityId}`, '_blank')}
            data-testid="link-view-in-splynx"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View in Splynx
          </Button>
        </div>

        {/* Last Fetched Timestamp */}
        <div className="text-xs text-muted-foreground text-right">
          Last updated: {formatDistanceToNow(new Date(data?.lastFetched || Date.now()), { addSuffix: true })}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Effort**: ~180 lines, 60 minutes

---

## **MOCKUP 1: Splynx Data Display Step in Workflow**

```
┌─────────────────────────────────────────────────────────────┐
│  📋 Support Ticket Workflow                       [Refresh↻]│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ☁️ Support Ticket Details                [Live Data] [↻]   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ SUBJECT                                                  ││
│  │ Internet connection dropping frequently                  ││
│  │                                                           ││
│  │ STATUS      │  PRIORITY  │  CUSTOMER                     ││
│  │ ┌─────────┐ │ ┌────────┐│ │ 👤 John Smith               ││
│  │ │ New     │ │ │ High   ││ │                             ││
│  │ └─────────┘ │ └────────┘│ │                             ││
│  │                                                           ││
│  │ ASSIGNED TO                                               ││
│  │ Sarah Johnson (Tech Support)                             ││
│  │                                                           ││
│  │ CREATED                                                   ││
│  │ 📅 2 hours ago                                           ││
│  │                                                           ││
│  │ RECENT MESSAGES                                          ││
│  │ ┌───────────────────────────────────────────────────────┐││
│  │ │ John Smith • 2 hours ago                              │││
│  │ │ My internet keeps dropping every 15 minutes. Started  │││
│  │ │ this morning around 9am. Very frustrating!            │││
│  │ └───────────────────────────────────────────────────────┘││
│  │ ┌───────────────────────────────────────────────────────┐││
│  │ │ Sarah Johnson • 1 hour ago                            │││
│  │ │ Thanks for reporting. We'll investigate the line      │││
│  │ │ quality and check for any network issues.             │││
│  │ └───────────────────────────────────────────────────────┘││
│  │                                                           ││
│  │ 🔗 View in Splynx                                        ││
│  │                                                           ││
│  │ Last updated: 30 seconds ago                             ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Step 2: Diagnostic Checklist                        [ Next ]│
└─────────────────────────────────────────────────────────────┘
```

---

## **Part 2: Template Selection in create_work_item**

### Backend Changes

#### **File**: `server/services/workflow/WorkflowExecutor.ts`
Update `executeCreateWorkItem` method (around line 1544):

```typescript
private async executeCreateWorkItem(step: any, context: any): Promise<StepExecutionResult> {
  try {
    const { 
      title, 
      description, 
      assigneeId, 
      dueDate, 
      status = 'Planning', 
      externalReference,
      workflowTemplateId,        // NEW - template to attach
      splynxEntityType,          // NEW - 'ticket' or 'task'
      splynxEntityId             // NEW - Splynx ID to store in metadata
    } = step.config || {};
    
    if (!title) {
      throw new Error('title is required for create_work_item step');
    }
    
    console.log(`[WorkflowExecutor]   📝 Creating work item: ${title}`);
    
    // Process template strings
    const processedTitle = this.processTemplate(title, context);
    const processedDescription = description ? this.processTemplate(description, context) : undefined;
    const processedExternalRef = externalReference ? this.processTemplate(externalReference, context) : undefined;
    
    // NEW: Process Splynx references
    const processedSplynxId = splynxEntityId ? this.processTemplate(splynxEntityId, context) : undefined;
    const processedTemplateId = workflowTemplateId ? this.processTemplate(workflowTemplateId, context) : undefined;
    
    // Calculate due date
    let processedDueDate = dueDate;
    if (dueDate && dueDate.startsWith('+')) {
      const days = parseInt(dueDate.replace('+', '').replace('days', '').trim());
      const date = new Date();
      date.setDate(date.getDate() + days);
      processedDueDate = date.toISOString().split('T')[0];
    } else if (dueDate) {
      processedDueDate = this.processTemplate(dueDate, context);
    }
    
    const organizationId = context.organizationId;
    if (!organizationId) {
      throw new Error('organizationId not found in context');
    }
    
    // Build workflow metadata
    const workflowMetadata: any = {};
    if (processedExternalRef) {
      workflowMetadata.externalReference = processedExternalRef;
    }
    // NEW: Store Splynx reference
    if (processedSplynxId && splynxEntityType) {
      if (splynxEntityType === 'ticket') {
        workflowMetadata.splynxTicketId = processedSplynxId;
      } else if (splynxEntityType === 'task') {
        workflowMetadata.splynxTaskId = processedSplynxId;
      }
      workflowMetadata.splynxEntityType = splynxEntityType;
    }
    
    // Create the work item
    const workItem = await storage.createWorkItem({
      organizationId,
      title: processedTitle,
      description: processedDescription || '',
      status: status as any,
      assignedTo: assigneeId || null,
      dueDate: processedDueDate || null,
      workflowTemplateId: processedTemplateId || null,  // NEW - attach template
      workflowMetadata: Object.keys(workflowMetadata).length > 0 ? workflowMetadata : null,
      createdBy: context.userId || null,
    });
    
    console.log(`[WorkflowExecutor]   ✅ Work item created: ID ${workItem.id}`);
    if (processedTemplateId) {
      console.log(`[WorkflowExecutor]   📋 Workflow template attached: ${processedTemplateId}`);
    }
    if (processedSplynxId) {
      console.log(`[WorkflowExecutor]   🔗 Splynx ${splynxEntityType} linked: ${processedSplynxId}`);
    }
    
    return {
      success: true,
      output: {
        workItemId: workItem.id,
        title: processedTitle,
        workflowTemplateId: processedTemplateId,
      },
    };
  } catch (error: any) {
    console.error(`[WorkflowExecutor]   ❌ Create work item failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
    };
  }
}
```

**Effort**: ~20 lines added, 15 minutes

---

### Frontend Changes

#### **File**: `client/src/components/workflow/WorkflowStepBuilder.tsx`
Update Create Work Item configuration UI (around line 1200-1400):

```typescript
{step.type === 'create_work_item' && (
  <div className="space-y-3">
    {/* Existing fields: title, description, assigneeId, dueDate, status */}
    
    {/* NEW: Workflow Template Selection */}
    <div>
      <Label>Workflow Template (optional)</Label>
      <WorkflowTemplateSelector
        value={step.config?.workflowTemplateId || ''}
        onChange={(templateId) => updateStep(step.id, {
          config: {
            ...step.config,
            workflowTemplateId: templateId
          }
        })}
        placeholder="Select template to attach"
      />
      <p className="text-xs text-muted-foreground mt-1">
        Workflow template will be automatically attached to created work items
      </p>
    </div>
    
    {/* NEW: Splynx Integration Fields */}
    <div className="p-3 border border-blue-200 bg-blue-50/50 rounded-lg space-y-3">
      <Label className="text-sm font-semibold flex items-center gap-2">
        <Cloud className="h-4 w-4" />
        Splynx Integration (optional)
      </Label>
      
      <div>
        <Label className="text-xs">Entity Type</Label>
        <Select
          value={step.config?.splynxEntityType || ''}
          onValueChange={(value) => updateStep(step.id, {
            config: {
              ...step.config,
              splynxEntityType: value
            }
          })}
        >
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            <SelectItem value="ticket">Support Ticket</SelectItem>
            <SelectItem value="task">Scheduling Task</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {step.config?.splynxEntityType && (
        <div>
          <Label className="text-xs">Entity ID (use template variable)</Label>
          <VariableFieldPicker
            value={step.config?.splynxEntityId || ''}
            onChange={(value) => updateStep(step.id, {
              config: {
                ...step.config,
                splynxEntityId: value
              }
            })}
            placeholder="{currentItem.id}"
            availableVariables={availableVariables}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Usually {'{currentItem.id}'} when used in a for_each loop
          </p>
        </div>
      )}
    </div>
  </div>
)}
```

Create helper component:

**File**: `client/src/components/workflow/WorkflowTemplateSelector.tsx`
```typescript
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface WorkflowTemplateSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function WorkflowTemplateSelector({ value, onChange, placeholder }: WorkflowTemplateSelectorProps) {
  const { data: templates = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/workflow-templates'],
  });

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid="select-workflow-template">
        <SelectValue placeholder={placeholder || "Select workflow template"} />
      </SelectTrigger>
      <SelectContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <>
            <SelectItem value="">None</SelectItem>
            {templates.map(template => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
}
```

**Effort**: ~100 lines, 40 minutes

---

## **MOCKUP 2: Agent Workflow Builder with Template Selection**

```
┌────────────────────────────────────────────────────────────────┐
│  Agent Workflow Builder - Create Ticket WorkItems              │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Trigger: ⏰ Schedule (Every hour)                              │
│                                                                  │
│  Actions:                                                        │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 1. 🔍 Query Splynx Tickets                                 ││
│  │    Entity: Support Tickets                                  ││
│  │    Filters: status = "new" OR status = "waiting_on_agent"  ││
│  │    Store results in: splynxTickets                          ││
│  └────────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 2. 🔁 For Each {splynxTickets}                             ││
│  │    ┌──────────────────────────────────────────────────────┐││
│  │    │ 2.1. ➕ Create Work Item                             │││
│  │    │      Title: {currentItem.subject}                    │││
│  │    │      Description: Customer: {currentItem.customer... │││
│  │    │      Assignee: [Select User]                         │││
│  │    │      Due Date: +3 days                               │││
│  │    │      Status: Planning                                │││
│  │    │                                                        │││
│  │    │      📋 Workflow Template: ▼                         │││
│  │    │      ┌──────────────────────────────────────────────┐│││
│  │    │      │ Support Ticket Resolution  [Selected]        ││││
│  │    │      └──────────────────────────────────────────────┘│││
│  │    │      Template will be attached to created work items │││
│  │    │                                                        │││
│  │    │      ☁️ Splynx Integration                           │││
│  │    │      ┌──────────────────────────────────────────────┐│││
│  │    │      │ Entity Type: Support Ticket        ▼         ││││
│  │    │      │ Entity ID: {currentItem.id}                  ││││
│  │    │      └──────────────────────────────────────────────┘│││
│  │    │                                                        │││
│  │    └──────────────────────────────────────────────────────┘││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│                                            [Test] [Save] [Run]  │
└────────────────────────────────────────────────────────────────┘
```

---

## **Part 3: Upgrade Completion Callbacks for Splynx**

### Database Schema Changes
**NONE** - Use existing `completionCallbacks` JSONB field in `workflowTemplates` table.

Update callback schema documentation in `shared/schema.ts`:

```typescript
// Completion callback schema (line ~2650)
const completionCallbackSchema = z.object({
  action: z.enum(['webhook', 'update_splynx_ticket', 'update_splynx_task']),  // NEW actions added
  integrationName: z.string().optional(),
  webhookUrl: z.string().optional(),
  webhookMethod: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
  webhookHeaders: z.record(z.string()).optional(),
  
  // NEW: Splynx-specific config
  splynxConfig: z.object({
    updateStatus: z.boolean().default(true),
    statusId: z.string().optional(),  // Fixed status ID or from field mapping
    addMessage: z.boolean().default(true),
    messageTemplate: z.string().optional(),  // Template for message (supports variables)
    isInternal: z.boolean().default(false),
  }).optional(),
  
  fieldMappings: z.array(z.object({
    sourceStepId: z.string(),
    sourceField: z.string(),
    targetField: z.string(),
  })).optional(),
});
```

**Effort**: Documentation update only, 5 minutes

---

### Backend Implementation

#### **File**: `server/services/WorkItemWorkflowService.ts`
Update `executeCompletionCallback` method (around line 312):

```typescript
private async executeCompletionCallback(
  callback: any,
  executionId: number,
  organizationId: number,
  workItemId: number
) {
  console.log(`[Callback] Executing ${callback.action} for ${callback.integrationName}`);

  // ... existing code to get execution data and field mappings ...

  // NEW: Handle Splynx ticket/task updates
  if (callback.action === 'update_splynx_ticket' || callback.action === 'update_splynx_task') {
    return await this.executeSplynxCallback(
      callback,
      mappedData,
      organizationId,
      workItemId
    );
  }

  // ... existing webhook code ...
}

private async executeSplynxCallback(
  callback: any,
  mappedData: Record<string, any>,
  organizationId: number,
  workItemId: number
) {
  const entityType = callback.action === 'update_splynx_ticket' ? 'ticket' : 'task';
  
  // Get work item to retrieve Splynx ID
  const workItem = await db
    .select()
    .from(workItems)
    .where(eq(workItems.id, workItemId))
    .limit(1);
  
  if (!workItem.length) {
    throw new Error('Work item not found');
  }
  
  const metadata = workItem[0].workflowMetadata as any;
  const splynxId = entityType === 'ticket' 
    ? metadata?.splynxTicketId 
    : metadata?.splynxTaskId;
  
  if (!splynxId) {
    console.log(`[Callback] No Splynx ${entityType} ID found in work item metadata, skipping`);
    return { success: true, skipped: true };
  }
  
  console.log(`[Callback] Updating Splynx ${entityType} ${splynxId}`);
  
  // Get Splynx integration
  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.organizationId, organizationId),
        eq(integrations.platformType, 'splynx')
      )
    )
    .limit(1);
  
  if (!integration) {
    throw new Error('Splynx integration not configured');
  }
  
  // Decrypt credentials
  const crypto = await import('crypto');
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const [ivHex, encryptedText] = integration.credentialsEncrypted!.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.createHash('sha256').update(String(encryptionKey)).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  const credentials = JSON.parse(decrypted);
  
  const splynxService = new (await import('../integrations/splynxService.js')).SplynxService(credentials);
  
  const results: any[] = [];
  
  // Update status if configured
  if (callback.splynxConfig?.updateStatus) {
    const statusId = callback.splynxConfig.statusId || '3'; // Default to "Resolved"
    console.log(`[Callback] Setting ${entityType} status to: ${statusId}`);
    
    if (entityType === 'ticket') {
      await splynxService.updateTicketStatus(splynxId, statusId);
    } else {
      // Assuming similar method exists for tasks
      await splynxService.updateTaskStatus(splynxId, statusId);
    }
    
    results.push({ action: 'status_updated', statusId });
  }
  
  // Add message if configured
  if (callback.splynxConfig?.addMessage) {
    // Build message from template or use mapped data
    let message = callback.splynxConfig.messageTemplate || '';
    
    // Replace variables in message template
    Object.keys(mappedData).forEach(key => {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), mappedData[key]);
    });
    
    // If no template, create default message from mapped data
    if (!message) {
      const resolutionNotes = mappedData.resolutionNotes || mappedData.notes || 'Work completed';
      message = `Work Item Completed\n\n${resolutionNotes}`;
    }
    
    console.log(`[Callback] Adding message to ${entityType}: ${message.substring(0, 50)}...`);
    
    if (entityType === 'ticket') {
      await splynxService.addTicketMessage(
        splynxId,
        message,
        callback.splynxConfig.isInternal || false
      );
    } else {
      // Assuming similar method for tasks
      await splynxService.addTaskNote(splynxId, message);
    }
    
    results.push({ action: 'message_added', messageLength: message.length });
  }
  
  console.log(`[Callback] Splynx ${entityType} updated successfully:`, results);
  
  return {
    success: true,
    splynxEntityType: entityType,
    splynxEntityId: splynxId,
    results,
  };
}
```

**Effort**: ~120 lines, 45 minutes

---

### Frontend Implementation

#### **File**: `client/src/pages/templates/TemplateEdit.tsx`
Update completion callback configuration UI (around line 800-1000):

```typescript
// Add to callback action selector
<Select
  value={callback.action}
  onValueChange={(value) => updateCallback(idx, { action: value })}
>
  <SelectContent>
    <SelectItem value="webhook">Call Webhook</SelectItem>
    <SelectItem value="update_splynx_ticket">Update Splynx Ticket</SelectItem>  {/* NEW */}
    <SelectItem value="update_splynx_task">Update Splynx Task</SelectItem>      {/* NEW */}
  </SelectContent>
</Select>

// Add Splynx-specific configuration UI
{(callback.action === 'update_splynx_ticket' || callback.action === 'update_splynx_task') && (
  <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
    <div className="flex items-center gap-2">
      <Cloud className="h-4 w-4 text-blue-600" />
      <Label className="font-semibold">Splynx Update Configuration</Label>
    </div>
    
    <div className="space-y-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={callback.splynxConfig?.updateStatus !== false}
          onChange={(e) => updateCallback(idx, {
            splynxConfig: {
              ...callback.splynxConfig,
              updateStatus: e.target.checked
            }
          })}
        />
        <span className="text-sm">Update Status</span>
      </label>
      
      {callback.splynxConfig?.updateStatus !== false && (
        <div>
          <Label className="text-xs">Status ID</Label>
          <Select
            value={callback.splynxConfig?.statusId || '3'}
            onValueChange={(value) => updateCallback(idx, {
              splynxConfig: {
                ...callback.splynxConfig,
                statusId: value
              }
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">New</SelectItem>
              <SelectItem value="2">Work in Progress</SelectItem>
              <SelectItem value="3">Resolved</SelectItem>
              <SelectItem value="5">Waiting on Customer</SelectItem>
              <SelectItem value="6">Waiting on Agent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={callback.splynxConfig?.addMessage !== false}
          onChange={(e) => updateCallback(idx, {
            splynxConfig: {
              ...callback.splynxConfig,
              addMessage: e.target.checked
            }
          })}
        />
        <span className="text-sm">Add Resolution Message</span>
      </label>
      
      {callback.splynxConfig?.addMessage !== false && (
        <>
          <div>
            <Label className="text-xs">Message Template</Label>
            <Textarea
              value={callback.splynxConfig?.messageTemplate || ''}
              onChange={(e) => updateCallback(idx, {
                splynxConfig: {
                  ...callback.splynxConfig,
                  messageTemplate: e.target.value
                }
              })}
              placeholder="Work completed. Resolution notes: {resolutionNotes}"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use {'{fieldName}'} to insert values from field mappings
            </p>
          </div>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={callback.splynxConfig?.isInternal || false}
              onChange={(e) => updateCallback(idx, {
                splynxConfig: {
                  ...callback.splynxConfig,
                  isInternal: e.target.checked
                }
              })}
            />
            <span className="text-sm">Internal Message (not visible to customer)</span>
          </label>
        </>
      )}
    </div>
  </div>
)}
```

**Effort**: ~80 lines, 30 minutes

---

## **MOCKUP 3: Workflow Template with Splynx Callback**

```
┌──────────────────────────────────────────────────────────────────┐
│  Edit Workflow Template: Support Ticket Resolution               │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Steps:                                                            │
│  1. ☁️ Splynx Data Display - Ticket Details                      │
│  2. ☑️ Checklist - Diagnostic Steps                              │
│  3. 📝 Form - Resolution Notes                                   │
│  4. 📷 Photo - Evidence (if needed)                              │
│                                                                    │
│  ═══════════════════════════════════════════════════════════════ │
│                                                                    │
│  🔔 Completion Callbacks                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ☁️ Splynx Update Configuration                             │ │
│  │                                                              │ │
│  │ Action: Update Splynx Ticket                        ▼       │ │
│  │                                                              │ │
│  │ ☑️ Update Status                                            │ │
│  │    Status ID: Resolved (3)                          ▼       │ │
│  │                                                              │ │
│  │ ☑️ Add Resolution Message                                   │ │
│  │    Message Template:                                        │ │
│  │    ┌──────────────────────────────────────────────────────┐│ │
│  │    │ Ticket resolved.                                      ││ │
│  │    │                                                        ││ │
│  │    │ Resolution: {resolutionNotes}                         ││ │
│  │    │                                                        ││ │
│  │    │ Resolved by: {completedByName}                        ││ │
│  │    └──────────────────────────────────────────────────────┘│ │
│  │                                                              │ │
│  │    ☑️ Internal Message (not visible to customer)           │ │
│  │                                                              │ │
│  │ Field Mappings:                                              │ │
│  │ ┌────────────────┬───────────────┬─────────────────────┐  │ │
│  │ │ Source Step    │ Source Field  │ Target Field        │  │ │
│  │ ├────────────────┼───────────────┼─────────────────────┤  │ │
│  │ │ step-3-form    │ notes         │ resolutionNotes     │  │ │
│  │ └────────────────┴───────────────┴─────────────────────┘  │ │
│  │                                                              │ │
│  │                                     [Remove] [Add Mapping]  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                    │
│                                           [Test] [Save Template]  │
└──────────────────────────────────────────────────────────────────┘
```

---

## **Implementation Summary**

### **Database Changes**
✅ **ZERO migrations needed** - All changes use existing JSONB fields

### **Code Changes**

| File | Lines Added | Effort | Type |
|------|-------------|--------|------|
| `shared/schema.ts` | 30 | 15 min | Schema update |
| `server/routes/work-items.ts` | 50 | 30 min | New endpoint |
| `server/services/integrations/splynxService.ts` | 25 | 15 min | New methods |
| `server/services/workflow/WorkflowExecutor.ts` | 30 | 20 min | Update method |
| `server/services/WorkItemWorkflowService.ts` | 120 | 45 min | New callback logic |
| `client/src/components/workflow/SplynxDataDisplayStep.tsx` | 180 | 60 min | New component |
| `client/src/components/workflow/WorkflowStepBuilder.tsx` | 180 | 85 min | UI updates |
| `client/src/components/workflow/WorkflowTemplateSelector.tsx` | 30 | 20 min | New component |
| `client/src/pages/templates/TemplateEdit.tsx` | 80 | 30 min | UI updates |
| **TOTAL** | **~725 lines** | **~5 hours** | |

---

## **User Workflow Example**

### **Setup (One-Time)**

1. **Create Workflow Template**: "Support Ticket Resolution"
   - Step 1: Splynx Data Display (shows ticket details, messages)
   - Step 2: Checklist (diagnostic steps)
   - Step 3: Form (resolution notes)
   - Step 4: Photo (evidence if needed)
   - **Completion Callback**: Update Splynx ticket to "Resolved", post resolution message

2. **Create Agent Workflow**: "Auto-Create Ticket WorkItems"
   - Trigger: Schedule (hourly)
   - Action 1: Query Splynx tickets (status = "new")
   - Action 2: For Each ticket
     - Create Work Item
       - Title: `{currentItem.subject}`
       - Template: "Support Ticket Resolution"
       - Splynx ID: `{currentItem.id}`

### **Daily Operation**

1. **8:00 AM** - Agent runs, finds 5 new tickets, creates 5 WorkItems with templates attached
2. **9:00 AM** - Technician opens WorkItem #1
   - Sees live Splynx ticket data (customer, priority, recent messages)
   - Works through diagnostic checklist
   - Records resolution notes
   - Marks workflow complete
3. **9:15 AM** - Completion callback fires
   - Splynx ticket status → "Resolved"
   - Resolution message posted to Splynx ticket
4. **Customer** - Receives email notification from Splynx with resolution

---

## **Testing Plan**

1. **Unit Tests**:
   - SplynxService methods (getTicketDetails, updateTicketStatus, addTicketMessage)
   - WorkflowExecutor.executeCreateWorkItem with new parameters
   - WorkItemWorkflowService.executeSplynxCallback

2. **Integration Tests**:
   - Create WorkItem via Agent Workflow with template attachment
   - Fetch live Splynx data via `/api/work-items/:id/splynx-data`
   - Complete workflow and verify Splynx update

3. **E2E Tests** (using run_test tool):
   - Full ticket→WorkItem→completion→Splynx update flow

---

## **Next Steps**

1. ✅ Review plan with user
2. Implement backend changes (WorkflowExecutor, SplynxService, completion callbacks)
3. Implement frontend components (SplynxDataDisplayStep, WorkflowStepBuilder updates)
4. Update replit.md documentation
5. Test with real Splynx instance
6. Deploy to production

**Estimated Total Time**: ~6-8 hours (including testing)
