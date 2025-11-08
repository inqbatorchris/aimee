import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2,
  BookOpen,
  Calendar
} from 'lucide-react';

interface KBArticle {
  id: number;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  priority: string;
  status: string;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  sourceUrl?: string;
}

export default function SimpleKBList() {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const response = await fetch('/api/kb/articles');
      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
      } else {
        console.error('Failed to load articles:', response.status);
      }
    } catch (error) {
      console.error('Error loading articles:', error);
      toast({ 
        title: 'Error loading articles', 
        description: 'Failed to fetch knowledge base articles',
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'standard': return 'outline';
      default: return 'outline';
    }
  };

  const addNewArticle = async () => {
    try {
      const newArticle = {
        title: 'New Article',
        content: 'Article content...',
        category: 'general',
        priority: 'standard',
        status: 'draft'
      };

      const response = await fetch('/api/kb/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newArticle)
      });

      if (response.ok) {
        loadArticles();
        toast({ title: 'Article created successfully' });
      }
    } catch (error) {
      toast({ 
        title: 'Error creating article', 
        variant: 'destructive' 
      });
    }
  };

  const deleteArticle = async (id: number) => {
    try {
      const response = await fetch(`/api/kb/articles/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadArticles();
        toast({ title: 'Article deleted successfully' });
      }
    } catch (error) {
      toast({ 
        title: 'Error deleting article', 
        variant: 'destructive' 
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading knowledge base...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Knowledge Base
        </CardTitle>
        
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
          <Button onClick={addNewArticle} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Article
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {filteredArticles.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {articles.length === 0 ? 'No articles found' : 'No articles match your search'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArticles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{article.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {article.content.substring(0, 100)}...
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {article.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityColor(article.priority)}>
                      {article.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {article.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(article.updatedAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteArticle(article.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}