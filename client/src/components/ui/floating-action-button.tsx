import React from 'react';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  label?: string;
}

/**
 * A Material Design inspired Floating Action Button
 * Positioned in the thumb-friendly zone for mobile users
 * Provides quick access to primary actions
 */
export function FloatingActionButton({
  onClick,
  icon = <Plus className="w-6 h-6" />,
  className = '',
  position = 'bottom-right',
  label
}: FloatingActionButtonProps) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-6 left-6'
  };

  return (
    <button
      onClick={onClick}
      className={`
        fixed ${positionClasses[position]} z-50
        w-14 h-14 rounded-full
        bg-primary text-primary-foreground
        shadow-lg hover:shadow-xl
        active:scale-95 transition-all
        flex items-center justify-center
        touch-manipulation
        md:hidden
        ${className}
      `}
      aria-label={label || 'Add new item'}
    >
      {icon}
    </button>
  );
}

interface ExtendedFABProps extends FloatingActionButtonProps {
  text: string;
}

/**
 * Extended FAB with text label for better clarity
 * Useful when the action needs more context
 */
export function ExtendedFAB({
  onClick,
  icon = <Plus className="w-5 h-5" />,
  text,
  className = '',
  position = 'bottom-center'
}: ExtendedFABProps) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-6 left-6'
  };

  return (
    <button
      onClick={onClick}
      className={`
        fixed ${positionClasses[position]} z-50
        px-4 py-3 rounded-full
        bg-primary text-primary-foreground
        shadow-lg hover:shadow-xl
        active:scale-95 transition-all
        flex items-center gap-2
        touch-manipulation
        md:hidden
        ${className}
      `}
    >
      {icon}
      <span className="font-medium">{text}</span>
    </button>
  );
}