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

  /**
   * Unified query method for all Splynx entities
   * Supports both count and list modes with advanced filtering
   */
  async queryEntities(config: SplynxQueryConfig): Promise<SplynxQueryResult> {
    const { entity, mode, filters = [], dateRange, limit = 10000, sinceDate } = config;
    
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
      const dateField = this.getDateFieldForEntity(entity);
      if (dateFilter.dateFrom && dateField) {
        params.main_attributes[dateField] = ['>=', dateFilter.dateFrom.split('T')[0]];
      }
    }
    
    // Apply incremental since date
    if (sinceDate) {
      const dateField = this.getDateFieldForEntity(entity);
      const dateStr = sinceDate.toISOString().split('T')[0];
      if (dateField) {
        params.main_attributes[dateField] = ['>=', dateStr];
      }
      console.log(`[SPLYNX queryEntities]   🔄 Incremental mode since: ${dateStr}`);
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
      let records = data.map((item: any) => ({
        id: item.id,
        attributes: this.extractEntityAttributes(item, entity),
        raw: item
      }));
      
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

      case 'get_administrators':
        return await this.getAdministrators();

      case 'get_scheduling_tasks':
        return await this.getSchedulingTasks(filters);

      case 'get_task_types':
        return await this.getTaskTypes();
        
      default:
        throw new Error(`Unknown Splynx action: ${action}`);
    }
  }
}

export default SplynxService;
