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
        }
      });

      console.log('[SPLYNX getEmailTemplates] Response:', response.status, `- Found ${Array.isArray(response.data) ? response.data.length : (response.data?.items?.length || 0)} templates`);
      
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data?.items) {
        return response.data.items;
      }
      
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
      console.log('[SPLYNX getEmailTemplate] Data fields:', {
        id: response.data?.id,
        title: response.data?.title,
        subject: response.data?.subject,
        hasCode: !!response.data?.code,
        codeLength: response.data?.code?.length || 0,
        codePreview: response.data?.code?.substring(0, 150) || '(empty)',
        allKeys: Object.keys(response.data || {})
      });
      
      return response.data;
    } catch (error: any) {
      console.error('[SPLYNX getEmailTemplate] Error:', error.message);
      throw new Error(`Failed to fetch email template from Splynx: ${error.message}`);
    }
  }

  async createEmailTemplate(template: any): Promise<any> {
    try {
      const url = this.buildUrl('admin/config/templates');
      
      console.log('[SPLYNX createEmailTemplate] Creating email template:', template.title);
      
      const templateData = {
        type: 'email',
        title: template.title,
        subject: template.subject || '',
        description: template.description || '',
        code: template.code || '',
        ...template
      };
      
      const response = await axios.post(url, templateData, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log('[SPLYNX createEmailTemplate] Response:', response.status);
      console.log('[SPLYNX createEmailTemplate] Response data:', response.data);
      
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
      console.log('[SPLYNX updateEmailTemplate] Payload fields:', Object.keys(template));
      
      const response = await axios.put(url, template, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log('[SPLYNX updateEmailTemplate] Response:', response.status);
      console.log('[SPLYNX updateEmailTemplate] Response data:', response.data);
      console.log('[SPLYNX updateEmailTemplate] Has data:', !!response.data);
      
      // Splynx often returns 202 Accepted with null/empty body on updates
      // Return null to signal caller to fetch fresh data
      return response.data || null;
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

  /**
   * Helper: Fetch customer email address (with fallback to billing_email)
   */
  private async getCustomerEmail(customerId: number): Promise<string | null> {
    try {
      const url = this.buildUrl(`admin/customers/customer/${customerId}`);
      console.log(`[SPLYNX getCustomerEmail] Fetching email for customer ${customerId}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      const customer = response.data;
      
      // Try email first, fallback to billing_email
      const email = customer.email || customer.billing_email;
      
      if (!email) {
        console.warn(`[SPLYNX getCustomerEmail] ⚠️ Customer ${customerId} has no email or billing_email`);
        return null;
      }
      
      console.log(`[SPLYNX getCustomerEmail] ✅ Found email: ${email} for customer ${customerId}`);
      return email;
    } catch (error: any) {
      console.error(`[SPLYNX getCustomerEmail] ❌ Error fetching customer ${customerId}:`, error.message);
      console.error(`[SPLYNX getCustomerEmail] ❌ Status: ${error.response?.status}, Data:`, error.response?.data);
      throw new Error(`Failed to fetch customer ${customerId}: ${error.message}`);
    }
  }

  /**
   * Helper: Render template with customer data
   */
  private async renderTemplate(templateId: number, customerId: number): Promise<string> {
    try {
      const url = this.buildUrl(`admin/config/templates/${templateId}-render-${customerId}`);
      console.log(`[SPLYNX renderTemplate] Requesting: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log(`[SPLYNX renderTemplate] ✅ Response status: ${response.status}`);
      console.log(`[SPLYNX renderTemplate] ✅ Rendered HTML length: ${response.data?.result?.length || 0} characters`);
      
      return response.data?.result || '';
    } catch (error: any) {
      console.error(`[SPLYNX renderTemplate] ❌ Error rendering template ${templateId} for customer ${customerId}:`, error.message);
      console.error(`[SPLYNX renderTemplate] ❌ Status: ${error.response?.status}, Data:`, error.response?.data);
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }

  /**
   * Helper: Queue email in Splynx
   */
  private async queueEmail(params: {
    recipient: string;
    subject: string;
    message: string;
    customerId: number;
  }): Promise<number> {
    try {
      const url = this.buildUrl('admin/config/mail');
      console.log(`[SPLYNX queueEmail] Queuing email to: ${params.recipient}`);
      console.log(`[SPLYNX queueEmail] Subject: ${params.subject}`);
      
      const emailData = {
        type: 'message',
        subject: params.subject,
        recipient: params.recipient,
        message: params.message,
        customer_id: params.customerId,
        status: 'new',
      };
      
      const response = await axios.post(url, emailData, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      const emailId = response.data?.id;
      console.log(`[SPLYNX queueEmail] ✅ Email queued with ID: ${emailId}`);
      console.log(`[SPLYNX queueEmail] ✅ Full response:`, JSON.stringify(response.data));
      
      if (!emailId) {
        throw new Error('No email ID returned from queue');
      }
      
      return emailId;
    } catch (error: any) {
      console.error(`[SPLYNX queueEmail] ❌ Error queueing email for ${params.recipient}:`, error.message);
      console.error(`[SPLYNX queueEmail] ❌ Status: ${error.response?.status}, Data:`, error.response?.data);
      throw new Error(`Failed to queue email: ${error.message}`);
    }
  }

  /**
   * Helper: Force send a queued email
   */
  private async forceSendEmail(emailId: number): Promise<void> {
    try {
      const url = this.buildUrl(`admin/config/mail/${emailId}--send`);
      console.log(`[SPLYNX forceSendEmail] Force sending email ID: ${emailId}`);
      console.log(`[SPLYNX forceSendEmail] Request URL: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`[SPLYNX forceSendEmail] ✅ Response status: ${response.status}`);
      console.log(`[SPLYNX forceSendEmail] ✅ Email sent successfully!`);
    } catch (error: any) {
      console.error(`[SPLYNX forceSendEmail] ❌ Error sending email ${emailId}:`, error.message);
      console.error(`[SPLYNX forceSendEmail] ❌ Status: ${error.response?.status}, Data:`, error.response?.data);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Helper: Merge custom variables into HTML content
   * Uses {{ custom.* }} namespace to avoid conflicts with Splynx's {{ customer.* }} variables
   */
  private mergeCustomVariables(html: string, customVariables?: Record<string, any>): string {
    if (!customVariables) {
      return html;
    }

    let mergedHtml = html;
    const replacedVariables: string[] = [];
    
    // Replace {{ custom.variable }} patterns with custom variable values
    for (const [key, value] of Object.entries(customVariables)) {
      // Ensure key uses custom.* namespace
      const variableName = key.startsWith('custom.') ? key : `custom.${key}`;
      
      // Create regex pattern to match {{ custom.variable }} (with optional whitespace)
      const pattern = new RegExp(`{{\\s*${variableName.replace('.', '\\.')}\\s*}}`, 'g');
      
      // Count matches before replacement
      const matches = (mergedHtml.match(pattern) || []).length;
      
      if (matches > 0) {
        mergedHtml = mergedHtml.replace(pattern, String(value));
        replacedVariables.push(`${variableName} (${matches} occurrence${matches > 1 ? 's' : ''})`);
      }
    }
    
    if (replacedVariables.length > 0) {
      console.log(`[SPLYNX mergeCustomVariables] ✅ Replaced ${replacedVariables.length} custom variable(s):`, replacedVariables);
    } else {
      console.warn(`[SPLYNX mergeCustomVariables] ⚠️ No custom.* variables found in HTML. Make sure your template uses {{ custom.variableName }} syntax.`);
    }
    
    return mergedHtml;
  }

  /**
   * Send mass email campaign using Splynx's 3-step process:
   * 1. Render template with customer data
   * 2. Queue email
   * 3. Force send
   */
  async sendMassEmail(params: {
    templateId: number;
    customerIds?: number[];
    customVariables?: Record<string, any>;
    subject?: string;
  }): Promise<any> {
    console.log('[SPLYNX sendMassEmail] Starting mass email campaign');
    console.log('[SPLYNX sendMassEmail] Template ID:', params.templateId);
    console.log('[SPLYNX sendMassEmail] Customer IDs:', params.customerIds?.length || 'none provided');
    console.log('[SPLYNX sendMassEmail] Custom variables:', params.customVariables ? Object.keys(params.customVariables) : 'none');

    if (!params.customerIds || params.customerIds.length === 0) {
      console.warn('[SPLYNX sendMassEmail] No customer IDs provided, cannot send emails');
      return {
        success: true,
        sentCount: 0,
        failedCount: 0,
        failures: [],
      };
    }

    const results = {
      sentCount: 0,
      failedCount: 0,
      failures: [] as Array<{ customerId: number; step: string; error: string }>,
    };

    // Get template to extract subject if not provided
    let templateSubject = params.subject || 'Email Campaign';
    if (!params.subject) {
      try {
        const templateUrl = this.buildUrl(`admin/config/templates/${params.templateId}`);
        const templateResponse = await axios.get(templateUrl, {
          headers: {
            'Authorization': this.credentials.authHeader,
            'Content-Type': 'application/json',
          },
        });
        templateSubject = templateResponse.data?.subject || templateSubject;
      } catch (error) {
        console.warn('[SPLYNX sendMassEmail] Failed to fetch template subject, using default');
      }
    }

    // Process each customer sequentially
    for (const customerId of params.customerIds) {
      try {
        console.log(`[SPLYNX sendMassEmail] Processing customer ${customerId}...`);
        
        // Step 1: Get customer email
        const customerEmail = await this.getCustomerEmail(customerId);
        
        if (!customerEmail) {
          results.failedCount++;
          results.failures.push({
            customerId,
            step: 'fetch_email',
            error: 'No email address found',
          });
          continue;
        }

        // Step 2: Render template with customer data
        let renderedHtml = await this.renderTemplate(params.templateId, customerId);
        
        // Merge custom variables into rendered HTML
        renderedHtml = this.mergeCustomVariables(renderedHtml, params.customVariables);

        // Step 3: Queue email
        const emailId = await this.queueEmail({
          recipient: customerEmail,
          subject: templateSubject,
          message: renderedHtml,
          customerId,
        });

        // Step 4: Force send
        await this.forceSendEmail(emailId);

        results.sentCount++;
        console.log(`[SPLYNX sendMassEmail] ✅ Successfully sent email to customer ${customerId} (${customerEmail})`);
        
      } catch (error: any) {
        results.failedCount++;
        
        // Determine which step failed
        let step = 'unknown';
        if (error.message.includes('fetch customer')) {
          step = 'fetch_email';
        } else if (error.message.includes('render template')) {
          step = 'render_template';
        } else if (error.message.includes('queue email')) {
          step = 'queue_email';
        } else if (error.message.includes('send email')) {
          step = 'force_send';
        }
        
        results.failures.push({
          customerId,
          step,
          error: error.message,
        });
        
        console.error(`[SPLYNX sendMassEmail] ❌ Failed for customer ${customerId}:`, error.message);
      }
    }

    console.log('[SPLYNX sendMassEmail] Campaign complete:');
    console.log('[SPLYNX sendMassEmail]   Sent:', results.sentCount);
    console.log('[SPLYNX sendMassEmail]   Failed:', results.failedCount);
    
    return {
      success: results.failedCount === 0,
      sentCount: results.sentCount,
      failedCount: results.failedCount,
      failures: results.failures,
    };
  }

  /**
   * Preview email template with merged variables
   * Used by workflow builder to show users how their email will look
   */
  async previewEmailTemplate(params: {
    templateId: number;
    customerId: number;
    customVariables?: Record<string, any>;
  }): Promise<{
    renderedHtml: string;
    resolvedCustomerId: number;
    resolvedCustomerEmail: string | null;
    variableSummary: {
      customVariablesReplaced: string[];
      unresolvedCustomVariables: string[];
    };
  }> {
    console.log('[SPLYNX previewEmailTemplate] Starting preview');
    console.log('[SPLYNX previewEmailTemplate] Template ID:', params.templateId);
    console.log('[SPLYNX previewEmailTemplate] Customer ID:', params.customerId);
    console.log('[SPLYNX previewEmailTemplate] Custom variables:', params.customVariables ? Object.keys(params.customVariables) : 'none');

    try {
      // Step 1: Get customer email for display
      const customerEmail = await this.getCustomerEmail(params.customerId);

      // Step 2: Render template with Splynx (merges {{ customer.* }} variables)
      let renderedHtml = await this.renderTemplate(params.templateId, params.customerId);

      // Step 3: Track which custom variables will be replaced
      const customVariablesReplaced: string[] = [];
      const unresolvedCustomVariables: string[] = [];

      if (params.customVariables) {
        for (const [key, value] of Object.entries(params.customVariables)) {
          const variableName = key.startsWith('custom.') ? key : `custom.${key}`;
          const pattern = new RegExp(`{{\\s*${variableName.replace('.', '\\.')}\\s*}}`, 'g');
          const matches = (renderedHtml.match(pattern) || []).length;

          if (matches > 0) {
            customVariablesReplaced.push(variableName);
          } else {
            unresolvedCustomVariables.push(variableName);
          }
        }
      }

      // Step 4: Merge custom.* variables into rendered HTML
      renderedHtml = this.mergeCustomVariables(renderedHtml, params.customVariables);

      console.log('[SPLYNX previewEmailTemplate] ✅ Preview generated successfully');
      console.log('[SPLYNX previewEmailTemplate]   Custom variables replaced:', customVariablesReplaced.length);
      console.log('[SPLYNX previewEmailTemplate]   Unresolved variables:', unresolvedCustomVariables.length);

      return {
        renderedHtml,
        resolvedCustomerId: params.customerId,
        resolvedCustomerEmail: customerEmail,
        variableSummary: {
          customVariablesReplaced,
          unresolvedCustomVariables,
        },
      };
    } catch (error: any) {
      console.error('[SPLYNX previewEmailTemplate] ❌ Error generating preview:', error.message);
      throw new Error(`Failed to preview template: ${error.message}`);
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
