import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowProgressBadgeProps {
  completedSteps: number;
  totalSteps: number;
  className?: string;
}

export function WorkflowProgressBadge({ completedSteps, totalSteps, className }: WorkflowProgressBadgeProps) {
  if (totalSteps === 0) {
    return null;
  }

  const percentage = Math.round((completedSteps / totalSteps) * 100);
  const isComplete = completedSteps === totalSteps;

  return (
    <div className={cn("flex items-center gap-2", className)} data-testid="workflow-progress-badge">
      {/* Progress Dots */}
      <div className="flex items-center gap-0.5">
        {Array.from({ length: Math.min(totalSteps, 5) }).map((_, i) => (
          <div key={i}>
            {i < completedSteps ? (
              <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
            ) : (
              <Circle className="h-3 w-3 text-gray-300 dark:text-gray-600" />
            )}
          </div>
        ))}
        {totalSteps > 5 && (
          <span className="text-xs text-gray-500 ml-1">+{totalSteps - 5}</span>
        )}
      </div>

      {/* Progress Text */}
      <span 
        className={cn(
          "text-xs font-medium",
          isComplete 
            ? "text-green-600 dark:text-green-400" 
            : "text-gray-600 dark:text-gray-400"
        )}
        data-testid="progress-text"
      >
        {completedSteps}/{totalSteps} ({percentage}%)
      </span>
    </div>
  );
}
