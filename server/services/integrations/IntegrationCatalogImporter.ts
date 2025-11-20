import { CleanDatabaseStorage } from '../../storage';
import type { 
  InsertIntegrationTrigger, 
  InsertIntegrationAction,
  Integration 
} from '../../../shared/schema';

export class IntegrationCatalogImporter {
  private storage: CleanDatabaseStorage;

  constructor(storage: CleanDatabaseStorage) {
    this.storage = storage;
  }

  /**
   * Import complete catalog of triggers and actions for Splynx integration
   */
  async importSplynxCatalog(integrationId: number): Promise<{
    triggersImported: number;
    actionsImported: number;
  }> {
    console.log(`[IntegrationCatalogImporter] Starting Splynx catalog import for integration ${integrationId}`);
    
    // Define comprehensive Splynx triggers based on API documentation
    const splynxTriggers: InsertIntegrationTrigger[] = [
      // Customer Events
      {
        integrationId,
        triggerKey: 'customer_created',
        name: 'Customer Created',
        description: 'Triggered when a new customer is created in Splynx',
        category: 'Customers',
        eventType: 'webhook',
        resourceType: 'customer',
        parameterSchema: {},
        responseSchema: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            status: { type: 'string' }
          }
        },
        samplePayload: {
          id: 12345,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          status: 'active'
        },
        docsUrl: 'https://splynx.docs.apiary.io/#reference/customers',
        isActive: true,
        isConfigured: false
      },
      {
        integrationId,
        triggerKey: 'customer_updated',
        name: 'Customer Updated',
        description: 'Triggered when a customer record is updated',
        category: 'Customers',
        eventType: 'webhook',
        resourceType: 'customer',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/customers',
        isActive: true,
        isConfigured: false
      },
      {
        integrationId,
        triggerKey: 'customer_blocked',
        name: 'Customer Blocked',
        description: 'Triggered when a customer account is blocked',
        category: 'Customers',
        eventType: 'webhook',
        resourceType: 'customer',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/customers',
        isActive: true,
        isConfigured: false
      },
      {
        integrationId,
        triggerKey: 'customer_deleted',
        name: 'Customer Deleted',
        description: 'Triggered when a customer is deleted from the system',
        category: 'Customers',
        eventType: 'webhook',
        resourceType: 'customer',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/customers',
        isActive: true,
        isConfigured: false
      },
      
      // Service Events
      {
        integrationId,
        triggerKey: 'service_created',
        name: 'Service Created',
        description: 'Triggered when a new service is added to a customer',
        category: 'Services',
        eventType: 'webhook',
        resourceType: 'service',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/services',
        isActive: true,
        isConfigured: false
      },
      {
        integrationId,
        triggerKey: 'service_activated',
        name: 'Service Activated',
        description: 'Triggered when a service is activated',
        category: 'Services',
        eventType: 'webhook',
        resourceType: 'service',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/services',
        isActive: true,
        isConfigured: false
      },
      {
        integrationId,
        triggerKey: 'service_suspended',
        name: 'Service Suspended',
        description: 'Triggered when a service is suspended',
        category: 'Services',
        eventType: 'webhook',
        resourceType: 'service',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/services',
        isActive: true,
        isConfigured: false
      },
      {
        integrationId,
        triggerKey: 'service_terminated',
        name: 'Service Terminated',
        description: 'Triggered when a service is terminated',
        category: 'Services',
        eventType: 'webhook',
        resourceType: 'service',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/services',
        isActive: true,
        isConfigured: false
      },
      
      // Invoice Events
      {
        integrationId,
        triggerKey: 'invoice_created',
        name: 'Invoice Created',
        description: 'Triggered when a new invoice is generated',
        category: 'Billing',
        eventType: 'webhook',
        resourceType: 'invoice',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/invoices',
        isActive: true,
        isConfigured: false
      },
      {
        integrationId,
        triggerKey: 'invoice_paid',
        name: 'Invoice Paid',
        description: 'Triggered when an invoice is marked as paid',
        category: 'Billing',
        eventType: 'webhook',
        resourceType: 'invoice',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/invoices',
        isActive: true,
        isConfigured: false
      },
      {
        integrationId,
        triggerKey: 'invoice_overdue',
        name: 'Invoice Overdue',
        description: 'Triggered when an invoice becomes overdue',
        category: 'Billing',
        eventType: 'webhook',
        resourceType: 'invoice',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/invoices',
        isActive: true,
        isConfigured: false
      },
      
