import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TrainingDocumentDialogProps {
  documentId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrainingDocumentDialog({ 
  documentId, 
  open, 
  onOpenChange 
}: TrainingDocumentDialogProps) {
  const { data: document, isLoading } = useQuery<any>({
    queryKey: [`/api/knowledge-base/documents/${documentId}`],
    enabled: !!documentId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="training-document-dialog">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : document ? (
          <>
            <DialogHeader>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <DialogTitle className="text-2xl" data-testid="document-title">
                    {document.title}
                  </DialogTitle>
                  {document.summary && (
                    <DialogDescription className="mt-2 text-base" data-testid="document-summary">
                      {document.summary}
                    </DialogDescription>
                  )}
                </div>
                <BookOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              
              <div className="flex items-center gap-3 pt-2">
                {document.estimatedReadingTime && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span data-testid="reading-time">{document.estimatedReadingTime} min read</span>
                  </div>
                )}
                
                {document.categories && document.categories.length > 0 && (
                  <div className="flex gap-2" data-testid="document-categories">
                    {document.categories.map((category: string, index: number) => (
                      <Badge key={index} variant="outline" data-testid={`category-${index}`}>
                        {category}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 -mx-6 px-6" data-testid="document-content-scroll">
              <div 
                className="prose dark:prose-invert max-w-none py-4"
                dangerouslySetInnerHTML={{ __html: document.content || '' }}
                data-testid="document-content"
              />
            </ScrollArea>
          </>
        ) : (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <p>Document not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
