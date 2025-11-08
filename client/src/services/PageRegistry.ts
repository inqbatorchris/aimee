/**
 * Page Registry Service
 * 
 * Manages page metadata, template application, and caching for the page-driven architecture.
 * This service acts as the central hub for all page-related operations and configuration.
 */

import { apiRequest } from '@/lib/queryClient';

// Page metadata interface matching database schema
export interface PageMetadata {
  id: string;
  organizationId?: number;
  slug: string;
  path: string;
  title: string;
  description?: string;
  status: 'draft' | 'dev' | 'live' | 'archived';
  buildStatus: 'not_started' | 'building' | 'testing' | 'released';
  functions?: string[];
  isCorePage: boolean;
  category?: string;
  templateId?: string;
  layoutConfig?: Record<string, any>;
  customCss?: string;
  metaTags?: Record<string, any>;
  ownerUserId?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// Page visibility rule interface
export interface PageVisibilityRule {
  id: number;
  pageId: string;
  ruleType: 'role' | 'organization' | 'feature_flag' | 'date_range';
  ruleValue: any;
  isInclude: boolean;
  priority: number;
  startAt?: string;
  endAt?: string;
}

// Page documentation interface
export interface PageDocumentation {
  id: number;
  pageId: string;
  docMarkdown?: string;
  changeLog?: any[];
  links?: any[];
  lastReviewedAt?: string;
  ownerUserId?: number;
}

// Template configuration interface
export interface PageTemplate {
  id: string;
  name: string;
  description?: string;
  layoutStructure: Record<string, any>;
  defaultStyles?: Record<string, any>;
  requiredProps?: string[];
}

// Cache interface for performance optimization
interface PageCache {
  metadata: Map<string, PageMetadata>;
  visibilityRules: Map<string, PageVisibilityRule[]>;
  documentation: Map<string, PageDocumentation>;
  templates: Map<string, PageTemplate>;
  lastUpdated: number;
}

class PageRegistryService {
  private cache: PageCache = {
    metadata: new Map(),
    visibilityRules: new Map(),
    documentation: new Map(),
    templates: new Map(),
    lastUpdated: 0,
  };

  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all pages with optional filtering
   */
  async getAllPages(filters?: {
    category?: string;
    status?: string;
    isCorePage?: boolean;
    organizationId?: number;
  }): Promise<PageMetadata[]> {
    try {
      console.log('Fetching pages from API...');
      const response = await apiRequest('/api/dev/pages');
      const pages = await response.json();
      console.log('Raw API response:', pages);
      console.log('Is array?', Array.isArray(pages));
      
      if (!Array.isArray(pages)) {
        console.error('API returned non-array:', pages);
        return [];
      }
      
      if (!filters) return pages;

      return pages.filter((page: PageMetadata) => {
        if (filters.category && page.category !== filters.category) return false;
        if (filters.status && page.status !== filters.status) return false;
        if (filters.isCorePage !== undefined && page.isCorePage !== filters.isCorePage) return false;
        if (filters.organizationId && page.organizationId !== filters.organizationId) return false;
        return true;
      });
    } catch (error) {
      console.error('Error in getAllPages:', error);
      return [];
    }
  }

  /**
   * Get page metadata by slug
   */
  async getPageBySlug(slug: string): Promise<PageMetadata | null> {
    // Check cache first
    if (this.isCacheValid() && this.cache.metadata.has(slug)) {
      return this.cache.metadata.get(slug) || null;
    }

    try {
      const pages = await this.getAllPages();
      const page = pages.find(p => p.slug === slug);
      
      if (page) {
        this.cache.metadata.set(slug, page);
      }
      
      return page || null;
    } catch (error) {
      console.error('Error fetching page by slug:', error);
      return null;
    }
  }

  /**
   * Get page metadata by path
   */
  async getPageByPath(path: string): Promise<PageMetadata | null> {
    try {
      const pages = await this.getAllPages();
      return pages.find(p => p.path === path) || null;
    } catch (error) {
      console.error('Error fetching page by path:', error);
      return null;
    }
  }

  /**
   * Get pages visible to current user based on role and rules
   */
  async getVisiblePages(userRole: string, organizationId?: number): Promise<PageMetadata[]> {
    try {
      const allPages = await this.getAllPages({ organizationId });
      const visiblePages: PageMetadata[] = [];

      for (const page of allPages) {
        const isVisible = await this.isPageVisible(page.id, userRole, organizationId);
        if (isVisible) {
          visiblePages.push(page);
        }
      }

      return visiblePages.filter(page => page.status === 'live');
    } catch (error) {
      console.error('Error fetching visible pages:', error);
      return [];
    }
  }

  /**
   * Check if a page is visible to the current user
   */
  async isPageVisible(pageId: string, userRole: string, organizationId?: number): Promise<boolean> {
    try {
      const rules = await this.getVisibilityRules(pageId);
      
      // If no rules, page is visible to everyone
      if (rules.length === 0) return true;

      // Sort rules by priority (higher priority first)
      const sortedRules = rules.sort((a, b) => b.priority - a.priority);

      for (const rule of sortedRules) {
        const matches = this.evaluateVisibilityRule(rule, userRole, organizationId);
        
        if (matches) {
          return rule.isInclude;
        }
      }

      // Default to visible if no rules match
      return true;
    } catch (error) {
      console.error('Error checking page visibility:', error);
      return false;
    }
  }

