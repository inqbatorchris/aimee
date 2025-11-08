import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Link, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FeaturedImageManagerProps {
  featuredImage: string;
  onImageChange: (imageUrl: string) => void;
}

export function FeaturedImageManager({ featuredImage, onImageChange }: FeaturedImageManagerProps) {
  const [imageUrl, setImageUrl] = useState(featuredImage);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select an image file (PNG, JPG, GIF, WebP).',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/knowledge-base/upload-media', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const uploadedUrl = data.url;

      setImageUrl(uploadedUrl);
      onImageChange(uploadedUrl);

      toast({
        title: 'Success',
        description: 'Featured image uploaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleUrlSubmit = () => {
    if (imageUrl.trim()) {
      onImageChange(imageUrl.trim());
      setShowUrlInput(false);
      toast({
        title: 'Success',
        description: 'Featured image URL updated.',
      });
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    onImageChange('');
    setShowUrlInput(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      handleImageUpload(imageFile);
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please drop an image file.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Featured Image</Label>
      
      {featuredImage ? (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <img
                src={featuredImage}
                alt="Featured image"
                className="w-full h-32 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NSA2NEw5NSA3NEwxMDUgNjRMMTE1IDc0TDEyNSA2NEwxMzUgNzRNNjUgODRMNzUgOTRMODUgODRMOTUgOTRMMTA1IDg0TDExNSA5NEwxMjUgODRMMTM1IDk0IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K';
                }}
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              <p className="truncate">{featuredImage}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-4 hover:border-ring transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Add Featured Image</p>
                <p className="text-xs text-muted-foreground">
                  Drag and drop an image or click to browse
                </p>
              </div>
              {isUploading && (
                <div className="text-xs text-muted-foreground">
                  Uploading...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowUrlInput(!showUrlInput);
            if (showUrlInput) {
              setImageUrl(featuredImage);
            }
          }}
          className="flex items-center gap-2"
        >
          <Link className="h-4 w-4" />
          URL
        </Button>
      </div>

      {showUrlInput && (
        <div className="space-y-2">
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Enter image URL..."
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleUrlSubmit}>
              Set Image
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowUrlInput(false);
                setImageUrl(featuredImage);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}