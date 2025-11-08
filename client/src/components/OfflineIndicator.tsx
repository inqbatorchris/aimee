import { Badge } from '@/components/ui/badge';
import { Wifi } from 'lucide-react';

export function OfflineIndicator() {
  // Simplified online-only indicator - offline functionality moved to field app
  const isOnline = navigator.onLine;

  return (
    <div className="flex items-center gap-2">
      {/* Connection status */}
      <Badge
        variant="default"
        className="flex items-center gap-1.5"
      >
        <Wifi className="h-3 w-3" />
        {isOnline ? 'Online' : 'Checking...'}
      </Badge>
    </div>
  );
}