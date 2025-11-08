/**
 * Unified menu configuration for the entire application
 * Single source of truth for navigation structure
 */

import { 
  LayoutDashboard, 
  Target,
  CheckCircle,
  BarChart3,
  Briefcase,
  Calendar,
  Bot,
  Settings,
  Users,
  HeadphonesIcon,
  BookOpen,
  Globe,
  ShoppingCart,
  Store,
  Palette,
  Building2,
  Database,
  Zap,
  Code,
  Package
} from 'lucide-react';

export interface MenuItem {
  id: string;
  name: string;
  href?: string;
  icon?: any;
  iconType?: 'lucide' | 'emoji' | 'image';
  iconUrl?: string | null;
  type: 'item' | 'section' | 'divider';
  items?: MenuItem[];
  badge?: string | number;
  badgeColor?: string;
  requiredRole?: string[];
  isNew?: boolean;
  isComingSoon?: boolean;
}

// Minimal fallback menu structure - only includes pages that actually exist
// This should rarely be used as the database-driven menu should be primary
export const menuStructure: MenuItem[] = [
  {
    id: 'my-day',
    name: 'My Day',
    href: '/my-day',
    icon: LayoutDashboard,
    type: 'item'
  },
  {
    id: 'strategy',
    name: 'Strategy & OKRs',
    icon: Target,
    type: 'section',
    items: [
      { 
        id: 'checkin-dashboard',
        name: 'Check-in Dashboard', 
        href: '/strategy/checkin', 
        icon: CheckCircle, 
        type: 'item' 
      },
      { 
        id: 'objectives',
        name: 'Objectives', 
        href: '/strategy/objectives', 
        icon: Target, 
        type: 'item' 
      },
      { 
        id: 'tasks',
        name: 'Tasks', 
        href: '/strategy/work-items', 
        icon: BarChart3, 
        type: 'item' 
      }
    ]
  },
  {
    id: 'dev-tools',
    name: 'Developer Tools',
    icon: Code,
    type: 'section',
    items: [
      { 
        id: 'page-manager',
        name: 'Page Manager', 
        href: '/dev-tools/pages', 
        icon: Package, 
        type: 'item' 
      },
      { 
        id: 'menu-manager',
        name: 'Menu Manager', 
        href: '/dev-tools/menu', 
        icon: Settings, 
        type: 'item' 
      },
    ]
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    type: 'section',
    items: [
      { 
        id: 'organization',
        name: 'Organization', 
        href: '/core/account-settings', 
        icon: Building2, 
        type: 'item' 
      },
      { 
        id: 'theme',
        name: 'Theme', 
        href: '/core/theme-editor', 
        icon: Palette, 
        type: 'item' 
      },
      { 
        id: 'users',
        name: 'Users', 
        href: '/core/user-management', 
        icon: Users, 
        type: 'item' 
      }
    ]
  },
  {
    id: 'divider-admin',
    name: '',
    type: 'divider'
  },
  {
    id: 'administration',
    name: 'Administration',
    icon: Settings,
    type: 'section',
    requiredRole: ['admin', 'super_admin'],
    items: [
      { 
        id: 'organization',
        name: 'Organization', 
        href: '/admin/organization', 
        icon: Building2, 
        type: 'item' 
      },
      { 
        id: 'users',
        name: 'Users & Roles', 
        href: '/admin/users', 
        icon: Users, 
        type: 'item' 
      },
      { 
        id: 'theme',
        name: 'Theme Editor', 
        href: '/admin/theme', 
        icon: Palette, 
        type: 'item' 
      },
      { 
        id: 'integrations-admin',
        name: 'Agents', 
        href: '/admin/integrations', 
        icon: Zap, 
        type: 'item' 
      },

    ]
  },
  {
    id: 'dev-tools',
    name: 'Developer Tools',
    href: '/core/dev-tools',
    icon: Code,
    type: 'item',
    requiredRole: ['super_admin']
  }
];

/**
 * Get menu items filtered by user role
 */
export function getMenuForRole(userRole: string): MenuItem[] {
  return menuStructure.filter(item => {
    if (item.requiredRole && !item.requiredRole.includes(userRole)) {
      return false;
    }
    
    // Filter sub-items if they have role requirements
    if (item.items) {
      item.items = item.items.filter(subItem => 
        !subItem.requiredRole || subItem.requiredRole.includes(userRole)
      );
    }
    
    return true;
  });
}

/**
 * Find menu item by path
 */
export function findMenuItemByPath(path: string): MenuItem | null {
  function search(items: MenuItem[]): MenuItem | null {
    for (const item of items) {
      if (item.href === path) {
        return item;
      }
      if (item.items) {
        const found = search(item.items);
        if (found) return found;
      }
    }
    return null;
  }
  
  return search(menuStructure);
}