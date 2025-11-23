import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, XCircle, FileText, Camera, MapPin, Navigation, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { WorkItemWorkflowExecutionStep } from '@shared/schema';
import { PhotoCaptureDialog } from './PhotoCaptureDialog';
import { PhotoViewerDialog } from './PhotoViewerDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoSave } from '@/hooks/useAutoSave';
import { SplynxTicketViewer } from '@/components/workflow/SplynxTicketViewer';
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

// Type definitions for workflow evidence
interface WorkflowPhoto {
  data: string;
  timestamp: string;
  uploadedBy: number;
  uploaderName?: string;
  fileName: string;
  fileSize: number;
}

interface WorkflowEvidence {
  photos?: WorkflowPhoto[];
  [key: string]: any;
}

interface WorkflowExecutionPanelProps {
  workItemId: number;
  onClose?: () => void;
}

export function WorkflowExecutionPanel({ workItemId }: WorkflowExecutionPanelProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const isOnline = navigator.onLine;
  const [stepNotes, setStepNotes] = useState<Record<number, string>>({});
  const [photoCaptureStep, setPhotoCaptureStep] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<WorkflowPhoto | null>(null);
  const [selectedPhotoMeta, setSelectedPhotoMeta] = useState<{ stepId: number; photoIndex: number } | null>(null);
  const [stepSyncStatus, setStepSyncStatus] = useState<Record<number, 'synced' | 'pending' | 'syncing' | 'failed'>>({});
  const [showImagesForStep, setShowImagesForStep] = useState<Record<number, boolean>>({});
  const [photoToDelete, setPhotoToDelete] = useState<{ stepId: number; photoIndex: number } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [stepData, setStepData] = useState<Record<number, any>>({});

  // Fetch work item to check if it has a template
  const { data: workItem } = useQuery<any>({
    queryKey: [`/api/work-items/${workItemId}`],
  });

  // Use full URL path in queryKey[0] so default fetcher uses it directly
  const { data: steps = [], isLoading } = useQuery<WorkItemWorkflowExecutionStep[]>({
    queryKey: [`/api/work-items/${workItemId}/workflow/steps`],
  });

  // Initialize stepNotes from loaded steps (preserves offline-saved notes on reload)
  useEffect(() => {
    if (steps.length > 0) {
      const notesFromSteps = steps.reduce((acc, step) => {
        if (step.notes) {
          acc[step.id] = step.notes;
        }
        return acc;
      }, {} as Record<number, string>);
      
      // Only update if there are notes to preserve
      if (Object.keys(notesFromSteps).length > 0) {
        setStepNotes(prev => ({
          ...prev,
          ...notesFromSteps
        }));
        console.log('[WorkflowExecutionPanel] Initialized stepNotes from loaded steps:', notesFromSteps);
      }
    }
  }, [steps]);

  const initializeWorkflowMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/work-items/${workItemId}/workflow/initialize`, {
        method: 'POST',
      });
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Workflow initialized successfully",
      });
      // Refetch steps to show the newly created workflow
      await queryClient.refetchQueries({ queryKey: [`/api/work-items/${workItemId}/workflow/steps`] });
      // Also refetch the work item to update any status changes
      await queryClient.refetchQueries({ queryKey: [`/api/work-items/${workItemId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to initialize workflow",
        variant: "destructive",
      });
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ stepId, status, notes, evidence }: { stepId: number; status: string; notes?: string; evidence?: any }) => {
      console.log('Mutation calling API:', `/api/work-items/${workItemId}/workflow/steps/${stepId}`, { status, notes, evidence });
      
      const response = await apiRequest(`/api/work-items/${workItemId}/workflow/steps/${stepId}`, {
        method: 'PUT',
        body: { status, notes, evidence },
      });
      console.log('Mutation response:', response);
      return response;
    },
    onSuccess: async (data: any) => {
      // No need to refresh stats as offline functionality moved to field app
      
      // Invalidate and refetch queries to update UI when online
      if (isOnline) {
        await queryClient.invalidateQueries({ queryKey: [`/api/work-items/${workItemId}/workflow/steps`] });
        // Also invalidate the work item itself so it reflects the auto-updated status
        await queryClient.invalidateQueries({ queryKey: [`/api/work-items/${workItemId}`] });
      }
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({
        title: "Error",
        description: `Failed to update workflow step: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  const handleStepToggle = async (stepId: number, currentStatus: string) => {
    console.log('🔍 [handleStepToggle] Called with stepId:', stepId, 'type:', typeof stepId);
    console.log('🔍 [handleStepToggle] Steps array:', steps.map(s => ({ id: s.id, type: typeof s.id, stepIndex: s.stepIndex })));
    
    // Ensure we only use valid step status enum values
    const validStatuses = ['not_started', 'in_progress', 'completed', 'cancelled'];
    const safeCurrentStatus = validStatuses.includes(currentStatus) ? currentStatus : 'not_started';
    const newStatus = safeCurrentStatus === 'completed' ? 'not_started' : 'completed';
    const notes = stepNotes[stepId];
    console.log('Toggle step:', { stepId, currentStatus, safeCurrentStatus, newStatus });
    
    try {
      await updateStepMutation.mutateAsync({ stepId, status: newStatus, notes });
      
      // 🔥 FIX #4: Don't refetch when offline - React Query cache is already updated
      if (!isOnline) {
        console.log('✅ Offline: React Query cache already updated by mutation');
        
        // No need to refresh sync status as offline functionality moved to field app
        
        toast({
          title: newStatus === 'completed' ? '✓ Step Completed' : 'Step Reopened',
          description: 'Changes saved offline and will sync when you go online',
        });
      } else {
        // When online, refetch to ensure we have latest server state
        await queryClient.refetchQueries({ 
          queryKey: [`/api/work-items/${workItemId}/workflow/steps`],
          type: 'active'
        });
      }
    } catch (error) {
      console.error('Failed to toggle step:', error);
      // Error toast already shown by mutation
    }
  };

  const handleChecklistItemToggle = async (stepId: number, itemId: string, checked: boolean) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;
    
    // Get current evidence or initialize
    const currentEvidence = (step.evidence || {}) as any;
    const checklistState = currentEvidence.checklistState || {};
    
    // Update checklist state
    checklistState[itemId] = checked;
    
    // Update evidence with new checklist state
    const updatedEvidence = {
      ...currentEvidence,
      checklistState
    };
    
    // Save to server
    const validStatuses = ['not_started', 'in_progress', 'completed', 'cancelled'];
    const safeStatus = validStatuses.includes(step.status) ? step.status : 'not_started';
    
    try {
      await updateStepMutation.mutateAsync({ 
        stepId, 
        status: safeStatus, 
        notes: stepNotes[stepId], 
        evidence: updatedEvidence 
      });
      
      if (isOnline) {
        await queryClient.refetchQueries({ 
          queryKey: [`/api/work-items/${workItemId}/workflow/steps`],
          type: 'active'
        });
      }
    } catch (error) {
      console.error('Failed to update checklist item:', error);
    }
  };

  const handleNotesChange = (stepId: number, notes: string) => {
    setStepNotes(prev => ({ ...prev, [stepId]: notes }));
  };

  const handleSaveNotes = async (stepId: number, notes?: string) => {
    console.log('🔍 [handleSaveNotes] Called with stepId:', stepId, 'type:', typeof stepId);
    console.log('🔍 [handleSaveNotes] Steps array length:', steps.length);
    console.log('🔍 [handleSaveNotes] Steps array:', steps.map(s => ({ id: s.id, type: typeof s.id, stepIndex: s.stepIndex })));
    
    // Use provided notes or fall back to stepNotes state
    const notesToSave = notes !== undefined ? notes : stepNotes[stepId];
    console.log('🔍 [handleSaveNotes] Notes to save:', notesToSave);
    
    const step = steps.find(s => s.id === stepId);
    console.log('🔍 [handleSaveNotes] Step found:', step ? 'YES' : 'NO');
    
    if (!step) {
      console.error('❌ [handleSaveNotes] Step not found! stepId:', stepId, 'steps:', steps);
      toast({
        title: "Error",
        description: `Step not found (ID: ${stepId}). Steps available: ${steps.map(s => s.id).join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Ensure valid step status enum value
      const validStatuses = ['not_started', 'in_progress', 'completed', 'cancelled'];
      const safeStatus = validStatuses.includes(step.status) ? step.status : 'not_started';
      console.log('Save notes:', { stepId, status: step.status, safeStatus, notes });
      
      // Wait for mutation to complete
      console.log('Notes: About to mutate');
      await updateStepMutation.mutateAsync({ stepId, status: safeStatus, notes: notesToSave });
      console.log('Notes: Mutation complete');
      
      // ✅ OPTIMISTIC UPDATE: Update local state immediately for instant UI feedback
      if (!isOnline) {
        setStepNotes(prev => {
          // Guard against unnecessary updates
          if (prev[stepId] === notesToSave) return prev;
          return { ...prev, [stepId]: notesToSave || '' };
        });
        console.log('✅ Offline: Updated local stepNotes state for immediate UI feedback');
        
        // No need to refresh sync status as offline functionality moved to field app
      }
      
      // Invalidate and refetch to force component re-render (online only)
      // Offline cache updates are handled by the mutation itself (lines 138-152)
      if (isOnline) {
        console.log('Notes: Invalidating and refetching queries...');
        await queryClient.invalidateQueries({ queryKey: [`/api/work-items/${workItemId}/workflow/steps`] });
        console.log('Notes: Invalidation complete');
      }
      
      // Don't close the panel after saving - let user see the saved notes
      // User can manually close with Cancel button or by clicking outside
      
      toast({
        title: isOnline ? 'Notes Saved' : '✓ Saved Offline',
        description: isOnline 
          ? 'Step notes have been saved successfully' 
          : 'Notes saved to your device and will sync when you go online',
      });
    } catch (error) {
      console.error('Failed to save notes:', error);
      // Error toast is already shown by the mutation's onError
    }
  };

  const handlePhotoCapture = async (stepId: number, photoData: { data: string; fileName: string; fileSize: number }) => {
    const step = steps.find(s => s.id === stepId);
    if (!step || !currentUser) return;

    try {
      // Get existing evidence or create new
      const currentEvidence = step.evidence as WorkflowEvidence || {};
      const currentPhotos = currentEvidence.photos || [];

      // Add new photo with uploader information
      const newPhoto: WorkflowPhoto = {
        data: photoData.data,
        timestamp: new Date().toISOString(),
        uploadedBy: currentUser.id,
        uploaderName: currentUser.fullName || currentUser.email,
        fileName: photoData.fileName,
        fileSize: photoData.fileSize,
      };

      const updatedEvidence: WorkflowEvidence = {
        ...currentEvidence,
        photos: [...currentPhotos, newPhoto],
      };

      // No offline photo handling - moved to field app

      // Ensure valid step status
      const validStatuses = ['not_started', 'in_progress', 'completed', 'cancelled'];
      const safeStatus = validStatuses.includes(step.status) ? step.status : 'in_progress';

      // Update step with photo (handle null notes)
      console.log('Photo: About to mutate');
      await updateStepMutation.mutateAsync({
        stepId,
        status: safeStatus,
        notes: step.notes || undefined,
        evidence: updatedEvidence,
      });
      console.log('Photo: Mutation complete, about to refetch');

      // ✅ OPTIMISTIC UPDATE: Force query refetch to show new photo in UI immediately
      if (!isOnline) {
        // Even though cache was updated by mutation, we need to refetch to trigger re-render
        console.log('✅ Offline: Refetching steps query to show new photo');
        await queryClient.refetchQueries({ 
          queryKey: [`/api/work-items/${workItemId}/workflow/steps`],
          type: 'active'
        });
        
        // No need to refresh sync status as offline functionality moved to field app
      }

      // Invalidate and refetch to force component re-render
      if (isOnline) {
        console.log('Photo: Invalidating and refetching queries...');
        await queryClient.invalidateQueries({ queryKey: [`/api/work-items/${workItemId}/workflow/steps`] });
        console.log('Photo: Invalidation complete');
      }

      toast({
        title: isOnline ? 'Photo Added' : '✓ Photo Saved Offline',
        description: isOnline 
          ? 'Photo has been saved to this step' 
          : 'Photo saved to your device and will sync when you go online',
      });
    } catch (error) {
      console.error('Failed to add photo:', error);
      // Error toast is already shown by the mutation's onError
    }
  };

  const handlePhotoDelete = async (photo: WorkflowPhoto) => {
    if (!selectedPhotoMeta) return;

    try {
      await apiRequest('/api/field-app/delete-photo', {
        method: 'DELETE',
        body: {
          workItemId,
          stepId: selectedPhotoMeta.stepId,
          photoIndex: selectedPhotoMeta.photoIndex,
        },
      });

      toast({
        title: 'Photo Deleted',
        description: 'Photo has been removed successfully',
      });

      // Refetch steps to update UI
      await queryClient.invalidateQueries({ queryKey: [`/api/work-items/${workItemId}/workflow/steps`] });
      
      // Close the photo viewer
      setSelectedPhoto(null);
      setSelectedPhotoMeta(null);
    } catch (error: any) {
      console.error('Failed to delete photo:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete photo',
        variant: 'destructive',
      });
    }
  };

  const handleThumbnailPhotoDelete = async (stepId: number, photoIndex: number) => {
    try {
      await apiRequest('/api/field-app/delete-photo', {
        method: 'DELETE',
        body: {
          workItemId,
          stepId,
          photoIndex,
        },
      });

      toast({
        title: 'Photo Deleted',
        description: 'Photo has been removed successfully',
      });

      // Refetch steps to update UI
      await queryClient.invalidateQueries({ queryKey: [`/api/work-items/${workItemId}/workflow/steps`] });
    } catch (error: any) {
      console.error('Failed to delete photo:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete photo',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400 dark:text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: 'default',
      in_progress: 'secondary',
      not_started: 'outline',
      cancelled: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'outline'} className="text-xs">
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getSyncStatusBadge = (stepId: number) => {
    if (isOnline || !stepSyncStatus[stepId]) return null;
    
    const status = stepSyncStatus[stepId];
    
    if (status === 'synced') return null; // Don't show badge for synced items
    
    const config = {
      pending: { icon: '⏳', label: 'Pending Sync', variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      syncing: { icon: '🔄', label: 'Syncing', variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      failed: { icon: '⚠️', label: 'Sync Failed', variant: 'destructive' as const, className: '' },
    };
    
    const { icon, label, variant, className} = config[status];
    
    return (
      <Badge variant={variant} className={`text-xs ${className}`}>
        <span className="mr-1">{icon}</span>
        {label}
      </Badge>
    );
  };

  // Render step-type-specific content matching field app behavior
  const renderStepTypeSpecificContent = (step: WorkItemWorkflowExecutionStep) => {
    const currentData = stepData[step.id] || {};
    const evidence = (step.evidence || {}) as any;
    const stepType = evidence.stepType;

    switch (stepType) {
      case 'checkbox':
        return (
          <div className="mt-3">
            <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
              <Checkbox
                checked={evidence.checked || false}
                onCheckedChange={async (checked) => {
                  await updateStepMutation.mutateAsync({
                    stepId: step.id,
                    status: step.status,
                    evidence: { ...evidence, checked: !!checked }
                  });
                  if (isOnline) {
                    await queryClient.refetchQueries({ 
                      queryKey: [`/api/work-items/${workItemId}/workflow/steps`]
                    });
                  }
                }}
                disabled={isOnline && updateStepMutation.isPending}
                data-testid={`step-${step.stepIndex}-checkbox-input`}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {evidence.config?.checkboxLabel || step.stepDescription || 'I confirm'}
              </span>
            </label>
          </div>
        );

      case 'text_input':
      case 'notes':
        return (
          <div className="mt-3">
            <Textarea
              value={stepNotes[step.id] || ''}
              onChange={(e) => {
                setStepNotes(prev => ({ ...prev, [step.id]: e.target.value }));
              }}
              onBlur={async () => {
                if (stepNotes[step.id] !== undefined) {
                  await handleSaveNotes(step.id, stepNotes[step.id]);
                }
              }}
              placeholder={evidence.config?.placeholder || 'Enter text...'}
              className="min-h-[100px]"
              data-testid={`step-${step.stepIndex}-text-input`}
            />
          </div>
        );

      case 'photo':
      case 'file_upload':
        return (
          <div className="mt-3 space-y-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPhotoCaptureStep(step.id)}
              data-testid={`step-${step.stepIndex}-add-photo`}
            >
              <Camera className="h-4 w-4 mr-1" />
              {step.evidence?.photos?.length ? `Add Photo (${step.evidence.photos.length})` : 'Add Photo'}
            </Button>
            {step.evidence?.photos && step.evidence.photos.length > 0 && (
              <div className="mt-2">
                {!showImagesForStep[step.id] ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImagesForStep(prev => ({ ...prev, [step.id]: true }))}
                    className="text-xs"
                    data-testid={`step-${step.stepIndex}-show-images`}
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Show {(step.evidence as WorkflowEvidence).photos!.length} Photo{(step.evidence as WorkflowEvidence).photos!.length > 1 ? 's' : ''}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowImagesForStep(prev => ({ ...prev, [step.id]: false }))}
                      className="text-xs"
                    >
                      Hide Images
                    </Button>
                    <div className="flex flex-wrap gap-3">
                      {(step.evidence as WorkflowEvidence).photos!.map((photo: WorkflowPhoto, index: number) => {
                        // Get OCR extracted data for this photo if available
                        const photoEvidence = step.evidence as any;
                        const ocrExtractedData = photoEvidence?.ocrExtractedData?.[index] as Record<string, { field?: string; value?: string; confidence?: number; targetTable?: string }> | undefined;

                        return (
                          <div
                            key={index}
                            className="space-y-2"
                            data-testid={`step-${step.stepIndex}-photo-${index}`}
                          >
                            <div className="relative group">
                              <div
                                className="cursor-pointer"
                                onClick={() => {
                                  setSelectedPhoto(photo);
                                  setSelectedPhotoMeta({ stepId: step.id, photoIndex: index });
                                }}
                              >
                                <img
                                  src={photo.data}
                                  alt={`Step photo ${index + 1}`}
                                  className="w-32 h-32 object-cover rounded border-2 border-gray-200 dark:border-gray-700 group-hover:border-blue-500 transition-colors"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded flex items-center justify-center">
                                  <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                              <Button
                                size="icon"
                                variant="destructive"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPhotoToDelete({ stepId: step.id, photoIndex: index });
                                  setShowDeleteConfirm(true);
                                }}
                                data-testid={`step-${step.stepIndex}-photo-${index}-delete`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* OCR Extracted Data */}
                            {ocrExtractedData && Object.keys(ocrExtractedData).length > 0 && (
                              <div className="w-32 text-xs space-y-1 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded">
                                {Object.entries(ocrExtractedData)
                                  .filter(([_, data]) => data && (data.value !== null && data.value !== undefined))
                                  .map(([fieldName, data]: [string, any]) => {
                                    // Backend returns confidence as percentage (0-100), display as-is
                                    const confidence = data?.confidence;
                                    return (
                                      <div key={fieldName} className="space-y-0.5">
                                        <div className="text-xs font-medium text-blue-900 dark:text-blue-100">
                                          {data?.field || fieldName}
                                        </div>
                                        <div className="text-xs text-blue-800 dark:text-blue-200 break-words">
                                          {String(data.value)}
                                        </div>
                                        {typeof confidence === 'number' && (
                                          <Badge variant="secondary" className="text-xs px-1 py-0">
                                            {confidence}%
                                          </Badge>
                                        )}
                                      </div>
                                    );
                                  })
                                }
                                {Object.entries(ocrExtractedData).filter(([_, data]) => data && (data.value !== null && data.value !== undefined)).length === 0 && (
                                  <div className="text-xs text-muted-foreground italic">
                                    No data extracted
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (!steps.length) {
    // Check if work item has a template but no execution
    const hasTemplate = workItem?.workflowTemplateId;
    
    // Don't show initialize button if we're offline - workflows should be downloaded first
    const showInitializeButton = hasTemplate && isOnline;
    
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        {showInitializeButton ? (
          <>
            <p className="font-medium">Workflow not initialized</p>
            <p className="text-sm mt-1 mb-4">This work item has a workflow template attached but hasn't been initialized yet.</p>
            <Button 
              onClick={() => initializeWorkflowMutation.mutate()}
              disabled={initializeWorkflowMutation.isPending}
              data-testid="initialize-workflow-button"
            >
              {initializeWorkflowMutation.isPending ? 'Initializing...' : 'Initialize Workflow'}
            </Button>
          </>
        ) : hasTemplate && !isOnline ? (
          <>
            <p className="font-medium">Workflow not available offline</p>
            <p className="text-sm mt-1">Download this work item for offline use to access the workflow.</p>
          </>
        ) : (
          <>
            <p>No workflow steps available</p>
            <p className="text-sm mt-1">Attach a workflow template to enable workflow execution</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="workflow-execution-panel">
      {/* Progress Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Workflow Progress
          </h3>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {completedSteps} / {totalSteps} steps
          </span>
        </div>
        <div className="space-y-2">
          <Progress value={progressPercent} className="h-2" data-testid="workflow-progress-bar" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {progressPercent.toFixed(0)}% complete
          </p>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              "border rounded-lg p-4 transition-all",
              step.status === 'completed'
                ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                : step.status === 'in_progress'
                ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            )}
            data-testid={`workflow-step-${step.stepIndex}`}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={step.status === 'completed'}
                onCheckedChange={() => handleStepToggle(step.id, step.status)}
                disabled={isOnline && updateStepMutation.isPending}
                className="mt-1"
                data-testid={`step-${step.stepIndex}-checkbox`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(step.status)}
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {step.stepTitle}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(step.status)}
                    {getSyncStatusBadge(step.id)}
                  </div>
                </div>

                {step.stepDescription && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {step.stepDescription}
                  </p>
                )}

                {/* Checklist Items if present */}
                {(step.evidence as any)?.checklistItems && Array.isArray((step.evidence as any).checklistItems) && (
                  <div className="mt-3 space-y-1 pl-7">
                    {(step.evidence as any).checklistItems.map((item: any) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <Checkbox
                          checked={(step.evidence as any)?.checklistState?.[item.id] || false}
                          onCheckedChange={(checked) => 
                            handleChecklistItemToggle(step.id, item.id, !!checked)
                          }
                          disabled={isOnline && updateStepMutation.isPending}
                          className="h-4 w-4"
                        />
                        <span className={`text-sm ${
                          (step.evidence as any)?.checklistState?.[item.id] 
                            ? 'line-through text-gray-500 dark:text-gray-500' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {item.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Geolocation Capture for geolocation step types */}
                {(step.evidence as any)?.stepType === 'geolocation' && (
                  <div className="mt-3 border-2 border-dashed rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                    {!(step.evidence as any)?.geolocation ? (
                      <div className="text-center space-y-3">
                        <MapPin className="h-10 w-10 mx-auto text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Capture GPS Coordinates</p>
                          <p className="text-xs text-gray-500 mt-1">Click below to record your current location</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            if (!navigator.geolocation) {
                              toast({
                                title: "Error",
                                description: "Geolocation is not supported by your browser",
                                variant: "destructive",
                              });
                              return;
                            }
                            
                            // Show loading toast
                            const loadingToast = toast({
                              title: "Capturing Location...",
                              description: "Please wait while we get your GPS coordinates",
                            });
                            
                            navigator.geolocation.getCurrentPosition(
                              async (position) => {
                                const geolocation = {
                                  latitude: position.coords.latitude,
                                  longitude: position.coords.longitude,
                                  timestamp: new Date().toISOString()
                                };
                                
                                await updateStepMutation.mutateAsync({
                                  stepId: step.id,
                                  status: step.status,
                                  notes: stepNotes[step.id],
                                  evidence: {
                                    ...step.evidence,
                                    geolocation
                                  }
                                });
                                
                                toast({
                                  title: "✓ Location Captured",
                                  description: `Coordinates: ${geolocation.latitude.toFixed(6)}, ${geolocation.longitude.toFixed(6)}`,
                                });
                              },
                              (error) => {
                                toast({
                                  title: "Error",
                                  description: `Failed to capture location: ${error.message}`,
                                  variant: "destructive",
                                });
                              },
                              {
                                enableHighAccuracy: true,
                                timeout: 10000,
                                maximumAge: 0
                              }
                            );
                          }}
                          data-testid={`step-${step.stepIndex}-capture-location`}
                        >
                          <Navigation className="h-4 w-4 mr-2" />
                          Capture My Location
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-sm font-medium">Location Captured</span>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-left space-y-1">
                          <div className="text-xs text-gray-500">Latitude</div>
                          <div className="font-mono text-sm text-gray-900 dark:text-gray-100">
                            {(step.evidence as any).geolocation.latitude.toFixed(6)}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">Longitude</div>
                          <div className="font-mono text-sm text-gray-900 dark:text-gray-100">
                            {(step.evidence as any).geolocation.longitude.toFixed(6)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (!navigator.geolocation) return;
                            
                            navigator.geolocation.getCurrentPosition(
                              async (position) => {
                                const geolocation = {
                                  latitude: position.coords.latitude,
                                  longitude: position.coords.longitude,
                                  timestamp: new Date().toISOString()
                                };
                                
                                await updateStepMutation.mutateAsync({
                                  stepId: step.id,
                                  status: step.status,
                                  notes: stepNotes[step.id],
                                  evidence: {
                                    ...step.evidence,
                                    geolocation
                                  }
                                });
                              },
                              (error) => {
                                toast({
                                  title: "Error",
                                  description: `Failed to capture location: ${error.message}`,
                                  variant: "destructive",
                                });
                              }
                            );
                          }}
                          data-testid={`step-${step.stepIndex}-recapture-location`}
                        >
                          Recapture Location
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Knowledge Base Document View for kb_document step types */}
                {(step.evidence as any)?.stepType === 'kb_document' && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="default"
                      asChild
                    >
                      <a
                        href={`/kb/documents/${workItem?.workflowMetadata?.documentId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          // Mark step as viewed when link is clicked
                          if (!(step.evidence as any)?.documentViewed) {
                            updateStepMutation.mutateAsync({
                              stepId: step.id,
                              status: step.status,
                              notes: stepNotes[step.id],
                              evidence: {
                                ...step.evidence,
                                documentViewed: true,
                                viewedAt: new Date().toISOString()
                              }
                            });
                          }
                        }}
                        data-testid={`step-${step.stepIndex}-view-document`}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {(step.evidence as any)?.documentViewed ? 'View Document Again' : 'View Training Document'}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                    {(step.evidence as any)?.documentViewed && (
                      <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                        ✓ Document opened on {new Date((step.evidence as any).viewedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Splynx Ticket Viewer for splynx_ticket step types */}
                {(step.evidence as any)?.stepType === 'splynx_ticket' && workItem?.workflowMetadata?.splynx_ticket_id && (
                  <div className="mt-3">
                    <SplynxTicketViewer
                      workItemId={workItemId}
                      ticketId={workItem.workflowMetadata.splynx_ticket_id}
                      organizationId={workItem.organizationId}
                      mode={(step.evidence as any)?.config?.mode || 'overview'}
                      onMessageSent={() => {}}
                      onStatusChanged={() => {}}
                      onModeCompleted={() => {
                        if (step.status !== 'completed') {
                          updateStepMutation.mutateAsync({
                            stepId: step.id,
                            status: 'completed',
                            notes: stepNotes[step.id],
                            evidence: {
                              ...step.evidence,
                              completedAt: new Date().toISOString()
                            }
                          });
                        }
                      }}
                    />
                  </div>
                )}

                {step.completedAt && step.completedBy && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                    Completed {new Date(step.completedAt).toLocaleString()}
                  </p>
                )}

                {/* Step-type-specific content (checkbox, text_input, photo, etc.) */}
                {renderStepTypeSpecificContent(step)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Photo Capture Dialog */}
      {photoCaptureStep !== null && (
        <PhotoCaptureDialog
          open={photoCaptureStep !== null}
          onClose={() => setPhotoCaptureStep(null)}
          onCapture={async (photoData) => {
            await handlePhotoCapture(photoCaptureStep, photoData);
            setPhotoCaptureStep(null);
          }}
        />
      )}

      {/* Photo Viewer Dialog */}
      <PhotoViewerDialog
        open={selectedPhoto !== null}
        onClose={() => {
          setSelectedPhoto(null);
          setSelectedPhotoMeta(null);
        }}
        photo={selectedPhoto}
        uploaderName={selectedPhoto?.uploaderName}
        onDelete={handlePhotoDelete}
        canDelete={true}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-photo-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="delete-photo-confirm"
              onClick={async () => {
                if (photoToDelete) {
                  await handleThumbnailPhotoDelete(photoToDelete.stepId, photoToDelete.photoIndex);
                  setPhotoToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Auto-save notes component with debounced save
interface AutoSaveNotesProps {
  stepId: number;
  stepIndex: number;
  initialValue: string;
  onSave: (notes: string) => Promise<void>;
  stepNotes: Record<number, string>;
  setStepNotes: React.Dispatch<React.SetStateAction<Record<number, string>>>;
}

function AutoSaveNotes({ stepId, stepIndex, initialValue, onSave, stepNotes, setStepNotes }: AutoSaveNotesProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Get current value from state or use initial value
  const currentValue = stepNotes[stepId] !== undefined ? stepNotes[stepId] : initialValue;
  
  // Auto-save hook with 500ms debounce
  const { triggerSave, saveNow } = useAutoSave({
    delay: 500,
    onSave: async () => {
      setIsSaving(true);
      
      // 🔥 FIX: Ensure saving indicator shows for at least 300ms to prevent flashing
      const minDisplayTime = new Promise(resolve => setTimeout(resolve, 300));
      
      try {
        await Promise.all([onSave(currentValue), minDisplayTime]);
        setLastSaved(new Date());
      } finally {
        setIsSaving(false);
      }
    },
    enabled: currentValue !== initialValue, // Only save if changed
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setStepNotes(prev => ({ ...prev, [stepId]: newValue }));
    triggerSave(); // Trigger debounced save
  };
  
  return (
    <div className="space-y-1">
      <Textarea
        placeholder="Add notes or observations..."
        value={currentValue}
        onChange={handleChange}
        onBlur={saveNow} // Save immediately on blur
        className="min-h-[80px]"
        data-testid={`step-${stepIndex}-notes-input`}
      />
      {(isSaving || lastSaved) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isSaving ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
              <span>Saving...</span>
            </>
          ) : (
            lastSaved && (
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            )
          )}
        </div>
      )}
    </div>
  );
}
