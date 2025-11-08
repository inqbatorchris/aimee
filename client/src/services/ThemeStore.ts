/**
 * ThemeStore - Centralized theme management service
 * Handles caching, loading, and applying organization themes
 */

interface OrganizationTheme {
  organizationId: number;
  activeTheme: 'light' | 'dark';
  lightTheme: Record<string, any>;
  darkTheme: Record<string, any>;
  brandSettings?: {
    companyName?: string;
    tagline?: string;
    logoUrl?: string;
    favicon?: string;
    primaryFont?: string;
    headingFont?: string;
  };
  layoutSettings?: Record<string, any>;
  customCSS?: string;
  updatedAt?: string;
}

class ThemeStore {
  private static instance: ThemeStore;
  private themeCache: Map<number, OrganizationTheme> = new Map();
  private currentOrgId: number | null = null;
  private lastFetchTime: Map<number, number> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  private constructor() {}

  static getInstance(): ThemeStore {
    if (!ThemeStore.instance) {
      ThemeStore.instance = new ThemeStore();
    }
    return ThemeStore.instance;
  }

  /**
   * Load theme for organization - uses cache if available and fresh
   */
  async loadTheme(organizationId: number, forceRefresh = false): Promise<OrganizationTheme | null> {
    // Check cache first
    if (!forceRefresh && this.isCacheValid(organizationId)) {
      console.log('Using cached theme for organization:', organizationId);
      return this.themeCache.get(organizationId) || null;
    }

    // Fetch from API
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('No auth token available for theme loading');
        return null;
      }

