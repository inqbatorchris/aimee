
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DynamicPageRenderer from "@/components/DynamicPageRenderer";
import MyDay from "@/pages/MyDay";
import { Card, CardContent } from "@/components/ui/card";

interface Page {
  id: number;
  path: string;
  title: string;
  status: string;
  pageContent?: string | object;
}

const DynamicPage = () => {
  const [location] = useLocation();

  const { data: page, isLoading, isError } = useQuery({
    queryKey: ['/api/pages/by-path', location],
    queryFn: async () => {
      const response = await fetch(`/api/pages/by-path?path=${encodeURIComponent(location)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Page not found, will fallback to MyDay
        }
        throw new Error('Failed to fetch page');
      }
      
      return response.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm text-muted-foreground">Loading page...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !page) {
    // Fallback to MyDay for unknown routes instead of showing error
    return <MyDay />;
  }

  // Use DynamicPageRenderer for pages that have pageContent
  if (page.pageContent) {
    return <DynamicPageRenderer page={page} />;
  }

  // For pages without content, show a simple message
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <Card>
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-4">{page.title}</h1>
          <p className="text-muted-foreground">
            This page is being prepared. Check back soon!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DynamicPage;