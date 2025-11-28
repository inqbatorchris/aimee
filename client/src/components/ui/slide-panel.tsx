import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  width?: string;
  className?: string;
}

export function SlidePanel({
  open,
  onClose,
  children,
  title,
  description,
  width = 'sm:w-[500px]',
  className
}: SlidePanelProps) {
  const isMobile = useIsMobile();
  // Lock body scroll, handle keyboard events, and manage z-index for portal content
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      // Add body class to raise Radix portal content above the panel
      document.body.classList.add('slide-panel-open');
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.classList.remove('slide-panel-open');
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      {/* Background overlay - much higher z-index than Sheet */}
      <div 
        className="fixed inset-0 z-[200] bg-black/20 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Panel content - highest z-index */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full bg-background border-l border-border shadow-xl z-[210] transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col',
          'w-full sm:w-[500px] md:w-[600px]', // Responsive widths: full on mobile, fixed on desktop
          'translate-x-0', // Always visible when rendered
          isMobile && 'mobile-slide-panel', // Apply mobile-specific height handling
          className
        )}
        onClick={(e) => e.stopPropagation()} // Prevent event bubbling
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border w-full">
          <div className="flex-1 min-w-0">
            {title && (
              <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>
            )}
            {description && (
              <div className="text-sm text-muted-foreground mt-1">{description}</div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-muted flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className={cn(
          "flex-1 overflow-y-auto w-full",
          isMobile && "mobile-slide-panel-content" // Apply mobile-specific scrolling
        )}>
          <div className="w-full">
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

interface SlidePanelContainerProps {
  children: React.ReactNode;
  panelOpen: boolean;
  panelWidth?: string;
}

export function SlidePanelContainer({
  children,
  panelOpen,
  panelWidth = '500px'
}: SlidePanelContainerProps) {
  return (
    <div 
      className={cn(
        "transition-all duration-300 ease-in-out h-full",
        panelOpen && "sm:mr-[500px] md:mr-[600px]" // Only apply margin on larger screens
      )}
    >
      {children}
    </div>
  );
}