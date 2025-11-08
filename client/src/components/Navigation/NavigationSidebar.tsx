/**
 * NavigationSidebar - Unified sidebar component for desktop and mobile
 * Responsive design with collapsible sections and mobile overlay
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronDown, ChevronRight, ChevronLeft, Menu, ArrowLeft, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigation } from './NavigationProvider';
import { BrandLogo } from '../BrandLogo';
import { MenuItem } from './menuConfig';
import { Badge } from '@/components/ui/badge';
// Removed Dialog import to eliminate automatic close buttons
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials, getAvatarUrl } from '@/lib/utils';

// Helper component to render different icon types
function IconRenderer({ item, className = "h-4 w-4" }: { item: MenuItem; className?: string }) {
  const iconType = item.iconType || 'lucide';
  
  if (iconType === 'emoji' && item.icon) {
    return <span className={cn("inline-flex items-center justify-center text-base leading-none", className)}>{item.icon}</span>;
  }
  
  if (iconType === 'image' && item.iconUrl) {
    return <img src={item.iconUrl} alt="" className={cn("object-contain", className)} />;
  }
  
  // Default to Lucide icon (component)
  if (item.icon) {
    const IconComponent = item.icon;
    return <IconComponent className={className} />;
  }
  
  return null;
}

export function NavigationSidebar() {
  const {
    isOpen,
    isCollapsed,
    activeItem,
    expandedSections,
    menuItems,
    toggleCollapse,
    toggleSection,
    closeMobileSidebar
  } = useNavigation();

  // Helper function to flatten menu items for collapsed view
  const getFlattenedItems = (items: MenuItem[]): MenuItem[] => {
    const flattened: MenuItem[] = [];
    items.forEach(item => {
      if (item.type === 'section' && item.items) {
        // Add all items from this section, skipping the section itself
        flattened.push(...item.items.filter(subItem => subItem.type === 'item'));
      } else if (item.type === 'item') {
        flattened.push(item);
      }
    });
    return flattened;
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    if (item.type === 'divider') {
      return <div key={item.id} className="my-2 border-t border-border" />;
    }

    const isActive = activeItem === item.id;
    const isExpanded = expandedSections.has(item.id);
    const hasChildren = item.items && item.items.length > 0;

    if (item.type === 'section' && hasChildren) {
      return (
        <div key={item.id} className="mb-1">
          <button
            onClick={() => toggleSection(item.id)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 font-medium rounded-md transition-colors",
              "text-[var(--menu-text-size,14px)]",
              "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <IconRenderer item={item} className="h-4 w-4" />
              <span>{item.name}</span>
            </div>
            {hasChildren && (
              isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
            )}
          </button>
          
          {/* Normal expansion for full mode */}
          {isExpanded && item.items && (
            <div className="ml-4 mt-1 space-y-1">
              {item.items.map(subItem => renderMenuItem(subItem, level + 1))}
            </div>
          )}
        </div>
      );
    }

    // For collapsed mode, render items with tooltips
    if (isCollapsed && level === 0) {
      return (
        <TooltipProvider key={item.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={item.href || '#'}>
                <div
                  onClick={closeMobileSidebar}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-md transition-colors cursor-pointer mb-1",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-primary/10 text-primary"
                  )}
                >
                  <IconRenderer item={item} className="h-4 w-4" />
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              <p>{item.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // For expanded mode, render normally
    return (
      <Link key={item.id} href={item.href || '#'}>
        <div
          onClick={closeMobileSidebar}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md transition-colors cursor-pointer",
            "text-[var(--menu-text-size,14px)]",
            "hover:bg-accent hover:text-accent-foreground",
            isActive && "bg-primary/10 text-primary font-medium",
            level > 0 && "ml-4"
          )}
        >
          <IconRenderer item={item} className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 truncate">{item.name}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-auto">
              {item.badge}
            </Badge>
          )}
          {item.isNew && (
            <Badge variant="default" className="ml-auto">
              New
            </Badge>
          )}
          {item.isComingSoon && (
            <Badge variant="outline" className="ml-auto">
              Soon
            </Badge>
          )}
        </div>
      </Link>
    );
  };

  const sidebarContent = (
    <>
      {/* Logo Section with Collapse Button */}
      <div className={cn(
        "flex items-center justify-between h-14 px-4 border-b border-border",
        isCollapsed && "justify-center px-2"
      )}>
        <BrandLogo size="sm" showText={!isCollapsed} collapsed={isCollapsed} onClick={toggleCollapse} />
        {/* Collapse Toggle - Desktop Only */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className={cn(
            "hidden lg:flex h-8 w-8 flex-shrink-0",
            isCollapsed && "ml-0"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Menu Items */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className={cn("space-y-1", isCollapsed && "flex flex-col items-center")}>
          {isCollapsed 
            ? getFlattenedItems(menuItems).map(item => renderMenuItem(item))
            : menuItems.map(item => renderMenuItem(item))
          }
        </nav>
      </ScrollArea>

      {/* User Avatar Section at Bottom */}
      <UserAvatarSection isCollapsed={isCollapsed} />
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-background border-r border-border transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar (Custom implementation without Dialog to eliminate X button) */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-50 bg-black/80 lg:hidden"
            onClick={closeMobileSidebar}
          />
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 z-50 h-full w-64 bg-background shadow-lg lg:hidden flex flex-col overflow-hidden">
            {/* REMOVED: No close button in mobile sidebar */}
            {/* Users must click outside or use menu button to close */}
            <div className="flex flex-col h-full overflow-hidden">
              {sidebarContent}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/**
 * User Avatar Section for Sidebar Bottom
 */

function UserAvatarSection({ isCollapsed }: { isCollapsed: boolean }) {
  const { currentUser } = useAuth();
  const [, setLocation] = useLocation();

  const handleAvatarClick = () => {
    setLocation('/core/user-profile');
  };

  const handleSettingsClick = () => {
    setLocation('/core/account-settings');
  };

  if (!currentUser) return null;

  return (
    <div className={cn(
      "border-t border-border p-3",
      isCollapsed ? "flex flex-col items-center gap-2" : "flex items-center gap-3"
    )}>
      {/* User Avatar - Clickable to Profile */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "p-0 rounded-full hover:bg-accent",
          isCollapsed ? "h-8 w-8" : "h-9 w-9"
        )}
        onClick={handleAvatarClick}
        aria-label="Go to Profile"
      >
        <Avatar className={cn(isCollapsed ? "h-8 w-8" : "h-9 w-9")}>
          <AvatarImage src={getAvatarUrl(currentUser?.avatarUrl)} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
            {getInitials(currentUser?.fullName || currentUser?.email || 'U')}
          </AvatarFallback>
        </Avatar>
      </Button>
      {!isCollapsed && (
        <>
          {/* User Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate text-[14px] mt-[0px] mb-[0px]">
              {currentUser?.fullName || 'User'}
            </p>
            <p className="text-muted-foreground truncate text-[12px] mt-[2px] mb-[2px]">
              {currentUser?.email}
            </p>
          </div>

          {/* Settings Icon */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0"
            onClick={handleSettingsClick}
            aria-label="Account Settings"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Button>
        </>
      )}
      {isCollapsed && (
        /* Settings Icon for Collapsed State */
        (<Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleSettingsClick}
          aria-label="Account Settings"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
        </Button>)
      )}
    </div>
  );
}

/**
 * Mobile menu trigger button (Always shows hamburger menu, never shows X)
 */
export function MobileMenuTrigger() {
  const { toggleSidebar, isOpen } = useNavigation();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="lg:hidden"
      aria-label={isOpen ? "Close menu" : "Open menu"}
    >
      {/* ALWAYS show Menu icon, NEVER show X */}
      <Menu className="h-5 w-5" />
    </Button>
  );
}