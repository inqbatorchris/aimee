// Splynx API client using backend proxy
const API_BASE_URL = '/api/splynx';

interface SplynxApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code: number;
    internal_code: string;
  };
}

class SplynxApiClient {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}/${endpoint}`;
    
    // Get token from localStorage (set during login)
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Splynx API Request failed:', {
        url,
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }
      
      throw new Error(errorData.error?.message || errorData.details || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: SplynxApiResponse<T> = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.data || data as T;
  }

  // Customer Management
  async getCustomers(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.makeRequest(`admin/customers/customer${queryString}`);
  }

  async getCustomer(id: string) {
    return this.makeRequest(`admin/customers/customer/${id}`);
  }

  async updateCustomer(id: string, data: any) {
    return this.makeRequest(`admin/customers/customer/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async createCustomer(data: any) {
    return this.makeRequest(`admin/customers/customer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Services
  async getCustomerServices(customerId: string) {
    return Promise.all([
      this.makeRequest(`admin/services/internet?main_attributes[customer_id]=${customerId}`),
      this.makeRequest(`admin/services/voice?main_attributes[customer_id]=${customerId}`),
      this.makeRequest(`admin/services/custom?main_attributes[customer_id]=${customerId}`),
    ]);
  }

  async getInternetServices(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.makeRequest(`admin/services/internet${queryString}`);
  }

  async getVoiceServices(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.makeRequest(`admin/services/voice${queryString}`);
  }

  // Billing & Invoices
  async getCustomerInvoices(customerId: string) {
    return this.makeRequest(`admin/finance/invoices?main_attributes[customer_id]=${customerId}`);
  }

  async getInvoice(id: string) {
    return this.makeRequest(`admin/finance/invoices/${id}`);
  }

  async createInvoice(data: any) {
    return this.makeRequest(`admin/finance/invoices`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCustomerTransactions(customerId: string) {
    return this.makeRequest(`admin/finance/transactions?main_attributes[customer_id]=${customerId}`);
  }

  // Support Tickets
  async getCustomerTickets(customerId: string) {
    return this.makeRequest(`admin/support/tickets?main_attributes[customer_id]=${customerId}`);
  }

  async getTicket(id: string) {
    return this.makeRequest(`admin/support/tickets/${id}`);
  }

  async createTicket(data: any) {
    return this.makeRequest(`admin/support/tickets`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTicket(id: string, data: any) {
    return this.makeRequest(`admin/support/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getTicketMessages(ticketId: string) {
    return this.makeRequest(`admin/support/tickets/${ticketId}/messages`);
  }

  async addTicketMessage(ticketId: string, data: any) {
    return this.makeRequest(`admin/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Usage & Statistics
  async getCustomerStatistics(customerId: string, params?: any) {
    const queryString = params ? `&${new URLSearchParams(params).toString()}` : '';
    return this.makeRequest(`admin/customers/customer-statistics?main_attributes[customer_id]=${customerId}${queryString}`);
  }

  async getCustomersOnline(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.makeRequest(`admin/customers/customers-online${queryString}`);
  }

  // Authentication
  async generateAccessToken(authData: any) {
    return this.makeRequest(`admin/auth/tokens`, {
      method: 'POST',
      body: JSON.stringify(authData),
    });
  }

  async refreshAccessToken(refreshToken: string) {
    return this.makeRequest(`admin/auth/tokens/${refreshToken}`);
  }
}

export const splynxApi = new SplynxApiClient();
export default splynxApi;