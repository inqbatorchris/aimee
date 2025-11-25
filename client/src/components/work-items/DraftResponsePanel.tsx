import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Sparkles,
  Copy,
  Check,
  Send,
  RefreshCw,
  Loader2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { format } from 'date-fns';

interface DraftResponsePanelProps {
  workItemId: number;
  workItemType?: string;
}

interface TicketDraftResponse {
  id: number;
  workItemId: number;
  originalDraft: string;
  finalResponse?: string;
  editPercentage?: number;
  sentAt?: string;
  sentBy?: number;
  regenerationCount: number;
  generationMetadata: {
    model?: string;
    temperature?: number;
    knowledgeDocumentsUsed?: number[];
  };
  createdAt: string;
  updatedAt: string;
}

export function DraftResponsePanel({ workItemId, workItemType }: DraftResponsePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDraft, setEditedDraft] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch the draft for this work item
  const { data: draft, isLoading, error } = useQuery<TicketDraftResponse>({
    queryKey: ['/api/ai-drafting/drafts/work-item', workItemId],
    enabled: workItemType === 'support_ticket' && !!workItemId,
  });

  // Mutation to regenerate draft
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/ai-drafting/drafts/${draft?.id}/regenerate`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Draft regenerated',
        description: 'A new draft response has been generated.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-drafting/drafts/work-item', workItemId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to regenerate',
        description: error?.message || 'Could not regenerate draft.',
        variant: 'destructive',
      });
    },
  });

  // Mutation to mark draft as sent
  const sendMutation = useMutation({
    mutationFn: async (finalResponse: string) => {
      return await apiRequest(`/api/ai-drafting/drafts/${draft?.id}`, {
        method: 'PATCH',
        body: {
          finalResponse,
          // sentBy will be set by backend from authenticated user
        },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Response sent',
        description: 'The response has been marked as sent and performance metrics will be updated.',
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/ai-drafting/drafts/work-item', workItemId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send',
        description: error?.message || 'Could not send response.',
        variant: 'destructive',
      });
    },
  });

  const handleCopyToClipboard = async () => {
    const textToCopy = isEditing ? editedDraft : (draft?.originalDraft || '');
    await navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    toast({
      title: 'Copied to clipboard',
      description: 'Draft response has been copied.',
    });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleStartEditing = () => {
    setEditedDraft(draft?.finalResponse || draft?.originalDraft || '');
    setIsEditing(true);
  };

  const handleSendResponse = () => {
    if (!editedDraft.trim()) {
      toast({
        title: 'Empty response',
        description: 'Please enter a response before sending.',
        variant: 'destructive',
      });
      return;
    }
    sendMutation.mutate(editedDraft);
  };

  const handleRegenerate = () => {
    regenerateMutation.mutate();
  };

  // Don't show for non-support ticket work items
  if (workItemType !== 'support_ticket') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32" data-testid="loader-draft">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !draft) {
    return (
      <Alert data-testid="alert-no-draft">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No AI-generated draft available for this ticket yet. Configure AI Ticket Drafting in the integrations to automatically generate draft responses.
        </AlertDescription>
      </Alert>
    );
  }

  const wasSent = !!draft.sentAt;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">AI-Generated Draft</h3>
        </div>
        <div className="flex items-center gap-2">
          {wasSent && (
            <Badge variant="outline" className="gap-1" data-testid="badge-sent">
              <Check className="h-3 w-3" />
              Sent
            </Badge>
          )}
          {draft.regenerationCount > 0 && (
            <Badge variant="secondary" data-testid="badge-regeneration-count">
              Regenerated {draft.regenerationCount}x
            </Badge>
          )}
        </div>
      </div>

      {/* Draft Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Response Draft</CardTitle>
            <div className="flex items-center gap-2">
              {draft.generationMetadata?.model && (
                <Badge variant="outline" className="text-xs" data-testid="badge-model">
                  {draft.generationMetadata.model}
                </Badge>
              )}
            </div>
          </div>
          {draft.generationMetadata?.knowledgeDocumentsUsed && (
            <CardDescription className="text-xs">
              Generated using {draft.generationMetadata.knowledgeDocumentsUsed.length} knowledge base document(s)
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <Textarea
                value={editedDraft}
                onChange={(e) => setEditedDraft(e.target.value)}
                rows={12}
                className="font-sans text-sm"
                placeholder="Edit the draft response..."
                data-testid="textarea-edit-draft"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {editedDraft.length} characters
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedDraft('');
                    }}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendResponse}
                    disabled={sendMutation.isPending}
                    data-testid="button-send-response"
                  >
                    {sendMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Response
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                className="whitespace-pre-wrap text-sm p-4 bg-muted rounded-md max-h-96 overflow-y-auto"
                data-testid="text-draft-content"
              >
                {wasSent && draft.finalResponse ? draft.finalResponse : draft.originalDraft}
              </div>
              {wasSent && draft.editPercentage !== undefined && draft.editPercentage > 0 && (
                <Alert>
                  <AlertDescription className="text-xs">
                    This response was edited by {draft.editPercentage.toFixed(1)}% before sending.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {!wasSent && !isEditing && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyToClipboard}
            data-testid="button-copy-draft"
          >
            {isCopied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartEditing}
            data-testid="button-edit-draft"
          >
            <Send className="h-4 w-4 mr-2" />
            Edit & Send
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerateMutation.isPending}
            data-testid="button-regenerate"
          >
            {regenerateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </>
            )}
          </Button>
        </div>
      )}

      {/* Metadata */}
      <Separator />
      <div className="text-xs text-muted-foreground space-y-1">
        <p>Generated: {format(new Date(draft.createdAt), 'PPp')}</p>
        {draft.updatedAt !== draft.createdAt && (
          <p>Last updated: {format(new Date(draft.updatedAt), 'PPp')}</p>
        )}
        {wasSent && draft.sentAt && (
          <p>Sent: {format(new Date(draft.sentAt), 'PPp')}</p>
        )}
      </div>
    </div>
  );
}
