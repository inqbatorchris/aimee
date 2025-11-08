/**
 * DevToolsFeatures - Dynamic page wrapper for Feature Manager functionality
 * Maintains exact functionality from the original DevTools tab
 */

import FeatureManagerTable from '@/pages/FeatureManagerTable';
import { Package, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

const DevToolsFeatures = () => {
  const [, setLocation] = useLocation();
  
  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b bg-white shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/core/dev-tools')}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Package className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Feature Manager</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <FeatureManagerTable />
      </div>
    </div>
  );
};

export default DevToolsFeatures;