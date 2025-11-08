import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, X, FileText, Image, Video, Wand2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AIGeneratorProps {
  onGenerate: (content: { title: string; content: string; tags: string[] }) => void;
  onClose: () => void;
}

interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export function AIGenerator({ onGenerate, onClose }: AIGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // AI generation mutation
  const generateMutation = useMutation({
    mutationFn: async (data: { prompt: string; attachments: AttachedFile[] }) => {
      const response = await apiRequest('/api/knowledge-base/ai-generate', {
        method: 'POST',
        body: {
          prompt: data.prompt,
          attachments: data.attachments.map(file => ({
            name: file.name,
            type: file.type,
            url: file.url,
          })),
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      onGenerate({
        title: data.title,
        content: data.content,
        tags: data.tags || [],
      });
      toast({
        title: 'Success',
        description: 'AI has generated content for your document.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate content. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleFileUpload = async (files: FileList) => {
    if (attachedFiles.length + files.length > 5) {
      toast({
        title: 'Too Many Files',
        description: 'You can attach a maximum of 5 files.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large. Maximum size is 10MB.`);
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/knowledge-base/upload-media', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const data = await response.json();
        
        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.type,
          size: file.size,
          url: data.url,
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setAttachedFiles(prev => [...prev, ...uploadedFiles]);

      toast({
        title: 'Success',
        description: `${uploadedFiles.length} file(s) uploaded successfully.`,
      });
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  const removeFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return Video;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: 'Missing Prompt',
        description: 'Please enter a prompt describing what you want to generate.',
        variant: 'destructive',
      });
      return;
    }

    generateMutation.mutate({
      prompt: prompt.trim(),
      attachments: attachedFiles,
    });
  };

  const examplePrompts = [
    "Create a comprehensive troubleshooting guide for common internet connectivity issues",
    "Write a customer service training manual covering best practices and common scenarios",
    "Generate a technical documentation about fiber optic installation procedures",
    "Create a knowledge base article about billing inquiries and payment processing",
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI Document Generator
          </DialogTitle>
          <DialogDescription>
            Describe what you want to create and optionally attach files for context. AI will generate a comprehensive document for you to review and edit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Prompt Input */}
          <div className="space-y-3">
            <Label htmlFor="prompt" className="text-sm font-medium">
              Describe what you want to create *
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Create a comprehensive guide for troubleshooting customer internet connectivity issues, including common problems and step-by-step solutions..."
              rows={4}
              className="text-sm"
            />
          </div>

          {/* Example Prompts */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Example prompts (click to use):
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {examplePrompts.map((example, index) => (
                <Card
                  key={index}
                  className="cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setPrompt(example)}
                >
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {example}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* File Attachments */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Attachments (Optional)
            </Label>
            <p className="text-xs text-muted-foreground">
              Upload screenshots, images, documents, or videos to provide additional context for the AI.
            </p>

            {/* Upload Area */}
            <Card>
              <CardContent className="p-4">
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-3 hover:border-ring transition-colors cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="mx-auto w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isUploading ? 'Uploading...' : 'Drop files here or click to browse'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Images, videos, documents (max 10MB each, 5 files total)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attached Files */}
            {attachedFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Attached Files:</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {attachedFiles.map((file) => {
                    const IconComponent = getFileIcon(file.type);
                    return (
                      <Card key={file.id}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                              <IconComponent className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(file.id);
                            }}
                            className="h-6 w-6 p-0 flex-shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending || !prompt.trim()}
              className="flex items-center gap-2"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Generate Document
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.md"
          onChange={handleFileSelect}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
}