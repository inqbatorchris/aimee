// Utility to clear authentication state
export const clearAuthState = () => {
  try {
    // Clear all auth-related items from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Clear theme cache to ensure organization-specific themes load fresh
    localStorage.removeItem('cachedThemeSettings');
    localStorage.removeItem('theme');
    localStorage.removeItem('layoutSettings');
    
    // Clear all session storage
    sessionStorage.clear();
    
    // Clear any auth-related cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    console.log('Authentication state cleared successfully');
  } catch (error) {
    console.error('Error clearing auth state:', error);
    // Force clear by trying to access localStorage directly
    try {
      if (typeof Storage !== 'undefined') {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }
    } catch (e) {
      console.error('Failed to force clear storage:', e);
    }
  }
};

// Utility to safely get auth token without corruption
export const safeGetAuthToken = (): string | null => {
  try {
    return localStorage.getItem('authToken');
  } catch (error) {
    console.warn('Cannot access localStorage for auth token:', error);
    return null;
  }
};

// Utility to safely get user data without corruption
export const safeGetUserData = (): any | null => {
  try {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.warn('Cannot access or parse user data from localStorage:', error);
    return null;
  }
};

// Execute immediately if called from console
if (typeof window !== 'undefined' && (window as any).clearAuthState === undefined) {
  (window as any).clearAuthState = clearAuthState;
}