import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AttachDocumentParams {
  documentId: number;
  entityType: 'objective' | 'keyResult' | 'task';
  entityId: number;
  notes?: string;
}

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

/**
 * Hook for attaching a document to an entity
 */
export function useAttachDocument() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ documentId, entityType, entityId, notes }: AttachDocumentParams) => {
      const response = await apiRequest(`/api/knowledge-base/documents/${documentId}/attach`, {
        method: 'POST',
        body: {
          attachTo: entityType,
          targetId: entityId,
          notes
        }
      });
      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate the attached documents query for this entity
      queryClient.invalidateQueries({ 
        queryKey: [`/api/knowledge-base/attachments/${variables.entityType}/${variables.entityId}`] 
      });
      
      toast({
        title: 'Success',
        description: 'Document attached successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to attach document',
        variant: 'destructive'
      });
    }
  });
}

/**
 * Hook for detaching a document from an entity
 */
export function useDetachDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      documentId, 
      attachmentId, 
      entityType, 
      entityId 
    }: { 
      documentId: number; 
      attachmentId: number; 
      entityType: 'objective' | 'keyResult' | 'task';
      entityId: number;
    }) => {
      const response = await apiRequest(
        `/api/knowledge-base/documents/${documentId}/attach/${attachmentId}`, 
        { method: 'DELETE' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to detach document');
      }
      
      return true;
    },
    onSuccess: (data, variables) => {
      // Invalidate the attached documents query for this entity
      queryClient.invalidateQueries({ 
        queryKey: [`/api/knowledge-base/attachments/${variables.entityType}/${variables.entityId}`] 
      });
      
      toast({
        title: 'Success',
        description: 'Document detached successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to detach document',
        variant: 'destructive'
      });
    }
  });
}

/**
 * Hook to fetch attached documents for an entity
 */
export function useAttachedDocuments(
  entityType: 'objective' | 'keyResult' | 'task',
  entityId: number,
  enabled = true
) {
  return useQuery<AttachedDocument[]>({
    queryKey: [`/api/knowledge-base/attachments/${entityType}/${entityId}`],
    queryFn: async () => {
      const response = await apiRequest(`/api/knowledge-base/attachments/${entityType}/${entityId}`);
      return await response.json();
    },
    enabled: enabled && !!entityId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for bulk attaching multiple documents
 */
export function useBulkAttachDocuments() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      documentIds, 
      entityType, 
      entityId, 
      notes 
    }: { 
      documentIds: number[];
      entityType: 'objective' | 'keyResult' | 'task';
      entityId: number;
      notes?: string;
    }) => {
      const promises = documentIds.map(documentId =>
        apiRequest(`/api/knowledge-base/documents/${documentId}/attach`, {
          method: 'POST',
          body: {
            attachTo: entityType,
            targetId: entityId,
            notes
          }
        })
      );
      
      const responses = await Promise.allSettled(promises);
      
      const successful = responses.filter(r => r.status === 'fulfilled').length;
      const failed = responses.filter(r => r.status === 'rejected').length;
      
      if (failed > 0 && successful === 0) {
        throw new Error('Failed to attach all documents');
      }
      
      return { successful, failed };
    },
    onSuccess: (data, variables) => {
      // Invalidate the attached documents query for this entity
      queryClient.invalidateQueries({ 
        queryKey: [`/api/knowledge-base/attachments/${variables.entityType}/${variables.entityId}`] 
      });
      
      if (data.failed > 0) {
        toast({
          title: 'Partial Success',
          description: `${data.successful} document(s) attached successfully, ${data.failed} failed`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Success',
          description: `${data.successful} document(s) attached successfully`
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to attach documents',
        variant: 'destructive'
      });
    }
  });
}

/**
 * Hook to search knowledge base documents
 */
export function useSearchDocuments(
  searchQuery: string,
  documentType?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ['/api/knowledge-base/documents', { search: searchQuery, documentType }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (documentType && documentType !== 'all') params.append('documentType', documentType);
      params.append('status', 'published');
      
      const response = await apiRequest(`/api/knowledge-base/documents?${params}`);
      return await response.json();
    },
    enabled: enabled,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to get document activity
 */
export function useDocumentActivity(documentId: number, enabled = true) {
  return useQuery({
    queryKey: [`/api/knowledge-base/documents/${documentId}/activity`],
    queryFn: async () => {
      const response = await apiRequest(`/api/knowledge-base/documents/${documentId}/activity`);
      return await response.json();
    },
    enabled: enabled && !!documentId,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000, // 1 minute
  });
}