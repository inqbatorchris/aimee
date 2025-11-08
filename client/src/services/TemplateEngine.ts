/**
 * Template Engine Service
 * 
 * Handles layout rendering, style compilation, and component injection for the page template system.
 * This service applies templates to pages and manages the visual consistency across the application.
 */

// Template layout structure definitions
export interface LayoutSection {
  id: string;
  type: 'header' | 'sidebar' | 'content' | 'footer' | 'panel' | 'toolbar';
  className?: string;
  style?: React.CSSProperties;
  children?: LayoutSection[];
  props?: Record<string, any>;
}

export interface PageTemplate {
  id: string;
  name: string;
  description?: string;
  layoutStructure: LayoutSection;
  defaultStyles?: Record<string, any>;
  requiredProps?: string[];
  category: 'dashboard' | 'form' | 'table' | 'detail' | 'auth' | 'custom';
}

// Built-in templates for different page types
export const DEFAULT_TEMPLATES: PageTemplate[] = [
  {
    id: 'dashboard',
    name: 'Dashboard Template',
    description: 'Grid-based layout for dashboards with cards and widgets',
    category: 'dashboard',
    layoutStructure: {
      id: 'dashboard-root',
      type: 'content',
      className: 'min-h-screen bg-background',
      children: [
        {
          id: 'dashboard-header',
          type: 'header',
          className: 'border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
          props: { sticky: true }
        },
        {
          id: 'dashboard-main',
          type: 'content',
          className: 'flex-1 space-y-6 p-6',
          children: [
            {
              id: 'dashboard-grid',
              type: 'content',
              className: 'grid gap-6 md:grid-cols-2 lg:grid-cols-3'
            }
          ]
        }
      ]
    },
    defaultStyles: {
      '--dashboard-card-radius': '8px',
      '--dashboard-spacing': '1.5rem',
      '--dashboard-header-height': '64px'
    }
  },
  
  {
    id: 'form',
    name: 'Form Template',
    description: 'Clean form layout with validation and progress indicators',
    category: 'form',
    layoutStructure: {
      id: 'form-root',
      type: 'content',
      className: 'min-h-screen bg-background',
      children: [
        {
          id: 'form-header',
          type: 'header',
          className: 'border-b px-6 py-4'
        },
        {
          id: 'form-main',
          type: 'content',
          className: 'flex-1 p-6',
          children: [
            {
              id: 'form-container',
              type: 'content',
              className: 'mx-auto max-w-2xl space-y-8'
            }
          ]
        },
        {
          id: 'form-footer',
          type: 'footer',
          className: 'border-t px-6 py-4 bg-muted/50'
        }
      ]
    },
    defaultStyles: {
      '--form-max-width': '672px',
      '--form-spacing': '2rem',
      '--form-border-radius': '6px'
    }
  },

  {
    id: 'table',
    name: 'Table Template', 
    description: 'Data table layout with filters, search, and pagination',
    category: 'table',
    layoutStructure: {
      id: 'table-root',
      type: 'content',
      className: 'min-h-screen bg-background',
      children: [
        {
          id: 'table-header',
          type: 'header',
          className: 'border-b px-6 py-4'
        },
        {
          id: 'table-toolbar',
          type: 'toolbar',
          className: 'border-b px-6 py-3 bg-muted/30'
        },
        {
          id: 'table-main',
          type: 'content',
          className: 'flex-1 p-6',
          children: [
            {
              id: 'table-container',
              type: 'content',
              className: 'rounded-lg border bg-card'
            }
          ]
        }
      ]
    },
    defaultStyles: {
      '--table-header-height': '56px',
      '--table-row-height': '48px',
      '--table-border-radius': '8px'
    }
  },

  {
    id: 'detail-panel',
    name: 'Detail Panel Template',
    description: 'Slide-out panel layout for detailed views and editing',
    category: 'detail',
    layoutStructure: {
      id: 'detail-root',
      type: 'content',
      className: 'fixed inset-y-0 right-0 z-50 w-full sm:w-96 lg:w-[500px]',
      children: [
        {
          id: 'detail-header',
          type: 'header',
          className: 'border-b px-6 py-4 bg-background'
        },
        {
          id: 'detail-content',
          type: 'content',
          className: 'flex-1 overflow-y-auto p-6'
        },
        {
          id: 'detail-footer',
          type: 'footer',
          className: 'border-t px-6 py-4 bg-muted/50'
        }
      ]
    },
    defaultStyles: {
      '--detail-panel-width': '500px',
      '--detail-panel-shadow': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      '--detail-animation-duration': '0.3s'
    }
  },

  {
    id: 'auth',
    name: 'Authentication Template',
    description: 'Centered layout for login, signup, and auth flows',
    category: 'auth',
    layoutStructure: {
      id: 'auth-root',
      type: 'content',
      className: 'min-h-screen flex items-center justify-center bg-muted/50',
      children: [
        {
          id: 'auth-container',
          type: 'content',
          className: 'w-full max-w-md space-y-6 p-6 bg-background rounded-lg border shadow-lg'
        }
      ]
    },
    defaultStyles: {
      '--auth-container-width': '448px',
      '--auth-border-radius': '8px',
      '--auth-shadow': '0 10px 15px -3px rgb(0 0 0 / 0.1)'
    }
  }
];

