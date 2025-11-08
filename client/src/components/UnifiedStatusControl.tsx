import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UnifiedStatus, getUnifiedStatusColor, isItemVisible } from "@shared/schema";
import { Eye, EyeOff, Settings, Archive, Zap } from "lucide-react";

interface UnifiedStatusControlProps {
  status: UnifiedStatus;
  onStatusChange?: (status: UnifiedStatus) => void;
  userRole: string;
  isReadOnly?: boolean;
  showVisibilityIndicator?: boolean;
}

export function UnifiedStatusControl({
  status,
  onStatusChange,
  userRole,
  isReadOnly = false,
  showVisibilityIndicator = true
}: UnifiedStatusControlProps) {
  const isVisible = isItemVisible(status, userRole);
  
  const statusOptions = [
    { value: 'draft' as UnifiedStatus, label: 'Draft', icon: Settings, description: 'Hidden from all users' },
    { value: 'dev' as UnifiedStatus, label: 'Dev', icon: Zap, description: 'Visible to admins only' },
    { value: 'live' as UnifiedStatus, label: 'Live', icon: Eye, description: 'Visible to all users' },
    { value: 'archived' as UnifiedStatus, label: 'Archived', icon: Archive, description: 'Hidden but preserved' }
  ];

  const currentOption = statusOptions.find(opt => opt.value === status);
  const StatusIcon = currentOption?.icon || Settings;

  if (isReadOnly) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className={getUnifiedStatusColor(status)}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {currentOption?.label || status}
        </Badge>
        {showVisibilityIndicator && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {isVisible ? 'Visible' : 'Hidden'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-32">
          <SelectValue>
            <div className="flex items-center gap-2">
              <StatusIcon className="w-3 h-3" />
              {currentOption?.label || status}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => {
            const OptionIcon = option.icon;
            return (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <OptionIcon className="w-3 h-3" />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      
      {showVisibilityIndicator && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {isVisible ? 'Visible' : 'Hidden'}
        </span>
      )}
    </div>
  );
}

// Helper component for just displaying status badge
export function UnifiedStatusBadge({ status }: { status: UnifiedStatus }) {
  const statusOptions = [
    { value: 'draft' as UnifiedStatus, label: 'Draft', icon: Settings },
    { value: 'dev' as UnifiedStatus, label: 'Dev', icon: Zap },
    { value: 'live' as UnifiedStatus, label: 'Live', icon: Eye },
    { value: 'archived' as UnifiedStatus, label: 'Archived', icon: Archive }
  ];

  const currentOption = statusOptions.find(opt => opt.value === status);
  const StatusIcon = currentOption?.icon || Settings;

  return (
    <Badge variant="secondary" className={getUnifiedStatusColor(status)}>
      <StatusIcon className="w-3 h-3 mr-1" />
      {currentOption?.label || status}
    </Badge>
  );
}