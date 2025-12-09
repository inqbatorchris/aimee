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
  dateRange?: 'last_hour' | 'today' | 'last_7_days' | 'last_30_days' | 'this_month' | 'this_week' | 'this_quarter' | 'this_year' | 'all';
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
        main_attributes: {}
      };

      // Status filter - use status_id (number)
      if (filters.statusFilter && filters.statusFilter !== 'all') {
        params.main_attributes.status_id = parseInt(filters.statusFilter);
      }

      // Group filter - use group_id (number)
      if (filters.groupId) {
        params.main_attributes.group_id = typeof filters.groupId === 'number' ? filters.groupId : parseInt(filters.groupId);
      }
      
      // Type filter - use type_id (number)
      if (filters.ticketType) {
        params.main_attributes.type_id = parseInt(filters.ticketType);
      }

      // Date filter using Splynx comparison operators
      // Splynx supports: [">=", "value"], ["between", [start, end]], etc.
      let dateFromStr: string | null = null;
      let dateToStr: string | null = null;
      
      if (sinceDate) {
        // Incremental mode - filter from sinceDate
        dateFromStr = this.formatSplynxDateTime(sinceDate);
        console.log(`[SPLYNX getTicketCount] 🔄 INCREMENTAL MODE: Filtering tickets since ${dateFromStr}`);
      } else if (filters.dateRange && filters.dateRange !== 'all') {
        // Calculate date range based on filter
        const now = new Date();
        let startDate: Date;
        let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        
        switch (filters.dateRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            break;
          case 'this_week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay());
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            break;
          case 'this_quarter':
            const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
            startDate = new Date(now.getFullYear(), quarterMonth, 1, 0, 0, 0);
            break;
          case 'this_year':
            startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
            break;
          default:
            startDate = new Date(0); // No date filter
        }
        
        dateFromStr = this.formatSplynxDateTime(startDate);
        dateToStr = this.formatSplynxDateTime(endDate);
        console.log(`[SPLYNX getTicketCount] 📅 DATE RANGE (${filters.dateRange}): ${dateFromStr} to ${dateToStr}`);
      }

      // Use the list endpoint with type/status/group filters (these work)
      // Date filtering is done client-side because Splynx API doesn't support date filtering
      const url = this.buildUrl('admin/support/tickets');
      
      console.log('[SPLYNX getTicketCount] 📡 REQUEST DETAILS:');
      console.log('[SPLYNX getTicketCount]   URL:', url);
      console.log('[SPLYNX getTicketCount]   Method: GET');
      console.log('[SPLYNX getTicketCount]   Params:', JSON.stringify(params, null, 2));
      console.log('[SPLYNX getTicketCount]   Date filter (client-side):', dateFromStr, 'to', dateToStr);
      
      // Paginate through all matching tickets and apply client-side date filtering
      // Note: Splynx API doesn't support date filtering or custom ordering, so we must scan all tickets
      const batchSize = 500;
      let totalCount = 0;
      let offset = 0;
      let hasMore = true;
      
      // Parse date filters once
      const dateFrom = dateFromStr ? new Date(dateFromStr.replace(' ', 'T')) : null;
      const dateTo = dateToStr ? new Date(dateToStr.replace(' ', 'T')) : null;
      
      console.log(`[SPLYNX getTicketCount] 🔍 Filter range: ${dateFrom?.toISOString() || 'none'} to ${dateTo?.toISOString() || 'none'}`);
      
      while (hasMore) {
        const paginatedParams = {
          ...params,
          limit: batchSize,
          offset: offset
        };
        
        const response = await axios.get(url, {
          headers: {
            'Authorization': this.credentials.authHeader,
            'Content-Type': 'application/json',
          },
          params: paginatedParams,
        });

        let tickets = Array.isArray(response.data) ? response.data : [];
        
        // Apply client-side date filtering if date range is specified
        let matchCount = 0;
        
        if (dateFrom || dateTo) {
          for (const ticket of tickets) {
            if (!ticket.created_at) continue;
            const ticketDate = new Date(ticket.created_at.replace(' ', 'T'));
            
            // Check if ticket is within date range
            const afterFrom = !dateFrom || ticketDate >= dateFrom;
            const beforeTo = !dateTo || ticketDate <= dateTo;
            
            if (afterFrom && beforeTo) {
              matchCount++;
            }
          }
        } else {
          matchCount = tickets.length;
        }
        
        totalCount += matchCount;
        
        // Log progress every 10 batches to reduce console noise
        if (offset === 0 || offset % 5000 === 0 || tickets.length < batchSize) {
          console.log(`[SPLYNX getTicketCount]   📄 Progress: offset=${offset}, batch=${tickets.length}, matched=${matchCount}, total=${totalCount}`);
        }
        
        // If we got fewer tickets than batch size, we've reached the end
        if (tickets.length < batchSize) {
          hasMore = false;
        } else {
          offset += batchSize;
        }
        
        // Safety limit
        if (offset > 100000) {
          console.log('[SPLYNX getTicketCount]   ⚠️ Safety limit reached (100,000 tickets)');
          hasMore = false;
        }
      }

      console.log(`[SPLYNX getTicketCount] 📊 Final count: ${totalCount}`);
      return totalCount;
    } catch (error: any) {
      console.error('[SPLYNX getTicketCount] ❌ ERROR:', error.message);
      console.error('[SPLYNX getTicketCount]   Response status:', error.response?.status);
      console.error('[SPLYNX getTicketCount]   Response data:', error.response?.data);
      throw new Error(`Failed to fetch ticket count from Splynx: ${error.message}`);
    }
  }
  
  private formatSplynxDateTime(date: Date): string {
    // Format as "YYYY-MM-DD HH:mm:ss" which Splynx expects
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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

      // Splynx uses 'assignee' field (not 'assigned_id') for filtering by assignee
      // When filtering by admin, we also need to specify assigned_to type
      if (filters.assignedAdminId) {
        params.main_attributes.assignee = filters.assignedAdminId;
        params.main_attributes.assigned_to = 'assigned_to_administrator';
      }

      if (filters.teamId) {
        params.main_attributes.assignee = filters.teamId;
        params.main_attributes.assigned_to = 'assigned_to_team';
      }

      if (filters.status) {
        params.main_attributes.status = filters.status;
      }

      if (filters.project_id) {
        params.main_attributes.project_id = filters.project_id;
      }

      // Date filtering using BETWEEN operator
      // Format: main_attributes[scheduled_from][0]=BETWEEN, [1]=start_date, [2]=end_date
      if (filters.startDate && filters.endDate) {
        params.main_attributes['scheduled_from'] = ['BETWEEN', filters.startDate, filters.endDate];
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

  /**
   * Get scheduling teams from Splynx
   * Returns teams with their member admin IDs
   */
  async getSchedulingTeams(): Promise<Array<{
    id: number;
    title: string;
    partnerId?: number;
    memberIds: number[];
    color?: string;
  }>> {
    // Try multiple possible API paths - Splynx API versions vary
    const possiblePaths = [
      'admin/config/scheduling-teams',  // Correct path with hyphen
      'admin/scheduling/teams',
      'admin/config/scheduling/teams', 
      'config/scheduling/teams',
      'scheduling/teams'
    ];
    
    let lastError: any = null;
    
    for (const path of possiblePaths) {
      try {
        const url = this.buildUrl(path);
        
        console.log('[SPLYNX getSchedulingTeams] Trying:', url);
        
        const response = await axios.get(url, {
          headers: {
            'Authorization': this.credentials.authHeader,
            'Content-Type': 'application/json',
          },
        });

        console.log('[SPLYNX getSchedulingTeams] Response:', response.status);
        
        let teamsData: any[] = [];
        
        if (Array.isArray(response.data)) {
          teamsData = response.data;
        } else if (response.data?.items) {
          teamsData = response.data.items;
        } else if (typeof response.data === 'object' && response.data !== null) {
          teamsData = Object.values(response.data);
        }
        
        console.log(`[SPLYNX getSchedulingTeams] Found ${teamsData.length} teams at path: ${path}`);
        
        return teamsData.map((team: any) => ({
          id: parseInt(team.id),
          title: team.title || team.name || `Team ${team.id}`,
          partnerId: team.partner_id ? parseInt(team.partner_id) : undefined,
          memberIds: this.parseTeamMemberIds(team.admin_ids || team.members || team.member_ids || []),
          color: team.color,
        }));
      } catch (error: any) {
        console.log(`[SPLYNX getSchedulingTeams] Path ${path} failed:`, error.response?.status || error.message);
        lastError = error;
        // Continue to try next path
      }
    }
    
    // All paths failed
    console.error('[SPLYNX getSchedulingTeams] All paths failed');
    console.error('[SPLYNX getSchedulingTeams] Last error:', lastError?.message);
    console.error('[SPLYNX getSchedulingTeams] Response:', lastError?.response?.data);
    throw new Error(`Failed to fetch scheduling teams from Splynx: ${lastError?.message}`);
  }

  /**
   * Parse team member IDs from various Splynx response formats
   */
  private parseTeamMemberIds(memberData: any): number[] {
    if (Array.isArray(memberData)) {
      return memberData.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id));
    }
    if (typeof memberData === 'string') {
      return memberData.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
    }
    if (typeof memberData === 'object' && memberData !== null) {
      return Object.values(memberData).map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id));
    }
    return [];
  }

  /**
   * Get scheduling task statuses from Splynx
   * Maps status IDs (like 61, 62, 63, 64) to human-readable names
   */
  async getSchedulingTaskStatuses(): Promise<Array<{
    id: number;
    title: string;
    color?: string;
  }>> {
    const possiblePaths = [
      'admin/config/scheduling-task-statuses',
      'admin/scheduling/task-statuses',
      'admin/scheduling/statuses',
      'admin/config/scheduling/statuses',
      'config/scheduling/task-statuses',
      'scheduling/task-statuses',
      'admin/scheduling/workflows',
    ];
    
    let lastError: any = null;
    
    for (const path of possiblePaths) {
      try {
        const url = this.buildUrl(path);
        console.log('[SPLYNX getSchedulingTaskStatuses] Trying:', url);
        
        const response = await axios.get(url, {
          headers: {
            'Authorization': this.credentials.authHeader,
            'Content-Type': 'application/json',
          },
        });

        console.log('[SPLYNX getSchedulingTaskStatuses] Response:', response.status);
        
        let statusesData: any[] = [];
        
        if (Array.isArray(response.data)) {
          statusesData = response.data;
        } else if (response.data?.items) {
          statusesData = response.data.items;
        } else if (typeof response.data === 'object' && response.data !== null) {
          statusesData = Object.values(response.data);
        }
        
        // If this is workflows, extract statuses from workflow definitions
        if (path.includes('workflows') && statusesData.length > 0) {
          const allStatuses: any[] = [];
          for (const workflow of statusesData) {
            if (workflow.statuses) {
              const workflowStatuses = Array.isArray(workflow.statuses) 
                ? workflow.statuses 
                : Object.values(workflow.statuses);
              allStatuses.push(...workflowStatuses);
            }
          }
          if (allStatuses.length > 0) {
            statusesData = allStatuses;
          }
        }
        
        console.log(`[SPLYNX getSchedulingTaskStatuses] Found ${statusesData.length} statuses at path: ${path}`);
        
        return statusesData.map((status: any) => ({
          id: parseInt(status.id),
          title: status.title || status.name || `Status ${status.id}`,
          color: status.color,
        }));
      } catch (error: any) {
        console.log(`[SPLYNX getSchedulingTaskStatuses] Path ${path} failed:`, error.response?.status || error.message);
        lastError = error;
      }
    }
    
    // Return comprehensive fallback statuses based on common Splynx status IDs
    console.log('[SPLYNX getSchedulingTaskStatuses] All paths failed, using comprehensive fallback statuses');
    return [
      { id: 61, title: 'To Do', color: '#6b7280' },
      { id: 62, title: 'In Progress', color: '#f59e0b' },
      { id: 63, title: 'Done', color: '#22c55e' },
      { id: 64, title: 'Cancelled', color: '#ef4444' },
      { id: 65, title: 'On Hold', color: '#8b5cf6' },
      { id: 66, title: 'Blocked', color: '#dc2626' },
    ];
  }

  /**
   * Get scheduling projects from Splynx
   * These are used to organize tasks into projects/workflows
   */
  async getSchedulingProjects(): Promise<Array<{
    id: number;
    title: string;
    description?: string;
    status?: string;
    color?: string;
  }>> {
    try {
      const url = this.buildUrl('admin/scheduling/projects');
      console.log('[SPLYNX getSchedulingProjects] Fetching from:', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log('[SPLYNX getSchedulingProjects] Response status:', response.status);
      
      let projectsData: any[] = [];
      
      if (Array.isArray(response.data)) {
        projectsData = response.data;
      } else if (response.data?.items) {
        projectsData = response.data.items;
      } else if (typeof response.data === 'object' && response.data !== null) {
        projectsData = Object.values(response.data);
      }
      
      console.log(`[SPLYNX getSchedulingProjects] Found ${projectsData.length} projects`);
      
      return projectsData.map((project: any) => ({
        id: parseInt(project.id),
        title: project.title || project.name || `Project ${project.id}`,
        description: project.description,
        status: project.status,
        color: project.color,
      }));
    } catch (error: any) {
      console.error('[SPLYNX getSchedulingProjects] Error:', error.response?.status || error.message);
      throw new Error(`Failed to fetch scheduling projects: ${error.message}`);
    }
  }

  /**
   * Get available time slots for a specific assignee
   * Queries Splynx tasks for the assignee and calculates free slots
   */
  async getAvailableSlotsByAssignee(params: {
    assigneeId: number;
    projectId?: number;
    startDate: string;
    endDate: string;
    duration: string;
    travelTime?: number;
    workingHours?: { start: number; end: number };
  }): Promise<any[]> {
    try {
      console.log(`[SPLYNX getAvailableSlotsByAssignee] Fetching slots for assignee ${params.assigneeId}`);
      
      // Query existing tasks for this specific assignee
      const existingTasks = await this.getSchedulingTasks({
        assignedAdminId: params.assigneeId,
        dateFrom: params.startDate,
        dateTo: params.endDate,
      });

      console.log(`[SPLYNX getAvailableSlotsByAssignee] Found ${existingTasks.length} tasks for assignee ${params.assigneeId}`);
      
      // Generate available slots avoiding existing tasks
      const slots = this.calculateAvailableSlots(
        params.startDate,
        params.endDate,
        existingTasks,
        params.duration,
        params.travelTime || 0,
        params.workingHours
      );
      
      console.log(`[SPLYNX getAvailableSlotsByAssignee] Generated ${slots.length} available slots`);
      
      return slots;
    } catch (error: any) {
      console.error(`[SPLYNX getAvailableSlotsByAssignee] Error:`, error.message);
      throw new Error(`Failed to fetch available slots by assignee: ${error.message}`);
    }
  }

  /**
   * Get team availability - check which team members have free slots
   * Returns slots where at least one team member is available
   */
  async getTeamAvailability(params: {
    teamId: number;
    projectId?: number;
    startDate: string;
    endDate: string;
    duration: string;
    travelTime?: number;
    workingHours?: { start: number; end: number };
  }): Promise<{ slots: any[]; memberAvailability: Record<number, any[]> }> {
    try {
      console.log(`[SPLYNX getTeamAvailability] Fetching availability for team ${params.teamId}`);
      
      // Get team members
      const teams = await this.getSchedulingTeams();
      const team = teams.find(t => t.id === params.teamId);
      
      if (!team) {
        throw new Error(`Team ${params.teamId} not found`);
      }
      
      console.log(`[SPLYNX getTeamAvailability] Team ${team.title} has ${team.memberIds.length} members`);
      
      // Get availability for each team member
      const memberAvailability: Record<number, any[]> = {};
      
      for (const memberId of team.memberIds) {
        const slots = await this.getAvailableSlotsByAssignee({
          assigneeId: memberId,
          projectId: params.projectId,
          startDate: params.startDate,
          endDate: params.endDate,
          duration: params.duration,
          travelTime: params.travelTime,
          workingHours: params.workingHours,
        });
        memberAvailability[memberId] = slots;
      }
      
      // Merge slots - a slot is available if ANY team member is free
      const allSlotTimes = new Set<string>();
      Object.values(memberAvailability).forEach(slots => {
        slots.forEach(slot => allSlotTimes.add(slot.datetime));
      });
      
      const mergedSlots = Array.from(allSlotTimes)
        .sort()
        .map(datetime => {
          // Find which members are available at this time
          const availableMembers = Object.entries(memberAvailability)
            .filter(([_, slots]) => slots.some(s => s.datetime === datetime))
            .map(([memberId]) => parseInt(memberId));
          
          const firstSlot = Object.values(memberAvailability)
            .flat()
            .find(s => s.datetime === datetime);
          
          return {
            ...firstSlot,
            availableMembers,
          };
        });
      
      console.log(`[SPLYNX getTeamAvailability] Generated ${mergedSlots.length} merged slots`);
      
      return { slots: mergedSlots, memberAvailability };
    } catch (error: any) {
      console.error(`[SPLYNX getTeamAvailability] Error:`, error.message);
      throw new Error(`Failed to fetch team availability: ${error.message}`);
    }
  }

  async getWorkflowStatuses(workflowId: number): Promise<Array<{ id: number; name: string; color?: string }>> {
    try {
      const url = this.buildUrl(`admin/scheduling/workflows/${workflowId}/statuses`);
      
      console.log('[SPLYNX getWorkflowStatuses] Fetching statuses for workflow:', workflowId);
      console.log('[SPLYNX getWorkflowStatuses] URL:', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log('[SPLYNX getWorkflowStatuses] Response:', response.status);
      console.log('[SPLYNX getWorkflowStatuses] Data:', JSON.stringify(response.data).substring(0, 500));
      
      // Handle different Splynx response formats
      let statusData: any[] = [];
      
      if (Array.isArray(response.data)) {
        statusData = response.data;
      } else if (response.data?.items && Array.isArray(response.data.items)) {
        statusData = response.data.items;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        statusData = response.data.data;
      } else if (typeof response.data === 'object' && response.data !== null) {
        // Some Splynx endpoints return object with numeric keys
        const values = Object.values(response.data);
        if (values.length > 0 && typeof values[0] === 'object') {
          statusData = values as any[];
        }
      }
      
      return statusData.map((status: any) => ({
        id: parseInt(status.id),
        name: status.name || status.title || `Status ${status.id}`,
        color: status.color,
      }));
    } catch (error: any) {
      console.error('[SPLYNX getWorkflowStatuses] Error:', error.message);
      console.error('[SPLYNX getWorkflowStatuses] Response:', error.response?.data);
      throw new Error(`Failed to fetch workflow statuses from Splynx: ${error.message}`);
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
    teamId?: number;
    team_id?: number;
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
      
      // Add team ID
      if (taskData.teamId || taskData.team_id) {
        const teamId = parseInt(String(taskData.teamId || taskData.team_id));
        if (!isNaN(teamId)) {
          splynxPayload.team_id = teamId;
        }
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

  async addTicketMessage(
    ticketId: string, 
    message: string, 
    isHidden: boolean = true,
    options?: { customerId?: string; subject?: string; priority?: string; adminId?: number }
  ): Promise<any> {
    try {
      const url = this.buildUrl(`admin/support/ticket-messages`);
      
      // Splynx ticket-messages API format (from API docs):
      // - ticket_id: number - Ticket ID
      // - message: string - Message text (plain string)
      // - hide_for_customer: boolean - Is message hidden for customer
      // - customer_id: number - Customer ID (optional)
      // - admin_id: number - Admin user ID for message attribution (optional)
      
      // Convert newlines to HTML breaks to preserve formatting in Splynx
      const formattedMessage = message.replace(/\n/g, '<br>');
      
      const payload: any = {
        ticket_id: parseInt(ticketId),
        message: formattedMessage,
        hide_for_customer: isHidden,
      };
      
      // Add optional customer_id if provided
      if (options?.customerId) {
        payload.customer_id = parseInt(options.customerId);
      }
      
      // Add admin_id for message attribution (controls which Splynx user the message appears from)
      if (options?.adminId) {
        payload.admin_id = options.adminId;
        console.log(`[Splynx] Using admin_id: ${options.adminId} for message attribution`);
      }
      
      console.log(`[Splynx] Adding message to ticket ${ticketId} (hide_for_customer: ${isHidden}, admin_id: ${options?.adminId || 'not set'})`);
      console.log(`[Splynx] Payload:`, JSON.stringify(payload, null, 2));
      
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`[Splynx] Successfully added message to ticket ${ticketId}`);
      console.log(`[Splynx] Response:`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error(`[Splynx] Failed to add message to ticket ${ticketId}:`, error.message);
      if (error.response?.data) {
        console.error(`[Splynx] Response data:`, JSON.stringify(error.response.data, null, 2));
      }
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

  async updateSchedulingTask(taskId: string | number, updates: {
    title?: string;
    description?: string;
    assigned_to?: number;
    team_id?: number;
    workflow_status_id?: number;
    scheduled_date?: string;
    scheduled_time?: string;
    scheduled_duration_hours?: number;
    scheduled_duration_minutes?: number;
    related_customer_id?: number;
    project_id?: number;
    location?: string;
  }): Promise<any> {
    try {
      const url = this.buildUrl(`admin/scheduling/tasks/${taskId}`);
      console.log(`[SPLYNX updateSchedulingTask] Updating task ${taskId}:`, JSON.stringify(updates, null, 2));
      
      const response = await axios.put(url, updates, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`[SPLYNX updateSchedulingTask] Successfully updated task ${taskId}`);
      return response.data;
    } catch (error: any) {
      console.error(`[SPLYNX updateSchedulingTask] Failed to update task ${taskId}:`, error.message);
      if (error.response?.data) {
        console.error(`[SPLYNX updateSchedulingTask] Response:`, JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(`Failed to update scheduling task: ${error.message}`);
    }
  }

  async getSchedulingTask(taskId: string | number): Promise<any> {
    try {
      const url = this.buildUrl(`admin/scheduling/tasks/${taskId}`);
      console.log(`[SPLYNX getSchedulingTask] Fetching task ${taskId}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`[SPLYNX getSchedulingTask] Response status:`, response.status);
      return response.data;
    } catch (error: any) {
      console.error(`[SPLYNX getSchedulingTask] Error:`, error.message);
      throw new Error(`Failed to fetch scheduling task: ${error.message}`);
    }
  }

  /**
   * Create a scheduling task for calendar blocks
   * Simplified method for syncing calendar blocks to Splynx
   */
  async createSchedulingTaskForBlock(data: {
    title: string;
    description?: string;
    projectId: number;
    teamId?: number;
    assigneeId?: number;
    scheduledFrom: string;
    scheduledTo: string;
    duration?: number;
  }): Promise<{ id: string } | null> {
    try {
      const url = this.buildUrl('admin/scheduling/tasks');
      
      console.log('[SPLYNX createSchedulingTaskForBlock] Creating block task at:', url);
      console.log('[SPLYNX createSchedulingTaskForBlock] Input data:', JSON.stringify(data, null, 2));
      
      // Calculate formatted duration in "Xh Ym" format (e.g., "2h 30m") as required by Splynx
      const startTime = new Date(data.scheduledFrom.replace(' ', 'T'));
      const endTime = new Date(data.scheduledTo.replace(' ', 'T'));
      const durationMinutes = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)));
      const durationHours = Math.floor(durationMinutes / 60);
      const durationMins = durationMinutes % 60;
      // Format as "Xh Ym" - Splynx expects this format, not HH:MM
      const formattedDuration = durationMins > 0 
        ? `${durationHours}h ${durationMins}m`
        : `${durationHours}h`;
      
      // Get a valid workflow_status_id by fetching an existing task from the same project
      let workflowStatusId: number | null = null;
      try {
        // Fetch an existing task from this project to get a valid workflow_status_id
        const tasksUrl = this.buildUrl('admin/scheduling/tasks');
        const tasksResponse = await axios.get(tasksUrl, {
          params: {
            main_attributes: {
              project_id: data.projectId
            },
            limit: 1
          },
          headers: {
            'Authorization': this.credentials.authHeader,
            'Content-Type': 'application/json',
          },
        });
        console.log('[SPLYNX createSchedulingTaskForBlock] Fetched existing tasks:', tasksResponse.data?.length || 0);
        if (Array.isArray(tasksResponse.data) && tasksResponse.data.length > 0) {
          const existingTask = tasksResponse.data[0];
          if (existingTask.workflow_status_id) {
            workflowStatusId = existingTask.workflow_status_id;
            console.log('[SPLYNX createSchedulingTaskForBlock] Using workflow_status_id from existing task:', workflowStatusId);
          }
        }
        
        // If we still don't have a status, try to get the project details
        if (!workflowStatusId) {
          try {
            const projectUrl = this.buildUrl(`admin/scheduling/projects/${data.projectId}`);
            const projectResponse = await axios.get(projectUrl, {
              headers: {
                'Authorization': this.credentials.authHeader,
                'Content-Type': 'application/json',
              },
            });
            console.log('[SPLYNX createSchedulingTaskForBlock] Project details:', JSON.stringify(projectResponse.data, null, 2));
            // Check if project has a default workflow status
            if (projectResponse.data?.workflow_id) {
              // Try to get workflow statuses
              try {
                const workflowUrl = this.buildUrl(`admin/scheduling/workflows/${projectResponse.data.workflow_id}/statuses`);
                const workflowResponse = await axios.get(workflowUrl, {
                  headers: {
                    'Authorization': this.credentials.authHeader,
                    'Content-Type': 'application/json',
                  },
                });
                if (Array.isArray(workflowResponse.data) && workflowResponse.data.length > 0) {
                  workflowStatusId = workflowResponse.data[0].id;
                }
              } catch (e) {
                console.log('[SPLYNX] Could not fetch workflow statuses from project workflow');
              }
            }
          } catch (e) {
            console.log('[SPLYNX] Could not fetch project details');
          }
        }
      } catch (e: any) {
        console.log('[SPLYNX createSchedulingTaskForBlock] Could not fetch existing tasks:', e.message);
      }
      
      console.log('[SPLYNX createSchedulingTaskForBlock] Final workflow_status_id:', workflowStatusId);
      
      // Build the Splynx payload
      const splynxPayload: any = {
        title: data.title,
        project_id: data.projectId,
        partner_id: 1,
        is_archived: "0",
        closed: "0",
        is_scheduled: "1",
        scheduled_from: data.scheduledFrom,
        scheduled_to: data.scheduledTo,
        formatted_duration: formattedDuration,
      };
      
      // Only add workflow_status_id if we found a valid one
      if (workflowStatusId) {
        splynxPayload.workflow_status_id = workflowStatusId;
      }
      
      // Add description
      if (data.description) {
        splynxPayload.description = data.description;
      }
      
      // Add assignment - Splynx requires assigned_to enum and uses specific field names
      if (data.teamId) {
        splynxPayload.assigned_to = 'assigned_to_team';
        splynxPayload.assignee = data.teamId; // Splynx uses 'assignee' field for team ID when assigned_to_team
      } else if (data.assigneeId) {
        splynxPayload.assigned_to = 'assigned_to_administrator';
        splynxPayload.assignee = data.assigneeId; // Splynx uses 'assignee' field for admin ID when assigned_to_administrator
      } else {
        // Default to anyone if no specific assignment
        splynxPayload.assigned_to = 'assigned_to_anyone';
      }
      
      console.log('[SPLYNX createSchedulingTaskForBlock] Payload:', JSON.stringify(splynxPayload, null, 2));
      
      const response = await axios.post(url, splynxPayload, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('[SPLYNX createSchedulingTaskForBlock] Response status:', response.status);
      console.log('[SPLYNX createSchedulingTaskForBlock] Response data:', JSON.stringify(response.data, null, 2));
      
      if (response.data?.id) {
        return { id: String(response.data.id) };
      }
      
      return null;
    } catch (error: any) {
      console.error('[SPLYNX createSchedulingTaskForBlock] Error:', error.message);
      if (error.response?.data) {
        console.error('[SPLYNX createSchedulingTaskForBlock] Response:', JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(`Failed to create scheduling task: ${error.message}`);
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
   * Search for a customer by email address
   * Used for booking system to link logged-in users to Splynx customers
   */
  async searchCustomerByEmail(email: string): Promise<{
    id: number;
    name: string;
    email: string;
    phone: string;
    status: string;
  } | null> {
    try {
      const url = this.buildUrl('admin/customers/customer');
      
      console.log(`[SPLYNX searchCustomerByEmail] Searching for customer with email: ${email}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
        params: {
          main_attributes: {
            email: email,
          },
          limit: 1,
        },
      });

      console.log(`[SPLYNX searchCustomerByEmail] Response status:`, response.status);
      
      const customers = Array.isArray(response.data) ? response.data : (response.data?.items || []);
      
      if (customers.length === 0) {
        console.log(`[SPLYNX searchCustomerByEmail] No customer found with email: ${email}`);
        return null;
      }

      const customer = customers[0];
      return {
        id: customer.id,
        name: customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown',
        email: customer.email || '',
        phone: customer.phone || customer.phone_mobile || '',
        status: customer.status || 'unknown',
      };
    } catch (error: any) {
      console.error(`[SPLYNX searchCustomerByEmail] Error searching for customer:`, error.message);
      return null;
    }
  }

  /**
   * Create a lead record in Splynx
   * Used when a booking is made by someone who doesn't have a Splynx customer account
   */
  async createLead(leadData: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    notes?: string;
    assignedUserId?: number;
  }): Promise<{ id: number; success: boolean } | null> {
    try {
      const url = this.buildUrl('admin/customers/lead');
      
      console.log(`[SPLYNX createLead] Creating lead for: ${leadData.email}`);
      
      const payload: any = {
        name: leadData.name,
        email: leadData.email,
        status: 'new',
      };
      
      if (leadData.phone) {
        payload.phone = leadData.phone;
      }
      if (leadData.address) {
        payload.street_1 = leadData.address;
      }
      if (leadData.notes) {
        payload.comment = leadData.notes;
      }
      if (leadData.assignedUserId) {
        payload.owner_id = leadData.assignedUserId;
      }
      
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log(`[SPLYNX createLead] Response status:`, response.status);
      
      if (response.data && response.data.id) {
        console.log(`[SPLYNX createLead] Lead created with ID: ${response.data.id}`);
        return {
          id: response.data.id,
          success: true,
        };
      }
      
      return null;
    } catch (error: any) {
      console.error(`[SPLYNX createLead] Error creating lead:`, error.message);
      return null;
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
   * Get customer's comprehensive billing data from /customers/customer/ID endpoint
   * This single endpoint returns all billing, blocking, and service status information
   * Used for AI context enrichment
   */
  async getCustomerBalance(customerId: number): Promise<{
    deposit: string;
    accountStatus: string;
    lastOnline: string | null;
    blockingEnabled: boolean;
    blockInNextBillingCycle: boolean;
    blockingDate: string | null;
    isAlreadyBlocked: boolean;
    isAlreadyDisabled: boolean;
    lowBalance: boolean;
    howManyDaysLeft: number | null;
    currency: string;
    lastPaymentDate: string | null;
    lastPaymentAmount: number | null;
  }> {
    try {
      // Use the billing-info endpoint which returns all blocking/balance data
      const billingUrl = this.buildUrl(`admin/customers/billing-info/${customerId}?format_values=true`);
      
      console.log(`[SPLYNX getCustomerBalance] Fetching billing-info for customer ${customerId}`);
      
      const billingResponse = await axios.get(billingUrl, {
        headers: {
          'Authorization': this.credentials.authHeader,
          'Content-Type': 'application/json',
        },
      });

      const billing = billingResponse.data;
      
      console.log(`[SPLYNX getCustomerBalance] Raw billing-info response:`, JSON.stringify(billing, null, 2));
      
      // Also get customer data for last_online
      let lastOnline: string | null = null;
      try {
        const customerUrl = this.buildUrl(`admin/customers/customer/${customerId}`);
        const customerResponse = await axios.get(customerUrl, {
          headers: {
            'Authorization': this.credentials.authHeader,
            'Content-Type': 'application/json',
          },
        });
        lastOnline = customerResponse.data.last_online || null;
      } catch (e) {
        console.log(`[SPLYNX getCustomerBalance] Could not fetch customer last_online`);
      }

      // Also get most recent payment for context
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
            'main_attributes[customer_id]': customerId,
            'order[date]': 'DESC',
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

      // Return exactly what the billing-info endpoint gives us
      return {
        deposit: billing.deposit || '0',
        accountStatus: billing.status || 'unknown',
        lastOnline,
        blockingEnabled: billing.blockingEnabled === true,
        blockInNextBillingCycle: billing.blockInNextBillingCycle === true,
        blockingDate: billing.blocking_date || null,
        isAlreadyBlocked: billing.is_already_blocked === true,
        isAlreadyDisabled: billing.is_already_disabled === true,
        lowBalance: billing.lowBalance === true,
        howManyDaysLeft: billing.howManyDaysLeft || null,
        currency: 'GBP',
        lastPaymentDate,
        lastPaymentAmount,
      };
    } catch (error: any) {
      console.error(`[SPLYNX getCustomerBalance] Error:`, error.message);
      return {
        deposit: '0',
        accountStatus: 'unknown',
        lastOnline: null,
        blockingEnabled: false,
        blockInNextBillingCycle: false,
        blockingDate: null,
        isAlreadyBlocked: false,
        isAlreadyDisabled: false,
        lowBalance: false,
        howManyDaysLeft: null,
        currency: 'GBP',
        lastPaymentDate: null,
        lastPaymentAmount: null,
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
    lastOnline: string | null;
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
          lastOnline: service.last_online || service.last_seen || service.lastOnline || null,
        };
      });
    } catch (error: any) {
      console.error(`[SPLYNX getCustomerServices] Error:`, error.message);
      return [];
    }
  }

  /**
   * Get available time slots for booking appointments
   * Used by public booking page to show available times
   */
  async getAvailableSlots(params: {
    projectId: number;
    startDate: string;
    endDate: string;
    duration: string;
    travelTime?: number;
  }): Promise<any[]> {
    try {
      console.log(`[SPLYNX getAvailableSlots] Fetching slots for project ${params.projectId}`);
      
      // Query existing tasks to find busy periods
      const existingTasks = await this.getSchedulingTasks({
        project_id: params.projectId,
        date_from: params.startDate,
        date_to: params.endDate,
        is_scheduled: 1
      });

      console.log(`[SPLYNX getAvailableSlots] Found ${existingTasks.length} existing tasks`);
      
      // Generate available slots (9 AM - 5 PM, avoiding existing tasks)
      const slots = this.calculateAvailableSlots(
        params.startDate,
        params.endDate,
        existingTasks,
        params.duration,
        params.travelTime || 0
      );
      
      console.log(`[SPLYNX getAvailableSlots] Generated ${slots.length} available slots`);
      
      return slots;
    } catch (error: any) {
      console.error(`[SPLYNX getAvailableSlots] Error:`, error.message);
      throw new Error(`Failed to fetch available slots: ${error.message}`);
    }
  }

  /**
   * Calculate available time slots based on existing bookings
   * Private helper method
   */
  private calculateAvailableSlots(
    startDate: string,
    endDate: string,
    existingTasks: any[],
    duration: string,
    travelTime: number,
    workingHours?: { start: number; end: number }
  ): any[] {
    const slots: any[] = [];
    const durationMinutes = this.parseDuration(duration);
    const totalMinutes = durationMinutes + (travelTime * 2);
    
    // Business hours: configurable or default 9 AM - 5 PM
    const workStart = workingHours?.start ?? 9;
    const workEnd = workingHours?.end ?? 17;
    
    let currentDate = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    while (currentDate <= endDateTime) {
      // Skip weekends
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        // Generate slots for this day
        for (let hour = workStart; hour < workEnd; hour++) {
          for (let minute of [0, 30]) {
            const slotStart = new Date(currentDate);
            slotStart.setHours(hour, minute, 0, 0);
            
            const slotEnd = new Date(slotStart.getTime() + totalMinutes * 60000);
            
            // Check if slot fits within work hours
            if (slotEnd.getHours() < workEnd || (slotEnd.getHours() === workEnd && slotEnd.getMinutes() === 0)) {
              // Check for conflicts with existing tasks
              const hasConflict = existingTasks.some(task => {
                const taskStart = new Date(task.scheduled_from || task.date_from);
                const taskEnd = new Date(task.scheduled_to || task.date_to || taskStart.getTime() + 60 * 60000);
                return slotStart < taskEnd && slotEnd > taskStart;
              });
              
              if (!hasConflict && slotStart > new Date()) {
                slots.push({
                  datetime: slotStart.toISOString(),
                  displayTime: slotStart.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit', 
                    hour12: true 
                  }),
                  displayDate: slotStart.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })
                });
              }
            }
          }
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return slots;
  }

  /**
   * Parse duration string to minutes
   * Private helper method
   */
  private parseDuration(duration: string): number {
    // Parse "2h 30m" format to minutes
    const hourMatch = duration.match(/(\d+)h/);
    const minuteMatch = duration.match(/(\d+)m/);
    
    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
    
    return (hours * 60) + minutes;
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

      case 'get_available_slots':
        return await this.getAvailableSlots(parameters);
        
      default:
        throw new Error(`Unknown Splynx action: ${action}`);
    }
  }
}

export default SplynxService;
