import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  GitBranch, 
  Eye, 
  RotateCcw, 
  Calendar, 
  User,
  FileText,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useDocumentVersions } from '@/hooks/useDocumentActivity';
import DOMPurify from 'dompurify';

interface DocumentVersionTabProps {
  documentId: number;
  currentDocument?: {
    id: number;
    title: string;
    content?: string;
    versionNumber?: number;
  };
}

interface DocumentVersion {
  id: number;
  versionNumber: number;
  title: string;
  content: string;
  summary?: string;
  changedBy: number;
  changeDescription?: string;
  createdAt: string;
  changedByUser?: {
    fullName: string;
  };
}

export function DocumentVersionTab({ documentId, currentDocument }: DocumentVersionTabProps) {
  const { toast } = useToast();
  const { data: versions = [], isLoading } = useDocumentVersions(documentId);
  
  // Type assertion and sort versions by versionNumber descending to ensure proper ordering
  const typedVersions = versions as DocumentVersion[];
  const sortedVersions = [...typedVersions].sort((a, b) => b.versionNumber - a.versionNumber);
  
  // Restore version mutation
  const restoreVersionMutation = useMutation({
    mutationFn: async (versionId: number) => {
      const response = await apiRequest(`/api/knowledge-base/documents/${documentId}/versions/${versionId}/restore`, {
        method: 'POST'
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge-base/documents/${documentId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge-base/documents/${documentId}/versions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge-base/documents/${documentId}/activity`] });
      toast({
        title: 'Success',
        description: 'Document version restored successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore version',
        variant: 'destructive'
      });
    }
  });

  const getUserInitials = (userName: string) => {
    return userName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="versions-loading">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (sortedVersions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Version History</h3>
          <p className="text-sm text-muted-foreground">
            Document versions will appear here when the document is edited.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="document-versions">
      {sortedVersions.map((version, index) => {
        // Determine if this is the current version by comparing version numbers
        const isCurrentVersion = currentDocument?.versionNumber ? 
          version.versionNumber === currentDocument.versionNumber : 
          index === 0; // fallback to index if no version number available
          
        return (
        <Card 
          key={version.id}
          className={isCurrentVersion ? 'border-blue-200 bg-blue-50/30' : ''}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Version Badge */}
              <div className="flex-shrink-0">
                <Badge 
                  variant={isCurrentVersion ? 'default' : 'outline'}
                  className="font-mono"
                >
                  v{version.versionNumber}
                  {isCurrentVersion && ' (Current)'}
                </Badge>
              </div>

              {/* Version Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs font-medium">
                      {getUserInitials(version.changedByUser?.fullName || 'Unknown')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm">
                    {version.changedByUser?.fullName || 'Unknown User'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    • {format(new Date(version.createdAt), 'MMM d, yyyy • h:mm a')}
                  </span>
                </div>

                <h4 className="font-medium mb-1 line-clamp-1">{version.title}</h4>
                
                {version.changeDescription && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {version.changeDescription}
                  </p>
                )}

                {version.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {version.summary}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex-shrink-0 flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-2">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4" />
                        Version {version.versionNumber} - {version.title}
                      </DialogTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {version.changedByUser?.fullName || 'Unknown User'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(version.createdAt), 'PPp')}
                        </div>
                      </div>
                    </DialogHeader>
                    
                    <div className="overflow-y-auto">
                      {version.summary && (
                        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                          <h4 className="font-medium text-sm mb-1">Summary</h4>
                          <p className="text-sm text-muted-foreground">{version.summary}</p>
                        </div>
                      )}
                      
                      {version.changeDescription && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-sm mb-1">Changes Made</h4>
                          <p className="text-sm text-muted-foreground">{version.changeDescription}</p>
                        </div>
                      )}
                      
                      <div 
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(version.content || '<p>No content available for this version.</p>') 
                        }}
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                {!isCurrentVersion && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-2" 
                    onClick={() => restoreVersionMutation.mutate(version.id)}
                    disabled={restoreVersionMutation.isPending}
                  >
                    {restoreVersionMutation.isPending ? (
                      <Clock className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3 mr-1" />
                    )}
                    Restore
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        );
      })}
      
      {sortedVersions.length === 1 && (
        <Card className="border-dashed">
          <CardContent className="text-center py-6">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              New versions will appear here when the document is edited.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}