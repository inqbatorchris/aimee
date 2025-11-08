import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
// import PageLinkModal from './PageLinkModal';
import {
  FileText,
  Settings,
  Link,
  Activity,
  Database,
  Calendar,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Code,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Archive,
  CalendarIcon,
  Table
} from 'lucide-react';

interface LinkedPage {
  pageId: string;
  title: string;
  path: string;
  status: string;
  unifiedStatus: string;
  description?: string;
  pageRole: string;
  isPrimary: boolean;
  sortOrder?: number;
}

interface FeatureDetailProps {
  feature: any;
  onClose: () => void;
  onUpdate: (updates: any) => void;
}

const statusOptions = ['draft', 'dev', 'live', 'deprecated', 'archived'];
const categoryOptions = ['core', 'automation', 'administration', 'content', 'support', 'addons', 'integrations', 'customization'];
const pageRoleOptions = ['main', 'detail', 'edit', 'config', 'list', 'create'];

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300',
  dev: 'bg-orange-100 text-orange-800 border-orange-300', 
  live: 'bg-green-100 text-green-800 border-green-300',
  deprecated: 'bg-red-100 text-red-800 border-red-300',
  archived: 'bg-gray-100 text-gray-600 border-gray-300'
};

const statusIcons = {
  draft: AlertCircle,
  dev: Clock,
  live: CheckCircle,
  deprecated: AlertCircle,
  archived: Archive
};

