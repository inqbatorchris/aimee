import React from 'react';

interface DocumentFormWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component to prevent password manager interference with document editing forms.
 * This component provides proper form context attributes to prevent browsers from
 * treating document save operations as login attempts.
 */
export function DocumentFormWrapper({ children, className = '' }: DocumentFormWrapperProps) {
  return (
    <div 
      className={className}
      data-form-type="document-editor"
      data-password-manager="ignore"
      role="application"
      aria-label="Document Editor"
    >
      {children}
    </div>
  );
}