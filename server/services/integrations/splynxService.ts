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

interface TicketFilter {
  dateRange?: 'last_hour' | 'today' | 'last_7_days' | 'last_30_days' | 'this_month';
  statusFilter?: string;
  ticketType?: string;
  groupId?: number | string;
}

// Types for unified query system
export type SplynxEntity = 'customers' | 'leads' | 'support_tickets' | 'scheduling_tasks';
export type QueryMode = 'count' | 'list';

export interface SplynxFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'does_not_contain' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'is_null' | 'not_null';
  value: string;
}

export interface SplynxQueryConfig {
  entity: SplynxEntity;
  mode: QueryMode;
  filters?: SplynxFilter[];
  dateRange?: string;
  dateRangeField?: 'date_add' | 'last_update';
  limit?: number;
  sinceDate?: Date;
}

export interface SplynxQueryResult {
  count: number;
  records?: Array<{
    id: number | string;
    attributes: Record<string, any>;
    raw: any;
  }>;
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
      console.log('[SPLYNX getLeadCount]   Has Auth: ✓');
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

  async getTicketTypes(): Promise<Array<{ id: number; title: string }>> {
    try {
      const url = this.buildUrl('admin/support/tickets-types');
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log('[SPLYNX getTicketTypes] Raw response:', JSON.stringify(response.data).substring(0, 500));

      if (Array.isArray(response.data)) {
        return response.data.map((type: any) => ({
          id: parseInt(type.id),
          title: type.title || type.name || `Type ${type.id}`,
        }));
      }
      
      return [];
    } catch (error: any) {
      console.error('Error fetching ticket types from Splynx:', error.message);
      throw new Error(`Failed to fetch ticket types from Splynx: ${error.message}`);
    }
  }

  async getTicketStatuses(): Promise<Array<{ id: number; name: string }>> {
    try {
      const url = this.buildUrl('admin/support/tickets-statuses');
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log('[SPLYNX getTicketStatuses] Raw response:', JSON.stringify(response.data).substring(0, 500));

      if (Array.isArray(response.data)) {
        return response.data.map((status: any) => ({
          id: parseInt(status.id),
          name: status.name || status.title || `Status ${status.id}`,
        }));
      }
      
      return [];
    } catch (error: any) {
      console.error('Error fetching ticket statuses from Splynx:', error.message);
      throw new Error(`Failed to fetch ticket statuses from Splynx: ${error.message}`);
    }
  }

  async getTicketCount(filters: TicketFilter = {}, sinceDate?: Date): Promise<number> {
    try {
      const params: any = {
        main_attributes: {},
        limit: 10000,
        order: { created_at: 'desc' }
      };

      // Status and group filters work with main_attributes
      if (filters.statusFilter) {
        params.main_attributes.status = filters.statusFilter;
      }

      if (filters.groupId) {
        params.main_attributes.group_id = filters.groupId;
      }

      // Determine date filter for local filtering (Splynx tickets API doesn't support date filtering)
      let dateFromFilter: Date | null = null;
      if (sinceDate) {
        dateFromFilter = sinceDate;
        console.log(`[SPLYNX getTicketCount] 🔄 INCREMENTAL MODE: Will filter tickets since ${sinceDate.toISOString().split('T')[0]}`);
      } else if (filters.dateRange) {
        const dateFilter = this.getDateRangeFilter(filters.dateRange);
        if (dateFilter.dateFrom) {
          dateFromFilter = new Date(dateFilter.dateFrom);
          console.log(`[SPLYNX getTicketCount] 📅 DATE RANGE: Will filter tickets since ${dateFilter.dateFrom.split('T')[0]}`);
        }
      } else {
        console.log('[SPLYNX getTicketCount] ⚠️ FULL MODE: No date filter provided, fetching all tickets');
      }

      const url = this.buildUrl('admin/support/tickets');
      
      console.log('[SPLYNX getTicketCount] 📡 REQUEST DETAILS:');
      console.log('[SPLYNX getTicketCount]   URL:', url);
      console.log('[SPLYNX getTicketCount]   Params:', JSON.stringify(params, null, 2));
      console.log('[SPLYNX getTicketCount]   Has Auth: ✓');
      console.log('[SPLYNX getTicketCount]   Method: GET');
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
        params,
      });

      console.log('[SPLYNX getTicketCount] ✅ RESPONSE:', response.status, response.statusText);
      console.log('[SPLYNX getTicketCount]   Data type:', Array.isArray(response.data) ? 'array' : typeof response.data);
      console.log('[SPLYNX getTicketCount]   Data length/keys:', Array.isArray(response.data) ? response.data.length : Object.keys(response.data || {}).join(', '));

      let tickets = Array.isArray(response.data) ? response.data : [];
      
      // Log sample ticket to see field names
      if (tickets.length > 0) {
        const sample = tickets[0];
        console.log('[SPLYNX getTicketCount]   🎫 FULL SAMPLE TICKET:', JSON.stringify(sample, null, 2));
      }
      
