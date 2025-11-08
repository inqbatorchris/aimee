import { useQuery } from '@tanstack/react-query';
import DynamicPageRenderer from '@/components/DynamicPageRenderer';
import type { Page, LayoutTemplate } from '@shared/schema';

const DynamicMyDay = () => {
  // Fetch the My Day page record
  const { data: page, isLoading, error } = useQuery<Page>({
    queryKey: ['/api/dev/pages/my-day-dynamic'],
    queryFn: async () => {
      const response = await fetch('/api/dev/pages');
      if (!response.ok) throw new Error('Failed to fetch pages');
      const pages = await response.json();
      const myDayPage = pages.find((p: Page) => p.slug === 'my-day-dynamic');
      if (!myDayPage) throw new Error('My Day page not found');
      return myDayPage;
    }
  });

  // Fetch layout template if assigned
  const { data: layoutTemplate } = useQuery<LayoutTemplate>({
    queryKey: ['/api/dev/layout-templates', page?.layoutTemplateId],
    queryFn: async () => {
      if (!page?.layoutTemplateId) return null;
      const response = await fetch(`/api/dev/layout-templates/${page.layoutTemplateId}`);
      if (!response.ok) throw new Error('Failed to fetch layout template');
      return response.json();
    },
    enabled: !!page?.layoutTemplateId
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Page Load Error</h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Failed to load page'}
          </p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
          <p className="text-muted-foreground">
            The My Day page configuration could not be found.
          </p>
        </div>
      </div>
    );
  }

  return <DynamicPageRenderer page={page} layoutTemplate={layoutTemplate || undefined} />;
};

export default DynamicMyDay;