      // Payment Events
      {
        integrationId,
        triggerKey: 'payment_received',
        name: 'Payment Received',
        description: 'Triggered when a payment is received from a customer',
        category: 'Billing',
        eventType: 'webhook',
        resourceType: 'payment',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/payments',
        isActive: true,
        isConfigured: false
      },
      {
        integrationId,
        triggerKey: 'payment_failed',
        name: 'Payment Failed',
        description: 'Triggered when a payment attempt fails',
        category: 'Billing',
        eventType: 'webhook',
        resourceType: 'payment',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/payments',
        isActive: true,
        isConfigured: false
      },
      
      // Ticket Events
      {
        integrationId,
        triggerKey: 'ticket_created',
        name: 'Ticket Created',
        description: 'Triggered when a new support ticket is created',
        category: 'Support',
        eventType: 'webhook',
        resourceType: 'ticket',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/tickets',
        isActive: true,
        isConfigured: false
      },
      {
        integrationId,
        triggerKey: 'ticket_updated',
        name: 'Ticket Updated',
        description: 'Triggered when a ticket is updated',
        category: 'Support',
        eventType: 'webhook',
        resourceType: 'ticket',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/tickets',
        isActive: true,
        isConfigured: false
      },
      {
        integrationId,
        triggerKey: 'ticket_closed',
        name: 'Ticket Closed',
        description: 'Triggered when a ticket is closed',
        category: 'Support',
        eventType: 'webhook',
        resourceType: 'ticket',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/tickets',
        isActive: true,
        isConfigured: false
      },
      
      // Device Events
      {
        integrationId,
        triggerKey: 'device_online',
        name: 'Device Online',
        description: 'Triggered when a device comes online',
        category: 'Network',
        eventType: 'webhook',
        resourceType: 'device',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/routers',
        isActive: true,
        isConfigured: false
      },
      {
        integrationId,
        triggerKey: 'device_offline',
        name: 'Device Offline',
        description: 'Triggered when a device goes offline',
        category: 'Network',
        eventType: 'webhook',
        resourceType: 'device',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/routers',
        isActive: true,
        isConfigured: false
      },
      
