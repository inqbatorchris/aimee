/**
 * DevToolsPages - Dynamic page wrapper for Page Manager functionality
 * Maintains exact functionality from the original DevTools tab
 */

import PageManager from '@/pages/PageManager';
import { FileText, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

const DevToolsPages = () => {
  const [, setLocation] = useLocation();
  
  return (
    <div className="h-full p-4 max-w-screen-2xl mx-auto w-full overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/core/dev-tools')}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <FileText className="h-5 w-5" />
        <h1 className="font-bold text-[18px] mt-[6px] mb-[6px]">Page Manager</h1>
      </div>
      <div className="h-[calc(100%-60px)]">
        <PageManager />
      </div>
    </div>
  );
};

export default DevToolsPages;