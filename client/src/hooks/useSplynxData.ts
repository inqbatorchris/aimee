import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import splynxApi from '@/lib/splynxApi';
import SplynxTransformers, { TransformedCustomer } from '@/lib/splynxTransformers';

export function useSplynxCustomers() {
  return useQuery({
    queryKey: ['splynx-customers-live'],
    queryFn: async (): Promise<TransformedCustomer[]> => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Fetch live customer data from Splynx API
      const response = await fetch('/api/customers-live', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unable to connect to Splynx API - Authentication failed');
        } else if (response.status === 403) {
          throw new Error('Access denied to Splynx API');
        } else if (response.status >= 500) {
          throw new Error('Splynx API server error - Please try again');
        }
        throw new Error(`Failed to fetch live customers: ${response.status} ${response.statusText}`);
      }
      
      const customers = await response.json();
      console.log('Live Splynx customers loaded:', customers.length);
      
      return customers;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - much longer cache
    refetchInterval: false, // DISABLE automatic refetching completely
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    retry: 1, // Only retry once instead of 3 times
    retryDelay: 5000, // Fixed 5 second delay instead of exponential backoff
  });
}

export function useSplynxCustomer(customerId: string) {
  return useQuery({
    queryKey: ['splynx-customer', customerId],
    queryFn: async () => {
      if (!customerId) return null;

      const customer = await splynxApi.getCustomer(customerId);
      const baseCustomer = SplynxTransformers.transformCustomer(customer);

      // Fetch detailed data for this customer
      const [
        servicesData,
        invoices,
        tickets,
        transactions,
        statistics
      ] = await Promise.all([
        splynxApi.getCustomerServices(customerId).catch(() => [[], [], []]),
        splynxApi.getCustomerInvoices(customerId).catch(() => []),
        splynxApi.getCustomerTickets(customerId).catch(() => []),
        splynxApi.getCustomerTransactions(customerId).catch(() => []),
        splynxApi.getCustomerStatistics(customerId).catch(() => [])
      ]);

      // Transform all data
      const [internetServices, voiceServices, customServices] = servicesData;
      const services = [
        ...(Array.isArray(internetServices) ? internetServices.map((s: any) => SplynxTransformers.transformService(s, 'Internet')) : []),
        ...(Array.isArray(voiceServices) ? voiceServices.map((s: any) => SplynxTransformers.transformService(s, 'Voice')) : []),
        ...(Array.isArray(customServices) ? customServices.map((s: any) => SplynxTransformers.transformService(s, 'Custom')) : [])
      ];

      const transformedInvoices = Array.isArray(invoices) ? invoices.map(SplynxTransformers.transformInvoice) : [];
      const transformedTickets = Array.isArray(tickets) ? tickets.map(SplynxTransformers.transformTicket) : [];
      const transformedTransactions = Array.isArray(transactions) ? transactions.map(SplynxTransformers.transformTransaction) : [];
      const usage = SplynxTransformers.transformUsage(statistics);

      // Create comprehensive activity timeline
      const activity = [
        ...transformedTransactions,
        ...transformedTickets.map(ticket => ({
          type: 'ticket',
          description: `Support ticket created - ${ticket.subject}`,
          date: ticket.createdAt,
          ticketId: ticket.id
        })),
        ...transformedInvoices.map(invoice => ({
          type: 'invoice',
          description: `Invoice generated - #${invoice.id}`,
          date: invoice.issueDate,
          amount: parseFloat(invoice.amount),
          status: invoice.status
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        ...baseCustomer,
        services,
        invoices: transformedInvoices,
        tickets: transformedTickets,
        activity,
        usage,
      } as TransformedCustomer;
    },
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useSplynxTickets() {
  return useQuery({
    queryKey: ['splynx-tickets'],
    queryFn: async () => {
      const tickets = await splynxApi.getCustomerTickets('');
      return Array.isArray(tickets) ? tickets.map(SplynxTransformers.transformTicket) : [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    refetchInterval: false, // DISABLE automatic refetching
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    retry: 1, // Only retry once
  });
}