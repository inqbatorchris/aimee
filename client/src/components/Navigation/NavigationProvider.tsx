/**
 * NavigationProvider - Context for navigation state management
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
// import { useDeveloperMode } from '@/contexts/DeveloperModeContext'; // DEPRECATED - Using unified status instead
import { useQuery } from '@tanstack/react-query';
import { getMenuForRole, findMenuItemByPath, MenuItem } from './menuConfig';
import { authService } from '@/lib/auth';
import * as LucideIcons from 'lucide-react';

interface NavigationContextType {
  isOpen: boolean;
  isCollapsed: boolean;
  activeItem: string | null;
  expandedSections: Set<string>;
  menuItems: MenuItem[];
  toggleSidebar: () => void;
  toggleCollapse: () => void;
  toggleSection: (sectionId: string) => void;
  closeMobileSidebar: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('expandedSections');
    return saved ? new Set(JSON.parse(saved)) : new Set(['strategy', 'objectives']);
  });
  
  const [location] = useLocation();
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 'user';
  // Unified status filtering replaces dev mode
  const canViewDevelopmentItems = ['super_admin', 'admin'].includes(userRole);
  
  // Fetch database-driven navigation menu  
  const { data: navigationData, isLoading: isLoadingNav, error } = useQuery({
    queryKey: ['/api/menu/navigation', userRole, currentUser?.organizationId],
    queryFn: async () => {
      // Use the current user's organizationId
      const orgId = currentUser?.organizationId || 1;
      const url = `/api/menu/navigation?organizationId=${orgId}`;
      const token = authService.getToken();
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!currentUser && !!currentUser.organizationId, // Only fetch when user and org are available
    staleTime: 60000, // Cache for 60 seconds to reduce API calls
    refetchInterval: false, // Don't auto-refetch
    refetchOnWindowFocus: false, // Don't refetch on focus
    retry: 1
  });

  // Handle database menu errors silently - fallback to static menu

  // Helper to get icon component from string name
  const getIconComponent = (iconName: string) => {
    return (LucideIcons as any)[iconName] || LucideIcons.FileText;
  };

  // Transform database navigation into MenuItem format or use static fallback
  const menuItems = React.useMemo(() => {
    // Don't show any menu while loading to prevent flash
    if (isLoadingNav && !navigationData) {
      return [];
    }
    
    // Compatibility shim: Handle both old array format and new {sections: []} format
    // TODO: Remove this shim once all APIs return the new format consistently
    const sectionsData = navigationData?.sections || navigationData;
    
    if (sectionsData && sectionsData.length > 0) {
      // Transform database navigation to MenuItem format
      return sectionsData.map((section: any) => ({
        id: `section-${section.id}`,
        name: section.name,
        icon: section.iconType === 'lucide' || !section.iconType ? (section.icon ? getIconComponent(section.icon) : undefined) : section.icon,
        iconType: section.iconType || 'lucide',
        iconUrl: section.iconUrl,
        type: 'section' as const,
        requiredRole: section.rolePermissions?.length > 0 ? section.rolePermissions : undefined,
        items: section.items
          ?.sort((a: any, b: any) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999))
          .map((item: any) => ({
            id: `item-${item.id}`,
            name: item.title,
            href: item.path,
            icon: item.iconType === 'lucide' || !item.iconType ? (item.icon ? getIconComponent(item.icon) : undefined) : item.icon,
            iconType: item.iconType || 'lucide',
            iconUrl: item.iconUrl,
            type: 'item' as const,
            badge: item.badge,
            badgeColor: item.badgeColor,
            isNew: item.status === 'coming_soon',
            isComingSoon: item.status === 'coming_soon',
            requiredRole: item.rolePermissions?.length > 0 ? item.rolePermissions : undefined,
            items: item.children
              ?.sort((a: any, b: any) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999))
              .map((child: any) => ({
                id: `child-${child.id}`,
                name: child.title,
                href: child.path,
                icon: child.iconType === 'lucide' || !child.iconType ? (child.icon ? getIconComponent(child.icon) : undefined) : child.icon,
                iconType: child.iconType || 'lucide',
                iconUrl: child.iconUrl,
                type: 'item' as const,
              }))
          }))
      }));
    }
    
    // Only use fallback menu on true network failures (not 4xx/5xx API responses)
    // Network failures have message like "Failed to fetch" or "Network error"
    if (error && (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError'))) {
      console.warn('⚠️ Using fallback menu (API unavailable)');
      return getMenuForRole(userRole);
    }
    
    return [];
  }, [navigationData, userRole, isLoadingNav, error]);
  
  // Determine active item based on current location
  const activeItem = findMenuItemByPath(location)?.id || null;
  
  // Toggle sidebar open/closed (mobile)
  const toggleSidebar = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);
  
  // Toggle sidebar collapsed/expanded (desktop)
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      return newState;
    });
  }, []);
  
  // Toggle section expanded/collapsed
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      localStorage.setItem('expandedSections', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  }, []);
  
  // Close mobile sidebar
  const closeMobileSidebar = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  // Close mobile sidebar on route change
  useEffect(() => {
    closeMobileSidebar();
  }, [location, closeMobileSidebar]);
  
  // Update body class for sidebar state
  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [isCollapsed]);
  
  const value = {
    isOpen,
    isCollapsed,
    activeItem,
    expandedSections,
    menuItems,
    toggleSidebar,
    toggleCollapse,
    toggleSection,
    closeMobileSidebar
  };
  
  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}