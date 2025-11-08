import React from 'react';
import { ChevronDown } from 'lucide-react';

interface LabelDropdownProps {
  label: string;
  value: string;
  onClick: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * A space-efficient component that combines a label and dropdown trigger
 * Perfect for mobile interfaces where space is limited
 * The entire area is clickable, maximizing touch target size
 */
export function LabelDropdown({
  label,
  value,
  onClick,
  className = '',
  compact = false
}: LabelDropdownProps) {
  return (
    <button
      type="button"
      className={`
        w-full text-left border-b border-gray-200
        active:bg-gray-50 transition-colors
        touch-manipulation
        ${compact ? 'py-2 px-3' : 'py-3 px-4'}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <span className={`block text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
            {label}
          </span>
          <span className={`block font-medium ${compact ? 'text-sm mt-0.5' : 'text-base mt-1'}`}>
            {value || 'Select...'}
          </span>
        </div>
        <ChevronDown className={`text-gray-400 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
      </div>
    </button>
  );
}

interface LabelInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  type?: string;
}

/**
 * A space-efficient input component with integrated label
 * Reduces vertical space while maintaining clarity
 */
export function LabelInput({
  label,
  value,
  onChange,
  placeholder = '',
  className = '',
  compact = false,
  type = 'text'
}: LabelInputProps) {
  return (
    <div
      className={`
        w-full border-b border-gray-200
        focus-within:border-blue-500 transition-colors
        ${compact ? 'py-2 px-3' : 'py-3 px-4'}
        ${className}
      `}
    >
      <label className="block">
        <span className={`block text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
          {label}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`
            block w-full border-none outline-none bg-transparent
            font-medium placeholder:text-gray-400
            ${compact ? 'text-sm mt-0.5' : 'text-base mt-1'}
          `}
        />
      </label>
    </div>
  );
}