class TemplateEngineService {
  private templates: Map<string, PageTemplate> = new Map();
  private compiledStyles: Map<string, string> = new Map();

  constructor() {
    // Load default templates
    DEFAULT_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Get all available templates
   */
  getAvailableTemplates(): PageTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: PageTemplate['category']): PageTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(templateId: string): PageTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Apply a template to a page component
   */
  applyTemplate(
    templateId: string,
    content: React.ReactNode,
    customConfig?: Partial<LayoutSection>,
    customStyles?: Record<string, any>
  ): React.ReactNode {
    const template = this.getTemplate(templateId);
    if (!template) {
      console.warn(`Template ${templateId} not found, using content as-is`);
      return content;
    }

    // Merge custom configuration with template
    const layoutStructure = customConfig 
      ? this.mergeLayoutConfig(template.layoutStructure, customConfig)
      : template.layoutStructure;

    // Compile styles
    const styles = this.compileStyles(template, customStyles);

    // Render the template with content
    return this.renderLayoutSection(layoutStructure, content, styles);
  }

  /**
   * Render a layout section recursively
   */
  private renderLayoutSection(
    section: LayoutSection,
    content?: React.ReactNode,
    styles?: Record<string, any>
  ): React.ReactNode {
    // This would be implemented with actual React components in practice
    // For now, we return a structure that can be used by the PageFactory
    return {
      type: section.type,
      id: section.id,
      className: section.className,
      style: { ...section.style, ...styles },
      props: section.props,
      children: section.children?.map(child => 
        this.renderLayoutSection(child, undefined, styles)
      ),
      content: content
    };
  }

  /**
   * Compile styles from template and custom overrides
   */
  private compileStyles(
    template: PageTemplate,
    customStyles?: Record<string, any>
  ): Record<string, any> {
    const cacheKey = `${template.id}-${JSON.stringify(customStyles)}`;
    
    if (this.compiledStyles.has(cacheKey)) {
      return JSON.parse(this.compiledStyles.get(cacheKey) || '{}');
    }

    const compiledStyles = {
      ...template.defaultStyles,
      ...customStyles
    };

    this.compiledStyles.set(cacheKey, JSON.stringify(compiledStyles));
    return compiledStyles;
  }

  /**
   * Merge custom layout configuration with template
   */
  private mergeLayoutConfig(
    template: LayoutSection,
    custom: Partial<LayoutSection>
  ): LayoutSection {
    return {
      ...template,
      ...custom,
      children: custom.children || template.children,
      style: { ...template.style, ...custom.style },
      props: { ...template.props, ...custom.props }
    };
  }

  /**
   * Register a new custom template
   */
  registerTemplate(template: PageTemplate): void {
    this.templates.set(template.id, template);
    // Clear compiled styles cache for this template
    this.compiledStyles.forEach((value, key) => {
      if (key.startsWith(`${template.id}-`)) {
        this.compiledStyles.delete(key);
      }
    });
  }

  /**
   * Unregister a template
   */
  unregisterTemplate(templateId: string): void {
    this.templates.delete(templateId);
    // Clear compiled styles cache
    this.compiledStyles.forEach((value, key) => {
      if (key.startsWith(`${templateId}-`)) {
        this.compiledStyles.delete(key);
      }
    });
  }

  /**
   * Generate CSS variables for a template
   */
  generateCSSVariables(templateId: string, customStyles?: Record<string, any>): string {
    const template = this.getTemplate(templateId);
    if (!template) return '';

    const styles = this.compileStyles(template, customStyles);
    
    return Object.entries(styles)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n');
  }

  /**
   * Validate template structure
   */
  validateTemplate(template: PageTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.id) {
      errors.push('Template ID is required');
    }

    if (!template.name) {
      errors.push('Template name is required');
    }

    if (!template.layoutStructure) {
      errors.push('Layout structure is required');
    }

    if (!['dashboard', 'form', 'table', 'detail', 'auth', 'custom'].includes(template.category)) {
      errors.push('Invalid template category');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.compiledStyles.clear();
  }
}

// Export singleton instance
export const templateEngine = new TemplateEngineService();