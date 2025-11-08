import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Search, Link, FileText, Loader2 } from 'lucide-react';

interface PageLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureId: number;
  existingPageIds?: string[];
}

interface Page {
  id: string;
  title: string;
  path: string;
  description?: string;
  status: string;
  unifiedStatus: string;
}

const pageRoles = [
  { value: 'main', label: 'Main Page' },
  { value: 'detail', label: 'Detail View' },
  { value: 'edit', label: 'Edit Page' },
  { value: 'config', label: 'Configuration' },
  { value: 'list', label: 'List View' },
  { value: 'create', label: 'Create Page' }
];

export default function PageLinkModal({ isOpen, onClose, featureId, existingPageIds = [] }: PageLinkModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [pageRole, setPageRole] = useState('main');
  const [isPrimary, setIsPrimary] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search for available pages - fetch all pages when modal opens
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['/api/pages/search', searchQuery],
    queryFn: async () => {
      const response = await apiRequest(`/api/pages/search?q=${encodeURIComponent(searchQuery || '')}`);
      const data = await response.json();
      // Filter out already linked pages
      return data.filter((page: Page) => !existingPageIds.includes(page.id));
    },
    enabled: isOpen,
    staleTime: 5000
  });

  // Link page mutation
  const linkPageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPage) throw new Error('No page selected');
      
      const response = await apiRequest(`/api/features/${featureId}/pages`, {
        method: 'POST',
        body: {
          pageId: selectedPage.id,
          role: pageRole,
          isPrimary
        }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/features/${featureId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      toast({
        title: 'Page linked successfully',
        description: `${selectedPage?.title} has been linked to this feature.`
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error linking page',
        description: error.message || 'Failed to link page',
        variant: 'destructive'
      });
    }
  });

  const handleClose = () => {
    setSearchQuery('');
    setSelectedPage(null);
    setPageRole('main');
    setIsPrimary(false);
    onClose();
  };

  const handleLinkPage = () => {
    if (selectedPage) {
      linkPageMutation.mutate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] z-[100] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Page to Feature</DialogTitle>
          <DialogDescription>
            Search and select pages to link them to this feature. Set page roles and mark primary pages for navigation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div>
            <Label className="text-sm font-medium mb-2">Search Pages</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or path..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Pages List */}
          <div>
            <Label className="text-sm font-medium mb-2">Available Pages</Label>
            <ScrollArea className="h-64 border rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : pages.length > 0 ? (
                <div className="p-2 space-y-2">
                  {pages.map((page: Page) => (
                    <div
                      key={page.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPage?.id === page.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedPage(page)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-sm">{page.title}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{page.path}</p>
                          {page.description && (
                            <p className="text-xs text-gray-500 mt-1">{page.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {page.unifiedStatus}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <FileText className="h-8 w-8 mb-2 text-gray-400" />
                  <p className="text-sm">No pages found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Selected Page Options */}
          {selectedPage && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Link className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">Selected: {selectedPage.title}</span>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2">Page Role</Label>
                <Select value={pageRole} onValueChange={setPageRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pageRoles.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPrimary"
                  checked={isPrimary}
                  onCheckedChange={(checked) => setIsPrimary(checked as boolean)}
                />
                <Label
                  htmlFor="isPrimary"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Set as primary page for this feature
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleLinkPage}
            disabled={!selectedPage || linkPageMutation.isPending}
          >
            {linkPageMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <Link className="h-4 w-4 mr-2" />
                Link Page
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}