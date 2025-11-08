import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MoreVertical } from 'lucide-react';

interface MobileWorkItemCardProps {
  item: any;
  onClick: () => void;
  onStatusClick?: (e: React.MouseEvent) => void;
  onAssigneeClick?: (e: React.MouseEvent) => void;
  onMenuClick?: (e: React.MouseEvent) => void;
  compact?: boolean;
}

export function MobileWorkItemCard({
  item,
  onClick,
  onStatusClick,
  onAssigneeClick,
  onMenuClick,
  compact = false
}: MobileWorkItemCardProps) {
  const statusColors: { [key: string]: string } = {
    'Planning': 'bg-blue-100 text-blue-800 border-blue-200',
    'In Progress': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Ready': 'bg-green-100 text-green-800 border-green-200',
    'Review': 'bg-purple-100 text-purple-800 border-purple-200',
    'Stuck': 'bg-red-100 text-red-800 border-red-200',
    'Completed': 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };
  
  const getAssigneeName = () => {
    if (!item.assignee) return 'Unassigned';
    return item.assignee.fullName || item.assignee.name || 'Unknown';
  };

  return (
    <div 
      className={`
        bg-white rounded-lg shadow-sm border border-gray-200
        hover:shadow-md hover:border-gray-300 active:bg-gray-50 transition-all cursor-pointer
        ${compact ? 'p-3' : 'p-4'}
      `}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Assignee Avatar - doubles as assignee picker */}
        <button
          className="flex-shrink-0 touch-manipulation group"
          onClick={(e) => {
            e.stopPropagation();
            onAssigneeClick?.(e);
          }}
          title={`Assigned to ${getAssigneeName()}`}
        >
          <Avatar className={`${compact ? "w-8 h-8" : "w-9 h-9"} group-hover:ring-2 ring-blue-400 transition-all`}>
            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-100 to-purple-100 text-gray-700 font-medium">
              {item.assignee ? getInitials(item.assignee.fullName || item.assignee.name) : '?'}
            </AvatarFallback>
          </Avatar>
        </button>

        {/* Main content area */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${compact ? 'text-sm line-clamp-2' : 'text-base'} text-gray-900`}>
            {item.title}
          </h4>
          
          {/* Assignee name - visible for clarity */}
          <p className="text-xs text-gray-500 mt-0.5">
            {getAssigneeName()}
          </p>
          
          <div className="flex gap-2 mt-1 items-center">
            {/* Status badge - clickable for quick change */}
            <button
              className="touch-manipulation"
              onClick={(e) => {
                e.stopPropagation();
                onStatusClick?.(e);
              }}
            >
              <Badge 
                className={`
                  ${statusColors[item.status] || 'bg-gray-100 text-gray-800'}
                  ${compact ? 'text-xs px-1.5 py-0' : 'text-xs px-2 py-0.5'}
                  cursor-pointer hover:opacity-80
                `}
              >
                {item.status}
              </Badge>
            </button>

            {/* Due date if exists */}
            {item.dueDate && (
              <span className={`text-gray-500 ${compact ? 'text-xs' : 'text-xs'}`}>
                {new Date(item.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          {/* Key Result link if exists */}
          {item.keyResultTask && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              KR: {item.keyResultTask.title}
            </p>
          )}
        </div>

        {/* More options button */}
        <button
          className="flex-shrink-0 p-1 -m-1 touch-manipulation"
          onClick={(e) => {
            e.stopPropagation();
            onMenuClick?.(e);
          }}
        >
          <MoreVertical className={compact ? "w-4 h-4" : "w-5 h-5"} />
        </button>
      </div>
    </div>
  );
}