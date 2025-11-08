import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface DeleteKeyResultDialogProps {
  keyResult: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (keyResultId: number) => void;
  isDeleting?: boolean;
}

export function DeleteKeyResultDialog({
  keyResult,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false
}: DeleteKeyResultDialogProps) {
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  // Fetch dependencies when dialog opens
  const { data: dependencies, isLoading: isLoadingDeps } = useQuery({
    queryKey: [`/api/strategy/key-results/${keyResult?.id}/dependencies`],
    enabled: !!keyResult?.id && open,
    queryFn: async () => {
      const response = await apiRequest(`/api/strategy/key-results/${keyResult.id}/dependencies`);
      return response.json();
    }
  });

  // Reset confirmation text when dialog closes/opens
  useEffect(() => {
    if (!open) {
      setDeleteConfirmation('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (deleteConfirmation.toLowerCase() === 'delete' && keyResult) {
      onConfirm(keyResult.id);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      onOpenChange(false);
    }
  };

  const isDeleteEnabled = deleteConfirmation.toLowerCase() === 'delete';
  const hasDependencies = dependencies && dependencies.totalCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Key Result</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to delete the key result: <strong>{keyResult?.title}</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {isLoadingDeps ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Checking dependencies...</span>
            </div>
          ) : hasDependencies ? (
            <>
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-900">
                  <strong>Warning:</strong> This key result has dependencies that will also be deleted:
                  <ul className="mt-2 space-y-1 text-sm">
                    {dependencies.tasks.length > 0 && (
                      <li>• {dependencies.tasks.length} task{dependencies.tasks.length > 1 ? 's' : ''}</li>
                    )}
                    {dependencies.workItems.length > 0 && (
                      <li>• {dependencies.workItems.length} work item{dependencies.workItems.length > 1 ? 's' : ''}</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>

              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>This action cannot be undone!</strong> All associated data will be permanently deleted.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-900">
                This action is permanent and cannot be undone.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="delete-confirmation">
              Type <strong className="text-red-600">delete</strong> to confirm
            </Label>
            <Input
              id="delete-confirmation"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Type 'delete' to confirm"
              className={deleteConfirmation && !isDeleteEnabled ? 'border-red-500' : ''}
              disabled={isDeleting}
            />
            {deleteConfirmation && !isDeleteEnabled && (
              <p className="text-sm text-red-600">Please type "delete" exactly</p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isDeleteEnabled || isDeleting || isLoadingDeps}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : hasDependencies ? (
              'Delete Key Result and All Dependencies'
            ) : (
              'Delete Key Result'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}