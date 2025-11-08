import axios from 'axios';

const BASE_URL = 'https://manage.country-connect.co.uk/api/2.0/';
const AUTH_HEADER = 'Basic NGNiYmZkYzVhM2M4YmY0YmUwMTFlYWZkMzBkNjM2NGQ6YjgxODc5NDk0NWJhMTAzNDgzMDQxYzZhMzViM2YzZTQ=';

const splynxApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: AUTH_HEADER,
    'Content-Type': 'application/json',
  },
});

export interface CustomerData {
  id?: string;
  status?: string;
  name?: string;
  email?: string;
  phone?: string;
  category?: string;
  street_1?: string;
  zip_code?: string;
  city?: string;
  location_id?: string;
}

export interface TicketData {
  id?: string;
  ticket_id?: string;
  customer_id?: string;
  subject?: string;
  priority?: string;
  message?: {
    message?: string;
  };
}

export interface TicketMessageData {
  ticket_id?: string;
  message?: string;
  customer_id?: string;
}

export interface InternetServiceData {
  id?: string;
  customer_id?: string;
}

export interface VoiceServiceData {
  id?: string;
  customer_id?: string;
}

export interface BillingInfoData {
  id?: string;
  deposit?: number;
}

const SplynxService = {
  // Customer methods
  getCustomer: async (customerId: string) => {
    const response = await splynxApi.get(`admin/customers/customer/${customerId}`);
    return response.data;
  },

  createCustomer: async (customerData: CustomerData) => {
    const response = await splynxApi.post('admin/customers/customer', customerData);
    return response.data;
  },

  updateCustomer: async (customerId: string, customerData: CustomerData) => {
    const response = await splynxApi.put(`admin/customers/customer/${customerId}`, customerData);
    return response.data;
  },

  searchCustomers: async (query: string) => {
    const response = await splynxApi.get(`admin/customers/customer-search?${query}`);
    return response.data;
  },

  // Internet service methods
  getUserInternetService: async (customerId: string) => {
    const response = await splynxApi.get(`admin/customers/customer/${customerId}/internet-services`);
    return response.data;
  },

  createInternetService: async (data: any) => {
    const response = await splynxApi.post('admin/networking/internet-services', data);
    return response.data;
  },

  updateInternetService: async (serviceId: string, data: any) => {
    const response = await splynxApi.put(`admin/networking/internet-services/${serviceId}`, data);
    return response.data;
  },

  // Voice service methods
  getUserVoiceService: async (customerId: string) => {
    const response = await splynxApi.get(`admin/customers/customer/${customerId}/voice-services`);
    return response.data;
  },

  createVoiceService: async (data: any) => {
    const response = await splynxApi.post('admin/voice/voice-services', data);
    return response.data;
  },

  // Billing methods
  getCustomerBillingInfo: async (customerId: string) => {
    const response = await splynxApi.get(`admin/customers/billing-info/${customerId}?format_values=true`);
    return response.data;
  },

  getCustomerPaymentAccounts: async (customerId: string) => {
    const response = await splynxApi.get(`admin/customers/customer-payment-accounts?id=${customerId}`);
    return response.data;
  },

  getCustomerInvoices: async (customerId: string) => {
    const response = await splynxApi.get(`admin/finance/invoices?customer_id=${customerId}`);
    return response.data;
  },

  createPaymentRecord: async (data: any) => {
    const response = await splynxApi.post('admin/finance/payments', data);
    return response.data;
  },

  // Support ticket methods
  getTickets: async (customerId: string) => {
    const response = await splynxApi.get(`admin/support/tickets?customer_id=${customerId}`);
    return response.data;
  },

  getTicketsWithStatus: async (customerId: string, status: string) => {
    const response = await splynxApi.get(`admin/support/tickets?customer_id=${customerId}&status=${status}`);
    return response.data;
  },

  getTicketMessages: async (ticketId: string) => {
    const response = await splynxApi.get(`admin/support/ticket-messages?main_attributes&ticket_id=${ticketId}`);
    return response.data;
  },

  createTicket: async (ticketData: TicketData) => {
    const response = await splynxApi.post('admin/support/tickets', ticketData);
    return response.data;
  },

  createTicketMessage: async (messageData: TicketMessageData) => {
    const response = await splynxApi.post('admin/support/ticket-messages', messageData);
    return response.data;
  },

  reopenTicket: async (ticketId: string) => {
    const response = await splynxApi.put(`admin/support/tickets/${ticketId}`, {
      status: 'open'
    });
    return response.data;
  },

  // Referral methods
  createReferralCreditNote: async (data: any) => {
    const response = await splynxApi.post('admin/finance/transactions', data);
    return response.data;
  },

  // SMS methods
  sendSMS: async (customerId: string, recipient: string, message: string) => {
    const smsData = {
      type: 'message',
      customer_id: customerId,
      status: 'new',
      recipient: recipient,
      message: message
    };
    const response = await splynxApi.post('admin/config/sms', smsData);
    return response.data;
  },

  // Statistics methods
  getCustomerStatistics: async (params: string) => {
    const response = await splynxApi.get(`admin/customers/customer-statistics/?${params}`);
    return response.data;
  },

  getCustomerTrafficCounters: async (customerId: string) => {
    const response = await splynxApi.get(`admin/networking/customer-traffic-counters/${customerId}`);
    return response.data;
  },
};

export default SplynxService;