      // Task Events
      {
        integrationId,
        triggerKey: 'task_created',
        name: 'Task Created',
        description: 'Triggered when a new task is created',
        category: 'Tasks',
        eventType: 'webhook',
        resourceType: 'task',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/tasks',
        isActive: true,
        isConfigured: false
      },
      {
        integrationId,
        triggerKey: 'task_completed',
        name: 'Task Completed',
        description: 'Triggered when a task is marked as complete',
        category: 'Tasks',
        eventType: 'webhook',
        resourceType: 'task',
        docsUrl: 'https://splynx.docs.apiary.io/#reference/tasks',
        isActive: true,
        isConfigured: false
      }
    ];

    // Define comprehensive Splynx actions based on API documentation
    const splynxActions: InsertIntegrationAction[] = [
      // Customer Actions
      {
        integrationId,
        actionKey: 'create_customer',
        name: 'Create Customer',
        description: 'Create a new customer in Splynx',
        category: 'Customers',
        httpMethod: 'POST',
        endpoint: '/api/2.0/admin/customers',
        parameterSchema: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: { type: 'string', description: 'Customer full name' },
            email: { type: 'string', description: 'Customer email address' },
            phone: { type: 'string', description: 'Phone number' },
            street_1: { type: 'string', description: 'Street address line 1' },
            city: { type: 'string', description: 'City' },
            zip_code: { type: 'string', description: 'ZIP/Postal code' },
            country: { type: 'string', description: 'Country code' }
          }
        },
        requiredFields: ['name', 'email'],
        optionalFields: ['phone', 'street_1', 'city', 'zip_code', 'country'],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/customers/customers-collection/create-customer',
        resourceType: 'customer',
        idempotent: false,
        isActive: true
      },
      {
        integrationId,
        actionKey: 'update_customer',
        name: 'Update Customer',
        description: 'Update an existing customer record',
        category: 'Customers',
        httpMethod: 'PUT',
        endpoint: '/api/2.0/admin/customers/{id}',
        parameterSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Customer ID' },
            name: { type: 'string', description: 'Customer full name' },
            email: { type: 'string', description: 'Customer email address' },
            phone: { type: 'string', description: 'Phone number' },
            status: { type: 'string', enum: ['new', 'active', 'blocked', 'inactive'] }
          }
        },
        requiredFields: ['id'],
        optionalFields: ['name', 'email', 'phone', 'status'],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/customers/customer/update-customer',
        resourceType: 'customer',
        idempotent: true,
        isActive: true
      },
      {
        integrationId,
        actionKey: 'get_customer',
        name: 'Get Customer',
        description: 'Retrieve customer details by ID',
        category: 'Customers',
        httpMethod: 'GET',
        endpoint: '/api/2.0/admin/customers/{id}',
        parameterSchema: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Customer ID' }
          }
        },
        requiredFields: ['id'],
        optionalFields: [],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/customers/customer/view-customer',
        resourceType: 'customer',
        idempotent: true,
        isActive: true
      },
      {
        integrationId,
        actionKey: 'list_customers',
        name: 'List Customers',
        description: 'Get a list of all customers with filtering options',
        category: 'Customers',
        httpMethod: 'GET',
        endpoint: '/api/2.0/admin/customers',
        parameterSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status' },
            search: { type: 'string', description: 'Search term' },
            limit: { type: 'number', description: 'Number of results to return' },
            offset: { type: 'number', description: 'Offset for pagination' }
          }
        },
        requiredFields: [],
        optionalFields: ['status', 'search', 'limit', 'offset'],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/customers/customers-collection/list-customers',
        resourceType: 'customer',
        idempotent: true,
        isActive: true
      },
      {
        integrationId,
        actionKey: 'block_customer',
        name: 'Block Customer',
        description: 'Block a customer account',
        category: 'Customers',
        httpMethod: 'POST',
        endpoint: '/api/2.0/admin/customers/{id}/block',
        parameterSchema: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Customer ID' },
            reason: { type: 'string', description: 'Reason for blocking' }
          }
        },
        requiredFields: ['id'],
        optionalFields: ['reason'],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/customers',
        resourceType: 'customer',
        idempotent: true,
        isActive: true
      },
      
      // Service Actions
      {
        integrationId,
        actionKey: 'create_service',
        name: 'Create Service',
        description: 'Add a new service to a customer',
        category: 'Services',
        httpMethod: 'POST',
        endpoint: '/api/2.0/admin/customers/customer/{customer_id}/internet-services',
        parameterSchema: {
          type: 'object',
          required: ['customer_id', 'tariff_id'],
          properties: {
            customer_id: { type: 'number', description: 'Customer ID' },
            tariff_id: { type: 'number', description: 'Tariff/Plan ID' },
            description: { type: 'string', description: 'Service description' },
            status: { type: 'string', enum: ['pending', 'active', 'stopped', 'paused'] }
          }
        },
        requiredFields: ['customer_id', 'tariff_id'],
        optionalFields: ['description', 'status'],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/services/internet-services',
        resourceType: 'service',
        idempotent: false,
        isActive: true
      },
      {
        integrationId,
        actionKey: 'update_service',
        name: 'Update Service',
        description: 'Update service settings or status',
        category: 'Services',
        httpMethod: 'PUT',
        endpoint: '/api/2.0/admin/customers/customer/{customer_id}/internet-services/{id}',
        parameterSchema: {
          type: 'object',
          required: ['customer_id', 'id'],
          properties: {
            customer_id: { type: 'number', description: 'Customer ID' },
            id: { type: 'number', description: 'Service ID' },
            status: { type: 'string', enum: ['pending', 'active', 'stopped', 'paused'] },
            description: { type: 'string', description: 'Service description' }
          }
        },
        requiredFields: ['customer_id', 'id'],
        optionalFields: ['status', 'description'],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/services/internet-service',
        resourceType: 'service',
        idempotent: true,
        isActive: true
      },
      {
        integrationId,
        actionKey: 'suspend_service',
        name: 'Suspend Service',
        description: 'Temporarily suspend a customer service',
        category: 'Services',
        httpMethod: 'POST',
        endpoint: '/api/2.0/admin/customers/customer/{customer_id}/internet-services/{id}/suspend',
        parameterSchema: {
          type: 'object',
          required: ['customer_id', 'id'],
          properties: {
            customer_id: { type: 'number', description: 'Customer ID' },
            id: { type: 'number', description: 'Service ID' },
            reason: { type: 'string', description: 'Suspension reason' }
          }
        },
        requiredFields: ['customer_id', 'id'],
        optionalFields: ['reason'],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/services',
        resourceType: 'service',
        idempotent: true,
        isActive: true
      },
      
      // Invoice Actions
      {
        integrationId,
        actionKey: 'create_invoice',
        name: 'Create Invoice',
        description: 'Generate a new invoice for a customer',
        category: 'Billing',
        httpMethod: 'POST',
        endpoint: '/api/2.0/admin/finance/invoices',
        parameterSchema: {
          type: 'object',
          required: ['customer_id'],
          properties: {
            customer_id: { type: 'number', description: 'Customer ID' },
            items: { type: 'array', description: 'Invoice line items' },
            due_date: { type: 'string', format: 'date', description: 'Payment due date' }
          }
        },
        requiredFields: ['customer_id'],
        optionalFields: ['items', 'due_date'],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/invoices/invoices-collection',
        resourceType: 'invoice',
        idempotent: false,
        isActive: true
      },
      {
        integrationId,
        actionKey: 'get_invoice',
        name: 'Get Invoice',
        description: 'Retrieve invoice details by ID',
        category: 'Billing',
        httpMethod: 'GET',
        endpoint: '/api/2.0/admin/finance/invoices/{id}',
        parameterSchema: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Invoice ID' }
          }
        },
        requiredFields: ['id'],
        optionalFields: [],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/invoices/invoice',
        resourceType: 'invoice',
        idempotent: true,
        isActive: true
      },
      {
        integrationId,
        actionKey: 'send_invoice',
        name: 'Send Invoice',
        description: 'Send invoice to customer via email',
        category: 'Billing',
        httpMethod: 'POST',
        endpoint: '/api/2.0/admin/finance/invoices/{id}/send',
        parameterSchema: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Invoice ID' },
            email_override: { type: 'string', description: 'Override email address' }
          }
        },
        requiredFields: ['id'],
        optionalFields: ['email_override'],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/invoices',
        resourceType: 'invoice',
        idempotent: true,
        isActive: true
      },
      
      // Payment Actions
      {
        integrationId,
        actionKey: 'record_payment',
        name: 'Record Payment',
        description: 'Record a payment received from a customer',
        category: 'Billing',
        httpMethod: 'POST',
        endpoint: '/api/2.0/admin/finance/payments',
        parameterSchema: {
          type: 'object',
          required: ['customer_id', 'amount'],
          properties: {
            customer_id: { type: 'number', description: 'Customer ID' },
            amount: { type: 'number', description: 'Payment amount' },
            payment_method: { type: 'string', description: 'Payment method' },
            invoice_id: { type: 'number', description: 'Associated invoice ID' }
          }
        },
        requiredFields: ['customer_id', 'amount'],
        optionalFields: ['payment_method', 'invoice_id'],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/payments/payments-collection',
        resourceType: 'payment',
        idempotent: false,
        isActive: true
      },
      
      // Ticket Actions
      {
        integrationId,
        actionKey: 'create_ticket',
        name: 'Create Ticket',
        description: 'Create a new support ticket',
        category: 'Support',
        httpMethod: 'POST',
        endpoint: '/api/2.0/admin/support/tickets',
        parameterSchema: {
          type: 'object',
          required: ['customer_id', 'subject'],
          properties: {
            customer_id: { type: 'number', description: 'Customer ID' },
            subject: { type: 'string', description: 'Ticket subject' },
            message: { type: 'string', description: 'Initial message' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] }
          }
        },
        requiredFields: ['customer_id', 'subject'],
        optionalFields: ['message', 'priority'],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/tickets/tickets-collection',
        resourceType: 'ticket',
        idempotent: false,
        isActive: true
      },
      {
        integrationId,
        actionKey: 'update_ticket',
        name: 'Update Ticket',
        description: 'Update ticket status or add a reply',
        category: 'Support',
        httpMethod: 'PUT',
        endpoint: '/api/2.0/admin/support/tickets/{id}',
        parameterSchema: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Ticket ID' },
            status: { type: 'string', enum: ['new', 'open', 'waiting', 'closed'] },
            message: { type: 'string', description: 'Reply message' }
          }
        },
        requiredFields: ['id'],
        optionalFields: ['status', 'message'],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/tickets/ticket',
        resourceType: 'ticket',
        idempotent: true,
        isActive: true
      },
      {
        integrationId,
        actionKey: 'close_ticket',
        name: 'Close Ticket',
        description: 'Close a support ticket',
        category: 'Support',
        httpMethod: 'POST',
        endpoint: '/api/2.0/admin/support/tickets/{id}/close',
        parameterSchema: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Ticket ID' },
            resolution: { type: 'string', description: 'Resolution notes' }
          }
        },
        requiredFields: ['id'],
        optionalFields: ['resolution'],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/tickets',
        resourceType: 'ticket',
        idempotent: true,
        isActive: true
      },
      
      // Notification Actions
      {
        integrationId,
        actionKey: 'send_sms',
        name: 'Send SMS',
        description: 'Send SMS notification to a customer',
        category: 'Notifications',
        httpMethod: 'POST',
        endpoint: '/api/2.0/admin/messages/sms',
        parameterSchema: {
          type: 'object',
          required: ['customer_id', 'message'],
          properties: {
            customer_id: { type: 'number', description: 'Customer ID' },
            message: { type: 'string', description: 'SMS message content' }
          }
        },
        requiredFields: ['customer_id', 'message'],
        optionalFields: [],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/messages',
        resourceType: 'message',
        idempotent: false,
        isActive: true
      },
      {
        integrationId,
        actionKey: 'send_email',
        name: 'Send Email',
        description: 'Send email notification to a customer',
        category: 'Notifications',
        httpMethod: 'POST',
        endpoint: '/api/2.0/admin/messages/email',
        parameterSchema: {
          type: 'object',
          required: ['customer_id', 'subject', 'message'],
          properties: {
            customer_id: { type: 'number', description: 'Customer ID' },
            subject: { type: 'string', description: 'Email subject' },
            message: { type: 'string', description: 'Email body' }
          }
        },
        requiredFields: ['customer_id', 'subject', 'message'],
        optionalFields: [],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/messages',
        resourceType: 'message',
        idempotent: false,
        isActive: true
      },
      
      // Task Actions
      {
        integrationId,
        actionKey: 'create_task',
        name: 'Create Task',
        description: 'Create a new task',
        category: 'Tasks',
        httpMethod: 'POST',
        endpoint: '/api/2.0/admin/scheduling/tasks',
        parameterSchema: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Task description' },
            assigned_to: { type: 'number', description: 'Assigned user ID' },
            due_date: { type: 'string', format: 'date', description: 'Due date' }
          }
        },
        requiredFields: ['title'],
        optionalFields: ['description', 'assigned_to', 'due_date'],
        docsUrl: 'https://splynx.docs.apiary.io/#reference/tasks',
        resourceType: 'task',
        idempotent: false,
        isActive: true
      }
    ];

    // Upsert triggers and actions
    const importedTriggers = await this.storage.upsertIntegrationTriggers(integrationId, splynxTriggers);
    const importedActions = await this.storage.upsertIntegrationActions(integrationId, splynxActions);
    
    console.log(`[IntegrationCatalogImporter] Imported ${importedTriggers.length} triggers and ${importedActions.length} actions for Splynx`);
    
    return {
      triggersImported: importedTriggers.length,
      actionsImported: importedActions.length
    };
  }
  
  /**
   * Import complete catalog of actions for PXC (TalkTalk Wholesale) integration
   */
  async importPXCCatalog(integrationId: number): Promise<{
    actionsImported: number;
  }> {
    console.log(`[IntegrationCatalogImporter] Starting PXC catalog import for integration ${integrationId}`);
    
    const pxcActions: InsertIntegrationAction[] = [
      {
        integrationId,
        actionKey: 'authenticate_pxc',
        name: 'Authenticate with PXC',
        description: 'Get JWT token for PXC API authentication',
        category: 'Authentication',
        httpMethod: 'POST',
        endpoint: '/partners/security/v1/api/token',
        parameterSchema: {
          type: 'object',
          required: ['client_id', 'client_secret'],
          properties: {
            client_id: { type: 'string', description: 'PXC Client ID' },
            client_secret: { type: 'string', description: 'PXC Client Secret' }
          }
        },
        responseSchema: {
          type: 'object',
          properties: {
            partnerJWT: { type: 'string', description: 'JWT authentication token' }
          }
        },
        requiredFields: ['client_id', 'client_secret'],
        optionalFields: [],
        resourceType: 'authentication',
        idempotent: false,
        isActive: true
      },
      {
        integrationId,
        actionKey: 'fetch_orders',
        name: 'Fetch Product Orders',
        description: 'Retrieve product orders with optional filtering by date and state',
        category: 'Orders',
        httpMethod: 'GET',
        endpoint: '/partners/product-order/v3/api/productOrder',
        parameterSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max orders to fetch', default: 1000 },
            fields: { type: 'string', description: 'Fields to return', default: 'id,state,lastUpdate' },
            offset: { type: 'number', description: 'Pagination offset', default: 0 },
            state: { type: 'string', description: 'Order states to filter', default: 'held,inProgress,failed,rejected' },
            lastUpdateSince: { type: 'string', format: 'date-time', description: 'Only orders updated since this timestamp' }
          }
        },
        responseSchema: {
          type: 'object',
          properties: {
            totalOrders: { type: 'number' },
            todayOrders: { type: 'number' },
            orders: { type: 'array' },
            categorized: { type: 'object' }
          }
        },
        requiredFields: [],
        optionalFields: ['limit', 'fields', 'offset', 'state', 'lastUpdateSince'],
        resourceType: 'order',
        idempotent: true,
        isActive: true
      },
      {
        integrationId,
        actionKey: 'get_order_details',
        name: 'Get Order Details',
        description: 'Fetch complete details for a specific order by ID',
        category: 'Orders',
        httpMethod: 'GET',
        endpoint: '/partners/product-order/v3/api/productOrder/{orderId}',
        parameterSchema: {
          type: 'object',
          required: ['orderId'],
          properties: {
            orderId: { type: 'string', description: 'Order ID to fetch' }
          }
        },
        requiredFields: ['orderId'],
        optionalFields: [],
        resourceType: 'order',
        idempotent: true,
        isActive: true
      }
    ];

    // Import actions
    const importedActions = await this.storage.upsertIntegrationActions(integrationId, pxcActions);
    
    console.log(`[IntegrationCatalogImporter] ✓ PXC catalog import complete: ${importedActions.length} actions`);

    return {
      actionsImported: importedActions.length
    };
  }
  
  /**
   * Import complete catalog of triggers and actions for Vapi integration
   */
  async importVapiCatalog(integrationId: number): Promise<{
    triggersImported: number;
    actionsImported: number;
  }> {
    console.log(`[IntegrationCatalogImporter] Importing Vapi catalog for integration ${integrationId}...`);

    // Define Vapi triggers (webhook events)
    const vapiTriggers: InsertIntegrationTrigger[] = [
      {
        integrationId,
        triggerKey: 'call_started',
        name: 'Call Started',
        description: 'Triggered when a voice AI call is initiated',
        category: 'Calls',
        eventType: 'webhook',
        resourceType: 'call',
        parameterSchema: {},
        responseSchema: {
          type: 'object',
          properties: {
            callId: { type: 'string' },
            assistantId: { type: 'string' },
            phoneNumber: { type: 'string' },
            status: { type: 'string' }
          }
        },
        samplePayload: {
          callId: 'call-123',
          assistantId: 'asst-456',
          phoneNumber: '+1234567890',
          status: 'started'
        },
        docsUrl: 'https://docs.vapi.ai/webhooks',
        isActive: true,
        isConfigured: false
      },
      {
        integrationId,
        triggerKey: 'call_ended',
        name: 'Call Ended',
        description: 'Triggered when a voice AI call completes',
        category: 'Calls',
        eventType: 'webhook',
        resourceType: 'call',
        responseSchema: {
          type: 'object',
          properties: {
            callId: { type: 'string' },
            duration: { type: 'number' },
            wasAutonomous: { type: 'boolean' },
            transcript: { type: 'string' }
          }
        },
        docsUrl: 'https://docs.vapi.ai/webhooks',
        isActive: true,
        isConfigured: false
      },
      {
        integrationId,
        triggerKey: 'end_of_call_report',
        name: 'End of Call Report',
        description: 'Triggered when comprehensive call analysis is ready',
        category: 'Calls',
        eventType: 'webhook',
        resourceType: 'call',
        docsUrl: 'https://docs.vapi.ai/webhooks',
        isActive: true,
        isConfigured: false
      },
      {
        integrationId,
        triggerKey: 'transcript_available',
        name: 'Transcript Available',
        description: 'Triggered when call transcript is ready',
        category: 'Calls',
        eventType: 'webhook',
        resourceType: 'call',
        docsUrl: 'https://docs.vapi.ai/webhooks',
        isActive: true,
        isConfigured: false
      }
    ];

    // Define Vapi actions
    const vapiActions: InsertIntegrationAction[] = [
      {
        integrationId,
        actionKey: 'create_assistant',
        name: 'Create Voice Assistant',
        description: 'Create a new voice AI assistant with custom configuration',
        category: 'Assistants',
        httpMethod: 'POST',
        endpoint: '/assistant',
        parameterSchema: {
          type: 'object',
          required: ['name', 'modelProvider', 'voiceProvider'],
          properties: {
            name: { type: 'string', description: 'Assistant name' },
            systemPrompt: { type: 'string', description: 'System instructions' },
            modelProvider: { type: 'string', description: 'AI model provider (openai, anthropic)' },
            voiceProvider: { type: 'string', description: 'Voice provider (elevenlabs, playht)' }
          }
        },
        requiredFields: ['name', 'modelProvider', 'voiceProvider'],
        optionalFields: ['systemPrompt'],
        docsUrl: 'https://docs.vapi.ai/api-reference/assistants/create',
        resourceType: 'assistant',
        idempotent: false,
        isActive: true
      },
      {
        integrationId,
        actionKey: 'make_call',
        name: 'Make Outbound Call',
        description: 'Initiate an outbound voice AI call',
        category: 'Calls',
        httpMethod: 'POST',
        endpoint: '/call/phone',
        parameterSchema: {
          type: 'object',
          required: ['phoneNumber', 'assistantId'],
          properties: {
            phoneNumber: { type: 'string', description: 'Customer phone number' },
            assistantId: { type: 'string', description: 'Assistant to use for call' }
          }
        },
        requiredFields: ['phoneNumber', 'assistantId'],
        optionalFields: [],
        docsUrl: 'https://docs.vapi.ai/api-reference/calls/create',
        resourceType: 'call',
        idempotent: false,
        isActive: true
      },
      {
        integrationId,
        actionKey: 'get_call',
        name: 'Get Call Details',
        description: 'Retrieve details for a specific call',
        category: 'Calls',
        httpMethod: 'GET',
        endpoint: '/call/{callId}',
        parameterSchema: {
          type: 'object',
          required: ['callId'],
          properties: {
            callId: { type: 'string', description: 'Call ID' }
          }
        },
        requiredFields: ['callId'],
        optionalFields: [],
        docsUrl: 'https://docs.vapi.ai/api-reference/calls/get',
        resourceType: 'call',
        idempotent: true,
        isActive: true
      },
      {
        integrationId,
        actionKey: 'upload_knowledge_file',
        name: 'Upload Knowledge Base File',
        description: 'Upload a file to the voice AI knowledge base',
        category: 'Knowledge Base',
        httpMethod: 'POST',
        endpoint: '/file',
        parameterSchema: {
          type: 'object',
          required: ['fileName', 'fileContent'],
          properties: {
            fileName: { type: 'string', description: 'File name' },
            fileContent: { type: 'string', description: 'File content (base64 or text)' }
          }
        },
        requiredFields: ['fileName', 'fileContent'],
        optionalFields: [],
        docsUrl: 'https://docs.vapi.ai/api-reference/files/upload',
        resourceType: 'file',
        idempotent: false,
        isActive: true
      }
    ];

    // Upsert triggers and actions
    const importedTriggers = await this.storage.upsertIntegrationTriggers(integrationId, vapiTriggers);
    const importedActions = await this.storage.upsertIntegrationActions(integrationId, vapiActions);

    console.log(`[IntegrationCatalogImporter] ✓ Vapi catalog import complete: ${importedTriggers.length} triggers, ${importedActions.length} actions`);

    return {
      triggersImported: importedTriggers.length,
      actionsImported: importedActions.length
    };
  }

  /**
   * Import catalog for any integration based on platform type
   */
  async importCatalog(integration: Integration): Promise<{
    triggersImported: number;
    actionsImported: number;
  }> {
    switch (integration.platformType) {
      case 'splynx':
        return this.importSplynxCatalog(integration.id);
      case 'pxc':
        const result = await this.importPXCCatalog(integration.id);
        return { triggersImported: 0, actionsImported: result.actionsImported };
      case 'vapi':
        return this.importVapiCatalog(integration.id);
      // Add more platform types here as needed
      default:
        console.log(`[IntegrationCatalogImporter] No catalog importer for platform: ${integration.platformType}`);
        return { triggersImported: 0, actionsImported: 0 };
    }
  }
}