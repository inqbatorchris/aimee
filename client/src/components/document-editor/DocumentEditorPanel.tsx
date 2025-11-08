import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Save,
  Eye,
  Settings,
  FileText,
  Calendar,
  User,
  Users
} from 'lucide-react';
import { DocumentEditTab } from './tabs/DocumentEditTab';
import { DocumentPreviewTab } from './tabs/DocumentPreviewTab';
import { DocumentSettingsTab } from './tabs/DocumentSettingsTab';
import { DocumentAssignmentsTab } from './tabs/DocumentAssignmentsTab';
import { DocumentFormWrapper } from './DocumentFormWrapper';

interface Document {
  id: number;
  title: string;
  content: string;
  categories: string[]; // Updated to array for multi-select
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'internal' | 'private';
  featuredImage?: string;
  tags: string[]; // Made required as array
  estimatedReadingTime?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  author?: {
    id: number;
    fullName: string;
    email: string;
  };
}

interface DocumentEditorPanelProps {
  documentId: number | null;
  open: boolean;
  onClose: () => void;
  isCreating?: boolean;
  defaultTab?: 'edit' | 'preview' | 'settings' | 'assignments';
}

// Centralized document state interface - updated for new schema
interface DocumentState {
  title: string;
  content: string;
  categories: string[]; // Updated to array for multi-select categories
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'internal' | 'private';
  featuredImage: string;
  tags: string[];
  estimatedReadingTime?: number;
  aiGenerated: boolean;
  aiPrompt: string;
}

export function DocumentEditorPanel({
  documentId,
  open,
  onClose,
  isCreating = false,
  defaultTab = 'edit'
}: DocumentEditorPanelProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'settings' | 'assignments'>(defaultTab);
  
  // Centralized document state - updated for new schema
  const [documentState, setDocumentState] = useState<DocumentState>({
    title: '',
    content: '',
    categories: [], // Updated to empty array for multi-select
    status: 'draft',
    visibility: 'internal',
    featuredImage: '',
    tags: [],
    estimatedReadingTime: undefined,
    aiGenerated: false,
    aiPrompt: '',
  });

  // Reset tab when defaultTab changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Fetch document data
  const { data: document, isLoading } = useQuery<Document>({
    queryKey: [`/api/knowledge-base/documents/${documentId}`],
    enabled: !!documentId && !isCreating && open,
  });

  // Initialize document state when loading existing document - updated for new schema
  useEffect(() => {
    if (document && !isCreating) {
      setDocumentState({
        title: document.title || '',
        content: document.content || '',
        categories: document.categories || [], // Updated to use categories array
        status: document.status || 'draft',
        visibility: document.visibility || 'internal',
        featuredImage: document.featuredImage || '',
        tags: document.tags || [],
        estimatedReadingTime: document.estimatedReadingTime,
        aiGenerated: false,
        aiPrompt: '',
      });
    } else if (isCreating) {
      // Reset state for new document
      setDocumentState({
        title: '',
        content: '',
        categories: [], // Updated to empty array for new documents
        status: 'draft',
        visibility: 'internal',
        featuredImage: '',
        tags: [],
        estimatedReadingTime: undefined,
        aiGenerated: false,
        aiPrompt: '',
      });
    }
  }, [document, isCreating]);

  // Save document mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Document>) => {
      if (isCreating) {
        return apiRequest('/api/knowledge-base/documents', {
          method: 'POST',
          body: data,
        });
      } else {
        return apiRequest(`/api/knowledge-base/documents/${documentId}`, {
          method: 'PUT',
          body: data,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/documents'] });
      if (documentId) {
        queryClient.invalidateQueries({ queryKey: [`/api/knowledge-base/documents/${documentId}`] });
      }
      toast({
        title: 'Success',
        description: isCreating ? 'Document created successfully' : 'Document updated successfully',
      });
      if (isCreating) {
        onClose();
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save document',
        variant: 'destructive',
      });
    },
  });

  // Update document state helper functions
  const updateDocumentState = (updates: Partial<DocumentState>) => {
    setDocumentState(prev => ({ ...prev, ...updates }));
  };

  // Centralized save function with validation
  const handleSave = () => {
    // Validate required fields
    if (!documentState.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a document title.',
        variant: 'destructive',
      });
      setActiveTab('edit'); // Switch to edit tab
      return;
    }

    if (!documentState.content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please add some content to the document.',
        variant: 'destructive',
      });
      setActiveTab('edit'); // Switch to edit tab
      return;
    }

    if (!documentState.categories || documentState.categories.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one category.',
        variant: 'destructive',
      });
      setActiveTab('settings'); // Switch to settings tab
      return;
    }

    // Save with consolidated data
    saveMutation.mutate(documentState);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return '🌐';
      case 'internal':
        return '🏢';
      case 'private':
        return '🔒';
      default:
        return '📄';
    }
  };

  return (
    <DocumentFormWrapper>
      <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
        <SheetContent 
          className="w-full sm:w-[600px] sm:max-w-none overflow-hidden flex flex-col p-0 [&>button]:hidden"
        >
        <SheetHeader className="flex-shrink-0 px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <SheetTitle className="text-lg font-semibold">
                {isCreating ? 'Create New Document' : document?.title || 'Loading...'}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1">
                {isCreating ? (
                  'Create a new knowledge base document'
                ) : (
                  <div className="flex items-center gap-4 mt-2">
                    {document && (
                      <>
                        <Badge variant="outline" className={getStatusColor(document.status)}>
                          {document.status}
                        </Badge>
                        {document.visibility && (
                          <span className="text-xs">
                            {getVisibilityIcon(document.visibility)} {document.visibility}
                          </span>
                        )}
                        <span className="text-xs flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(document.updatedAt).toLocaleDateString()}
                        </span>
                        {document.author && (
                          <span className="text-xs flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {document.author.fullName}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </SheetDescription>
            </div>

          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'edit' | 'preview' | 'settings' | 'assignments')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-4 h-8 mx-4 mt-3" style={{ width: 'calc(100% - 2rem)' }}>
            <TabsTrigger value="edit" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs" disabled={isCreating}>
              <Eye className="h-3 w-3 mr-1" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-xs" disabled={isCreating}>
              <Users className="h-3 w-3 mr-1" />
              Assign
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <TabsContent value="edit" className="h-full m-0 px-4">
              <DocumentEditTab
                title={documentState.title}
                content={documentState.content}
                onTitleChange={(title) => updateDocumentState({ title })}
                onContentChange={(content) => updateDocumentState({ content })}
                onSave={handleSave}
                isLoading={saveMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="preview" className="h-full m-0 px-4">
              <DocumentPreviewTab
                document={{
                  ...document,
                  title: documentState.title,
                  content: documentState.content,
                } as any}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="settings" className="h-full m-0 px-4">
              <DocumentSettingsTab
                formData={{
                  categories: documentState.categories, // Updated to use categories array
                  status: documentState.status,
                  visibility: documentState.visibility,
                  featuredImage: documentState.featuredImage,
                  tags: documentState.tags,
                  estimatedReadingTime: documentState.estimatedReadingTime,
                  aiGenerated: documentState.aiGenerated,
                  aiPrompt: documentState.aiPrompt,
                }}
                onFormDataChange={updateDocumentState}
                onSave={handleSave}
                isLoading={saveMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="assignments" className="h-full m-0 px-4">
              <DocumentAssignmentsTab
                documentId={documentId!}
                canManageAssignments={
                  currentUser?.role === 'admin' || 
                  currentUser?.role === 'super_admin' || 
                  currentUser?.role === 'manager'
                }
              />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
    </DocumentFormWrapper>
  );
}