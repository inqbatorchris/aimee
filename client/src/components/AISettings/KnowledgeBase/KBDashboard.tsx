import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Plus, Search, Upload, Router, Wrench, HelpCircle, FileText, Eye, Edit, Trash2, Tag } from 'lucide-react';

interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  priority: 'critical' | 'standard' | 'reference';
  usageCount: number;
  lastUpdated: string;
  isActive: boolean;
}

interface KBCategory {
  id: string;
  name: string;
  description: string;
  articleCount: number;
  icon: string;
}

export default function KBDashboard() {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [categories, setCategories] = useState<KBCategory[]>([
    { id: 'equipment', name: 'Equipment Guides', description: 'Router models, modem specs, hardware setup', articleCount: 0, icon: 'Router' },
    { id: 'troubleshooting', name: 'Troubleshooting', description: 'Diagnostic procedures and problem resolution', articleCount: 0, icon: 'Wrench' },
    { id: 'procedures', name: 'Service Procedures', description: 'Installation guides, maintenance schedules', articleCount: 0, icon: 'FileText' },
    { id: 'faq', name: 'FAQ Database', description: 'Common customer questions and approved responses', articleCount: 0, icon: 'HelpCircle' }
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  const loadKnowledgeBase = async () => {
    try {
      const response = await fetch('/api/kb/articles');
      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
        
        // Update category counts
        const categoryMap = new Map();
        data.articles?.forEach((article: KBArticle) => {
          categoryMap.set(article.category, (categoryMap.get(article.category) || 0) + 1);
        });
        
        setCategories(prev => prev.map(cat => ({
          ...cat,
          articleCount: categoryMap.get(cat.id) || 0
        })));
      }
    } catch (error) {
      console.error('Failed to load knowledge base:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const createNewArticle = () => {
    // This would open an article editor modal/page
    toast({
      title: 'Article Editor',
      description: 'Article editor would open here',
    });
  };

  const importContent = () => {
    // This would open an import dialog
    toast({
      title: 'Import Content',
      description: 'Bulk import functionality would open here',
    });
  };

  const getIconComponent = (iconName: string) => {
    const icons: any = { Router, Wrench, FileText, HelpCircle };
    const IconComponent = icons[iconName] || BookOpen;
    return <IconComponent className="w-5 h-5" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'standard': return 'bg-blue-100 text-blue-800';
      case 'reference': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Knowledge Base Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Knowledge Base Dashboard
          </CardTitle>
          <CardDescription>
            Manage your AI training content for equipment guides, troubleshooting procedures, and FAQ responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{articles.length}</div>
              <div className="text-sm text-gray-600">Total Articles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{categories.reduce((sum, cat) => sum + cat.articleCount, 0)}</div>
              <div className="text-sm text-gray-600">Active Content</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{articles.filter(a => a.priority === 'critical').length}</div>
              <div className="text-sm text-gray-600">Critical Guides</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{articles.reduce((sum, a) => sum + a.usageCount, 0)}</div>
              <div className="text-sm text-gray-600">Total Usage</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started with building your knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={createNewArticle} className="flex items-center gap-2 h-16">
              <Plus className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Create Article</div>
                <div className="text-xs opacity-75">Write new guide or procedure</div>
              </div>
            </Button>

            <Button variant="outline" onClick={importContent} className="flex items-center gap-2 h-16">
              <Upload className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Import Content</div>
                <div className="text-xs opacity-75">Bulk upload existing docs</div>
              </div>
            </Button>

            <Button variant="outline" className="flex items-center gap-2 h-16">
              <Search className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Browse Library</div>
                <div className="text-xs opacity-75">Explore existing content</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <Card key={category.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-base">
                    {getIconComponent(category.icon)}
                    <div className="flex-1">
                      <div>{category.name}</div>
                      <div className="text-sm font-normal text-gray-600">{category.description}</div>
                    </div>
                    <Badge variant="secondary">{category.articleCount}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {category.articleCount} articles
                    </span>
                    <Button size="sm" variant="outline">
                      View All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Articles Tab */}
        <TabsContent value="articles" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search articles, tags, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Articles List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading articles...</div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
                <p className="text-gray-600 mb-4">
                  {articles.length === 0 
                    ? 'Get started by creating your first knowledge base article.'
                    : 'Try adjusting your search terms or category filter.'
                  }
                </p>
                <Button onClick={createNewArticle} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create First Article
                </Button>
              </div>
            ) : (
              filteredArticles.map((article) => (
                <Card key={article.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-lg">{article.title}</h4>
                          <Badge className={getPriorityColor(article.priority)}>
                            {article.priority}
                          </Badge>
                          <Badge variant="outline">
                            {categories.find(c => c.id === article.category)?.name || article.category}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {article.content.substring(0, 150)}...
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Used {article.usageCount} times</span>
                          <span>Updated {article.lastUpdated}</span>
                          <div className="flex gap-1">
                            {article.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                <Tag className="w-2 h-2 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                            {article.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{article.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                          <Edit className="w-3 h-3" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="flex items-center gap-1 text-red-600 hover:text-red-700">
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Most Used Articles</CardTitle>
                <CardDescription>Articles frequently referenced by AI</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {articles
                    .sort((a, b) => b.usageCount - a.usageCount)
                    .slice(0, 5)
                    .map((article, index) => (
                      <div key={article.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                            {index + 1}
                          </div>
                          <span className="text-sm">{article.title}</span>
                        </div>
                        <Badge variant="outline">{article.usageCount} uses</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Coverage</CardTitle>
                <CardDescription>Knowledge base coverage by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div key={category.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{category.name}</span>
                        <span>{category.articleCount} articles</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (category.articleCount / 20) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}