import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

export function BrandLogo({ className, size = 'md', showText = true, collapsed = false, onClick }: BrandLogoProps) {
  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };
  
  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  const { currentUser } = useAuth();

  // Fetch organization data for logo
  const { data: orgData } = useQuery<any>({
    queryKey: [`/api/organizations/${currentUser?.organizationId}`],
    enabled: !!currentUser?.organizationId
  });

  const logoUrl = orgData?.organization?.logoUrl || '';
  const squareLogoUrl = orgData?.organization?.squareLogoUrl || '';
  const companyName = orgData?.organization?.name || 'aimee.works';

  // Use square logo when collapsed, otherwise use main logo
  const displayLogoUrl = collapsed && squareLogoUrl ? squareLogoUrl : logoUrl;

  // Update favicon when square logo is available
  useEffect(() => {
    if (squareLogoUrl) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = squareLogoUrl;
      if (!document.querySelector("link[rel*='icon']")) {
        document.getElementsByTagName('head')[0].appendChild(link);
      }
    }
  }, [squareLogoUrl]);

  return (
    <div 
      className={cn('flex items-center gap-2', className, onClick && 'cursor-pointer')}
      onClick={onClick}
      title={onClick ? 'Toggle sidebar' : undefined}
    >
      {displayLogoUrl ? (
        <>
          {/* Custom logo image - square logo when collapsed, main logo otherwise */}
          <img 
            src={displayLogoUrl}
            alt={companyName}
            className={cn(
              "object-contain",
              collapsed ? "h-[1.4rem] w-[1.4rem]" : "h-[1.4rem] w-auto"
            )}
            onError={(e) => {
              // Hide image and show default logo on error
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          {/* Fallback for broken image */}
          <div className="hidden items-center gap-2" style={{ display: 'none' }}>
            <Zap className={cn(iconSizes[size], 'text-primary')} />
            {showText && (
              <span className={cn(textSizes[size], 'font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent')}>
                {companyName}
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Default logo: Lightning bolt icon with text */}
          <Zap className={cn(iconSizes[size], 'text-primary')} />
          {showText && (
            <span className={cn(textSizes[size], 'font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent')}>
              {companyName}
            </span>
          )}
        </>
      )}
    </div>
  );
}