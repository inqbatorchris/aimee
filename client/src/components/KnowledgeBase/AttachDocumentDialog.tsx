import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Search, Filter, FileText, Plus, Check, Loader2 } from 'lucide-react';
import { documentTypeConfig, DocumentType, getDocumentTypeConfig } from '../../../../shared/documentTypes';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface AttachDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'objective' | 'keyResult' | 'task' | 'workItem';
  entityId: number;
  entityTitle?: string;
  onDocumentsAttached: () => void;
}

interface KnowledgeDocument {
  id: number;
  title: string;
  content?: string;
  summary?: string;
  category?: string;
  documentType?: string;
  tags?: string[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function AttachDocumentDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityTitle,
  onDocumentsAttached
}: AttachDocumentDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<number>>(new Set());
  const [attachmentNotes, setAttachmentNotes] = useState('');
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Fetch available documents
  const { data: documents = [], isLoading } = useQuery<KnowledgeDocument[]>({
    queryKey: ['/api/knowledge-base/documents', { search: searchQuery, documentType: selectedType }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedType && selectedType !== 'all') params.append('documentType', selectedType);
      params.append('status', 'published');
      
      const response = await apiRequest(`/api/knowledge-base/documents?${params}`);
      return await response.json();
    },
    enabled: open
  });

  // Fetch already attached documents to exclude them
  const { data: attachedDocs = [] } = useQuery<any[]>({
    queryKey: [`/api/knowledge-base/attachments/${entityType}/${entityId}`],
    enabled: open && !!entityId
  });

  const attachedDocIds = new Set(attachedDocs.map((a: any) => a.documentId));
  const availableDocuments = documents.filter((doc: KnowledgeDocument) => !attachedDocIds.has(doc.id));

  // Attach documents mutation
  const attachMutation = useMutation({
    mutationFn: async (documentIds: number[]) => {
      const promises = documentIds.map(documentId =>
        apiRequest(`/api/knowledge-base/documents/${documentId}/attach`, {
          method: 'POST',
          body: {
            attachTo: entityType,
            targetId: entityId,
            notes: attachmentNotes
          }
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/knowledge-base/attachments/${entityType}/${entityId}`] 
      });
      toast({
        title: 'Success',
        description: `${selectedDocuments.size} document(s) attached successfully`
      });
      onDocumentsAttached();
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to attach documents',
        variant: 'destructive'
      });
    }
  });

  const handleClose = () => {
    setSelectedDocuments(new Set());
    setAttachmentNotes('');
    setSearchQuery('');
    setSelectedType('all');
    onOpenChange(false);
  };

  const toggleDocumentSelection = (docId: number) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(docId)) {
      newSelection.delete(docId);
    } else {
      newSelection.add(docId);
    }
    setSelectedDocuments(newSelection);
  };

  const handleAttach = () => {
    if (selectedDocuments.size === 0) {
      toast({
        title: 'No documents selected',
        description: 'Please select at least one document to attach',
        variant: 'destructive'
      });
      return;
    }
    attachMutation.mutate(Array.from(selectedDocuments));
  };

  const getDocumentIcon = (type?: string) => {
    const config = type ? getDocumentTypeConfig(type) : null;
    return config?.icon || 'File';
  };

  const getDocumentColor = (type?: string) => {
    const config = type ? getDocumentTypeConfig(type) : null;
    return config?.color || 'gray';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl h-[85vh] sm:h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Attach Knowledge Base Documents
            {entityTitle && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                to {entityTitle}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder="Search documents by title, content, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className=""
                data-testid="input-search-documents"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-document-type">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(documentTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Count */}
          {selectedDocuments.size > 0 && (
            <div className="flex items-center justify-between px-2">
              <Badge variant="secondary">
                {selectedDocuments.size} document(s) selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDocuments(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          )}

          {/* Documents List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : availableDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <FileText className="h-12 w-12 mb-2" />
                <p>No documents found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid gap-2 p-1">
                {availableDocuments.map((doc: KnowledgeDocument) => (
                  <HoverCard key={doc.id}>
                    <HoverCardTrigger asChild>
                      <Card 
                        className={`cursor-pointer transition-colors ${
                          selectedDocuments.has(doc.id) 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleDocumentSelection(doc.id)}
                        data-testid={`card-document-${doc.id}`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <Checkbox
                                checked={selectedDocuments.has(doc.id)}
                                onCheckedChange={() => toggleDocumentSelection(doc.id)}
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`checkbox-document-${doc.id}`}
                              />
                              <div className="flex-1">
                                <CardTitle className="text-sm font-medium">
                                  {doc.title}
                                </CardTitle>
                                {doc.category && (
                                  <CardDescription className="text-xs mt-1">
                                    {doc.category}
                                  </CardDescription>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {doc.documentType && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs text-${getDocumentColor(doc.documentType)}-600`}
                                >
                                  {getDocumentTypeConfig(doc.documentType).label}
                                </Badge>
                              )}
                              {doc.status === 'published' && (
                                <Check className="h-3 w-3 text-green-600" />
                              )}
                            </div>
                          </div>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {doc.tags.slice(0, 3).map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {doc.tags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{doc.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardHeader>
                      </Card>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">{doc.title}</h4>
                        {doc.summary && (
                          <p className="text-xs text-gray-600">{doc.summary}</p>
                        )}
                        {doc.updatedAt && (
                          <p className="text-xs text-gray-500">
                            Last updated: {new Date(doc.updatedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Notes Section */}
          {selectedDocuments.size > 0 && (
            <div className="space-y-2">
              <Label htmlFor="attachment-notes">Attachment Notes (Optional)</Label>
              <Textarea
                id="attachment-notes"
                placeholder="Add any notes or context for these attachments..."
                value={attachmentNotes}
                onChange={(e) => setAttachmentNotes(e.target.value)}
                rows={2}
                data-testid="textarea-attachment-notes"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAttach}
            disabled={selectedDocuments.size === 0 || attachMutation.isPending}
            data-testid="button-attach-submit"
          >
            {attachMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Attaching...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Attach {selectedDocuments.size} Document(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}