import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import DynamicPageRenderer from '@/components/DynamicPageRenderer';
import type { Page, LayoutTemplate } from '@shared/schema';

const DevTools = () => {
  // Fetch the page record
  const { data: page, isLoading, error } = useQuery<Page>({
    queryKey: ['/api/dev/pages/dev-tools-core'],
    queryFn: async () => {
      const response = await fetch('/api/dev/pages');
      if (!response.ok) throw new Error('Failed to fetch pages');
      const pages = await response.json();
      const targetPage = pages.find((p: Page) => p.slug === 'dev-tools-core');
      if (!targetPage) throw new Error('Dev Tools page not found');
      return targetPage;
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
        <div className="space-y-6">
          <div className="border-b pb-4">
            <h1 className="font-bold text-foreground text-[18px]">Developer Tools</h1>
            <p className="text-muted-foreground text-[12px] mt-[0px] mb-[0px]">
              Manage pages, features, and platform configuration
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/dev-tools/pages">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col space-y-1.5 p-6 pt-[0.6px] pb-[0.6px]">
                  <CardTitle className="tracking-tight text-[14px] mt-[0px] mb-[0px] font-medium">Page Manager</CardTitle>
                </CardHeader>
                <CardContent className="p-6 text-[12px] pl-[5.6px] pr-[5.6px] pt-[0.6px] pb-[0.6px]">
                  <p className="text-muted-foreground text-[12px]">
                    Manage platform pages and their configurations
                  </p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/dev-tools/menu">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col space-y-1.5 p-6 pt-[0.6px] pb-[0.6px]">
                  <CardTitle className="tracking-tight text-[14px] mt-[0px] mb-[0px] font-medium">Menu Manager</CardTitle>
                </CardHeader>
                <CardContent className="p-6 text-[12px] pl-[5.6px] pr-[5.6px] pt-[0.6px] pb-[0.6px]">
                  <p className="text-muted-foreground text-[12px]">
                    Configure navigation menus and structure
                  </p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/dev-tools/features">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col space-y-1.5 p-6 pt-[0.6px] pb-[0.6px]">
                  <CardTitle className="tracking-tight text-[14px] mt-[0px] mb-[0px] font-medium">Feature Manager</CardTitle>
                </CardHeader>
                <CardContent className="p-6 text-[12px] pl-[5.6px] pr-[5.6px] pt-[0.6px] pb-[0.6px]">
                  <p className="text-muted-foreground text-[12px]">
                    Manage platform features and configurations
                  </p>
                </CardContent>
              </Card>
            </Link>
            
            
            <Link href="/dev-tools/documentation">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col space-y-1.5 p-6 pt-[0.6px] pb-[0.6px]">
                  <CardTitle className="tracking-tight text-[14px] mt-[0px] mb-[0px] font-medium">Documentation</CardTitle>
                </CardHeader>
                <CardContent className="p-6 text-[12px] pl-[5.6px] pr-[5.6px] pt-[0.6px] pb-[0.6px]">
                  <p className="text-muted-foreground text-[12px]">
                    Auto-generated platform documentation
                  </p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/core/super-admin-platform-manager">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col space-y-1.5 p-6 pt-[0.6px] pb-[0.6px]">
                  <CardTitle className="tracking-tight text-[14px] mt-[0px] mb-[0px] font-medium">Super Admin Platform Manager</CardTitle>
                </CardHeader>
                <CardContent className="p-6 text-[12px] pl-[5.6px] pr-[5.6px] pt-[0.6px] pb-[0.6px]">
                  <p className="text-muted-foreground text-[12px]">
                    System-wide administration and platform management
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
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
            The Dev Tools page configuration could not be found.
          </p>
        </div>
      </div>
    );
  }

  return <DynamicPageRenderer page={page} layoutTemplate={layoutTemplate || undefined} />;
};

export default DevTools;