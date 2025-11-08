import { apiRequest } from './queryClient';

// Types for API models
export interface User {
  id: number;
  email: string;
  firebaseUid?: string;
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  postcode?: string;
  splynxCustomerId?: string;
  password?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InternetPlan {
  id: number;
  name: string;
  description?: string;
  downloadSpeed: number;
  uploadSpeed: number;
  dataAllowance?: number;
  price: number;
  setupFee?: number;
  contractLength?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VoicePlan {
  id: number;
  name: string;
  description?: string;
  minutes: number;
  includedFeatures?: string[];
  price: number;
  setupFee?: number;
  contractLength?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerService {
  id: number;
  userId: number;
  internetPlanId?: number;
  voicePlanId?: number;
  ipAddress?: string;
  phoneNumber?: string;
  status: string;
  contractStartDate: string;
  contractEndDate?: string;
  monthlyBillingDay?: number;
  nextBillingDate?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Joined data (not in DB)
  internetPlan?: InternetPlan;
  voicePlan?: VoicePlan;
}

export interface Invoice {
  id: number;
  userId: number;
  invoiceNumber: string;
  amount: number;
  status: string;
  dueDate: string;
  paidDate?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Not in DB
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  description: string;
  amount: number;
  quantity: number;
  createdAt?: string;
}

export interface Payment {
  id: number;
  userId: number;
  invoiceId?: number;
  amount: number;
  method: string;
  status: string;
  transactionId?: string;
  createdAt?: string;
}

export interface UsageData {
  id: number;
  userId: number;
  date: string;
  downloadUsage: number;
  uploadUsage: number;
  createdAt?: string;
}

export interface Ticket {
  id: number;
  userId: number;
  subject: string;
  status: string;
  priority: string;
  splynxTicketId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TicketMessage {
  id: number;
  ticketId: number;
  userId?: number;
  message: string;
  isFromStaff: boolean;
  createdAt?: string;
}

export interface Referral {
  id: number;
  referrerId: number;
  referredEmail: string;
  referredName: string;
  status: string;
  creditAmount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// API functions - User
export const getUserProfile = async (userId: number): Promise<User> => {
  const response = await apiRequest('GET', `/api/users/${userId}`);
  return response.json();
};

export const getUserByFirebaseUid = async (firebaseUid: string): Promise<User | null> => {
  try {
    const response = await apiRequest('GET', `/api/users/firebase/${firebaseUid}`);
    return response.json();
  } catch (error) {
    if ((error as Error).message.includes('404')) {
      return null;
    }
    throw error;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const response = await apiRequest('GET', `/api/users/email/${email}`);
    return response.json();
  } catch (error) {
    if ((error as Error).message.includes('404')) {
      return null;
    }
    throw error;
  }
};

export const createUser = async (userData: Partial<User>): Promise<User> => {
  const response = await apiRequest('POST', '/api/users', userData);
  return response.json();
};

export const updateUser = async (userId: number, userData: Partial<User>): Promise<User> => {
  const response = await apiRequest('PUT', `/api/users/${userId}`, userData);
  return response.json();
};

// API functions - Internet Plans
export const getInternetPlans = async (): Promise<InternetPlan[]> => {
  const response = await apiRequest('GET', '/api/internet-plans');
  return response.json();
};

export const getInternetPlan = async (planId: number): Promise<InternetPlan> => {
  const response = await apiRequest('GET', `/api/internet-plans/${planId}`);
  return response.json();
};

// API functions - Voice Plans
export const getVoicePlans = async (): Promise<VoicePlan[]> => {
  const response = await apiRequest('GET', '/api/voice-plans');
  return response.json();
};

export const getVoicePlan = async (planId: number): Promise<VoicePlan> => {
  const response = await apiRequest('GET', `/api/voice-plans/${planId}`);
  return response.json();
};

// API functions - Customer Services
export const getUserServices = async (userId: number): Promise<CustomerService[]> => {
  const response = await apiRequest('GET', `/api/users/${userId}/services`);
  return response.json();
};

export const getServiceDetails = async (serviceId: number): Promise<CustomerService> => {
  const response = await apiRequest('GET', `/api/customer-services/${serviceId}`);
  return response.json();
};

export const createCustomerService = async (serviceData: Partial<CustomerService>): Promise<CustomerService> => {
  const response = await apiRequest('POST', '/api/customer-services', serviceData);
  return response.json();
};

// API functions - Invoices
export const getUserInvoices = async (userId: number): Promise<Invoice[]> => {
  const response = await apiRequest('GET', `/api/users/${userId}/invoices`);
  return response.json();
};

export const getInvoiceDetails = async (invoiceId: number): Promise<{invoice: Invoice, items: InvoiceItem[]}> => {
  const response = await apiRequest('GET', `/api/invoices/${invoiceId}`);
  return response.json();
};

// API functions - Payments
export const getUserPayments = async (userId: number): Promise<Payment[]> => {
  const response = await apiRequest('GET', `/api/users/${userId}/payments`);
  return response.json();
};

export const createPayment = async (paymentData: Partial<Payment>): Promise<Payment> => {
  const response = await apiRequest('POST', '/api/payments', paymentData);
  return response.json();
};

// API functions - Usage
export const getUserUsage = async (userId: number, days: number = 30): Promise<UsageData[]> => {
  const response = await apiRequest('GET', `/api/users/${userId}/usage?days=${days}`);
  return response.json();
};

// API functions - Tickets
export const getUserTickets = async (userId: number): Promise<Ticket[]> => {
  const response = await apiRequest('GET', `/api/users/${userId}/tickets`);
  return response.json();
};

export const getTicketDetails = async (ticketId: number): Promise<Ticket> => {
  const response = await apiRequest('GET', `/api/tickets/${ticketId}`);
  return response.json();
};

export const getTicketMessages = async (ticketId: number): Promise<TicketMessage[]> => {
  const response = await apiRequest('GET', `/api/tickets/${ticketId}/messages`);
  return response.json();
};

export const createTicket = async (ticketData: { userId: number, subject: string, message?: string, priority?: string }): Promise<Ticket> => {
  const response = await apiRequest('POST', '/api/tickets', ticketData);
  return response.json();
};

export const addTicketMessage = async (ticketId: number, messageData: { userId: number, message: string }): Promise<TicketMessage> => {
  const response = await apiRequest('POST', `/api/tickets/${ticketId}/messages`, messageData);
  return response.json();
};

// API functions - Referrals
export const getUserReferrals = async (userId: number): Promise<Referral[]> => {
  const response = await apiRequest('GET', `/api/users/${userId}/referrals`);
  return response.json();
};

export const createReferral = async (referralData: Partial<Referral>): Promise<Referral> => {
  const response = await apiRequest('POST', '/api/referrals', referralData);
  return response.json();
};

// For backwards compatibility with existing components
export const api = {
  getUserProfile,
  getUserByFirebaseUid,
  getUserByEmail,
  createUser,
  updateUser,
  getInternetPlans,
  getInternetPlan,
  getVoicePlans,
  getVoicePlan,
  getUserServices,
  getServiceDetails,
  createCustomerService,
  getUserInvoices,
  getInvoiceDetails,
  getUserPayments,
  createPayment,
  getUserUsage,
  getUserTickets,
  getTicketDetails,
  getTicketMessages,
  createTicket,
  addTicketMessage,
  getUserReferrals,
  createReferral
};