      // Apply local filtering for ticket type (comparing by ID or name)
      if (filters.ticketType) {
        const typeFilter = String(filters.ticketType);
        tickets = tickets.filter((ticket: any) => {
          // Compare against various possible field names for type ID
          const typeId = String(ticket.type_id || ticket.ticket_type_id || ticket.type || '');
          const typeName = String(ticket.type_name || ticket.ticket_type || '');
          return typeId === typeFilter || typeName === typeFilter;
        });
        console.log(`[SPLYNX getTicketCount]   After type filter (${filters.ticketType}): ${tickets.length} tickets`);
      }
      
      // Apply local date filtering (Splynx ticket API doesn't support date filtering via main_attributes)
      if (dateFromFilter) {
        // Set filter to start of day (local time)
        const filterStartOfDay = new Date(dateFromFilter);
        filterStartOfDay.setHours(0, 0, 0, 0);
        
        console.log(`[SPLYNX getTicketCount]   Date filter comparing against: ${filterStartOfDay.toISOString()}`);
        
        // Helper to normalize Splynx date values (can be Unix timestamp or ISO string)
        const normalizeTicketDate = (dateValue: any): Date | null => {
          if (!dateValue) return null;
          
          // If it's a number or numeric string (Unix timestamp in seconds)
          if (typeof dateValue === 'number' || /^\d{10}$/.test(String(dateValue))) {
            const timestamp = typeof dateValue === 'number' ? dateValue : parseInt(dateValue, 10);
            // Unix timestamps are in seconds, JavaScript uses milliseconds
            return new Date(timestamp * 1000);
          }
          
          // If it's a numeric string with more digits (already milliseconds)
          if (/^\d{13}$/.test(String(dateValue))) {
            return new Date(parseInt(dateValue, 10));
          }
          
          // Otherwise try parsing as date string
          const parsed = new Date(dateValue);
          return isNaN(parsed.getTime()) ? null : parsed;
        };
        
        // Log a sample date to debug
        if (tickets.length > 0) {
          const sampleDate = tickets[0].date_created || tickets[0].date_add;
          console.log(`[SPLYNX getTicketCount]   Sample raw date value: ${sampleDate}, type: ${typeof sampleDate}`);
          const normalized = normalizeTicketDate(sampleDate);
          console.log(`[SPLYNX getTicketCount]   Sample normalized date: ${normalized?.toISOString()}`);
        }
        
        tickets = tickets.filter((ticket: any) => {
          // Try multiple date field names
          const dateValue = ticket.date_created || ticket.date_add || ticket.created_at || ticket.date;
          const ticketDate = normalizeTicketDate(dateValue);
          if (!ticketDate) return false;
          
          return ticketDate >= filterStartOfDay;
        });
        console.log(`[SPLYNX getTicketCount]   After date filter: ${tickets.length} tickets`);
      }