  /**
   * Get visibility rules for a page
   */
  private async getVisibilityRules(pageId: string): Promise<PageVisibilityRule[]> {
    if (this.isCacheValid() && this.cache.visibilityRules.has(pageId)) {
      return this.cache.visibilityRules.get(pageId) || [];
    }

    try {
      const rules = await apiRequest(`/api/dev/pages/${pageId}/visibility-rules`);
      this.cache.visibilityRules.set(pageId, rules);
      return rules;
    } catch (error) {
      console.error('Error fetching visibility rules:', error);
      return [];
    }
  }

  /**
   * Evaluate a single visibility rule
   */
  private evaluateVisibilityRule(
    rule: PageVisibilityRule, 
    userRole: string, 
    organizationId?: number
  ): boolean {
    switch (rule.ruleType) {
      case 'role':
        return Array.isArray(rule.ruleValue) && rule.ruleValue.includes(userRole);
      
      case 'organization':
        return rule.ruleValue === organizationId;
      
      case 'feature_flag':
        // TODO: Implement feature flag evaluation
        return false;
      
      case 'date_range':
        const now = new Date();
        const startDate = rule.startAt ? new Date(rule.startAt) : null;
        const endDate = rule.endAt ? new Date(rule.endAt) : null;
        
        if (startDate && now < startDate) return false;
        if (endDate && now > endDate) return false;
        
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Get page documentation
   */
  async getPageDocumentation(pageId: string): Promise<PageDocumentation | null> {
    if (this.isCacheValid() && this.cache.documentation.has(pageId)) {
      return this.cache.documentation.get(pageId) || null;
    }

    try {
      const docs = await apiRequest(`/api/dev/pages/${pageId}/documentation`);
      this.cache.documentation.set(pageId, docs);
      return docs;
    } catch (error) {
      console.error('Error fetching page documentation:', error);
      return null;
    }
  }

  /**
   * Get core pages (essential app functionality)
   */
  async getCorePages(): Promise<PageMetadata[]> {
    return this.getAllPages({ isCorePage: true });
  }

  /**
   * Get add-on pages (extended functionality)
   */
  async getAddOnPages(): Promise<PageMetadata[]> {
    return this.getAllPages({ isCorePage: false });
  }

  /**
   * Get pages by category
   */
  async getPagesByCategory(category: string): Promise<PageMetadata[]> {
    return this.getAllPages({ category });
  }

  /**
   * Get page statistics
   */
  async getPageStats(): Promise<{
    total: number;
    core: number;
    addons: number;
    live: number;
    draft: number;
    categories: Record<string, number>;
  }> {
    try {
      console.log('Getting page stats...');
      const pages = await this.getAllPages();
      console.log('Pages loaded:', pages.length);
      
      const stats = {
        total: pages.length,
        core: pages.filter(p => p.isCorePage).length,
        addons: pages.filter(p => !p.isCorePage).length,
        live: pages.filter(p => p.status === 'live').length,
        draft: pages.filter(p => p.status === 'draft').length,
        categories: {} as Record<string, number>,
      };

      // Count by category
      pages.forEach(page => {
        if (page.category) {
          stats.categories[page.category] = (stats.categories[page.category] || 0) + 1;
        }
      });

      console.log('Page stats calculated:', stats);
      return stats;
    } catch (error) {
      console.error('Error in getPageStats:', error);
      throw error;
    }
  }

  /**
   * Create a new page
   */
  async createPage(pageData: Partial<PageMetadata>): Promise<PageMetadata> {
    const newPage = await apiRequest('/api/dev/pages', {
      method: 'POST',
      body: JSON.stringify(pageData),
    });
    
    // Invalidate cache
    this.invalidateCache();
    
    return newPage;
  }

  /**
   * Update page metadata
   */
  async updatePage(pageId: string, updates: Partial<PageMetadata>): Promise<PageMetadata> {
    const updatedPage = await apiRequest(`/api/dev/pages/${pageId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    
    // Update cache
    if (updatedPage.slug) {
      this.cache.metadata.set(updatedPage.slug, updatedPage);
    }
    
    return updatedPage;
  }

  /**
   * Delete a page
   */
  async deletePage(pageId: string): Promise<void> {
    await apiRequest(`/api/dev/pages/${pageId}`, {
      method: 'DELETE',
    });
    
    // Invalidate cache
    this.invalidateCache();
  }

  /**
   * Clear all caches
   */
  invalidateCache(): void {
    this.cache.metadata.clear();
    this.cache.visibilityRules.clear();
    this.cache.documentation.clear();
    this.cache.templates.clear();
    this.cache.lastUpdated = 0;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cache.lastUpdated < this.CACHE_DURATION;
  }
}

// Export singleton instance
export const pageRegistry = new PageRegistryService();