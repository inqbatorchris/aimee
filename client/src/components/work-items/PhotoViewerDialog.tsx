import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Photo {
  data: string;
  timestamp: string;
  uploadedBy: number;
  fileName: string;
  fileSize: number;
  uploaderName?: string;
}

interface PhotoViewerDialogProps {
  open: boolean;
  onClose: () => void;
  photo: Photo | null;
  uploaderName?: string;
  onDelete?: (photo: Photo) => Promise<void>;
  canDelete?: boolean;
}

export function PhotoViewerDialog({ open, onClose, photo, uploaderName }: PhotoViewerDialogProps) {
  if (!photo) return null;

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0" data-testid="photo-viewer-dialog">
          <div className="relative">
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="bg-black/50 hover:bg-black/70 text-white"
                onClick={onClose}
                data-testid="button-close-viewer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex flex-col">
              <div className="bg-black flex items-center justify-center min-h-[60vh] max-h-[70vh]">
                <img
                  src={photo.data}
                  alt="Full resolution"
                  className="max-w-full max-h-[70vh] object-contain"
                  data-testid="photo-full-size"
                />
              </div>
              
              <div className="p-4 space-y-2 bg-white dark:bg-gray-900">
                <DialogHeader>
                  <DialogTitle>Photo Details</DialogTitle>
                </DialogHeader>
                
                <div className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <p>
                    <span className="font-medium">Captured:</span> {formatDate(photo.timestamp)}
                  </p>
                  {uploaderName && (
                    <p>
                      <span className="font-medium">By:</span> {uploaderName}
                    </p>
                  )}
                  {photo.fileName && (
                    <p>
                      <span className="font-medium">File:</span> {photo.fileName}
                    </p>
                  )}
                  {photo.fileSize && (
                    <p>
                      <span className="font-medium">Size:</span> {formatFileSize(photo.fileSize)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
