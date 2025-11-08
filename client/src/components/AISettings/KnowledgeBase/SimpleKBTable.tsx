import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Folder, 
  FolderOpen, 
  Plus, 
  Edit3, 
  Save, 
  X, 
  Trash2,
  Search,
  BookOpen
} from 'lucide-react';

interface KBCategory {
  id: number;
  name: string;
  description: string;
  parentId: number | null;
  isActive: boolean;
  createdBy: number;
  updatedBy: number;
  createdAt: string;
  updatedAt: string;
}

interface KBArticle {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  priority: string;
  status: string;
  usageCount: number;
  isActive: boolean;
  createdBy: number;
  updatedBy: number;
  reviewedBy: number | null;
  reviewedAt: string | null;
  lastAccessedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryGroup {
  id: number;
  name: string;
  description?: string;
  articles: KBArticle[];
  expanded: boolean;
  isEditing: boolean;
}

export default function SimpleKBTable() {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [editingArticle, setEditingArticle] = useState<KBArticle | null>(null);
  const [editingCategory, setEditingCategory] = useState<KBCategory | null>(null);
  const [newArticle, setNewArticle] = useState<Partial<KBArticle> | null>(null);
  const [newCategory, setNewCategory] = useState<Partial<KBCategory> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const defaultCategories = [
    { value: 'equipment', label: 'Equipment', description: 'Hardware guides and specifications' },
    { value: 'troubleshooting', label: 'Troubleshooting', description: 'Problem resolution procedures' },
    { value: 'billing', label: 'Billing', description: 'Payment and account management' },
    { value: 'procedures', label: 'Installation', description: 'Setup and configuration guides' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    groupArticlesByCategory();
  }, [articles, categories]);

  const loadData = async () => {
    try {
      const [articlesRes, categoriesRes] = await Promise.all([
        fetch('/api/kb/articles'),
        fetch('/api/kb/categories')
      ]);
      
      if (articlesRes.ok) {
        const { articles } = await articlesRes.json();
        setArticles(articles || []);
      }
      
      if (categoriesRes.ok) {
        const { categories: cats } = await categoriesRes.json();
        if (cats && cats.length > 0) {
          setCategories(cats);
        } else {
          // Create default categories if database is empty
          await createDefaultCategories();
        }
      } else {
        console.error('Failed to fetch categories:', categoriesRes.status);
        await createDefaultCategories();
      }
    } catch (error) {
      console.error('Error loading knowledge base data:', error);
      await createDefaultCategories();
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultCategories = async () => {
    try {
      const createdCategories = [];
      for (const cat of defaultCategories) {
        try {
          const response = await fetch('/api/kb/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: cat.label,
              description: cat.description,
              parentId: null,
              isActive: true,
              createdBy: 1,
              updatedBy: 1
            })
          });
          
          if (response.ok) {
            const newCategory = await response.json();
            createdCategories.push(newCategory);
          }
        } catch (createError) {
          console.error('Error creating category:', createError);
        }
      }
      
      if (createdCategories.length > 0) {
        setCategories(createdCategories);
      } else {
        // Fallback to local categories if creation fails
        setCategories(defaultCategories.map((cat, index) => ({
          id: index + 1,
          name: cat.label,
          description: cat.description,
          parentId: null,
          isActive: true,
          createdBy: 1,
          updatedBy: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })));
      }
    } catch (error) {
      console.error('Error in createDefaultCategories:', error);
      setCategories(defaultCategories.map((cat, index) => ({
        id: index + 1,
        name: cat.label,
        description: cat.description,
        parentId: null,
        isActive: true,
        createdBy: 1,
        updatedBy: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })));
    }
  };

