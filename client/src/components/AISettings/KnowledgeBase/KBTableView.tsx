import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  Search
} from 'lucide-react';

interface KBCategory {
  id: number;
  name: string;
  description: string;
  parentId: number | null;
  path: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
  children?: KBCategory[];
  articleCount?: number;
}

interface KBArticle {
  id: number;
  title: string;
  content: string;
  categoryId: number;
  tags: string[];
  priority: string;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EditingItem {
  type: 'category' | 'article';
  id: number | 'new';
  data: Partial<KBCategory | KBArticle>;
}

export default function KBTableView() {
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<EditingItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [categoriesRes, articlesRes] = await Promise.all([
        fetch('/api/kb/categories'),
        fetch('/api/kb/articles')
      ]);

      if (categoriesRes.ok) {
        const { categories: cats } = await categoriesRes.json();
        setCategories(buildCategoryTree(cats));
      }

      if (articlesRes.ok) {
        const { articles: arts } = await articlesRes.json();
        setArticles(arts);
      }
    } catch (error) {
      toast({ title: 'Error loading data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const buildCategoryTree = (flatCategories: KBCategory[]): KBCategory[] => {
    const categoryMap = new Map();
    const rootCategories: KBCategory[] = [];

    // Create map and add children arrays
    flatCategories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Build tree structure
    flatCategories.forEach(cat => {
      const category = categoryMap.get(cat.id);
      if (cat.parentId === null) {
        rootCategories.push(category);
      } else {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(category);
        }
      }
    });

    return rootCategories.sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const startEditing = (type: 'category' | 'article', item?: KBCategory | KBArticle) => {
    if (item) {
      setEditing({ type, id: item.id, data: { ...item } });
    } else {
      setEditing({ 
        type, 
        id: 'new', 
        data: type === 'category' 
          ? { name: '', description: '', parentId: null, level: 0 }
          : { title: '', content: '', categoryId: categories[0]?.id || 1, priority: 'standard', tags: [] }
      });
    }
  };

  const saveItem = async () => {
    if (!editing) return;

    try {
      const endpoint = editing.type === 'category' ? '/api/kb/categories' : '/api/kb/articles';
      const method = editing.id === 'new' ? 'POST' : 'PATCH';
      const url = editing.id === 'new' ? endpoint : `${endpoint}/${editing.id}`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing.data)
      });

      if (response.ok) {
        toast({ title: `${editing.type} saved successfully` });
        setEditing(null);
        loadData();
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      toast({ title: 'Error saving', variant: 'destructive' });
    }
  };

  const deleteItem = async (type: 'category' | 'article', id: number) => {
    try {
      const endpoint = type === 'category' ? '/api/kb/categories' : '/api/kb/articles';
      const response = await fetch(`${endpoint}/${id}`, { method: 'DELETE' });

      if (response.ok) {
        toast({ title: `${type} deleted successfully` });
        loadData();
      }
    } catch (error) {
      toast({ title: 'Error deleting', variant: 'destructive' });
    }
  };

