/**
 * Menu Builder - Simplified interface for managing database-driven navigation menu
 * Matches PageManager design with tight single-line rows and dropdown actions
 * Includes organization selector for super admins
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Plus, Edit, Trash2, GripVertical, Eye, EyeOff, Menu, 
  MoreHorizontal, Settings, ChevronRight, Copy, Link2, X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { IconPicker } from '@/components/ui/icon-picker';

interface MenuSection {
  id: number;
  name: string;
  description?: string;
  icon: string;
  iconType?: 'lucide' | 'emoji' | 'image';
  iconUrl?: string | null;
  orderIndex: number;
  isVisible: boolean;
  isCollapsible: boolean;
  isDefaultExpanded: boolean;
  rolePermissions: string[];
  items: MenuItem[];
}

interface MenuItem {
  id: number;
  sectionId: number;
  pageId?: string;
  parentId?: number;
  title: string;
  path: string;
  icon: string;
  iconType?: 'lucide' | 'emoji' | 'image';
  iconUrl?: string | null;
  description?: string;
  orderIndex: number;
  isVisible: boolean;
  isExternal: boolean;
  openInNewTab: boolean;
  badge?: string;
  badgeColor?: string;
  status: string;
  rolePermissions: string[];
  children?: MenuItem[];
}

interface Page {
  id: string;
  title: string;
  path: string;
  slug: string;
  status: string;
  layoutTemplateId?: number | null;
}

export default function MenuBuilder() {
  const [draggedItem, setDraggedItem] = useState<MenuItem | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [addPageDialogOpen, setAddPageDialogOpen] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [addSectionDialogOpen, setAddSectionDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<MenuSection | null>(null);
  const [sectionSidePanel, setSectionSidePanel] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [newSectionIcon, setNewSectionIcon] = useState('Folder');
  const [newSectionIconType, setNewSectionIconType] = useState<'lucide' | 'emoji' | 'image'>('lucide');
  const [newSectionIconUrl, setNewSectionIconUrl] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  
  // Initialize selectedOrgId from currentUser
  useEffect(() => {
    if (currentUser?.organizationId && !selectedOrgId) {
      setSelectedOrgId(currentUser.organizationId);
    }
  }, [currentUser?.organizationId, selectedOrgId]);

  // Fetch organizations for super admins
  const { data: organizations = [] } = useQuery<any[]>({
    queryKey: ['/api/core/organizations/list'],
    enabled: currentUser?.role === 'super_admin'
  });

  // Use selectedOrgId or fallback to user's organization
  const organizationId = selectedOrgId || currentUser?.organizationId || 1;

  // Fetch menu sections with items
  const { data: menuSections = [], isLoading: isLoadingSections } = useQuery({
    queryKey: ['/api/menu/sections', organizationId],
    queryFn: async () => {
      const response = await fetch(`/api/menu/sections?organizationId=${organizationId}`);
      if (!response.ok) throw new Error('Failed to fetch menu sections');
      return response.json();
    },
    enabled: !!currentUser && !!organizationId,
  });

  // Fetch available pages
  const { data: availablePages = [] } = useQuery({
    queryKey: ['/api/dev/pages', organizationId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (organizationId) {
        params.append('organizationId', organizationId.toString());
      }
      const response = await fetch(`/api/dev/pages?${params}`);
      if (!response.ok) throw new Error('Failed to fetch pages');
      return response.json();
    },
  });

  // Flatten all menu items for table display
  const allMenuItems = menuSections.flatMap((section: MenuSection) => 
    section.items?.map((item: MenuItem) => ({ ...item, sectionName: section.name })) || []
  );

  // Toggle item visibility
  const toggleItemVisibility = useMutation({
    mutationFn: async ({ id, isVisible }: { id: number; isVisible: boolean }) => {
      return apiRequest(`/api/menu/items/${id}`, {
        method: 'PATCH',
        body: { isVisible },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu/sections', organizationId] });
      toast({ title: 'Menu item visibility updated' });
    },
  });

  // Delete menu item
  const deleteMenuItem = useMutation({
    mutationFn: async (itemId: number) => {
      return apiRequest(`/api/menu/items/${itemId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu/sections', organizationId] });
      toast({ title: 'Menu item deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error deleting menu item', description: error.message, variant: 'destructive' });
    },
  });

  // Delete menu section
  const deleteSection = useMutation({
    mutationFn: async (sectionId: number) => {
      return apiRequest(`/api/menu/sections/${sectionId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu/sections', organizationId] });
      toast({ title: 'Section deleted successfully' });
      setSelectedSection(null);
      setSectionSidePanel(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error deleting section', description: error.message, variant: 'destructive' });
    },
  });

  // Update menu item
  const updateMenuItem = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MenuItem> }) => {
      return apiRequest(`/api/menu/items/${id}`, {
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu/sections', organizationId] });
      toast({ title: 'Menu item updated' });
    },
  });

  // Create menu item
  const createMenuItem = useMutation({
    mutationFn: async (data: {
      sectionId: number;
      pageId?: string;
      title: string;
      path: string;
      icon: string;
      orderIndex: number;
    }) => {
      return apiRequest('/api/menu/items', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu/sections', organizationId] });
      toast({ title: 'Menu item created successfully' });
      setAddPageDialogOpen(false);
    },
  });

  // Create menu section  
  const createSection = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      icon: string;
      iconType?: 'lucide' | 'emoji' | 'image';
      iconUrl?: string | null;
      orderIndex: number;
      organizationId: number;
    }) => {
      return apiRequest('/api/menu/sections', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu/sections', organizationId] });
      toast({ title: 'Section created successfully' });
      setAddSectionDialogOpen(false);
      // Reset icon state
      setNewSectionIcon('Folder');
      setNewSectionIconType('lucide');
      setNewSectionIconUrl(null);
    },
  });

  // Update menu section
  const updateSection = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MenuSection> }) => {
      return apiRequest(`/api/menu/sections/${id}`, {
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu/sections', organizationId] });
      toast({ title: 'Section updated' });
    },
  });

  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, item: MenuItem) => {
    setDraggedItem(item);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, targetItem: MenuItem | null, targetIndex: number, targetSectionId?: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    // If dropping into empty section or onto an item
    const sectionId = targetSectionId || targetItem?.sectionId;
    
    if (!sectionId) return;

    // Update order indexes and section
    if (!targetItem || draggedItem.id !== targetItem.id) {
      await updateMenuItem.mutateAsync({
        id: draggedItem.id,
        data: { 
          orderIndex: targetIndex,
          sectionId: sectionId
        }
      });
    }
    
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  if (isLoadingSections) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">Loading menu configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Organization Selector for Super Admins */}
      {currentUser?.role === 'super_admin' && organizations.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <Label htmlFor="org-select" className="text-sm font-medium">
            Managing menu for:
          </Label>
          <Select
            value={organizationId.toString()}
            onValueChange={(value) => {
              setSelectedOrgId(parseInt(value));
            }}
          >
            <SelectTrigger id="org-select" className="w-[250px]">
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org: any) => (
                <SelectItem key={org.id} value={org.id.toString()}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setAddSectionDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAddPageDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Menu Item
          </Button>
        </div>
        <Badge variant="outline" className="text-xs">
          {allMenuItems.length} menu items across {menuSections.length} sections
        </Badge>
      </div>

      {/* Menu Sections with Items */}
      <div className="space-y-4">
        {menuSections.map((section: MenuSection) => (
          <div key={section.id} className="border rounded-lg overflow-hidden">
            {/* Section Header */}
            <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{section.name}</span>
                <Badge variant="outline" className="text-xs">
                  {section.items?.length || 0} items
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={section.isVisible}
                  onCheckedChange={(checked) => 
                    updateSection.mutate({
                      id: section.id,
                      data: { isVisible: checked }
                    })
                  }
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => {
                        setSelectedSection(section);
                        setSectionSidePanel(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Section
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => deleteSection.mutate(section.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Section
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Section Items */}
            {section.items && section.items.length > 0 ? (
              <Table>
                <TableBody>
                  {section.items.map((item: MenuItem, index: number) => (
                    <TableRow 
                      key={item.id}
                      className={cn(
                        "cursor-move",
                        dragOverIndex === index && "bg-accent"
                      )}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, item, index)}
                    >
                      <TableCell className="w-10">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.title}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {item.path}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="w-24">
                        <Badge 
                          variant={item.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-20">
                        <Switch
                          checked={item.isVisible}
                          onCheckedChange={(checked) => 
                            toggleItemVisibility.mutate({ 
                              id: item.id, 
                              isVisible: checked 
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="w-20 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedMenuItem(item);
                                setSideMenuOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                navigator.clipboard.writeText(item.path);
                                toast({ title: 'Path copied to clipboard' });
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Path
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => deleteMenuItem.mutate(item.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div 
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center text-muted-foreground hover:border-muted-foreground/50 transition-colors"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-primary');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('border-primary');
                }}
                onDrop={(e) => {
                  e.currentTarget.classList.remove('border-primary');
                  handleDrop(e, null, 0, section.id);
                }}
              >
                <Menu className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Drop items here or add new ones</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {menuSections.every((section: MenuSection) => !section.items || section.items.length === 0) && (
        <div className="text-center py-8 text-muted-foreground">
          <Menu className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No menu items found</p>
          <p className="text-xs mt-2">Create sections and add pages to build your navigation menu</p>
          <Button className="mt-4" size="sm" onClick={() => setAddPageDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add your first menu item
          </Button>
        </div>
      )}

      {/* Side Panel for Editing Menu Item */}
      <Sheet open={sideMenuOpen} onOpenChange={setSideMenuOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Edit Menu Item
            </SheetTitle>
            <SheetDescription>
              Update the details for this navigation menu item
            </SheetDescription>
          </SheetHeader>

          {selectedMenuItem && (
            <div className="space-y-6 mt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    defaultValue={selectedMenuItem.title}
                    onBlur={(e) => 
                      updateMenuItem.mutate({
                        id: selectedMenuItem.id,
                        data: { title: e.target.value }
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="path">Path</Label>
                  <Input
                    id="path"
                    defaultValue={selectedMenuItem.path}
                    className="font-mono"
                    onBlur={(e) => 
                      updateMenuItem.mutate({
                        id: selectedMenuItem.id,
                        data: { path: e.target.value }
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="icon">Icon</Label>
                  <IconPicker
                    value={selectedMenuItem.icon}
                    iconType={selectedMenuItem.iconType || 'lucide'}
                    iconUrl={selectedMenuItem.iconUrl}
                    onChange={(icon, iconType, iconUrl) => 
                      updateMenuItem.mutate({
                        id: selectedMenuItem.id,
                        data: { 
                          icon, 
                          iconType, 
                          iconUrl: iconUrl || null 
                        }
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    defaultValue={selectedMenuItem.description || ''}
                    onBlur={(e) => 
                      updateMenuItem.mutate({
                        id: selectedMenuItem.id,
                        data: { description: e.target.value }
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="orderIndex">Order Index</Label>
                  <Input
                    id="orderIndex"
                    type="number"
                    defaultValue={selectedMenuItem.orderIndex}
                    onBlur={(e) => 
                      updateMenuItem.mutate({
                        id: selectedMenuItem.id,
                        data: { orderIndex: parseInt(e.target.value) }
                      })
                    }
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isVisible"
                    checked={selectedMenuItem.isVisible}
                    onCheckedChange={(checked) => 
                      updateMenuItem.mutate({
                        id: selectedMenuItem.id,
                        data: { isVisible: checked }
                      })
                    }
                  />
                  <Label htmlFor="isVisible">Visible in menu</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="openInNewTab"
                    checked={selectedMenuItem.openInNewTab}
                    onCheckedChange={(checked) => 
                      updateMenuItem.mutate({
                        id: selectedMenuItem.id,
                        data: { openInNewTab: checked }
                      })
                    }
                  />
                  <Label htmlFor="openInNewTab">Open in new tab</Label>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={selectedMenuItem.status}
                    onValueChange={(value) => 
                      updateMenuItem.mutate({
                        id: selectedMenuItem.id,
                        data: { status: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Side Panel for Editing Section */}
      <Sheet open={sectionSidePanel} onOpenChange={setSectionSidePanel}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Edit Section
            </SheetTitle>
            <SheetDescription>
              Update the details for this menu section
            </SheetDescription>
          </SheetHeader>

          {selectedSection && (
            <div className="space-y-6 mt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="section-name">Name</Label>
                  <Input
                    id="section-name"
                    defaultValue={selectedSection.name}
                    onBlur={(e) => 
                      updateSection.mutate({
                        id: selectedSection.id,
                        data: { name: e.target.value }
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="section-description">Description</Label>
                  <Textarea
                    id="section-description"
                    defaultValue={selectedSection.description || ''}
                    onBlur={(e) => 
                      updateSection.mutate({
                        id: selectedSection.id,
                        data: { description: e.target.value }
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="section-icon">Icon</Label>
                  <IconPicker
                    value={selectedSection.icon}
                    iconType={selectedSection.iconType || 'lucide'}
                    iconUrl={selectedSection.iconUrl}
                    onChange={(icon, iconType, iconUrl) => 
                      updateSection.mutate({
                        id: selectedSection.id,
                        data: { 
                          icon, 
                          iconType, 
                          iconUrl: iconUrl || null 
                        }
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="section-orderIndex">Order Index</Label>
                  <Input
                    id="section-orderIndex"
                    type="number"
                    defaultValue={selectedSection.orderIndex}
                    onBlur={(e) => 
                      updateSection.mutate({
                        id: selectedSection.id,
                        data: { orderIndex: parseInt(e.target.value) }
                      })
                    }
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="section-isVisible"
                    checked={selectedSection.isVisible}
                    onCheckedChange={(checked) => 
                      updateSection.mutate({
                        id: selectedSection.id,
                        data: { isVisible: checked }
                      })
                    }
                  />
                  <Label htmlFor="section-isVisible">Visible in menu</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="section-isCollapsible"
                    checked={selectedSection.isCollapsible}
                    onCheckedChange={(checked) => 
                      updateSection.mutate({
                        id: selectedSection.id,
                        data: { isCollapsible: checked }
                      })
                    }
                  />
                  <Label htmlFor="section-isCollapsible">Collapsible</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="section-isDefaultExpanded"
                    checked={selectedSection.isDefaultExpanded}
                    onCheckedChange={(checked) => 
                      updateSection.mutate({
                        id: selectedSection.id,
                        data: { isDefaultExpanded: checked }
                      })
                    }
                  />
                  <Label htmlFor="section-isDefaultExpanded">Expanded by default</Label>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog for Adding Section */}
      <Dialog open={addSectionDialogOpen} onOpenChange={setAddSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
            <DialogDescription>
              Create a new section to organize your menu items
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createSection.mutate({
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                icon: newSectionIcon,
                iconType: newSectionIconType,
                iconUrl: newSectionIconUrl,
                orderIndex: parseInt(formData.get('orderIndex') as string) || 0,
                organizationId: organizationId,
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="new-section-name">Section Name</Label>
              <Input id="new-section-name" name="name" required />
            </div>
            <div>
              <Label htmlFor="new-section-description">Description</Label>
              <Textarea id="new-section-description" name="description" />
            </div>
            <div>
              <Label htmlFor="new-section-icon">Icon</Label>
              <IconPicker
                value={newSectionIcon}
                iconType={newSectionIconType}
                iconUrl={newSectionIconUrl}
                onChange={(icon, iconType, iconUrl) => {
                  setNewSectionIcon(icon);
                  setNewSectionIconType(iconType);
                  setNewSectionIconUrl(iconUrl || null);
                }}
              />
            </div>
            <div>
              <Label htmlFor="new-section-orderIndex">Order Index</Label>
              <Input 
                id="new-section-orderIndex" 
                name="orderIndex" 
                type="number" 
                defaultValue="0" 
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddSectionDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Section</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for Adding Menu Item */}
      <Dialog open={addPageDialogOpen} onOpenChange={setAddPageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
            <DialogDescription>
              Add a page to the navigation menu
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const sectionId = parseInt(formData.get('sectionId') as string);
              const pageId = formData.get('pageId') as string;
              const selectedPage = availablePages.find((p: Page) => p.id === pageId);
              
              if (selectedPage && sectionId) {
                createMenuItem.mutate({
                  sectionId,
                  pageId: selectedPage.id,
                  title: selectedPage.title,
                  path: selectedPage.path,
                  icon: 'FileText',
                  orderIndex: allMenuItems.filter((item: any) => item.sectionId === sectionId).length,
                });
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="sectionId">Section</Label>
              <Select name="sectionId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a section" />
                </SelectTrigger>
                <SelectContent>
                  {menuSections.map((section: MenuSection) => (
                    <SelectItem key={section.id} value={section.id.toString()}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pageId">Page</Label>
              <Select name="pageId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a page" />
                </SelectTrigger>
                <SelectContent>
                  {availablePages.map((page: Page) => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.title} ({page.path})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddPageDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add to Menu</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}