/**
 * Download Screen - Select and download work items
 * Online only functionality
 */

import { useState, useEffect } from 'react';
import { fieldDB } from '@/lib/field-app/db';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { 
  Download as DownloadIcon, 
  Filter,
  ChevronDown,
  Check,
  X,
  AlertCircle,
  FileText,
  MapPin
} from 'lucide-react';

interface DownloadProps {
  session: any;
  onComplete: () => void;
}

export default function Download({ session, onComplete }: DownloadProps) {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [pendingTemplateIds, setPendingTemplateIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    assignmentFilter: 'me' as 'me' | 'team' | 'all',
    planning: true,
    ready: true,
    inProgress: true,
    stuck: false,
    completed: false,
    archived: false,
    dateRange: 'week' as 'today' | 'week' | 'month' | 'all'
  });
  const [pendingFilters, setPendingFilters] = useState(filters);
  const [showFilters, setShowFilters] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAvailableTemplates();
  }, []);

  useEffect(() => {
    fetchAvailableItems();
  }, [filters, selectedTemplateIds]);

  const fetchAvailableTemplates = async () => {
    try {
      const response = await fetch('/api/workflows/templates', {
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch templates');
      
      const data = await response.json();
      setAvailableTemplates(data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const fetchAvailableItems = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Build query params from filters
      const params = new URLSearchParams();
      // Send assignment filter
      params.append('assignedTo', filters.assignmentFilter);
      
      if (filters.planning) params.append('status', 'Planning');
      if (filters.ready) params.append('status', 'Ready');
      if (filters.inProgress) params.append('status', 'In Progress');
      if (filters.stuck) params.append('status', 'Stuck');
      if (filters.completed) params.append('status', 'Completed');
      if (filters.archived) params.append('status', 'Archived');
      params.append('dateRange', filters.dateRange);
      if (selectedTemplateIds.size > 0) {
        params.append('templateIds', Array.from(selectedTemplateIds).join(','));
      }

      const response = await fetch(`/api/field-app/available-items?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch available items');
      
      const data = await response.json();
      setAvailableItems(data.items || []);
    } catch (err: any) {
      setError('Failed to load available items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === availableItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableItems.map(item => item.id)));
    }
  };

  const handleSelectItem = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const calculateSize = () => {
    // Estimate: ~10KB per work item + ~5KB per template + photos
    const itemSize = selectedIds.size * 10;
    const templateSize = selectedIds.size * 5;
    const totalKB = itemSize + templateSize;
    
    if (totalKB > 1024) {
      return `${(totalKB / 1024).toFixed(1)} MB`;
    }
    return `${totalKB} KB`;
  };

  const handleDownload = async () => {
    if (selectedIds.size === 0) return;
    
    setDownloading(true);
    setError('');
    setProgress(0);

    try {
      // Download selected items with templates
      const response = await fetch('/api/field-app/download', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workItemIds: Array.from(selectedIds),
          includeTemplates: true,
          includeAttachments: true
        })
      });

      if (!response.ok) throw new Error('Download failed');
      
      const data = await response.json();
      
      // Save to IndexedDB
      setProgress(30);
      
      // Save work items
      if (data.workItems?.length > 0) {
        await fieldDB.saveWorkItems(data.workItems);
        setProgress(50);
      }
      
      // Save templates
      if (data.templates?.length > 0) {
        await fieldDB.saveTemplates(data.templates);
        setProgress(70);
      }
      
      // Save execution states if any
      if (data.executionStates?.length > 0) {
        for (const executionState of data.executionStates) {
          // Transform server format to field app format
          const { workItemId, execution, steps } = executionState;
          
          // Get the work item to find the template ID (MUST be before the loop)
          const workItem = data.workItems.find((item: any) => item.id === workItemId);
          if (!workItem || !workItem.workflowTemplateId) {
            console.warn(`No workflow template found for work item ${workItemId}`);
            continue;
          }
          
          // Build stepData from the steps array
          const stepData: Record<string, any> = {};
          const completedSteps: string[] = [];
          
          if (steps && Array.isArray(steps)) {
            for (const step of steps) {
              // Need to get the template to find the step ID from the step index
              const template = data.templates.find((t: any) => t.id === workItem.workflowTemplateId);
              const templateStep = template?.steps?.[step.stepIndex];
              const stepId = templateStep?.id || `step_${step.stepIndex}`;
              
              // Convert photos from evidence (base64/URLs) to blobs in IndexedDB
              const photoIds: string[] = [];
              if (step.evidence?.photos && Array.isArray(step.evidence.photos)) {
                for (const photo of step.evidence.photos) {
                  try {
                    // Photo might be a string (base64) or object with url/data property
                    let dataUrl: string;
                    let fileName: string = `photo_${Date.now()}.jpg`;
                    let uploadedAt: Date | undefined;
                    let uploadedBy: number | undefined;
                    
                    if (typeof photo === 'string') {
                      dataUrl = photo;
                    } else if (typeof photo === 'object') {
                      // Extract photo data
                      if (photo.data) {
                        dataUrl = photo.data;
                      } else if (photo.url && photo.url.startsWith('data:')) {
                        dataUrl = photo.url;
                      } else {
                        // Skip non-base64 photos (external URLs)
                        console.warn('Skipping non-base64 photo:', photo);
                        continue;
                      }
                      
                      // Extract metadata if available
                      if (photo.fileName) fileName = photo.fileName;
                      if (photo.uploadedAt) uploadedAt = new Date(photo.uploadedAt);
                      if (photo.uploadedBy) uploadedBy = photo.uploadedBy;
                    } else {
                      console.warn('Unknown photo format:', photo);
                      continue;
                    }
                    
                    // Convert base64 to blob
                    const response = await fetch(dataUrl);
                    const blob = await response.blob();
                    
                    // Save blob to IndexedDB with full metadata
                    // skipSyncQueue=true because these photos are already on the server
                    const photoId = await fieldDB.savePhoto(
                      workItemId,
                      blob,
                      fileName,
                      stepId,
                      uploadedAt,
                      uploadedBy,
                      true  // skipSyncQueue - don't re-upload photos we just downloaded
                    );
                    
                    photoIds.push(photoId);
                  } catch (err) {
                    console.error('Failed to convert photo to blob:', err);
                  }
                }
              }
              
              // Store step data including evidence, notes, status
              stepData[stepId] = {
                id: step.id,
                stepIndex: step.stepIndex,
                title: step.stepTitle,
                description: step.stepDescription,
                status: step.status,
                notes: step.notes,
                evidence: step.evidence || {},
                completedAt: step.completedAt,
                completedBy: step.completedBy,
                // Include checklist state and converted photo IDs
                checklist: step.evidence?.checklistState || {},
                photos: photoIds
              };
              
              // Track completed steps
              if (step.status === 'completed') {
                completedSteps.push(stepId);
              }
            }
          }
          
          // Save the transformed execution
          await fieldDB.saveWorkflowExecution({
            workItemId,
            templateId: workItem.workflowTemplateId,
            currentStepId: execution?.currentStepId,
            completedSteps,
            stepData,
            startedAt: execution?.startedAt ? new Date(execution.startedAt) : new Date(),
            completedAt: execution?.completedAt ? new Date(execution.completedAt) : undefined
          });
        }
        setProgress(90);
      }
      
      setProgress(100);
      
      // Success - navigate to work list
      setTimeout(() => {
        onComplete();
      }, 500);
      
    } catch (err: any) {
      setError(err.message || 'Failed to download work items');
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const handleApplyFilters = () => {
    // Apply pending changes to actual filters
    setFilters(pendingFilters);
    setSelectedTemplateIds(pendingTemplateIds);
    setShowFilters(false);
  };

  const handleOpenFilters = () => {
    // Reset pending state to current filters when opening
    setPendingFilters(filters);
    setPendingTemplateIds(selectedTemplateIds);
    setShowFilters(true);
  };

  const filterContent = (
    <div className="space-y-6 pb-20">
      {/* Assignment */}
      <div>
        <Label className="text-xs font-semibold text-zinc-300 mb-3 block uppercase tracking-wider">Assignment</Label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setPendingFilters({...pendingFilters, assignmentFilter: 'me'})}
            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              pendingFilters.assignmentFilter === 'me'
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            👤 My Work
          </button>
          <button
            type="button"
            onClick={() => setPendingFilters({...pendingFilters, assignmentFilter: 'team'})}
            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              pendingFilters.assignmentFilter === 'team'
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            👥 My Team
          </button>
          <button
            type="button"
            onClick={() => setPendingFilters({...pendingFilters, assignmentFilter: 'all'})}
            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              pendingFilters.assignmentFilter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            🌐 All Work
          </button>
        </div>
      </div>
      
      {/* Date Range */}
      <div>
        <Label className="text-xs font-semibold text-zinc-300 mb-3 block uppercase tracking-wider">Date Range</Label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setPendingFilters({...pendingFilters, dateRange: 'today'})}
            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              pendingFilters.dateRange === 'today'
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setPendingFilters({...pendingFilters, dateRange: 'week'})}
            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              pendingFilters.dateRange === 'week'
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            7 Days
          </button>
          <button
            type="button"
            onClick={() => setPendingFilters({...pendingFilters, dateRange: 'month'})}
            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              pendingFilters.dateRange === 'month'
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            30 Days
          </button>
        </div>
        <button
          type="button"
          onClick={() => setPendingFilters({...pendingFilters, dateRange: 'all'})}
          className={`mt-2 w-full py-3 px-4 rounded-lg text-sm font-medium transition-all ${
            pendingFilters.dateRange === 'all'
              ? 'bg-emerald-600 text-white'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
          }`}
        >
          All
        </button>
      </div>
      
      {/* Workflow Templates */}
      {availableTemplates.length > 0 && (
        <div>
          <Label className="text-xs font-semibold text-zinc-300 mb-3 block uppercase tracking-wider">Workflow Templates</Label>
          <div className="grid grid-cols-2 gap-2">
            {availableTemplates.map(template => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  const newSet = new Set(pendingTemplateIds);
                  if (newSet.has(template.id)) {
                    newSet.delete(template.id);
                  } else {
                    newSet.add(template.id);
                  }
                  setPendingTemplateIds(newSet);
                }}
                className={`py-3 px-3 rounded-lg text-sm font-medium transition-all text-left ${
                  pendingTemplateIds.has(template.id)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                📋 {template.name}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Status */}
      <div>
        <Label className="text-xs font-semibold text-zinc-300 mb-3 block uppercase tracking-wider">Status</Label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setPendingFilters({...pendingFilters, planning: !pendingFilters.planning})}
            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              pendingFilters.planning
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            Planning
          </button>
          <button
            type="button"
            onClick={() => setPendingFilters({...pendingFilters, ready: !pendingFilters.ready})}
            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              pendingFilters.ready
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            Ready
          </button>
          <button
            type="button"
            onClick={() => setPendingFilters({...pendingFilters, inProgress: !pendingFilters.inProgress})}
            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              pendingFilters.inProgress
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            In Progress
          </button>
          <button
            type="button"
            onClick={() => setPendingFilters({...pendingFilters, stuck: !pendingFilters.stuck})}
            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              pendingFilters.stuck
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            Stuck
          </button>
          <button
            type="button"
            onClick={() => setPendingFilters({...pendingFilters, completed: !pendingFilters.completed})}
            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              pendingFilters.completed
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            Completed
          </button>
          <button
            type="button"
            onClick={() => setPendingFilters({...pendingFilters, archived: !pendingFilters.archived})}
            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              pendingFilters.archived
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            Archived
          </button>
        </div>
      </div>
      
      {/* Apply Button */}
      <div className="pt-2">
        <Button
          onClick={handleApplyFilters}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold"
          data-testid="button-apply-filters"
        >
          ✓ Apply Filters
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-zinc-900">
      {/* Header */}
      <div className="bg-zinc-800 p-3 border-b border-zinc-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Download Work Items</h2>
          
          {/* Filter Sheet for Mobile */}
          <Sheet open={showFilters} onOpenChange={(open) => open ? handleOpenFilters() : setShowFilters(false)}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2 bg-zinc-700 border-zinc-600 text-white hover:bg-zinc-600"
                data-testid="button-open-filters"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="bottom" 
              className="h-[85vh] bg-zinc-900 border-t border-zinc-700 overflow-y-auto"
            >
              <SheetHeader className="mb-4">
                <SheetTitle>Filter Work Items</SheetTitle>
                <SheetDescription>
                  Customize which work items to download
                </SheetDescription>
              </SheetHeader>
              {filterContent}
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Active Filter Count - Compact Badge */}
        {(selectedTemplateIds.size > 0 || filters.assignmentFilter !== 'me' || 
          !filters.planning || !filters.ready || !filters.inProgress || 
          filters.stuck || filters.completed || filters.archived || 
          filters.dateRange !== 'week') && (
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
            {selectedTemplateIds.size > 0 && <span>{selectedTemplateIds.size} template(s)</span>}
            {selectedTemplateIds.size > 0 && <span>•</span>}
            <span>Filters active</span>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : error ? (
          <div className="p-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-300">{error}</p>
                <Button
                  onClick={fetchAvailableItems}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        ) : availableItems.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">
            <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p>No work items match your filters</p>
          </div>
        ) : (
          <>
            {/* Sticky Action Bar */}
            <div className="sticky top-0 z-10 bg-zinc-800 border-b border-zinc-700 px-3 py-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={selectedIds.size === availableItems.length && availableItems.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">Select All</span>
                </label>
                <span className="text-xs text-zinc-400">
                  {selectedIds.size > 0 ? (
                    <span className="text-emerald-400 font-medium">
                      {selectedIds.size} of {availableItems.length} selected
                    </span>
                  ) : (
                    <span>{availableItems.length} items</span>
                  )}
                </span>
              </div>
            </div>
            
            {/* Items */}
            {availableItems.map(item => (
              <label
                key={item.id}
                className="flex items-start gap-3 p-3 border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer active:bg-zinc-800"
              >
                <Checkbox 
                  checked={selectedIds.has(item.id)}
                  onCheckedChange={() => handleSelectItem(item.id)}
                  className="mt-1"
                />
                
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{item.title}</h3>
                  
                  {item.workflowTemplateName && (
                    <p className="text-sm text-emerald-400 mb-1">
                      📋 {item.workflowTemplateName}
                    </p>
                  )}
                  
                  {item.location && (
                    <p className="text-sm text-zinc-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {item.location}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </>
        )}
      </div>

      {/* Floating Action Button - Only show when items selected */}
      {!loading && selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-20">
          {downloading && (
            <div className="mb-2 bg-zinc-800 rounded-lg p-3 shadow-lg border border-zinc-700">
              <div className="bg-zinc-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400 mt-2 text-center">
                Downloading... {progress}%
              </p>
            </div>
          )}
          
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 h-14 text-base font-semibold shadow-lg"
          >
            {downloading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Downloading...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <DownloadIcon className="h-5 w-5" />
                <span>Download {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''}</span>
                <span className="text-xs opacity-75">({calculateSize()})</span>
              </div>
            )}
          </Button>
        </div>
      )}
      
      {/* Condensed Footer Info - Always visible */}
      {!loading && availableItems.length > 0 && (
        <div className="bg-zinc-800 border-t border-zinc-700 px-4 py-2">
          <p className="text-xs text-zinc-500 text-center">
            {selectedIds.size > 0 
              ? `${selectedIds.size} of ${availableItems.length} items selected • Est. ${calculateSize()}`
              : `${availableItems.length} items available`
            }
          </p>
        </div>
      )}
    </div>
  );
}