  const renderCategoryRow = (category: KBCategory, depth = 0) => {
    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = category.children && category.children.length > 0;
    const isEditing = editing?.type === 'category' && editing.id === category.id;
    const articleCount = articles.filter(a => a.categoryId === category.id).length;

    const rows = [];

    // Category row
    rows.push(
      <TableRow key={`cat-${category.id}`} className="bg-gray-50">
        <TableCell className="py-2" style={{ paddingLeft: `${depth * 24 + 12}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-6 w-6"
                onClick={() => toggleCategory(category.id)}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            ) : (
              <div className="w-6" />
            )}
            {isExpanded ? <FolderOpen className="w-4 h-4 text-blue-600" /> : <Folder className="w-4 h-4 text-blue-600" />}
            {isEditing ? (
              <Input
                value={editing.data.name || ''}
                onChange={(e) => setEditing({ ...editing, data: { ...editing.data, name: e.target.value } })}
                className="h-7 text-sm font-medium"
                autoFocus
              />
            ) : (
              <span className="font-medium text-sm">{category.name}</span>
            )}
          </div>
        </TableCell>
        <TableCell className="py-2">
          {isEditing ? (
            <Input
              value={editing.data.description || ''}
              onChange={(e) => setEditing({ ...editing, data: { ...editing.data, description: e.target.value } })}
              className="h-7 text-sm"
              placeholder="Category description"
            />
          ) : (
            <span className="text-sm text-gray-600">{category.description}</span>
          )}
        </TableCell>
        <TableCell className="py-2">
          <Badge variant="outline" className="text-xs">
            {articleCount} articles
          </Badge>
        </TableCell>
        <TableCell className="py-2">
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={saveItem}>
                  <Save className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(null)}>
                  <X className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEditing('category', category)}>
                  <Edit3 className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteItem('category', category.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEditing('article')}>
                  <Plus className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    );

    // Articles in this category (when expanded)
    if (isExpanded) {
      const categoryArticles = articles.filter(a => a.categoryId === category.id);
      categoryArticles.forEach(article => {
        const isEditingArticle = editing?.type === 'article' && editing.id === article.id;
        
        rows.push(
          <TableRow key={`art-${article.id}`}>
            <TableCell className="py-2" style={{ paddingLeft: `${depth * 24 + 48}px` }}>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                {isEditingArticle ? (
                  <Input
                    value={editing.data.title || ''}
                    onChange={(e) => setEditing({ ...editing, data: { ...editing.data, title: e.target.value } })}
                    className="h-7 text-sm"
                    autoFocus
                  />
                ) : (
                  <span className="text-sm">{article.title}</span>
                )}
              </div>
            </TableCell>
            <TableCell className="py-2">
              {isEditingArticle ? (
                <Input
                  value={editing.data.content || ''}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, content: e.target.value } })}
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
              <div className="flex gap-1">
                <Badge variant={article.priority === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                  {article.priority}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {article.usageCount} uses
                </Badge>
              </div>
            </TableCell>
            <TableCell className="py-2">
              <div className="flex items-center gap-1">
                {isEditingArticle ? (
                  <>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={saveItem}>
                      <Save className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(null)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEditing('article', article)}>
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteItem('article', article.id)}>
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

    // Child categories
    if (isExpanded && hasChildren) {
      category.children?.forEach(child => {
        rows.push(...renderCategoryRow(child, depth + 1));
      });
    }

    return rows;
  };

  const filteredCategories = searchTerm 
    ? categories.filter(cat => 
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : categories;

  if (isLoading) {
    return <div className="p-4">Loading knowledge base...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header with search and add buttons */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search categories and articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => startEditing('category')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Knowledge Base Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/3">Name</TableHead>
              <TableHead className="w-1/3">Description/Content</TableHead>
              <TableHead className="w-1/6">Info</TableHead>
              <TableHead className="w-1/6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.length > 0 ? (
              filteredCategories.map(category => renderCategoryRow(category))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  No categories found. Create your first category to get started.
                </TableCell>
              </TableRow>
            )}
            
            {/* New item row */}
            {editing?.id === 'new' && (
              <TableRow className="bg-blue-50">
                <TableCell className="py-2">
                  <div className="flex items-center gap-2" style={{ paddingLeft: '12px' }}>
                    {editing.type === 'category' ? (
                      <Folder className="w-4 h-4 text-blue-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-gray-500" />
                    )}
                    <Input
                      value={editing.data.name || editing.data.title || ''}
                      onChange={(e) => setEditing({ 
                        ...editing, 
                        data: { 
                          ...editing.data, 
                          ...(editing.type === 'category' ? { name: e.target.value } : { title: e.target.value })
                        } 
                      })}
                      className="h-7 text-sm"
                      placeholder={editing.type === 'category' ? 'Category name' : 'Article title'}
                      autoFocus
                    />
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <Input
                    value={editing.data.description || editing.data.content || ''}
                    onChange={(e) => setEditing({ 
                      ...editing, 
                      data: { 
                        ...editing.data, 
                        ...(editing.type === 'category' ? { description: e.target.value } : { content: e.target.value })
                      } 
                    })}
                    className="h-7 text-sm"
                    placeholder={editing.type === 'category' ? 'Category description' : 'Article content'}
                  />
                </TableCell>
                <TableCell className="py-2">
                  {editing.type === 'article' && (
                    <Select 
                      value={String(editing.data.priority || 'standard')}
                      onValueChange={(value) => setEditing({ ...editing, data: { ...editing.data, priority: value } })}
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
                  )}
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={saveItem}>
                      <Save className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(null)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}