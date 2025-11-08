import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Search, Book, Tag, Star } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/auth';
import { DocumentFormWrapper } from '@/components/document-editor/DocumentFormWrapper';

const kbDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  documentType: z.string().default('general'),
  tags: z.array(z.string()).default([]),
  priority: z.number().min(1).max(5).default(1),
  isActive: z.boolean().default(true),
});

type KBDocumentForm = z.infer<typeof kbDocumentSchema>;

interface KBDocument {
  id: number;
  title: string;
  content: string;
  documentType: string;
  tags: string[];
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function KnowledgeBaseManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<KBDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [tagInput, setTagInput] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<KBDocumentForm>({
    resolver: zodResolver(kbDocumentSchema),
    defaultValues: {
      title: '',
      content: '',
      documentType: 'general',
      tags: [],
      priority: 1,
      isActive: true,
    },
  });

  // Fetch KB documents
  const { data: documents = [], isLoading } = useQuery<KBDocument[]>({
    queryKey: ['kb-documents'],
    queryFn: async () => {
      const response = await authService.authenticatedFetch('/api/ai/kb-documents');
      if (!response.ok) throw new Error('Failed to fetch KB documents');
      return response.json();
    },
  });

  // Create document mutation
  const createMutation = useMutation({
    mutationFn: async (data: KBDocumentForm) => {
      const response = await authService.authenticatedFetch('/api/ai/kb-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create document');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-documents'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: 'Success', description: 'KB document created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update document mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<KBDocumentForm> }) => {
      const response = await authService.authenticatedFetch(`/api/ai/kb-documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update document');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-documents'] });
      setEditingDocument(null);
      form.reset();
      toast({ title: 'Success', description: 'KB document updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await authService.authenticatedFetch(`/api/ai/kb-documents/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete document');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-documents'] });
      toast({ title: 'Success', description: 'KB document deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: KBDocumentForm) => {
    if (editingDocument) {
      updateMutation.mutate({ id: editingDocument.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (document: KBDocument) => {
    setEditingDocument(document);
    form.reset({
      title: document.title,
      content: document.content,
      documentType: document.documentType,
      tags: document.tags,
      priority: document.priority,
      isActive: document.isActive,
    });
    setIsCreateDialogOpen(true);
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const currentTags = form.getValues('tags');
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue('tags', [...currentTags, tagInput.trim()]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags');
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || doc.documentType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Knowledge Base Documents</h2>
          <p className="text-sm text-gray-600">Manage documents that provide context to AI responses</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingDocument(null);
              form.reset();
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Document
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DocumentFormWrapper>
            <DialogHeader>
              <DialogTitle>
                {editingDocument ? 'Edit KB Document' : 'Create KB Document'}
              </DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Document title" {...field} autoComplete="off" data-form-type="other" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Document content that will be included in AI context"
                          className="min-h-[200px]"
                          {...field}
                          autoComplete="off"
                          data-form-type="other"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="documentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="technical">Technical</SelectItem>
                            <SelectItem value="billing">Billing</SelectItem>
                            <SelectItem value="policy">Policy</SelectItem>
                            <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority (1-5)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="5" 
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                            autoComplete="off"
                            data-form-type="other"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      autoComplete="off"
                      data-form-type="other"
                    />
                    <Button type="button" onClick={handleAddTag} variant="outline">
                      <Tag className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {form.watch('tags').map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-gray-500 hover:text-gray-700"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Active</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingDocument ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </Form>
            </DocumentFormWrapper>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search documents..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="policy">Policy</SelectItem>
            <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents List */}
      {isLoading ? (
        <div className="text-center py-8">Loading documents...</div>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Book className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No documents found</p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4">
              Create your first document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filteredDocuments.map(document => (
            <Card key={document.id} className="border-l-4 border-l-blue-500">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium truncate">{document.title}</h3>
                      {!document.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
                      <Badge variant="outline" className="text-xs py-0">{document.documentType}</Badge>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {document.priority}
                      </div>
                      {document.tags.length > 0 && (
                        <div className="flex gap-1">
                          {document.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs py-0">
                              {tag}
                            </Badge>
                          ))}
                          {document.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs py-0">
                              +{document.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-700 line-clamp-2 mb-1">
                      {document.content}
                    </p>
                    
                    <div className="text-xs text-gray-500">
                      {new Date(document.createdAt).toLocaleDateString()}
                      {document.updatedAt !== document.createdAt && (
                        <span> • Updated {new Date(document.updatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(document)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(document.id)}
                      disabled={deleteMutation.isPending}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}