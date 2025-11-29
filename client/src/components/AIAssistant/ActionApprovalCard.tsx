import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, X, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { apiRequest } from '@/lib/queryClient';

interface ActionApprovalCardProps {
  action: any;
  onApproved: () => void;
  onRejected: () => void;
}

export function ActionApprovalCard({ action, onApproved, onRejected }: ActionApprovalCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  // Initialize executionResult from action.executionResult if action is already executed
  const [executionResult, setExecutionResult] = useState<any>(
    action.status === 'executed' && action.executionResult ? action.executionResult : null
  );

  const approveMutation = useMutation({
    mutationFn: async () => {
      console.log('🔵 Starting approval for action ID:', action.id);
      console.log('🔵 URL:', `/api/ai-chat/actions/${action.id}/approve`);
      try {
        const response = await apiRequest(`/api/ai-chat/actions/${action.id}/approve`, {
          method: 'POST',
        });
        console.log('🟢 Got response:', response);
        console.log('🟢 Response status:', response.status);
        console.log('🟢 Response ok:', response.ok);
        const data = await response.json();
        console.log('🟢 Parsed data:', data);
        return data;
      } catch (error) {
        console.error('🔴 Approval error - Full error object:');
        console.error('Error:', error);
        console.error('Error type:', typeof error);
        console.error('Error constructor:', error?.constructor?.name);
        console.error('Error message:', error instanceof Error ? error.message : 'Not an Error object');
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('✅ Approval succeeded:', data);
      setExecutionResult(data.result);
      // Keep the card visible to show success state
      // The user can dismiss it manually or it will clear when they send a new message
    },
    onError: (error) => {
      console.error('❌ Mutation error - Full details:');
      console.error('Error:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Not an Error object');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/ai-chat/actions/${action.id}/reject`, {
        method: 'POST',
        body: { reason: 'User rejected' },
      });
      return response.json();
    },
    onSuccess: () => {
      onRejected();
    },
  });

  const payload = action.actionPayload || {};

  const renderActionPreview = () => {
    switch (action.actionType) {
      case 'create_objective':
        return (
          <div className="space-y-1.5">
            <div>
              <p className="text-xs font-semibold">{payload.title || 'Untitled'}</p>
              {payload.description && <p className="text-[11px] text-muted-foreground mt-0.5">{payload.description}</p>}
            </div>
            <div className="text-[10px] space-y-0.5">
              {payload.targetDate && <p>🎯 Target: {new Date(payload.targetDate).toLocaleDateString()}</p>}
              {payload.status && <p>📊 Status: {payload.status}</p>}
            </div>
          </div>
        );

      case 'create_key_result':
        return (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold">{payload.title || 'Untitled'}</p>
            {payload.description && <p className="text-[11px] text-muted-foreground">{payload.description}</p>}
            <div className="text-[10px]">
              <p>📊 Target: {payload.currentValue || 0} → {payload.targetValue || 0} {payload.unit || ''}</p>
              {payload.deadline && <p>⏰ Deadline: {new Date(payload.deadline).toLocaleDateString()}</p>}
            </div>
          </div>
        );

      case 'create_task':
        return (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold">{payload.title || 'Untitled'}</p>
            {payload.description && <p className="text-[11px] text-muted-foreground">{payload.description}</p>}
            <div className="text-[10px]">
              {payload.dueDate && <p>📅 Due: {new Date(payload.dueDate).toLocaleDateString()}</p>}
              {payload.priority && <p>⚡ Priority: {payload.priority}</p>}
            </div>
          </div>
        );

      case 'query_customer_balance':
        return (
          <div className="space-y-1 text-[11px]">
            <p><strong>Action:</strong> Query customer balance</p>
            <p><strong>Customer:</strong> {payload.customerName || 'Unknown'}</p>
          </div>
        );

      case 'draft_objective_with_krs':
        return (
          <div className="space-y-2 text-[11px]">
            <div>
              <p className="text-xs font-semibold">{payload.objectiveTitle || 'Untitled'}</p>
              <p className="text-muted-foreground mt-0.5">{payload.description || ''}</p>
            </div>

            {payload.keyResults && payload.keyResults.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1">Key Results ({payload.keyResults.length}):</p>
                <div className="space-y-1">
                  {payload.keyResults.map((kr: any, idx: number) => (
                    <div key={idx} className="p-1.5 bg-muted rounded">
                      <p className="text-[11px] font-medium">{kr.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Target: {kr.currentValue} → {kr.targetValue} {kr.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {payload.tasks && payload.tasks.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1">Initial Tasks ({payload.tasks.length}):</p>
                <div className="space-y-0.5">
                  {payload.tasks.map((task: any, idx: number) => (
                    <div key={idx} className="text-[10px] p-1 bg-muted/50 rounded">
                      • {task.title}
                      {task.priority && (
                        <Badge variant="outline" className="ml-1 text-[9px] h-4">
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-1">
            <p className="text-xs font-semibold">{action.actionType}</p>
            <p className="text-[11px] text-muted-foreground">Review the technical details below</p>
          </div>
        );
    }
  };

  const renderExecutionResult = () => {
    if (!executionResult) return null;

    switch (action.actionType) {
      case 'create_objective':
        if (executionResult.success && executionResult.objective) {
          const obj = executionResult.objective;
          return (
            <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded">
              <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1">✅ Objective Created Successfully!</p>
              <div className="text-[11px] space-y-0.5">
                <p><strong>Title:</strong> {obj.title}</p>
                {obj.description && <p className="text-muted-foreground">{obj.description}</p>}
                <p><strong>ID:</strong> {obj.id}</p>
                {obj.status && <p><strong>Status:</strong> {obj.status}</p>}
                {obj.targetDate && <p><strong>Target:</strong> {new Date(obj.targetDate).toLocaleDateString()}</p>}
              </div>
            </div>
          );
        }
        break;

      case 'query_customer_balance':
        if (executionResult.found) {
          const customer = executionResult.customer;
          return (
            <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded">
              <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1">✓ Customer Found</p>
              <div className="text-[11px] space-y-0.5">
                <p><strong>Name:</strong> {customer.name}</p>
                <p><strong>Email:</strong> {customer.email}</p>
                <p><strong>Balance:</strong> ${customer.balance}</p>
              </div>
            </div>
          );
        } else {
          return (
            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded">
              <p className="text-xs font-semibold text-yellow-900 dark:text-yellow-100">
                Customer not found
              </p>
            </div>
          );
        }

      case 'draft_objective_with_krs':
        if (executionResult.success && executionResult.objective) {
          const obj = executionResult.objective;
          const summary = executionResult.summary || {};
          return (
            <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded">
              <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1">
                ✅ OKR Structure Created Successfully!
              </p>
              <div className="text-[11px] space-y-1">
                <p className="font-semibold text-green-800 dark:text-green-200">
                  Created: {summary.objectiveCount || 1} objective, {summary.keyResultCount || 0} key results, {summary.taskCount || 0} tasks
                </p>
                <div className="mt-1.5 p-1.5 bg-white/50 dark:bg-black/20 rounded">
                  <p><strong>Objective ID:</strong> {obj.id}</p>
                  <p><strong>Title:</strong> {obj.title}</p>
                  {obj.description && <p className="text-muted-foreground mt-0.5">{obj.description}</p>}
                  {obj.targetDate && <p className="mt-0.5"><strong>Target:</strong> {new Date(obj.targetDate).toLocaleDateString()}</p>}
                </div>
                <p className="text-[10px] text-green-700 dark:text-green-300 italic mt-1">
                  View the objective in the Objectives list to see all key results and tasks.
                </p>
              </div>
            </div>
          );
        }
        return (
          <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded">
            <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1">✓ Action Completed</p>
            <p className="text-[11px] text-green-800 dark:text-green-200">
              {executionResult.message || 'OKR structure created successfully'}
            </p>
          </div>
        );
    }

    // Default success card for all other action types
    return (
      <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded">
        <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1">✅ Action Executed Successfully!</p>
        {executionResult.message && (
          <p className="text-[11px] text-green-800 dark:text-green-200">{executionResult.message}</p>
        )}
      </div>
    );
  };

  return (
    <Card
      className="border-2 border-purple-500 shadow-lg"
      data-testid={`action-approval-card-${action.id}`}
    >
      <CardHeader className="bg-purple-50 dark:bg-purple-950/30 py-2">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <span className="text-base">⚡</span>
                <span>Proposed Action</span>
                <Badge variant="outline" className="text-[10px] h-4">{action.actionType}</Badge>
              </CardTitle>
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </div>
          </CollapsibleTrigger>
        </Collapsible>
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="pt-2 pb-2 space-y-2">
            {renderActionPreview()}

            {/* Technical Details - Collapsible */}
            <Collapsible open={showTechnicalDetails} onOpenChange={setShowTechnicalDetails}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-[10px] h-6 text-muted-foreground hover:text-foreground"
                  data-testid="button-toggle-technical-details"
                >
                  <span>Technical Details</span>
                  {showTechnicalDetails ? (
                    <ChevronUp className="h-2.5 w-2.5" />
                  ) : (
                    <ChevronDown className="h-2.5 w-2.5" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 p-2 bg-muted/50 rounded text-[10px] space-y-1.5">
                  <div>
                    <p className="font-semibold mb-0.5">Function Call:</p>
                    <code className="text-[10px]">{action.actionType}</code>
                  </div>
                  <div>
                    <p className="font-semibold mb-0.5">Payload Data:</p>
                    <pre className="overflow-auto max-h-32 p-1.5 bg-background rounded text-[9px]">
                      {JSON.stringify(payload, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="font-semibold mb-0.5">API Endpoint:</p>
                    <code className="text-[9px]">/api/ai-chat/actions/{action.id}/approve</code>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {renderExecutionResult()}

            {!executionResult && (
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => rejectMutation.mutate()}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  data-testid="button-reject-action"
                  className="h-7 text-[11px]"
                >
                  {rejectMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <X className="mr-1 h-2.5 w-2.5" />
                      Cancel
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 h-7 text-[11px]"
                  data-testid="button-approve-action"
                >
                  {approveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-1 h-2.5 w-2.5" />
                      Approve
                    </>
                  )}
                </Button>
              </div>
            )}

            {approveMutation.isError && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-[11px] text-red-800 dark:text-red-200">
                Error executing action. Please try again.
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
