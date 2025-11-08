import { useMemo, Suspense, lazy } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import type { UploadResult } from '@uppy/core';
import { ObjectUploader } from '@/components/ObjectUploader';
import { 
  Calendar, BarChart3, Target, CheckCircle, AlertCircle, 
  Plus, TrendingUp, Users, Mic, Wrench, FileText, Menu, 
  Settings, Database, Link, BookOpen, Palette, Type, 
  Layout, Bookmark, User, Mail, Shield, Bell, Key, Camera, 
  Save, Clock, Building2, Activity, LogOut
} from 'lucide-react';
import type { Page, LayoutTemplate } from '@shared/schema';

interface DynamicPageRendererProps {
  page: Page;
  layoutTemplate?: LayoutTemplate;
}

const iconMap = {
  Calendar,
  BarChart3, 
  Target,
  CheckCircle,
  AlertCircle,
  Plus,
  TrendingUp,
  Users,
  Mic,
  Wrench,
  FileText,
  Menu,
  Settings,
  Database,
  Link,
  BookOpen,
  Palette,
  Type,
  Layout,
  Bookmark
};

const getIcon = (iconName: string) => {
  return iconMap[iconName as keyof typeof iconMap] || Target;
};

const formatDynamicDate = () => {
  const today = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  return formatter.format(today);
};

// Helper function to convert avatar URL to API endpoint
const getAvatarUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  // If it's an /objects/ path, serve it through our API
  if (url.startsWith('/objects/')) {
    return `/api/core${url}`;
  }
  return url;
};

