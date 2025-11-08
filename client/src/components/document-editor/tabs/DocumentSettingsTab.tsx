import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, X, Plus, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ImageUploadDialog } from '../ImageUploadDialog';

interface Document {
  id: number;
  title: string;
  content: string;
  category?: string;
  status: 'draft' | 'published' | 'archived';
  visibility?: 'public' | 'internal' | 'private';
  featuredImage?: string;
  tags?: string[];
  estimatedReadingTime?: number;
  aiGenerated?: boolean;
  aiPrompt?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

interface DocumentSettingsTabProps {
  formData: {
    categories: string[]; // Updated to use categories array for multi-select
    status: 'draft' | 'published' | 'archived';
    visibility: 'public' | 'internal' | 'private';
    featuredImage: string;
    tags: string[];
    estimatedReadingTime?: number;
    aiGenerated: boolean;
    aiPrompt: string;
  };
  onFormDataChange: (updates: Partial<DocumentSettingsTabProps['formData']>) => void;
  onSave: () => void;
  isLoading: boolean;
}

export function DocumentSettingsTab({ formData, onFormDataChange, onSave, isLoading }: DocumentSettingsTabProps) {
  const { toast } = useToast();
  const [newTag, setNewTag] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);

  const handleSave = () => {
    if (!formData.categories || formData.categories.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one category',
        variant: 'destructive',
      });
      return;
    }
    onSave();
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      onFormDataChange({
        tags: [...(formData.tags || []), newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onFormDataChange({
      tags: formData.tags?.filter(tag => tag !== tagToRemove) || []
    });
  };

  const handleImageSelected = (imageUrl: string) => {
    onFormDataChange({ featuredImage: imageUrl });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Document Settings</h3>
          
          {/* Categories - Multi-select like tags */}
          <div className="space-y-2">
            <Label htmlFor="categories">Categories</Label>
            <div className="space-y-2">
              {/* Category selection dropdown */}
              <Select onValueChange={(value) => {
                if (value && !formData.categories.includes(value)) {
                  onFormDataChange({ categories: [...formData.categories, value] });
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Add category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="policies">Policies</SelectItem>
                  <SelectItem value="procedures">Procedures</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="guidelines">Guidelines</SelectItem>
                  <SelectItem value="best-practices">Best Practices</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Selected categories as chips/badges */}
              <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md">
                {formData.categories.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No categories selected</span>
                ) : (
                  formData.categories.map((category, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1"
                      data-testid={`category-badge-${category}`}
                    >
                      {category}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => {
                          const newCategories = formData.categories.filter((_, i) => i !== index);
                          onFormDataChange({ categories: newCategories });
                        }}
                        data-testid={`remove-category-${category}`}
                      />
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value: 'draft' | 'published' | 'archived') => 
                onFormDataChange({ status: value })
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select 
              value={formData.visibility} 
              onValueChange={(value: 'public' | 'internal' | 'private') => 
                onFormDataChange({ visibility: value })
              }
            >
              <SelectTrigger id="visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estimated Reading Time */}
          <div className="space-y-2">
            <Label htmlFor="readingTime">Estimated Reading Time (minutes)</Label>
            <Input
              id="readingTime"
              type="number"
              min="1"
              value={formData.estimatedReadingTime || ''}
              onChange={(e) => onFormDataChange({ 
                estimatedReadingTime: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              placeholder="e.g., 5"
              autoComplete="off"
              data-form-type="other"
            />
          </div>

          {/* Featured Image */}
          <div className="space-y-2">
            <Label htmlFor="featuredImage">Featured Image URL</Label>
            <div className="flex gap-2">
              <Input
                id="featuredImage"
                value={formData.featuredImage || ''}
                onChange={(e) => onFormDataChange({ featuredImage: e.target.value })}
                placeholder="https://example.com/image.jpg"
                autoComplete="off"
                data-form-type="other"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={() => setShowImageUpload(true)}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                autoComplete="off"
                data-form-type="other"
              />
              <Button type="button" onClick={addTag} size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* AI Configuration */}
          {formData.aiGenerated && (
            <div className="space-y-2">
              <Label htmlFor="aiPrompt">AI Generation Prompt</Label>
              <Textarea
                id="aiPrompt"
                value={formData.aiPrompt || ''}
                onChange={(e) => onFormDataChange({ aiPrompt: e.target.value })}
                placeholder="The prompt used to generate this document"
                rows={3}
                autoComplete="off"
                data-form-type="other"
              />
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isLoading} type="button">
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </Card>
      </div>
      
      <ImageUploadDialog
        open={showImageUpload}
        onClose={() => setShowImageUpload(false)}
        onImageSelected={handleImageSelected}
      />
    </ScrollArea>
  );
}