      console.log(`[SPLYNX getTicketCount] 📊 Final count: ${tickets.length}`);
      return tickets.length;
    } catch (error: any) {
      console.error('[SPLYNX getTicketCount] ❌ ERROR:', error.message);
      console.error('[SPLYNX getTicketCount]   Response status:', error.response?.status);
      console.error('[SPLYNX getTicketCount]   Response data:', error.response?.data);
      throw new Error(`Failed to fetch ticket count from Splynx: ${error.message}`);
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

  async getSplynxProjects(): Promise<any[]> {
    try {
      const url = this.buildUrl('admin/scheduling/projects');
      
      console.log('[SPLYNX getSplynxProjects] Fetching projects from:', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log('[SPLYNX getSplynxProjects] Response:', response.status);
      
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data?.items) {
        return response.data.items;
      }
      
      return [];
    } catch (error: any) {
      console.error('[SPLYNX getSplynxProjects] Error:', error.message);
      throw new Error(`Failed to fetch projects from Splynx: ${error.message}`);
    }
  }

  async createSplynxTask(taskData: {
    taskName?: string;
    name?: string;
    projectId?: number;
    project_id?: number;
    customerId?: string | number;
    customer_id?: string | number;
    description?: string;
    address?: string;
    dueDate?: string;
    scheduledFrom?: string;
    workflowStatusId?: number;
    assignee?: number;
    assignee_id?: number;
    priority?: string;
    isScheduled?: boolean;
    duration?: string;
    travelTimeTo?: number;
    travelTimeFrom?: number;
    checklistTemplateId?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    try {
      const url = this.buildUrl('admin/scheduling/tasks');
      
      console.log('[SPLYNX createSplynxTask] Creating task at:', url);
      console.log('[SPLYNX createSplynxTask] Input data:', JSON.stringify(taskData, null, 2));
      
      // Validate required fields
      const title = taskData.taskName || taskData.name;
      const projectId = taskData.projectId || taskData.project_id;
      
      if (!title) {
        throw new Error('Task name is required. Please set the "Task Name" field in your workflow configuration.');
      }
      
      if (!projectId) {
        throw new Error('Project ID is required. Please select a project from the "Project/Task Type" dropdown in your workflow configuration.');
      }
      
      if (!taskData.workflowStatusId) {
        console.warn('[SPLYNX createSplynxTask] ⚠️ No workflowStatusId provided - you must specify a valid Workflow Status ID for your project.');
        console.warn('[SPLYNX createSplynxTask] ⚠️ Check your Splynx project settings to find the correct workflow_status_id value.');
        throw new Error('Workflow Status ID is required. Please set the "Workflow Status ID" field in your workflow configuration. Check your Splynx project settings to find valid status IDs.');
      }
      
      // Transform frontend parameters to Splynx API format (matching exact Splynx API structure)
      const splynxPayload: any = {
        title: title,
        project_id: projectId,
        partner_id: 1,
        workflow_status_id: taskData.workflowStatusId,
        is_archived: "0",
        closed: "0",
      };

      // Add customer ID (Splynx uses related_customer_id)
      if (taskData.customerId || taskData.customer_id) {
        splynxPayload.related_customer_id = parseInt(String(taskData.customerId || taskData.customer_id));
      }
      
      // Add description
      if (taskData.description) {
        splynxPayload.description = taskData.description;
      }
      
      // Add address
      if (taskData.address) {
        splynxPayload.address = taskData.address;
      }
      
      // Add assignee (only include if user sets it in UI)
      if (taskData.assignee || taskData.assignee_id) {
        const assigneeId = parseInt(String(taskData.assignee || taskData.assignee_id));
        if (!isNaN(assigneeId)) {
          splynxPayload.assignee = assigneeId;
          splynxPayload.assigned_to = "assigned_to_team";
        }
      }
      // Note: If assignee is not set, we don't include assigned_to or assignee fields
      
      // Add priority (with priority_ prefix and lowercase normalization)
      if (taskData.priority) {
        // Normalize to lowercase and add prefix if needed
        let priority = String(taskData.priority).toLowerCase();
        if (!priority.startsWith('priority_')) {
          priority = `priority_${priority}`;
        }
        splynxPayload.priority = priority;
      }
      
      // Handle is_scheduled flag
      if (taskData.isScheduled !== undefined) {
        splynxPayload.is_scheduled = taskData.isScheduled ? "1" : "0";
      }
      
      // Handle scheduled_from (start date/time)
      if (taskData.scheduledFrom) {
        const date = new Date();
        let hasValidParse = false;
        
        // Check if it's a relative date (starts with + or is just a number)
        const isRelative = taskData.scheduledFrom.startsWith('+') || /^\d+$/.test(taskData.scheduledFrom.trim());
        
        if (isRelative) {
          // Try to parse all time segments (days, hours, minutes)
          const dayMatch = taskData.scheduledFrom.match(/(\d+)\s*day/i);
          const hourMatch = taskData.scheduledFrom.match(/(\d+)\s*hour/i);
          const minuteMatch = taskData.scheduledFrom.match(/(\d+)\s*minute/i);
          
          if (dayMatch) {
            date.setDate(date.getDate() + parseInt(dayMatch[1]));
            // Only set to 9 AM if no hours/minutes specified
            if (!hourMatch && !minuteMatch) {
              date.setHours(9, 0, 0, 0);
            }
            hasValidParse = true;
          }
          
          if (hourMatch) {
            date.setHours(date.getHours() + parseInt(hourMatch[1]));
            hasValidParse = true;
          }
          
          if (minuteMatch) {
            date.setMinutes(date.getMinutes() + parseInt(minuteMatch[1]));
            hasValidParse = true;
          }
          
          if (!hasValidParse) {
            // Fallback: try to parse as just a number (assume days)
            const numMatch = taskData.scheduledFrom.match(/\+?\s*(\d+)/);
            if (numMatch) {
              date.setDate(date.getDate() + parseInt(numMatch[1]));
              date.setHours(9, 0, 0, 0);
              hasValidParse = true;
            }
          }
          
          splynxPayload.scheduled_from = date.toISOString().slice(0, 19).replace('T', ' ');
        } else {
          // Absolute date: normalize format for Splynx (YYYY-MM-DD HH:MM:SS)
          const dateStr = taskData.scheduledFrom.replace('T', ' ').substring(0, 19);
          splynxPayload.scheduled_from = dateStr;
        }
      }
      
      // Handle duration (format: "Xh Ym")
      if (taskData.duration) {
        // Validate format: should be like "0h 30m" or "1h 0m"
        const durationPattern = /^\d+h\s+\d+m$/;
        if (durationPattern.test(taskData.duration)) {
          splynxPayload.formatted_duration = taskData.duration;
        } else {
          // Try to convert plain minutes to "0h Xm" format
          const minutes = parseInt(taskData.duration);
          if (!isNaN(minutes)) {
            splynxPayload.formatted_duration = `0h ${minutes}m`;
          } else {
            console.warn(`[SPLYNX createSplynxTask] Invalid duration format: ${taskData.duration}, using default: "0h 5m"`);
            splynxPayload.formatted_duration = "0h 5m";
          }
        }
      } else {
        splynxPayload.formatted_duration = "0h 5m";
      }
      
      // Handle travel times
      if (taskData.travelTimeTo !== undefined) {
        splynxPayload.travel_time_to = taskData.travelTimeTo;
      } else {
        splynxPayload.travel_time_to = 0;
      }
      
      if (taskData.travelTimeFrom !== undefined) {
        splynxPayload.travel_time_from = taskData.travelTimeFrom;
      } else {
        splynxPayload.travel_time_from = 0;
      }
      
      // Handle checklist template
      if (taskData.checklistTemplateId !== undefined) {
        splynxPayload.checklist_template_id = taskData.checklistTemplateId;
      }
      
      // Handle end date (due date)
      if (taskData.dueDate) {
        const isRelative = taskData.dueDate.startsWith('+') || /^\d+$/.test(taskData.dueDate.trim());
        
        if (isRelative) {
          // Handle relative dates like "+7 days", "+2 hours", or just "5"
          const date = new Date();
          let hasValidParse = false;
          
          const dayMatch = taskData.dueDate.match(/(\d+)\s*day/i);
          const hourMatch = taskData.dueDate.match(/(\d+)\s*hour/i);
          const minuteMatch = taskData.dueDate.match(/(\d+)\s*minute/i);
          
          if (dayMatch) {
            date.setDate(date.getDate() + parseInt(dayMatch[1]));
            hasValidParse = true;
          }
          
          if (hourMatch) {
            date.setHours(date.getHours() + parseInt(hourMatch[1]));
            hasValidParse = true;
          }
          
          if (minuteMatch) {
            date.setMinutes(date.getMinutes() + parseInt(minuteMatch[1]));
            hasValidParse = true;
          }
          
          if (!hasValidParse) {
            // Fallback: try to parse as just a number (assume days)
            const numMatch = taskData.dueDate.match(/\+?\s*(\d+)/);
            if (numMatch) {
              date.setDate(date.getDate() + parseInt(numMatch[1]));
              hasValidParse = true;
            }
          }
          
          splynxPayload.end_date = date.toISOString().split('T')[0];
        } else {
          // Absolute date: normalize format (YYYY-MM-DD)
          const dateStr = taskData.dueDate.split('T')[0];
          splynxPayload.end_date = dateStr;
        }
      }
      
      console.log('[SPLYNX createSplynxTask] Splynx payload:', JSON.stringify(splynxPayload, null, 2));
      
      const response = await axios.post(url, splynxPayload, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log('[SPLYNX createSplynxTask] Response:', response.status);
      console.log('[SPLYNX createSplynxTask] Created task:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('[SPLYNX createSplynxTask] Error:', error.message);
      console.error('[SPLYNX createSplynxTask] Response:', error.response?.data);
      throw new Error(`Failed to create task in Splynx: ${error.message}`);
    }
  }

  /**
   * Unified query method for all Splynx entities
   * Supports both count and list modes with advanced filtering
   */
  async queryEntities(config: SplynxQueryConfig): Promise<SplynxQueryResult> {
    const { entity, mode, filters = [], dateRange, dateRangeField, limit = 10000, sinceDate } = config;
    
    console.log(`[SPLYNX queryEntities] 🔍 Query started`);
    console.log(`[SPLYNX queryEntities]   Entity: ${entity}`);
    console.log(`[SPLYNX queryEntities]   Mode: ${mode}`);
    console.log(`[SPLYNX queryEntities]   Filters: ${filters.length}`);
    
    // Get entity endpoint mapping
    const endpoint = this.getEntityEndpoint(entity);
    const url = this.buildUrl(endpoint);
    
    // Separate client-side filters (customer_labels) from API filters
    const apiFilters = filters.filter(f => f.field !== 'customer_labels');
    const clientFilters = filters.filter(f => f.field === 'customer_labels');
    
    // Build query parameters from API filters only
    const params: any = {
      main_attributes: {},
      limit: limit
    };
    
    // Apply API filters
    for (const filter of apiFilters) {
      this.applyFilterToParams(params, filter, entity);
    }
    
    // Apply date range if specified
    if (dateRange) {
      const dateFilter = this.getDateRangeFilter(dateRange);
      // Use specified dateRangeField or fall back to default
      const dateField = dateRangeField || this.getDateFieldForEntity(entity);
      if (dateFilter.dateFrom && dateField) {
        params.main_attributes[dateField] = ['>=', dateFilter.dateFrom.split('T')[0]];
      }
      console.log(`[SPLYNX queryEntities]   📅 Date range: ${dateRange} on field: ${dateField}`);
    }
    
    // Apply incremental since date
    if (sinceDate) {
      // Use specified dateRangeField or fall back to default
      const dateField = dateRangeField || this.getDateFieldForEntity(entity);
      const dateStr = sinceDate.toISOString().split('T')[0];
      if (dateField) {
        params.main_attributes[dateField] = ['>=', dateStr];
      }
      console.log(`[SPLYNX queryEntities]   🔄 Incremental mode since: ${dateStr} on field: ${dateField}`);
    }
    
    if (clientFilters.length > 0) {
      console.log(`[SPLYNX queryEntities]   🎯 Client-side filters: ${clientFilters.length}`);
    }
    
    console.log(`[SPLYNX queryEntities]   📡 Request URL: ${url}`);
    console.log(`[SPLYNX queryEntities]   📝 Params:`, JSON.stringify(params, null, 2));
    
    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
        params,
      });
      
      console.log(`[SPLYNX queryEntities]   ✅ Response: ${response.status}`);
      
      // Normalize response data
      let data = Array.isArray(response.data) ? response.data : response.data?.items || [];
      
      console.log(`[SPLYNX queryEntities]   📊 Initial records: ${data.length}`);
      
      // Normalize records with IDs and attributes FIRST
      // Flatten the structure so attributes are at root level for easy variable access
      let records = data.map((item: any) => {
        const attributes = this.extractEntityAttributes(item, entity);
        return {
          id: item.id,
          ...attributes, // Flatten attributes to root level for easy access like {{currentItem.name}}
          attributes,    // Keep nested version for backward compatibility
          raw: item      // Keep full raw data for advanced use cases
        };
      });
      
      // Apply client-side filters for customer_labels AFTER normalization
      if (clientFilters.length > 0 && entity === 'customers') {
        records = this.applyClientSideFiltersToNormalizedRecords(records, clientFilters);
        console.log(`[SPLYNX queryEntities]   🔍 After client filtering: ${records.length} records`);
      }
      
      const count = records.length;
      console.log(`[SPLYNX queryEntities]   📊 Final records: ${count}`);
      
      // Return based on mode
      if (mode === 'count') {
        return { count };
      } else {
        return { count, records };
      }
    } catch (error: any) {
      console.error(`[SPLYNX queryEntities]   ❌ ERROR: ${error.message}`);
      console.error(`[SPLYNX queryEntities]   Response:`, error.response?.data);
      throw new Error(`Failed to query ${entity} from Splynx: ${error.message}`);
    }
  }
  
  /**
   * Apply client-side filters to normalized records for fields that can't be filtered via Splynx API
   * (e.g., customer_labels which requires searching within array of objects)
   */
  private applyClientSideFiltersToNormalizedRecords(records: any[], filters: SplynxFilter[]): any[] {
    let filtered = records;
    
    for (const filter of filters) {
      const { field, operator, value } = filter;
      
      if (field === 'customer_labels' && operator === 'contains') {
        // Filter customers where any label's text matches the search value
        // Uses exact match (case-insensitive) since UI provides dropdown of exact labels
        const searchTerm = value.toLowerCase().trim();
        filtered = filtered.filter((record: any) => {
          // Access customer_labels from the normalized attributes
          const labels = record.attributes?.customer_labels || [];
          
          // Guard against empty or invalid labels array
          if (!Array.isArray(labels) || labels.length === 0) {
            return false;
          }
          
          // Search within the array for exact matching label text (case-insensitive)
          return labels.some((labelObj: any) => 
            labelObj.label?.toLowerCase().trim() === searchTerm
          );
        });
      }
      
      if (field === 'customer_labels' && operator === 'does_not_contain') {
        // Filter customers where NO label's text matches the search value
        // Uses exact match (case-insensitive) since UI provides dropdown of exact labels
        const searchTerm = value.toLowerCase().trim();
        filtered = filtered.filter((record: any) => {
          // Access customer_labels from the normalized attributes
          const labels = record.attributes?.customer_labels || [];
          
          // Guard against empty or invalid labels array
          if (!Array.isArray(labels) || labels.length === 0) {
            return true; // Include records with no labels when excluding
          }
          
          // Exclude if ANY label matches exactly (case-insensitive)
          return !labels.some((labelObj: any) => 
            labelObj.label?.toLowerCase().trim() === searchTerm
          );
        });
      }
    }
    
    return filtered;
  }
  
  /**
   * Get Splynx API endpoint for entity type
   */
  private getEntityEndpoint(entity: SplynxEntity): string {
    const endpoints: Record<SplynxEntity, string> = {
      'customers': 'admin/customers/customer',
      'leads': 'admin/crm/leads',
      'support_tickets': 'admin/support/tickets',
      'scheduling_tasks': 'admin/scheduling/tasks'
    };
    
    return endpoints[entity];
  }
  
  /**
   * Get the date field name for incremental fetching by entity
   */
  private getDateFieldForEntity(entity: SplynxEntity): string {
    const dateFields: Record<SplynxEntity, string> = {
      'customers': 'date_add',
      'leads': 'date_add',
      'support_tickets': 'date_created',
      'scheduling_tasks': 'date'
    };
    
    return dateFields[entity];
  }
  
  /**
   * Apply a single filter to Splynx API params
   */
  private applyFilterToParams(params: any, filter: SplynxFilter, entity: SplynxEntity): void {
    const { field, operator, value } = filter;
    
    // Handle operators and convert to Splynx format
    switch (operator) {
      case 'equals':
        params.main_attributes[field] = value;
        break;
        
      case 'not_equals':
        params.main_attributes[field] = ['!=', value];
        break;
        
      case 'contains':
        params.main_attributes[field] = ['like', `%${value}%`];
        break;
        
      case 'greater_than':
        params.main_attributes[field] = ['>', value];
        break;
        
      case 'less_than':
        params.main_attributes[field] = ['<', value];
        break;
        
      case 'greater_than_or_equal':
        params.main_attributes[field] = ['>=', value];
        break;
        
      case 'less_than_or_equal':
        params.main_attributes[field] = ['<=', value];
        break;
        
      case 'is_null':
        params.main_attributes[field] = ['is', 'null'];
        break;
        
      case 'not_null':
        params.main_attributes[field] = ['is not', 'null'];
        break;
        
      default:
        console.warn(`[SPLYNX] Unknown operator: ${operator}`);
    }
  }
  
  /**
   * Extract key attributes from raw Splynx record based on entity type
   */
  private extractEntityAttributes(record: any, entity: SplynxEntity): Record<string, any> {
    // Common attributes all entities have
    const common = {
      id: record.id,
    };
    
    // Entity-specific attributes
    switch (entity) {
      case 'customers':
        return {
          ...common,
          // Basic identification
          login: record.login,
          name: record.name || `${record.firstname || ''} ${record.lastname || ''}`.trim(),
          
          // Contact information
          email: record.email,
          billing_email: record.billing_email,
          phone: record.phone,
          
          // Status & Category
          status: record.status,
          category: record.category,
          
          // Relationships
          partner_id: record.partner_id,
          location_id: record.location_id,
          
          // Dates
          date_add: record.date_add,
          date_of_birth: record.date_of_birth,
          
          // Address fields
          street_1: record.street_1 || record.street,
          street_2: record.street_2,
          city: record.city,
          zip_code: record.zip_code,
          
          // Additional fields
          identification: record.identification,
          geo_data: record.geo_data,
          added_by: record.added_by,
          
          // Customer Labels - array of objects with {id, label, color}
          customer_labels: record.customer_labels || [],
        };
        
      case 'leads':
        return {
          ...common,
          name: record.name || `${record.firstname || ''} ${record.lastname || ''}`.trim(),
          email: record.email,
          phone: record.phone,
          status: record.status,
          date_add: record.date_add,
          source: record.source,
        };
        
      case 'support_tickets':
        return {
          ...common,
          subject: record.subject,
          description: record.description,
          status: record.status,
          priority: record.priority,
          date_created: record.date_created,
          customer_id: record.customer_id,
        };
        
      case 'scheduling_tasks':
        return {
          ...common,
          subject: record.subject,
          description: record.description,
          status: record.status,
          assigned_id: record.assigned_id,
          date: record.date,
          time_from: record.time_from,
          time_to: record.time_to,
          customer_id: record.customer_id,
        };
        
      default:
        return common;
    }
  }

  async getTicketDetails(ticketId: string): Promise<any> {
    try {
      const url = this.buildUrl(`admin/support/tickets/${ticketId}`);
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error(`Failed to fetch ticket details for ID ${ticketId}:`, error.message);
      throw new Error(`Failed to fetch ticket details: ${error.message}`);
    }
  }

  async getTicketMessages(ticketId: string): Promise<any[]> {
    try {
      const url = this.buildUrl(`admin/support/tickets/${ticketId}/messages`);
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      console.error(`Failed to fetch ticket messages for ID ${ticketId}:`, error.message);
      throw new Error(`Failed to fetch ticket messages: ${error.message}`);
    }
  }

  async getTicketComments(ticketId: string): Promise<any[]> {
    try {
      // FIXED: Use correct parameter name - ticket_id not ticket_id_variable
      const url = this.buildUrl(`admin/support/ticket-messages?main_attributes[ticket_id]=${ticketId}`);
      console.log(`[MESSAGES] Fetching messages from: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });
      console.log(`[MESSAGES] ✅ Success! Fetched ${response.data?.length || 0} messages for ticket ${ticketId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      console.error(`[MESSAGES ERROR] Failed for ticket ${ticketId}:`, error.message);
      console.error(`[MESSAGES ERROR] Status:`, error.response?.status);
      throw new Error(`Failed to fetch ticket messages: ${error.message}`);
    }
  }

  async getTaskDetails(taskId: string): Promise<any> {
    try {
      const url = this.buildUrl(`admin/scheduling/tasks/${taskId}`);
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error(`Failed to fetch task details for ID ${taskId}:`, error.message);
      throw new Error(`Failed to fetch task details: ${error.message}`);
    }
  }

  async updateTicketStatus(ticketId: string, statusId: string): Promise<any> {
    try {
      const url = this.buildUrl(`admin/support/tickets/${ticketId}`);
      const response = await axios.put(url, {
        status_id: statusId,
      }, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });
      console.log(`Successfully updated ticket ${ticketId} status to ${statusId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to update ticket ${ticketId} status:`, error.message);
      throw new Error(`Failed to update ticket status: ${error.message}`);
    }
  }

  async addTicketMessage(ticketId: string, message: string, isInternal: boolean = false): Promise<any> {
    try {
      const url = this.buildUrl(`admin/support/ticket-messages`);
      const response = await axios.post(url, {
        ticket_id: ticketId,
        message,
        hide_for_customer: isInternal ? '1' : '0',
      }, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });
      console.log(`Successfully added message to ticket ${ticketId} (hide_for_customer: ${isInternal ? '1' : '0'})`);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to add message to ticket ${ticketId}:`, error.message);
      console.error(`[DEBUG] Request URL:`, url);
      console.error(`[DEBUG] Request payload:`, { ticket_id: ticketId, message, hide_for_customer: isInternal ? '1' : '0' });
      throw new Error(`Failed to add ticket message: ${error.message}`);
    }
  }

  async updateTaskStatus(taskId: string, statusId: string): Promise<any> {
    try {
      const url = this.buildUrl(`admin/scheduling/tasks/${taskId}`);
      const response = await axios.put(url, {
        status: statusId,
      }, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });
      console.log(`Successfully updated task ${taskId} status to ${statusId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to update task ${taskId} status:`, error.message);
      throw new Error(`Failed to update task status: ${error.message}`);
    }
  }

  /**
   * Get detailed customer information by ID
   * Used for AI context enrichment
   */
  async getCustomerById(customerId: number): Promise<{
    id: number;
    name: string;
    email: string;
    phone: string;
    status: string;
    plan: string;
    address: string;
    createdAt: string;
    raw: any;
  } | null> {
    try {
      const url = this.buildUrl(`admin/customers/customer/${customerId}`);
      
      console.log(`[SPLYNX getCustomerById] Fetching customer ${customerId} from:`, url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log(`[SPLYNX getCustomerById] Response status:`, response.status);
      
      const customer = response.data;
      if (!customer || !customer.id) {
        return null;
      }

      return {
        id: customer.id,
        name: customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown',
        email: customer.email || '',
        phone: customer.phone || customer.phone_mobile || '',
        status: customer.status || 'unknown',
        plan: customer.tariff_name || customer.tariff || 'Unknown Plan',
        address: customer.street || customer.full_address || '',
        createdAt: customer.date_add || customer.created_at || '',
        raw: customer,
      };
    } catch (error: any) {
      console.error(`[SPLYNX getCustomerById] Error fetching customer ${customerId}:`, error.message);
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch customer details: ${error.message}`);
    }
  }

  /**
   * Get customer's recent support tickets
   * Used for AI context enrichment
   */
  async getCustomerTickets(customerId: number, limit: number = 4): Promise<Array<{
    id: number;
    subject: string;
    status: string;
    priority: string;
    createdAt: string;
    closedAt: string | null;
    messages: Array<{ sender: string; body: string; timestamp: string }>;
  }>> {
    try {
      const url = this.buildUrl('admin/support/tickets');
      
      console.log(`[SPLYNX getCustomerTickets] Fetching tickets for customer ${customerId}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
        params: {
          main_attributes: {
            customer_id: customerId,
          },
          limit: limit + 10, // Fetch a few extra in case some are filtered
        },
      });

      console.log(`[SPLYNX getCustomerTickets] Response status:`, response.status);
      
      const tickets = Array.isArray(response.data) ? response.data : (response.data?.items || []);
      
      // Sort by date descending and take the most recent ones
      const sortedTickets = tickets
        .sort((a: any, b: any) => {
          const dateA = new Date(a.date_created || a.date_add || 0);
          const dateB = new Date(b.date_created || b.date_add || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, limit);

      return sortedTickets.map((ticket: any) => ({
        id: ticket.id,
        subject: ticket.subject || ticket.title || 'No Subject',
        status: ticket.status_name || ticket.status || 'unknown',
        priority: ticket.priority_name || ticket.priority || 'normal',
        createdAt: ticket.date_created || ticket.date_add || '',
        closedAt: ticket.date_closed || null,
        messages: (ticket.messages || []).map((msg: any) => ({
          sender: msg.author_name || msg.author || 'Unknown',
          body: msg.message || msg.body || '',
          timestamp: msg.date || msg.created_at || '',
        })),
      }));
    } catch (error: any) {
      console.error(`[SPLYNX getCustomerTickets] Error:`, error.message);
      return [];
    }
  }

  /**
   * Get customer's account balance and payment status
   * Used for AI context enrichment
   */
  async getCustomerBalance(customerId: number): Promise<{
    balance: number;
    status: 'current' | 'overdue' | 'credit' | 'unknown';
    lastPaymentDate: string | null;
    lastPaymentAmount: number | null;
    currency: string;
  }> {
    try {
      // First try to get balance from customer details
      const customerUrl = this.buildUrl(`admin/customers/customer/${customerId}`);
      
      console.log(`[SPLYNX getCustomerBalance] Fetching balance for customer ${customerId}`);
      
      const customerResponse = await axios.get(customerUrl, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      const customer = customerResponse.data;
      const balance = parseFloat(customer.balance || customer.account_balance || '0');
      
      // Determine status based on balance
      let status: 'current' | 'overdue' | 'credit' | 'unknown' = 'unknown';
      if (balance > 0) {
        status = 'credit';
      } else if (balance < 0) {
        status = 'overdue';
      } else {
        status = 'current';
      }

      // Try to get last payment
      let lastPaymentDate: string | null = null;
      let lastPaymentAmount: number | null = null;
      
      try {
        const paymentsUrl = this.buildUrl(`admin/finance/payments`);
        const paymentsResponse = await axios.get(paymentsUrl, {
          headers: {
            'Authorization': this.credentials.authHeader,
            'Content-Type': 'application/json',
          },
          params: {
            main_attributes: {
              customer_id: customerId,
            },
            limit: 1,
          },
        });
        
        const payments = Array.isArray(paymentsResponse.data) ? paymentsResponse.data : [];
        if (payments.length > 0) {
          lastPaymentDate = payments[0].date || payments[0].payment_date || null;
          lastPaymentAmount = parseFloat(payments[0].amount || '0');
        }
      } catch (paymentError: any) {
        console.log(`[SPLYNX getCustomerBalance] Could not fetch payments:`, paymentError.message);
      }

      return {
        balance,
        status,
        lastPaymentDate,
        lastPaymentAmount,
        currency: customer.currency || 'USD',
      };
    } catch (error: any) {
      console.error(`[SPLYNX getCustomerBalance] Error:`, error.message);
      return {
        balance: 0,
        status: 'unknown',
        lastPaymentDate: null,
        lastPaymentAmount: null,
        currency: 'USD',
      };
    }
  }

  /**
   * Get customer's services and connection status
   * Used for AI context enrichment
   */
  async getCustomerServices(customerId: number): Promise<Array<{
    id: number;
    serviceName: string;
    status: 'active' | 'inactive' | 'suspended' | 'unknown';
    speed: string;
    ipAddress: string | null;
    routerId: string | null;
    connectionType: string;
    startDate: string | null;
  }>> {
    try {
      const url = this.buildUrl(`admin/customers/customer/${customerId}/internet-services`);
      
      console.log(`[SPLYNX getCustomerServices] Fetching services for customer ${customerId}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log(`[SPLYNX getCustomerServices] Response status:`, response.status);
      
      const services = Array.isArray(response.data) ? response.data : (response.data?.items || []);

      return services.map((service: any) => {
        let status: 'active' | 'inactive' | 'suspended' | 'unknown' = 'unknown';
        const serviceStatus = (service.status || '').toLowerCase();
        if (serviceStatus === 'active' || serviceStatus === 'online') {
          status = 'active';
        } else if (serviceStatus === 'inactive' || serviceStatus === 'disabled' || serviceStatus === 'offline') {
          status = 'inactive';
        } else if (serviceStatus === 'suspended' || serviceStatus === 'blocked') {
          status = 'suspended';
        }

        return {
          id: service.id,
          serviceName: service.tariff_name || service.tariff || service.description || 'Internet Service',
          status,
          speed: service.speed || `${service.download_speed || '?'}/${service.upload_speed || '?'} Mbps`,
          ipAddress: service.ip || service.ipv4 || null,
          routerId: service.router_id || service.router || null,
          connectionType: service.type || service.connection_type || 'unknown',
          startDate: service.start_date || service.date_add || null,
        };
      });
    } catch (error: any) {
      console.error(`[SPLYNX getCustomerServices] Error:`, error.message);
      return [];
    }
  }

  async executeAction(action: string, parameters: any = {}): Promise<any> {
    const { sinceDate, ...filters } = parameters;
    const parsedSinceDate = sinceDate ? new Date(sinceDate) : undefined;
    
    switch (action) {
      // New unified query action
      case 'splynx_query':
        return await this.queryEntities({
          entity: parameters.entity,
          mode: parameters.mode || 'count',
          filters: parameters.filters || [],
          dateRange: parameters.dateRange,
          limit: parameters.limit,
          sinceDate: parsedSinceDate
        });
      
      // Legacy actions for backward compatibility
      case 'count_leads':
        return await this.getLeadCount(filters, parsedSinceDate);
      
      case 'count_customers':
        return await this.getCustomerCount(filters, parsedSinceDate);
        
      case 'get_revenue':
        return await this.getRevenue(filters);
        
      case 'get_tickets':
        return await this.getSupportTickets(filters);

      case 'count_tickets':
        return await this.getTicketCount(filters, parsedSinceDate);

      case 'get_administrators':
        return await this.getAdministrators();

      case 'get_scheduling_tasks':
        return await this.getSchedulingTasks(filters);

      case 'get_task_types':
        return await this.getTaskTypes();

      case 'get_splynx_projects':
        return await this.getSplynxProjects();

      case 'create_splynx_task':
        return await this.createSplynxTask(parameters);

      // Customer context enrichment actions (for AI drafting)
      case 'get_customer_by_id':
        return await this.getCustomerById(parameters.customerId);

      case 'get_customer_tickets':
        return await this.getCustomerTickets(parameters.customerId, parameters.limit || 4);

      case 'get_customer_balance':
        return await this.getCustomerBalance(parameters.customerId);

      case 'get_customer_services':
        return await this.getCustomerServices(parameters.customerId);
        
      default:
        throw new Error(`Unknown Splynx action: ${action}`);
    }
  }
}

export default SplynxService;
