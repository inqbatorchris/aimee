import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { 
  Plus, MoreVertical, Eye, ExternalLink, Star, Trash2, 
  Check, ChevronDown, Search, X 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';


interface SimplifiedPageLinkerProps {
  featureId: number;
  linkedPages: any[];
  primaryPageId?: string;
  onUpdate: (updatedFeature: any) => void;
}

export default function SimplifiedPageLinker({ 
  featureId, 
  linkedPages = [], 
  primaryPageId,
  onUpdate 
}: SimplifiedPageLinkerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available pages
  const { data: availablePages = [], isLoading } = useQuery({
    queryKey: ['/api/pages/search', searchQuery],
    queryFn: async () => {
      const response = await apiRequest(`/api/pages/search?q=${encodeURIComponent(searchQuery || '')}`);
      const data = await response.json();
      // Filter out already linked pages
      const linkedPageIds = linkedPages.map(p => p.pageId || p.id);
      return data.filter((page: any) => !linkedPageIds.includes(page.id));
    },
    enabled: isOpen,
    staleTime: 5000
  });

  // Link pages mutation
  const linkPagesMutation = useMutation({
    mutationFn: async (pageIds: string[]) => {
      const promises = pageIds.map(pageId => 
        apiRequest(`/api/features/${featureId}/pages`, {
          method: 'POST',
          body: { pageId, role: 'main', isPrimary: false }
        }).then(res => res.json())
      );
      return Promise.all(promises);
    },
    onSuccess: async () => {
      // Fetch the updated feature details
      const response = await apiRequest(`/api/features/${featureId}`);
      const updatedFeature = await response.json();
      
      // Update the parent component with the new data
      onUpdate(updatedFeature);
      
      // Also invalidate queries for consistency
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      queryClient.invalidateQueries({ queryKey: [`/api/features/${featureId}`] });
      
      toast({
        title: 'Pages linked successfully',
        description: `${selectedPages.length} page(s) have been linked to this feature.`
      });
      setSelectedPages([]);
      setIsOpen(false);
      setSearchQuery('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error linking pages',
        description: error.message || 'Failed to link pages',
        variant: 'destructive'
      });
    }
  });

  // Remove page mutation
  const removePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const response = await apiRequest(`/api/features/${featureId}/pages/${pageId}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: async () => {
      // Fetch the updated feature details
      const response = await apiRequest(`/api/features/${featureId}`);
      const updatedFeature = await response.json();
      
      // Update the parent component with the new data
      onUpdate(updatedFeature);
      
      // Also invalidate queries for consistency
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      queryClient.invalidateQueries({ queryKey: [`/api/features/${featureId}`] });
      
      toast({
        title: 'Page unlinked',
        description: 'The page has been unlinked from this feature.'
      });
    }
  });

  // Set primary page mutation
  const setPrimaryPageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const response = await apiRequest(`/api/features/${featureId}/primary-page`, {
        method: 'PATCH',
        body: { pageId }
      });
      return response.json();
    },
    onSuccess: async (data) => {
      // Fetch the updated feature details immediately
      const response = await apiRequest(`/api/features/${featureId}`);
      const updatedFeature = await response.json();
      
      // Update the parent component with the new data including primaryPageId
      onUpdate(updatedFeature);
      
      // Also invalidate queries for consistency
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      queryClient.invalidateQueries({ queryKey: [`/api/features/${featureId}`] });
      
      toast({
        title: 'Primary page set',
        description: 'The primary page has been updated.'
      });
    }
  });

  const handleToggleSelect = (pageId: string) => {
    setSelectedPages(prev => 
      prev.includes(pageId) 
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  };

  const handleLinkPages = () => {
    if (selectedPages.length > 0) {
      linkPagesMutation.mutate(selectedPages);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Linked Pages</h3>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-3 w-3 mr-1" />
              Add Pages
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pages..."
                  className="pl-8 pr-8 h-8 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  >
                    <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
              ) : availablePages.length > 0 ? (
                <div className="p-1">
                  {availablePages.map((page: any) => (
                    <button
                      key={page.id}
                      onClick={() => handleToggleSelect(page.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 rounded-sm flex items-center justify-between group ${
                        selectedPages.includes(page.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{page.title}</div>
                        <div className="text-xs text-gray-500 truncate">{page.path}</div>
                      </div>
                      {selectedPages.includes(page.id) && (
                        <Check className="h-4 w-4 text-blue-600 ml-2 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">
                  {searchQuery ? 'No pages found' : 'All pages are already linked'}
                </div>
              )}
            </div>
            
            {selectedPages.length > 0 && (
              <div className="p-3 border-t bg-gray-50">
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={handleLinkPages}
                  disabled={linkPagesMutation.isPending}
                >
                  Link {selectedPages.length} Page{selectedPages.length > 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Linked Pages List - Compact */}
      {linkedPages.length > 0 ? (
        <div className="space-y-1">
          {linkedPages.map((page: any) => {
            const pageId = page.pageId || page.id;
            const isPrimary = pageId === primaryPageId;
            
            return (
              <div key={pageId} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 group">
                {/* Primary Badge */}
                {isPrimary && (
                  <Badge variant="default" className="text-xs h-5">Primary</Badge>
                )}
                
                {/* Page Title - Clickable */}
                <button
                  onClick={() => setLocation(`/page-manager?pageId=${pageId}`)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium hover:text-blue-600 transition-colors truncate">
                      {page.title}
                    </span>
                    <span className="text-xs text-gray-400 truncate">
                      {page.path || page.route}
                    </span>
                  </div>
                </button>
                
                {/* Action Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setLocation(`/page-manager?pageId=${pageId}`)}>
                      <Eye className="h-3 w-3 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(page.path || page.route, '_blank')}>
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Preview Page
                    </DropdownMenuItem>
                    {!isPrimary && (
                      <DropdownMenuItem onClick={() => setPrimaryPageMutation.mutate(pageId)}>
                        <Star className="h-3 w-3 mr-2" />
                        Set as Primary
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => removePageMutation.mutate(pageId)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Remove Link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 border border-dashed rounded-md">
          <p className="text-sm">No pages linked yet</p>
          <p className="text-xs mt-1">Click "Add Pages" to link pages to this feature</p>
        </div>
      )}
    </div>
  );
}