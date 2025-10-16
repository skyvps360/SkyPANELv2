import React, { createContext, useContext, useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  timezone?: string;
  role: string;
  emailVerified: boolean;
  organizationId?: string;
  organizationRole?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string; timezone?: string }) => Promise<void>;
  getOrganization: () => Promise<any>;
  updateOrganization: (name?: string, website?: string, address?: string, taxId?: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updatePreferences: (notifications?: any, security?: any) => Promise<void>;
  getApiKeys: () => Promise<any[]>;
  createApiKey: (name: string) => Promise<any>;
  revokeApiKey: (id: string) => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token in localStorage
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      
      setUser(data.user);
      setToken(data.token);
      
      // Store in localStorage
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const result = await response.json();
      
      setUser(result.user);
      setToken(result.token);
      
      // Store in localStorage
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('auth_user', JSON.stringify(result.user));
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const refreshToken = async () => {
    try {
      if (!token) {
        throw new Error('No token available');
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      setToken(data.token);
      localStorage.setItem('auth_token', data.token);
      
      // Update user data if returned from refresh
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      logout(); // If refresh fails, logout the user
      throw error;
    }
  };

  const updateProfile = async (data: { firstName?: string; lastName?: string; phone?: string; timezone?: string }) => {
    try {
      if (!token) throw new Error('Not authenticated');
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }
      setUser(result.user);
      localStorage.setItem('auth_user', JSON.stringify(result.user));
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const getOrganization = async () => {
    try {
      if (!token) throw new Error('Not authenticated');
      const response = await fetch('/api/auth/organization', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch organization');
      }
      return result.organization;
    } catch (error) {
      console.error('Get organization error:', error);
      throw error;
    }
  };

  const updateOrganization = async (name?: string, website?: string, address?: string, taxId?: string) => {
    try {
      if (!token) throw new Error('Not authenticated');
      const response = await fetch('/api/auth/organization', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, website, address, taxId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update organization');
      }
      return result.organization;
    } catch (error) {
      console.error('Update organization error:', error);
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      if (!token) throw new Error('Not authenticated');
      const response = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to change password');
      }
      return result;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  };

  const updatePreferences = async (notifications?: any, security?: any) => {
    try {
      if (!token) throw new Error('Not authenticated');
      const response = await fetch('/api/auth/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notifications, security }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update preferences');
      }
      return result.preferences;
    } catch (error) {
      console.error('Update preferences error:', error);
      throw error;
    }
  };

  const getApiKeys = async () => {
    try {
      if (!token) throw new Error('Not authenticated');
      const response = await fetch('/api/auth/api-keys', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch API keys');
      }
      return result.apiKeys;
    } catch (error) {
      console.error('Get API keys error:', error);
      throw error;
    }
  };

  const createApiKey = async (name: string) => {
    try {
      if (!token) throw new Error('Not authenticated');
      const response = await fetch('/api/auth/api-keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create API key');
      }
      return result.apiKey;
    } catch (error) {
      console.error('Create API key error:', error);
      throw error;
    }
  };

  const revokeApiKey = async (id: string) => {
    try {
      if (!token) throw new Error('Not authenticated');
      const response = await fetch(`/api/auth/api-keys/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to revoke API key');
      }
      return result;
    } catch (error) {
      console.error('Revoke API key error:', error);
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    getOrganization,
    updateOrganization,
    changePassword,
    updatePreferences,
    getApiKeys,
    createApiKey,
    revokeApiKey,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};