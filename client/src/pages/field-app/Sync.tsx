/**
 * Sync Screen - Manual sync with server
 * Online only functionality
 */

import { useState, useEffect } from 'react';
import { fieldDB } from '@/lib/field-app/db';
import { compressImageSafe } from '@/lib/field-app/imageUtils';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Upload,
  Download,
  Trash2,
  FileText,
  Image,
  Edit,
  MapPin
} from 'lucide-react';

interface SyncProps {
  session: any;
  onComplete: () => void;
}

export default function Sync({ session, onComplete }: SyncProps) {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [syncQueue, setSyncQueue] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const queue = await fieldDB.getSyncQueue();
      setSyncQueue(queue);
      
      const dbStats = await fieldDB.getStats();
      setStats(dbStats);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    setProgress(0);
    setStatus('Preparing sync...');
    setResult(null);

    try {
      // Get all pending changes
      const queue = await fieldDB.getSyncQueue();
      
      if (queue.length === 0) {
        setStatus('No changes to sync');
        setProgress(100);
        setSyncing(false);
        return;
      }

      setProgress(10);
      setStatus(`Uploading ${queue.length} changes...`);

      // Prepare sync payload
      const updates = [];
      const photoUploads = [];

      for (const item of queue) {
        if (item.type === 'photo') {
          // Handle photo uploads separately
          const photo = await fieldDB.getPhoto(item.entityId as string);
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
            
            photoUploads.push({
              id: photo.id,
              workItemId: photo.workItemId,
              stepId: photo.stepId,
              blob,
              fileName: photo.fileName,
              mimeType: photo.mimeType
            });
          }
        } else {
          updates.push(item);
        }
      }

      setProgress(30);

      // Upload changes
      const response = await fetch('/api/field-app/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          updates: updates.map(u => ({
            type: u.type,
            action: u.action,
            entityId: u.entityId,
            data: u.data
          }))
        })
      });

      if (!response.ok) throw new Error('Sync failed');

      const syncResult = await response.json();
      setProgress(60);

      // Upload photos if any
      if (photoUploads.length > 0) {
        setStatus(`Compressing ${photoUploads.length} photos...`);
        
        // Compress all photos first (with fallback to original for unsupported formats)
        const compressedPhotos = [];
        for (let i = 0; i < photoUploads.length; i++) {
          const photo = photoUploads[i];
          const compressedBlob = await compressImageSafe(photo.blob);
          
          compressedPhotos.push({
            ...photo,
            blob: compressedBlob
          });
          
          setProgress(Math.round(60 + (15 * (i + 1) / photoUploads.length)));
        }
        
        // Upload photos in parallel batches (3 at a time)
        const CONCURRENT_UPLOADS = 3;
        let uploadedCount = 0;
        
        const uploadPhoto = async (photo: any) => {
          const formData = new FormData();
          formData.append('workItemId', photo.workItemId.toString());
          formData.append('stepId', photo.stepId || '');
          formData.append('file', photo.blob, photo.fileName);

          const response = await fetch('/api/field-app/upload-photo', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.token}`
            },
            body: formData
          });
          
          if (!response.ok) {
            throw new Error(`Failed to upload ${photo.fileName}`);
          }
          
          uploadedCount++;
          setStatus(`Uploading photo ${uploadedCount} of ${compressedPhotos.length}...`);
          setProgress(Math.round(75 + (15 * uploadedCount / compressedPhotos.length)));
          
          return response.json();
        };
        
        // Upload in batches
        for (let i = 0; i < compressedPhotos.length; i += CONCURRENT_UPLOADS) {
          const batch = compressedPhotos.slice(i, i + CONCURRENT_UPLOADS);
          await Promise.all(batch.map(photo => uploadPhoto(photo)));
        }
      }

      setProgress(90);
      setStatus('Downloading fresh data...');

      // Clear local changes after successful sync
      const queueIds = queue.map(q => q.id).filter(id => id !== undefined) as number[];
      await fieldDB.markSynced(queueIds);

      // Download fresh data
      if (syncResult.newData) {
        if (syncResult.newData.workItems) {
          await fieldDB.saveWorkItems(syncResult.newData.workItems);
        }
        if (syncResult.newData.templates) {
          await fieldDB.saveTemplates(syncResult.newData.templates);
        }
      }

      setProgress(100);
      const hasConflicts = syncResult.conflicts && syncResult.conflicts.length > 0;
      setStatus(hasConflicts 
        ? 'Sync completed with conflicts' 
        : 'Sync completed successfully!'
      );
      setResult({
        uploaded: queue.length,
        downloaded: syncResult.newData?.workItems?.length || 0,
        conflicts: syncResult.conflicts || [],
        templatesUpdated: syncResult.newData?.templates?.length || 0
      });

      // Reload sync status
      await loadSyncStatus();

    } catch (err: any) {
      setError(err.message || 'Sync failed. Please try again.');
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('This will delete all downloaded work items and require re-downloading. Continue?')) {
      return;
    }

    try {
      await fieldDB.clearCache();
      await loadSyncStatus();
      alert('Cache cleared successfully. Please download work items again.');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache');
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'photo':
        return <Image className="h-4 w-4" />;
      case 'workflowStep':
        return <CheckCircle className="h-4 w-4" />;
      case 'fiberNetworkNode':
        return <MapPin className="h-4 w-4" />;
      default:
        return <Edit className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-800 p-4 border-b border-zinc-700">
        <h2 className="text-lg font-semibold mb-2">Manual Sync</h2>
        <p className="text-sm text-zinc-400">
          Upload your offline changes and download fresh data
        </p>
      </div>

      {/* Stats */}
      <div className="p-4 bg-zinc-800/50 border-b border-zinc-700">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <FileText className="h-3 w-3" />
              Work Items
            </div>
            <p className="text-2xl font-semibold">{stats?.workItems || 0}</p>
          </div>
          
          <div className="bg-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <Upload className="h-3 w-3" />
              Pending Sync
            </div>
            <p className="text-2xl font-semibold text-amber-400">
              {stats?.pendingSync || 0}
            </p>
          </div>

          {stats?.fiberNodes > 0 && (
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <MapPin className="h-3 w-3" />
                Fiber Nodes
              </div>
              <p className="text-2xl font-semibold">{stats.fiberNodes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sync Queue */}
      <div className="flex-1 overflow-y-auto touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
        {syncQueue.length > 0 ? (
          <div className="p-4">
            <h3 className="font-medium mb-3">Pending Changes</h3>
            <div className="space-y-2">
              {syncQueue.slice(0, 10).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg text-sm"
                >
                  {getItemIcon(item.type)}
                  <div className="flex-1">
                    <span className="capitalize">{item.type}</span>
                    {item.type === 'workItem' && (
                      <span className="text-zinc-400 ml-2">ID: {item.entityId}</span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {syncQueue.length > 10 && (
                <p className="text-sm text-zinc-400 text-center">
                  And {syncQueue.length - 10} more...
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-zinc-400">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <p>No pending changes</p>
            <p className="text-sm mt-2">All your work is up to date</p>
          </div>
        )}
      </div>

      {/* Progress */}
      {syncing && (
        <div className="p-4 bg-zinc-800 border-t border-zinc-700">
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>{status}</span>
              <span>{progress}%</span>
            </div>
            <div className="bg-zinc-700 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="p-4 bg-emerald-500/10 border-t border-emerald-500/20">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-emerald-300">Sync Complete!</p>
              <p className="text-emerald-200">
                Uploaded {result.uploaded} changes, 
                Downloaded {result.downloaded} updates
                {result.templatesUpdated > 0 && ` (+ ${result.templatesUpdated} template${result.templatesUpdated > 1 ? 's' : ''} updated)`}
              </p>
              {result.conflicts.length > 0 && (
                <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                  <p className="text-amber-300 font-medium text-xs">
                    ⚠️ {result.conflicts.length} conflict{result.conflicts.length > 1 ? 's' : ''} occurred
                  </p>
                  <p className="text-amber-200 text-xs mt-1">
                    Some changes couldn't sync. Server data was kept to prevent data loss. 
                    Check your work items and re-apply changes if needed.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border-t border-red-500/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 bg-zinc-800 border-t border-zinc-700 space-y-3">
        <Button
          onClick={handleSync}
          disabled={syncing || syncQueue.length === 0}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {syncing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </>
          )}
        </Button>
        
        <Button
          onClick={handleClearCache}
          variant="outline"
          className="w-full bg-zinc-700 border-zinc-600 text-zinc-300 hover:bg-zinc-600"
          disabled={syncing}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Cache
        </Button>
        
        <Button
          onClick={onComplete}
          variant="ghost"
          className="w-full"
        >
          Back to Work Items
        </Button>
      </div>
    </div>
  );
}