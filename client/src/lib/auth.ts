import { apiRequest } from './queryClient';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
  organizationName?: string;
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
  organizationId?: number;
  isActive: boolean;
  isEmailVerified: boolean;
  avatarUrl?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  organization?: {
    id: number;
    name: string;
  };
}

class AuthService {
  private TOKEN_KEY = 'authToken';  // Must match queryClient.ts
  private USER_KEY = 'user';

  // Token management
  setToken(token: string): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store auth token:', error);
    }
  }

  getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve auth token:', error);
      return null;
    }
  }

  clearToken(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.error('Failed to clear auth token:', error);
    }
  }

  // User data management
  setUserData(user: User): void {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user data:', error);
    }
  }

  getUserData(): User | null {
    try {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to retrieve user data:', error);
      return null;
    }
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: credentials,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data: AuthResponse = await response.json();
    
    // Store token and user data
    this.setToken(data.token);
    this.setUserData(data.user);
    
    return data;
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: credentials,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data: AuthResponse = await response.json();
    
    // Store token and user data
    this.setToken(data.token);
    this.setUserData(data.user);
    
    return data;
  }

  async getCurrentUser(): Promise<{ user: User; organization?: any }> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await apiRequest('/api/auth/check', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token is invalid, clear it
        this.clearToken();
        throw new Error('Authentication token is invalid');
      }
      const error = await response.json();
      throw new Error(error.error || 'Failed to get user data');
    }

    const data = await response.json();
    this.setUserData(data.user);
    
    return data;
  }

  async logout(): Promise<void> {
    const token = this.getToken();
    
    if (token) {
      try {
        await apiRequest('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Logout request failed:', error);
        // Continue with local cleanup even if server request fails
      }
    }

    this.clearToken();
  }

  async verifyToken(token?: string): Promise<boolean> {
    const tokenToVerify = token || this.getToken();
    
    if (!tokenToVerify) {
      return false;
    }

    try {
      const response = await apiRequest('/api/auth/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: tokenToVerify }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.valid === true;
      }
      
      return false;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const response = await apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Password reset request failed');
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUserData();
    return !!(token && user);
  }
}

export const authService = new AuthService();
export default authService;