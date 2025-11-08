import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Eye, 
  EyeOff, 
  CheckCircle, 
  Clock, 
  XCircle,
  Code,
  Shield,
  Navigation,
  Users,
  FileText,
  Settings,
  Save,
  X
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Page {
  id: string;
  title: string; // Use title instead of name to match database schema
  slug: string;
  path: string;
  status: 'draft' | 'dev' | 'live' | 'archived';
  category?: string;
  isCorePage: boolean;
  buildStatus?: 'released' | 'in_development' | 'planned';
  functions?: string[];
  description?: string;
  organizationId?: number | null;
  ownerUserId?: number | null;
  pageContent?: any; // JSON for dynamic page content
  themeOverrides?: any; // JSON for theme overrides
  layoutTemplateId?: number | null;
  visibilityRules?: any; // JSON for visibility rules
  pageMetadata?: any; // JSON for metadata
  componentConfig?: any; // JSON for component config
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  // Legacy fields for compatibility
  name?: string;
  visible?: boolean;
  roles?: string[];
  menus?: string[];
  template?: string;
  userJourneys?: string[];
  orgScope?: 'all' | 'specific' | 'template';
  orgList?: string[];
  lastModified?: string;
  modifiedBy?: string;
}

interface PageDetailPanelProps {
  page: Page | null;
  open: boolean;
  onClose: () => void;
  onSave?: (updatedPage: Page) => void;
}

