import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AttachedDocumentsList } from '@/components/KnowledgeBase/AttachedDocumentsList';

interface DocumentIndicatorProps {
  entityType: 'objective' | 'keyResult' | 'task' | 'workItem';
  entityId: number;
  entityTitle?: string;
  size?: 'sm' | 'md';
  showZero?: boolean;
}

export function DocumentIndicator({ 
  entityType, 
  entityId, 
  entityTitle, 
  size = 'sm',
  showZero = false 
}: DocumentIndicatorProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  // Query for attached documents (work items use inherited documents)
  const queryKey = entityType === 'workItem' 
    ? [`/api/work-items/${entityId}/inherited-documents`]
    : [`/api/knowledge-base/attachments/${entityType}/${entityId}`];
    
  const { data: attachedDocuments = [], refetch } = useQuery<any[]>({
    queryKey,
    enabled: !!entityId,
    select: (data) => {
      // For work items, extract documents from the inherited structure
      if (entityType === 'workItem') {
        return data?.inheritedDocuments || [];
      }
      return data;
    }
  });

  const documentCount = attachedDocuments.length;

  // Don't show indicator if no documents and showZero is false
  if (!showZero && documentCount === 0) {
    return null;
  }

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const badgeSize = size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5';

  return (
    <Popover open={previewOpen} onOpenChange={setPreviewOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-auto p-1 hover:bg-gray-100 transition-colors ${
            documentCount > 0 ? 'text-blue-600 hover:text-blue-700' : 'text-gray-400'
          }`}
          data-testid={`document-indicator-${entityType}-${entityId}`}
          title={documentCount > 0 ? 
            `View ${documentCount} ${entityType === 'workItem' ? 'inherited' : 'attached'} documents` : 
            `No documents ${entityType === 'workItem' ? 'inherited' : 'attached'}`
          }
        >
          <div className="flex items-center gap-1">
            <FileText className={iconSize} />
            {(documentCount > 0 || showZero) && (
              <Badge 
                variant={documentCount > 0 ? "default" : "secondary"}
                className={badgeSize}
                data-testid={`document-count-${entityType}-${entityId}`}
              >
                {documentCount}
              </Badge>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 p-0" 
        side="bottom" 
        align="start"
        data-testid={`document-preview-${entityType}-${entityId}`}
      >
        <div className="p-3 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-600" />
            <div>
              <h4 className="text-sm font-medium">
                {documentCount > 0 ? `${documentCount} ${entityType === 'workItem' ? 'Inherited' : ''} Documents` : 
                 `No ${entityType === 'workItem' ? 'Inherited ' : ''}Documents`}
              </h4>
              {entityTitle && (
                <p className="text-xs text-gray-500 truncate">
                  {entityType === 'objective' ? 'Objective' : 
                   entityType === 'keyResult' ? 'Key Result' : 
                   entityType === 'task' ? 'Task' : 'Work Item'}: {entityTitle}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto">
          {documentCount > 0 ? (
            <AttachedDocumentsList
              entityType={entityType}
              entityId={entityId}
              attachedDocuments={attachedDocuments}
              onDocumentDetached={refetch}
              showActions={false}
              compact={true}
            />
          ) : (
            <div className="p-4 text-center text-gray-500">
              <FileText className="h-6 w-6 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">
                No documents {entityType === 'workItem' ? 'inherited from hierarchy' : 'attached'}
              </p>
            </div>
          )}
        </div>

        <div className="p-2 border-t bg-gray-50">
          <Button
            variant="ghost" 
            size="sm"
            onClick={() => setPreviewOpen(false)}
            className="w-full text-xs h-7"
            data-testid={`close-document-preview-${entityType}-${entityId}`}
          >
            <Eye className="h-3 w-3 mr-1" />
            View in Detail Panel
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}