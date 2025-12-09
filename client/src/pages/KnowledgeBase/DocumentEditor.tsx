import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marked } from 'marked';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Save, ArrowLeft, Eye, X, Tag, Clock, Users, Folder, FileText, GraduationCap, ExternalLink, FileCheck } from 'lucide-react';
import { ModernDocumentEditor } from '@/components/DocumentEditor/ModernDocumentEditor';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentFormWrapper } from '@/components/document-editor/DocumentFormWrapper';
import { AIComposePanel } from '@/components/knowledge-hub/AIComposePanel';
import type { KnowledgeFolder, Team } from '@shared/schema';

const DOCUMENT_TYPES = [
  { value: 'internal_kb', label: 'Knowledge Article', icon: FileText, description: 'Standard knowledge base article' },
  { value: 'training_module', label: 'Training Module', icon: GraduationCap, description: 'Step-based training with quizzes' },
  { value: 'customer_kb', label: 'Customer Document', icon: FileCheck, description: 'Customer-facing documentation' },
  { value: 'external_file_link', label: 'External File', icon: ExternalLink, description: 'Link to external file' },
] as const;

export default function DocumentEditor() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get query params for pre-selecting document type
  const searchParams = new URLSearchParams(window.location.search);
  const initialType = searchParams.get('type');
  
  // Document state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [estimatedReadingTime, setEstimatedReadingTime] = useState<number>(5);
  const [newTag, setNewTag] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [documentType, setDocumentType] = useState<string>(initialType || 'internal_kb');
  const [folderId, setFolderId] = useState<number | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  
  // External file link fields
  const [externalFileUrl, setExternalFileUrl] = useState('');
  const [externalFileSource, setExternalFileSource] = useState<string>('');

  const EXTERNAL_FILE_SOURCES = [
    { value: 'sharepoint', label: 'SharePoint' },
    { value: 'onedrive', label: 'OneDrive' },
    { value: 'google_drive', label: 'Google Drive' },
    { value: 'dropbox', label: 'Dropbox' },
    { value: 'other', label: 'Other URL' },
  ] as const;

  const isEditing = !!id;

  // Fetch folders for folder selector
  const { data: folders = [] } = useQuery<KnowledgeFolder[]>({
    queryKey: ['/api/knowledge-base/folders'],
  });

  // Fetch teams for team selector
  const { data: teamsData } = useQuery<Team[] | { teams: Team[] }>({
    queryKey: ['/api/core/teams'],
  });
  const teams = Array.isArray(teamsData) ? teamsData : (teamsData?.teams || []);

  // Fetch existing document if editing
  const { data: document, isLoading, error } = useQuery({
    queryKey: [`/api/knowledge-base/documents/${id}`],
    enabled: isEditing,
  });

  // Load document data when fetched
  useEffect(() => {
    if (document && typeof document === 'object' && !isLoading) {
      const doc = document as any;
      // Only update if we have valid document data
      if (doc.id) {
        setTitle(doc.title || '');
        
        // Convert Markdown to HTML if needed
        let contentToSet = doc.content || '';
        if (contentToSet) {
          const isMarkdown = contentToSet.includes('\n#') || contentToSet.startsWith('#') || 
                            contentToSet.includes('\n##') || contentToSet.includes('\n-') ||
                            contentToSet.includes('\n*') || contentToSet.includes('\n>');
          if (isMarkdown) {
            try {
              contentToSet = marked(contentToSet) as string;
            } catch (error) {
              console.error('Error converting markdown to HTML:', error);
            }
          }
        }
        setContent(contentToSet);
        
        // Handle categories array from backend
        const docCategories = Array.isArray(doc.categories) ? doc.categories : [];
        setCategories(docCategories);
        setTags(Array.isArray(doc.tags) ? doc.tags : []);
        setStatus(doc.status || 'draft');
        setEstimatedReadingTime(doc.estimatedReadingTime || 5);
        setDocumentType(doc.documentType || 'internal_kb');
        setFolderId(doc.folderId || null);
        setTeamId(doc.teamId || null);
        setExternalFileUrl(doc.externalFileUrl || '');
        setExternalFileSource(doc.externalFileSource || '');
        console.log('Document data loaded:', { title: doc.title, hasContent: !!doc.content, documentType: doc.documentType, teamId: doc.teamId });
      }
    }
  }, [document, isLoading]);

  // Reset form when switching between create/edit modes (preserve URL type param)
  useEffect(() => {
    if (!isEditing) {
      setTitle('');
      setContent('');
      setCategories([]);
      setTags([]);
      setStatus('draft');
      setEstimatedReadingTime(5);
      setDocumentType(initialType || 'internal_kb');
      setFolderId(null);
      setTeamId(null);
      setExternalFileUrl('');
      setExternalFileSource('');
    }
  }, [isEditing, initialType]);

  // Save document mutation
  const saveDocumentMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      categories: string[];
      tags: string[];
      status: string;
      estimatedReadingTime: number;
      documentType: string;
      folderId: number | null;
      teamId: number | null;
      externalFileUrl?: string;
      externalFileSource?: string;
    }) => {
      const url = isEditing 
        ? `/api/knowledge-base/documents/${id}`
        : '/api/knowledge-base/documents';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      return apiRequest(url, {
        method,
        body: data,
      });
    },
    onSuccess: (data: any) => {
      const savedTitle = title || 'Untitled Document';
      toast({
        title: 'Success',
        description: `"${savedTitle}" ${isEditing ? 'updated' : 'created'} successfully.`,
      });
      setLastSaved(new Date());
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/training/knowledge-base'] });
      
      // Refresh the current document data if editing
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: [`/api/knowledge-base/documents/${id}`] });
      }
      
      // Navigate to edit mode if creating new document
      if (!isEditing && data?.id) {
        navigate(`/knowledge-base/documents/${data.id}/edit`);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save document',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a document title.',
        variant: 'destructive',
      });
      return;
    }

    // For external file links, require URL instead of content
    if (documentType === 'external_file_link') {
      if (!externalFileUrl.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Please enter the external file URL.',
          variant: 'destructive',
        });
        return;
      }
    } else if (!content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please add some content to the document.',
        variant: 'destructive',
      });
      return;
    }

    // Use categories array, default to ['General'] if empty
    const categoriesToSave = categories.length > 0 ? categories : ['General'];

    const saveData: any = {
      title,
      content: documentType === 'external_file_link' ? `External file: ${externalFileUrl}` : content,
      categories: categoriesToSave,
      tags,
      status,
      estimatedReadingTime,
      documentType,
      folderId,
      teamId,
    };

    // Add external file fields if external link type
    if (documentType === 'external_file_link') {
      saveData.externalFileUrl = externalFileUrl;
      saveData.externalFileSource = externalFileSource || 'other';
    }

    saveDocumentMutation.mutate(saveData);
  };

  const handlePublish = () => {
    setStatus('published');
    handleSave();
  };

  const addCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const removeCategory = (categoryToRemove: string) => {
    setCategories(categories.filter(cat => cat !== categoryToRemove));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (isLoading && isEditing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-lg font-semibold mb-2">Loading document...</div>
          <div className="text-sm text-muted-foreground">Please wait while we fetch the document details.</div>
        </div>
      </div>
    );
  }

  if (error && isEditing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-lg font-semibold mb-2 text-destructive">Failed to load document</div>
          <div className="text-sm text-muted-foreground mb-4">
            {error.message || 'There was an error loading the document. Please check your connection and try again.'}
          </div>
          <div className="flex gap-2 justify-center">
            <Button 
              variant="outline" 
              onClick={() => navigate('/strategy/knowledge-base')}
            >
              Back to Knowledge Base
            </Button>
            <Button 
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DocumentFormWrapper className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border py-2 md:py-4 flex-shrink-0">
        <div className="app-container">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/strategy/knowledge-base')}
                className="flex items-center gap-2 h-8 px-2 md:px-3"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Knowledge Base</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="hidden md:block">
                <h1 className="font-bold text-foreground text-[16px]">
                  {isEditing ? 'Edit Document' : 'Create New Document'}
                </h1>
                <p className="text-muted-foreground text-[12px]">
                  {isEditing ? 'Make changes to your document' : 'Create a comprehensive knowledge base document'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 justify-end md:justify-start">
              {lastSaved && (
                <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Saved {lastSaved.toLocaleTimeString()}
                </div>
              )}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={saveDocumentMutation.isPending}
                className="flex items-center gap-2 h-8"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Save Draft</span>
                <span className="sm:hidden">Save</span>
              </Button>
              
              <Button
                type="button"
                size="sm"
                onClick={handlePublish}
                disabled={saveDocumentMutation.isPending}
                className="flex items-center gap-2 h-8"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Publish</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto order-2 md:order-1">
          <div className="p-3 md:p-6 space-y-4 md:space-y-6">
            {/* Document Title */}
            <div>
              <Label htmlFor="title" className="text-sm font-medium">
                Document Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title..."
                className="text-base md:text-lg font-semibold h-10 md:h-12"
                autoComplete="off"
                data-form-type="other"
              />
            </div>

            {/* Conditional Editor based on Document Type */}
            {documentType === 'external_file_link' ? (
              <Card className="min-h-[300px] md:min-h-[500px]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    External File Link
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="externalSource" className="text-sm font-medium">
                      File Source
                    </Label>
                    <Select value={externalFileSource || 'other'} onValueChange={setExternalFileSource}>
                      <SelectTrigger className="text-sm" data-testid="external-source-selector">
                        <SelectValue placeholder="Select source..." />
                      </SelectTrigger>
                      <SelectContent>
                        {EXTERNAL_FILE_SOURCES.map((source) => (
                          <SelectItem key={source.value} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="externalUrl" className="text-sm font-medium">
                      File URL
                    </Label>
                    <Input
                      id="externalUrl"
                      type="url"
                      value={externalFileUrl}
                      onChange={(e) => setExternalFileUrl(e.target.value)}
                      placeholder="https://..."
                      className="font-mono text-sm"
                      autoComplete="off"
                      data-form-type="other"
                      data-testid="external-file-url-input"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the full URL to the external file
                    </p>
                  </div>

                  {externalFileUrl && (
                    <div className="pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(externalFileUrl, '_blank')}
                        data-testid="open-external-file-button"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open External File
                      </Button>
                    </div>
                  )}

                  <div className="pt-4">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Description (Optional)
                    </Label>
                    <ModernDocumentEditor
                      content={content}
                      onChange={setContent}
                      placeholder="Add a description of this external file..."
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="min-h-[300px] md:min-h-[500px]">
                <ModernDocumentEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Start writing your document content..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-80 bg-card border-t md:border-t-0 md:border-l border-border overflow-y-auto order-1 md:order-2">
          <div className="p-3 md:p-4 space-y-3 md:space-y-4">
            {/* Document Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Document Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Document Type Selector */}
                <div>
                  <Label className="text-sm">Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="text-sm" data-testid="document-type-selector">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => {
                        const IconComponent = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {DOCUMENT_TYPES.find(t => t.value === documentType)?.description}
                  </p>
                </div>

                {/* Folder Selector */}
                <div>
                  <Label className="text-sm">Folder</Label>
                  <Select 
                    value={folderId?.toString() || 'none'} 
                    onValueChange={(value) => setFolderId(value === 'none' ? null : parseInt(value))}
                  >
                    <SelectTrigger className="text-sm" data-testid="folder-selector">
                      <SelectValue placeholder="Select folder..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4" />
                          <span>No folder</span>
                        </div>
                      </SelectItem>
                      {folders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4" style={{ color: folder.color || undefined }} />
                            <span>{folder.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Team Selector */}
                <div>
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Team
                  </Label>
                  <Select 
                    value={teamId?.toString() || 'none'} 
                    onValueChange={(value) => setTeamId(value === 'none' ? null : parseInt(value))}
                  >
                    <SelectTrigger className="text-sm" data-testid="team-selector">
                      <SelectValue placeholder="No team assigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team assigned</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="category" className="text-sm">Categories</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Add category..."
                      className="text-sm"
                      autoComplete="off"
                      data-form-type="other"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCategory();
                        }
                      }}
                    />
                    <Button type="button" size="sm" onClick={addCategory}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat: string) => (
                      <Badge key={cat} variant="secondary" className="flex items-center gap-1">
                        {cat}
                        <X
                          className="h-3 w-3 cursor-pointer hover:bg-destructive hover:text-destructive-foreground rounded"
                          onClick={() => removeCategory(cat)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="status" className="text-sm">Status</Label>
                  <Select value={status} onValueChange={(value: 'draft' | 'published' | 'archived') => setStatus(value)}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="readingTime" className="text-sm">Est. Reading Time (minutes)</Label>
                  <Input
                    id="readingTime"
                    type="number"
                    value={estimatedReadingTime}
                    onChange={(e) => setEstimatedReadingTime(parseInt(e.target.value) || 5)}
                    min="1"
                    max="120"
                    className="text-sm"
                    autoComplete="off"
                    data-form-type="other"
                  />
                </div>
              </CardContent>
            </Card>

            {/* AI Writing Assistant - only show for content-based documents */}
            {documentType !== 'external_file_link' && (
              <AIComposePanel 
                onInsertContent={(newContent) => {
                  setContent(prev => prev ? `${prev}\n\n${newContent}` : newContent);
                }}
                currentContent={content}
              />
            )}

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    className="text-sm"
                    autoComplete="off"
                    data-form-type="other"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" size="sm" onClick={addTag}>
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer hover:bg-destructive hover:text-destructive-foreground rounded"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Document Info */}
            {document && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Document Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Created:</span>{' '}
                    {(document as any)?.createdAt ? new Date((document as any).createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span>{' '}
                    {(document as any)?.updatedAt ? new Date((document as any).updatedAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Words:</span>{' '}
                    {content.split(/\s+/).filter(word => word.length > 0).length}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DocumentFormWrapper>
  );
}