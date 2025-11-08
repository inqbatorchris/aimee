import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService, type LoginCredentials, type RegisterCredentials, type User } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
}

// Create context with a default value
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  isAuthenticated: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true to prevent race conditions

  // Initialize authentication state with error recovery
  useEffect(() => {
    const initAuth = async () => {
      console.log('initAuth started');
      setLoading(true);
      
      try {
        const token = authService.getToken();
        
        if (!token) {
          // No token found, clear state and finish loading
          setCurrentUser(null);
          setLoading(false);
          return;
        }

        // Try to get current user data to verify token
        try {
          console.log('Attempting to get current user with token:', token);
          const userData = await authService.getCurrentUser();
          console.log('User data retrieved successfully:', userData.user);
          setCurrentUser(userData.user);
          setLoading(false);
        } catch (error) {
          console.warn('Token verification failed:', error);
          // Token is invalid, clear auth state
          authService.clearToken();
          setCurrentUser(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear corrupted state on any error
        authService.clearToken();
        setCurrentUser(null);
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    try {
      const response = await authService.login(credentials);
      setCurrentUser(response.user);
      
      // Clear theme cache after successful login to allow fresh org theme load
      localStorage.removeItem('lastAppliedTheme');
      localStorage.removeItem('lastAppliedOrgId');
      
      queryClient.clear();
    } catch (error) {
      throw error; // Re-throw to allow Login component to catch and display error
    } finally {
      setLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    setLoading(true);
    try {
      const response = await authService.register(credentials);
      setCurrentUser(response.user);
      queryClient.clear();
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all auth-related data
      authService.clearToken();
      localStorage.removeItem('cachedThemeSettings');
      localStorage.removeItem('theme');
      localStorage.removeItem('layoutSettings');
      setCurrentUser(null);
      queryClient.clear();
      // Force a reload to ensure clean authentication state
      window.location.href = '/login';
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!currentUser) throw new Error('No user logged in');
    
    // Update the current user state with the new data
    const updatedUser = { ...currentUser, ...data };
    setCurrentUser(updatedUser);
    
    // Also update localStorage to persist the change
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Invalidate auth check query to refresh all components
    await queryClient.invalidateQueries({ queryKey: ['/api/auth/check'] });
  };

  const value = {
    currentUser,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!currentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};