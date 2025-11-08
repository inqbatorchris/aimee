/**
 * DEPRECATED: Developer Mode Context - Being replaced by Unified Status System
 * Use UnifiedStatusControl and isItemVisible from @shared/schema instead
 * This file will be removed in Phase 4 cleanup
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface DeveloperModeContextType {
  isDeveloperMode: boolean;
  toggleDeveloperMode: () => void;
  canUseDeveloperMode: boolean;
}

const DeveloperModeContext = createContext<DeveloperModeContextType | undefined>(undefined);

export function DeveloperModeProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  
  // Only admins and super_admins can use developer mode
  const canUseDeveloperMode = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  
  const [isDeveloperMode, setIsDeveloperMode] = useState(() => {
    if (!canUseDeveloperMode) return false;
    const saved = localStorage.getItem('developerMode');
    return saved === 'true';
  });

  // Update localStorage when developer mode changes
  useEffect(() => {
    if (canUseDeveloperMode) {
      localStorage.setItem('developerMode', String(isDeveloperMode));
    } else {
      localStorage.removeItem('developerMode');
      setIsDeveloperMode(false);
    }
  }, [isDeveloperMode, canUseDeveloperMode]);

  const toggleDeveloperMode = () => {
    if (canUseDeveloperMode) {
      setIsDeveloperMode(prev => !prev);
    }
  };

  const value = {
    isDeveloperMode: canUseDeveloperMode && isDeveloperMode,
    toggleDeveloperMode,
    canUseDeveloperMode
  };

  return (
    <DeveloperModeContext.Provider value={value}>
      {children}
    </DeveloperModeContext.Provider>
  );
}

export function useDeveloperMode() {
  const context = useContext(DeveloperModeContext);
  if (!context) {
    throw new Error('useDeveloperMode must be used within DeveloperModeProvider');
  }
  return context;
}