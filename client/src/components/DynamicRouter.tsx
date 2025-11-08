/**
 * DynamicRouter - Flag-gated route validation component for PR-O3
 * Validates routes through Menu->Page->Feature chain when ENABLE_DYNAMIC_ROUTING=true
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Wrench, FileText, Menu as MenuIcon, Users } from 'lucide-react';

interface ValidationResult {
  canRender: boolean;
  path: string;
  error?: string;
  failedAt?: string;
  message?: string;
}

interface DynamicRouterProps {
  children: React.ReactNode;
  path: string;
}

// Phase-1 enforced routes (only these will be validated when flag is enabled)
const PHASE_1_ENFORCED_ROUTES = [
  '/dev-tools/pages',
  '/dev-tools/menu', 
  '/dev-tools/features',
  '/core/user-management'
];

const DynamicRouter = ({ children, path }: DynamicRouterProps) => {
  const [location, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if dynamic routing is enabled (defaults to false)
  const isDynamicRoutingEnabled = import.meta.env.VITE_ENABLE_DYNAMIC_ROUTING === 'true';
  
  // Check if current path is in phase-1 enforced set
  const isEnforcedRoute = PHASE_1_ENFORCED_ROUTES.includes(path);

  useEffect(() => {
    // Only validate if:
    // 1. Dynamic routing is enabled AND
    // 2. Route is in phase-1 enforced set AND  
    // 3. We're currently on this route
    if (!isDynamicRoutingEnabled || !isEnforcedRoute || location !== path) {
      setValidation(null);
      return;
    }

    validateRoute();
  }, [isDynamicRoutingEnabled, isEnforcedRoute, location, path]);

  const validateRoute = async () => {
    if (!currentUser) {
      setValidation({
        canRender: false,
        path,
        error: 'authentication_required',
        message: 'Authentication required'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/menu/validate-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ path })
      });

      const result = await response.json();
      setValidation(result);
    } catch (error) {
      console.error('Route validation failed:', error);
      setValidation({
        canRender: false,
        path,
        error: 'validation_error',
        message: 'Failed to validate route'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If dynamic routing is disabled OR route is not enforced, render normally
  if (!isDynamicRoutingEnabled || !isEnforcedRoute || location !== path) {
    return <>{children}</>;
  }

  // Show loading state during validation
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm text-muted-foreground">Validating route...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If validation passed, render the page
  if (validation?.canRender) {
    return <>{children}</>;
  }

  // If validation failed, show appropriate error based on user role
  if (validation && !validation.canRender) {
    const isSuperAdmin = currentUser?.role === 'super_admin';
    
    if (isSuperAdmin) {
      // Super admins see "Setup Required" with links to Dev Tools
      return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-orange-800">Setup Required</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-orange-700">
                  This page requires proper Menu→Page→Feature chain configuration.
                </p>
                
                <div className="bg-white border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Validation Failed At:</h4>
                  <p className="text-sm text-gray-600">
                    <strong>{validation.failedAt}</strong> - {validation.message}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Fix this issue using Dev Tools:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation('/dev-tools/pages')}
                      className="text-orange-700 border-orange-300 hover:bg-orange-50"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Page Manager
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation('/dev-tools/menu')}
                      className="text-orange-700 border-orange-300 hover:bg-orange-50"
                    >
                      <MenuIcon className="h-4 w-4 mr-1" />
                      Menu Manager
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation('/dev-tools/features')}
                      className="text-orange-700 border-orange-300 hover:bg-orange-50"
                    >
                      <Wrench className="h-4 w-4 mr-1" />
                      Feature Manager
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    } else {
      // Non-admin users see 404
      return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-red-800">Page Not Found</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  The page you're looking for doesn't exist or isn't available.
                </p>
                <Button onClick={() => setLocation('/')} variant="outline">
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Fallback - render normally if no validation result
  return <>{children}</>;
};

export default DynamicRouter;