import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Eye, 
  Trash2, 
  ExternalLink, 
  MoreVertical,
  FileText,
  Calendar,
  User,
  StickyNote,
  Loader2
} from 'lucide-react';
import { getDocumentTypeConfig } from '../../../../shared/documentTypes';
import { format } from 'date-fns';

interface AttachedDocument {
  attachmentId: number;
  documentId: number;
  notes?: string;
  attachedAt?: string;
  attachedBy?: number;
  attachedByName?: string;
  document?: {
    id: number;
    title: string;
    content?: string;
    summary?: string;
    category?: string;
    documentType?: string;
    tags?: string[];
    status?: string;
  };
}

interface AttachedDocumentsListProps {
  entityType: 'objective' | 'keyResult' | 'task' | 'workItem';
  entityId: number;
  attachedDocuments?: AttachedDocument[];
  onDocumentDetached?: () => void;
  showActions?: boolean;
  compact?: boolean;
  showAttachButton?: boolean;
  emptyMessage?: string;
}

export function AttachedDocumentsList({
  entityType,
  entityId,
  attachedDocuments,
  onDocumentDetached,
  showActions = true,
  compact = false,
  showAttachButton = true,
  emptyMessage = "No documents attached yet.",
}: AttachedDocumentsListProps) {
  const [detachConfirmOpen, setDetachConfirmOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<AttachedDocument | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<AttachedDocument | null>(null);
  
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Detach mutation
  const detachMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      // Find the document ID for the attachment
      const attachment = attachedDocuments?.find(a => a.attachmentId === attachmentId);
      if (!attachment) throw new Error('Attachment not found');
      
      return apiRequest(
        `/api/knowledge-base/documents/${attachment.documentId}/attach/${attachmentId}`, 
        { method: 'DELETE' }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/knowledge-base/attachments/${entityType}/${entityId}`] 
      });
      toast({
        title: 'Success',
        description: 'Document detached successfully'
      });
      onDocumentDetached?.();
      setDetachConfirmOpen(false);
      setSelectedAttachment(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to detach document',
        variant: 'destructive'
      });
    }
  });

  const handleDetachClick = (attachment: AttachedDocument) => {
    setSelectedAttachment(attachment);
    setDetachConfirmOpen(true);
  };

  const handleDetachConfirm = () => {
    if (selectedAttachment) {
      detachMutation.mutate(selectedAttachment.attachmentId);
    }
  };

  const handlePreview = (attachment: AttachedDocument) => {
    setPreviewDocument(attachment);
    setPreviewOpen(true);
  };

  const openDocumentEditor = (documentId: number) => {
    // Navigate to document view in same window
    navigate(`/kb/documents/${documentId}`);
  };

  const canDetach = currentUser && (
    currentUser.role === 'admin' || 
    currentUser.role === 'manager' || 
    currentUser.role === 'super_admin'
  );

  if (!attachedDocuments || attachedDocuments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500">
        <FileText className="h-12 w-12 mb-2" />
        <p>No documents attached</p>
        <p className="text-sm">Click "Attach Documents" to get started</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className={compact ? "space-y-1 p-0.5" : "space-y-2 p-1"}>
          {attachedDocuments?.map((attachment) => {
            const doc = attachment.document;
            if (!doc) return null;

            const typeConfig = getDocumentTypeConfig(doc.documentType || '');
            
            return (
              <Card 
                key={attachment.attachmentId} 
                data-testid={`card-attached-${attachment.attachmentId}`} 
                className={`${compact ? "shadow-none border-l-2 border-l-blue-200" : ""} cursor-pointer hover:bg-gray-50 transition-colors`}
                onClick={() => openDocumentEditor(doc.id)}
              >
                <CardHeader className="flex flex-col space-y-1.5 p-6 px-3 ml-[0px] mr-[0px] pl-[10px] pr-[10px] mt-[0px] mb-[0px] pt-[0px] pb-[0px]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="tracking-tight font-medium text-[12px] ml-[4px] mr-[4px] mt-[4px] mb-[4px]">{doc.title}</CardTitle>
                      {doc.summary && !compact && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {doc.summary}
                        </p>
                      )}
                    </div>
                    {showActions && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(attachment);
                          }}>
                            <Eye className="h-3 w-3 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            openDocumentEditor(doc.id);
                          }}>
                            <ExternalLink className="h-3 w-3 mr-2" />
                            Open in Editor
                          </DropdownMenuItem>
                          {canDetach && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDetachClick(attachment);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Detach
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6 px-3 pl-[10px] pr-[10px] pt-[0px] pb-[0px]">
                  {/* Metadata and Badges */}
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    {doc.documentType && (
                      <Badge variant="outline" className={`text-xs text-${typeConfig.color}-600`}>
                        {typeConfig.label}
                      </Badge>
                    )}
                    {doc.category && (
                      <Badge variant="secondary" className="text-xs">
                        {doc.category}
                      </Badge>
                    )}
                    {doc.tags && doc.tags.length > 0 && (
                      <>
                        {doc.tags.slice(0, 2).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {doc.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{doc.tags.length - 2}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>

                  {/* Attachment Info */}
                  <div className="mt-3 pt-3 border-t space-y-1">
                    {attachment.attachedByName && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User className="h-3 w-3" />
                        <span>Attached by {attachment.attachedByName}</span>
                      </div>
                    )}
                    {attachment.attachedAt && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(attachment.attachedAt), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    )}
                    {attachment.notes && (
                      <div className="flex items-start gap-2 text-xs text-gray-600 mt-2">
                        <StickyNote className="h-3 w-3 mt-0.5" />
                        <span className="flex-1">{attachment.notes}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
      {/* Detach Confirmation Dialog */}
      <AlertDialog open={detachConfirmOpen} onOpenChange={setDetachConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Detach Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to detach "{selectedAttachment?.document?.title}"? 
              This will remove the link between this document and the {entityType}.
              The document itself will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDetachConfirm}
              disabled={detachMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {detachMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Detaching...
                </>
              ) : (
                'Detach'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Document Preview Dialog */}
      {previewDocument && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{previewDocument.document?.title}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Document Type and Category */}
                <div className="flex gap-2">
                  {previewDocument.document?.documentType && (
                    <Badge variant="outline">
                      {getDocumentTypeConfig(previewDocument.document.documentType).label}
                    </Badge>
                  )}
                  {previewDocument.document?.category && (
                    <Badge variant="secondary">{previewDocument.document.category}</Badge>
                  )}
                  {previewDocument.document?.status && (
                    <Badge>{previewDocument.document.status}</Badge>
                  )}
                </div>

                {/* Summary */}
                {previewDocument.document?.summary && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Summary</h3>
                    <p className="text-sm text-gray-600">{previewDocument.document.summary}</p>
                  </div>
                )}

                {/* Content */}
                {previewDocument.document?.content && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Content</h3>
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: previewDocument.document.content }}
                    />
                  </div>
                )}

                {/* Tags */}
                {previewDocument.document?.tags && previewDocument.document.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {previewDocument.document.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachment Notes */}
                {previewDocument.notes && (
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-semibold mb-1">Attachment Notes</h3>
                    <p className="text-sm text-gray-600">{previewDocument.notes}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
              <Button onClick={() => openDocumentEditor(previewDocument.documentId)}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Editor
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}