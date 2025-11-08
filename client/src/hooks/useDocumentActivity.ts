import { useQuery } from '@tanstack/react-query';

// Separate hook file for better cohesion and organization

export function useDocumentActivity(documentId: number, enabled = true) {
  return useQuery({
    queryKey: [`/api/knowledge-base/documents/${documentId}/activity`],
    enabled: enabled && !!documentId,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useDocumentVersions(documentId: number, enabled = true) {
  return useQuery({
    queryKey: [`/api/knowledge-base/documents/${documentId}/versions`],
    enabled: enabled && !!documentId,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000, // 1 minute
  });
}