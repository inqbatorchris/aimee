/**
 * Create Fiber Node - Standalone page for field engineers to create fiber network nodes
 * Includes automatic work item creation for sign-off
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { fieldDB } from '@/lib/field-app/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronLeft, 
  MapPin, 
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  RefreshCw
} from 'lucide-react';

interface CreateFiberNodeProps {
  onComplete: () => void;
}

interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export default function CreateFiberNode({ onComplete }: CreateFiberNodeProps) {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [nodeType, setNodeType] = useState('chamber');
  const [network, setNetwork] = useState('');
  const [status, setStatus] = useState('planned');
  const [what3words, setWhat3words] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  
  // GPS and network list
  const [gpsLocation, setGpsLocation] = useState<GpsLocation | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [networks, setNetworks] = useState<string[]>([]);
  const [session, setSession] = useState<any>(null);

  // Helper function to generate auto-name
  const generateNodeName = (type: string, networkName: string, userEmail: string) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const time = `${hours}${minutes}`;
    
    // Extract username from email (before @) or use full name
    const username = userEmail.includes('@') 
      ? userEmail.split('@')[0] 
      : userEmail.replace(/\s+/g, '.');
    
    // Generate short ID (last 6 chars of timestamp for uniqueness)
    const itemId = Date.now().toString().slice(-6);
    
    // Capitalize node type
    const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
    
    return `${capitalizedType}-${networkName}-${username}:${time}-${itemId}`;
  };

  // Load session and fetch networks
  useEffect(() => {
    const init = async () => {
      try {
        const savedSession = await fieldDB.getSession();
        setSession(savedSession);
        
        // Fetch networks from API
        const response = await fetch('/api/fiber-network/networks', {
          headers: {
            'Authorization': `Bearer ${savedSession?.token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setNetworks(data.networks || []);
          if (data.networks && data.networks.length > 0) {
            const defaultNetwork = data.networks[0];
            setNetwork(defaultNetwork);
            
            // Generate initial name
            if (savedSession?.email) {
              const autoName = generateNodeName(
                nodeType, 
                defaultNetwork, 
                savedSession.email
              );
              setName(autoName);
            }
          }
        }
        
        // Capture GPS location
        captureGPS();
      } catch (error) {
        console.error('Failed to initialize:', error);
      } finally {
        setLoading(false);
      }
    };
    
    init();
    
    // Cleanup photo URLs on unmount
    return () => {
      Object.values(photoUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Auto-regenerate name when node type or network changes
  useEffect(() => {
    if (session?.email && network && nodeType) {
      const autoName = generateNodeName(
        nodeType, 
        network, 
        session.email
      );
      setName(autoName);
    }
  }, [nodeType, network, session]);

  const captureGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('GPS not supported on this device');
      return;
    }
    
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        setGpsError(error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    setCapturing(true);
    
    try {
      // Save photo to IndexedDB (with temporary workItemId of 0)
      const photoId = await fieldDB.savePhoto(
        0, // Temporary workItemId - will be updated after sync
        file,
        file.name,
        'fiber-node-creation',
        undefined,
        undefined,
        true // Skip sync queue - we'll handle sync differently
      );
      
      // Create object URL for preview
      const url = URL.createObjectURL(file);
      setPhotoUrls(prev => ({ ...prev, [photoId]: url }));
      setPhotos(prev => [...prev, photoId]);
    } catch (error) {
      console.error('Failed to save photo:', error);
      alert('Failed to save photo');
    } finally {
      setCapturing(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      alert('Please enter a chamber name');
      return;
    }
    
    if (!gpsLocation) {
      alert('GPS location is required. Please refresh location.');
      return;
    }
    
    if (photos.length === 0) {
      alert('At least 1 photo is required');
      return;
    }
    
    setSaving(true);
    
    try {
      // Generate UUID for offline node
      const nodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create fiber node data
      const nodeData = {
        id: nodeId,
        workItemId: 0, // Will be updated after work item is created
        name: name.trim(),
        nodeType,
        network,
        status,
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        what3words: what3words.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        photos,
        createdAt: new Date(),
        syncedToServer: false
      };
      
      // Save fiber node to IndexedDB
      await fieldDB.saveFiberNetworkNode(nodeData);
      
      // Add node to sync queue (server will auto-create the sign-off work item)
      await fieldDB.addToSyncQueue('fiberNetworkNode', 'create', nodeId, {
        name: nodeData.name,
        nodeType: nodeData.nodeType,
        network: nodeData.network,
        status: nodeData.status,
        latitude: nodeData.latitude,
        longitude: nodeData.longitude,
        what3words: nodeData.what3words,
        address: nodeData.address,
        notes: nodeData.notes,
        photos: nodeData.photos,
        fiberDetails: {}
      });
      
      setSuccess(true);
      
      // Navigate back after short delay
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Failed to save node:', error);
      alert('Failed to save node. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle className="h-16 w-16 text-emerald-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Fiber Node Created</h2>
        <p className="text-zinc-400 mb-4">{name} saved offline</p>
        <p className="text-sm text-zinc-500 mb-4">
          Node and photos stored locally<br />
          Sign-off work item will be created on sync
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="bg-zinc-800 p-4 border-b border-zinc-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocation('/field-app')}
            className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-semibold flex-1">Add Fiber Node</h2>
          {gpsLocation && (
            <div className="text-emerald-400 text-xs flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              GPS ✓
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Node Name (Auto-generated) */}
        <div>
          <Label className="text-sm font-medium">
            Node Name <span className="text-red-400">*</span>
          </Label>
          <div className="relative">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Chamber-CCNet-user:1430-123456"
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
              data-testid="input-node-name"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Auto-generated • Edit if needed
            </p>
          </div>
        </div>

        {/* Node Type */}
        <div>
          <Label className="text-sm font-medium">
            Node Type <span className="text-red-400">*</span>
          </Label>
          <select
            value={nodeType}
            onChange={(e) => setNodeType(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white mt-1"
            data-testid="select-node-type"
          >
            <option value="chamber">Chamber</option>
            <option value="cabinet">Cabinet</option>
            <option value="splice">Splice</option>
          </select>
        </div>

        {/* Network */}
        <div>
          <Label className="text-sm font-medium">
            Network <span className="text-red-400">*</span>
          </Label>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white mt-1"
            data-testid="select-network"
          >
            {networks.map(net => (
              <option key={net} value={net}>{net}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <Label className="text-sm font-medium">
            Status <span className="text-red-400">*</span>
          </Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white mt-1"
            data-testid="select-status"
          >
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="build_complete">Build Complete</option>
            <option value="awaiting_evidence">Awaiting Evidence</option>
            <option value="action_required">Action Required</option>
          </select>
        </div>

        {/* GPS Location */}
        <div>
          <Label className="text-sm font-medium">
            📍 Location <span className="text-red-400">*</span>
          </Label>
          <div className="mt-1 bg-zinc-800 border border-zinc-700 rounded-md p-3">
            {gpsLocation ? (
              <div className="space-y-2">
                <p className="text-sm text-zinc-300">
                  GPS: {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-zinc-500">
                  Accuracy: ±{gpsLocation.accuracy.toFixed(0)}m
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={captureGPS}
                  className="w-full bg-zinc-700 border-zinc-600"
                  data-testid="button-refresh-gps"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Location
                </Button>
              </div>
            ) : (
              <div className="text-center">
                {gpsError ? (
                  <div>
                    <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                    <p className="text-sm text-red-400 mb-2">{gpsError}</p>
                    <Button
                      size="sm"
                      onClick={captureGPS}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Retry GPS
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Loader2 className="h-8 w-8 text-zinc-500 mx-auto mb-2 animate-spin" />
                    <p className="text-sm text-zinc-400">Capturing GPS...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* What3Words */}
        <div>
          <Label className="text-sm font-medium">What3Words (Optional)</Label>
          <Input
            value={what3words}
            onChange={(e) => setWhat3words(e.target.value)}
            placeholder="word.word.word"
            className="bg-zinc-800 border-zinc-700 text-white mt-1"
            data-testid="input-what3words"
          />
        </div>

        {/* Address */}
        <div>
          <Label className="text-sm font-medium">Address (Optional)</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Street Name, Town"
            className="bg-zinc-800 border-zinc-700 text-white mt-1"
            data-testid="input-address"
          />
        </div>

        {/* Notes */}
        <div>
          <Label className="text-sm font-medium">Notes (Optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes..."
            className="bg-zinc-800 border-zinc-700 text-white mt-1 min-h-[80px]"
            data-testid="textarea-notes"
          />
        </div>

        {/* Photos */}
        <div>
          <Label className="text-sm font-medium">
            📷 Photo <span className="text-red-400">*</span>
            <span className="text-xs text-zinc-500 ml-2">(Minimum: 1)</span>
          </Label>
          
          {/* Photo Grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2 mb-3">
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
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 text-xs bg-black/70 px-1.5 py-0.5 rounded text-white">
                    {idx + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {/* Photo Capture Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {/* Camera */}
            <div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                disabled={capturing}
                className="hidden"
                id="photo-camera"
              />
              <label
                htmlFor="photo-camera"
                className={`flex items-center justify-center gap-2 p-3 bg-zinc-800 rounded-lg border border-zinc-700 ${
                  capturing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-700 cursor-pointer'
                }`}
              >
                {capturing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-5 w-5" />
                    <span className="text-sm">Camera</span>
                  </>
                )}
              </label>
            </div>
            
            {/* Library */}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoCapture}
                disabled={capturing}
                className="hidden"
                id="photo-library"
              />
              <label
                htmlFor="photo-library"
                className={`flex items-center justify-center gap-2 p-3 bg-zinc-800 rounded-lg border border-zinc-700 ${
                  capturing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-700 cursor-pointer'
                }`}
              >
                <ImageIcon className="h-5 w-5" />
                <span className="text-sm">Library</span>
              </label>
            </div>
          </div>
        </div>

        {/* Offline Indicator */}
        {!navigator.onLine && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-center">
            <p className="text-sm text-red-400">
              🔴 Offline - Node will sync when online
            </p>
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving || !gpsLocation || photos.length === 0 || !name.trim()}
          className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base font-medium"
          data-testid="button-save-node"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            '💾 Save Node (Will Sync Later)'
          )}
        </Button>
      </div>
    </div>
  );
}