export function PageDetailPanel({ page, open, onClose, onSave }: PageDetailPanelProps) {
  const [editedPage, setEditedPage] = useState<Page | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [hasChanges, setHasChanges] = useState(false);
  const [, setLocation] = useLocation();

  // Fetch features linked to this page
  const { data: linkedFeatures = [], isLoading: featuresLoading } = useQuery({
    queryKey: [`/api/pages/${page?.id}/features`],
    queryFn: async () => {
      if (!page?.id) return [];
      const response = await apiRequest(`/api/pages/${page.id}/features`);
      return response.json();
    },
    enabled: !!page?.id && open
  });

  useEffect(() => {
    if (page) {
      setEditedPage(page);
      setActiveTab('overview');
      setHasChanges(false);
    }
  }, [page]);

  const handleFieldChange = (field: keyof Page, value: any) => {
    if (!editedPage) return;
    
    setEditedPage(prev => ({
      ...prev!,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!editedPage) return;
    
    onSave?.(editedPage);
    toast({
      title: "Page updated",
      description: `${editedPage.title || editedPage.name} has been saved successfully.`
    });
    setHasChanges(false);
  };

  const handleRoleToggle = (role: string) => {
    if (!editedPage) return;
    
    const currentRoles = editedPage.roles || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    
    handleFieldChange('roles', newRoles);
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'live': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'dev': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'draft': return <XCircle className="h-4 w-4 text-gray-400" />;
      case 'archived': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  if (!editedPage) return null;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Slide-in panel */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-[600px] bg-background border-l shadow-xl z-50 transform transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {editedPage.title || editedPage.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage page settings, visibility, and access controls
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="visibility">Visibility</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="code">Code</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <div className="mt-4 space-y-4">
                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Page Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input 
                          value={editedPage.title || editedPage.name || ''}
                          onChange={(e) => handleFieldChange('title', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Path</Label>
                        <Input 
                          value={editedPage.path || ''}
                          onChange={(e) => handleFieldChange('path', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea 
                          value={editedPage.description || ''}
                          onChange={(e) => handleFieldChange('description', e.target.value)}
                          placeholder="Describe the purpose of this page..."
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Category</Label>
                          <Select 
                            value={editedPage.category || ''}
                            onValueChange={(value) => handleFieldChange('category', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Core">Core</SelectItem>
                              <SelectItem value="Strategy">Strategy</SelectItem>
                              <SelectItem value="Admin">Admin</SelectItem>
                              <SelectItem value="Settings">Settings</SelectItem>
                              <SelectItem value="DevTools">DevTools</SelectItem>
                              <SelectItem value="Integrations">Integrations</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Status</Label>
                          <Select 
                            value={editedPage.status || ''}
                            onValueChange={(value) => handleFieldChange('status', value as 'draft' | 'dev' | 'live' | 'archived')}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">
                                <div className="flex items-center gap-2">
                                  <XCircle className="h-4 w-4 text-gray-400" />
                                  Draft
                                </div>
                              </SelectItem>
                              <SelectItem value="dev">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-yellow-500" />
                                  Dev
                                </div>
                              </SelectItem>
                              <SelectItem value="live">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  Live
                                </div>
                              </SelectItem>
                              <SelectItem value="archived">
                                <div className="flex items-center gap-2">
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  Archived
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Visible in Navigation</Label>
                        <Switch 
                          checked={editedPage.pageMetadata?.visibleInNavigation !== false}
                          onCheckedChange={(checked) => {
                            handleFieldChange('pageMetadata', {
                              ...editedPage.pageMetadata,
                              visibleInNavigation: checked
                            });
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Linked Features
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {featuresLoading ? (
                        <div className="text-sm text-muted-foreground">Loading features...</div>
                      ) : linkedFeatures.length > 0 ? (
                        <div className="space-y-3">
                          {linkedFeatures.map((feature: any) => (
                            <div key={feature.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant="secondary" 
                                    className="cursor-pointer hover:bg-blue-100 hover:text-blue-800 transition-colors"
                                    onClick={() => {
                                      setLocation(`/dev-tools?tab=features&featureId=${feature.id}`);
                                    }}
                                  >
                                    {feature.name}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {feature.category}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {feature.description || 'No description available'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={feature.unifiedStatus === 'live' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {feature.unifiedStatus || feature.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No features linked to this page</p>
                          <p className="text-xs mt-1">Features can be linked from the Feature Manager</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="visibility" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Role-Based Access
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {['super_admin', 'admin', 'manager', 'team_member', 'customer'].map(role => (
                        <div key={role} className="flex items-center justify-between py-2">
                          <Label className="font-normal capitalize">
                            {role.replace('_', ' ')}
                          </Label>
                          <Switch 
                            checked={editedPage.roles?.includes(role) || false}
                            onCheckedChange={() => handleRoleToggle(role)}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Navigation className="h-4 w-4" />
                        Menu Assignment
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {editedPage.menus?.map((menu, index) => (
                          <Badge key={index} variant="secondary">
                            {menu}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="code" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Code className="h-5 w-5" />
                        Page Body Rendering Code
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="page-content">Page Content Configuration (JSON)</Label>
                        <Textarea 
                          id="page-content"
                          value={
                            editedPage?.pageContent 
                              ? (typeof editedPage.pageContent === 'string' 
                                  ? editedPage.pageContent 
                                  : JSON.stringify(editedPage.pageContent, null, 2))
                              : ''
                          }
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              handleFieldChange('pageContent', parsed);
                            } catch (err) {
                              // Keep the string value while user is typing
                              handleFieldChange('pageContent', e.target.value);
                            }
                          }}
                          placeholder="Enter JSON configuration for dynamic page rendering"
                          className="font-mono text-xs min-h-96"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="theme-overrides">Theme Overrides (JSON)</Label>
                        <Textarea 
                          id="theme-overrides"
                          value={
                            editedPage?.themeOverrides 
                              ? (typeof editedPage.themeOverrides === 'string' 
                                  ? editedPage.themeOverrides 
                                  : JSON.stringify(editedPage.themeOverrides, null, 2))
                              : ''
                          }
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              handleFieldChange('themeOverrides', parsed);
                            } catch (err) {
                              handleFieldChange('themeOverrides', e.target.value);
                            }
                          }}
                          placeholder="Enter JSON configuration for page-specific theme overrides"
                          className="font-mono text-xs min-h-32"
                        />
                      </div>

                      <div>
                        <Label htmlFor="component-config">Component Configuration (JSON)</Label>
                        <Textarea 
                          id="component-config"
                          value={
                            editedPage?.componentConfig 
                              ? (typeof editedPage.componentConfig === 'string' 
                                  ? editedPage.componentConfig 
                                  : JSON.stringify(editedPage.componentConfig, null, 2))
                              : ''
                          }
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              handleFieldChange('componentConfig', parsed);
                            } catch (err) {
                              handleFieldChange('componentConfig', e.target.value);
                            }
                          }}
                          placeholder="Enter JSON configuration for component-specific settings"
                          className="font-mono text-xs min-h-32"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="preview" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Page Preview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {editedPage?.pageContent ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-muted rounded-lg">
                            <h4 className="font-medium mb-2">Page Configuration</h4>
                            <pre className="text-xs bg-background p-3 rounded border overflow-auto max-h-96">
                              {JSON.stringify(
                                typeof editedPage.pageContent === 'string' 
                                  ? JSON.parse(editedPage.pageContent)
                                  : editedPage.pageContent, 
                                null, 
                                2
                              )}
                            </pre>
                          </div>
                          
                          {(editedPage.slug || editedPage.path) && (
                            <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                              <Eye className="h-4 w-4" />
                              <span className="text-sm">Preview available at: </span>
                              <a 
                                href={editedPage.path || `/${editedPage.slug}`} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {editedPage.path || `/${editedPage.slug}`}
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2" />
                          <p>No page content configured</p>
                          <p className="text-sm">Configure page content in the Code tab to see preview</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Advanced Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>User Journeys</Label>
                        <Textarea 
                          placeholder="Define user journeys, one per line..."
                          value={editedPage.userJourneys?.join('\n') || ''}
                          onChange={(e) => handleFieldChange('userJourneys', e.target.value.split('\n').filter(Boolean))}
                          className="min-h-[100px]"
                        />
                      </div>

                      <Separator />

                      <div>
                        <Label>Organization Scope</Label>
                        <Select 
                          value={editedPage.orgScope || 'all'}
                          onValueChange={(value) => handleFieldChange('orgScope', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Organizations</SelectItem>
                            <SelectItem value="specific">Specific Organizations</SelectItem>
                            <SelectItem value="template">Template Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {editedPage.orgScope === 'specific' && (
                        <div>
                          <Label>Organization List</Label>
                          <Textarea 
                            placeholder="List organization IDs, one per line..."
                            value={editedPage.orgList?.join('\n') || ''}
                            onChange={(e) => handleFieldChange('orgList', e.target.value.split('\n').filter(Boolean))}
                            className="min-h-[60px]"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {hasChanges ? 'Unsaved changes' : 'No changes'}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!hasChanges}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}