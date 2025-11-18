/**
 * Workflow Step Renderer
 * Handles all step types: checklist, photo, form, notes, etc.
 */

import { useState, useEffect } from 'react';
import { fieldDB } from '@/lib/field-app/db';
import { compressImageSafe } from '@/lib/field-app/imageUtils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Camera, Check, X, Image as ImageIcon, MapPin, Navigation, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface WorkflowStepProps {
  step: any;
  workItemId: number;
  data?: any;
  onComplete: (data: any) => void;
  disabled?: boolean;
}

export default function WorkflowStep({ 
  step, 
  workItemId, 
  data, 
  onComplete, 
  disabled = false 
}: WorkflowStepProps) {
  const [stepData, setStepData] = useState(data || {});
  const [photos, setPhotos] = useState<string[]>(data?.photos || []);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [capturing, setCapturing] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [fiberNodes, setFiberNodes] = useState<any[]>(data?.fiberNodes || []);
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [newNode, setNewNode] = useState({
    name: '',
    nodeType: 'chamber',
    network: 'FibreLtd',
    status: 'planned',
    what3words: '',
    address: '',
    notes: '',
  });

  // Load photo blobs and create object URLs
  useEffect(() => {
    const loadPhotos = async () => {
      const urls: Record<string, string> = {};
      
      for (const photoId of photos) {
        const photo = await fieldDB.getPhoto(photoId);
        if (photo) {
          // Handle both new ArrayBuffer format and legacy Blob format
          let blob: Blob;
          if (photo.arrayBuffer) {
            blob = new Blob([photo.arrayBuffer], { type: photo.mimeType });
          } else if (photo.blob) {
            blob = photo.blob;
          } else {
            console.error('Photo has neither arrayBuffer nor blob:', photo.id);
            continue;
          }
          urls[photoId] = URL.createObjectURL(blob);
        }
      }
      
      setPhotoUrls(urls);
    };

    if (photos.length > 0) {
      loadPhotos();
    }

    // Cleanup: revoke object URLs when component unmounts
    return () => {
      Object.values(photoUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [photos]);

  const handleChecklistChange = (itemId: string, checked: boolean) => {
    const newData = {
      ...stepData,
      checklist: {
        ...stepData.checklist,
        [itemId]: checked
      }
    };
    setStepData(newData);
  };

  const handleFormChange = (fieldId: string, value: any) => {
    const newData = {
      ...stepData,
      form: {
        ...stepData.form,
        [fieldId]: value
      }
    };
    setStepData(newData);
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[WorkflowStep] Photo capture started:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      workItemId,
      stepId: step.id
    });

    setCapturing(true);
    try {
      // Compress photo before saving (with fallback to original for unsupported formats)
      const compressedBlob = await compressImageSafe(file);
      
      console.log('[WorkflowStep] Photo processed:', {
        originalSize: Math.round(file.size / 1024) + 'KB',
        finalSize: Math.round(compressedBlob.size / 1024) + 'KB',
        reduction: Math.round((1 - compressedBlob.size / file.size) * 100) + '%',
        compressed: compressedBlob.size < file.size
      });
      
      // Save compressed (or original if compression failed) photo as blob
      const photoId = await fieldDB.savePhoto(workItemId, compressedBlob, file.name, step.id);
      console.log('[WorkflowStep] Photo saved successfully:', photoId);
      
      const newPhotos = [...photos, photoId];
      setPhotos(newPhotos);
      
      const newData = {
        ...stepData,
        photos: newPhotos
      };
      setStepData(newData);
      
      // CRITICAL: Reset input value to allow capturing same file again
      e.target.value = '';
      
      console.log('[WorkflowStep] Photo capture complete. Total photos:', newPhotos.length);
    } catch (error) {
      console.error('[WorkflowStep] Failed to save photo:', error);
      console.error('[WorkflowStep] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      alert(`Failed to save photo: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setCapturing(false);
    }
  };

  const handleComplete = () => {
    const completeData = {
      ...stepData,
      completed: true,
      completedAt: new Date().toISOString()
    };
    onComplete(completeData);
  };

  const handleLocationCapture = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your device');
      return;
    }

    setCapturingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const geolocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString()
        };
        
        const newData = {
          ...stepData,
          geolocation
        };
        setStepData(newData);
        setCapturingLocation(false);
      },
      (error) => {
        setLocationError(`Failed to capture location: ${error.message}`);
        setCapturingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleAddFiberNode = async () => {
    if (!newNode.name) {
      alert('Please provide a name for the node');
      return;
    }

    // Get current location
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your device');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nodeId = uuidv4();
        const nodeData = {
          id: nodeId,
          workItemId,
          ...newNode,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          createdAt: new Date(),
          syncedToServer: false,
        };

        // Save to IndexedDB
        await fieldDB.saveFiberNetworkNode(nodeData);
        
        // Add to sync queue
        await fieldDB.addToSyncQueue('fiberNetworkNode', 'create', nodeId, nodeData);

        // Update local state
        const updatedNodes = [...fiberNodes, nodeData];
        setFiberNodes(updatedNodes);
        
        // Reset form
        setNewNode({
          name: '',
          nodeType: 'chamber',
          network: 'FibreLtd',
          status: 'planned',
          what3words: '',
          address: '',
          notes: '',
        });
        setShowNodeForm(false);
        
        // Update step data
        setStepData({ ...stepData, fiberNodes: updatedNodes });
      },
      (error) => {
        alert(`Failed to capture location: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleDeleteFiberNode = async (nodeId: string) => {
    await fieldDB.deleteFiberNetworkNode(nodeId);
    const updatedNodes = fiberNodes.filter(n => n.id !== nodeId);
    setFiberNodes(updatedNodes);
    setStepData({ ...stepData, fiberNodes: updatedNodes });
  };

  const isStepComplete = () => {
    if (!step.required) return true;

    switch (step.type) {
      case 'checklist':
        if (!step.checklistItems) return true;
        const allChecked = step.checklistItems.every((item: any) => 
          stepData.checklist?.[item.id] === true
        );
        return allChecked;

      case 'photo':
      case 'file_upload':
        const minPhotos = step.photoConfig?.minPhotos || 1;
        return photos.length >= minPhotos;

      case 'form':
        if (!step.formFields) return true;
        const requiredFields = step.formFields.filter((f: any) => f.required);
        const allFilled = requiredFields.every((field: any) => 
          stepData.form?.[field.id] && stepData.form[field.id] !== ''
        );
        return allFilled;

      case 'notes':
      case 'text_input':
        return stepData.text && stepData.text.trim() !== '';

      case 'geolocation':
        return stepData.geolocation && stepData.geolocation.latitude && stepData.geolocation.longitude;

      case 'fiber_network_node':
        return fiberNodes.length > 0;

      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (step.type) {
      case 'checklist':
        return (
          <div className="space-y-2">
            {step.checklistItems?.map((item: any) => (
              <label
                key={item.id}
                className="flex items-center gap-2 p-2 rounded hover:bg-zinc-800/50"
              >
                <Checkbox
                  checked={stepData.checklist?.[item.id] || false}
                  onCheckedChange={(checked) => handleChecklistChange(item.id, !!checked)}
                  disabled={disabled}
                />
                <span className={`text-sm ${
                  stepData.checklist?.[item.id] ? 'line-through text-zinc-500' : ''
                }`}>
                  {item.name}
                </span>
              </label>
            ))}
          </div>
        );

      case 'photo':
      case 'file_upload':
        return (
          <div>
            <div className="mb-3 text-sm text-zinc-400">
              {step.photoConfig?.minPhotos && (
                <p>Minimum photos required: {step.photoConfig.minPhotos}</p>
              )}
              {step.photoConfig?.maxPhotos && (
                <p>Maximum photos allowed: {step.photoConfig.maxPhotos}</p>
              )}
            </div>
            
            {/* Photo Grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {photos.map((photoId, idx) => (
                <div key={photoId} className="relative aspect-square bg-zinc-800 rounded-lg overflow-hidden">
                  {photoUrls[photoId] ? (
                    <img 
                      src={photoUrls[photoId]} 
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 text-xs bg-black/70 px-1.5 py-0.5 rounded text-white">
                    {idx + 1}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Photo Upload Options */}
            {(!step.photoConfig?.maxPhotos || photos.length < step.photoConfig.maxPhotos) && (
              <div className="grid grid-cols-2 gap-2">
                {/* Camera Input */}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    disabled={disabled || capturing}
                    className="hidden"
                    id={`photo-camera-${step.id}`}
                  />
                  <label
                    htmlFor={`photo-camera-${step.id}`}
                    className={`flex items-center justify-center gap-2 p-3 bg-zinc-800 rounded-lg border border-zinc-700 ${
                      disabled || capturing 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-zinc-700 cursor-pointer'
                    }`}
                  >
                    {capturing ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Camera className="h-5 w-5" />
                        <span className="text-sm">Camera</span>
                      </>
                    )}
                  </label>
                </div>
                
                {/* Library Input */}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoCapture}
                    disabled={disabled || capturing}
                    className="hidden"
                    id={`photo-library-${step.id}`}
                  />
                  <label
                    htmlFor={`photo-library-${step.id}`}
                    className={`flex items-center justify-center gap-2 p-3 bg-zinc-800 rounded-lg border border-zinc-700 ${
                      disabled || capturing 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-zinc-700 cursor-pointer'
                    }`}
                  >
                    <ImageIcon className="h-5 w-5" />
                    <span className="text-sm">Library</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        );

      case 'form':
        return (
          <div className="space-y-3">
            {step.formFields?.map((field: any) => (
              <div key={field.id}>
                <Label htmlFor={field.id} className="text-sm">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </Label>
                
                {field.type === 'textarea' ? (
                  <Textarea
                    id={field.id}
                    value={stepData.form?.[field.id] || ''}
                    onChange={(e) => handleFormChange(field.id, e.target.value)}
                    disabled={disabled}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={field.id}
                    value={stepData.form?.[field.id] || ''}
                    onChange={(e) => handleFormChange(field.id, e.target.value)}
                    disabled={disabled}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-white mt-1"
                  >
                    <option value="">Select...</option>
                    {field.options?.map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={field.id}
                    type={field.type}
                    value={stepData.form?.[field.id] || ''}
                    onChange={(e) => handleFormChange(field.id, e.target.value)}
                    disabled={disabled}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                )}
              </div>
            ))}
          </div>
        );

      case 'notes':
      case 'text_input':
        return (
          <Textarea
            value={stepData.text || ''}
            onChange={(e) => setStepData({ ...stepData, text: e.target.value })}
            placeholder={step.type === 'notes' ? 'Add notes...' : 'Enter text...'}
            disabled={disabled}
            className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
          />
        );

      case 'measurement':
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              value={stepData.value || ''}
              onChange={(e) => setStepData({ ...stepData, value: e.target.value })}
              placeholder="Value"
              disabled={disabled}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            <Input
              value={stepData.unit || ''}
              onChange={(e) => setStepData({ ...stepData, unit: e.target.value })}
              placeholder="Unit"
              disabled={disabled}
              className="bg-zinc-800 border-zinc-700 text-white w-24"
            />
          </div>
        );

      case 'geolocation':
        return (
          <div className="space-y-3">
            {!stepData.geolocation ? (
              <div className="text-center space-y-3 p-6 bg-zinc-800 rounded-lg border border-zinc-700">
                <MapPin className="h-12 w-12 mx-auto text-zinc-500" />
                <div>
                  <p className="text-sm font-medium">Capture GPS Coordinates</p>
                  <p className="text-xs text-zinc-400 mt-1">Record your current location</p>
                </div>
                <Button
                  onClick={handleLocationCapture}
                  disabled={disabled || capturingLocation}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {capturingLocation ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Capturing...
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4 mr-2" />
                      Capture My Location
                    </>
                  )}
                </Button>
                {locationError && (
                  <p className="text-xs text-red-400">{locationError}</p>
                )}
              </div>
            ) : (
              <div className="text-center space-y-3 p-6 bg-zinc-800 rounded-lg border border-emerald-600/50">
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <Check className="h-5 w-5" />
                  <span className="text-sm font-medium">Location Captured</span>
                </div>
                <div className="bg-zinc-900 rounded-lg p-4 text-left space-y-2">
                  <div>
                    <div className="text-xs text-zinc-500">Latitude</div>
                    <div className="font-mono text-sm text-white">
                      {stepData.geolocation.latitude.toFixed(6)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Longitude</div>
                    <div className="font-mono text-sm text-white">
                      {stepData.geolocation.longitude.toFixed(6)}
                    </div>
                  </div>
                </div>
                {!disabled && (
                  <Button
                    onClick={handleLocationCapture}
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 hover:bg-zinc-700"
                  >
                    Recapture Location
                  </Button>
                )}
              </div>
            )}
          </div>
        );

      case 'fiber_network_node':
        return (
          <div className="space-y-4">
            {/* List of created nodes */}
            {fiberNodes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-zinc-400">Created Nodes ({fiberNodes.length})</Label>
                {fiberNodes.map((node) => (
                  <div key={node.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-white">{node.name}</div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {node.nodeType} • {node.network} • {node.status}
                        </div>
                      </div>
                      {!disabled && (
                        <Button
                          onClick={() => handleDeleteFiberNode(node.id)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 font-mono">
                      {node.latitude.toFixed(6)}, {node.longitude.toFixed(6)}
                    </div>
                    {node.notes && (
                      <div className="text-xs text-zinc-400 mt-2">{node.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add new node form */}
            {!disabled && (
              <>
                {!showNodeForm ? (
                  <Button
                    onClick={() => setShowNodeForm(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Network Node
                  </Button>
                ) : (
                  <div className="space-y-3 bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <div>
                      <Label htmlFor="node-name" className="text-sm">
                        Node Name <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="node-name"
                        value={newNode.name}
                        onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
                        placeholder="e.g., Node 123"
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="node-type" className="text-sm">Node Type</Label>
                      <select
                        id="node-type"
                        value={newNode.nodeType}
                        onChange={(e) => setNewNode({ ...newNode, nodeType: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-white mt-1"
                      >
                        <option value="chamber">Chamber</option>
                        <option value="pole">Pole</option>
                        <option value="cabinet">Cabinet</option>
                        <option value="splice_point">Splice Point</option>
                        <option value="customer_premise">Customer Premise</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="node-network" className="text-sm">Network</Label>
                      <select
                        id="node-network"
                        value={newNode.network}
                        onChange={(e) => setNewNode({ ...newNode, network: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-white mt-1"
                      >
                        <option value="FibreLtd">FibreLtd</option>
                        <option value="Openreach">Openreach</option>
                        <option value="CityFibre">CityFibre</option>
                        <option value="Virgin">Virgin</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="node-status" className="text-sm">Status</Label>
                      <select
                        id="node-status"
                        value={newNode.status}
                        onChange={(e) => setNewNode({ ...newNode, status: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-white mt-1"
                      >
                        <option value="planned">Planned</option>
                        <option value="under_construction">Under Construction</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="decommissioned">Decommissioned</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="node-what3words" className="text-sm">What3Words</Label>
                      <Input
                        id="node-what3words"
                        value={newNode.what3words}
                        onChange={(e) => setNewNode({ ...newNode, what3words: e.target.value })}
                        placeholder="e.g., ///filled.count.soap"
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="node-address" className="text-sm">Address</Label>
                      <Input
                        id="node-address"
                        value={newNode.address}
                        onChange={(e) => setNewNode({ ...newNode, address: e.target.value })}
                        placeholder="Street address"
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="node-notes" className="text-sm">Notes</Label>
                      <Textarea
                        id="node-notes"
                        value={newNode.notes}
                        onChange={(e) => setNewNode({ ...newNode, notes: e.target.value })}
                        placeholder="Additional information"
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => setShowNodeForm(false)}
                        variant="outline"
                        className="flex-1 border-zinc-700 hover:bg-zinc-700"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddFiberNode}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Save Node
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );

      default:
        return <p className="text-zinc-400">Step type "{step.type}" not implemented</p>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Type-specific content */}
      <div>
        {renderStepContent()}
      </div>
      
      {!disabled && (
        <div className="flex gap-2 mt-4">
          {!step.required && (
            <Button
              onClick={() => onComplete({ ...stepData, completed: false, skipped: true })}
              variant="outline"
              className="flex-1 border-zinc-700 hover:bg-zinc-800"
            >
              <X className="h-4 w-4 mr-2" />
              Skip
            </Button>
          )}
          <Button
            onClick={handleComplete}
            disabled={!isStepComplete()}
            className={`${step.required ? 'w-full' : 'flex-1'} bg-emerald-600 hover:bg-emerald-700`}
          >
            <Check className="h-4 w-4 mr-2" />
            Complete Step
          </Button>
        </div>
      )}
    </div>
  );
}