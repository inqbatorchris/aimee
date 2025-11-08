import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, 
  Plus, 
  Search, 
  FileText, 
  ExternalLink,
  Edit3,
  Trash2,
  Upload,
  FolderOpen,
  Calendar,
  Eye,
  EyeOff
} from 'lucide-react';

interface KBDocument {
  id: number;
  title: string;
  content: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  sourceUrl?: string;
  googleDriveId?: string;
  tags?: string[];
  priority: string;
  status: string;
  usageCount: number;
}

interface KBCategory {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
}

export default function CleanKBView() {
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<KBDocument | null>(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [draggedDocument, setDraggedDocument] = useState<KBDocument | null>(null);
  
  const { toast } = useToast();

  // New document form
  const [newDocument, setNewDocument] = useState({
    title: '',
    content: '',
    category: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [categoriesRes, articlesRes] = await Promise.all([
        fetch('/api/kb/categories'),
        fetch('/api/kb/articles')
      ]);
      
      if (categoriesRes.ok) {
        const { categories: cats } = await categoriesRes.json();
        setCategories(cats || []);
      }
      
      if (articlesRes.ok) {
        const { articles } = await articlesRes.json();
        setDocuments(articles || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Error loading documents', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDocumentClick = (document: KBDocument) => {
    setSelectedDocument(document);
    setIsDocumentModalOpen(true);
  };

  const handleDragStart = (document: KBDocument) => {
    setDraggedDocument(document);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetCategory: string) => {
    e.preventDefault();
    if (!draggedDocument) return;

    try {
      const response = await fetch(`/api/kb/articles/${draggedDocument.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: targetCategory })
      });

      if (response.ok) {
        toast({ title: 'Document moved successfully' });
        loadData();
      }
    } catch (error) {
      toast({ title: 'Error moving document', variant: 'destructive' });
    }
    setDraggedDocument(null);
  };

  const createNewDocument = async () => {
    try {
      const response = await fetch('/api/kb/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDocument,
          source: 'manual',
          isActive: true
        })
      });

      if (response.ok) {
        toast({ title: 'Document created successfully' });
        setIsAddModalOpen(false);
        setNewDocument({ title: '', content: '', category: '' });
        loadData();
      }
    } catch (error) {
      toast({ title: 'Error creating document', variant: 'destructive' });
    }
  };

  const toggleDocumentStatus = async (document: KBDocument) => {
    try {
      const response = await fetch(`/api/kb/articles/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !document.isActive })
      });

      if (response.ok) {
        toast({ title: `Document ${document.isActive ? 'deactivated' : 'activated'}` });
        loadData();
      }
    } catch (error) {
      toast({ title: 'Error updating document status', variant: 'destructive' });
    }
  };

  const deleteDocument = async (documentId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/kb/articles/${documentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({ title: 'Document deleted successfully' });
        setIsDocumentModalOpen(false);
        loadData();
      }
    } catch (error) {
      toast({ title: 'Error deleting document', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading knowledge base...</div>;
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          Knowledge Base Documents
        </CardTitle>
        
        {/* Search and controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.name.toLowerCase()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-20 flex flex-col items-center gap-2">
                    <FileText className="w-6 h-6" />
                    <span className="text-sm">New Article</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">Import from Google Drive</span>
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newDocument.title}
                      onChange={(e) => setNewDocument({...newDocument, title: e.target.value})}
                      placeholder="Document title"
                      autoComplete="off"
                      data-form-type="other"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={newDocument.category} onValueChange={(value) => setNewDocument({...newDocument, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.name.toLowerCase()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={newDocument.content}
                      onChange={(e) => setNewDocument({...newDocument, content: e.target.value})}
                      placeholder="Document content"
                      rows={4}
                      autoComplete="off"
                      data-form-type="other"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button type="button" onClick={createNewDocument} className="flex-1">
                    Create Document
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6">
        {/* Categories as drop zones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {categories.map(category => (
            <div
              key={category.id}
              className="border-2 border-dashed border-gray-200 rounded-lg p-4 min-h-[100px] transition-colors hover:border-blue-300"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, category.name.toLowerCase())}
            >
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{category.name}</span>
              </div>
              <p className="text-sm text-gray-600">{category.description}</p>
              <div className="text-xs text-gray-500 mt-1">
                {filteredDocuments.filter(doc => doc.category === category.name.toLowerCase()).length} documents
              </div>
            </div>
          ))}
        </div>

        {/* Document grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map(document => (
            <Card
              key={document.id}
              className={`cursor-pointer transition-all hover:shadow-md ${!document.isActive ? 'opacity-60' : ''}`}
              draggable
              onDragStart={() => handleDragStart(document)}
              onClick={() => handleDocumentClick(document)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-sm line-clamp-2">{document.title}</h3>
                  <div className="flex items-center gap-1 ml-2">
                    {document.isActive ? (
                      <Eye className="w-3 h-3 text-green-600" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-gray-400" />
                    )}
                    {document.originalUrl && (
                      <ExternalLink className="w-3 h-3 text-blue-600" />
                    )}
                  </div>
                </div>
                
                <p className="text-xs text-gray-600 line-clamp-3 mb-3">
                  {document.content}
                </p>
                
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {document.category}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(document.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No documents found</p>
          </div>
        )}
      </CardContent>

      {/* Document Detail Modal */}
      <Dialog open={isDocumentModalOpen} onOpenChange={setIsDocumentModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedDocument && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedDocument.title}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleDocumentStatus(selectedDocument)}
                    >
                      {selectedDocument.isActive ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit3 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => deleteDocument(selectedDocument.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {selectedDocument.originalUrl && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                      <a 
                        href={selectedDocument.originalUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Original Document
                      </a>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Category:</span>
                    <Badge variant="secondary" className="ml-2">
                      {selectedDocument.category}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <Badge variant={selectedDocument.isActive ? "default" : "secondary"} className="ml-2">
                      {selectedDocument.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>
                    <span className="ml-2 text-gray-600">
                      {new Date(selectedDocument.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span>
                    <span className="ml-2 text-gray-600">
                      {new Date(selectedDocument.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Content:</h4>
                  <div className="p-4 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                    {selectedDocument.content}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}