  const groupArticlesByCategory = () => {
    const groups: CategoryGroup[] = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      articles: articles.filter(article => article.category === cat.name.toLowerCase()),
      expanded: true,
      isEditing: false
    }));
    setCategoryGroups(groups);
  };

  const toggleCategory = (categoryName: string) => {
    setCategoryGroups(groups =>
      groups.map(group =>
        group.name === categoryName
          ? { ...group, expanded: !group.expanded }
          : group
      )
    );
  };

  const startEdit = (article: KBArticle) => {
    setEditingArticle({ ...article });
    setNewArticle(null);
  };

  const startNew = (categoryId: number, categoryName: string) => {
    setNewArticle({
      title: '',
      content: '',
      category: categoryName.toLowerCase(),
      priority: 'standard',
      status: 'draft',
      tags: []
    });
    setEditingArticle(null);
  };

  const startEditCategory = (category: CategoryGroup) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      description: category.description || '',
      parentId: null,
      isActive: true,
      createdBy: 1,
      updatedBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setEditingArticle(null);
    setNewArticle(null);
  };

  const saveArticle = async () => {
    try {
      if (editingArticle) {
        // Update existing article
        const response = await fetch(`/api/kb/articles/${editingArticle.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editingArticle.title,
            content: editingArticle.content,
            priority: editingArticle.priority,
            tags: editingArticle.tags
          })
        });

        if (response.ok) {
          toast({ title: 'Article updated successfully' });
          setEditingArticle(null);
          loadData();
        }
      } else if (newArticle) {
        // Create new article
        const response = await fetch('/api/kb/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newArticle)
        });

        if (response.ok) {
          toast({ title: 'Article created successfully' });
          setNewArticle(null);
          loadData();
        }
      }
    } catch (error) {
      toast({ title: 'Error saving article', variant: 'destructive' });
    }
  };

  const saveCategory = async () => {
    try {
      if (editingCategory) {
        const response = await fetch(`/api/kb/categories/${editingCategory.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editingCategory.name,
            description: editingCategory.description
          })
        });

        if (response.ok) {
          toast({ title: 'Category updated successfully' });
          setEditingCategory(null);
          loadData();
        }
      }
    } catch (error) {
      toast({ title: 'Error saving category', variant: 'destructive' });
    }
  };

  const deleteArticle = async (id: number) => {
    try {
      const response = await fetch(`/api/kb/articles/${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast({ title: 'Article deleted successfully' });
        loadData();
      }
    } catch (error) {
      toast({ title: 'Error deleting article', variant: 'destructive' });
    }
  };

  const cancelEdit = () => {
    setEditingArticle(null);
    setEditingCategory(null);
    setNewArticle(null);
    setNewCategory(null);
  };

  const filteredGroups = searchTerm
    ? categoryGroups.map(group => ({
        ...group,
        articles: group.articles.filter(article =>
          article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          article.content.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(group => group.articles.length > 0)
    : categoryGroups;

  if (isLoading) {
    return <div className="p-4">Loading knowledge base...</div>;
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          Knowledge Base
        </CardTitle>
        
        {/* Search and controls */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Title</TableHead>
                <TableHead className="w-1/4">Content</TableHead>
                <TableHead className="w-1/6">Status/Priority</TableHead>
                <TableHead className="w-1/6">Metadata</TableHead>
                <TableHead className="w-1/6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.map(group => {
                const rows = [];
                
                // Category Header
                const isCategoryEditing = editingCategory?.id === group.id;
                
                rows.push(
                  <TableRow key={`cat-${group.name}`} className="bg-gray-50 hover:bg-gray-100">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-6 w-6"
                          onClick={() => toggleCategory(group.name)}
                        >
                          {group.expanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                        {group.expanded ? (
                          <FolderOpen className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Folder className="w-4 h-4 text-blue-600" />
                        )}
                        {isCategoryEditing ? (
                          <Input
                            value={editingCategory.name}
                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                            className="h-7 text-sm font-medium"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium">{group.name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {isCategoryEditing ? (
                        <Input
                          value={editingCategory.description || ''}
                          onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                          className="h-7 text-sm"
                          placeholder="Category description"
                        />
                      ) : (
                        <div className="space-y-1">
                          <span className="text-sm text-gray-600">
                            {group.articles.length} articles
                          </span>
                          {group.description && (
                            <div className="text-xs text-gray-500">
                              {group.description}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline">{group.name}</Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1">
                        {isCategoryEditing ? (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={saveCategory}>
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEdit}>
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0"
                              onClick={() => startEditCategory(group)}
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0"
                              onClick={() => startNew(group.id, group.name)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="text-xs text-gray-600">
                        Category
                      </div>
                    </TableCell>
                  </TableRow>
                );

                // Articles in category
                if (group.expanded) {
                  group.articles.forEach(article => {
                    const isEditing = editingArticle?.id === article.id;
                    
                    rows.push(
                      <TableRow key={`art-${article.id}`}>
                        <TableCell className="py-2 pl-12">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            {isEditing ? (
                              <Input
                                value={editingArticle.title}
                                onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                                className="h-7 text-sm"
                                autoFocus
                              />
                            ) : (
                              <span className="text-sm">{article.title}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          {isEditing ? (
                            <Input
                              value={editingArticle.content}
                              onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                              className="h-7 text-sm"
                              placeholder="Article content"
                            />
                          ) : (
                            <span className="text-sm text-gray-600 truncate">
                              {article.content?.substring(0, 100)}...
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          {isEditing ? (
                            <div className="space-y-1">
                              <Select 
                                value={editingArticle.priority}
                                onValueChange={(value) => setEditingArticle({ ...editingArticle, priority: value })}
                              >
                                <SelectTrigger className="h-7 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="critical">Critical</SelectItem>
                                  <SelectItem value="standard">Standard</SelectItem>
                                  <SelectItem value="reference">Reference</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select 
                                value={editingArticle.status || 'draft'}
                                onValueChange={(value) => setEditingArticle({ ...editingArticle, status: value })}
                              >
                                <SelectTrigger className="h-7 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="review">Review</SelectItem>
                                  <SelectItem value="published">Published</SelectItem>
                                  <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-1">
                                <Badge variant={article.priority === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                                  {article.priority}
                                </Badge>
                                <Badge variant={article.status === 'published' ? 'default' : 'outline'} className="text-xs">
                                  {article.status || 'draft'}
                                </Badge>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {article.usageCount} uses
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>v{article.version || 1}</div>
                            <div>{new Date(article.createdAt).toLocaleDateString()}</div>
                            <div>by User {article.createdBy || 1}</div>
                            {article.lastAccessedAt && (
                              <div className="text-xs text-gray-400">
                                Last: {new Date(article.lastAccessedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1">
                            {isEditing ? (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={saveArticle}>
                                  <Save className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEdit}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(article)}>
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteArticle(article.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  });
                }

                // New article row
                if (newArticle && newArticle.category === group.name.toLowerCase()) {
                  rows.push(
                    <TableRow key={`new-${group.name}`} className="bg-blue-50">
                      <TableCell className="py-2 pl-12">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <Input
                            value={newArticle.title || ''}
                            onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                            className="h-7 text-sm"
                            placeholder="Article title"
                            autoFocus
                          />
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          value={newArticle.content || ''}
                          onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                          className="h-7 text-sm"
                          placeholder="Article content"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Select 
                          value={newArticle.priority || 'standard'}
                          onValueChange={(value) => setNewArticle({ ...newArticle, priority: value })}
                        >
                          <SelectTrigger className="h-7 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="reference">Reference</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={saveArticle}>
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEdit}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                return rows;
              }).flat()}

              {filteredGroups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    No articles found. Create your first article to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}