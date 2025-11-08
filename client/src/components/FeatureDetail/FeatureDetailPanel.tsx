import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  X, Save, Edit2, CheckCircle, Clock, AlertCircle, Archive, Link2, Unlink, Search, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface FeatureDetailPanelProps {
  feature: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedFeature: any) => void;
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300',
  dev: 'bg-blue-100 text-blue-800 border-blue-300',
  live: 'bg-green-100 text-green-800 border-green-300',
  archived: 'bg-yellow-100 text-yellow-800 border-yellow-300'
};

const statusIcons = {
  draft: AlertCircle,
  dev: Clock,
  live: CheckCircle,
  archived: Archive
};

export default function FeatureDetailPanel({ feature, isOpen, onClose, onUpdate }: FeatureDetailPanelProps) {
  const [formData, setFormData] = useState(feature || {});
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (feature) {
      setFormData(feature);
    }
  }, [feature]);

  // Mutation for updating feature
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(`/api/features/${feature.id}`, {
        method: 'PATCH',
        body: data
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      toast({
        title: 'Feature updated',
        description: 'The feature has been updated successfully.'
      });
      onUpdate(data);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update feature',
        variant: 'destructive'
      });
    }
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (!isOpen || !feature) return null;

  const StatusIcon = statusIcons[formData.visibilityStatus as keyof typeof statusIcons] || AlertCircle;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden" 
          onClick={onClose}
        />
      )}
      {/* Panel */}
      <div className={`${isOpen ? 'fixed lg:relative inset-y-0 lg:inset-y-auto right-0 lg:right-auto w-full sm:w-[500px] lg:w-[45%] lg:max-w-[700px] z-30 lg:z-auto h-screen lg:h-full' : 'w-0'} transition-all duration-300 bg-white lg:border-l lg:border-gray-200 shadow-xl flex-shrink-0`}>
        <div className="h-full flex flex-col bg-white overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b bg-white shrink-0">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  {formData.name}
                </h2>
                <Badge variant="outline" className={statusColors[formData.visibilityStatus as keyof typeof statusColors]}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {formData.visibilityStatus}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                Edit feature details and settings
              </p>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4">
                <Button 
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium px-6"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      SAVE
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setFormData(feature);
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-6 space-y-6">
              {/* Name */}
              <div>
                <Label className="text-sm font-medium mb-2">Name</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              {/* Status */}
              <div>
                <Label className="text-sm font-medium mb-2">Status</Label>
                <Select 
                  value={formData.visibilityStatus} 
                  onValueChange={(value) => setFormData({...formData, visibilityStatus: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="dev">Development</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Enabled Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Enabled</Label>
                  <p className="text-xs text-gray-600 mt-1">Toggle feature on/off for users</p>
                </div>
                <Switch
                  checked={formData.isEnabled || false}
                  onCheckedChange={(checked) => setFormData({...formData, isEnabled: checked})}
                />
              </div>


              {/* Description */}
              <div>
                <Label className="text-sm font-medium mb-2">Scope definition</Label>
                <Textarea
                  value={formData.description || formData.scopeDefinition || ''}
                  onChange={(e) => setFormData({...formData, scopeDefinition: e.target.value, description: e.target.value})}
                  className="text-xs leading-relaxed"
                  rows={8}
                  placeholder="Enter feature description..."
                />
              </div>

              {/* Overview */}
              <div>
                <Label className="text-sm font-medium mb-2">Overview</Label>
                <Textarea
                  value={formData.overview || ''}
                  onChange={(e) => setFormData({...formData, overview: e.target.value})}
                  className="text-xs leading-relaxed"
                  rows={3}
                  placeholder="Brief overview of the feature..."
                />
              </div>

              {/* Database Tables */}
              <div>
                <Label className="text-sm font-medium mb-2">Database Tables</Label>
                <Textarea
                  value={typeof formData.databaseTables === 'object' ? JSON.stringify(formData.databaseTables, null, 2) : formData.databaseTables || ''}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData({...formData, databaseTables: parsed});
                    } catch {
                      setFormData({...formData, databaseTables: e.target.value});
                    }
                  }}
                  className="text-xs leading-relaxed font-mono"
                  rows={6}
                  placeholder="JSON structure defining database tables and relationships..."
                />
              </div>

              {/* User Documentation */}
              <div>
                <Label className="text-sm font-medium mb-2">User Documentation</Label>
                <Textarea
                  value={formData.userDocumentation || ''}
                  onChange={(e) => setFormData({...formData, userDocumentation: e.target.value})}
                  className="text-xs leading-relaxed"
                  rows={6}
                  placeholder="Rich text documentation for users..."
                />
              </div>

              {/* Implementation Details */}
              <div>
                <Label className="text-sm font-medium mb-2">Implementation Details</Label>
                <Textarea
                  value={typeof formData.implementationDetails === 'object' ? JSON.stringify(formData.implementationDetails, null, 2) : formData.implementationDetails || ''}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData({...formData, implementationDetails: parsed});
                    } catch {
                      setFormData({...formData, implementationDetails: e.target.value});
                    }
                  }}
                  className="text-xs leading-relaxed font-mono"
                  rows={6}
                  placeholder="JSON structure defining implementation details..."
                />
              </div>

              {/* Technical Specifications */}
              <div>
                <Label className="text-sm font-medium mb-2">Technical Specifications</Label>
                <Textarea
                  value={typeof formData.technicalSpecifications === 'object' ? JSON.stringify(formData.technicalSpecifications, null, 2) : formData.technicalSpecifications || ''}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData({...formData, technicalSpecifications: parsed});
                    } catch {
                      setFormData({...formData, technicalSpecifications: e.target.value});
                    }
                  }}
                  className="text-xs leading-relaxed font-mono"
                  rows={6}
                  placeholder="JSON structure defining technical specifications..."
                />
              </div>

              {/* Linked Pages Section */}
              <LinkedPagesSection 
                feature={feature}
                formData={formData}
                setFormData={setFormData}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Linked Pages Section Component