const DynamicPageRenderer = ({ page, layoutTemplate }: DynamicPageRendererProps) => {
  const [, setLocation] = useLocation();
  const { currentUser, logout } = useAuth();
  
  const pageConfig = useMemo(() => {
    if (!page.pageContent) return null;
    try {
      return typeof page.pageContent === 'string' 
        ? JSON.parse(page.pageContent) 
        : page.pageContent;
    } catch (error) {
      console.error('Error parsing page content:', error);
      return null;
    }
  }, [page.pageContent]);

  const mockData = useMemo(() => {
    return pageConfig?.mockData || {};
  }, [pageConfig]);

  if (!pageConfig?.sections) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              No page configuration found
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderSection = (section: any) => {
    switch (section.type) {
      case 'header':  // Support both 'header' and 'page-header'
      case 'page-header':
        return renderPageHeader(section);
      case 'quick-task-input':
        return renderQuickTaskInput(section);
      case 'outcomes-grid':
        return renderOutcomesGrid(section);
      case 'tasks-grid':
        return renderTasksGrid(section);
      case 'stats-grid':
        return renderStatsGrid(section);
      case 'card-grid':
        return renderCardGrid(section);
      case 'content-block':
        return renderContentBlock(section);
      case 'settings_panel':  // Add support for settings_panel
      case 'settings-panel':
        return renderSettingsPanel(section);
      case 'profile_card':  // Add support for profile_card
      case 'profile-card':
        return renderProfileCard(section);
      case 'wireframe-component':  // Support for imported wireframe components
      case 'custom-component':
        return renderWireframeComponent(section);
      default:
        console.warn(`Unknown section type: ${section.type}`);
        return null;
    }
  };

  const renderWireframeComponent = (section: any) => {
    const { config } = section;
    if (!config) return null;

    return (
      <div key={section.id} className="my-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              {config.componentName || 'Wireframe Component'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {config.componentCategory && (
                <Badge variant="outline">{config.componentCategory}</Badge>
              )}
              {config.pageTemplate && (
                <Badge variant="secondary">{config.pageTemplate}</Badge>
              )}
              <p className="text-sm text-muted-foreground">
                Component ID: {config.componentId}
              </p>
              <div className="bg-muted/50 p-4 rounded-lg mt-4">
                <p className="text-sm text-center text-muted-foreground">
                  Wireframe component preview will be rendered here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPageHeader = (section: any) => {
    // Support both 'config' and 'content' structures
    const config = section.config || section.content;
    if (!config) return null;
    
    const subtitle = config.subtitle === 'dynamic-date' 
      ? formatDynamicDate() 
      : config.subtitle;

    return (
      <div key={section.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{config.title}</h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm sm:text-base mt-1">{subtitle}</p>
          )}
        </div>
        {config.actions && (
          <div className="flex gap-2 w-full sm:w-auto">
            {config.actions.map((action: any, idx: number) => {
              const Icon = getIcon(action.icon);
              return (
                <Button
                  key={idx}
                  variant={action.variant || 'default'}
                  size={action.size || 'default'}
                  className={action.className || ''}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{action.label}</span>
                  <span className="sm:hidden">{action.labelMobile || action.label}</span>
                </Button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderQuickTaskInput = (section: any) => {
    const { config } = section;
    return (
      <Card key={section.id}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Input 
                placeholder={config.placeholder}
                className="pr-10"
              />
              {config.microphoneEnabled && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button className="w-full sm:w-auto">
              {config.buttonIcon && (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {config.buttonText}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderOutcomesGrid = (section: any) => {
    const { config } = section;
    const TitleIcon = getIcon(config.titleIcon);
    const data = mockData.topOutcomes || [];

    return (
      <Card key={section.id}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TitleIcon className="h-5 w-5" />
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-4 ${config.responsive}`}>
            {data.map((outcome: any) => (
              <div key={outcome.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">{outcome.title}</h3>
                  <Badge variant="outline" className="text-xs">
                    {outcome.progress}%
                  </Badge>
                </div>
                <Progress value={outcome.progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {outcome.current} {outcome.unit}
                  </span>
                  <span>
                    Target: {outcome.target} {outcome.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTasksGrid = (section: any) => {
    const { config } = section;

    return (
      <div key={section.id} className={`grid gap-6 ${config.responsive}`}>
        {config.sections?.map((taskSection: any) => {
          const TitleIcon = getIcon(taskSection.titleIcon);
          const data = taskSection.id === 'today-tasks' 
            ? mockData.todayTasks || []
            : mockData.overdueTasks || [];

          return (
            <Card key={taskSection.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TitleIcon className={`h-5 w-5 ${taskSection.titleIconColor || ''}`} />
                  {taskSection.title}
                  {taskSection.showBadge && data.length > 0 && (
                    <Badge variant={taskSection.badgeVariant || 'default'} className="ml-auto">
                      {data.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.length === 0 && taskSection.emptyState ? (
                  <div className="text-center py-4">
                    <CheckCircle className={`mx-auto ${taskSection.emptyState.iconSize} ${taskSection.emptyState.iconColor} mb-2`} />
                    <p className="text-sm text-muted-foreground">
                      {taskSection.emptyState.message}
                    </p>
                  </div>
                ) : (
                  data.map((task: any) => (
                    <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="flex-1 space-y-1">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          Due: {task.dueDate}
                        </p>
                        {task.keyResult && (
                          <Badge variant="outline" className="text-xs">
                            {task.keyResult}
                          </Badge>
                        )}
                      </div>
                      <Badge 
                        variant={task.priority === 'high' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderStatsGrid = (section: any) => {
    const { config } = section;
    const stats = mockData.quickStats || {};

    return (
      <div key={section.id} className={`grid gap-4 ${config.responsive}`}>
        {config.metrics?.map((metric: any) => {
          const Icon = getIcon(metric.icon);
          const statData = stats[metric.id] || {};

          return (
            <Card key={metric.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="text-2xl font-bold">
                      {statData.value || '0'}
                    </p>
                    {metric.trend?.enabled && statData.trend && (
                      <p className={`text-xs ${metric.trend.color}`}>
                        {statData.trend}
                      </p>
                    )}
                  </div>
                  <Icon className={`h-8 w-8 ${metric.iconColor} ${metric.iconOpacity}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderCardGrid = (section: any) => {
    const { config } = section;
    const cards = config.cards || [];
    const columns = config.columns || 3;
    
    const gridClass = columns === 2 ? 'md:grid-cols-2' : columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4';
    
    return (
      <div key={section.id} className={`grid gap-6 ${gridClass}`}>
        {cards.map((card: any, idx: number) => {
          const Icon = getIcon(card.icon);
          return (
            <Card key={idx} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col items-start space-y-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {card.description}
                    </p>
                  </div>
                  {card.link && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 p-0 h-auto text-primary hover:text-primary/80"
                      onClick={() => setLocation(card.link)}
                    >
                      Open →
                    </Button>
                  )}
                  {card.content && (
                    <div className="text-sm text-muted-foreground mt-2">
                      {card.content}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderContentBlock = (section: any) => {
    const { config } = section;
    
    return (
      <div key={section.id} className="space-y-4">
        {config.content && (
          <div dangerouslySetInnerHTML={{ 
            __html: DOMPurify.sanitize(config.content, {
              ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'blockquote', 'a', 'img', 'br', 'code', 'pre', 'div', 'span'],
              ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel']
            })
          }} />
        )}
      </div>
    );
  };
  
  const renderSettingsPanel = (section: any) => {
    const content = section.content || section.config;
    if (!content) return null;
    
    const categories = content.categories || [];
    
    // Map categories to settings sections
    const settingsSections = {
      system: {
        title: 'System Configuration',
        icon: Settings,
        description: 'Core system settings and platform configuration',
        items: [
          { label: 'General Settings', path: '/settings' },
          { label: 'Database Configuration', path: '/core/dev-tools' },
          { label: 'API Settings', path: '/api-settings' }
        ]
      },
      features: {
        title: 'Features & Modules',
        icon: Layout,
        description: 'Enable and configure platform features',
        items: [
          { label: 'Feature Flags', path: '/feature-flags' },
          { label: 'Integrations', path: '/integrations' },
          { label: 'Plugins', path: '/plugins' }
        ]
      },
      security: {
        title: 'Security & Access',
        icon: AlertCircle,
        description: 'Security settings and access control',
        items: [
          { label: 'User Management', path: '/core/people' },
          { label: 'Permissions', path: '/permissions' },
          { label: 'Authentication', path: '/auth-settings' }
        ]
      },
      performance: {
        title: 'Performance & Optimization',
        icon: TrendingUp,
        description: 'Performance monitoring and optimization',
        items: [
          { label: 'Cache Settings', path: '/cache' },
          { label: 'Performance Metrics', path: '/metrics' },
          { label: 'Resource Usage', path: '/resources' }
        ]
      }
    };
    
    return (
      <div key={section.id} className="grid gap-6 md:grid-cols-2">
        {categories.map((category: string) => {
          const settings = settingsSections[category as keyof typeof settingsSections];
          if (!settings) return null;
          
          const Icon = settings.icon;
          return (
            <Card key={category} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {settings.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {settings.description}
                </p>
                <div className="space-y-2">
                  {settings.items.map((item: any) => (
                    <Button
                      key={item.path}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left"
                      onClick={() => setLocation(item.path)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };
  
  const renderProfileCard = (section: any) => {
    const content = section.content || section.config;
    if (!content || !currentUser) return null;
    
    const [activeTab, setActiveTab] = useState('profile');
    const [activityFilter, setActivityFilter] = useState('all');
    
    // Avatar upload handlers
    const handleGetUploadParameters = async () => {
      const response = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }
      
      const data = await response.json();
      return {
        method: 'PUT' as const,
        url: data.uploadURL,
      };
    };
    
    const handleAvatarUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
      if (result.successful.length > 0) {
        const uploadedFile = result.successful[0];
        const avatarURL = uploadedFile.uploadURL;
        
        try {
          const response = await fetch('/api/user/avatar', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ avatarURL }),
          });
          
          if (response.ok) {
            // Refresh user data to show new avatar
            window.location.reload();
          } else {
            console.error('Failed to update avatar');
          }
        } catch (error) {
          console.error('Error updating avatar:', error);
        }
      }
    };
    
    const tabs = [
      { value: 'profile', label: 'Profile' },
      { value: 'security', label: 'Security' },
      { value: 'notifications', label: 'Notifications' },
      { value: 'activity', label: 'Activity' }
    ];
    
    // Mock activity data for demonstration - in real app this would come from API
    const mockActivityData = [
      {
        id: 1,
        action: 'Profile Updated',
        details: 'Updated personal information',
        timestamp: '2024-08-18T17:23:55Z',
        type: 'profile'
      },
      {
        id: 2,
        action: 'Login',
        details: 'Successful login from Chrome browser',
        timestamp: '2024-08-18T16:45:12Z',
        type: 'security'
      },
      {
        id: 3,
        action: 'Password Changed',
        details: 'Security password updated',
        timestamp: '2024-08-17T09:30:24Z',
        type: 'security'
      },
      {
        id: 4,
        action: 'Settings Updated',
        details: 'Notification preferences changed',
        timestamp: '2024-08-16T14:15:33Z',
        type: 'settings'
      }
    ];
    
    const filteredActivity = activityFilter === 'all' 
      ? mockActivityData 
      : mockActivityData.filter(item => item.type === activityFilter);
    
    return (
      <div key={section.id} className="space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-16 w-16 cursor-pointer transition-opacity group-hover:opacity-75">
                <AvatarImage src={getAvatarUrl(currentUser.avatarUrl)} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={5242880} // 5MB
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleAvatarUploadComplete}
                buttonClassName="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white text-sm opacity-0 group-hover:opacity-100 transition-all"
              >
                <span>Change Photo</span>
              </ObjectUploader>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                {currentUser.fullName || currentUser.email?.split('@')[0] || 'User'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{currentUser.role}</Badge>
                <Badge variant="outline" className="text-green-600">
                  Active
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
            <Button variant="destructive" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Responsive Tab Navigation */}
        <div className="space-y-4">
          {/* Desktop: Traditional Tabs */}
          <div className="hidden sm:block">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                {tabs.map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          {/* Mobile: Dropdown */}
          <div className="sm:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {tabs.map(tab => (
                  <SelectItem key={tab.value} value={tab.value}>
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={currentUser.fullName || currentUser.email?.split('@')[0] || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      value={currentUser.email || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Organization ID</Label>
                    <Input
                      value={currentUser.organizationId?.toString() || 'N/A'}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input
                      value={currentUser.role || 'User'}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Profile Picture</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={getAvatarUrl(currentUser.avatarUrl)} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {currentUser.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 
                         currentUser.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <Button variant="outline" size="sm" disabled>
                      <Camera className="h-4 w-4 mr-2" />
                      Change Picture
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Password & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Password management features will be available soon.
                </p>
                <Button variant="outline" disabled>
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates about your account
                    </p>
                  </div>
                  <Switch disabled />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Security Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about security events
                    </p>
                  </div>
                  <Switch disabled defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      View your recent account activity and login history
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="activity-filter" className="text-sm whitespace-nowrap">
                      Filter by:
                    </Label>
                    <Select value={activityFilter} onValueChange={setActivityFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Activity</SelectItem>
                        <SelectItem value="profile">Profile</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="settings">Settings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredActivity.length > 0 ? (
                    filteredActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm">{activity.action}</p>
                              <p className="text-sm text-muted-foreground">{activity.details}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No activity found for the selected filter.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {pageConfig.sections.map((section: any, index: number) => (
        <div key={section.id || index}>
          {renderSection(section)}
        </div>
      ))}
    </div>
  );
};

export default DynamicPageRenderer;