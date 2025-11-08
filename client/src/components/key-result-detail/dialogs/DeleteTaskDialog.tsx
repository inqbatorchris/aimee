import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, FileX, Package } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface DeleteTaskDialogProps {
  task: {
    id: number;
    title: string;
    description?: string;
    isRecurring?: boolean;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (taskId: number) => void;
  isDeleting?: boolean;
}

interface TaskDependencies {
  workItemsCount: number;
  snapshotsCount: number;
  totalDependencies: number;
  workItems?: Array<{ id: number; title: string; status: string }>;
  snapshots?: Array<{ id: number; title: string }>;
}

export function DeleteTaskDialog({
  task,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false
}: DeleteTaskDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [dependencies, setDependencies] = useState<TaskDependencies | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch dependencies when dialog opens
  useEffect(() => {
    if (open && task) {
      fetchDependencies(task.id);
    } else {
      // Reset state when dialog closes
      setConfirmText('');
      setDependencies(null);
      setError(null);
    }
  }, [open, task]);

  const fetchDependencies = async (taskId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(`/api/strategy/key-result-tasks/${taskId}/dependencies`);
      setDependencies(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch task dependencies');
      console.error('Error fetching dependencies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (task && confirmText.toLowerCase() === 'delete') {
      onConfirm(task.id);
    }
  };

  const getDependencyDescription = () => {
    if (!dependencies) return '';
    
    const items = [];
    if (dependencies.workItemsCount > 0) {
      items.push(`${dependencies.workItemsCount} work item${dependencies.workItemsCount > 1 ? 's' : ''}`);
    }
    if (dependencies.snapshotsCount > 0) {
      items.push(`${dependencies.snapshotsCount} historical snapshot${dependencies.snapshotsCount > 1 ? 's' : ''}`);
    }
    
    return items.join(' and ');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Delete Task: {task?.title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                  <span className="ml-2 text-sm text-gray-500">Checking dependencies...</span>
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : dependencies ? (
                <>
                  {dependencies.totalDependencies > 0 ? (
                    <div className="space-y-3">
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-900">
                          <strong>Warning:</strong> This task has dependencies that will also be deleted.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="font-semibold text-red-900 mb-2">
                          This action will permanently delete:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                          {dependencies.workItemsCount > 0 && (
                            <li className="flex items-center gap-2">
                              <Package className="h-4 w-4 inline" />
                              {dependencies.workItemsCount} work item{dependencies.workItemsCount > 1 ? 's' : ''}
                            </li>
                          )}
                          {dependencies.snapshotsCount > 0 && (
                            <li className="flex items-center gap-2">
                              <FileX className="h-4 w-4 inline" />
                              {dependencies.snapshotsCount} historical snapshot{dependencies.snapshotsCount > 1 ? 's' : ''}
                            </li>
                          )}
                          <li className="font-semibold">The task itself</li>
                        </ul>
                      </div>

                      {task?.isRecurring && (
                        <Alert className="border-blue-200 bg-blue-50">
                          <AlertDescription className="text-blue-900">
                            <strong>Note:</strong> This is a recurring task. All future occurrences will be cancelled.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        This task has no dependencies and can be safely deleted.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2 pt-2">
                    <p className="text-sm font-medium text-gray-700">
                      This action cannot be undone. Type <strong>"delete"</strong> to confirm:
                    </p>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="Type 'delete' to confirm"
                      className="border-red-300 focus:border-red-500 focus:ring-red-500"
                      disabled={isDeleting}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirmText.toLowerCase() !== 'delete' || isDeleting || loading || !!error}
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : dependencies && dependencies.totalDependencies > 0 ? (
              'Delete Task & Dependencies'
            ) : (
              'Delete Task'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}