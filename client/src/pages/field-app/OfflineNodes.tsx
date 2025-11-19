/**
 * Offline Nodes - View fiber network nodes created offline before sync
 */

import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { fieldDB } from '@/lib/field-app/db';
import { Button } from '@/components/ui/button';
import { ChevronLeft, MapPin, Image as ImageIcon } from 'lucide-react';

interface OfflineNode {
  id: string;
  name: string;
  nodeType: string;
  network: string;
  status: string;
  latitude: number;
  longitude: number;
  address?: string;
  notes?: string;
  photos: string[];
  createdAt: Date;
  syncedToServer: boolean;
}

export default function OfflineNodes() {
  const [, setLocation] = useLocation();
  const [nodes, setNodes] = useState<OfflineNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<OfflineNode | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const photoUrlsRef = useRef<Record<string, string>>({});
  const currentNodeIdRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    photoUrlsRef.current = photoUrls;
  }, [photoUrls]);

  useEffect(() => {
    loadNodes();
    
    return () => {
      // Cleanup photo URLs using ref to get latest values
      Object.values(photoUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const loadNodes = async () => {
    try {
      const unsyncedNodes = await fieldDB.getAllUnsyncedFiberNodes();
      setNodes(unsyncedNodes as any);
    } catch (error) {
      console.error('Failed to load offline nodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async (node: OfflineNode) => {
    const nodeId = node.id;
    const urls: Record<string, string> = {};
    
    for (const photoId of node.photos) {
      try {
        const photo = await fieldDB.getPhoto(photoId);
        if (photo) {
          let blob: Blob;
          if (photo.arrayBuffer) {
            blob = new Blob([photo.arrayBuffer], { type: photo.mimeType });
          } else if (photo.blob) {
            blob = photo.blob;
          } else {
            continue;
          }
          
          urls[photoId] = URL.createObjectURL(blob);
        }
      } catch (error) {
        console.error('Failed to load photo:', photoId, error);
      }
    }
    
    // Use functional update to revoke old URLs and set new ones atomically
    setPhotoUrls(prev => {
      // Check against ref to prevent race conditions during rapid node switching
      if (currentNodeIdRef.current !== nodeId) {
        // Clean up URLs we just created since we're not going to use them
        Object.values(urls).forEach(url => URL.revokeObjectURL(url));
        return prev;
      }
      
      // Revoke old URLs
      Object.values(prev).forEach(url => URL.revokeObjectURL(url));
      
      // Return new URLs
      return urls;
    });
  };

  const handleSelectNode = async (node: OfflineNode) => {
    // Update ref immediately before any async operations
    currentNodeIdRef.current = node.id;
    setSelectedNode(node);
    await loadPhotos(node);
  };

  const handleBack = () => {
    if (selectedNode) {
      // Clear current node ref
      currentNodeIdRef.current = null;
      
      // Cleanup current photo URLs using functional update
      setPhotoUrls(prev => {
        Object.values(prev).forEach(url => URL.revokeObjectURL(url));
        return {};
      });
      setSelectedNode(null);
    } else {
      setLocation('/field-app');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Detail view
  if (selectedNode) {
    return (
      <div className="flex flex-col h-full bg-zinc-900">
        <div className="bg-zinc-800 p-4 border-b border-zinc-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
              data-testid="button-back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-base font-semibold flex-1">{selectedNode.name}</h2>
            <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded">
              Not Synced
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Node Details */}
          <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-xs text-zinc-500">Type</p>
              <p className="text-sm text-white capitalize">{selectedNode.nodeType}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Network</p>
              <p className="text-sm text-white">{selectedNode.network}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Status</p>
              <p className="text-sm text-white capitalize">{selectedNode.status.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Location</p>
              <p className="text-sm text-white">
                {selectedNode.latitude.toFixed(6)}, {selectedNode.longitude.toFixed(6)}
              </p>
            </div>
            {selectedNode.address && (
              <div>
                <p className="text-xs text-zinc-500">Address</p>
                <p className="text-sm text-white">{selectedNode.address}</p>
              </div>
            )}
            {selectedNode.notes && (
              <div>
                <p className="text-xs text-zinc-500">Notes</p>
                <p className="text-sm text-white">{selectedNode.notes}</p>
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="bg-zinc-800 rounded-lg p-4">
            <p className="text-sm font-medium mb-3">Photos ({selectedNode.photos.length})</p>
            {selectedNode.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {selectedNode.photos.map((photoId, idx) => (
                  <div key={photoId} className="relative aspect-square bg-zinc-700 rounded-lg overflow-hidden">
                    {photoUrls[photoId] ? (
                      <img 
                        src={photoUrls[photoId]} 
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-zinc-500" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No photos</p>
            )}
          </div>

          {/* Warning */}
          <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-3">
            <p className="text-sm text-amber-400">
              📱 This node is stored offline. Sync to upload to server and create sign-off work item.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="bg-zinc-800 p-4 border-b border-zinc-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-semibold flex-1">Offline Nodes</h2>
          <span className="text-xs px-2 py-1 bg-zinc-700 text-zinc-300 rounded">
            {nodes.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {nodes.length > 0 ? (
          <div className="space-y-2">
            {nodes.map(node => (
              <button
                key={node.id}
                onClick={() => handleSelectNode(node)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 rounded-lg p-3 text-left transition-colors"
                data-testid={`node-${node.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{node.name}</p>
                    <p className="text-xs text-zinc-400 capitalize">{node.nodeType} • {node.network}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {node.photos.length} photo{node.photos.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded">
                      Pending
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400 mb-2">No offline nodes</p>
            <p className="text-sm text-zinc-500">
              Create nodes using the Add Node button
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
