import axios from 'axios';

interface SplynxCredentials {
  baseUrl: string;
  authHeader: string;
  apiUrl?: string;
  apiKey?: string;
  apiSecret?: string;
}

interface LeadFilter {
  dateRange?: 'last_hour' | 'today' | 'last_7_days' | 'last_30_days' | 'this_month';
  statusFilter?: string;
}

export class SplynxService {
  private credentials: SplynxCredentials;

  constructor(credentials: SplynxCredentials) {
    this.credentials = credentials;
  }

  private getDateRangeFilter(dateRange?: string): { dateFrom?: string; dateTo?: string } {
    const now = new Date();
    const filters: any = {};
    
    switch (dateRange) {
      case 'last_hour':
        filters.dateFrom = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
        filters.dateTo = now.toISOString();
        break;
      case 'today':
        filters.dateFrom = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        filters.dateTo = new Date().toISOString();
        break;
      case 'last_7_days':
        filters.dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        filters.dateTo = now.toISOString();
        break;
      case 'last_30_days':
        filters.dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        filters.dateTo = now.toISOString();
        break;
      case 'this_month':
        filters.dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        filters.dateTo = now.toISOString();
        break;
      default:
        break;
    }
    
    return filters;
  }

  private buildUrl(endpoint: string): string {
    const baseUrl = this.credentials.baseUrl;
    if (baseUrl.endsWith('/')) {
      return `${baseUrl}${endpoint}`;
    }
    return `${baseUrl}/${endpoint}`;
  }

  async getLeadCount(filters: LeadFilter = {}, sinceDate?: Date): Promise<number> {
    try {
      const params: any = {
        main_attributes: {},
        limit: 10000
      };

      if (filters.statusFilter) {
        params.main_attributes.status = filters.statusFilter;
      }

      // Use sinceDate for incremental fetching if provided
      if (sinceDate) {
        const dateStr = sinceDate.toISOString().split('T')[0];
        params.main_attributes.date_add = ['>=', dateStr];
        console.log(`[SPLYNX getLeadCount] 🔄 INCREMENTAL MODE: Fetching leads since ${dateStr}`);
      } else if (filters.dateRange) {
        const dateFilter = this.getDateRangeFilter(filters.dateRange);
        if (dateFilter.dateFrom) {
          params.main_attributes.date_add = ['>=', dateFilter.dateFrom.split('T')[0]];
        }
      } else {
        params.main_attributes.date_add = ['>=', '2025-01-01'];
        console.log('[SPLYNX getLeadCount] ⚠️ FULL MODE: No sinceDate provided, fetching all leads since 2025-01-01');
      }

      const url = this.buildUrl('admin/crm/leads');
      
      console.log('[SPLYNX getLeadCount] 📡 REQUEST DETAILS:');
      console.log('[SPLYNX getLeadCount]   URL:', url);
      console.log('[SPLYNX getLeadCount]   Params:', JSON.stringify(params, null, 2));
      console.log('[SPLYNX getLeadCount]   Auth Header:', this.credentials.authHeader.substring(0, 20) + '...');
      console.log('[SPLYNX getLeadCount]   Method: GET');
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
        params,
      });

      console.log('[SPLYNX getLeadCount] ✅ RESPONSE:', response.status, response.statusText);
      console.log('[SPLYNX getLeadCount]   Data type:', Array.isArray(response.data) ? 'array' : typeof response.data);
      console.log('[SPLYNX getLeadCount]   Data length/keys:', Array.isArray(response.data) ? response.data.length : Object.keys(response.data || {}).join(', '));

      if (Array.isArray(response.data)) {
        return response.data.length;
      } else if (response.data?.total !== undefined) {
        return response.data.total;
      } else if (response.data?.count !== undefined) {
        return response.data.count;
      }
      
