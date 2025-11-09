import axios, { AxiosInstance } from 'axios';
import { storage } from '../../storage';
import crypto from 'crypto';

// Encryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-key-do-not-use-in-production';
const IV_LENGTH = 16;

function decrypt(text: string): string {
  if (!text) return '';
  
  try {
    const parts = text.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error: any) {
    console.error('Decryption failed:', error?.message || 'Unknown error');
    throw new Error('Token decryption failed');
  }
}

export class XeroService {
  private client: AxiosInstance | null = null;
  private organizationId: number;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tenantId: string | null = null;

  constructor(organizationId: number) {
    this.organizationId = organizationId;
  }

  async initialize(): Promise<void> {
    const integration = await storage.getIntegration(this.organizationId, 'xero');
    
    if (!integration) {
      throw new Error('Xero integration not configured');
    }

    if (!integration.credentialsEncrypted) {
      throw new Error('Xero credentials not configured');
    }

    // Decrypt credentials
    const decryptedData = decrypt(integration.credentialsEncrypted);
    const credentials = JSON.parse(decryptedData);
    
    this.accessToken = credentials.accessToken;
    this.refreshToken = credentials.refreshToken;
    this.tenantId = credentials.tenantId || integration.connectionConfig?.tenantId;

    // Create Axios client for Xero API
    this.client = axios.create({
      baseURL: 'https://api.xero.com/api.xro/2.0',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'xero-tenant-id': this.tenantId,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available. Please reconnect your Xero account.');
    }

    const integration = await storage.getIntegration(this.organizationId, 'xero');
    if (!integration) {
      throw new Error('Xero integration not found');
    }

    const clientId = integration.connectionConfig?.clientId;
    const clientSecret = integration.connectionConfig?.clientSecret;

    if (!clientId || !clientSecret) {
      throw new Error('Xero OAuth credentials not configured. Please set up the Xero integration again.');
    }

    // Refresh the access token
    try {
      const response = await axios.post('https://identity.xero.com/connect/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      const expiresIn = response.data.expires_in || 1800; // Default 30 minutes
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // Update stored credentials
      const encryptedCredentials = this.encrypt(JSON.stringify({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        tenantId: this.tenantId,
        expiresAt: expiresAt.toISOString(),
      }));

      await storage.updateIntegration(integration.id, {
        credentialsEncrypted: encryptedCredentials,
        connectionStatus: 'connected',
      });

      // Update axios client headers
      if (this.client) {
        this.client.defaults.headers['Authorization'] = `Bearer ${this.accessToken}`;
      }
    } catch (error: any) {
      console.error('Failed to refresh Xero access token:', error.response?.data || error.message);
      
      // Mark integration as disconnected on auth failure
      await storage.updateIntegration(integration.id, {
        connectionStatus: 'disconnected',
        isEnabled: false,
      });

      // Provide specific error messages based on the error
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        if (status === 400) {
          if (errorData?.error === 'invalid_grant') {
            throw new Error('Xero refresh token has expired or been revoked. Please reconnect your Xero account.');
          }
          throw new Error(`Xero token refresh failed: ${errorData?.error_description || 'Invalid request'}`);
        }
        
        if (status === 401) {
          throw new Error('Xero authentication failed. Please reconnect your Xero account.');
        }
        
        throw new Error(`Xero API error (${status}): ${errorData?.error_description || 'Unknown error'}`);
      }
      
      throw new Error('Failed to refresh Xero access token. Please check your connection and try again.');
    }
  }

  private encrypt(text: string): string {
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private ensureInitialized(): void {
    if (!this.client) {
      throw new Error('Xero service not initialized. Call initialize() first.');
    }
  }

  // Contact methods
  async getContacts(params?: any) {
    this.ensureInitialized();
    const response = await this.client!.get('/Contacts', { params });
    return response.data;
  }

  async getContact(contactId: string) {
    this.ensureInitialized();
    const response = await this.client!.get(`/Contacts/${contactId}`);
    return response.data;
  }

  async createContact(contactData: any) {
    this.ensureInitialized();
    const response = await this.client!.post('/Contacts', contactData);
    return response.data;
  }

  async updateContact(contactId: string, contactData: any) {
    this.ensureInitialized();
    const response = await this.client!.put(`/Contacts/${contactId}`, contactData);
    return response.data;
  }

  // Invoice methods
  async getInvoices(params?: any) {
    this.ensureInitialized();
    const response = await this.client!.get('/Invoices', { params });
    return response.data;
  }

  async getInvoice(invoiceId: string) {
    this.ensureInitialized();
    const response = await this.client!.get(`/Invoices/${invoiceId}`);
    return response.data;
  }

  async createInvoice(invoiceData: any) {
    this.ensureInitialized();
    const response = await this.client!.post('/Invoices', invoiceData);
    return response.data;
  }

  async updateInvoice(invoiceId: string, invoiceData: any) {
    this.ensureInitialized();
    const response = await this.client!.put(`/Invoices/${invoiceId}`, invoiceData);
    return response.data;
  }

  // Payment methods
  async getPayments(params?: any) {
    this.ensureInitialized();
    const response = await this.client!.get('/Payments', { params });
    return response.data;
  }

  async getPayment(paymentId: string) {
    this.ensureInitialized();
    const response = await this.client!.get(`/Payments/${paymentId}`);
    return response.data;
  }

  async createPayment(paymentData: any) {
    this.ensureInitialized();
    const response = await this.client!.post('/Payments', paymentData);
    return response.data;
  }

  // Account methods
  async getAccounts(params?: any) {
    this.ensureInitialized();
    const response = await this.client!.get('/Accounts', { params });
    return response.data;
  }

  async getAccount(accountId: string) {
    this.ensureInitialized();
    const response = await this.client!.get(`/Accounts/${accountId}`);
    return response.data;
  }

  // Organisation info
  async getOrganisation() {
    this.ensureInitialized();
    const response = await this.client!.get('/Organisation');
    return response.data;
  }

  // Bank Transaction methods
  async getBankTransactions(params?: any) {
    this.ensureInitialized();
    const response = await this.client!.get('/BankTransactions', { params });
    return response.data;
  }

  async getBankTransaction(transactionId: string) {
    this.ensureInitialized();
    const response = await this.client!.get(`/BankTransactions/${transactionId}`);
    return response.data;
  }

  async updateBankTransaction(transactionId: string, transactionData: any) {
    this.ensureInitialized();
    const response = await this.client!.put(`/BankTransactions/${transactionId}`, transactionData);
    return response.data;
  }

  // Tracking Categories (for Profit Centers)
  async getTrackingCategories() {
    this.ensureInitialized();
    const response = await this.client!.get('/TrackingCategories');
    return response.data;
  }

  async getTrackingCategory(trackingCategoryId: string) {
    this.ensureInitialized();
    const response = await this.client!.get(`/TrackingCategories/${trackingCategoryId}`);
    return response.data;
  }

  async createTrackingCategory(categoryData: any) {
    this.ensureInitialized();
    const response = await this.client!.post('/TrackingCategories', categoryData);
    return response.data;
  }

  async updateTrackingCategory(trackingCategoryId: string, categoryData: any) {
    this.ensureInitialized();
    const response = await this.client!.put(`/TrackingCategories/${trackingCategoryId}`, categoryData);
    return response.data;
  }

  // Reports
  async getProfitAndLoss(params?: any) {
    this.ensureInitialized();
    const response = await this.client!.get('/Reports/ProfitAndLoss', { params });
    return response.data;
  }

  async getBalanceSheet(params?: any) {
    this.ensureInitialized();
    const response = await this.client!.get('/Reports/BalanceSheet', { params });
    return response.data;
  }

  async getCashSummary(params?: any) {
    this.ensureInitialized();
    const response = await this.client!.get('/Reports/BankSummary', { params });
    return response.data;
  }

  async getAgedReceivables(params?: any) {
    this.ensureInitialized();
    const response = await this.client!.get('/Reports/AgedReceivablesByContact', { params });
    return response.data;
  }

  async getAgedPayables(params?: any) {
    this.ensureInitialized();
    const response = await this.client!.get('/Reports/AgedPayablesByContact', { params });
    return response.data;
  }

  async getBudgetSummary(params?: any) {
    this.ensureInitialized();
    const response = await this.client!.get('/Reports/BudgetSummary', { params });
    return response.data;
  }

  // Tenants (for multi-org support)
  async getTenants() {
    if (!this.accessToken) {
      throw new Error('Access token not available');
    }
    
    const response = await axios.get('https://api.xero.com/connections', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  }

  // Helper method to handle API calls with automatic token refresh
  private async callWithRetry<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
      return await apiCall();
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
        return await apiCall();
      }
      throw error;
    }
  }

  // Sync all transactions (invoices, bank transactions, payments) since a date
  async syncAllTransactions(since?: Date) {
    this.ensureInitialized();
    
    const sinceParam = since ? { modifiedAfter: since.toISOString() } : {};
    
    const [invoices, bankTransactions, payments] = await Promise.all([
      this.callWithRetry(() => this.getInvoices(sinceParam)),
      this.callWithRetry(() => this.getBankTransactions(sinceParam)),
      this.callWithRetry(() => this.getPayments(sinceParam)),
    ]);
    
    return {
      invoices: invoices.Invoices || [],
      bankTransactions: bankTransactions.BankTransactions || [],
      payments: payments.Payments || [],
    };
  }
}

export default XeroService;