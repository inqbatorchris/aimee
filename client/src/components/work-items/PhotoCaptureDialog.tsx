import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PhotoCaptureDialogProps {
  open: boolean;
  onClose: () => void;
  onCapture: (photoData: { data: string; fileName: string; fileSize: number }) => void;
}

export function PhotoCaptureDialog({ open, onClose, onCapture }: PhotoCaptureDialogProps) {
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ data: string; fileName: string; fileSize: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'Maximum file size is 10MB. Please select a smaller image.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPreview(base64);
      setSelectedFile({
        data: base64,
        fileName: file.name,
        fileSize: file.size,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSave = () => {
    if (selectedFile) {
      onCapture(selectedFile);
      handleClose();
    }
  };

  const handleClose = () => {
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]" data-testid="photo-capture-dialog">
        <DialogHeader>
          <DialogTitle>Add Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!preview ? (
            <div className="flex flex-col gap-3">
              {/* Camera Capture Button */}
              <Button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full h-32 flex flex-col gap-2"
                variant="outline"
                data-testid="button-camera-capture"
              >
                <Camera className="h-8 w-8" />
                <span>Take Photo</span>
              </Button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* File Upload Button */}
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 flex flex-col gap-2"
                variant="outline"
                data-testid="button-file-upload"
              >
                <Upload className="h-8 w-8" />
                <span>Choose from Files</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Photo Preview */}
              <div className="relative border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-auto max-h-96 object-contain"
                  data-testid="photo-preview"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setPreview(null);
                    setSelectedFile(null);
                  }}
                  data-testid="button-clear-photo"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* File Info */}
              {selectedFile && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>File: {selectedFile.fileName}</p>
                  <p>Size: {(selectedFile.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel">
            Cancel
          </Button>
          {preview && (
            <Button onClick={handleSave} data-testid="button-save-photo">
              Save Photo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
