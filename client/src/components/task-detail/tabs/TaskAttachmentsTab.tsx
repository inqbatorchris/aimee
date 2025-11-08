import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { DocumentAttachmentButton } from '@/components/KnowledgeBase/DocumentAttachmentButton';
import { AttachedDocumentsList } from '@/components/KnowledgeBase/AttachedDocumentsList';

interface TaskAttachmentsTabProps {
  taskId: number;
  taskTitle?: string;
}

export function TaskAttachmentsTab({ taskId, taskTitle }: TaskAttachmentsTabProps) {
  // Query for attached knowledge documents
  const { data: attachedDocuments = [], refetch: refetchAttachedDocuments } = useQuery<any[]>({
    queryKey: [`/api/knowledge-base/attachments/task/${taskId}`],
    enabled: !!taskId
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Knowledge Base Documents</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Attach relevant documents to provide context and resources for this task.
          </p>
        </div>
        {taskId && (
          <DocumentAttachmentButton
            entityType="task"
            entityId={taskId}
            entityTitle={taskTitle}
            buttonVariant="outline"
            buttonSize="sm"
            showLabel={true}
            attachedDocuments={attachedDocuments}
            onDocumentsAttached={refetchAttachedDocuments}
          />
        )}
      </div>
      
      {taskId && (
        attachedDocuments.length > 0 ? (
          <AttachedDocumentsList
            entityType="task"
            entityId={taskId}
            attachedDocuments={attachedDocuments}
            onDocumentDetached={refetchAttachedDocuments}
            showActions={true}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm">No documents attached yet.</p>
            <p className="text-xs mt-1">
              Attach knowledge base documents to provide context and resources.
            </p>
          </div>
        )
      )}
    </div>
  );
}