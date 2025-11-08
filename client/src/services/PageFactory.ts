/**
 * Page Factory Service
 * 
 * Dynamically loads components, applies templates, and injects props for the page-driven architecture.
 * This service acts as the bridge between page metadata and actual React components.
 */

import React, { ComponentType, lazy, LazyExoticComponent } from 'react';
import { pageRegistry, PageMetadata } from './PageRegistry';
import { templateEngine, PageTemplate } from './TemplateEngine';

// Page component map for dynamic imports
const PAGE_COMPONENTS: Record<string, () => Promise<{ default: ComponentType<any> }>> = {
  // Auth pages
  'login': () => import('@/pages/Login'),
  'forgot-password': () => import('@/pages/ForgotPassword'),
  'reset-password': () => import('@/pages/ResetPassword'),
  'user-profile': () => import('@/pages/UserProfile'),

  // Dashboard & Core
  'my-day': () => import('@/pages/MyDay'),
  'work': () => import('@/pages/Work'),
  'tasks': () => import('@/pages/Tasks'),

  // Strategy & OKRs
  'key-results': () => import('@/pages/KeyResults'),
  'checkin-dashboard': () => import('@/pages/CheckInDashboard'),
  'mission-vision': () => import('@/pages/MissionVision'),

  // Knowledge & Documentation
  'knowledge-base': () => import('@/pages/KnowledgeBase'),

  // Administration & Configuration
  'organization-settings': () => import('@/pages/OrganizationSettings'),
  'core-settings': () => import('@/pages/CoreSettings'),
  'theme-editor': () => import('@/pages/ThemeEditor'),

  // Developer Tools
  'dev-tools': () => import('@/pages/DevTools'),
  'page-manager': () => import('@/pages/PageManager'),

  // Add-on Pages - AI & Automation
  'ai-site-builder': () => import('@/pages/AISiteBuilder'),
  'automation-tools': () => import('@/pages/AutomationTools'),
  'voice-agent-management': () => import('@/pages/VoiceAgentManagement'),

  // Add-on Pages - Business Tools
  'crm': () => import('@/pages/CRM'),
  'customer-management': () => import('@/pages/CustomerManagement'),

  // Add-on Pages - Admin Tools
  'admin-dashboard': () => import('@/pages/AdminDashboard'),
  'super-admin-dashboard': () => import('@/pages/SuperAdminDashboard'),
  'user-management': () => import('@/pages/UserManagement'),

  // Add-on Pages - Service Tools
  'managed-services': () => import('@/pages/ManagedServices'),
  'support-tickets': () => import('@/pages/SupportTicketsFixed'),
  'integrations': () => import('@/pages/Integrations'),

  // Add-on Pages - HR Tools
  'training': () => import('@/pages/Training'),
  'shift-management': () => import('@/pages/ShiftManagement'),
  'time-off-management': () => import('@/pages/TimeOffManagement'),

  // Add-on Pages - Strategy Tools
  'strategy-dashboard': () => import('@/pages/StrategyDashboard'),

  // Add-on Pages - Utility Tools

  // Core Application Feature Pages (New Dynamic)
  'account-settings-core': () => import('@/pages/core/AccountSettings'),
  'organization-settings-core': () => import('@/pages/core/OrganizationSettings'),
  'core-settings-core': () => import('@/pages/core/CoreSettings'),
  'user-management-core': () => import('@/pages/core/UserManagement'),
  'user-profile-core': () => import('@/pages/core/UserProfile'),
  'admin-dashboard-core': () => import('@/pages/core/AdminDashboard'),
  'super-admin-dashboard-core': () => import('@/pages/core/SuperAdminDashboard'),
};

// Component cache to avoid re-importing
const componentCache: Map<string, LazyExoticComponent<ComponentType<any>>> = new Map();

// Page wrapper props interface
export interface PageWrapperProps {
  pageMetadata: PageMetadata;
  template?: PageTemplate;
  children: React.ReactNode;
  customStyles?: Record<string, any>;
  customProps?: Record<string, any>;
}

// Enhanced page component with metadata
export interface EnhancedPageComponent extends ComponentType<any> {
  pageMetadata?: PageMetadata;
  template?: PageTemplate;
  displayName?: string;
}

class PageFactoryService {
  private loadingStates: Map<string, Promise<LazyExoticComponent<ComponentType<any>>>> = new Map();

