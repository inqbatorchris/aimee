import { SplynxService } from '../integrations/splynxService';

/**
 * Context sources that can be enabled for AI ticket drafting
 */
export type ContextSource = 
  | 'customer_info' 
  | 'ticket_history' 
  | 'account_balance' 
  | 'connection_status';

/**
 * Enriched context payload for AI ticket drafting
 */
export interface TicketDraftingContext {
  // Current ticket being responded to
  currentTicket?: {
    id: number;
    subject: string;
    description: string;
    priority?: string;
  };
  
  // Customer information
  customer?: {
    id: number;
    name: string;
    email: string;
    phone: string;
    status: string;
    plan: string;
    address: string;
  };
  
  // Account balance
  billing?: {
    balance: number;
    status: 'current' | 'overdue' | 'credit' | 'unknown';
    lastPaymentDate: string | null;
    lastPaymentAmount: number | null;
    currency: string;
  };
  
  // Connection/service status
  services?: Array<{
    id: number;
    serviceName: string;
    status: 'active' | 'inactive' | 'suspended' | 'unknown';
    speed: string;
    ipAddress: string | null;
    connectionType: string;
  }>;
  
  // Recent ticket history
  recentTickets?: Array<{
    id: number;
    subject: string;
    status: string;
    priority: string;
    createdAt: string;
    closedAt: string | null;
  }>;
  
  // Future: Network diagnostics from OpenOLT, Eero, TR-069
  networkDiagnostics?: {
    lastPing?: { latency: number; packetLoss: number };
    opticalLevels?: { rx: number; tx: number };
    routerStatus?: string;
  };
}

/**
 * Service to aggregate customer context from multiple sources for AI ticket drafting
 * 
 * Thread-safe design: SplynxService is passed per-request to avoid credential leakage
 * between concurrent requests from different organizations
 */
export class ContextEnrichmentService {
  /**
   * Enrich ticket context with customer data from enabled sources
   * 
   * @param splynxService - Per-request SplynxService instance with org-specific credentials
   * @param customerId - Splynx customer ID
   * @param enabledSources - Array of context sources to fetch
   * @param currentTicket - Optional current ticket context
   */
  async enrichTicketContext(
    splynxService: SplynxService,
    customerId: number,
    enabledSources: ContextSource[],
    currentTicket?: { id: number; subject: string; description: string; priority?: string }
  ): Promise<TicketDraftingContext> {
    const context: TicketDraftingContext = {};

    if (currentTicket) {
      context.currentTicket = currentTicket;
    }

    if (!splynxService) {
      console.warn('[ContextEnrichmentService] No Splynx service provided');
      return context;
    }

    // Fetch data in parallel for enabled sources
    const promises: Promise<void>[] = [];

    if (enabledSources.includes('customer_info')) {
      promises.push(
        this.fetchCustomerInfo(splynxService, customerId).then(data => {
          if (data) context.customer = data;
        })
      );
    }

    if (enabledSources.includes('account_balance')) {
      promises.push(
        this.fetchAccountBalance(splynxService, customerId).then(data => {
          if (data) context.billing = data;
        })
      );
    }

    if (enabledSources.includes('connection_status')) {
      promises.push(
        this.fetchConnectionStatus(splynxService, customerId).then(data => {
          if (data && data.length > 0) context.services = data;
        })
      );
    }

    if (enabledSources.includes('ticket_history')) {
      promises.push(
        this.fetchTicketHistory(splynxService, customerId).then(data => {
          if (data && data.length > 0) context.recentTickets = data;
        })
      );
    }

    // Wait for all enabled sources to complete
    await Promise.allSettled(promises);

    return context;
  }

  /**
   * Format context as a readable string for AI prompt injection
   */
  formatContextForPrompt(context: TicketDraftingContext): string {
    const sections: string[] = [];

    // Customer Information
    if (context.customer) {
      sections.push(`**Customer Information:**
- Name: ${context.customer.name}
- Email: ${context.customer.email}
- Phone: ${context.customer.phone || 'Not provided'}
- Status: ${context.customer.status}
- Plan: ${context.customer.plan}
- Address: ${context.customer.address || 'Not provided'}`);
    }

    // Billing Information
    if (context.billing) {
      const balanceDisplay = context.billing.balance < 0 
        ? `${context.billing.currency} ${Math.abs(context.billing.balance).toFixed(2)} (OVERDUE)`
        : context.billing.balance > 0
        ? `${context.billing.currency} ${context.billing.balance.toFixed(2)} (CREDIT)`
        : `${context.billing.currency} 0.00 (Current)`;
      
      let billingSection = `**Account Balance:**
- Balance: ${balanceDisplay}
- Payment Status: ${context.billing.status.toUpperCase()}`;
      
      if (context.billing.lastPaymentDate) {
        billingSection += `\n- Last Payment: ${context.billing.currency} ${context.billing.lastPaymentAmount?.toFixed(2) || '0.00'} on ${context.billing.lastPaymentDate}`;
      }
      
      sections.push(billingSection);
    }

    // Connection Status
    if (context.services && context.services.length > 0) {
      const serviceLines = context.services.map(s => 
        `- ${s.serviceName}: ${s.status.toUpperCase()} (${s.speed})${s.ipAddress ? ` - IP: ${s.ipAddress}` : ''}`
      );
      sections.push(`**Connection Status:**
${serviceLines.join('\n')}`);
    }

    // Recent Ticket History
    if (context.recentTickets && context.recentTickets.length > 0) {
      const ticketLines = context.recentTickets.map((t, i) => {
        const dateStr = t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Unknown date';
        const statusBadge = t.closedAt ? 'Resolved' : t.status;
        return `${i + 1}. #${t.id} - "${t.subject}" (${statusBadge} - ${dateStr})`;
      });
      sections.push(`**Recent Support History (last ${context.recentTickets.length} tickets):**
${ticketLines.join('\n')}`);
    }

    return sections.join('\n\n');
  }

  private async fetchCustomerInfo(splynxService: SplynxService, customerId: number) {
    try {
      const customer = await splynxService.getCustomerById(customerId);
      if (!customer) return null;
      
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        status: customer.status,
        plan: customer.plan,
        address: customer.address,
      };
    } catch (error: any) {
      console.error('[ContextEnrichmentService] Failed to fetch customer info:', error.message);
      return null;
    }
  }

  private async fetchAccountBalance(splynxService: SplynxService, customerId: number) {
    try {
      return await splynxService.getCustomerBalance(customerId);
    } catch (error: any) {
      console.error('[ContextEnrichmentService] Failed to fetch account balance:', error.message);
      return null;
    }
  }

  private async fetchConnectionStatus(splynxService: SplynxService, customerId: number) {
    try {
      const services = await splynxService.getCustomerServices(customerId);
      return services.map(s => ({
        id: s.id,
        serviceName: s.serviceName,
        status: s.status,
        speed: s.speed,
        ipAddress: s.ipAddress,
        connectionType: s.connectionType,
      }));
    } catch (error: any) {
      console.error('[ContextEnrichmentService] Failed to fetch connection status:', error.message);
      return null;
    }
  }

  private async fetchTicketHistory(splynxService: SplynxService, customerId: number) {
    try {
      const tickets = await splynxService.getCustomerTickets(customerId, 4);
      return tickets.map(t => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt,
        closedAt: t.closedAt,
      }));
    } catch (error: any) {
      console.error('[ContextEnrichmentService] Failed to fetch ticket history:', error.message);
      return null;
    }
  }
}

// Singleton instance
export const contextEnrichmentService = new ContextEnrichmentService();
