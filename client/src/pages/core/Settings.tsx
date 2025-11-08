import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { Building2, Users, Palette } from 'lucide-react';

const Settings = () => {
  const [, setLocation] = useLocation();

  const settingsCards = [
    {
      title: 'Organization Settings',
      description: 'Configure organization-wide settings and branding',
      icon: Building2,
      path: '/core/organization-settings',
      linkText: 'Open →'
    },
    {
      title: 'User Management', 
      description: 'Manage team members, roles, and permissions',
      icon: Users,
      path: '/core/user-management',
      linkText: 'Open →'
    },
    {
      title: 'Theme Editor',
      description: 'Customize the look and feel of your platform',
      icon: Palette,
      path: '/core/theme-editor',
      linkText: 'Open →'
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h1 className="font-bold text-foreground text-[20px] mt-[0px] mb-[0px]">Settings</h1>
          <p className="text-muted-foreground mt-2 text-[12px]">Manage your account, organisation, and platform settings</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {settingsCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setLocation(card.path)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 text-[14px]">
                      <CardTitle className="font-semibold tracking-tight text-[14px]">{card.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-[12px]">
                    {card.description}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-primary hover:underline text-[13px]">
                      {card.linkText}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Settings;