  /**
   * Dynamically load a page component by slug
   */
  async loadPageComponent(slug: string): Promise<LazyExoticComponent<ComponentType<any>> | null> {
    // Check cache first
    if (componentCache.has(slug)) {
      return componentCache.get(slug)!;
    }

    // Check if already loading
    if (this.loadingStates.has(slug)) {
      return this.loadingStates.get(slug)!;
    }

    const componentImporter = PAGE_COMPONENTS[slug];
    if (!componentImporter) {
      console.warn(`No component found for page slug: ${slug}`);
      return null;
    }

    // Create loading promise
    const loadingPromise = this.createLazyComponent(componentImporter, slug);
    this.loadingStates.set(slug, loadingPromise);

    try {
      const component = await loadingPromise;
      componentCache.set(slug, component);
      this.loadingStates.delete(slug);
      return component;
    } catch (error) {
      console.error(`Error loading component for ${slug}:`, error);
      this.loadingStates.delete(slug);
      return null;
    }
  }

  /**
   * Create a lazy component with proper error handling
   */
  private async createLazyComponent(
    importer: () => Promise<{ default: ComponentType<any> }>,
    slug: string
  ): Promise<LazyExoticComponent<ComponentType<any>>> {
    return lazy(async () => {
      try {
        const module = await importer();
        return module;
      } catch (error) {
        console.error(`Failed to load component for ${slug}:`, error);
        // Return fallback component
        return {
          default: this.createFallbackComponent(slug, error as Error)
        };
      }
    });
  }

  /**
   * Create a fallback component for failed loads
   */
  private createFallbackComponent(slug: string, error: Error): ComponentType<any> {
    return function FallbackComponent() {
      return React.createElement('div', {
        className: 'flex items-center justify-center min-h-screen bg-background'
      }, [
        React.createElement('div', {
          key: 'fallback-content',
          className: 'text-center space-y-4 p-6 max-w-md'
        }, [
          React.createElement('div', {
            key: 'icon',
            className: 'mx-auto w-12 h-12 text-muted-foreground'
          }, '⚠️'),
          React.createElement('h2', {
            key: 'title',
            className: 'text-xl font-semibold text-foreground'
          }, 'Page Not Available'),
          React.createElement('p', {
            key: 'message',
            className: 'text-muted-foreground'
          }, `Failed to load page: ${slug}`),
          React.createElement('details', {
            key: 'error-details',
            className: 'mt-4 text-sm text-left'
          }, [
            React.createElement('summary', {
              key: 'summary',
              className: 'cursor-pointer text-muted-foreground hover:text-foreground'
            }, 'Error Details'),
            React.createElement('pre', {
              key: 'error-text',
              className: 'mt-2 p-2 bg-muted rounded text-xs overflow-auto'
            }, error.message)
          ])
        ])
      ]);
    };
  }

  /**
   * Create an enhanced page component with metadata and template
   */
  async createEnhancedPageComponent(
    slug: string,
    userRole?: string,
    organizationId?: number
  ): Promise<EnhancedPageComponent | null> {
    // Get page metadata
    const pageMetadata = await pageRegistry.getPageBySlug(slug);
    if (!pageMetadata) {
      console.warn(`Page metadata not found for slug: ${slug}`);
      return null;
    }

    // Check visibility
    if (userRole && !(await pageRegistry.isPageVisible(pageMetadata.id, userRole, organizationId))) {
      console.warn(`Page ${slug} is not visible to user with role ${userRole}`);
      return null;
    }

    // Load component
    const LazyComponent = await this.loadPageComponent(slug);
    if (!LazyComponent) {
      return null;
    }

    // Get template if specified
    const template = pageMetadata.templateId 
      ? templateEngine.getTemplate(pageMetadata.templateId)
      : this.getDefaultTemplate(pageMetadata);

    // Create enhanced component
    const EnhancedComponent: EnhancedPageComponent = React.forwardRef<any, any>((props, ref) => {
      const pageProps = {
        ...props,
        ...pageMetadata.layoutConfig,
        pageMetadata,
        template
      };

      // Apply template if available
      if (template) {
        const wrappedContent = React.createElement(LazyComponent, { ...pageProps, ref });
        return templateEngine.applyTemplate(
          template.id,
          wrappedContent,
          pageMetadata.layoutConfig,
          this.parseCSSVariables(pageMetadata.customCss)
        ) as React.ReactElement;
      }

      // Return component without template
      return React.createElement(LazyComponent, { ...pageProps, ref });
    });

    // Add metadata to component
    EnhancedComponent.pageMetadata = pageMetadata;
    EnhancedComponent.template = template;
    EnhancedComponent.displayName = `Enhanced${pageMetadata.title.replace(/\s+/g, '')}Page`;

    return EnhancedComponent;
  }