      const response = await fetch('/api/auth/theme-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch theme:', response.status);
        return null;
      }

      const theme = await response.json();
      
      // Update cache
      this.themeCache.set(organizationId, theme);
      this.lastFetchTime.set(organizationId, Date.now());
      this.currentOrgId = organizationId;

      console.log('Loaded and cached theme for organization:', organizationId);
      return theme;
    } catch (error) {
      console.error('Error loading theme:', error);
      return null;
    }
  }

  /**
   * Save theme to server and update cache
   */
  async saveTheme(organizationId: number, theme: Partial<OrganizationTheme>): Promise<boolean> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return false;

      const response = await fetch('/api/auth/theme-settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(theme)
      });

      if (response.ok) {
        // Update cache with new theme
        const existingTheme = this.themeCache.get(organizationId) || {} as OrganizationTheme;
        const updatedTheme = { ...existingTheme, ...theme, organizationId };
        this.themeCache.set(organizationId, updatedTheme);
        this.lastFetchTime.set(organizationId, Date.now());
        
        console.log('Theme saved and cache updated for organization:', organizationId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error saving theme:', error);
      return false;
    }
  }

  /**
   * Get current theme from cache
   */
  getCurrentTheme(): OrganizationTheme | null {
    if (!this.currentOrgId) return null;
    return this.themeCache.get(this.currentOrgId) || null;
  }

  /**
   * Clear cache for organization or all
   */
  clearCache(organizationId?: number): void {
    if (organizationId) {
      this.themeCache.delete(organizationId);
      this.lastFetchTime.delete(organizationId);
    } else {
      this.themeCache.clear();
      this.lastFetchTime.clear();
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(organizationId: number): boolean {
    const lastFetch = this.lastFetchTime.get(organizationId);
    if (!lastFetch) return false;
    
    const age = Date.now() - lastFetch;
    return age < this.CACHE_DURATION;
  }

  /**
   * Apply theme to DOM
   */
  applyTheme(theme: OrganizationTheme): void {
    if (!theme) return;

    console.log('🎨 Starting theme application...');
    const root = document.documentElement;
    const hadLoadingClass = root.classList.contains('theme-loading');
    console.log('🎨 HTML has theme-loading class:', hadLoadingClass);
    
    const colors = theme.activeTheme === 'dark' ? theme.darkTheme : theme.lightTheme;
    
    // Apply theme mode class
    root.classList.remove('light', 'dark');
    root.classList.add(theme.activeTheme);
    
    // Apply colors
    if (colors) {
      Object.entries(colors).forEach(([key, value]: [string, any]) => {
        if (key === 'radius') {
          root.style.setProperty('--radius', `${value}px`);
        } else if (typeof value === 'string') {
          // Convert hex to HSL if needed
          const hslValue = value.startsWith('#') ? this.hexToHSL(value) : value;
          root.style.setProperty(`--${key}`, hslValue);
        }
      });
    }

    // Apply brand settings
    if (theme.brandSettings) {
      root.style.setProperty('--primary-font', theme.brandSettings.primaryFont || 'Inter');
      root.style.setProperty('--heading-font', theme.brandSettings.headingFont || 'Inter');
    }

    // Apply layout settings
    if (theme.layoutSettings) {
      this.applyLayoutSettings(theme.layoutSettings);
    }

    // Apply custom CSS
    if (theme.customCSS) {
      this.applyCustomCSS(theme.customCSS);
    }

    // Remove loading class to show content now that theme is applied
    root.classList.remove('theme-loading');
    root.classList.add('theme-loaded');
    
    console.log('✅ Theme applied successfully - content now visible');
  }

  /**
   * Convert hex color to HSL
   */
  private hexToHSL(hex: string): string {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  }

  /**
   * Apply layout settings to DOM
   */
  private applyLayoutSettings(settings: Record<string, any>): void {
    const root = document.documentElement;
    
    // Mapping from camelCase theme properties to kebab-case CSS variables
    const variableMapping: Record<string, { cssVar: string; unit: string }> = {
      // Font sizes (need px units)
      fontSize: { cssVar: '--base-font-size', unit: 'px' },
      menuTextSize: { cssVar: '--menu-text-size', unit: 'px' },
      buttonTextSize: { cssVar: '--button-text-size', unit: 'px' },
      h1Size: { cssVar: '--h1-size', unit: 'px' },
      h2Size: { cssVar: '--h2-size', unit: 'px' },
      h3Size: { cssVar: '--h3-size', unit: 'px' },
      h4Size: { cssVar: '--h4-size', unit: 'px' },
      h5Size: { cssVar: '--h5-size', unit: 'px' },
      h6Size: { cssVar: '--h6-size', unit: 'px' },
      smallSize: { cssVar: '--small-size', unit: 'px' },
      tinySize: { cssVar: '--tiny-size', unit: 'px' },
      
      // Scale factors (unitless)
      fontScale: { cssVar: '--font-scale', unit: '' },
      spacing: { cssVar: '--spacing-scale', unit: '' },
      verticalSpacing: { cssVar: '--vertical-spacing-scale', unit: '' },
      
      // Layout dimensions (need px units)
      contentWidth: { cssVar: '--content-width', unit: 'px' },
      sidebarWidth: { cssVar: '--sidebar-width', unit: 'px' },
      
      // Button padding sizes (need px units)
      buttonSmallSize: { cssVar: '--button-small-padding', unit: 'px' },
      buttonDefaultSize: { cssVar: '--button-default-padding', unit: 'px' },
      buttonLargeSize: { cssVar: '--button-large-padding', unit: 'px' },
      
      // Label/Badge styling (need px units for padding, px for radius)
      labelRadius: { cssVar: '--label-radius', unit: 'px' },
      labelPadding: { cssVar: '--label-padding', unit: 'px' },
      
      // Button styling
      buttonRadius: { cssVar: '--button-radius', unit: 'px' }
    };
    
    Object.entries(settings).forEach(([key, value]) => {
      const mapping = variableMapping[key];
      
      if (mapping) {
        // Use mapped CSS variable name with correct unit
        const cssValue = mapping.unit ? `${value}${mapping.unit}` : value;
        root.style.setProperty(mapping.cssVar, cssValue);
        
        // Also set camelCase version for backward compatibility
        root.style.setProperty(`--${key}`, cssValue);
        
        console.log(`Applied theme setting: ${mapping.cssVar} = ${cssValue}`);
      } else {
        // Fallback for unmapped variables
        const cssValue = typeof value === 'number' ? `${value}px` : value;
        root.style.setProperty(`--${key}`, cssValue);
        console.log(`Applied unmapped theme setting: --${key} = ${cssValue}`);
      }
    });
    
    console.log('Layout settings applied successfully');
  }

  /**
   * Apply custom CSS
   */
  private applyCustomCSS(css: string): void {
    // Remove existing custom style if any
    const existingStyle = document.getElementById('org-custom-css');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add new custom CSS
    if (css && css.trim()) {
      const styleElement = document.createElement('style');
      styleElement.id = 'org-custom-css';
      styleElement.textContent = css;
      document.head.appendChild(styleElement);
    }
  }
}

export default ThemeStore;
export type { OrganizationTheme };