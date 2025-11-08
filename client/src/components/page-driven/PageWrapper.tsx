/**
 * Page Wrapper Component
 * 
 * Wraps page components with template application, metadata injection, and theme consistency.
 * This component is the core of the page-driven architecture system.
 */

import React, { useEffect, Suspense } from 'react';
import { PageMetadata } from '@/services/PageRegistry';
import { PageTemplate } from '@/services/TemplateEngine';
import { Loader2 } from 'lucide-react';

export interface PageWrapperProps {
  pageMetadata: PageMetadata;
  template?: PageTemplate;
  customStyles?: Record<string, any>;
  customProps?: Record<string, any>;
  children: React.ReactNode;
  className?: string;
}

// Loading fallback component
function PageLoadingFallback({ pageTitle }: { pageTitle: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading {pageTitle}...</p>
      </div>
    </div>
  );
}

// Error fallback component
function PageErrorFallback({ 
  pageTitle, 
  error 
}: { 
  pageTitle: string; 
  error: Error | null; 
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4 p-6 max-w-md">
        <div className="mx-auto w-12 h-12 text-muted-foreground text-2xl">
          ⚠️
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Page Not Available
        </h2>
        <p className="text-muted-foreground">
          Failed to load {pageTitle}
        </p>
        {error && (
          <details className="mt-4 text-sm text-left">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Error Details
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

export function PageWrapper({
  pageMetadata,
  template,
  customStyles,
  customProps,
  children,
  className
}: PageWrapperProps) {
  // Apply SEO metadata
  useEffect(() => {
    // Update document title
    const titlePrefix = 'aimee.works';
    document.title = pageMetadata.title 
      ? `${pageMetadata.title} | ${titlePrefix}`
      : titlePrefix;
    
    // Update meta description
    if (pageMetadata.description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', pageMetadata.description);
    }

    // Apply custom meta tags from page metadata
    if (pageMetadata.metaTags) {
      Object.entries(pageMetadata.metaTags).forEach(([key, value]) => {
        let existingMeta = document.querySelector(`meta[name="${key}"]`);
        if (!existingMeta) {
          existingMeta = document.createElement('meta');
          existingMeta.setAttribute('name', key);
          document.head.appendChild(existingMeta);
        }
        existingMeta.setAttribute('content', String(value));
      });
    }

    // Cleanup function to remove custom meta tags when component unmounts
    return () => {
      if (pageMetadata.metaTags) {
        Object.keys(pageMetadata.metaTags).forEach(key => {
          const metaElement = document.querySelector(`meta[name="${key}"]`);
          if (metaElement && metaElement.getAttribute('content') === String(pageMetadata.metaTags![key])) {
            metaElement.remove();
          }
        });
      }
    };
  }, [pageMetadata]);

  // Apply custom CSS styles
  useEffect(() => {
    const styleElementId = `page-styles-${pageMetadata.id}`;
    let styleElement = document.getElementById(styleElementId) as HTMLStyleElement;

    if (customStyles || pageMetadata.customCss) {
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleElementId;
        document.head.appendChild(styleElement);
      }
      
      let cssContent = '';
      
      // Add CSS variables from customStyles
      if (customStyles) {
        const cssVariables = Object.entries(customStyles)
          .filter(([key]) => key.startsWith('--'))
          .map(([key, value]) => `${key}: ${value};`)
          .join('\n');
        
        if (cssVariables) {
          cssContent += `:root {\n${cssVariables}\n}\n`;
        }

        // Add regular CSS rules
        const regularStyles = Object.entries(customStyles)
          .filter(([key]) => !key.startsWith('--'))
          .map(([selector, rules]) => {
            if (typeof rules === 'object') {
              const ruleStrings = Object.entries(rules as Record<string, any>)
                .map(([prop, value]) => `${prop}: ${value};`)
                .join('\n  ');
              return `${selector} {\n  ${ruleStrings}\n}`;
            }
            return `${selector} { ${rules} }`;
          })
          .join('\n');
        
        cssContent += regularStyles;
      }
      
      // Add custom CSS from page metadata
      if (pageMetadata.customCss) {
        cssContent += '\n' + pageMetadata.customCss;
      }
      
      styleElement.textContent = cssContent;
    }

    // Cleanup function
    return () => {
      const element = document.getElementById(styleElementId);
      if (element) {
        element.remove();
      }
    };
  }, [customStyles, pageMetadata.customCss, pageMetadata.id]);

  // Combine className with template-specific classes
  const wrapperClassName = [
    'page-wrapper',
    template?.category && `page-template-${template.category}`,
    pageMetadata.category && `page-category-${pageMetadata.category}`,
    pageMetadata.isCorePage ? 'core-page' : 'addon-page',
    className
  ].filter(Boolean).join(' ');

  // Create wrapper props
  const wrapperProps = {
    className: wrapperClassName,
    'data-page-id': pageMetadata.id,
    'data-page-slug': pageMetadata.slug,
    'data-page-category': pageMetadata.category || 'uncategorized',
    'data-page-status': pageMetadata.status,
    'data-is-core-page': pageMetadata.isCorePage,
    'data-template-id': template?.id,
    ...customProps
  };

  // If we have a template, we should apply it here
  // For now, we'll render children directly with the wrapper
  return (
    <div {...wrapperProps}>
      <Suspense 
        fallback={<PageLoadingFallback pageTitle={pageMetadata.title} />}
      >
        {children}
      </Suspense>
    </div>
  );
}

// HOC to wrap pages with metadata
export function withPageWrapper<P extends object>(
  Component: React.ComponentType<P>,
  pageMetadata: PageMetadata,
  template?: PageTemplate
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <PageWrapper pageMetadata={pageMetadata} template={template}>
      <Component {...props} ref={ref} />
    </PageWrapper>
  ));

  WrappedComponent.displayName = `withPageWrapper(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Error boundary specifically for page components
export class PageErrorBoundary extends React.Component<
  { 
    pageMetadata: PageMetadata; 
    fallback?: React.ComponentType<{ error: Error; pageTitle: string }>; 
    children: React.ReactNode; 
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Page error in ${this.props.pageMetadata.title}:`, error, errorInfo);
    
    // TODO: Send error to monitoring service
    // errorReporting.captureException(error, {
    //   tags: {
    //     page_id: this.props.pageMetadata.id,
    //     page_slug: this.props.pageMetadata.slug,
    //     page_category: this.props.pageMetadata.category
    //   }
    // });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || PageErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error} 
          pageTitle={this.props.pageMetadata.title} 
        />
      );
    }

    return this.props.children;
  }
}