export default function FeatureDetailTabs({ feature, onClose, onUpdate }: FeatureDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (feature.expectedRelease) {
      try {
        const date = new Date(feature.expectedRelease);
        return !isNaN(date.getTime()) ? date : undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for inline field updates
  const updateFieldMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const response = await apiRequest(`/api/features/${feature.id}/field`, {
        method: 'PATCH',
        body: { field, value }
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      toast({
        title: 'Field updated',
        description: 'The feature field has been updated successfully.'
      });
      setEditingField(null);
      onUpdate(data);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update field',
        variant: 'destructive'
      });
    }
  });

  const startEditingField = (field: string, value: any) => {
    setEditingField(field);
    setTempValue(value);
    if (field === 'expectedRelease' && value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
        } else {
          setSelectedDate(undefined);
        }
      } catch (error) {
        setSelectedDate(undefined);
      }
    }
  };

  const saveField = (field: string) => {
    updateFieldMutation.mutate({ field, value: tempValue });
  };

  const cancelEdit = () => {
    setEditingField(null);
    setTempValue(null);
  };

  const StatusIcon = statusIcons[feature.status as keyof typeof statusIcons] || AlertCircle;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {editingField === 'name' ? (
            <div className="flex items-center gap-2">
              <Input
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="font-semibold text-xl"
                autoFocus
              />
              <Button size="sm" onClick={() => saveField('name')}>
                <Save className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <h2 
              className="text-xl font-semibold cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => startEditingField('name', feature.name)}
            >
              {feature.name}
            </h2>
          )}
          <Badge variant="outline" className={statusColors[feature.unifiedStatus as keyof typeof statusColors]}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {feature.unifiedStatus}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-6 mb-4">
          <TabsTrigger value="overview" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="pages" className="text-xs">
            <Link className="h-3 w-3 mr-1" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="databases" className="text-xs">
            <Table className="h-3 w-3 mr-1" />
            Databases
          </TabsTrigger>
          <TabsTrigger value="metadata" className="text-xs">
            <Database className="h-3 w-3 mr-1" />
            Metadata
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">
            <Settings className="h-3 w-3 mr-1" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">
            <Activity className="h-3 w-3 mr-1" />
            Activity
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2">Description</Label>
              {editingField === 'description' ? (
                <div className="space-y-2">
                  <Textarea
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveField('description')}>
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="group relative">
                  <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded-lg">
                    {feature.description || 'No description available'}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startEditingField('description', feature.description || '')}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Feature Key</Label>
                  {editingField === 'featureKey' ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveField('featureKey')}>
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => startEditingField('featureKey', feature.featureKey)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {editingField === 'featureKey' ? (
                  <Input
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className="font-mono text-sm"
                  />
                ) : (
                  <p className="text-sm font-mono bg-gray-50 px-3 py-2 rounded">{feature.featureKey}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium mb-2">Category</Label>
                {editingField === 'category' ? (
                  <div className="space-y-2">
                    <Select value={tempValue} onValueChange={setTempValue}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveField('category')}>Save</Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative">
                    <Badge variant="outline" className="cursor-pointer" onClick={() => startEditingField('category', feature.category)}>
                      {feature.category}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2">Status</Label>
                {editingField === 'unifiedStatus' ? (
                  <div className="space-y-2">
                    <Select value={tempValue} onValueChange={setTempValue}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(status => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveField('unifiedStatus')}>Save</Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Badge 
                    variant="outline" 
                    className={`${statusColors[feature.unifiedStatus as keyof typeof statusColors]} cursor-pointer`}
                    onClick={() => startEditingField('unifiedStatus', feature.unifiedStatus)}
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {feature.unifiedStatus}
                  </Badge>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium mb-2">Visibility</Label>
                <p className="text-xs text-gray-600">
                  {feature.unifiedStatus === 'draft' && 'Hidden from all users'}
                  {feature.unifiedStatus === 'dev' && 'Visible to admins only'}
                  {feature.unifiedStatus === 'live' && 'Visible to all users'}
                  {feature.unifiedStatus === 'archived' && 'Hidden (archived)'}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2">Development Progress</Label>
              {editingField === 'developmentProgress' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[tempValue]}
                      onValueChange={(value) => setTempValue(value[0])}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-12 text-right">{tempValue}%</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveField('developmentProgress')}>Save</Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 group cursor-pointer" onClick={() => startEditingField('developmentProgress', feature.developmentProgress || 0)}>
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{feature.developmentProgress || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all" 
                      style={{ width: `${feature.developmentProgress || 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">Click to edit progress</p>
                </div>
              )}
              
              <div className="mt-4">
                <Label className="text-sm font-medium mb-2">Expected Release</Label>
                {editingField === 'expectedRelease' ? (
                  <div className="space-y-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarPicker
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => {
                          updateFieldMutation.mutate({ 
                            field: 'expectedRelease', 
                            value: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null 
                          });
                          setEditingField(null);
                        }}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => startEditingField('expectedRelease', feature.expectedRelease)}
                  >
                    <Calendar className="h-4 w-4" />
                    <span>{feature.expectedRelease || 'Not set - click to set'}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2">Route/URL Path</Label>
              {editingField === 'route' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">/admin/organization</span>
                    <Input
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      placeholder="/feature-path"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Full path will be: /admin/organization{tempValue}</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveField('route')}>Save</Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="group relative">
                  <div className="text-sm font-mono bg-gray-50 px-3 py-2 rounded pr-10">
                    <span className="text-gray-500">/admin/organization</span>
                    <span className="text-gray-900">{feature.route || '/...'}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startEditingField('route', feature.route || '')}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Linked Pages Tab */}
          <TabsContent value="pages" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Linked Pages</h3>
              <Button size="sm" variant="outline" onClick={() => setIsLinkModalOpen(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Link Page
              </Button>
            </div>
            
            {feature.linkedPages && feature.linkedPages.length > 0 ? (
              <div className="space-y-2">
                {feature.linkedPages.map((page: LinkedPage) => (
                  <div key={page.pageId} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{page.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {page.pageRole}
                          </Badge>
                          {page.isPrimary && (
                            <Badge variant="default" className="text-xs">Primary</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">{page.path}</p>
                        {page.description && (
                          <p className="text-xs text-gray-500 mt-1">{page.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className={`text-xs ${statusColors[page.unifiedStatus as keyof typeof statusColors]}`}>
                            {page.unifiedStatus}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No pages linked to this feature</p>
                <p className="text-xs mt-1">Link pages to connect them with this feature</p>
              </div>
            )}
          </TabsContent>

          {/* Databases Tab */}
          <TabsContent value="databases" className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Database Tables</h3>
              <div className="space-y-2">
                {feature.databases && feature.databases.length > 0 ? (
                  feature.databases.map((db: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Table className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-sm">{db.tableName}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {db.operations.join(', ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{db.description}</p>
                      {db.relationships && (
                        <div className="mt-2 text-xs text-gray-500">
                          <span className="font-medium">Relations:</span> {db.relationships}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No database tables configured</p>
                    <p className="text-xs mt-1">Database mappings will be shown here</p>
                  </div>
                )}
              </div>
              
              {editingField === 'databases' ? (
                <div className="mt-4 space-y-2">
                  <Textarea
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    placeholder="Enter database tables as JSON array"
                    className="min-h-[100px] font-mono text-xs"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveField('databases')}>Save</Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => startEditingField('databases', JSON.stringify(feature.databases || [], null, 2))}
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit Database Configuration
                </Button>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Sample Queries</h3>
              <div className="space-y-2">
                <div className="bg-gray-50 rounded-lg p-3">
                  <pre className="text-xs font-mono text-gray-700">
{`-- Get all features for organization
SELECT * FROM platform_features 
WHERE organization_id = 1 
  AND unified_status = 'live';

-- Get feature with linked pages
SELECT f.*, fp.page_id, p.title
FROM platform_features f
LEFT JOIN feature_pages fp ON f.id = fp.feature_id
LEFT JOIN pages p ON fp.page_id = p.id
WHERE f.id = :featureId;`}
                  </pre>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Metadata Tab */}
          <TabsContent value="metadata" className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2">Developer Documentation</Label>
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Technical documentation and notes</span>
                  <Button size="sm" variant="outline">
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="prose prose-sm max-w-none">
                  {feature.developerDocs ? (
                    <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(feature.developerDocs, null, 2)}</pre>
                  ) : (
                    <p className="text-gray-500">No documentation available</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2">Feature Capabilities</Label>
              <div className="flex flex-wrap gap-2">
                {feature.features && feature.features.length > 0 ? (
                  feature.features.map((cap: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {cap.replace('_', ' ')}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No capabilities defined</p>
                )}
              </div>
            </div>

            {feature.parentFeature && (
              <div>
                <Label className="text-sm font-medium mb-2">Parent Feature</Label>
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{feature.parentFeature.name}</p>
                      <p className="text-xs text-gray-600">{feature.parentFeature.featureKey}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {feature.childFeatures && feature.childFeatures.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2">Child Features</Label>
                <div className="space-y-2">
                  {feature.childFeatures.map((child: any) => (
                    <div key={child.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{child.name}</p>
                          <p className="text-xs text-gray-600">{child.featureKey}</p>
                        </div>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Access Control</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Enabled</Label>
                    <p className="text-xs text-gray-500">Feature is active and available</p>
                  </div>
                  <Switch
                    checked={feature.isEnabled}
                    onCheckedChange={(checked) => {
                      updateFieldMutation.mutate({ field: 'isEnabled', value: checked });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Visible</Label>
                    <p className="text-xs text-gray-500">Show in navigation</p>
                  </div>
                  <Switch
                    checked={feature.isVisible}
                    onCheckedChange={(checked) => {
                      updateFieldMutation.mutate({ field: 'isVisible', value: checked });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Dev Mode Only</Label>
                    <p className="text-xs text-gray-500">Only available in development mode</p>
                  </div>
                  <Switch
                    checked={feature.devModeOnly}
                    onCheckedChange={(checked) => {
                      updateFieldMutation.mutate({ field: 'devModeOnly', value: checked });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Admin Only</Label>
                    <p className="text-xs text-gray-500">Restricted to admin users</p>
                  </div>
                  <Switch
                    checked={feature.adminOnly}
                    onCheckedChange={(checked) => {
                      updateFieldMutation.mutate({ field: 'adminOnly', value: checked });
                    }}
                  />
                </div>
              </div>
            </div>

            {feature.billingImpact && (
              <div>
                <h3 className="text-sm font-medium mb-3">Billing Impact</h3>
                <div className="border rounded-lg p-3 bg-yellow-50">
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(feature.billingImpact, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Comments & Discussion</h3>
              {feature.comments && feature.comments.length > 0 ? (
                <div className="space-y-2">
                  {feature.comments.map((comment: any) => (
                    <div key={comment.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">User {comment.userId}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No comments yet</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Audit Information</h3>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span>{feature.createdAt ? new Date(feature.createdAt).toLocaleString() : 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span>{feature.updatedAt ? new Date(feature.updatedAt).toLocaleString() : 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created By:</span>
                  <span>User ID: {feature.createdBy || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Updated By:</span>
                  <span>User ID: {feature.updatedBy || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Organization ID:</span>
                  <span>{feature.organizationId}</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Temporary Page Link Placeholder */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Link Page</h3>
            <p className="text-gray-600 mb-4">Page linking functionality is being finalized. This will allow you to connect pages to features.</p>
            <Button onClick={() => setIsLinkModalOpen(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}