      console.warn('Unexpected response format from Splynx API:', response.data);
      return 0;
    } catch (error: any) {
      console.error('[SPLYNX getLeadCount] ❌ ERROR:', error.message);
      console.error('[SPLYNX getLeadCount]   Response status:', error.response?.status);
      console.error('[SPLYNX getLeadCount]   Response data:', error.response?.data);
      throw new Error(`Failed to fetch lead count from Splynx: ${error.message}`);
    }
  }

  async getCustomerCount(filters: any = {}, sinceDate?: Date): Promise<number> {
    try {
      const params: any = {
        main_attributes: {
          status: filters.statusFilter || 'active'
        },
        limit: 10000
      };

      // Use sinceDate for incremental fetching if provided
      if (sinceDate) {
        const dateStr = sinceDate.toISOString().split('T')[0];
        params.main_attributes.date_add = ['>=', dateStr];
        console.log(`[SPLYNX getCustomerCount] 🔄 INCREMENTAL MODE: Fetching customers since ${dateStr}`);
      } else if (filters.dateRange) {
        const dateFilter = this.getDateRangeFilter(filters.dateRange);
        if (dateFilter.dateFrom) {
          params.main_attributes.date_add = ['>=', dateFilter.dateFrom.split('T')[0]];
        }
      } else {
        console.log('[SPLYNX getCustomerCount] ⚠️ FULL MODE: No date filter provided, fetching all active customers');
      }

      const url = this.buildUrl('admin/customers/customer');
      
      console.log('[SPLYNX getCustomerCount] 📡 REQUEST DETAILS:');
      console.log('[SPLYNX getCustomerCount]   URL:', url);
      console.log('[SPLYNX getCustomerCount]   Params:', JSON.stringify(params, null, 2));
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
        params,
      });

      console.log('[SPLYNX getCustomerCount] ✅ RESPONSE:', response.status, response.statusText);
      console.log('[SPLYNX getCustomerCount]   Data type:', Array.isArray(response.data) ? 'array' : typeof response.data);
      console.log('[SPLYNX getCustomerCount]   Data length/keys:', Array.isArray(response.data) ? response.data.length : Object.keys(response.data || {}).join(', '));

      if (Array.isArray(response.data)) {
        return response.data.length;
      } else if (response.data?.total !== undefined) {
        return response.data.total;
      } else if (response.data?.count !== undefined) {
        return response.data.count;
      }
      
      console.warn('[SPLYNX getCustomerCount] Unexpected response format:', response.data);
      return 0;
    } catch (error: any) {
      console.error('[SPLYNX getCustomerCount] ❌ ERROR:', error.message);
      console.error('[SPLYNX getCustomerCount]   Response status:', error.response?.status);
      console.error('[SPLYNX getCustomerCount]   Response data:', error.response?.data);
      throw new Error(`Failed to fetch customer count from Splynx: ${error.message}`);
    }
  }

  async getRevenue(filters: any = {}): Promise<number> {
    try {
      const params: any = {
        main_attributes: {},
        limit: 1000
      };

      if (filters.dateRange) {
        const dateFilter = this.getDateRangeFilter(filters.dateRange);
        if (dateFilter.dateFrom) {
          params.main_attributes.date_created = dateFilter.dateFrom.split('T')[0];
        }
      }

      const url = this.buildUrl('admin/finance/invoices');
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
        params,
      });

      let total = 0;
      if (Array.isArray(response.data)) {
        total = response.data.reduce((sum: number, invoice: any) => {
          return sum + parseFloat(invoice.total || 0);
        }, 0);
      } else if (response.data?.items) {
        total = response.data.items.reduce((sum: number, invoice: any) => {
          return sum + parseFloat(invoice.total || 0);
        }, 0);
      }
      
      return total;
    } catch (error: any) {
      console.error('Error fetching revenue from Splynx:', error.message);
      throw new Error(`Failed to fetch revenue from Splynx: ${error.message}`);
    }
  }

  async getSupportTickets(filters: any = {}): Promise<number> {
    try {
      const params: any = {
        main_attributes: {
          status: filters.statusFilter || 'open'
        },
        limit: 1000
      };

      if (filters.dateRange) {
        const dateFilter = this.getDateRangeFilter(filters.dateRange);
        if (dateFilter.dateFrom) {
          params.main_attributes.date_created = dateFilter.dateFrom.split('T')[0];
        }
      }

      const url = this.buildUrl('admin/support/tickets');
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
        params,
      });

      if (Array.isArray(response.data)) {
        return response.data.length;
      } else if (response.data?.total !== undefined) {
        return response.data.total;
      }
      
      return 0;
    } catch (error: any) {
      console.error('Error fetching support tickets from Splynx:', error.message);
      throw new Error(`Failed to fetch support tickets from Splynx: ${error.message}`);
    }
  }

  async getAdministrators(): Promise<any[]> {
    try {
      const url = this.buildUrl('admin/administration/administrators');
      
      console.log('[SPLYNX getAdministrators] Fetching administrators from:', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log('[SPLYNX getAdministrators] Response:', response.status);
      
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data?.items) {
        return response.data.items;
      }
      
      return [];
    } catch (error: any) {
      console.error('[SPLYNX getAdministrators] Error:', error.message);
      throw new Error(`Failed to fetch administrators from Splynx: ${error.message}`);
    }
  }

  async getSchedulingTasks(filters: any = {}): Promise<any[]> {
    try {
      const params: any = {
        main_attributes: {},
        limit: filters.limit || 1000
      };

      if (filters.assignedAdminId) {
        params.main_attributes.assigned_id = filters.assignedAdminId;
      }

      if (filters.status) {
        params.main_attributes.status = filters.status;
      }

      if (filters.dateFrom) {
        params.main_attributes.date = ['>=', filters.dateFrom];
      }

      if (filters.dateTo) {
        if (params.main_attributes.date) {
          params.main_attributes.date = ['between', filters.dateFrom, filters.dateTo];
        } else {
          params.main_attributes.date = ['<=', filters.dateTo];
        }
      }

      const url = this.buildUrl('admin/scheduling/tasks');
      
      console.log('[SPLYNX getSchedulingTasks] Fetching tasks from:', url);
      console.log('[SPLYNX getSchedulingTasks] Params:', JSON.stringify(params, null, 2));
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
        params,
      });

      console.log('[SPLYNX getSchedulingTasks] Response:', response.status);
      
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data?.items) {
        return response.data.items;
      }
      
      return [];
    } catch (error: any) {
      console.error('[SPLYNX getSchedulingTasks] Error:', error.message);
      console.error('[SPLYNX getSchedulingTasks] Response:', error.response?.data);
      throw new Error(`Failed to fetch scheduling tasks from Splynx: ${error.message}`);
    }
  }

  async getTaskTypes(): Promise<any[]> {
    try {
      const url = this.buildUrl('admin/scheduling/task-types');
      
      console.log('[SPLYNX getTaskTypes] Fetching task types from:', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log('[SPLYNX getTaskTypes] Response:', response.status);
      
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data?.items) {
        return response.data.items;
      }
      
      return [];
    } catch (error: any) {
      console.error('[SPLYNX getTaskTypes] Error:', error.message);
      throw new Error(`Failed to fetch task types from Splynx: ${error.message}`);
    }
  }

  async getEmailTemplates(): Promise<any[]> {
    try {
      const url = this.buildUrl('admin/config/templates');
      
      console.log('[SPLYNX getEmailTemplates] Fetching email templates from:', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
        params: {
          main_attributes: {
            type: 'email'
          }
        }
      });

      console.log('[SPLYNX getEmailTemplates] Response:', response.status);
      console.log('[SPLYNX getEmailTemplates] Response data type:', typeof response.data);
      console.log('[SPLYNX getEmailTemplates] Response data:', JSON.stringify(response.data, null, 2));
      
      if (Array.isArray(response.data)) {
        console.log('[SPLYNX getEmailTemplates] Returning array with', response.data.length, 'templates');
        return response.data;
      } else if (response.data?.items) {
        console.log('[SPLYNX getEmailTemplates] Returning items array with', response.data.items.length, 'templates');
        return response.data.items;
      }
      
      console.log('[SPLYNX getEmailTemplates] No templates found, returning empty array');
      return [];
    } catch (error: any) {
      console.error('[SPLYNX getEmailTemplates] Error:', error.message);
      throw new Error(`Failed to fetch email templates from Splynx: ${error.message}`);
    }
  }

  async getEmailTemplate(id: number): Promise<any> {
    try {
      const url = this.buildUrl(`admin/config/templates/${id}`);
      
      console.log('[SPLYNX getEmailTemplate] Fetching email template:', id);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log('[SPLYNX getEmailTemplate] Response:', response.status);
      
      return response.data;
    } catch (error: any) {
      console.error('[SPLYNX getEmailTemplate] Error:', error.message);
      throw new Error(`Failed to fetch email template from Splynx: ${error.message}`);
    }
  }

  async createEmailTemplate(template: any): Promise<any> {
    try {
      const url = this.buildUrl('admin/config/templates');
      
      console.log('[SPLYNX createEmailTemplate] Creating email template:', template.name);
      
      const templateData = {
        type: 'email',
        name: template.name,
        subject: template.subject || '',
        body: template.body || '',
        ...template
      };
      
      const response = await axios.post(url, templateData, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log('[SPLYNX createEmailTemplate] Response:', response.status);
      
      return response.data;
    } catch (error: any) {
      console.error('[SPLYNX createEmailTemplate] Error:', error.message);
      console.error('[SPLYNX createEmailTemplate] Response:', error.response?.data);
      throw new Error(`Failed to create email template in Splynx: ${error.message}`);
    }
  }

  async updateEmailTemplate(id: number, template: any): Promise<any> {
    try {
      const url = this.buildUrl(`admin/config/templates/${id}`);
      
      console.log('[SPLYNX updateEmailTemplate] Updating email template:', id);
      
      const response = await axios.put(url, template, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log('[SPLYNX updateEmailTemplate] Response:', response.status);
      
      return response.data;
    } catch (error: any) {
      console.error('[SPLYNX updateEmailTemplate] Error:', error.message);
      console.error('[SPLYNX updateEmailTemplate] Response:', error.response?.data);
      throw new Error(`Failed to update email template in Splynx: ${error.message}`);
    }
  }

  async deleteEmailTemplate(id: number): Promise<void> {
    try {
      const url = this.buildUrl(`admin/config/templates/${id}`);
      
      console.log('[SPLYNX deleteEmailTemplate] Deleting email template:', id);
      
      const response = await axios.delete(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log('[SPLYNX deleteEmailTemplate] Response:', response.status);
    } catch (error: any) {
      console.error('[SPLYNX deleteEmailTemplate] Error:', error.message);
      console.error('[SPLYNX deleteEmailTemplate] Response:', error.response?.data);
      throw new Error(`Failed to delete email template from Splynx: ${error.message}`);
    }
  }

  async sendMassEmail(params: {
    templateId: number;
    customerIds?: number[];
    customVariables?: Record<string, any>;
  }): Promise<any> {
    try {
      const url = this.buildUrl('admin/messages/mass-sending');
      
      console.log('[SPLYNX sendMassEmail] Sending mass email with template:', params.templateId);
      console.log('[SPLYNX sendMassEmail] Customer IDs:', params.customerIds?.length || 'all');
      
      const requestData: any = {
        template_id: params.templateId,
        type: 'email',
      };

      if (params.customerIds && params.customerIds.length > 0) {
        requestData.customer_ids = params.customerIds;
      }

      if (params.customVariables) {
        requestData.variables = params.customVariables;
      }
      
      const response = await axios.post(url, requestData, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log('[SPLYNX sendMassEmail] Response:', response.status);
      console.log('[SPLYNX sendMassEmail] Sent:', response.data);
      
      return {
        success: true,
        sentCount: response.data?.sent_count || params.customerIds?.length || 0,
        failedCount: response.data?.failed_count || 0,
        details: response.data
      };
    } catch (error: any) {
      console.error('[SPLYNX sendMassEmail] Error:', error.message);
      console.error('[SPLYNX sendMassEmail] Response:', error.response?.data);
      throw new Error(`Failed to send mass email via Splynx: ${error.message}`);
    }
  }

  async executeAction(action: string, parameters: any = {}): Promise<any> {
    const { sinceDate, ...filters } = parameters;
    const parsedSinceDate = sinceDate ? new Date(sinceDate) : undefined;
    
    switch (action) {
      case 'count_leads':
        return await this.getLeadCount(filters, parsedSinceDate);
      
      case 'count_customers':
        return await this.getCustomerCount(filters, parsedSinceDate);
        
      case 'get_revenue':
        return await this.getRevenue(filters);
        
      case 'get_tickets':
        return await this.getSupportTickets(filters);

      case 'get_administrators':
        return await this.getAdministrators();

      case 'get_scheduling_tasks':
        return await this.getSchedulingTasks(filters);

      case 'get_task_types':
        return await this.getTaskTypes();

      case 'send_email_campaign':
        // Parse customerIds from string if needed
        let customerIds = parameters.customerIds;
        if (typeof customerIds === 'string' && customerIds.trim()) {
          customerIds = customerIds.split(',').map((id: string) => parseInt(id.trim())).filter(Boolean);
        } else if (!Array.isArray(customerIds)) {
          customerIds = undefined;
        }

        // Parse customVariables from JSON string if needed
        let customVariables = parameters.customVariables;
        if (typeof customVariables === 'string' && customVariables.trim()) {
          try {
            customVariables = JSON.parse(customVariables);
          } catch (error) {
            console.warn('[SPLYNX executeAction] Failed to parse customVariables JSON, using empty object');
            customVariables = {};
          }
        }

        return await this.sendMassEmail({
          templateId: parseInt(parameters.templateId),
          customerIds,
          customVariables
        });
        
      default:
        throw new Error(`Unknown Splynx action: ${action}`);
    }
  }
}

export default SplynxService;
