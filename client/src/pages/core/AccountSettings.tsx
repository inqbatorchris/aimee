import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';

const AccountSettings = () => {
  // Fetch dynamic content but fall back to static content if API fails
  const { data: pageContent, isLoading, error } = useQuery({
    queryKey: ['/api/pages/72de0359-cdfd-4507-83b1-dad5a0f04ac3/content'],
    queryFn: async () => {
      const response = await fetch('/api/pages/72de0359-cdfd-4507-83b1-dad5a0f04ac3/content');
      if (!response.ok) return null; // Return null instead of throwing
      return response.json();
    }
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
            <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your personal account preferences and security settings
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Profile Information</h3>
              <p className="text-sm text-muted-foreground">
                Update your personal details and contact information
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Security Settings</h3>
              <p className="text-sm text-muted-foreground">
                Manage passwords, two-factor authentication, and security preferences
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Notification Preferences</h3>
              <p className="text-sm text-muted-foreground">
                Configure email and push notification settings
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Privacy Settings</h3>
              <p className="text-sm text-muted-foreground">
                Control your privacy and data sharing preferences
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }


  // If we have dynamic content and it's properly formatted, render it
  if (pageContent && pageContent.content && Array.isArray(pageContent.content)) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="border-b pb-4">
            <h1 className="text-2xl font-bold text-foreground">{pageContent.title}</h1>
            <p className="text-muted-foreground mt-2">{pageContent.description}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {pageContent.content.map((section: any, index: number) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {section.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Fallback to static content
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal account preferences and security settings
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Update your personal details and contact information
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage passwords, two-factor authentication, and security preferences
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure email and push notification settings
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Control your privacy and data sharing preferences
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;