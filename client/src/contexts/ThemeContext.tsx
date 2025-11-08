import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import ThemeStore from '@/services/ThemeStore';
import type { OrganizationTheme } from '@/services/ThemeStore';

interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  loadingTheme: boolean;
  reloadTheme: () => Promise<void>;
  saveTheme: (updates: Partial<OrganizationTheme>) => Promise<boolean>;
  loadThemeForOrg: (orgId: number) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const themeStore = ThemeStore.getInstance();

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loadingTheme, setLoadingTheme] = useState(true);
  const [organizationId, setOrganizationId] = useState<number | null>(null);

  // Load theme based on organization ID
  const loadTheme = useCallback(async (orgId: number, forceRefresh = false) => {
    try {
      setLoadingTheme(true);
      setOrganizationId(orgId);
      
      // Load theme from store (uses cache if available)
      const orgTheme = await themeStore.loadTheme(orgId, forceRefresh);
      
      if (orgTheme) {
        console.log('Applying organization theme:', orgId);
        themeStore.applyTheme(orgTheme);
        setTheme(orgTheme.activeTheme || 'light');
      } else {
        // Apply cached theme if available for quick load
        const cachedTheme = localStorage.getItem('cachedThemeSettings');
        if (cachedTheme && !forceRefresh) {
          try {
            const settings = JSON.parse(cachedTheme);
            if (settings.activeTheme) {
              setTheme(settings.activeTheme);
              console.log('Applied cached theme for quick load');
            }
          } catch (e) {
            console.error('Failed to parse cached theme:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setLoadingTheme(false);
    }
  }, []);

  // Initial load - stop loading state (class already added in index.html)
  useEffect(() => {
    setLoadingTheme(false);
  }, []);

  // Save theme to store and apply
  const saveTheme = useCallback(async (updates: Partial<OrganizationTheme>): Promise<boolean> => {
    if (!organizationId) return false;
    
    const success = await themeStore.saveTheme(organizationId, updates);
    if (success) {
      // Reload theme to apply changes
      await loadTheme(organizationId, true);
    }
    return success;
  }, [organizationId, loadTheme]);

  // Apply theme mode changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
    
    // Remove previous theme classes and add current one
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Save theme preference if we have an organization
    if (organizationId) {
      await saveTheme({ activeTheme: newTheme });
    }
  }, [theme, organizationId, saveTheme]);

  const contextValue = {
    theme,
    setTheme,
    toggleTheme,
    loadingTheme,
    reloadTheme: async () => {
      if (organizationId) {
        await loadTheme(organizationId, true);
      }
    },
    saveTheme,
    loadThemeForOrg: loadTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};