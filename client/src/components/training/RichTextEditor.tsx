import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, X, Upload, Move, Edit, Trash2, FileText, Image, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Section {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'image' | 'video';
  requiresConfirmation: boolean;
  order: number;
}

interface RichTextEditorProps {
  content?: string;
  sections?: Section[];
  onChange: (content: string, sections: Section[]) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
}

export function RichTextEditor({ 
  content: externalContent = '', 
  sections: externalSections = [], 
  onChange, 
  onImageUpload,
  placeholder = 'Enter content here...'
}: RichTextEditorProps) {
  const [content, setContent] = useState(externalContent);
  const [sections, setSections] = useState<Section[]>(externalSections);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionContent, setNewSectionContent] = useState('');
  const [newSectionType, setNewSectionType] = useState<'text' | 'image' | 'video'>('text');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const { toast } = useToast();

  // Update internal state when external content changes
  useEffect(() => {
    setContent(externalContent);
  }, [externalContent]);

  useEffect(() => {
    setSections(externalSections);
  }, [externalSections]);

  const addSection = useCallback(() => {
    if (!newSectionTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a title for the section.",
        variant: "destructive"
      });
      return;
    }

    if (!newSectionContent.trim() && newSectionType !== 'image') {
      toast({
        title: "Missing Information",
        description: "Please provide content for the section.",
        variant: "destructive"
      });
      return;
    }

    // For image sections, if no content is provided, add a placeholder
    let sectionContent = newSectionContent;
    if (newSectionType === 'image' && !sectionContent.trim()) {
      sectionContent = "Please edit this section to add an image URL";
    }

    const newSection: Section = {
      id: Date.now().toString(),
      title: newSectionTitle,
      content: sectionContent,
      type: newSectionType,
      requiresConfirmation: false,
      order: sections.length + 1
    };

    const updatedSections = [...sections, newSection];
    setSections(updatedSections);
    setNewSectionTitle('');
    setNewSectionContent('');
    onChange(content, updatedSections);
  }, [newSectionTitle, newSectionContent, newSectionType, sections, content, onChange, toast]);

  const removeSection = useCallback((sectionId: string) => {
    const updatedSections = sections.filter(s => s.id !== sectionId);
    setSections(updatedSections);
    onChange(content, updatedSections);
  }, [sections, content, onChange]);

  const updateSection = useCallback((sectionId: string, updates: Partial<Section>) => {
    const updatedSections = sections.map(s => 
      s.id === sectionId ? { ...s, ...updates } : s
    );
    setSections(updatedSections);
    onChange(content, updatedSections);
  }, [sections, content, onChange]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (PNG, JPG, GIF, WebP).",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/uploads/training/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Set the content with the uploaded image URL
      setNewSectionContent(`![${file.name}](${result.url})`);
      setNewSectionType('image');
      
      toast({
        title: "Upload Successful",
        description: `Image "${file.name}" uploaded successfully.`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again or paste an image URL instead.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a video file (MP4, WebM, MOV, AVI).",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 100MB for videos)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select a video smaller than 100MB.",
        variant: "destructive"
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/uploads/training/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Set the content with the uploaded video URL
      setNewSectionContent(`<video src="${result.url}" controls></video>`);
      setNewSectionType('video');
      
      toast({
        title: "Upload Successful",
        description: `Video "${file.name}" uploaded successfully.`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload video. Please try again or paste a video URL instead.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    onChange(newContent, sections);
  }, [sections, onChange]);

  return (
    <div className="space-y-4">
      {/* Main Content Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Document Content</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Enter the main document content here..."
            className="min-h-[200px] font-mono text-xs"
          />
        </CardContent>
      </Card>

      {/* Sections */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Learning Sections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sections.map((section, index) => (
            <div key={section.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {section.type === 'text' ? <FileText className="w-3 h-3" /> : 
                     section.type === 'image' ? <Image className="w-3 h-3" /> : 
                     <Video className="w-3 h-3" />}
                    Section {index + 1}
                  </Badge>
                  <span className="text-sm font-medium">{section.title}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingSection(section.id)}
                    className="p-1 h-6 w-6"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSection(section.id)}
                    className="p-1 h-6 w-6"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              {editingSection === section.id ? (
                <div className="space-y-2">
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                    placeholder="Section title"
                    className="text-xs"
                  />
                  {section.type === 'image' ? (
                    <Textarea
                      value={section.content}
                      onChange={(e) => updateSection(section.id, { content: e.target.value })}
                      placeholder="Image URL or markdown&#10;Examples:&#10;https://picsum.photos/400/300&#10;![Sample Image](https://picsum.photos/400/300)&#10;<img src='https://picsum.photos/400/300' alt='Sample' />"
                      className="text-xs font-mono"
                      rows={4}
                    />
                  ) : section.type === 'video' ? (
                    <Textarea
                      value={section.content}
                      onChange={(e) => updateSection(section.id, { content: e.target.value })}
                      placeholder="Video URL or embed code&#10;Examples:&#10;https://www.youtube.com/watch?v=VIDEO_ID&#10;https://vimeo.com/VIDEO_ID&#10;https://example.com/video.mp4&#10;<video src='url' controls></video>"
                      className="text-xs font-mono"
                      rows={4}
                    />
                  ) : (
                    <Textarea
                      value={section.content}
                      onChange={(e) => updateSection(section.id, { content: e.target.value })}
                      placeholder="Section content"
                      className="text-xs"
                    />
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setEditingSection(null)}
                      className="text-xs"
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSection(null)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  {section.type === 'image' ? (
                    <div className="italic text-blue-600">
                      Image: {section.content.substring(0, 50)}...
                    </div>
                  ) : (
                    <div>
                      {section.content.substring(0, 100)}...
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <Separator />

          {/* Add New Section */}
          <div className="space-y-2">
            <Label className="text-xs">Add New Section</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={newSectionType === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewSectionType('text')}
                className="text-xs"
              >
                <FileText className="w-3 h-3 mr-1" />
                Text
              </Button>
              <Button
                type="button"
                variant={newSectionType === 'image' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewSectionType('image')}
                className="text-xs"
              >
                <Image className="w-3 h-3 mr-1" />
                Image
              </Button>
              <Button
                type="button"
                variant={newSectionType === 'video' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewSectionType('video')}
                className="text-xs"
              >
                <Video className="w-3 h-3 mr-1" />
                Video
              </Button>
            </div>
            
            <Input
              placeholder="Section title"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              className="text-xs"
            />
            
            {newSectionType === 'image' ? (
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs"
                  />
                  <span className="text-xs text-gray-500">or paste URL below</span>
                </div>
                <Textarea
                  placeholder="Image URL or markdown&#10;Examples:&#10;https://picsum.photos/400/300&#10;![Sample Image](https://picsum.photos/400/300)&#10;<img src='https://picsum.photos/400/300' alt='Sample' />"
                  value={newSectionContent}
                  onChange={(e) => setNewSectionContent(e.target.value)}
                  className="text-xs font-mono"
                  rows={4}
                />
                {newSectionContent && (
                  <div className="bg-blue-50 border border-blue-200 p-2 rounded">
                    <p className="text-blue-800 text-xs font-medium">Preview:</p>
                    <p className="text-blue-700 text-xs truncate">{newSectionContent}</p>
                  </div>
                )}
              </div>
            ) : newSectionType === 'video' ? (
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="text-xs"
                  />
                  <span className="text-xs text-gray-500">or paste URL below</span>
                </div>
                <Textarea
                  placeholder="Video URL or embed code&#10;Examples:&#10;https://www.youtube.com/watch?v=VIDEO_ID&#10;https://vimeo.com/VIDEO_ID&#10;https://example.com/video.mp4&#10;<video src='url' controls></video>"
                  value={newSectionContent}
                  onChange={(e) => setNewSectionContent(e.target.value)}
                  className="text-xs font-mono"
                  rows={4}
                />
                {newSectionContent && (
                  <div className="bg-purple-50 border border-purple-200 p-2 rounded">
                    <p className="text-purple-800 text-xs font-medium">Preview:</p>
                    <p className="text-purple-700 text-xs truncate">{newSectionContent}</p>
                  </div>
                )}
              </div>
            ) : (
              <Textarea
                placeholder="Section content (markdown supported)"
                value={newSectionContent}
                onChange={(e) => setNewSectionContent(e.target.value)}
                className="text-xs"
              />
            )}
            
            <Button
              type="button"
              onClick={addSection}
              size="sm"
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Section
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}