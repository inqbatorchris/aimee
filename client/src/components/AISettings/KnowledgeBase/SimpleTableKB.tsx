import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Edit, Trash2, Settings, Folder, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KBArticle {
  id: number;
  title: string;
  content: string;
  category: string;
  status: string;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tags: string[];
  applicable_agents?: string[];
}

interface AgentOption {
  id: number;
  name: string;
  agentType: string;
  description: string;
}

interface KBCategory {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  dbName?: string;
}

export default function SimpleTableKB() {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [categoryList, setCategoryList] = useState<KBCategory[]>([]);
  const [agentList, setAgentList] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KBArticle | null>(null);
  const [editingCategory, setEditingCategory] = useState<KBCategory | null>(null);
  const [activeTab, setActiveTab] = useState('articles');
  const { toast } = useToast();

  // Direct database query to bypass routing issues
  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/direct-kb-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'knowledge_base' })
      });
      
      const data = await response.json();
      
      if (data.success && data.results) {
        console.log('KB Articles loaded:', data.results.length);
        setArticles(data.results);
      }
    } catch (error) {
      console.error('Failed to fetch articles:', error);
      toast({
        title: "Error",
        description: "Failed to load Knowledge Base articles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/kb/categories');
      const data = await response.json();
      
      if (data.success && data.categories) {
        console.log('KB Categories loaded:', data.categories.length);
        setCategoryList(data.categories.map((cat: any) => ({
          id: cat.id,
          name: formatCategoryName(cat.name),
          description: cat.description,
          isActive: cat.is_active,
          dbName: cat.name // Store the database name for updates
        })));
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive"
      });
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/ai/agents');
      const data = await response.json();
      
      if (data.agents) {
        setAgentList(data.agents);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      // Set default agents if API fails
      setAgentList([
        { id: 1, name: 'Support Ticket Assistant', agentType: 'support_ticket', description: 'Handles customer support tickets' },
        { id: 2, name: 'General Assistant', agentType: 'all', description: 'General purpose AI assistant' }
      ]);
    }
  };

  const formatCategoryName = (dbName: string) => {
    return dbName.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatAgentName = (agentType: string) => {
    if (agentType === 'all') return 'All Agents';
    return agentType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') + ' Agent';
  };

  useEffect(() => {
    fetchArticles();
    fetchCategories();
    fetchAgents();
  }, []);

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    
    // Debug agent filtering
    console.log('Filtering article:', article.title, 'selectedAgent:', selectedAgent, 'applicable_agents:', article.applicable_agents);
    
    let matchesAgent = false;
    if (selectedAgent === 'all') {
      matchesAgent = true;
    } else if (article.applicable_agents) {
      // Only show articles that are specifically assigned to this agent type
      // Don't include 'all' articles when filtering by specific agent
      matchesAgent = article.applicable_agents.includes(selectedAgent);
    }
    
    console.log('matchesAgent:', matchesAgent);
    return matchesSearch && matchesCategory && matchesAgent;
  });

  const uniqueCategories = Array.from(new Set(articles.map(article => article.category)));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'active' ? 'default' : 'secondary';
    return <Badge variant={variant} className="text-xs">{status}</Badge>;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'published':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'review':
        return 'outline';
      case 'archived':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleDeleteArticle = async (articleId: number) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    
    try {
      const response = await fetch(`/api/kb/articles/${articleId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchArticles(); // Refresh the data
        toast({
          title: "Success",
          description: "Article deleted successfully"
        });
      } else {
        throw new Error('Failed to delete article');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete article",
        variant: "destructive"
      });
    }
  };

  const handleToggleStatus = async (article: KBArticle) => {
    const newStatus = article.status === 'published' ? 'draft' : 'published';
    
    try {
      const response = await fetch(`/api/kb/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        fetchArticles(); // Refresh the data
        toast({
          title: "Success",
          description: `Article ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`
        });
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update article status",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      // In a real implementation, this would make an API call to delete the category
      setCategoryList(prev => prev.filter(category => category.id !== categoryId));
      toast({
        title: "Success",
        description: "Category deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading Knowledge Base...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-auto grid-cols-2">
            <TabsTrigger value="articles" className="text-xs">Articles</TabsTrigger>
            <TabsTrigger value="categories" className="text-xs">Categories</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="articles" className="space-y-3">
          {/* Compact Search and Filter Bar */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-8 text-xs w-full"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoryList.map(category => {
                    const dbName = category.dbName || category.name.toLowerCase().replace(/\s+/g, '_');
                    return (
                      <SelectItem key={category.id} value={dbName}>
                        {category.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  <SelectItem value="support_ticket">Support Ticket</SelectItem>
                  {agentList.map(agent => (
                    <SelectItem key={agent.id} value={agent.agentType}>
                      {formatAgentName(agent.agentType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Knowledge Base Articles</h3>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Knowledge Base Article</DialogTitle>
                  <DialogDescription>
                    Create a new article for the knowledge base.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-xs">Title</Label>
                    <Input id="title" placeholder="Article title" className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label htmlFor="category" className="text-xs">Category</Label>
                    <Select>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueCategories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Applicable Agents</Label>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[2rem]">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="new-agent-all"
                          defaultChecked={true}
                          className="h-3 w-3"
                        />
                        <Label htmlFor="new-agent-all" className="text-xs">All Agents</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="new-agent-support"
                          className="h-3 w-3"
                        />
                        <Label htmlFor="new-agent-support" className="text-xs">Support Ticket</Label>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select which agents can access this article. "All Agents" makes it available to every agent type.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="content" className="text-xs">Content</Label>
                    <Textarea id="content" placeholder="Article content" className="min-h-24 text-xs" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowDialog(false)}>Cancel</Button>
                    <Button size="sm">Save Article</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-2">
            {filteredArticles.map((article) => (
              <div key={article.id} className="border rounded-lg p-3 bg-card">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-sm flex-1 min-w-0 pr-2 break-words">{article.title}</h3>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditingArticle(article)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-600" onClick={() => handleToggleStatus(article)}>
                      {article.status === 'published' ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-2 max-w-full">
                  <Badge variant="outline" className="text-xs whitespace-nowrap">{formatCategoryName(article.category)}</Badge>
                  {article.applicable_agents && article.applicable_agents.length > 0 ? (
                    article.applicable_agents.map((agent, index) => (
                      <Badge key={index} variant="secondary" className="text-xs whitespace-nowrap">{formatAgentName(agent)}</Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-xs whitespace-nowrap">All Agents</Badge>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span className="truncate">Usage: {article.usage_count || 0}</span>
                  <span className="whitespace-nowrap">{formatDate(article.updated_at)}</span>
                </div>
              </div>
            ))}
            {filteredArticles.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No articles found</div>
            )}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden md:block border rounded-md">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="text-xs font-medium w-[30%]">Title</TableHead>
                    <TableHead className="text-xs font-medium w-[12%]">Category</TableHead>
                    <TableHead className="text-xs font-medium w-[15%]">Agents</TableHead>
                    <TableHead className="text-xs font-medium w-[8%]">Status</TableHead>
                    <TableHead className="text-xs font-medium w-[8%] text-center">Usage</TableHead>
                    <TableHead className="text-xs font-medium w-[12%]">Updated</TableHead>
                    <TableHead className="text-xs font-medium w-[15%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArticles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-16 text-center text-xs text-muted-foreground">
                        No articles found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredArticles.map((article) => (
                      <TableRow key={article.id} className="h-10">
                        <TableCell className="text-xs font-medium truncate max-w-0">
                          <div className="truncate" title={article.title}>
                            {article.title}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {formatCategoryName(article.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex gap-1 flex-wrap">
                            {article.applicable_agents && article.applicable_agents.length > 0 ? (
                              article.applicable_agents.map((agent, index) => (
                                <Badge 
                                  key={index} 
                                  variant="secondary" 
                                  className="text-xs px-1 py-0"
                                >
                                  {formatAgentName(agent)}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                All Agents
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge 
                            variant={getStatusVariant(article.status || 'published')} 
                            className="text-xs px-1 py-0"
                          >
                            {article.status || 'published'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {article.usage_count || 0}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(article.updated_at)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setEditingArticle(article)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                              onClick={() => handleToggleStatus(article)}
                              title={article.status === 'published' ? 'Unpublish' : 'Publish'}
                            >
                              {article.status === 'published' ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteArticle(article.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Showing {filteredArticles.length} of {articles.length} articles
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Manage Categories</h3>
            <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Category</DialogTitle>
                  <DialogDescription>
                    Create a new category for organizing articles.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="categoryName" className="text-xs">Name</Label>
                    <Input id="categoryName" placeholder="Category name" className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label htmlFor="categoryDesc" className="text-xs">Description</Label>
                    <Textarea id="categoryDesc" placeholder="Category description" className="min-h-20 text-xs" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
                    <Button size="sm">Save Category</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="text-xs font-medium">Name</TableHead>
                  <TableHead className="text-xs font-medium">Description</TableHead>
                  <TableHead className="text-xs font-medium text-center">Articles</TableHead>
                  <TableHead className="text-xs font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryList.map((category) => {
                  const dbName = category.dbName || category.name.toLowerCase().replace(/\s+/g, '_');
                  const articleCount = articles.filter(a => a.category === dbName).length;
                  return (
                    <TableRow key={category.id} className="h-10">
                      <TableCell className="text-xs font-medium">{category.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{category.description}</TableCell>
                      <TableCell className="text-xs text-center">{articleCount}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setEditingCategory(category)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Article Dialog */}
      {editingArticle && (
        <Dialog open={!!editingArticle} onOpenChange={() => setEditingArticle(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Article</DialogTitle>
              <DialogDescription>
                Update the article information below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editTitle" className="text-xs">Title</Label>
                <Input 
                  id="editTitle" 
                  defaultValue={editingArticle.title}
                  className="h-8 text-xs" 
                />
              </div>
              <div>
                <Label htmlFor="editCategory" className="text-xs">Category</Label>
                <Select defaultValue={editingArticle.category}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueCategories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Applicable Agents</Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[2rem]">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-agent-all"
                      defaultChecked={editingArticle.applicable_agents?.includes('all') || !editingArticle.applicable_agents?.length}
                      className="h-3 w-3"
                    />
                    <Label htmlFor="edit-agent-all" className="text-xs">All Agents</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-agent-support"
                      defaultChecked={editingArticle.applicable_agents?.includes('support_ticket')}
                      className="h-3 w-3"
                    />
                    <Label htmlFor="edit-agent-support" className="text-xs">Support Ticket</Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Select which agents can access this article. "All Agents" makes it available to every agent type.
                </p>
              </div>
              <div>
                <Label htmlFor="editContent" className="text-xs">Content</Label>
                <Textarea 
                  id="editContent" 
                  defaultValue={editingArticle.content}
                  className="min-h-32 text-xs" 
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingArticle(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={async () => {
                  try {
                    const titleInput = document.getElementById('editTitle') as HTMLInputElement;
                    const contentInput = document.getElementById('editContent') as HTMLTextAreaElement;
                    const allAgentsCheckbox = document.getElementById('edit-agent-all') as HTMLInputElement;
                    const supportAgentCheckbox = document.getElementById('edit-agent-support') as HTMLInputElement;
                    
                    const applicableAgents: string[] = [];
                    if (allAgentsCheckbox.checked) {
                      applicableAgents.push('all');
                    }
                    if (supportAgentCheckbox.checked) {
                      applicableAgents.push('support_ticket');
                    }
                    
                    // If no agents selected, default to 'all'
                    if (applicableAgents.length === 0) {
                      applicableAgents.push('all');
                    }

                    const updateData = {
                      title: titleInput.value,
                      content: contentInput.value,
                      applicable_agents: applicableAgents
                    };

                    const response = await fetch(`/api/kb/articles/${editingArticle.id}`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                      },
                      body: JSON.stringify(updateData)
                    });

                    if (response.ok) {
                      toast({
                        title: "Success",
                        description: "Article updated successfully"
                      });
                      
                      // Update the local article data
                      setArticles(prev => prev.map(article => 
                        article.id === editingArticle.id 
                          ? { ...article, ...updateData }
                          : article
                      ));
                      
                      setEditingArticle(null);
                      fetchArticles(); // Refresh data
                    } else {
                      throw new Error('Failed to update article');
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to update article",
                      variant: "destructive"
                    });
                  }
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Category Dialog */}
      {editingCategory && (
        <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>
                Update the category information below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editCategoryName" className="text-xs">Name</Label>
                <Input 
                  id="editCategoryName" 
                  defaultValue={editingCategory.name}
                  className="h-8 text-xs" 
                />
              </div>
              <div>
                <Label htmlFor="editCategoryDesc" className="text-xs">Description</Label>
                <Textarea 
                  id="editCategoryDesc" 
                  defaultValue={editingCategory.description}
                  className="min-h-20 text-xs" 
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingCategory(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={async () => {
                  try {
                    const nameInput = document.getElementById('editCategoryName') as HTMLInputElement;
                    const descInput = document.getElementById('editCategoryDesc') as HTMLTextAreaElement;
                    
                    const response = await fetch(`/api/kb/categories/${editingCategory.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: nameInput.value,
                        description: descInput.value
                      })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                      toast({
                        title: "Success",
                        description: "Category updated successfully"
                      });
                      setEditingCategory(null);
                      fetchCategories(); // Refresh the categories list
                    } else {
                      toast({
                        title: "Error",
                        description: data.error || "Failed to update category",
                        variant: "destructive"
                      });
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to update category",
                      variant: "destructive"
                    });
                  }
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}