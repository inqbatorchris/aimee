// Data transformers to map Splynx API responses to our frontend interface

export interface TransformedCustomer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  joinDate: string;
  status: string;
  accountBalance: number;
  nextBillDate?: string;
  services: TransformedService[];
  invoices: TransformedInvoice[];
  usage: TransformedUsage[];
  tickets: TransformedTicket[];
  activity: TransformedActivity[];
  lastActivity: string;
}

export interface TransformedService {
  id: number;
  type: string;
  plan: string;
  price: string;
  status: string;
  installDate: string;
}

export interface TransformedInvoice {
  id: number;
  amount: string;
  issueDate: string;
  dueDate: string;
  status: string;
  paidDate?: string;
}

export interface TransformedUsage {
  month: string;
  download: number;
  upload: number;
  total: number;
}

export interface TransformedTicket {
  id: number;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  category: string;
}

export interface TransformedActivity {
  type: string;
  description: string;
  date: string;
  amount?: number;
  status?: string;
  ticketId?: number;
}

export class SplynxTransformers {
  static transformCustomer(splynxCustomer: any): Partial<TransformedCustomer> {
    return {
      id: splynxCustomer.id?.toString() || '',
      fullName: splynxCustomer.name || '',
      email: splynxCustomer.email || '',
      phone: splynxCustomer.phone || '',
      address: this.buildAddress(splynxCustomer),
      joinDate: splynxCustomer.date_add || new Date().toISOString(),
      status: this.mapCustomerStatus(splynxCustomer.status),
      accountBalance: parseFloat(splynxCustomer.billing_balance || '0'),
      lastActivity: splynxCustomer.date_last_activity || splynxCustomer.date_add || new Date().toISOString(),
    };
  }

  static transformService(splynxService: any, type: string = 'Internet'): TransformedService {
    return {
      id: splynxService.id,
      type: type,
      plan: splynxService.tariff_name || splynxService.plan || 'Unknown Plan',
      price: splynxService.price || '0.00',
      status: this.mapServiceStatus(splynxService.status),
      installDate: splynxService.date_start || splynxService.date_add || new Date().toISOString(),
    };
  }

  static transformInvoice(splynxInvoice: any): TransformedInvoice {
    return {
      id: splynxInvoice.id,
      amount: splynxInvoice.total || '0.00',
      issueDate: splynxInvoice.date || new Date().toISOString(),
      dueDate: splynxInvoice.date_till || new Date().toISOString(),
      status: this.mapInvoiceStatus(splynxInvoice.status),
      paidDate: splynxInvoice.date_payment || undefined,
    };
  }

  static transformTicket(splynxTicket: any): TransformedTicket {
    return {
      id: splynxTicket.id,
      subject: splynxTicket.subject || 'No Subject',
      status: this.mapTicketStatus(splynxTicket.status),
      priority: this.mapTicketPriority(splynxTicket.priority),
      createdAt: splynxTicket.date_created || new Date().toISOString(),
      category: splynxTicket.group_id ? 'technical' : 'general',
    };
  }

  static transformUsage(splynxStats: any): TransformedUsage[] {
    if (!Array.isArray(splynxStats)) return [];
    
    return splynxStats.map(stat => ({
      month: this.formatMonth(stat.date || new Date().toISOString()),
      download: Math.round((stat.download || 0) / (1024 * 1024 * 1024) * 100) / 100, // Convert to GB
      upload: Math.round((stat.upload || 0) / (1024 * 1024 * 1024) * 100) / 100, // Convert to GB
      total: Math.round(((stat.download || 0) + (stat.upload || 0)) / (1024 * 1024 * 1024) * 100) / 100,
    }));
  }

  static transformTransaction(splynxTransaction: any): TransformedActivity {
    return {
      type: 'payment',
      description: `Payment ${splynxTransaction.type || 'received'} - ${splynxTransaction.comment || 'No description'}`,
      date: splynxTransaction.date || new Date().toISOString(),
      amount: parseFloat(splynxTransaction.amount || '0'),
      status: splynxTransaction.amount && parseFloat(splynxTransaction.amount) > 0 ? 'completed' : 'failed',
    };
  }

  // Helper methods
  private static buildAddress(customer: any): string {
    const parts = [
      customer.street_1,
      customer.city,
      customer.zip_code,
    ].filter(Boolean);
    
    return parts.join(', ') || 'No address provided';
  }

  private static mapCustomerStatus(status: any): string {
    const statusMap: { [key: string]: string } = {
      'active': 'active',
      'new': 'active',
      'blocked': 'suspended',
      'inactive': 'inactive',
      '1': 'active',
      '0': 'inactive',
    };
    
    return statusMap[status?.toString()] || 'inactive';
  }

  private static mapServiceStatus(status: any): string {
    const statusMap: { [key: string]: string } = {
      'active': 'active',
      'stopped': 'suspended',
      'disabled': 'suspended',
      'new': 'pending',
      '1': 'active',
      '0': 'suspended',
    };
    
    return statusMap[status?.toString()] || 'pending';
  }

  private static mapInvoiceStatus(status: any): string {
    const statusMap: { [key: string]: string } = {
      'paid': 'paid',
      'unpaid': 'pending',
      'overdue': 'overdue',
      'new': 'pending',
      '1': 'paid',
      '0': 'pending',
    };
    
    return statusMap[status?.toString()] || 'pending';
  }

  private static mapTicketStatus(status: any): string {
    const statusMap: { [key: string]: string } = {
      'new': 'open',
      'open': 'open',
      'waiting': 'waiting_customer',
      'resolved': 'resolved',
      'closed': 'resolved',
      '1': 'open',
      '0': 'resolved',
    };
    
    return statusMap[status?.toString()] || 'open';
  }

  private static mapTicketPriority(priority: any): string {
    const priorityMap: { [key: string]: string } = {
      'low': 'low',
      'normal': 'medium',
      'high': 'high',
      'urgent': 'urgent',
      '1': 'low',
      '2': 'medium',
      '3': 'high',
      '4': 'urgent',
    };
    
    return priorityMap[priority?.toString()] || 'medium';
  }

  private static formatMonth(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      month: 'long',
      year: 'numeric' 
    });
  }
}

export default SplynxTransformers;