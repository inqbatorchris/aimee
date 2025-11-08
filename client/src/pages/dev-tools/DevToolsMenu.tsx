/**
 * DevToolsMenu - Dynamic page wrapper for Menu Manager functionality
 * Maintains exact functionality from the original DevTools tab
 */

import MenuBuilder from './MenuBuilder';
import { Menu, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

const DevToolsMenu = () => {
  const [, setLocation] = useLocation();
  
  return (
    <div className="h-full p-4">
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/core/dev-tools')}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Menu className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Menu Manager</h1>
      </div>
      <div className="h-[calc(100%-60px)]">
        <MenuBuilder />
      </div>
    </div>
  );
};

export default DevToolsMenu;