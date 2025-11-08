import { storage } from '../../storage';
import type { IntegrationTrigger, InsertIntegrationTrigger } from '../../../shared/schema';

export interface TriggerDefinition {
  triggerKey: string;
  name: string;
  description: string;
  category: string;
  eventType: 'webhook' | 'polling' | 'api_call';
  payloadSchema: any;
  availableFields: string[];
}

export class TriggerDiscoveryService {
  private static splynxTriggers: TriggerDefinition[] = [
    // Customer triggers
    {
      triggerKey: 'customer_created',
      name: 'Customer Created',
      description: 'Triggered when a new customer is created in Splynx',
      category: 'customer',
      eventType: 'webhook',
      payloadSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          status: { type: 'string' },
          category: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      availableFields: ['id', 'name', 'email', 'phone', 'status', 'category', 'created_at']
    },
    {
      triggerKey: 'customer_updated',
      name: 'Customer Updated',
      description: 'Triggered when customer information is updated',
      category: 'customer',
      eventType: 'webhook',
      payloadSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          status: { type: 'string' },
          changes: { type: 'object' }
        }
      },
      availableFields: ['id', 'name', 'email', 'phone', 'status', 'changes']
    },
    {
      triggerKey: 'customer_status_changed',
      name: 'Customer Status Changed',
      description: 'Triggered when customer status changes (active, inactive, suspended)',
      category: 'customer',
      eventType: 'webhook',
      payloadSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          customer_name: { type: 'string' },
          old_status: { type: 'string' },
          new_status: { type: 'string' },
          changed_at: { type: 'string', format: 'date-time' }
        }
      },
      availableFields: ['id', 'customer_name', 'old_status', 'new_status', 'changed_at']
    },
    
    // Ticket triggers
    {
      triggerKey: 'ticket_created',
      name: 'Support Ticket Created',
      description: 'Triggered when a new support ticket is created',
      category: 'ticket',
      eventType: 'webhook',
      payloadSchema: {
        type: 'object',
        properties: {
          ticket_id: { type: 'string' },
          customer_id: { type: 'string' },
          subject: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          status: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          assigned_to: { type: 'string' }
        }
      },
      availableFields: ['ticket_id', 'customer_id', 'subject', 'priority', 'status', 'created_at', 'assigned_to']
    },
    {
      triggerKey: 'ticket_status_changed',
      name: 'Ticket Status Changed',
      description: 'Triggered when ticket status changes',
      category: 'ticket',
      eventType: 'webhook',
      payloadSchema: {
        type: 'object',
        properties: {
          ticket_id: { type: 'string' },
          old_status: { type: 'string' },
          new_status: { type: 'string' },
          changed_by: { type: 'string' },
          changed_at: { type: 'string', format: 'date-time' }
        }
      },
      availableFields: ['ticket_id', 'old_status', 'new_status', 'changed_by', 'changed_at']
    },
    {
      triggerKey: 'ticket_assigned',
      name: 'Ticket Assigned',
      description: 'Triggered when a ticket is assigned to a technician',
      category: 'ticket',
      eventType: 'webhook',
      payloadSchema: {
        type: 'object',
        properties: {
          ticket_id: { type: 'string' },
          assigned_to: { type: 'string' },
          assigned_by: { type: 'string' },
          assigned_at: { type: 'string', format: 'date-time' }
        }
      },
      availableFields: ['ticket_id', 'assigned_to', 'assigned_by', 'assigned_at']
    },
    
    // Service triggers
    {
      triggerKey: 'service_activated',
      name: 'Service Activated',
      description: 'Triggered when a customer service is activated',
      category: 'service',
      eventType: 'webhook',
      payloadSchema: {
        type: 'object',
        properties: {
          service_id: { type: 'string' },
          customer_id: { type: 'string' },
          service_type: { type: 'string' },
          plan_name: { type: 'string' },
          activated_at: { type: 'string', format: 'date-time' }
        }
      },
      availableFields: ['service_id', 'customer_id', 'service_type', 'plan_name', 'activated_at']
    },
    {
      triggerKey: 'service_suspended',
      name: 'Service Suspended',
      description: 'Triggered when a service is suspended',
      category: 'service',
      eventType: 'webhook',
      payloadSchema: {
        type: 'object',
        properties: {
          service_id: { type: 'string' },
          customer_id: { type: 'string' },
          reason: { type: 'string' },
          suspended_at: { type: 'string', format: 'date-time' }
        }
      },
      availableFields: ['service_id', 'customer_id', 'reason', 'suspended_at']
    },
    
    // Billing triggers
    {
      triggerKey: 'payment_received',
      name: 'Payment Received',
      description: 'Triggered when a payment is received from customer',
      category: 'billing',
      eventType: 'webhook',
      payloadSchema: {
        type: 'object',
        properties: {
          payment_id: { type: 'string' },
          customer_id: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          payment_method: { type: 'string' },
          received_at: { type: 'string', format: 'date-time' }
        }
      },
      availableFields: ['payment_id', 'customer_id', 'amount', 'currency', 'payment_method', 'received_at']
    },
    {
      triggerKey: 'invoice_generated',
      name: 'Invoice Generated',
      description: 'Triggered when a new invoice is generated',
      category: 'billing',
      eventType: 'webhook',
      payloadSchema: {
        type: 'object',
        properties: {
          invoice_id: { type: 'string' },
          customer_id: { type: 'string' },
          amount: { type: 'number' },
          due_date: { type: 'string', format: 'date' },
          generated_at: { type: 'string', format: 'date-time' }
        }
      },
      availableFields: ['invoice_id', 'customer_id', 'amount', 'due_date', 'generated_at']
    },
    {
      triggerKey: 'payment_overdue',
      name: 'Payment Overdue',
      description: 'Triggered when a payment becomes overdue',
      category: 'billing',
      eventType: 'webhook',
      payloadSchema: {
        type: 'object',
        properties: {
          invoice_id: { type: 'string' },
          customer_id: { type: 'string' },
          amount_due: { type: 'number' },
          days_overdue: { type: 'number' },
          due_date: { type: 'string', format: 'date' }
        }
      },
      availableFields: ['invoice_id', 'customer_id', 'amount_due', 'days_overdue', 'due_date']
    }
  ];

  /**
   * Discovers and populates triggers for a given integration
   */
  public async discoverAndPopulateTriggers(integrationId: number, platformType: string): Promise<IntegrationTrigger[]> {
    let triggers: TriggerDefinition[] = [];
    
    switch (platformType) {
      case 'splynx':
        triggers = TriggerDiscoveryService.splynxTriggers;
        break;
      case 'xero':
        triggers = this.getXeroTriggers();
        break;
      case 'microsoft':
        triggers = this.getOutlookTriggers();
        break;
      default:
        console.log(`No triggers defined for platform: ${platformType}`);
        return [];
    }

    const createdTriggers: IntegrationTrigger[] = [];
    
    for (const trigger of triggers) {
      try {
        // Check if trigger already exists
        const existing = await storage.getIntegrationTriggers(integrationId);
        const existingTrigger = existing.find(t => t.triggerKey === trigger.triggerKey);
        
        if (!existingTrigger) {
          // Generate webhook endpoint for webhook triggers
          const webhookEndpoint = trigger.eventType === 'webhook' 
            ? `/api/webhooks/${platformType}/${integrationId}/${trigger.triggerKey}`
            : undefined;

          const insertData: InsertIntegrationTrigger = {
            integrationId,
            triggerKey: trigger.triggerKey,
            name: trigger.name,
            description: trigger.description,
            category: trigger.category,
            eventType: trigger.eventType,
            webhookEndpoint,
            payloadSchema: trigger.payloadSchema,
            availableFields: trigger.availableFields,
            configuration: {},
            isActive: true,
            isConfigured: false
          };
          
          const created = await storage.createIntegrationTrigger(insertData);
          createdTriggers.push(created);
        }
      } catch (error) {
        console.error(`Failed to create trigger ${trigger.triggerKey}:`, error);
      }
    }
    
    return createdTriggers;
  }

  /**
   * Get triggers for a specific integration
   */
  public async getTriggers(integrationId: number): Promise<IntegrationTrigger[]> {
    return storage.getIntegrationTriggers(integrationId);
  }

  /**
   * Get all triggers available for an organization
   */
  public async getOrganizationTriggers(organizationId: number): Promise<IntegrationTrigger[]> {
    return storage.getAllTriggersForOrganization(organizationId);
  }

  // Placeholder for other integrations
  private getXeroTriggers(): TriggerDefinition[] {
    return [
      {
        triggerKey: 'invoice_created',
        name: 'Invoice Created',
        description: 'Triggered when a new invoice is created in Xero',
        category: 'accounting',
        eventType: 'webhook',
        payloadSchema: {},
        availableFields: ['invoice_id', 'customer_id', 'amount', 'status']
      },
      {
        triggerKey: 'payment_received',
        name: 'Payment Received',
        description: 'Triggered when a payment is received in Xero',
        category: 'accounting',
        eventType: 'webhook',
        payloadSchema: {},
        availableFields: ['payment_id', 'invoice_id', 'amount', 'date']
      }
    ];
  }

  private getOutlookTriggers(): TriggerDefinition[] {
    return [
      {
        triggerKey: 'email_received',
        name: 'Email Received',
        description: 'Triggered when a new email is received',
        category: 'communication',
        eventType: 'polling',
        payloadSchema: {},
        availableFields: ['from', 'to', 'subject', 'body', 'received_at']
      },
      {
        triggerKey: 'calendar_event_created',
        name: 'Calendar Event Created',
        description: 'Triggered when a new calendar event is created',
        category: 'calendar',
        eventType: 'polling',
        payloadSchema: {},
        availableFields: ['event_id', 'title', 'start_time', 'end_time', 'attendees']
      }
    ];
  }
}

// Export singleton instance
export const triggerDiscovery = new TriggerDiscoveryService();