import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paperclip } from 'lucide-react';
import { AttachDocumentDialog } from './AttachDocumentDialog';

interface DocumentAttachmentButtonProps {
  entityType: 'objective' | 'keyResult' | 'task' | 'workItem';
  entityId: number;
  entityTitle?: string;
  buttonVariant?: 'default' | 'outline' | 'ghost' | 'secondary';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  attachedDocuments?: any[];
  onDocumentsAttached?: () => void;
}

export function DocumentAttachmentButton({
  entityType,
  entityId,
  entityTitle,
  buttonVariant = 'ghost',
  buttonSize = 'sm',
  showLabel = true,
  attachedDocuments = [],
  onDocumentsAttached
}: DocumentAttachmentButtonProps) {
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);

  // Use attached documents passed from parent component

  const handleDocumentsAttached = () => {
    onDocumentsAttached?.();
    setAttachDialogOpen(false);
  };

  const handleDocumentDetached = () => {
    onDocumentsAttached?.();
  };

  const attachmentCount = attachedDocuments.length;

  return (
    <>
      <Button 
        variant={buttonVariant} 
        size={buttonSize}
        className="relative text-[7px] pl-[2px] pr-[2px] h-5"
        onClick={() => setAttachDialogOpen(true)}
        data-testid={`button-attach-${entityType}-${entityId}`}
      >
        {showLabel && <span className="text-[12px]">Documents</span>}
        {attachmentCount > 0 && (
          <Badge 
            variant="secondary" 
            className="ml-0.5 px-0.5 py-0 h-3 text-[12px] pl-[4px] pr-[4px]"
          >
            {attachmentCount}
          </Badge>
        )}
      </Button>
      {/* Attach Document Dialog */}
      <AttachDocumentDialog
        open={attachDialogOpen}
        onOpenChange={setAttachDialogOpen}
        entityType={entityType}
        entityId={entityId}
        entityTitle={entityTitle}
        onDocumentsAttached={handleDocumentsAttached}
      />
    </>
  );
}