/**
 * Work Detail - View and edit work item with workflow steps
 * 100% offline functionality
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { fieldDB } from '@/lib/field-app/db';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronLeft, 
  Save, 
  CheckCircle,
  Circle,
  Camera,
  FileText,
  Clock,
  MapPin,
  AlertCircle,
  Navigation
} from 'lucide-react';
import WorkflowStep from './components/WorkflowStep';

interface WorkDetailProps {
  workItemId: number;
}

export default function WorkDetail({ workItemId }: WorkDetailProps) {
  const [, setLocation] = useLocation();
  const [workItem, setWorkItem] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [execution, setExecution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [workItemPhotos, setWorkItemPhotos] = useState<any[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    loadWorkItem();
  }, [workItemId]);

  // Cleanup photo object URLs when component unmounts
  useEffect(() => {
    return () => {
      Object.values(photoUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [photoUrls]);

  const loadWorkItem = async () => {
    try {
      const item = await fieldDB.getWorkItem(workItemId);
      if (!item) {
        setLocation('/field-app');
        return;
      }
      
      setWorkItem(item);
      setNotes(item.notes || '');
      
      // Load workflow template if assigned
      if (item.workflowTemplateId) {
        const tmpl = await fieldDB.getTemplate(item.workflowTemplateId);
        setTemplate(tmpl);
        
        // Load execution state
        const exec = await fieldDB.getWorkflowExecution(workItemId, item.workflowTemplateId);
        setExecution(exec);
        
        // Find current step index
        if (exec?.currentStepId && tmpl?.steps) {
          const idx = tmpl.steps.findIndex((s: any) => s.id === exec.currentStepId);
          if (idx >= 0) setCurrentStepIndex(idx);
        }
      }

      // Load all photos for this work item
      await loadWorkItemPhotos();
    } catch (error) {
      console.error('Failed to load work item:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkItemPhotos = async () => {
    try {
      // Revoke existing object URLs to prevent memory leaks
      Object.values(photoUrls).forEach(url => URL.revokeObjectURL(url));
      
      // Always reset state first (clears stale photos from previous work items)
      setWorkItemPhotos([]);
      setPhotoUrls({});
      
      const photos = await fieldDB.getPhotos(workItemId);
      if (photos && photos.length > 0) {
        setWorkItemPhotos(photos);
        
        // Create object URLs for display
        const urls: Record<string, string> = {};
        for (const photo of photos) {
          let blob: Blob;
          if (photo.arrayBuffer) {
            blob = new Blob([photo.arrayBuffer], { type: photo.mimeType });
          } else if (photo.blob) {
            blob = photo.blob;
          } else {
            console.warn('Photo has neither arrayBuffer nor blob:', photo.id);
            continue;
          }
          urls[photo.id] = URL.createObjectURL(blob);
        }
        setPhotoUrls(urls);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
      // Ensure state is cleared even on error
      setWorkItemPhotos([]);
      setPhotoUrls({});
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await fieldDB.updateWorkItem(workItemId, { notes });
      setWorkItem({ ...workItem, notes });
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await fieldDB.updateWorkItem(workItemId, { status: newStatus });
      setWorkItem({ ...workItem, status: newStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleNavigate = () => {
    // Check if work item has location data from fiber network
    const metadata = workItem?.workflowMetadata;
    const location = metadata?.chamberLocation;
    if (!location?.latitude || !location?.longitude) {
      return;
    }

    const { latitude, longitude } = location;
    // Use Google Maps universal link - works on both iOS and Android
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(mapsUrl, '_blank');
  };

  const handleStepComplete = async (stepId: string, data: any) => {
    try {
      if (!template) return;
      
      // Save step data (includes completed or skipped status)
      await fieldDB.updateWorkflowStep(workItemId, template.id, stepId, data);
      
      // Don't auto-advance to next step - let user choose which step to work on next
      // This prevents the full-screen expansion on mobile and allows non-sequential work
      // Users can manually click any step header to expand it
      
      // Reload execution state
      const exec = await fieldDB.getWorkflowExecution(workItemId, template.id);
      setExecution(exec);
      
      // Check if all required steps are complete or optional steps are skipped
      const allRequiredComplete = template.steps.every((step: any) => {
        const stepData = exec?.stepData?.[step.id];
        // Required steps must be completed
        if (step.required) {
          return exec?.completedSteps?.includes(step.id);
        }
        // Optional steps can be completed OR skipped OR not done yet
        return true;
      });
      
      if (allRequiredComplete) {
        await fieldDB.updateWorkItem(workItemId, { status: 'Completed' });
        setWorkItem({ ...workItem, status: 'Completed' });
      }
    } catch (error) {
      console.error('Failed to complete step:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!workItem) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
        <p className="text-zinc-400">Work item not found</p>
        <Button 
          variant="outline" 
          onClick={() => setLocation('/field-app')}
          className="mt-4"
        >
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-zinc-800 p-4 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocation('/field-app')}
            className="p-2 hover:bg-zinc-700 rounded-lg transition-colors flex-shrink-0"
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-semibold flex-1 line-clamp-2">{workItem.title}</h2>
          {workItem.workflowMetadata?.chamberLocation?.latitude && workItem.workflowMetadata?.chamberLocation?.longitude && (
            <button
              onClick={handleNavigate}
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0"
              data-testid="button-navigate"
              title="Navigate to location"
            >
              <Navigation className="h-4 w-4" />
            </button>
          )}
          {workItem.status === 'Completed' && (
            <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Workflow Steps */}
        {template && (
          <div className="p-4">
            <h3 className="font-medium mb-4">Workflow Steps</h3>
            
            {/* Step Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Progress</span>
                <span>
                  {execution?.completedSteps?.length || 0} / {template.steps.length}
                </span>
              </div>
              <div className="bg-zinc-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ 
                    width: `${((execution?.completedSteps?.length || 0) / template.steps.length) * 100}%` 
                  }}
                />
              </div>
            </div>
            
            {/* Steps List */}
            <div className="space-y-3">
              {template.steps.map((step: any, index: number) => {
                const isCompleted = execution?.completedSteps?.includes(step.id);
                const isCurrent = index === currentStepIndex;
                const stepData = execution?.stepData?.[step.id];
                
                return (
                  <div
                    key={step.id}
                    className={`border rounded-lg transition-colors ${
                      isCurrent 
                        ? 'border-emerald-500 bg-emerald-500/5' 
                        : isCompleted
                        ? 'border-zinc-700 bg-zinc-800/50'
                        : 'border-zinc-800'
                    }`}
                  >
                    {/* Step Header */}
                    <button
                      onClick={() => setCurrentStepIndex(index)}
                      className="w-full p-3 flex items-center gap-3 text-left hover:bg-zinc-800/50 transition-colors"
                    >
                      <div>
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-emerald-400" />
                        ) : stepData?.skipped ? (
                          <Circle className="h-5 w-5 text-zinc-600" />
                        ) : (
                          <Circle className={`h-5 w-5 ${
                            isCurrent ? 'text-emerald-400' : 'text-zinc-500'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium ${
                            stepData?.skipped ? 'text-zinc-500 line-through' : ''
                          }`}>
                            {step.title || step.label}
                          </h4>
                          {stepData?.skipped && (
                            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                              Skipped
                            </span>
                          )}
                          {!step.required && !isCompleted && !stepData?.skipped && (
                            <span className="text-xs text-zinc-600">
                              (Optional)
                            </span>
                          )}
                        </div>
                        {step.description && (
                          <p className="text-xs text-zinc-400 mt-1">{step.description}</p>
                        )}
                      </div>
                    </button>
                    
                    {/* Step Content - Show when selected */}
                    {index === currentStepIndex && (
                      <div className="px-3 pb-3">
                        <WorkflowStep
                          step={step}
                          workItemId={workItemId}
                          data={stepData}
                          onComplete={(data) => handleStepComplete(step.id, data)}
                          disabled={false}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Photos Gallery - Only shown when photos exist */}
        {workItemPhotos.length > 0 && (
          <div className="p-4 border-t border-zinc-800">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Photos ({workItemPhotos.length})
            </h3>
            
            <div className="grid grid-cols-3 gap-2">
              {workItemPhotos.map((photo, idx) => (
                <div 
                  key={photo.id} 
                  className="relative aspect-square bg-zinc-800 rounded-lg overflow-hidden group"
                  data-testid={`photo-${idx}`}
                >
                  {photoUrls[photo.id] ? (
                    <img 
                      src={photoUrls[photo.id]} 
                      alt={photo.stepId || `Photo ${idx + 1}`}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(photoUrls[photo.id], '_blank')}
                      data-testid={`photo-image-${idx}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="text-xs text-white truncate">
                      {photo.stepId ? 
                        photo.stepId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                        `Photo ${idx + 1}`
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Status Selector */}
        <div className="p-4 border-t border-zinc-800">
          <h3 className="font-medium mb-3">Status</h3>
          <div className="grid grid-cols-2 gap-2">
            {['Planning', 'Ready', 'In Progress', 'Stuck', 'Completed', 'Archived'].map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                  workItem.status === status
                    ? status === 'Completed'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                      : status === 'In Progress'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                      : status === 'Stuck'
                      ? 'bg-red-600/20 border-red-500 text-red-400'
                      : status === 'Ready'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                      : status === 'Archived'
                      ? 'bg-zinc-700 border-zinc-600 text-zinc-400'
                      : 'bg-zinc-700 border-zinc-600 text-zinc-300'
                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
                data-testid={`status-${status.toLowerCase().replace(' ', '-')}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        
        {/* Description */}
        {workItem.description && (
          <div className="p-4 border-t border-zinc-800">
            <h3 className="font-medium mb-2">Description</h3>
            <p className="text-sm text-zinc-400">{workItem.description}</p>
          </div>
        )}
        
        {/* Notes */}
        <div className="p-4 border-t border-zinc-800">
          <h3 className="font-medium mb-3">Notes</h3>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
            className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
          />
        </div>
        
        {/* Final Save Button */}
        <div className="p-4">
          <Button
            onClick={async () => {
              await handleSaveNotes();
              setLocation('/field-app');
            }}
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-medium"
            data-testid="button-save-and-return"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save & Return to List
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}