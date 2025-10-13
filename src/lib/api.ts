/**
 * API Client for ContainerStacks Frontend
 * Handles all API communication with the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('auth_token');

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async refreshToken() {
    return this.request('/auth/refresh', {
      method: 'POST',
    });
  }

  async getProfile() {
    return this.request('/auth/me');
  }

  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    timezone?: string;
  }) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Container methods
  async getContainers() {
    return this.request('/containers');
  }

  // VPS methods
  async getVpsInstances() {
    return this.request('/vps');
  }

  async getVpsInstanceDetail(id: string) {
    return this.request(`/vps/${id}`);
  }

  // Support methods
  async getSupportTickets() {
    return this.request('/support/tickets');
  }

  async createSupportTicket(data: {
    subject: string;
    message: string;
    priority: string;
    category: string;
  }) {
    return this.request('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Payment methods
  async getWalletBalance() {
    return this.request('/payments/wallet/balance');
  }

  async getPaymentHistory() {
    return this.request('/payments/history');
  }

  // Admin methods
  async getAdminTickets() {
    return this.request('/admin/tickets');
  }

  async getVpsPlans() {
    return this.request('/admin/plans');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
    