function LinkedPagesSection({ feature, formData, setFormData }: any) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch linked pages
  const { data: linkedPages = [], refetch: refetchLinkedPages } = useQuery({
    queryKey: [`/api/features/${feature?.id}/pages`],
    enabled: !!feature?.id
  });

  // Search pages
  const { data: searchResults = [] } = useQuery({
    queryKey: [`/api/pages/search`, searchTerm, formData.linkedPageIds],
    queryFn: async () => {
      if (!searchTerm) return [];
      const excludeIds = (formData.linkedPageIds || []).join(',');
      const response = await apiRequest(`/api/pages/search?q=${searchTerm}&exclude=${excludeIds}`);
      return response.json();
    },
    enabled: searchOpen && searchTerm.length > 0
  });

  // Link page mutation
  const linkPageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const response = await apiRequest(`/api/features/${feature.id}/pages/${pageId}`, {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: async (data) => {
      // Immediately refetch the linked pages to show the updated list
      await refetchLinkedPages();
      queryClient.invalidateQueries({ queryKey: [`/api/features/${feature.id}/pages`] });
      
      // Update form data with the new page ID from the response
      const pageId = searchResults.find((p: any) => linkPageMutation.variables === p.id)?.id || data.pageId;
      const newPageIds = [...(formData.linkedPageIds || []), pageId].filter(id => id != null);
      setFormData({...formData, linkedPageIds: newPageIds});
      
      setSearchTerm('');
      setSearchOpen(false);
      toast({
        title: 'Page linked',
        description: 'The page has been linked successfully.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to link page',
        variant: 'destructive'
      });
    }
  });

  // Unlink page mutation
  const unlinkPageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const response = await apiRequest(`/api/features/${feature.id}/pages/${pageId}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: async (data, pageId) => {
      // Immediately refetch the linked pages to show the updated list
      await refetchLinkedPages();
      queryClient.invalidateQueries({ queryKey: [`/api/features/${feature.id}/pages`] });
      
      const newPageIds = (formData.linkedPageIds || []).filter((id: string) => id !== pageId && id != null);
      setFormData({...formData, linkedPageIds: newPageIds});
      toast({
        title: 'Page unlinked',
        description: 'The page has been unlinked successfully.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to unlink page',
        variant: 'destructive'
      });
    }
  });

  return (
    <div>
      <Label className="text-sm font-medium mb-2">Linked Pages</Label>
      <p className="text-xs text-gray-600 mb-3">Pages associated with this feature</p>
      
      {/* Linked pages list */}
      <div className="space-y-2 mb-3">
        {linkedPages.map((page: any) => (
          <div key={page.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">{page.title}</p>
                <p className="text-xs text-gray-500">{page.path}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => unlinkPageMutation.mutate(page.id)}
              disabled={unlinkPageMutation.isPending}
            >
              <Unlink className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {linkedPages.length === 0 && (
          <p className="text-sm text-gray-500 italic">No pages linked yet</p>
        )}
      </div>

      {/* Search and add pages */}
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <Link2 className="h-4 w-4 mr-2" />
            Link a page
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search pages..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandEmpty>No pages found.</CommandEmpty>
            <CommandGroup>
              {searchResults.map((page: any) => (
                <CommandItem
                  key={page.id}
                  onSelect={() => {
                    linkPageMutation.mutate(page.id);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{page.title}</p>
                    <p className="text-xs text-gray-500">{page.slug}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}