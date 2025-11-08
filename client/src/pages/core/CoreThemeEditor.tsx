/**
 * CoreThemeEditor.tsx
 * 
 * Dynamic page wrapper for Theme Editor functionality.
 * This minimal wrapper follows the page-driven architecture pattern,
 * rendering the full theme editing tools in a single consolidated view.
 */

import ThemeEditorContent from '@/components/theme-editor/ThemeEditorContent';
import { Palette, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

const CoreThemeEditor = () => {
  const [, setLocation] = useLocation();
  
  return (
    <div className="h-full p-4">
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/core/account-settings')}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Palette className="h-5 w-5" />
        <h1 className="font-bold text-[20px]">Theme Editor</h1>
      </div>
      <div className="h-[calc(100%-60px)]">
        <ThemeEditorContent />
      </div>
    </div>
  );
};

export default CoreThemeEditor;