  /**
   * Get default template based on page metadata
   */
  private getDefaultTemplate(pageMetadata: PageMetadata): PageTemplate | null {
    // Determine template based on page characteristics
    if (pageMetadata.category === 'auth') {
      return templateEngine.getTemplate('auth');
    }
    
    if (pageMetadata.category === 'dashboard' || pageMetadata.slug === 'my-day') {
      return templateEngine.getTemplate('dashboard');
    }
    
    if (pageMetadata.functions?.includes('tables') || pageMetadata.functions?.includes('data')) {
      return templateEngine.getTemplate('table');
    }
    
    if (pageMetadata.functions?.includes('forms') || pageMetadata.functions?.includes('crud')) {
      return templateEngine.getTemplate('form');
    }
    
    return null;
  }

  /**
   * Parse CSS variables from custom CSS string
   */
  private parseCSSVariables(customCss?: string): Record<string, any> {
    if (!customCss) return {};

    const cssVars: Record<string, any> = {};
    const lines = customCss.split('\n');

    lines.forEach(line => {
      const match = line.match(/--([^:]+):\s*([^;]+);/);
      if (match) {
        cssVars[`--${match[1].trim()}`] = match[2].trim();
      }
    });

    return cssVars;
  }

  /**
   * Create a page wrapper component
   */
  createPageWrapper(props: PageWrapperProps): React.ReactElement {
    const { pageMetadata, template, children, customStyles, customProps } = props;

    // Apply SEO metadata
    React.useEffect(() => {
      document.title = pageMetadata.title || 'aimee.works';
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription && pageMetadata.description) {
        metaDescription.setAttribute('content', pageMetadata.description);
      }

      // Apply custom meta tags
      if (pageMetadata.metaTags) {
        Object.entries(pageMetadata.metaTags).forEach(([key, value]) => {
          const existingMeta = document.querySelector(`meta[name="${key}"]`);
          if (existingMeta) {
            existingMeta.setAttribute('content', String(value));
          } else {
            const newMeta = document.createElement('meta');
            newMeta.setAttribute('name', key);
            newMeta.setAttribute('content', String(value));
            document.head.appendChild(newMeta);
          }
        });
      }
    }, [pageMetadata]);

    // Apply custom styles
    React.useEffect(() => {
      if (customStyles || pageMetadata.customCss) {
        const styleElement = document.createElement('style');
        styleElement.id = `page-styles-${pageMetadata.id}`;
        
        let cssContent = '';
        
        if (customStyles) {
          cssContent += Object.entries(customStyles)
            .map(([key, value]) => `${key}: ${value};`)
            .join('\n');
        }
        
        if (pageMetadata.customCss) {
          cssContent += '\n' + pageMetadata.customCss;
        }
        
        styleElement.textContent = cssContent;
        document.head.appendChild(styleElement);

        return () => {
          const element = document.getElementById(`page-styles-${pageMetadata.id}`);
          if (element) {
            element.remove();
          }
        };
      }
    }, [customStyles, pageMetadata.customCss, pageMetadata.id]);

    return React.createElement('div', {
      className: 'page-wrapper',
      'data-page-id': pageMetadata.id,
      'data-page-slug': pageMetadata.slug,
      'data-page-category': pageMetadata.category,
      ...customProps
    }, children);
  }

  /**
   * Preload a page component for better performance
   */
  async preloadPageComponent(slug: string): Promise<void> {
    try {
      await this.loadPageComponent(slug);
    } catch (error) {
      console.warn(`Failed to preload component for ${slug}:`, error);
    }
  }

  /**
   * Preload multiple page components
   */
  async preloadPageComponents(slugs: string[]): Promise<void> {
    await Promise.allSettled(
      slugs.map(slug => this.preloadPageComponent(slug))
    );
  }

  /**
   * Clear component cache
   */
  clearCache(): void {
    componentCache.clear();
    this.loadingStates.clear();
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus(): {
    cachedComponents: string[];
    loadingComponents: string[];
    totalCacheSize: number;
  } {
    return {
      cachedComponents: Array.from(componentCache.keys()),
      loadingComponents: Array.from(this.loadingStates.keys()),
      totalCacheSize: componentCache.size
    };
  }
}

// Export singleton instance
export const pageFactory = new PageFactoryService();